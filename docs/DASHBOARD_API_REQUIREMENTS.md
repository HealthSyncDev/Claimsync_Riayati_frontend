# Dashboard API Requirements Document

**Project:** CRS-MAIN (Hospital Management System)  
**Audience:** Backend Developers  
**Purpose:** Technical API and aggregation requirements for analytics dashboard migration from mock data to real APIs  
**Generated:** 2025-03-04

---

## Table of Contents

1. [Claim Lifecycle Logic (MANDATORY)](#1-claim-lifecycle-logic-mandatory)
2. [Input API Structure](#2-input-api-structure)
3. [Overview Tab](#3-overview-tab)
4. [Rejection Analytics Tab](#4-rejection-analytics-tab)
5. [Doctor Performance Tab](#5-doctor-performance-tab)
6. [Payer Performance Tab](#6-payer-performance-tab)
7. [Denial Analysis Tab](#7-denial-analysis-tab)
8. [Financial Risk Tab](#8-financial-risk-tab)
9. [Claims Explorer Tab](#9-claims-explorer-tab)
10. [API Gaps & Required Enhancements](#10-api-gaps--required-enhancements)
11. [Variable Mapping Table](#11-variable-mapping-table)
12. [Example Claim Lifecycle Calculation](#12-example-claim-lifecycle-calculation)

---

## 1. Claim Lifecycle Logic (MANDATORY)

All dashboard metrics must be computed using this lifecycle logic. **Never sum activity netAmount blindly.** Always compute per `claimId` first, then aggregate.

### Activity Types

| activityType | Meaning |
|--------------|---------|
| 3 | Initial Submission |
| 4 | Resubmission |
| 5 | Re-resubmission |

### Core Definitions

| Term | Formula | Source |
|-----|---------|--------|
| **Claimed** | Sum of claim original amounts (netAmount from activityType=3 per claim) | Activities API |
| **Total Paid** | Sum of claim-level `paymentAmount` across all activities for that claim | Activities API |
| **Initial Rejected** | Per claim: `(activityType = 3) → (netAmount - paymentAmount)` | Activities API |
| **Final Rejected** | `Claim Original Amount - Total Paid` | Derived |
| **Recovery** | `Initial Rejected - Final Rejected` | Derived |
| **Current Rejection %** | `Final Rejected / Claimed` | Derived |
| **Initial Rejection %** | `Initial Rejected / Claimed` | Derived |
| **Processed** | `Claimed - Unprocessed` | Derived |
| **Unprocessed** | Claims without settlement or without insurer response | Claims API |

### Example Flow

```
Initial submission:
  Claimed: 100
  Approved: 50
  Initial Rejected: 50

Resubmission:
  Resubmitted: 50
  Approved: 30
  Current Rejected: 20

Final State:
  Total Claimed = 100
  Total Paid = 80
  Final Rejected = 20
  Recovery = 30
```

### Rules

- All calculations must be done **per claimId** before aggregation.
- **Never sum activity netAmount blindly** across activities.
- **Final Rejection** must be computed from claim final state: `Claim Original Amount - Total Paid`.
- **Monthly grouping** for claimed must be based on **submission date** (activityType=3 activityStart).
- **Paid grouping** must clarify whether based on `settlementDate` or submission month.
- **Percentages** must be **backend-calculated**.
- **Frontend must not perform financial aggregation.**

---

## 2. Input API Structure

### 2.1 Activities Endpoint

**Path:** `GET /api/claims/activities?officeId={officeId}`  
**Response:** Array of activity objects

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `claim.claimId` | string | ✓ | Link to claim |
| `activityType` | number/string | ✓ | 3=Initial, 4=Resubmission, 5=Re-resubmission |
| `activityStart` | string | ✓ | ISO date |
| `netAmount` | number | ✓ | Per-activity net |
| `paymentAmount` | number | ✓ | Per-activity payment |
| `denialCode` | string | | Denial code |
| `denialType` | string | | Medical/Technical classification |
| `department_name` | string | | Department/speciality |
| `clinicianId` | string | ✓ | Doctor mapping |
| `clinician_name` | string | | Doctor display name |
| `payerId` | string | ✓ | Payer mapping |
| `payerName` | string | | Payer display name |

### 2.2 Claims Endpoint

**Path:** `GET /api/claims/office/:officeId`  
**Response:** Array of claim objects

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `claimId` | string | ✓ | Unique claim identifier |
| `netAmount` | number | ✓ | Claim original amount |
| `paymentAmount` | number | | Per-claim paid (or sum from activities) |
| `payerId` | string | ✓ | Payer mapping |
| `payerName` | string | | Payer display name |
| `settlementDate` | string | | For processed/unprocessed |
| `providerId` | string | | Provider mapping |
| `facilityId` | string | | Facility mapping |
| `remittanceHeader` | object | | transactionDate, dispositionFlag, etc. |

### 2.3 Verification Checklist

| Variable | Present in API? | Notes |
|----------|-----------------|-------|
| `approvedAmount` | ❌ | Not present; derive from `paymentAmount` |
| `rejectedAmount` | ⚠️ | Partial; CRSReport uses `rejectedAmount`/`deniedAmount` from activities |
| `writeOffAmount` | ❌ | Not present |
| `claimStatus` | ⚠️ | Via `dispositionFlag` or `status` |
| `claimType` (IP/OP) | ⚠️ | Derived from claimId prefix (DLHI=IP, DLHO=OP) |
| `department` mapping | ⚠️ | Via clinician→department |
| `doctor` mapping | ⚠️ | Via `clinicianId` + clinicians API |

---

## 3. Overview Tab

### 3.1 KPI Cards

| Metric Name | Formula | Required Variables | Source Endpoint | Missing From API? | Example |
|-------------|---------|-------------------|-----------------|-------------------|---------|
| Total Claims Count | `COUNT(DISTINCT claimId)` | claimId | Claims, Activities | No | 12453 |
| Total Claimed Amount | `SUM(claim.originalAmount)` per claim | claimId, netAmount (activityType=3) | Activities | No | 34,222,916 |
| Total Remitted Amount | `SUM(paymentAmount)` per claim, aggregated | claimId, paymentAmount | Activities | No | 29,815,946 |
| Total Rejected Amount | `SUM(Final Rejected)` per claim | claimId, netAmount, paymentAmount | Activities | No | 2,406,970 |
| Overall Rejection % | `(Total Rejected / Total Claimed) × 100` | Derived | — | No | 9% |
| Total Write-Off Amount | `SUM(writeOffAmount)` per claim | writeOffAmount | Claims | **Yes** | 512,340 |
| Total Unprocessed Amount | `SUM(claim.netAmount)` where no settlement | claimId, settlementDate, netAmount | Claims | No | 892,000 |
| Recovery % | `(Recovered / Initial Rejected) × 100` | Initial Rejected, Final Rejected | Activities | No | 15% |

### 3.2 Executive Summary Table

| Column | Formula | Aggregation | Required Variables | Missing? |
|--------|---------|-------------|---------------------|---------|
| Month | `MONTH(submissionDate)` | Monthly | activityStart (activityType=3) | No |
| Claimed | `SUM(claimed)` per month | Monthly | Claim original amount | No |
| Processed | `SUM(processed)` per month | Monthly | Claimed - Unprocessed | No |
| Paid | `SUM(paymentAmount)` per month | Monthly | paymentAmount, settlementDate | No |
| Initial Rejected | `SUM(Initial Rejected)` per month | Monthly | activityType=3, netAmount, paymentAmount | No |
| Initial Rej% | `(Initial Rejected / Claimed) × 100` | Monthly | Derived | No |
| Curr. Rejected | `SUM(Final Rejected)` per month | Monthly | claimId, netAmount, paymentAmount | No |
| Curr. Rej% | `(Curr Rejected / Processed) × 100` | Monthly | Derived | No |
| Unprocessed | `SUM(unprocessed)` per month | Monthly | Claimed - Processed | No |
| Processed% | `(Processed / Claimed) × 100` | Monthly | Derived | No |

### 3.3 IP vs OP Breakdown

| Dimension | Formula | Required Variables | Missing? |
|-----------|---------|---------------------|----------|
| claimType | IP if claimId starts with DLHI; OP if DLHO | claimId | ⚠️ Backend must expose `claimType` explicitly |

### 3.4 Executive Metrics Chart

| Series | Formula | Aggregation | Required Variables |
|--------|---------|-------------|---------------------|
| Revenue | Claimed per month | Monthly | Claim original amount |
| Paid | Paid per month | Monthly | paymentAmount |
| Curr. Rejected | Final Rejected per month | Monthly | Final Rejected |
| Medical Rejected | Rejected where denialType=Medical | Monthly | denialType |
| Technical Rejected | Rejected where denialType=Technical | Monthly | denialType |

---

## 4. Rejection Analytics Tab

### 4.1 Metrics

| Metric Name | Formula | Required Variables | Source Endpoint | Missing From API? |
|-------------|---------|-------------------|-----------------|-------------------|
| Initial Rejection % | `(Initial Rejected / Claimed) × 100` | activityType, netAmount, paymentAmount | Activities | No |
| Current Rejection % | `(Final Rejected / Processed) × 100` | claimId, netAmount, paymentAmount | Activities, Claims | No |
| Current Rejection Value (000) | `Final Rejected / 1000` | Final Rejected | Derived | No |
| FY Total (Initial %) | `AVG(Initial Rejection %)` per month | — | Derived | No |
| FY Total (Current %) | `AVG(Current Rejection %)` per month | — | Derived | No |
| FY Total (Value) | `SUM(Current Rejection Value)` | — | Derived | No |
| Medical Rejected | Rejected where denialType=Medical | denialType, denialCode | Activities | **Yes** if denialType absent |
| Technical Rejected | Rejected where denialType=Technical | denialType | Activities | **Yes** if denialType absent |

### 4.2 Aggregation Levels

- **Monthly** (by submission month for claimed)
- **Overall** (all claims)
- **IP** (claimType=IP)
- **OP** (claimType=OP)

### 4.3 Recovery Calculation

| Metric | Formula | Required Variables |
|--------|---------|---------------------|
| Recovery | `Initial Rejected - Final Rejected` | activityType=3, netAmount, paymentAmount; claim final state |

---

## 5. Doctor Performance Tab

### 5.1 Metrics

| Metric Name | Formula | Required Variables | Source Endpoint | Missing From API? |
|-------------|---------|-------------------|-----------------|-------------------|
| Doctor Name | Display | clinicianName, clinicianId | Activities, Clinicians | clinicianName in activity |
| Speciality | Display | department_name | Activities | **Yes** if not in activity |
| Claimed | `SUM(claimed)` per clinicianId | clinicianId, claimId, netAmount | Activities | No |
| Medical Denials | `SUM(rejected)` where denialType=Medical per doctor | clinicianId, denialType, netAmount, paymentAmount | Activities | **Yes** if denialType absent |
| Medical Denial % | `(Medical Denials / Claimed) × 100` | Derived | — | No |
| Unprocessed | `SUM(unprocessed)` per doctor | clinicianId, settlementDate | Activities, Claims | No |
| Initial Rejected | Per doctor | clinicianId, activityType=3 | Activities | No |
| Current Rejected | Per doctor | clinicianId, claim final state | Activities | No |
| RR% (Rejection Rate) | `(Current Rejected / Processed) × 100` | Derived | — | No |
| Medical RR% | `(Medical Denials / Claimed) × 100` | Derived | — | No |
| Recovery % | Recovery per doctor | clinicianId, Initial Rejected, Final Rejected | Activities | No |

### 5.2 Required Variables

| Variable | Required | Notes |
|----------|----------|-------|
| clinicianId | ✓ | Available |
| department_name | ✓ | **Missing** if not in activity; map via clinician→department |
| claimId | ✓ | Available |
| activityType | ✓ | Available |
| paymentAmount | ✓ | Available |
| netAmount | ✓ | Available |
| denialType | ✓ | **Missing** if not in activity; map via denialCode→denial_type |

### 5.3 Speciality Summary

| Metric | Formula | Required Variables |
|--------|---------|---------------------|
| Speciality Claimed | Sum by department | department_name |
| Speciality Medical Denials | Sum by department | department_name, denialType |

---

## 6. Payer Performance Tab

### 6.1 Metrics

| Metric Name | Formula | Required Variables | Source Endpoint | Missing From API? |
|-------------|---------|-------------------|-----------------|-------------------|
| Insurance | Display | payerName | Claims, Activities | payerName sometimes absent |
| Claimed | `SUM(claimed)` per payerId | payerId, claimId, netAmount | Activities | No |
| Processed | `SUM(processed)` per payerId | payerId, settlementDate | Activities, Claims | No |
| Unprocessed | `SUM(unprocessed)` per payerId | payerId | — | No |
| Initial Rejected | Per payerId | payerId, activityType=3 | Activities | No |
| Initial Rej % | `(Initial Rejected / Claimed) × 100` | Derived | — | No |
| Current Rejected | Per payerId | payerId, claim final state | Activities | No |
| Current Rej % (RR%) | `(Current Rejected / Processed) × 100` | Derived | — | No |
| Business Contribution % | `(Payer Claimed / Total Claimed) × 100` | Derived | — | No |

### 6.2 Required Variables

| Variable | Required | Notes |
|----------|----------|-------|
| payerId | ✓ | Available |
| payerName | ✓ | Sometimes missing; include in response |
| claimId | ✓ | Available |
| paymentAmount | ✓ | Available |
| activityType | ✓ | Available |

---

## 7. Denial Analysis Tab

### 7.1 Metrics

| Metric Name | Formula | Required Variables | Source Endpoint | Missing From API? |
|-------------|---------|-------------------|-----------------|-------------------|
| Denial Reason | Group by reason | denialCode | Activities | No |
| Current Rejected Amount | `SUM(Final Rejected)` per reason | denialCode, netAmount, paymentAmount | Activities | No |
| % of Total | `(Amount / Grand Total) × 100` | Derived | — | No |
| Category Breakdown | Group by denialType | denialType | Activities | **Yes** if denialType absent |

### 7.2 Classification

| Classification | Source | Required |
|----------------|--------|----------|
| Medical | denialType = 'Medical Necessity', 'Authorization', 'Clinical Info' | denialType |
| Technical | denialType = 'Administrative', 'Price', etc. | denialType |

**If denialType missing → flag critical issue.** Backend must map denialCode → denial_type.

### 7.3 Denial Code Mapping

Denial codes API: `GET /api/denial-codes` returns `denial_code`, `denial_type`.  
Activities must either include `denialType` or backend must join denial codes to derive denial type.

---

## 8. Financial Risk Tab

### 8.1 Metrics

| Metric Name | Formula | Required Variables | Source Endpoint | Missing From API? |
|-------------|---------|-------------------|-----------------|-------------------|
| Write-Off by Month | `SUM(writeOffAmount)` per month | writeOffAmount, settlementDate | Claims | **Yes** writeOffAmount |
| Write-Off by Category | Medical, Technical, Admin | writeOffAmount, denialType | Claims, Activities | **Yes** writeOffAmount |
| Unprocessed Trend | `SUM(unprocessed)` per month | settlementDate, netAmount | Claims | No |
| Outstanding Rejection | `SUM(Final Rejected)` | claimId, netAmount, paymentAmount | Activities | No |
| Aging Buckets | Group by days since submission | submissionDate, settlementDate | Claims | No |
| Recovery % | `(Recovered / Initial Rejected) × 100` | Initial Rejected, Final Rejected | Activities | No |

### 8.2 Settlement Tracking

| Metric | Required Variables | Missing? |
|--------|---------------------|----------|
| Settled | settlementDate present | No |
| Pending | settlementDate absent | No |

**If writeOffAmount not present → mark missing.** Backend must expose this variable.

---

## 9. Claims Explorer Tab

### 9.1 Claim-Level Drilldown

| Field | Required | Source | Missing? |
|-------|----------|--------|----------|
| claimId | ✓ | Claims | No |
| patientName | ✓ | Claims | No |
| doctor | ✓ | clinicianId, clinicianName | clinicianName |
| speciality | ✓ | department_name | **Yes** if not in claim |
| claimType | ✓ | IP/OP | Derived from claimId or explicit |
| claimedAmount | ✓ | netAmount | No |
| remittedAmount | ✓ | paymentAmount | No |
| rejectedAmount | ✓ | Final Rejected | Derived |
| status | ✓ | claimStatus, dispositionFlag | No |
| paymentStatus | ✓ | Derived from settlement | No |
| submissionDate | ✓ | activityStart (activityType=3) | No |

### 9.2 Activity History (for drilldown)

| Field | Required | Source |
|-------|----------|--------|
| activityId | ✓ | Activities |
| activityType | ✓ | Activities |
| activityStart | ✓ | Activities |
| denialCode | ✓ | Activities |
| paymentAmount | ✓ | Activities |
| netAmount | ✓ | Activities |
| settlementDate | ✓ | Claims |

### 9.3 Pagination & Filtering

- Pagination: `page`, `pageSize`
- Sort: claimId, submissionDate, claimedAmount, etc.
- Filter: payer, doctor, department, claimType, date range

---

## 10. API Gaps & Required Enhancements

### Critical (Dashboard impossible without this)

| Item | Missing From | Impact | Action |
|------|--------------|--------|--------|
| **denialType** | Activities | Denial Analysis, Medical vs Technical, Doctor Performance | Backend must expose denialType in activity or map denialCode→denial_type |
| **activityType 3/4/5** | Activities | Lifecycle logic | Ensure activityType is numeric or mapped: 3=Initial, 4=Resubmission, 5=Re-resubmission |
| **claimType (IP/OP)** | Claims | IP/OP breakdown in Overview, Rejection Analytics | Backend must expose claimType or document claimId prefix convention |

### Important (Affects accuracy)

| Item | Missing From | Impact | Action |
|------|--------------|--------|--------|
| **writeOffAmount** | Claims | Financial Risk tab | Backend must expose writeOffAmount per claim |
| **department_name** | Activities | Doctor Performance speciality | Include in activity or join clinician→department |
| **payerName** | Claims, Activities | Payer Performance display | Include in response when payerId present |
| **clinicianName** | Activities | Doctor Performance, Claims Explorer | Include in activity or ensure clinicians API covers all |

### Optional (Enhancement)

| Item | Missing From | Impact | Action |
|------|--------------|--------|--------|
| **approvedAmount** | Claims | Explicit approved amount | Derive from paymentAmount |

---

## 11. Variable Mapping Table

| Variable | Activities API | Claims API | Missing? |
|----------|---------------|------------|----------|
| claimId | ✓ | ✓ | No |
| activityType | ✓ | — | No |
| activityStart | ✓ | — | No |
| netAmount | ✓ | ✓ | No |
| paymentAmount | ✓ | ✓ | No |
| denialCode | ✓ | — | No |
| denialType | ❌ | — | **Yes** |
| department_name | ❌ | — | **Yes** |
| clinicianId | ✓ | ✓ | No |
| clinician_name | ⚠️ | — | Sometimes |
| payerId | ✓ | ✓ | No |
| payerName | ⚠️ | ⚠️ | Sometimes |
| settlementDate | — | ✓ | No |
| writeOffAmount | — | ❌ | **Yes** |
| claimStatus | — | ✓ | No |
| claimType | — | ❌ | **Yes** (derive) |

---

## 12. Example Claim Lifecycle Calculation

### Input Data

**Claim:** claimId = CLM-2025-001

**Activities:**

| activityId | claimId | activityType | activityStart | netAmount | paymentAmount |
|------------|---------|--------------|--------------|-----------|---------------|
| A1 | CLM-2025-001 | 3 | 2025-01-15 | 100000 | 50000 |
| A2 | CLM-2025-001 | 4 | 2025-02-10 | 50000 | 30000 |

### Calculation

1. **Claimed** = netAmount from activityType=3 = 100,000  
2. **Initial Rejected** = (activityType=3) → (netAmount - paymentAmount) = 100,000 - 50,000 = 50,000  
3. **Total Paid** = (A1.paymentAmount + A2.paymentAmount) = 50,000 + 30,000 = 80,000  
4. **Final Rejected** = Claim Original Amount - Total Paid = 100,000 - 80,000 = 20,000  
5. **Recovery** = Initial Rejected - Final Rejected = 50,000 - 20,000 = 30,000  
6. **Current Rejection %** = Final Rejected / Claimed = 20,000 / 100,000 = 20%  
7. **Initial Rejection %** = Initial Rejected / Claimed = 50,000 / 100,000 = 50%  

### Aggregation Rules

- For **monthly claimed**: Sum of claim original amounts where activityType=3 and activityStart month = target month.
- For **monthly paid**: Sum of paymentAmount where settlementDate (or activityStart) month = target month.
- For **monthly Final Rejected**: Sum of Final Rejected per claim where claim's last activity month = target month.
- **Never** sum netAmount across activities for the same claim; only use activityType=3 netAmount as claim original.

---

## Appendix: Recommended Backend Endpoints

For dashboard migration, consider dedicated analytics endpoints:

| Endpoint | Purpose | Response Shape |
|----------|---------|----------------|
| `GET /api/analytics/overview?officeId=&year=` | Overview KPIs + Executive Summary | KPIs, monthlyRows, claimTypeRows |
| `GET /api/analytics/rejection?officeId=&year=` | Rejection Analytics | matrix, trends, categoryBreakdown |
| `GET /api/analytics/doctor?officeId=&year=` | Doctor Performance | doctors, specialitySummary, totals |
| `GET /api/analytics/payer?officeId=&year=` | Payer Performance | payers, totals |
| `GET /api/analytics/denial?officeId=&year=` | Denial Analysis | topReasons, categoryBreakdown |
| `GET /api/analytics/financial?officeId=&year=` | Financial Risk | writeOffByMonth, unprocessedTrend |
| `GET /api/analytics/claims-explorer?officeId=&page=&pageSize=&sort=` | Claims Explorer | rows, total |

All aggregations must use the lifecycle logic defined in Section 1.

---

*Document generated from codebase analysis. Backend must implement lifecycle logic and expose missing variables before dashboard migration.*
