# Dashboard pages — API mapping

**Scope:** User dashboard under `/dashboard` and its lazy-loaded sections (`src/App.jsx`).  
**Backend:** This repo is frontend-only; paths are relative (typically proxied via Vite `VITE_API_BASE_URL`).  
**Auth:** Dashboard calls use `Authorization: Bearer <token>` and often `ngrok-skip-browser-warning: true` where shown in code.

---

## Route → page component

| URL path | Lazy section | Main component |
|----------|----------------|----------------|
| `/dashboard` | *(redirect)* | `Navigate` → `overview` |
| `/dashboard/overview` | `analytics-dashboard/overview` | `OverviewSection.jsx` |
| `/dashboard/rejection` | `analytics-dashboard/rejection` | `RejectionAnalyticsSection.jsx` |
| `/dashboard/doctor` | `analytics-dashboard/doctor` | `DoctorPerformanceSection.jsx` + doctor widgets |
| `/dashboard/payer` | `analytics-dashboard/payer` | `PayerPerformanceSection.jsx` |
| `/dashboard/denial` | `analytics-dashboard/denial` | `DenialAnalysisSection.jsx` |
| `/dashboard/financial` | `analytics-dashboard/financial` | `FinancialRiskSection.jsx` |

Shell (wraps all): `UserDashboard.jsx` — profile fetch; `ProfileEditModal.jsx` — profile update.

---

## Office scoping (shared pattern)

Many hooks append `/office/{officeId}` when `officeId` is set and not `'All'`. If unset / `'All'`, the base path means **all offices** (see `useDashboardApi.js`, `useIpOpApi.js`, `useSendersPerformance.js`, `useDenialReasonAnalysis.js`).

`useDashboardOfficeScope` / `DashboardFiltersContext` supply `permission`, `selectedOfficeId`, and filters (year, payer sender, etc.).

---

## `/dashboard` shell (all subpages)

| Functionality | Method | Endpoint | Source |
|---------------|--------|----------|--------|
| Load profile for header / merge `officeId` | GET | `/api/users/{userId}` | `UserDashboard.jsx` (`userId` from `user.userId` or `user.id`) |
| Save profile from modal | PUT | `/api/users/{userId}` | `ProfileEditModal.jsx` |

---

## `/dashboard/overview`

| Functionality | Method | Endpoint(s) | Hook / file |
|---------------|--------|-------------|-------------|
| Office dropdown (when user may select office) | GET | `/api/offices` | `OverviewSection.jsx` |
| Executive / payment totals, trends, OP vs IP aggregates | GET | `/api/dashboard/service-month-reports` and `/api/dashboard/payment-reports` (+ optional `/office/{id}`) | `useDashboardApi` → `useDashboardApi.js` |
| IP vs OP tables (report type toggles service vs payment) | GET | `/api/dashboard/ip-op/{service-month-reports\|payment-reports}/ip` and `.../op` (+ optional `/office/{id}`) | `useIpOpApi` → `useIpOpApi.js`; `OverviewSection` passes `ipOpReportType` (`service-month` or `payment`) |

**Note:** Excel export (`exportOverviewToExcel`) uses **already-loaded** table data in the browser — no extra HTTP call.

---

## `/dashboard/rejection`

| Functionality | Method | Endpoint(s) | Hook / file |
|---------------|--------|-------------|-------------|
| Office dropdown | GET | `/api/offices` | `RejectionAnalyticsSection.jsx` |
| Rejection matrix / trends (overall + IP + OP from payment reports) | GET | Same as overview **payment** paths: `/api/dashboard/payment-reports`, `/api/dashboard/ip-op/payment-reports/ip`, `/api/dashboard/ip-op/payment-reports/op` (+ optional `/office/{id}`) | `useRejectionAnalytics` composes `useDashboardApi` + `useIpOpApi(..., 'payment')` → `useRejectionAnalytics.js` |

**Fallback:** If the composed API matrix is empty (`null`), the UI falls back to `getRejectionAnalyticsData` from `mockDashboardData.js` (local mock, **not** an API).

---

## `/dashboard/doctor`

| Widget | Method | Endpoint | File |
|--------|--------|----------|------|
| Top doctors | GET | `/api/clinicians/summary` | `TopDoctorsTable.jsx` |
| Denial by specialty (table / chart) | GET | `/api/denial-summary/specialty` | `DenialSummaryTable.jsx`, `SpecialitySummaryTable.jsx`, `SpecialityDenialChart.jsx` |
| Doctor rejection summary | GET | `/api/clinicians/denial-rr-summary` | `DoctorRejectionSummary.jsx` |

**Non-API:** `DoctorPerformanceSection.jsx` still imports `getDoctorPerformanceData` from `mockDashboardData.js` for a coarse `data` check / legacy empty-state path; the tables above load **live APIs** independently.

---

## `/dashboard/payer`

| Functionality | Method | Endpoint(s) | Hook / file |
|---------------|--------|-------------|-------------|
| Office dropdown | GET | `/api/offices` | `PayerPerformanceSection.jsx` |
| Payer (sender) performance table & charts | GET | `/api/senders/performance`, or `/api/senders/performance/office/{id}`, or `/api/senders/performance/{senderId}`, or `/api/senders/performance/{senderId}/office/{id}` | `useSendersPerformance` → `buildSendersPerformanceUrl` in `useSendersPerformance.js` (via `apiFetch`) |

Sender list for filters is derived from the performance payload when not drilling into a single sender (`PayerPerformanceSection.jsx`).

---

## `/dashboard/denial`

| Functionality | Method | Endpoint(s) | Hook / file |
|---------------|--------|-------------|-------------|
| Office dropdown | GET | `/api/offices` | `DenialAnalysisSection.jsx` |
| Top denial reasons (table) | GET | `/api/denial-reason-analysis/current-rejected` or `.../current-rejected/office/{id}` | `useDenialCurrentRejected` → `useDenialReasonAnalysis.js` |
| Denial category / distribution charts | GET | `/api/denial-reason-analysis/rejected` or `.../rejected/office/{id}` | `useDenialRejected` → `useDenialReasonAnalysis.js` |

---

## `/dashboard/financial`

| Functionality | Method | Endpoint | Hook / file |
|---------------|--------|----------|-------------|
| Write-off by month | GET | `/api/dashboard/writeoff-month-reports` | `useWriteOffMonth` → `useFinancialRisk.js` |
| Write-off by category | GET | `/api/dashboard/writeoff-by-category` | `useWriteOffCategory` → `useFinancialRisk.js` |
| Unprocessed amount trend | GET | `/api/dashboard/unprocessed-amount-reports` | `useUnprocessedAmount` → `useFinancialRisk.js` |

No office-scoped variants in the current hooks (global endpoints only).

---

## Cross-check (against repo)

**Verified routes** (`src/App.jsx`): nested under `/dashboard`: `overview`, `rejection`, `doctor`, `payer`, `denial`, `financial`.

**Verified `/api/` usage under `src/components/analytics-dashboard/`:**

- `overview/OverviewSection.jsx` → `/api/offices`
- `rejection/RejectionAnalyticsSection.jsx` → `/api/offices`
- `payer/PayerPerformanceSection.jsx` → `/api/offices`
- `denial/DenialAnalysisSection.jsx` → `/api/offices`
- `doctor/TopDoctorsTable.jsx` → `/api/clinicians/summary`
- `doctor/DenialSummaryTable.jsx`, `SpecialitySummaryTable.jsx`, `SpecialityDenialChart.jsx` → `/api/denial-summary/specialty`
- `doctor/DoctorRejectionSummary.jsx` → `/api/clinicians/denial-rr-summary`

**Verified hooks used by dashboard sections:**

- `useDashboardApi.js` → `/api/dashboard/service-month-reports`, `/api/dashboard/payment-reports`
- `useIpOpApi.js` → `/api/dashboard/ip-op/...`
- `useRejectionAnalytics.js` → composes the above (payment / IP-OP payment paths)
- `useSendersPerformance.js` → `/api/senders/performance` (+ office/sender variants)
- `useDenialReasonAnalysis.js` → `/api/denial-reason-analysis/current-rejected`, `/rejected` (+ `/office/{id}`)
- `useFinancialRisk.js` → `/api/dashboard/writeoff-month-reports`, `writeoff-by-category`, `unprocessed-amount-reports`

**Verified shell:** `UserDashboard.jsx` and `ProfileEditModal.jsx` → `/api/users/{userId}` (GET / PUT).

**Intentionally out of scope for this doc:** Non-dashboard routes (e.g. `/crs/claims`, admin) — see `docs/API_AND_FRONTEND_MAPPING.md` for a broader list.

---

*Last cross-check: file paths and endpoints matched to source in this workspace.*
