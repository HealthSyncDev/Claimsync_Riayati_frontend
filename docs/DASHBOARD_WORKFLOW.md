# Analytics Dashboard — Exact Workflow

**Version:** 1.0  
**Data Source:** `src/components/analytics-dashboard/data/mockDashboardData.js` (replace with API when backend ready)

---

## 1. APPLICATION ENTRY FLOW

```
User logs in
    → Redirect to /dashboard (UserLayout)
    → UserDashboard renders
        → DashboardFiltersProvider wraps content
        → Default filters: { year: '2025', month: 'All', claimType: 'All', doctor: 'All', ... }
        → DashboardNav (horizontal nav bar)
        → Outlet (renders child route)
    → Route index: Navigate to /dashboard/overview
    → LazyOverview loads (OverviewSection)
```

---

## 2. ROUTING MAP

| Path | Component | Lazy Import |
|------|------------|-------------|
| `/dashboard` | Redirect → `/dashboard/overview` | — |
| `/dashboard/overview` | OverviewSection | LazyOverview |
| `/dashboard/rejection` | RejectionAnalyticsSection | LazyRejection |
| `/dashboard/doctor` | DoctorPerformanceSection | LazyDoctor |
| `/dashboard/payer` | PayerPerformanceSection | LazyPayer |
| `/dashboard/denial` | DenialAnalysisSection | LazyDenial |
| `/dashboard/financial` | FinancialRiskSection | LazyFinancial |
| `/dashboard/claims-explorer` | ClaimsExplorerSection | LazyClaimsExplorer |

---

## 3. NAVIGATION CLICKS

```
User clicks nav link (e.g. "Rejection Analytics")
    → NavLink to="/dashboard/rejection"
    → React Router navigates
    → Outlet unmounts current section, mounts RejectionAnalyticsSection
    → Suspense fallback (SectionSkeleton) if lazy chunk not yet loaded
    → Section renders with useDashboardFilters().filters
```

---

## 4. FILTER FLOW

```
DashboardFiltersContext provides: { filters, setFilters }

Filters used by sections:
    - filters.year  → getExecutiveSummaryData(year), getRejectionAnalyticsData(year), etc.
    - filters.month, claimType, payer, etc.  → reserved for future filter bar

Data functions all accept year param; other filters not yet wired to mock data.
```

---

## 5. TAB-BY-TAB WORKFLOW

### 5.1 OVERVIEW (`/dashboard/overview`)

**Business question:** What is the overall financial and claims snapshot?

**Render sequence:**
1. `getOverviewKPIs()` → KPI cards (Total Claims, Claimed, Remitted, Rejected, Rejection %, Write-Off, Unprocessed, Recovery %)
2. `getExecutiveSummaryData(filters.year)` → ExecutiveSummaryTable
3. `getExecutiveMetricsData(filters.year)` → ExecutiveMetricsSection
    - KPIs from table totals
    - Revenue vs Paid vs Current Rejected (line chart)
    - Medical vs Technical (stacked bar)
    - OP vs IP comparison (Claimed, Rejection %, Processed %)

**Component tree:**
```
OverviewSection
├── KPI bento (8 cards)
├── ExecutiveSummaryTable
└── ExecutiveMetricsSection
    ├── KPI grid
    ├── Revenue/Paid/Rejected line chart
    ├── Medical vs Technical stacked bar
    └── OP vs IP comparison charts
```

---

### 5.2 REJECTION ANALYTICS (`/dashboard/rejection`)

**Business question:** How are rejection % and values trending month-wise? How do OP and IP compare?

**Render sequence:**
1. `getRejectionAnalyticsData(filters.year)` → single data object
2. DenialMatrixTable ← `data.matrix`, `data.months`
3. RejectionTrendChart (Overall) ← `data.trends.overall`
4. RejectionTrendChart (OP) ← `data.trends.op`
5. RejectionTrendChart (IP) ← `data.trends.ip`
6. RejectionCategoryBreakdown ← `data.categoryBreakdown`
    - Month-wise Category Table (Medical vs Technical)
    - Stacked Column Chart

**Component tree:**
```
RejectionAnalyticsSection
├── DenialMatrixTable (full width)
│   └── Columns: Jan–Dec + FY Total | Rows: Initial/Current Rej %, Value (Overall, OP, IP)
├── rejection-analytics-grid-2
│   ├── RejectionTrendChart (Overall)
│   └── RejectionTrendChart (OP)
├── rejection-analytics-grid-2
│   └── RejectionTrendChart (IP)
└── RejectionCategoryBreakdown
    ├── Month-wise Category Table (Medical | Technical | Grand Total)
    └── Stacked Column Chart (Medical vs Technical by month)
```

**Data shape:** `getRejectionAnalyticsData(year)` → `{ months, matrix, trends, categoryBreakdown }`

---

### 5.3 DENIAL ANALYSIS (`/dashboard/denial`)

**Business question:** What are the biggest reasons for rejection?

**Render sequence:**
1. `getDenialAnalysisData(filters.year)` → single data object
2. TopDenialReasonsTable ← `data.topReasons`, `data.grandTotal`
3. DenialCategoryBarChart ← `data.topReasons` (top 10)
4. DenialDistributionChart ← `data.categoryBreakdown` (donut %)
5. DenialReasonBreakdown (fetches same data internally)
    - Reason Table
    - Top 10 Bar Chart
    - % Distribution Donut

**Component tree:**
```
DenialAnalysisSection
├── TopDenialReasonsTable (full width)
│   └── Columns: Denial Reason | Current Rejected Amount | %
├── denial-analysis-grid-2
│   ├── DenialCategoryBarChart
│   └── DenialDistributionChart
└── DenialReasonBreakdown
    ├── Reason Table (Denial Reason | Rejected Amount | %)
    ├── Top 10 Bar Chart
    └── % Distribution Donut Chart
```

**Data shape:** `getDenialAnalysisData(year)` → `{ topReasons, categoryBreakdown, grandTotal }`

---

### 5.4 PAYER PERFORMANCE (`/dashboard/payer`)

**Business question:** Which payers are high risk? Who contributes most business? Where is rejection concentrated?

**Render sequence:**
1. `getPayerPerformanceData(filters.year)` → single data object
2. InsuranceSummaryTable ← `data.payers`, `data.totals`
3. PayerRejectionRankingChart ← `data.payers` (top 10 by RR%)
4. BusinessContributionChart ← `data.payers`
5. InsuranceWiseClaimSummary (fetches same data internally)
    - Summary Table (Net Amount, Unprocessed, Initial/Current Rejected, RR%, Business Contribution %)
    - PayerRejectionRankingChart
    - BusinessContributionChart

**Component tree:**
```
PayerPerformanceSection
├── InsuranceSummaryTable (full width)
│   └── Columns: Insurance | Claimed | Processed | Unprocessed | Initial Rej | Curr Rej | Initial % | Curr % | Biz Contrib %
├── payer-performance-grid-2
│   ├── PayerRejectionRankingChart
│   └── BusinessContributionChart
└── InsuranceWiseClaimSummary
    ├── Summary Table (Insurance | Net Amount | Unprocessed | Initial/Current Rejected | RR% | Biz Contrib %)
    ├── PayerRejectionRankingChart
    └── BusinessContributionChart
```

**Data shape:** `getPayerPerformanceData(year)` → `{ payers, totals }`

---

### 5.5 DOCTOR PERFORMANCE (`/dashboard/doctor`)

**Business question:** Which doctors have highest medical rejection? Which specialities are problematic? Who needs performance attention?

**Render sequence:**
1. `getDoctorPerformanceData(filters.year)` → single data object
2. TopDoctorsTable (70%) ← `data.doctors`, `data.totals`
3. SpecialitySummaryTable (30%) ← `data.specialitySummary`, `data.totals`
4. TopDoctorsByDenialChart ← `data.doctors` (top 10 by medical denial amount)
5. SpecialityDenialChart ← `data.specialitySummary`
6. DoctorRejectionSummary (fetches same data internally)
    - Main Table (Doctor | Net Amount | Unprocessed | Initial/Current Rejected | RR% | Medical Denials | Medical RR%)
    - Top Doctors by RR% Chart
    - Medical RR% Chart
7. MedicalDenialDeepDive (fetches same data internally)
    - Medical Denial Table (Doctor | Initial Medical Rejected | Current Medical Rejected | Department)
    - Medical Ranking Chart

**Component tree:**
```
DoctorPerformanceSection
├── doctor-performance-row-1 (70% | 30%)
│   ├── TopDoctorsTable (S.No, Doctor, Speciality, Claimed, Medical Denials, Medical Denial %)
│   └── SpecialitySummaryTable (Speciality | Medical Denials | Medical Denial %)
├── doctor-performance-row-2
│   ├── TopDoctorsByDenialChart
│   └── SpecialityDenialChart
├── DoctorRejectionSummary
│   ├── Main Table (Doctor | Net | Unprocessed | Initial/Current Rej | RR% | Medical Denials | Medical RR%)
│   ├── Top Doctors by RR% Chart
│   └── Medical RR% Chart
└── MedicalDenialDeepDive (DenialCategory = Medical)
    ├── Medical Denial Table
    └── Medical Ranking Chart
```

**Data shape:** `getDoctorPerformanceData(year)` → `{ doctors, specialitySummary, totals, medicalDeepDive }`

---

### 5.6 FINANCIAL RISK (`/dashboard/financial`)

**Business question:** What are write-off and unprocessed trends?

**Render sequence:**
1. `getWriteOffAnalysis()` → write-off by month, by category
2. `getUnprocessedTrend()` → unprocessed by month
3. Four charts in 2x2 grid

**Component tree:**
```
FinancialRiskSection
├── Write-Off by Month (bar chart)
├── Write-Off by Category (pie chart)
├── Unprocessed Amount Trend (line chart)
└── Settlement Tracking (stacked bar: Settled vs Pending)
```

---

### 5.7 CLAIMS EXPLORER (`/dashboard/claims-explorer`)

**Business question:** Browse and filter individual claims.

**Render sequence:**
1. User opens "Advanced filters" (optional) → filter panel
2. `getClaimsExplorerRows(page, pageSize)` → paginated rows
3. Table with sortable columns
4. Pagination: Previous/Next, per-page selector (10/20/50)

**Component tree:**
```
ClaimsExplorerSection
├── Advanced filters toggle (filter panel when open)
├── Claims table (Claim ID, Patient, Doctor, Speciality, Type, Claimed, Remitted, Rejected, Status, Payment, Date)
└── Pagination (Showing X–Y of Z, Per page dropdown, Previous, Next)
```

**Interaction flow:**
- Click column header → toggle sort (asc/desc)
- Change page size → reset to page 0, refetch
- Click Previous/Next → change page, refetch

---

## 6. DATA DEPENDENCY MATRIX

| Section           | Data function(s)                   | Filter(s) used |
|-------------------|------------------------------------|----------------|
| Overview          | getOverviewKPIs, getExecutiveSummaryData, getExecutiveMetricsData | year |
| Rejection         | getRejectionAnalyticsData          | year |
| Denial            | getDenialAnalysisData              | year |
| Payer             | getPayerPerformanceData            | year |
| Doctor            | getDoctorPerformanceData           | year |
| Financial         | getWriteOffAnalysis, getUnprocessedTrend | none |
| Claims Explorer   | getClaimsExplorerRows              | page, pageSize |

---

## 7. LOADING BEHAVIOUR

- **Route load:** Suspense shows `SectionSkeleton` until lazy chunk loads
- **Per section:** If `loading=true` passed, section shows internal skeletons
- **Current:** Most sections do not receive `loading`; they render data immediately (mock is sync)

---

## 8. FILE REFERENCE

| Purpose              | Path |
|-----------------------|------|
| Mock data             | `src/components/analytics-dashboard/data/mockDashboardData.js` |
| Filters context       | `src/context/DashboardFiltersContext.jsx` |
| Nav component         | `src/components/analytics-dashboard/DashboardNav.jsx` |
| Dashboard layout      | `src/pages/user/dashboard/UserDashboard.jsx` |
| Routes                | `src/App.jsx` (lines 66–75) |
