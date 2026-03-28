# 🧙‍♂️ Tax Wizard

> AI-Powered Form-16 Analyzer for Indian taxpayers

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-37%25-F7DF1E.svg)](https://github.com/Rugved2607/tax-wizard/search?l=javascript)
[![Python](https://img.shields.io/badge/Python-28%25-3776AB.svg)](https://github.com/Rugved2607/tax-wizard/search?l=python)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000.svg)](https://tax-wizard-blue.vercel.app)

**Live Demo:** [tax-wizard-blue.vercel.app](https://tax-wizard-blue.vercel.app)

---

## 📌 Overview

Tax Wizard is an AI-powered web tool designed for Indian salaried employees to understand and verify their income tax liability. It supports **both the Old and New tax regimes** introduced by the Indian Income Tax Act.

Users can either **upload their Form-16 PDF** — the TDS certificate issued by their employer at the end of the financial year — or **manually enter their salary and income details**. The backend parses the data, applies the correct Indian tax slabs, and returns a clear, itemised breakdown of how much tax is owed.

This helps employees:
- Confirm whether their employer has deducted the right amount of TDS
- Understand their tax liability under both regimes side by side
- Catch errors or gaps in their Form-16 before filing their ITR (Income Tax Return)

---

## ✨ Features

### 📄 Form-16 Upload
Upload your Form-16 PDF directly. The backend extracts key financial data — gross salary, allowances, deductions, and TDS deducted — and processes it automatically, so you don't have to enter anything manually.

### ✍️ Manual Entry
Don't have your Form-16 handy? Enter your salary income, exemptions, and deductions manually. The calculator handles the rest.

### 🧮 Tax Calculation Breakdown
Get a detailed, line-by-line breakdown of how your tax liability is computed — gross income, applicable deductions (80C, HRA, etc.), taxable income, slab-wise tax, cess, and final payable amount.

### ⚖️ Old vs. New Regime Support
Tax Wizard computes your liability under **both the Old Regime** (with deductions and exemptions) and the **New Regime** (lower slab rates, no exemptions), helping you see which one works better for your situation.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | JavaScript, CSS, HTML |
| **Backend** | Python |
| **Deployment** | Vercel |
| **Version Control** | Git, GitHub |

---

## 📁 Project Structure

```
tax-wizard/
├── frontend/       # UI — Form-16 upload, manual entry, results display
└── backend/        # Python API — PDF parsing, tax slab calculation
```

---

## ⚙️ Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Rugved2607/tax-wizard.git
cd tax-wizard
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
python server.py
```

Backend runs at: `http://localhost:8000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🇮🇳 Indian Tax Context

**Form-16** is a TDS (Tax Deducted at Source) certificate that every salaried employee receives from their employer. It summarises total salary paid and tax deducted during the financial year and is a mandatory document for filing an ITR.

**Old Regime** allows deductions under sections like 80C (investments), 80D (health insurance), HRA, LTA, and more — beneficial if you have significant investments or expenses to claim.

**New Regime** (introduced in Budget 2020, revised in 2023) offers lower tax slab rates but does not allow most exemptions and deductions — simpler but potentially higher tax for those with large deductions.

---

## 👨‍💻 Author

**Rugved Deshpande**
GitHub: [@Rugved2607](https://github.com/Rugved2607)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
