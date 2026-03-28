from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile, os, re
from pypdf import PdfReader
from groq import Groq
import json

app = FastAPI(title="Tax Wizard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.environ["GROQ_API_KEY"]
client = Groq(api_key=GROQ_API_KEY)

# ── Tax slabs FY 2024-25 ────────────────────────────────────────────────────

OLD_SLABS = [
    (250000,  0.00),
    (500000,  0.05),
    (1000000, 0.20),
    (float('inf'), 0.30),
]

NEW_SLABS = [
    (300000,  0.00),
    (600000,  0.05),
    (900000,  0.10),
    (1200000, 0.15),
    (1500000, 0.20),
    (float('inf'), 0.30),
]

SECTION_LIMITS = {
    "sec_80C":       {"limit": 150000, "name": "80C (LIC/PF/ELSS/PPF)"},
    "sec_80CCC":     {"limit": 150000, "name": "80CCC (Pension Fund)"},
    "sec_80CCD_1B":  {"limit": 50000,  "name": "80CCD(1B) — Extra NPS"},
    "sec_80D":       {"limit": 25000,  "name": "80D (Health Insurance)"},
    "sec_80E":       {"limit": None,   "name": "80E (Education Loan Interest)"},
    "sec_80G":       {"limit": None,   "name": "80G (Donations)"},
    "sec_80TTA":     {"limit": 10000,  "name": "80TTA (Savings Interest)"},
}


# ── PDF Parsing ─────────────────────────────────────────────────────────────

def extract_all_text(pdf_path: str) -> list[str]:
    reader = PdfReader(pdf_path)
    pages_text = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages_text.append(text)
    return pages_text


def get_partB_text(pages_text: list[str]) -> str:
    partB_start = None
    for i, text in enumerate(pages_text):
        if any(k in text for k in ["Annexure", "Details of Salary Paid", "PART B"]):
            partB_start = i
            break
    if partB_start is None:
        return "\n".join(pages_text)
    return "\n".join(pages_text[partB_start:])

def extract_number_after(pattern: str, text: str, default: float = 0.0) -> float:
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if match:
        snippet = text[match.end(): match.end() + 120]
        num = re.search(r'[\d,]+\.?\d*', snippet)
        if num:
            val = num.group().replace(',', '').strip()
            if val and val != '.':
                return float(val)
    return default


def extract_employee_name(text: str) -> str:
    match = re.search(r"Name and address of the Employee.*?\n([A-Z][A-Z\s]+)\n", text)
    return match.group(1).strip() if match else "Unknown"


def extract_pan(text: str) -> str:
    match = re.search(r'PAN of the\s*Employee[^\n]*\n([A-Z]{5}[0-9]{4}[A-Z])', text)
    if match:
        return match.group(1).strip()
    match = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b', text)
    return match.group(1) if match else "Unknown"


def extract_assessment_year(text: str) -> str:
    match = re.search(r'Assessment Year\s+(\d{4}-\d{2,4})', text)
    return match.group(1).strip() if match else "2024-25"


def extract_hra(text: str) -> float:
    match = re.search(
        r'House rent allowance under section 10\(13A\)[\s\S]{0,300}?\(e\)\s*([\d,]+\.?\d*)',
        text, re.IGNORECASE
    )
    if match:
        return float(match.group(1).replace(',', ''))
    match = re.search(r'10\(13A\)[^\d]{0,100}([\d,]+\.00)', text)
    if match:
        return float(match.group(1).replace(',', ''))
    return 0.0


def parse_form16(pdf_path: str) -> dict:
    pages_text = extract_all_text(pdf_path)
    full_text  = "\n".join(pages_text)
    partB      = get_partB_text(pages_text)

    fields = {
        "employee_name":      extract_employee_name(full_text),
        "pan":                extract_pan(full_text),
        "assessment_year":    extract_assessment_year(full_text),
        "employer_name":      extract_employer_name(full_text),

        "gross_salary":       extract_number_after(r'section 17\(1\)', partB),
        "hra_exemption":      extract_hra(partB),
        "standard_deduction": extract_number_after(r'16\(ia\)', partB),
        "professional_tax":   extract_number_after(r'16\(iii\)', partB),
        "gross_total_income": extract_number_after(r'Gross total income', partB),
        "taxable_income":     extract_number_after(r'Total taxable income', partB),
        "tax_paid":           extract_number_after(r'Net tax payable', partB),

        "sec_80C":            extract_number_after(r'section 80C\b', partB),
        "sec_80CCC":          extract_number_after(r'80CCC\b', partB),
        "sec_80CCD_1B":       extract_number_after(r'80CCD\s*\(1B\)', partB),
        "sec_80D":            extract_number_after(r'health insurance premia under section\s*80D', partB),
        "sec_80E":            extract_number_after(r'higher\s*education under section 80E', partB),
        "sec_80G":            extract_number_after(r'section 80G\b', partB),
        "sec_80TTA":          extract_number_after(r'80TTA\b', partB),

        "new_regime_opted":   "Yes" if re.search(r'115BAC\s*Yes', partB, re.IGNORECASE) else "No",
    }

    return fields


def extract_employer_name(text: str) -> str:
    match = re.search(r'Name and address of the Employer[^\n]*\n([A-Z][A-Z\s&.,()-]+)\n', text)
    return match.group(1).strip() if match else "Unknown Employer"


# ── Tax Calculation ─────────────────────────────────────────────────────────

def calc_tax(income: float, slabs: list) -> float:
    tax = 0.0
    prev = 0
    for limit, rate in slabs:
        if income <= prev:
            break
        taxable = min(income, limit) - prev
        tax += taxable * rate
        prev = limit
    # 4% cess
    tax += tax * 0.04
    # 87A rebate (income <= 5L for old, <= 7L for new)
    return round(tax, 2)


def compute_regime_comparison(fields: dict) -> dict:
    gross = fields.get("gross_salary", 0)
    hra   = fields.get("hra_exemption", 0)
    std   = fields.get("standard_deduction", 50000)
    prof  = fields.get("professional_tax", 0)

    # Old regime
    old_80C    = min(fields.get("sec_80C", 0), 150000)
    old_80CCC  = fields.get("sec_80CCC", 0)
    old_CCD1B  = min(fields.get("sec_80CCD_1B", 0), 50000)
    old_80D    = min(fields.get("sec_80D", 0), 25000)
    old_80E    = fields.get("sec_80E", 0)
    old_80G    = fields.get("sec_80G", 0)
    old_80TTA  = min(fields.get("sec_80TTA", 0), 10000)

    old_deductions = hra + std + prof + old_80C + old_80CCC + old_CCD1B + old_80D + old_80E + old_80G + old_80TTA
    old_taxable    = max(0, gross - old_deductions)
    old_tax        = calc_tax(old_taxable, OLD_SLABS)
    if old_taxable <= 500000:
        old_tax = 0  # 87A rebate

    # New regime (flat std deduction 75000 from FY25, no other deductions)
    new_std        = 75000
    new_taxable    = max(0, gross - new_std)
    new_tax        = calc_tax(new_taxable, NEW_SLABS)
    if new_taxable <= 700000:
        new_tax = 0  # 87A rebate new regime

    return {
        "old_regime": {
            "gross_salary":    gross,
            "total_deductions": old_deductions,
            "taxable_income":  old_taxable,
            "tax_payable":     old_tax,
        },
        "new_regime": {
            "gross_salary":    gross,
            "total_deductions": new_std,
            "taxable_income":  new_taxable,
            "tax_payable":     new_tax,
        },
        "better_regime": "old" if old_tax < new_tax else "new",
        "savings":       round(abs(old_tax - new_tax), 2),
    }


def compute_gaps(fields: dict) -> list:
    gaps = []
    for key, meta in SECTION_LIMITS.items():
        claimed = fields.get(key, 0.0)
        limit   = meta["limit"]
        if limit is not None:
            missed = max(0, limit - claimed)
            if missed > 0:
                gaps.append({
                    "section": key,
                    "name":    meta["name"],
                    "claimed": claimed,
                    "limit":   limit,
                    "missed":  missed,
                })
        else:
            if claimed == 0:
                gaps.append({
                    "section": key,
                    "name":    meta["name"],
                    "claimed": 0,
                    "limit":   "No limit",
                    "missed":  "Check if applicable",
                })
    return gaps


# ── Groq AI Recommendations ─────────────────────────────────────────────────

def get_groq_recommendations(fields: dict, gaps: list, regime: dict) -> str:
    better = regime["better_regime"]
    savings = regime["savings"]
    missed_sections = [g for g in gaps if isinstance(g.get("missed"), (int, float)) and g["missed"] > 0]
    total_missed_deductions = sum(g["missed"] for g in missed_sections)
    tax_saved_if_claimed = round(total_missed_deductions * 0.30 * 1.04, 2)  # assuming 30% bracket + cess

    prompt = f"""You are an expert Indian tax advisor. Analyze this Form 16 data and give sharp, personalized advice.

TAXPAYER DATA:
- Name: {fields.get('employee_name')}
- Gross Salary: ₹{fields.get('gross_salary', 0):,.0f}
- Assessment Year: {fields.get('assessment_year')}
- Current Regime: {fields.get('new_regime_opted', 'No')} (new regime)

REGIME COMPARISON:
- Old Regime Tax: ₹{regime['old_regime']['tax_payable']:,.0f}
- New Regime Tax: ₹{regime['new_regime']['tax_payable']:,.0f}
- Better Regime: {better.upper()} (saves ₹{savings:,.0f})

MISSED DEDUCTIONS:
{chr(10).join([f"- {g['name']}: Claimed ₹{g['claimed']:,.0f} / Limit ₹{g['limit']:,.0f} → Missed ₹{g['missed']:,.0f}" for g in missed_sections])}

Total unclaimed deductions: ₹{total_missed_deductions:,.0f}
Estimated additional tax savings if claimed: ₹{tax_saved_if_claimed:,.0f}

Give your response as a JSON object with exactly these keys:
{{
  "summary": "2-3 sentence sharp summary of their tax situation",
  "regime_advice": "Clear recommendation on which regime to pick and why, specific to their numbers",
  "top_actions": [
    {{"action": "specific action to take", "impact": "₹X saved", "priority": "HIGH/MEDIUM/LOW"}},
    {{"action": "...", "impact": "...", "priority": "..."}},
    {{"action": "...", "impact": "...", "priority": "..."}}
  ],
  "investment_suggestions": [
    {{"instrument": "instrument name", "section": "80C/80D etc", "max_benefit": "₹X", "why": "one line reason"}},
    {{"instrument": "...", "section": "...", "max_benefit": "...", "why": "..."}}
  ],
  "key_insight": "One surprising or non-obvious insight specific to their situation"
}}

Be specific with rupee amounts. No generic advice. Respond with JSON only."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1024,
    )

    raw = response.choices[0].message.content.strip()
    # Strip markdown code fences if present
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    try:
        return json.loads(raw)
    except Exception:
        return {"summary": raw, "regime_advice": "", "top_actions": [], "investment_suggestions": [], "key_insight": ""}


# ── API Routes ───────────────────────────────────────────────────────────────

@app.post("/api/analyze")
async def analyze_form16(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        fields = parse_form16(tmp_path)
        gaps   = compute_gaps(fields)
        regime = compute_regime_comparison(fields)
        ai     = get_groq_recommendations(fields, gaps, regime)

        total_missed = sum(
            g["missed"] for g in gaps
            if isinstance(g.get("missed"), (int, float))
        )

        return {
            "fields":          fields,
            "gaps":            gaps,
            "regime":          regime,
            "ai":              ai,
            "total_missed_deductions": total_missed,
            "estimated_extra_savings": round(total_missed * 0.30 * 1.04, 2),
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def safe_float(val, default=0.0):
    try:
        return float(val) if val not in (None, '', 'null') else default
    except (ValueError, TypeError):
        return default


@app.post("/api/manual")
async def analyze_manual(data: dict):
    """Fallback: user inputs salary structure manually"""
    try:
        fields = {
            "employee_name":      data.get("name", "Taxpayer"),
            "pan":                data.get("pan", "XXXXX0000X"),
            "assessment_year":    data.get("assessment_year", "2024-25"),
            "employer_name":      data.get("employer", "Employer"),
            "gross_salary":       safe_float(data.get("gross_salary")),
            "hra_exemption":      safe_float(data.get("hra_exemption")),
            "standard_deduction": 50000,
            "professional_tax":   safe_float(data.get("professional_tax")),
            "gross_total_income": safe_float(data.get("gross_salary")),
            "taxable_income":     0,
            "tax_paid":           safe_float(data.get("tax_paid")),
            "sec_80C":            safe_float(data.get("sec_80C")),
            "sec_80CCC":          safe_float(data.get("sec_80CCC")),
            "sec_80CCD_1B":       safe_float(data.get("sec_80CCD_1B")),
            "sec_80D":            safe_float(data.get("sec_80D")),
            "sec_80E":            safe_float(data.get("sec_80E")),
            "sec_80G":            safe_float(data.get("sec_80G")),
            "sec_80TTA":          safe_float(data.get("sec_80TTA")),
            "new_regime_opted":   data.get("new_regime_opted", "No"),
        }
        gaps   = compute_gaps(fields)
        regime = compute_regime_comparison(fields)
        ai     = get_groq_recommendations(fields, gaps, regime)
        total_missed = sum(g["missed"] for g in gaps if isinstance(g.get("missed"), (int, float)))

        return {
            "fields": fields, "gaps": gaps, "regime": regime, "ai": ai,
            "total_missed_deductions": total_missed,
            "estimated_extra_savings": round(total_missed * 0.30 * 1.04, 2),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
