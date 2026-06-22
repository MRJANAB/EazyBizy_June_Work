# EazyBizy — Government Loan Assistance Platform

> **Version:** 3.2.0
> **Date:** 29 May 2026
> **Status:** Production Ready

---

## What is EazyBizy?

EazyBizy is a full-stack fintech platform that helps businesses apply for government loan schemes (PMEGP, Mudra, MSME, CGTMSE). It includes a multi-step GTAB application wizard, a full Credit Analyst (CA) workstation with 16-step CMA report generation, an admin panel, an AI chatbot, and a learning module.

**Stack:** React + TypeScript · Vite · Supabase · Tailwind CSS · shadcn/ui · Python FastAPI (CMA backend)

---

## What Changed in v3.2.0 (29 May 2026)

### Credit Analyst Workstation — Major Expansion

The CA workstation (`AdvancedCMAWizard`) has been expanded from a basic form to a full 16-step professional CMA preparation tool.

#### New Steps Added

- **Collateral & Security (Step 14)** — Primary security description, collateral items table (Type / Description / Owner / Market Value / FSV), CGTMSE toggle with coverage percentage, insurance arrangement flag, and live coverage ratio summary
- **CA Scorecard (Step 16)** — 7-parameter 100-point scoring model, full EMI repayment schedule table (year-wise principal + interest), CA Recommendation (Recommend / Conditional / Decline), CA Remarks textarea

#### Enhanced Steps

- **Manpower (Step 8)** — Per-row monthly cost calculation, 3-year payroll projection table, summary metrics (monthly payroll, annual Year 1, % of projected revenue)
- **WC Norms (Step 10)** — Sliders with banker guidance tips, live Tandon Method II breakdown (Gross WC → Less Creditors → Net WC Gap → Bank Finance 75% → Promoter Margin 25%), "Push WC Finance to MoF" one-click button
- **Assumptions & Projections (Step 15)** — Assumption sliders with context tips, 5-year P&L projection table with DSCR traffic-light color coding (green ≥1.25, amber ≥1.0, red <1.0), Sensitivity Analysis table (−30% to +20% revenue scenarios), Break-Even Analysis metrics

#### New Helper Computations (all live/auto-updating)

| Function | Output |
|---|---|
| `computeBreakEven()` | BEP monthly/annual revenue, utilisation %, contribution ratio, safety margin |
| `computeEMISchedule()` | Year-wise loan repayment with moratorium support |
| `computeSensitivity()` | 6 revenue scenarios with revenue / COGS / EBITDA / PAT / DSCR |
| `computeScorecard()` | 7-parameter 100-point CA scoring |

#### Download Always Proceeds

Downloads (PDF / Excel / CSV) previously hard-blocked when validation failed. Now validation issues show as warning toasts but the report always generates. Download buttons are visible on all 16 steps, not just the final one.

---

### Backend — Bug Fixes

| Issue | Fix |
|---|---|
| `'mpbf_method_2'` KeyError on PDF download | Changed to `.get("method2", ...)` in `api/cma.py` |
| `'sales'` KeyError causing repeated 500 errors | Full rewrite of `pdf/cma_generator.py` to match the actual data structure produced by `report_builder.py` |
| Pydantic validator blocking all downloads with 422 | Changed `raise ValueError(...)` to advisory `print(...)` in `cma/intake_mapper.py` — report always generates |

---

### Security Fixes

**HIGH — Path Traversal** (`backend/main.py`)

- Added `_safe_filename()` helper that strips all characters except `[a-zA-Z0-9 _-]` and caps length at 64
- All three locations where `entrepreneur_name` was used directly in `os.path.join()` now pass through `_safe_filename()` first
- Prevents inputs like `../../etc/passwd` from escaping the reports directory

**MEDIUM — Internal Error Leakage** (`main.py`, `api/cma.py`, `api/report.py`)

- All `detail=str(e)` on HTTP 500 responses replaced with generic `"... failed. Check server logs."`
- Actual exception details still print to server stdout for debugging but never reach the HTTP response body
- Business-logic 422 validation messages (from `PMEGPValidationError` / `ValueError`) intentionally kept as-is

---

### Supabase Schema — New Migration

**File:** `supabase/migrations/20260529120000_add_cma_data_column.sql`

Run this in Supabase Dashboard → SQL Editor to add the CA workstation columns:

| Column | Type | Purpose |
|---|---|---|
| `cma_data` | JSONB | Full CA wizard draft (CMAFormData JSON) |
| `cma_submitted_at` | TIMESTAMPTZ | When CA last generated/submitted |
| `cma_status` | TEXT | `draft` / `review` / `approved` / `rejected` |
| `ca_remarks` | TEXT | Internal CA notes |
| `employee_count` | INTEGER | Mapped from GTAB Step 7 |
| `salary_per_employee` | NUMERIC | Mapped from GTAB Step 7 |
| `total_project_cost` | NUMERIC | Denormalised for dashboard display |
| `margin_money` | NUMERIC | PMEGP/Mudra subsidy amount |
| `eligible_loan_amount` | NUMERIC | Final sanctioned loan |

A GIN index on `cma_data` is also created for fast dashboard `hasCmaDraft` checks.

---

### Types Updated

`src/types/cma.ts` — Added `CMACollateralItem` interface, `collateral` block, and `ca_recommendation` block to `CMAFormData`.

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Fill in your Supabase URL and anon key

# Run dev server
npm run dev

# Build for production
npm run build
```

### Python CMA Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Project Structure

```
EazyBizy/
├── src/
│   ├── components/
│   │   ├── credit-analyst/  # AdvancedCMAWizard (16-step CA workstation)
│   │   ├── gtab/            # GTAB wizard steps, AIInsightPanel, CMAAdvisoryPanel
│   │   └── ui/              # shadcn/ui components
│   ├── pages/               # Route pages (Auth, Dashboard, Admin, Credit Analyst, etc.)
│   ├── hooks/               # Auth and form hooks
│   ├── lib/                 # aiEngine, cmaValidator, schemes, buildCMAReportInput
│   └── types/               # TypeScript types (cma.ts, gtab.ts, dpr.ts)
├── backend/
│   ├── api/                 # FastAPI routes (cma.py, report.py)
│   ├── cma/                 # CMA engine: intake_mapper, operating_statement, balance_sheet, ratios, cashflow, mpbf
│   ├── pdf/                 # PDF builder (builder.py) and CMA PDF generator (cma_generator.py)
│   ├── calculations/        # Income statement, DSCR, loan schedule, depreciation, working capital
│   ├── schemes/             # PMEGP, Mudra, MSME, CGTMSE scheme logic and router
│   └── models/              # Pydantic input schema
├── supabase/
│   ├── functions/           # Edge functions (generate-cma-report, process-loan, format-report)
│   └── migrations/          # All DB schema migrations (run in order)
└── public/
```

---

## CA Workstation — 16 Steps

| # | Step | Purpose |
|---|---|---|
| 1 | Applicant Profile | Personal details, PAN, Aadhaar, experience |
| 2 | Business Profile | Entity name, constitution, GST, UDYAM |
| 3 | Loan Requirement | Purpose, type, scheme, amount, tenure, rate |
| 4 | Project Cost | Land, building, machinery, pre-op expenses, WC |
| 5 | Means of Finance | Promoter equity, term loan, WC loan, subsidy |
| 6 | Historical Financials | 1–3 years of audited P&L and balance sheet data |
| 7 | Revenue Model | Products/services, price, quantity, growth % |
| 8 | Manpower | Designation, headcount, salary, 3-year payroll projection |
| 9 | Operating Expenses | Rent, utilities, transport, insurance, professional fees |
| 10 | WC Norms | Holding days, Tandon Method II live calculator |
| 11 | Depreciation | Asset-wise WDV rates |
| 12 | Promoter Net Worth | Properties, FDs, gold, liabilities |
| 13 | Guarantor | Guarantor details and net worth |
| 14 | Collateral & Security | Primary security, collateral items, CGTMSE, insurance |
| 15 | Assumptions & Projections | 5-year P&L, DSCR, sensitivity, break-even |
| 16 | CA Scorecard | 100-point scoring, EMI schedule, CA recommendation |

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 3.2.0 | 29 May 2026 | CA workstation 16-step expansion, break-even/sensitivity/scorecard/collateral, security fixes (path traversal, error leakage), backend bug fixes (mpbf KeyError, sales KeyError, Pydantic 422 block), Supabase migration for CA columns |
| 3.1.0 | 24 May 2026 | AI engine, CMA advisory panel, backend calculation overhaul, schemes API, GTAB WC step expansion |
| 3.0.0 | 15 May 2026 | CMA reconciliation refactor, Application Preview step, theme overhaul, git setup |
| 2.0.0 | 3 Feb 2026 | Credit analyst dashboard, GTAB wizard, Supabase schema, AI chatbot |
| 1.0.0 | Jan 2026 | Initial project — landing page, auth, loan schemes |

---
