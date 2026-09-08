# Dashboard API Field & Analytics Audit

**Project:** CRS-MAIN (Hospital Management System - Frontend)  
**Audit Date:** 2025-02-27  
**Note:** This is a **frontend-only** repository. No backend controllers exist in this repo. All APIs are external (proxied via `VITE_API_BASE_URL`). Response structures are documented from **actual frontend consumption** in code.

---

## Endpoint: GET /api/users

**Controller File:** External backend (not in repo)  
**Used In:** `AdminDashboard.jsx`, `UserList.jsx`

| Field Name    | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes                          |
|---------------|-----------|-----------------|---------------|---------------|---------------|----------------------|--------------------------------|
| userId        | string/number | ✓             | ✓             | ✗             | ✗             | ✗                    | Row key, delete, navigation     |
| userLabel     | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Display name in Recent Users     |
| username      | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Display, search filter           |
| roleName      | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Display, search filter           |
| officeName    | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Display (fallback: 'HO')          |
| activeUser    | boolean   | ✓              | ✓             | ✗             | ✗             | ✗                    | Status badge (Active/Inactive)   |

### Derived Fields (Created in Frontend)

- None for this endpoint.

### Fields Required but Missing from Backend

- None identified. All table columns are populated from API.

---

## Endpoint: GET /api/users/:id

**Controller File:** External backend  
**Used In:** `UserDashboard.jsx`, `AuthContext.jsx`, `AddUser.jsx`, `UserList.jsx`, `Settings.jsx`, `ClaimDetailsPage.jsx` (indirect via user)

| Field Name   | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes                             |
|--------------|-----------|-----------------|---------------|---------------|---------------|----------------------|-----------------------------------|
| userId / id  | string/number | ✓           | ✗             | ✗             | ✗             | ✗                    | Profile refresh, navigation       |
| officeId     | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | CRSReport, ActivityList, extraction |
| office_id    | string    | ✓ (alt)        | ✗             | ✗             | ✗             | ✗                    | Snake-case fallback               |
| roleName     | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Normalized to `role` in AuthContext |
| officeName   | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Settings display                   |
| userLabel    | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Topbar, MedicalDashboard           |
| username     | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Topbar display                     |
| email        | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Settings "Logged in as"            |

### Derived Fields (Created in Frontend)

- `role` = `roleName?.toLowerCase()` — AuthContext normalizes for app use

### Fields Required but Missing from Backend

- None identified.

---

## Endpoint: POST /api/auth/login

**Controller File:** External backend  
**Used In:** `AuthContext.jsx` → `Login.jsx`

| Field Name | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes          |
|-------------|-----------|-----------------|---------------|---------------|---------------|----------------------|----------------|
| user        | object    | ✓              | ✗             | ✗             | ✗             | ✗                    | Full user object (or response is user) |
| token       | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Stored in localStorage            |
| roleName    | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Normalized to `role`               |
| userId / id | string/number | ✓        | ✗             | ✗             | ✗             | ✗                    | Used to fetch user details         |

### Derived Fields (Created in Frontend)

- `role` = `rawUser.roleName?.toLowerCase() || rawUser.role`

### Fields Required but Missing from Backend

- None identified.

---

## Endpoint: GET /api/offices

**Controller File:** External backend  
**Used In:** `AdminDashboard.jsx`, `AddUser.jsx`, `CRSReport.jsx`

| Field Name   | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes                          |
|--------------|-----------|-----------------|---------------|---------------|---------------|----------------------|--------------------------------|
| facilityId   | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Map key for facilityNameMap      |
| officeName   | string    | ✓              | ✓ (AddUser)   | ✗             | ✗             | ✗                    | Dropdown options                 |
| facilityName | string    | ✓ (alt)        | ✗             | ✗             | ✗             | ✗                    | Fallback for officeName          |
| officeId     | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | AddUser form value               |

### Derived Fields (Created in Frontend)

- `facilityNameMap[facilityId]` = `officeName || facilityName` — Built in CRSReport for Branch Name column lookup

### Fields Required but Missing from Backend

- None identified.

---

## Endpoint: GET /api/offices/by-facility/:facilityId

**Controller File:** External backend  
**Used In:** `ActivityList.jsx`, `ClaimDetailDrawer.jsx` (via GlobalCacheContext)

| Field Name   | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes                          |
|--------------|-----------|-----------------|---------------|---------------|---------------|----------------------|--------------------------------|
| officeName   | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Branch Name column               |
| facilityName | string    | ✓ (alt)        | ✓             | ✗             | ✗             | ✗                    | Fallback for officeName          |

### Derived Fields (Created in Frontend)

- None.

### Fields Required but Missing from Backend

- None identified.

---

## Endpoint: GET /api/claims/office/:officeId

**Controller File:** External backend  
**Used In:** `CRSReport.jsx`

| Field Name             | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes                                        |
|------------------------|-----------|-----------------|---------------|---------------|---------------|----------------------|----------------------------------------------|
| id                     | string/number | ✓           | ✓             | ✗             | ✗             | ✗                    | Claim ID                                     |
| claimId                | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Display, fallback for id                      |
| patientName            | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Patient column                                |
| settlementDate         | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | DD/MM/YYYY HH:mm parsed to ISO                 |
| remittanceHeader       | object    | ✓              | ✓             | ✗             | ✗             | ✗                    | transactionDate, receiverId, senderId, etc.   |
| remittanceHeader.transactionDate | string | ✓      | ✓             | ✗             | ✗             | ✗                    | Month/Year derivation, Transaction Date       |
| remittanceHeader.recordCount | number | ✓    | ✓             | ✗             | ✗             | ✗                    | Count column                                  |
| remittanceHeader.receiverId | string | ✓  | ✓             | ✗             | ✗             | ✗                    | Receiver ID                                   |
| remittanceHeader.senderId | string  | ✓             | ✓             | ✗             | ✗             | ✗                    | Sender ID                                     |
| remittanceHeader.transactionId | string | ✓ | ✓             | ✗             | ✗             | ✗                    | Transaction ID                                |
| remittanceHeader.dispositionFlag | string | ✓ | ✓             | ✗             | ✗             | ✗                    | Status derivation                              |
| remittanceHeader.receiverName | string | ✓ | ✓             | ✓             | ✗             | ✗             | ✗                    | Receiver Name                                 |
| activities             | array     | ✓              | ✗             | ✗             | ✓             | ✗                    | Used to derive amounts if line items present   |
| claimLineItems         | array     | ✓ (alt)        | ✗             | ✗             | ✓             | ✗                    | Same as activities                             |
| netAmount / net_amount | number    | ✓              | ✓             | ✗             | ✗             | ✗                    | Net Amount column                              |
| grossAmount / gross_amount | number | ✓        | ✓             | ✗             | ✗             | ✗                    | Claim Amount, Gross column                      |
| paymentAmount / payment_amount | number | ✓  | ✓             | ✗             | ✗             | ✗                    | Payment column                                 |
| payerId / payer / payerName | string | ✓   | ✓             | ✗             | ✗             | ✗                    | Payer columns                                  |
| facilityId / facility / facilityName | string | ✓ | ✓             | ✗             | ✗             | ✗                    | Branch ID, facility lookup                      |
| clinicianId / clinician / clinicianName / providerId | string | ✓ | ✓ | ✗             | ✗             | ✗             | ✗                    | Clinician (filter only)                        |
| receiverId             | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Receiver ID                                    |
| providerId             | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Provider ID column                             |
| paymentReference       | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Payment Reference column                       |
| transactionId          | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Transaction ID (or remittanceHeader)          |
| status / claimStatus / dispositionFlag | string | ✓ | ✓             | ✗             | ✗             | ✗             | ✗                    | Status column                                  |
| submissionDate         | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Fallback for settlementDate                     |

### Derived Fields (Created in Frontend)

| Field           | Formula                                                          | Component        |
|-----------------|------------------------------------------------------------------|------------------|
| month           | From `transactionDate` or `settlementDate` → `toLocaleDateString('en-US', { month: 'long' })` | CRSReport DataTable |
| year            | From `transactionDate` or `settlementDate` → `getFullYear()`      | CRSReport DataTable |
| count           | `recordCount || 1`                                                | CRSReport DataTable |
| claimAmount     | Formatted `grossAmount` as AED                                   | CRSReport DataTable |
| facilityName    | `facilityNameMap[facilityId]` from /api/offices                   | CRSReport DataTable |
| amount          | From activities: sum of netAmount/grossAmount/chargeAmount/amount; else from item | CRSReport (KPI)  |
| remittedAmount  | From activities: sum of paidAmount/paymentAmount; else from item/remittanceHeader | CRSReport (KPI) |
| rejectedAmount  | From activities: sum of rejectedAmount/deniedAmount; else from item | CRSReport (KPI) |
| totalClaims     | `mappedData.length`                                               | KPIBar           |
| totalClaimAmount| Sum of `amount` across all claims                                 | KPIBar           |
| pendingAmount   | Sum of amounts where status is PENDING or PRODUCTION              | KPIBar           |
| recoveryRate    | `(remitted / totalAmt) * 100` if totalAmt > 0                    | KPIBar           |

### Fields Required but Missing from Backend

| Field Name       | Why Needed                                         | Suggested Backend Logic                                   |
|------------------|----------------------------------------------------|----------------------------------------------------------|
| facilityName     | Branch Name column if office not in map             | Return `facilityName`/`officeName` in claim or join     |
| receiverName     | Receiver Name sometimes absent                     | Include in remittanceHeader or claim                     |
| payerName        | Payer Name sometimes derived from payerId only     | Include payer name in response                          |

---

## Endpoint: GET /api/claims/:claimId/activities

**Controller File:** External backend  
**Used In:** `ClaimDetailDrawer.jsx`, `ClaimDetailsPage.jsx`

| Field Name     | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes                          |
|----------------|-----------|-----------------|---------------|---------------|---------------|----------------------|--------------------------------|
| activityId     | string/number | ✓          | ✓             | ✗             | ✗             | ✗                    | Row key, Activity ID column     |
| activityStart  | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Activity Start Date column      |
| activityCode   | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | CPT Code column                 |
| activityType   | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Activity Type column            |
| quantity       | number    | ✓              | ✓             | ✗             | ✗             | ✗                    | QTY column                      |
| clinicianId    | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Clinician column                |
| denialCode     | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Denial Code column              |
| grossAmount    | number    | ✓              | ✓             | ✗             | ✗             | ✗                    | Gross Amount, summary total      |
| netAmount      | number    | ✓              | ✓             | ✗             | ✗             | ✗                    | Net Amount, summary total        |
| paymentAmount  | number    | ✓              | ✓             | ✗             | ✗             | ✗                    | Payment Amount, summary total    |
| claim          | object    | ✓              | ✓             | ✗             | ✗             | ✗                    | Nested: facilityId, providerId, claimId, receiverId, payerId, settlementDate, remittanceHeader, paymentReference, transactionId |

### Derived Fields (Created in Frontend)

| Field          | Formula                                                   | Component                |
|----------------|-----------------------------------------------------------|--------------------------|
| summaryTotals  | `filteredActivities.reduce((acc, act) => { acc.grossAmount += act.grossAmount; acc.paymentAmount += act.paymentAmount; acc.netAmount += act.netAmount; return acc; })` | ClaimDetailDrawer, ActivityList |
| facilityName   | `facilityNameMap[id]` from GET /api/offices/by-facility/:id | ClaimDetailDrawer        |
| invoiceNumber  | `claimId.replace(/\D/g, '')` (digits only)                | ClaimDetailDrawer        |

### Fields Required but Missing from Backend

| Field Name      | Why Needed                                      | Suggested Backend Logic                         |
|-----------------|-------------------------------------------------|-------------------------------------------------|
| clinicianName   | Clinician Name column shows '-' or '…'          | Include clinician name in activity or join      |
| receiverName    | Receiver Name column shows '-'                  | Include in claim object                         |
| payerName       | Payer Name column shows '-'                     | Include in claim object                         |

---

## Endpoint: GET /api/claims/activities?officeId=

**Controller File:** External backend  
**Used In:** `ActivityList.jsx`

**Response structure:** Same as GET /api/claims/:claimId/activities. Each item is an activity with optional nested `claim` object.

| Field Name     | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes                          |
|----------------|-----------|-----------------|---------------|---------------|---------------|----------------------|--------------------------------|
| activityId     | string/number | ✓          | ✓             | ✗             | ✗             | ✗                    | Row key                         |
| activityStart  | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Activity Start Date             |
| activityCode   | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | CPT Code                        |
| quantity       | number    | ✓              | ✓             | ✗             | ✗             | ✗                    | QTY                             |
| clinicianId    | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Clinician ID (name from /api/clinicians) |
| grossAmount    | number    | ✓              | ✓             | ✗             | ✗             | ✗                    | Gross Amount                     |
| netAmount      | number    | ✓              | ✓             | ✗             | ✗             | ✗                    | Net Amount                       |
| paymentAmount  | number    | ✓              | ✓             | ✗             | ✗             | ✗                    | Payment Amount                   |
| claim.facilityId / claim.providerId | string | ✓ | ✓             | ✗             | ✗             | ✗                    | Branch ID, filter               |
| claim.receiverId / claim.remittanceHeader.receiverId | string | ✓ | ✓             | ✗             | ✗             | ✗                    | Receiver ID                      |
| claim.payerId  | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Payer filter                     |
| claim.claimId  | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Invoice number, encounter filter |
| claim.settlementDate | string | ✓         | ✓             | ✗             | ✗             | ✗                    | Date filter                      |
| claim.remittanceHeader.transactionDate | string | ✓ | ✓             | ✗             | ✗             | ✗                    | Date filter                      |
| claim.paymentReference | string | ✓        | ✓             | ✗             | ✗             | ✗                    | Payment Reference                |
| claim.remittanceHeader.transactionId | string | ✓ | ✓             | ✗             | ✗             | ✗                    | Transaction ID                   |
| denialCode     | string    | ✓              | ✓             | ✗             | ✗             | ✗                    | Denial filter                    |

### Derived Fields (Created in Frontend)

| Field          | Formula                                                         | Component    |
|----------------|-----------------------------------------------------------------|--------------|
| clinicianName  | `clinicianNameMap[clinicianId]` from GET /api/clinicians        | ActivityList |
| facilityName   | `facilityNameMap[facilityId]` from GET /api/offices/by-facility | ActivityList |
| invoiceNumber  | `claimId.replace(/\D/g, '')`                                    | ActivityList |
| summaryTotals  | Sum of grossAmount, paymentAmount, netAmount                    | ActivityList |

### Fields Required but Missing from Backend

| Field Name      | Why Needed                                      | Suggested Backend Logic                         |
|-----------------|-------------------------------------------------|-------------------------------------------------|
| clinicianName   | Clinician Name shows '…' if not in clinicians list | Include in activity or expand clinicians       |
| receiverName     | Receiver Name column hardcoded '-'              | Include in claim                                |
| payerName        | Payer Name column hardcoded '-'                 | Include in claim                                |

---

## Endpoint: GET /api/claims/:claimId

**Controller File:** External backend  
**Used In:** `ClaimDetailsPage.jsx`

| Field Name   | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes          |
|--------------|-----------|-----------------|---------------|---------------|---------------|----------------------|----------------|
| id           | string/number | ✓           | ✗             | ✗             | ✗             | ✗                    | Claim ID display |
| claimId      | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Claim ID display |
| status       | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Status badge    |
| grossAmount  | number    | ✓              | ✗             | ✗             | ✗             | ✗                    | Overview stat   |
| netAmount    | number    | ✓              | ✗             | ✗             | ✗             | ✗                    | Overview stat   |
| paidAmount   | number    | ✓              | ✗             | ✗             | ✗             | ✗                    | Overview stat   |
| payerId      | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Info grid       |
| providerId   | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Info grid       |
| facilityId   | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Info grid (Branch) |
| paymentReference | string | ✓            | ✗             | ✗             | ✗             | ✗                    | Info grid       |
| remittanceHeader.officeName | string | ✓ | ✗             | ✗             | ✗             | ✗                    | Info grid       |
| submissionDate | string  | ✓              | ✗             | ✗             | ✗             | ✗                    | Info grid       |
| serviceDate  | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Info grid       |
| patientId    | string    | ✓              | ✗             | ✗             | ✗             | ✗                    | Info grid       |
| settlementDate | string  | ✓              | ✗             | ✗             | ✗             | ✗                    | Info grid       |
| remittanceHeader.dispositionFlag | string | ✓ | ✗             | ✗             | ✗             | ✗                    | Info grid       |
| remittanceHeader.transactionId | string | ✓ | ✗             | ✗             | ✗             | ✗                    | Remittance tab  |
| remittanceHeader.transactionDate | string | ✓ | ✗             | ✗             | ✗             | ✗                    | Remittance tab  |
| remittanceHeader.senderId | string | ✓ | ✗             | ✗             | ✗             | ✗                    | Remittance tab  |
| remittanceHeader.receiverId | string | ✓ | ✗             | ✗             | ✗             | ✗                    | Remittance tab  |

### Derived Fields (Created in Frontend)

| Field        | Formula                              | Component         |
|--------------|--------------------------------------|-------------------|
| Outstanding  | `(netAmount || 0) - (paidAmount || 0)` | ClaimDetailsPage  |

### Fields Required but Missing from Backend

- None identified. All displayed fields come from API.

---

## Endpoint: GET /api/clinicians

**Controller File:** External backend  
**Used In:** `ActivityList.jsx`, `ClinicianList.jsx`

| Field Name  | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes                          |
|-------------|-----------|-----------------|---------------|---------------|---------------|----------------------|--------------------------------|
| id / clinician_id / clinicianId | string/number | ✓ | ✓             | ✗             | ✗             | ✗                    | Map key                         |
| clinicianno / clinicianNo | string | ✓              | ✗             | ✗             | ✗             | ✗                    | Alternate map key               |
| clinician_name / clinicianName / doctor_name_as_per_heartbeat | string | ✓ | ✓             | ✗             | ✗             | ✗                    | Clinician Name column           |

### Derived Fields (Created in Frontend)

- `clinicianNameMap[id]` / `clinicianNameMap[clinicianno]` = name — Built in ActivityList for display

### Fields Required but Missing from Backend

- None identified.

---

## Endpoint: GET /api/claims?officeId=&reportType=

**Controller File:** External backend  
**Used In:** `useCRSReportData.js` (via GlobalCacheContext cachedFetch)

**Note:** This alternate data path expects the same structure as GET /api/claims/office/:officeId. Used when CRSReport uses useCRSReportData instead of direct fetch. Response: `data` or array.

---

## Endpoint: GET /api/claims/kpi?officeId=

**Controller File:** External backend  
**Used In:** `useCRSReportData.js`

**Expected response fields (from KPIBar consumption):**

| Field Name       | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes     |
|------------------|-----------|-----------------|---------------|---------------|---------------|----------------------|-----------|
| totalClaims      | number    | ✓              | ✗             | ✗             | ✗             | ✗                    | KPI card  |
| totalClaimAmount | number    | ✓              | ✗             | ✗             | ✗             | ✗                    | KPI card  |
| remittedAmount   | number    | ✓              | ✗             | ✗             | ✗             | ✗                    | KPI card  |
| pendingAmount    | number    | ✓              | ✗             | ✗             | ✗             | ✗                    | KPI card  |
| rejectedAmount   | number    | ✓              | ✗             | ✗             | ✗             | ✗                    | KPI card  |
| recoveryRate     | number    | ✓              | ✗             | ✗             | ✗             | ✗                    | KPI card  |

**Note:** CRSReport currently computes KPI from claims/office response. If backend provides dedicated KPI endpoint, above fields expected.

---

## Other API Endpoints (Admin CRUD – Not Dashboard Tables/Charts)

| Method | Path | Used In | Purpose |
|--------|------|---------|---------|
| PUT | /api/users/update | ProfileEditModal, AddUser | Update user |
| PUT | /api/users/:id/:action | AddUser | Activate/deactivate |
| DELETE | /api/users/:id | UserList | Delete user |
| GET/POST/PUT | /api/designations | DesignationList, AdminDashboard | CRUD designations |
| GET/POST/PUT | /api/categories | CategoryList, AdminDashboard | CRUD categories |
| GET/POST/PUT | /api/departments | DepartmentList, ClinicianList | CRUD departments |
| GET/POST/PUT | /api/offices | OfficeList | CRUD offices |
| GET/POST/PUT | /api/clinicians | ClinicianList | CRUD clinicians |
| GET/POST/PUT | /api/denial-codes | DenialCodeList | CRUD denial codes |

**Note:** These endpoints support admin configuration. Field-level audit deferred; list/detail components consume standard REST response patterns.

---

## Endpoint: GET /api/transactions/check-extracted/:officeId

**Controller File:** External backend  
**Used In:** `ExtractionContext.jsx`

| Field Name | Data Type | Coming from API | Used in Table | Used in Chart | Derived Field | Required but Missing | Notes                 |
|------------|-----------|-----------------|---------------|---------------|---------------|----------------------|-----------------------|
| (response) | boolean/string | ✓       | ✗             | ✗             | ✗             | ✗                    | true/"true" = extracted |

---

## Endpoint: POST /api/transactions/extract-remittance/:officeId

**Controller File:** External backend  
**Used In:** `ExtractionContext.jsx`

**Response:** Not consumed (fire-and-forget).

---

## Analytics Dashboard (Mock Data Only)

**Data Source:** `src/components/analytics-dashboard/data/mockDashboardData.js`  
**No API calls.** All sections use mock functions.

| Section                  | Mock Function              | Table Fields                                                                                                                                 | Chart Fields                                                                 | Derived Fields                                                                 |
|--------------------------|----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| OverviewSection          | getOverviewKPIs, getExecutiveSummaryData | —                                                                                                                                           | —                                                                            | totalClaimsCount, totalClaimedAmount, totalRemittedAmount, totalRejectedAmount, overallRejectionPct, totalWriteOffAmount, totalUnprocessedAmount, recoveryPct |
| ExecutiveSummaryTable    | getExecutiveSummaryData    | months, claimedAmount, processedAmount, paidAmount, initialRejectedAmount, initialRejPct, currentRejectedAmount, currRejPct, unprocessedAmount, processedAmountPct | —                                                                            | initialRejPct, currRejPct, processedAmountPct (from mock)                                                                 |
| ExecutiveMetricsSection  | getExecutiveMetricsData    | —                                                                                                                                            | monthlyTrend (months, revenue, paid, currRejected, medical, technical), opVsIp | kpis (totalClaimed, totalProcessed, totalPaid, etc.), recoveryPct             |
| DenialAnalysisSection   | getDenialAnalysisData     | topReasons (reason, amount, pct)                                                                                                             | categoryBreakdown (name, value)                                              | pct from amount/grandTotal                                                      |
| DoctorPerformanceSection | getDoctorPerformanceData  | doctors (doctor, speciality, claimed, medicalDenials, medicalDenialPct, etc.), specialitySummary                                            | —                                                                            | totals, medicalDenialPct, rrPct, medicalRRPct                                   |
| PayerPerformanceSection  | getPayerPerformanceData   | payers (insurance, claimed, processed, unprocessed, initialRejected, currentRejected, initialRejPct, currentRejPct, businessContributionPct)   | —                                                                            | totals                                                                         |
| RejectionAnalyticsSection| getRejectionAnalyticsData | matrix.rows (label, values, fy, type)                                                                                                        | trends, categoryBreakdown, opVsIp                                            | —                                                                              |
| ClaimsExplorerSection    | getClaimsExplorerRows     | id, claimId, patientName, doctor, speciality, claimType, claimedAmount, remittedAmount, rejectedAmount, status, paymentStatus, submissionDate | —                                                                            | —                                                                              |
| FinancialRiskSection     | (financial mock)          | —                                                                                                                                            | —                                                                            | —                                                                              |

**Production readiness:** When migrating to real API, backend must provide equivalent aggregated endpoints returning the structure expected by each mock function.

---

# Summary

| Metric                          | Count |
|---------------------------------|-------|
| Total Endpoints Audited (with field tables) | 12 |
| Other Endpoints Documented      | 9+ (Admin CRUD) |
| Total Fields Coming from API    | ~85   |
| Total Derived Fields            | 18    |
| Total Missing Fields            | 5     |

### Missing Fields Summary

| Endpoint                           | Missing Field(s)   | Impact                                               |
|-----------------------------------|--------------------|------------------------------------------------------|
| GET /api/claims/office/:officeId  | facilityName, receiverName, payerName (when absent) | Branch/Payer/Receiver names may show '-'             |
| GET /api/claims/:id/activities    | clinicianName, receiverName, payerName              | Clinician Name, Receiver Name, Payer Name show '-'   |
| GET /api/claims/activities        | clinicianName, receiverName, payerName             | Same as above                                        |

### Recommendations

1. **Backend alignment:** Ensure claims response includes `facilityName`, `receiverName`, `payerName` when IDs are present, or provide lookup endpoints that the frontend already calls (offices/by-facility, clinicians).
2. **Analytics migration:** Define backend APIs mirroring mock structures before replacing mockDashboardData.js.
3. **KPI endpoint:** If GET /api/claims/kpi is used, ensure it returns totalClaims, totalClaimAmount, remittedAmount, pendingAmount, rejectedAmount, recoveryRate.

---

*Generated from codebase scan. No backend controller code exists in this repository.*
