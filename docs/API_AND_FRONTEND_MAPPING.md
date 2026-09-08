# API Endpoints & Frontend Mapping

**Project:** CRS-MAIN (Hospital Management System - Frontend)

**Note:** This is a **frontend-only** project. There are no backend route definitions or controllers in this repo. The API is proxied to an external backend via Vite (`VITE_API_BASE_URL`). Response structures are documented based on **how the frontend consumes the data** (no controller code exists here).

---

## 1. API ENDPOINT LIST

| Method | Path | Controller/Backend | Frontend File(s) |
|--------|------|-------------------|------------------|
| GET | `/api/users` | External | AdminDashboard.jsx, UserList.jsx |
| GET | `/api/users/:id` | External | UserDashboard.jsx, AuthContext.jsx, AddUser.jsx, UserList.jsx, Settings.jsx, ClaimDetailsPage (indirect) |
| PUT | `/api/users/update` | External | ProfileEditModal.jsx, AddUser.jsx |
| PUT | `/api/users/:id/:action` | External | AddUser.jsx |
| DELETE | `/api/users/:id` | External | UserList.jsx |
| POST | `/api/auth/login` | External | AuthContext.jsx |
| GET | `/api/offices` | External | AdminDashboard.jsx, AddUser.jsx, CRSReport.jsx |
| GET | `/api/offices/by-facility/:facilityId` | External | ActivityList.jsx, ClaimDetailDrawer.jsx |
| GET | `/api/designations` | External | AdminDashboard.jsx, AddUser.jsx |
| GET | `/api/categories` | External | AdminDashboard.jsx, AddUser.jsx |
| GET | `/api/departments` | External | ClinicianList.jsx |
| GET | `/api/claims/office/:officeId` | External | CRSReport.jsx |
| GET | `/api/claims/:claimId` | External | ClaimDetailsPage.jsx |
| GET | `/api/claims/:claimId/activities` | External | ClaimDetailDrawer.jsx, ClaimDetailsPage.jsx |
| GET | `/api/claims/activities?officeId=` | External | ActivityList.jsx |
| GET | `/api/claims?officeId=&reportType=` | External | useCRSReportData.js (via GlobalCacheContext cachedFetch) |
| GET | `/api/claims/kpi?officeId=` | External | useCRSReportData.js |
| GET | `/api/transactions/check-extracted/:officeId` | External | ExtractionContext.jsx |
| POST | `/api/transactions/extract-remittance/:officeId` | External | ExtractionContext.jsx |
| GET | `/api/clinicians` | External | ActivityList.jsx, ClinicianList.jsx |
| GET | `/api/clinicians/:id` | External | ClinicianList.jsx |
| GET | `/api/clinicians/by-clinicianno/:encoded` | External | ClinicianList.jsx |
| POST/PUT | `/api/clinicians` | External | ClinicianList.jsx |
| GET | `/api/denial-codes` | External | DenialCodeList.jsx |
| GET | `/api/denial-codes/:id` | External | DenialCodeList.jsx |
| GET | `/api/denial-codes/by-code/:encoded` | External | DenialCodeList.jsx |
| POST/PUT | `/api/denial-codes` | External | DenialCodeList.jsx |
| GET | `/api/departments` | External | DepartmentList.jsx |
| GET | `/api/departments/:id` | External | DepartmentList.jsx |
| POST/PUT | `/api/departments` | External | DepartmentList.jsx |
| GET | `/api/offices` | External | OfficeList.jsx |
| POST/PUT | `/api/offices` | External | OfficeList.jsx |
| GET | `/api/designations` | External | DesignationList.jsx |
| POST/PUT | `/api/designations` | External | DesignationList.jsx |
| GET | `/api/categories` | External | CategoryList.jsx |
| POST/PUT | `/api/categories` | External | CategoryList.jsx |

---

## 2. API RESPONSE FIELDS (From Frontend Usage)

### 2.1 GET `/api/users` / `GET /api/users/:id`

**Consumed by:** AdminDashboard, UserDashboard, AuthContext, AddUser, UserList, Settings, ProfileEditModal

| Field | Type | Used In |
|-------|------|---------|
| `userId` or `id` | string/number | User identification, delete |
| `userLabel` | string | AdminDashboard table, UserList search, AddUser |
| `username` | string | AdminDashboard table, UserList search |
| `roleName` | string | AdminDashboard table, UserList search, AuthContext (normalized to `role`) |
| `officeName` | string | AdminDashboard table |
| `activeUser` | boolean | AdminDashboard table status badge |
| `officeId` or `office_id` | string | UserDashboard, AuthContext, CRSReport, ActivityList |

---

### 2.2 POST `/api/auth/login`

**Request:** `{ credentials }`

**Response consumed:** `data.user` or `data`, `data.token`

---

### 2.3 GET `/api/claims/office/:officeId`

**Consumed by:** CRSReport.jsx

**Response:** Array of claim objects. Frontend maps each item using:

| Source Field (API) | Mapped/Used As |
|--------------------|-----------------|
| `id` | `id`, `claimId` |
| `claimId` | `claimId` |
| `patientName` | `patientName` |
| `settlementDate` | Parsed as DD/MM/YYYY HH:mm → ISO |
| `remittanceHeader.transactionDate` | `transactionDate` |
| `activities` or `claimLineItems` | Used to derive amounts |
| `netAmount`, `net_amount` | `netAmount` |
| `grossAmount`, `gross_amount` | `grossAmount` |
| `paidAmount`, `payment_amount`, `remittedAmount`, etc. | `paymentAmount` / `remittedAmount` |
| `rejectedAmount`, `deniedAmount` | `rejectedAmount` |
| `amount`, `totalAmount`, `chargeAmount`, etc. | `amount` |
| `payerId`, `payer`, `payerName` | `payer`, `payerId`, `payerName` |
| `facilityId`, `facility`, `facilityName` | `facility`, `facilityId` |
| `clinicianId`, `clinician`, `clinicianName`, `providerId` | `clinician` |
| `receiverId`, `remittanceHeader.receiverId` | `receiverId` |
| `remittanceHeader.dispositionFlag`, `claimStatus`, `status` | `status` |
| `remittanceHeader.transactionId`, `transactionId` | `transactionId` |
| `remittanceHeader.recordCount`, `recordCount` | `recordCount` |
| `remittanceHeader.senderId`, `senderId` | `senderId` |
| `paymentReference` | `paymentReference` |
| `providerId` | `providerId` |
| `receiverName`, `remittanceHeader.receiverName` | `receiverName` |
| `submissionDate` | Used for `settlementDate` fallback |

**KPI derived on frontend:** `totalClaims`, `totalClaimAmount`, `remittedAmount`, `pendingAmount`, `rejectedAmount`, `recoveryRate`

---

### 2.4 GET `/api/claims/:claimId/activities`

**Consumed by:** ClaimDetailDrawer, ClaimDetailsPage, ActivityList (different endpoint)

**Response:** Array or `{ activities }` or `{ data }` or `{ results }`. Activity fields used:

| Field | Usage |
|-------|--------|
| `activityId` | Row key |
| `activityStart` | Activity Start Date column |
| `activityCode` | CPT Code column |
| `activityType` | Activity Type column |
| `quantity` | QTY column |
| `clinicianId` | Clinician column |
| `denialCode` | Denial Code column |
| `grossAmount` | Gross Amount, summary totals |
| `netAmount` | Net Amount, summary totals |
| `paymentAmount` | Payment Amount, summary totals |
| `claim` (nested) | `claim.facilityId`, `claim.providerId`, `claim.claimId`, `claim.receiverId`, `claim.remittanceHeader.receiverId`, `claim.payerId`, `claim.settlementDate`, `claim.remittanceHeader.transactionDate`, `claim.paymentReference`, `claim.transactionId` |

---

### 2.5 GET `/api/claims/:claimId`

**Consumed by:** ClaimDetailsPage.jsx

| Field | Usage |
|-------|--------|
| `id`, `claimId` | Claim ID display |
| `status` | Status badge |
| `grossAmount` | Overview stat |
| `netAmount` | Overview stat |
| `paidAmount` | Overview stat |
| `payerId`, `providerId`, `facilityId` | Info grid |
| `paymentReference` | Info grid |
| `remittanceHeader.officeName` | Info grid |
| `submissionDate`, `serviceDate` | Info grid |
| `patientId` | Info grid |
| `settlementDate` | Info grid |
| `remittanceHeader.dispositionFlag` | Info grid |
| `remittanceHeader.transactionId`, `transactionDate`, `senderId`, `receiverId` | Remittance tab |

---

### 2.6 GET `/api/claims/activities?officeId=`

**Consumed by:** ActivityList.jsx

Same activity structure as 2.4. Each item has `claim` and activity fields.

---

### 2.7 GET `/api/offices`

**Consumed by:** AdminDashboard, AddUser, CRSReport (facility name mapping)

**Expected:** Array. Each item: `facilityId`, `officeName` or `facilityName`

---

### 2.8 GET `/api/offices/by-facility/:facilityId`

**Consumed by:** ActivityList, ClaimDetailDrawer (via cachedFetch)

**Expected:** `{ officeName }` or `{ facilityName }`

---

### 2.9 GET `/api/clinicians`

**Consumed by:** ActivityList (for clinician name map), ClinicianList.jsx

**Expected:** Array. Each item: `id` or `clinician_id` or `clinicianId`, `clinicianno` or `clinicianNo`, `clinician_name` or `clinicianName` or `doctor_name_as_per_heartbeat`

---

### 2.10 GET `/api/transactions/check-extracted/:officeId`

**Consumed by:** ExtractionContext.jsx

**Expected:** Boolean (`true`/`false`) or string `"true"` indicating extraction complete

---

### 2.11 POST `/api/transactions/extract-remittance/:officeId`

**Consumed by:** ExtractionContext.jsx — fire-and-forget, no response consumed

---

### 2.12 Admin CRUD (Users, Offices, Designations, Categories, Departments, Clinicians, DenialCodes)

Standard REST patterns. Responses vary; arrays for list, single object for get-by-id. Fields used per entity are in the respective list/detail components.

---

## 3. DASHBOARD COMPONENTS & DATA SOURCE

### 3.1 Components That Call APIs (Real Data)

| Component | File | Endpoints | Data Usage |
|-----------|------|-----------|------------|
| **UserDashboard** | UserDashboard.jsx | GET /api/users/:id | Profile data, officeId — passed to ProfileEditModal |
| **AdminDashboard** | AdminDashboard.jsx | GET /api/users, /api/offices, /api/designations, /api/categories | **Table:** userLabel, username, roleName, officeName, activeUser. **Metrics:** lengths of arrays |
| **CRSReport** | CRSReport.jsx | GET /api/claims/office/:officeId, GET /api/offices | **Table (DataTable):** See section 4. **KPI (KPIBar):** totalClaims, totalClaimAmount, remittedAmount, pendingAmount, rejectedAmount, recoveryRate |
| **ClaimDetailDrawer** | ClaimDetailDrawer.jsx | GET /api/claims/:id/activities, GET /api/offices/by-facility/:id | **Table:** facilityId, facilityName, claimId, transactionId, activityStart, activityCode, quantity, clinicianId, receiverId, payerId, paymentReference, netAmount, grossAmount, paymentAmount, activityId, activityType, denialCode. **Derived:** summaryTotals (grossAmount, paymentAmount, netAmount) |
| **ClaimDetailsPage** | ClaimDetailsPage.jsx | GET /api/claims/:claimId, GET /api/claims/:id/activities | **Overview:** grossAmount, netAmount, paidAmount, claimId, payerId, providerId, facilityId, paymentReference, settlementDate, submissionDate, serviceDate, patientId, remittanceHeader. **Activities table:** activityCode, activityType, denialCode, activityId, clinicianId, quantity, grossAmount, netAmount |
| **ActivityList** | ActivityList.jsx | GET /api/claims/activities, /api/offices/by-facility/:id, /api/clinicians | **Table:** Same columns as ClaimDetailDrawer activities. **Derived:** summaryTotals |
| **KPIBar** | KPIBar.jsx | Receives kpiStats from CRSReport | **Display:** totalClaims, totalClaimAmount, remittedAmount, pendingAmount, rejectedAmount, recoveryRate |

### 3.2 Components Using MOCK Data (No API)

All analytics dashboard components use `mockDashboardData.js`:

| Component | Mock Function | Table Fields | Chart Fields | Derived |
|------------|---------------|--------------|--------------|---------|
| **OverviewSection** | getOverviewKPIs, getExecutiveSummaryData | — | — | KPI cards: totalClaimsCount, totalClaimedAmount, totalRemittedAmount, totalRejectedAmount, overallRejectionPct, totalWriteOffAmount, totalUnprocessedAmount, recoveryPct |
| **ExecutiveSummaryTable** | getExecutiveSummaryData | months, claimedAmount, processedAmount, paidAmount, initialRejectedAmount, initialRejPct, currentRejectedAmount, currRejPct, unprocessedAmount, processedAmountPct | — | — |
| **ExecutiveMetricsSection** | getExecutiveMetricsData | — | monthlyTrend (months, revenue, paid, currRejected, medical, technical), opVsIp | kpis (totalClaimed, totalProcessed, totalPaid, etc.) |
| **DenialAnalysisSection** | getDenialAnalysisData, getDenialReasonBreakdown, etc. | topReasons (reason, amount, pct) | categoryBreakdown (name, value) | — |
| **DoctorPerformanceSection** | getDoctorPerformanceData | doctors (doctor, speciality, claimed, medicalDenials, etc.), specialitySummary | — | totals |
| **PayerPerformanceSection** | getPayerPerformanceData | payers (insurance, claimed, processed, etc.) | — | totals |
| **RejectionAnalyticsSection** | getRejectionAnalyticsData | matrix.rows | trends, categoryBreakdown, opVsIp | — |
| **ClaimsExplorerSection** | getClaimsExplorerRows | id, claimId, patientName, doctor, speciality, claimType, claimedAmount, remittedAmount, rejectedAmount, status, paymentStatus, submissionDate | — | — |
| **FinancialRiskSection** | (financial mock) | — | — | — |

---

## 4. CRSReport DataTable – Field Usage by Report Type

### claim_summary_month

| Column ID | Source | Notes |
|-----------|--------|-------|
| month | Derived | From transactionDate |
| year | Derived | From transactionDate |
| count | recordCount | Default 1 |
| claimAmount | grossAmount | Formatted as AED |
| facilityId | API | |
| facilityName | facilityNameMap[facilityId] | From /api/offices |
| claimId | API | |
| receiverId | API | |
| receiverName | API or remittanceHeader.receiverName | |
| payerId | API | |
| payerName | API | |
| providerId | API | |
| senderId | API or remittanceHeader.senderId | |
| transactionId | API or remittanceHeader.transactionId | |
| paymentReference | API | |
| transactionDate | API | |
| settlementDate | API or submissionDate | |
| recordCount | API | |
| status | API | |
| netAmount, grossAmount, paymentAmount | API | |

### claim_summary_payer

Same as above, different column order. Extra: `remittedAmount`, `rejectedAmount`.

### claim_details

Same core fields. No month/year grouping.

---

## 5. useCRSReportData Hook (Alternate Data Path)

**Endpoints:** GET `/api/claims?officeId=&reportType=`, GET `/api/claims/kpi?officeId=`

**Usage:** Via GlobalCacheContext `cachedFetch`. Response shape expected: `data` or array for claims; `data` or object for kpi. Fields aligned with CRSReport mapping above.

---

## 6. Summary Matrix

| Endpoint | Dashboard/Component | Table | Chart | Derived |
|----------|---------------------|-------|-------|--------|
| GET /api/users | AdminDashboard | userLabel, username, roleName, officeName, activeUser | — | users.length, etc. |
| GET /api/users/:id | UserDashboard | — | — | officeId, profile |
| GET /api/claims/office/:id | CRSReport | Full claim columns | — | KPI: totalClaims, amounts, recoveryRate |
| GET /api/claims/:id/activities | ClaimDetailDrawer, ActivityList | Activity columns | — | summaryTotals |
| GET /api/claims/:claimId | ClaimDetailsPage | — | — | Overview stats |
| Analytics Dashboard | mockDashboardData | Executive, Denial, Doctor, Payer tables | Trends, pie/bar charts | KPIs, totals |

---

*Generated from codebase scan. No backend controller code exists in this repository.*
