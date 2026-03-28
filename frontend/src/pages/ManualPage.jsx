import { useState } from 'react'
import './ManualPage.css'

const FIELDS = [
  { key: 'name',            label: 'Full Name',              type: 'text',   placeholder: 'As per PAN card' },
  { key: 'pan',             label: 'PAN Number',             type: 'text',   placeholder: 'ABCDE1234F' },
  { key: 'gross_salary',    label: 'Gross Salary (₹)',        type: 'number', placeholder: '1200000' },
  { key: 'hra_exemption',   label: 'HRA Exemption (₹)',       type: 'number', placeholder: '0' },
  { key: 'professional_tax',label: 'Professional Tax (₹)',    type: 'number', placeholder: '2400' },
  { key: 'tax_paid',        label: 'TDS Already Paid (₹)',    type: 'number', placeholder: '0' },
]

const DEDUCTIONS = [
  { key: 'sec_80C',     label: '80C — LIC / PF / ELSS / PPF',     max: 150000 },
  { key: 'sec_80CCC',   label: '80CCC — Pension Fund',             max: 150000 },
  { key: 'sec_80CCD_1B',label: '80CCD(1B) — Extra NPS',            max: 50000 },
  { key: 'sec_80D',     label: '80D — Health Insurance',           max: 25000 },
  { key: 'sec_80E',     label: '80E — Education Loan Interest',    max: null },
  { key: 'sec_80G',     label: '80G — Donations',                  max: null },
  { key: 'sec_80TTA',   label: '80TTA — Savings Interest',         max: 10000 },
]

export default function ManualPage({ onSubmit, onBack, error }) {
  const [form, setForm] = useState({
    name: '', pan: '', gross_salary: '', hra_exemption: '',
    professional_tax: '2400', tax_paid: '',
    sec_80C: '', sec_80CCC: '', sec_80CCD_1B: '',
    sec_80D: '', sec_80E: '', sec_80G: '', sec_80TTA: '',
    new_regime_opted: 'No', assessment_year: '2024-25',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const parsed = {}
    Object.entries(form).forEach(([k, v]) => {
      parsed[k] = typeof v === 'string' && !isNaN(v) && v !== '' ? parseFloat(v) : v
    })
    onSubmit(parsed)
  }

  return (
    <div className="manual-page">
      <div className="manual-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="manual-title">Enter Salary Details</h2>
        <p className="manual-sub">No Form 16? Enter your details manually — takes 2 minutes.</p>
      </div>

      <form className="manual-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="section-label">Basic Information</div>
          <div className="form-grid">
            {FIELDS.map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                <input
                  className="form-input"
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <div className="section-label">Deductions Claimed</div>
          <div className="section-hint">Leave blank if not applicable — we'll identify gaps</div>
          <div className="form-grid">
            {DEDUCTIONS.map(d => (
              <div key={d.key} className="form-group">
                <label className="form-label">
                  {d.label}
                  {d.max && <span className="max-label">Max ₹{d.max.toLocaleString('en-IN')}</span>}
                </label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="0"
                  value={form[d.key]}
                  onChange={e => set(d.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <div className="section-label">Tax Regime</div>
          <div className="regime-toggle">
            {['No', 'Yes'].map(v => (
              <button
                key={v}
                type="button"
                className={`regime-btn ${form.new_regime_opted === v ? 'active' : ''}`}
                onClick={() => set('new_regime_opted', v)}
              >
                {v === 'No' ? '📋 Old Regime' : '🆕 New Regime (115BAC)'}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="form-error">⚠️ {error}</div>}

        <button type="submit" className="submit-btn">
          ⚡ Analyze My Taxes
        </button>
      </form>
    </div>
  )
}
