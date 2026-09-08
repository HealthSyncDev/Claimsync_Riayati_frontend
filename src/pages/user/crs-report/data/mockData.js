
// Mock data for CRS Report

export const reportTypes = [
    { id: 'claim_summary_month', label: 'Claim Summary – Monthwise' },
    { id: 'claim_summary_payer', label: 'Claim Summary – Payerwise' },
    { id: 'claim_details', label: 'Claim Details with Activity' },
    { id: 'remittance', label: 'Remittance & Resubmission Report' },
    { id: 'aging', label: 'Aging Report' },
];

export const filterOptions = {
    facilities: ['Main Hospital', 'Downtown Clinic', 'North Wing', 'West Surgery Center'],
    dateTypes: ['Activity Start', 'Settlement Date', 'Transaction Date'],
    payers: ['Blue Cross', 'Aetna', 'UnitedHealth', 'Cigna', 'Medicare', 'Self Pay'],
    clinicians: ['Dr. Smith', 'Dr. Jones', 'Dr. Lee', 'Dr. Patel', 'Dr. White'],
    encounterTypes: ['Inpatient', 'Outpatient', 'Emergency', 'Telehealth'],
    claimStatus: ['Paid', 'Pending', 'Rejected', 'Resubmitted', 'Denied'],
    insuranceTypes: ['Insurance', 'Self Pay'],
};

// Summary KPIs
export const kpiSummary = {
    totalClaims: 1245,
    totalClaimAmount: 5200000,
    remittedAmount: 3800000,
    rejectedAmount: 450000,
    pendingAmount: 950000,
    rejectionRate: 8.6, // percentage
    recoveryRate: 73.1, // percentage
};

// Mock Claims Data (Large set for table)
export const mockClaims = Array.from({ length: 50 }, (_, i) => ({
    id: `CLM-${10000 + i}`,
    patientName: ['John Doe', 'Jane Smith', 'Alice Brown', 'Bob White', 'Charlie Green'][i % 5],
    cpt: ['99213', '99214', '99203', '99204'][i % 4],
    diagnosis: ['J01.90', 'I10', 'E11.9', 'M54.5'][i % 4],
    facility: ['Main Hospital', 'Downtown Clinic'][i % 2],
    payer: ['Blue Cross', 'Aetna', 'UnitedHealth'][i % 3],
    clinician: ['Dr. Smith', 'Dr. Jones'][i % 2],
    submissionDate: `2024-${(i % 12) + 1}-15`,
    encounterDate: `2024-${(i % 12) + 1}-10`,
    firstSubmissionDate: `2024-${(i % 12) + 1}-12`,
    lastResubmissionDate: i % 5 === 0 ? `2024-${(i % 12) + 1}-20` : null,
    remittanceDate: i % 3 === 0 ? `2024-${(i % 12) + 1}-25` : null,
    status: ['Paid', 'Pending', 'Rejected', 'Resubmitted'][i % 4],
    amount: Math.floor(Math.random() * 5000) + 100,
    grossAmount: Math.floor(Math.random() * 5000) + 100,
    netAmount: Math.floor(Math.random() * 4500) + 100,
    paymentAmount: i % 4 === 0 ? Math.floor(Math.random() * 4000) : 0,
    remittedAmount: i % 4 === 0 ? Math.floor(Math.random() * 4000) : 0,
    rejectedAmount: i % 4 === 2 ? Math.floor(Math.random() * 5000) : 0,
    rejectionReason: i % 4 === 2 ? 'Coding Error' : null,
    agingDays: Math.floor(Math.random() * 120),
}));

// Aging Report Data
export const agingBuckets = [
    { bucket: '0–30 Days', count: 150, amount: 250000, percent: 45 },
    { bucket: '31–60 Days', count: 90, amount: 150000, percent: 27 },
    { bucket: '61–90 Days', count: 45, amount: 80000, percent: 14 },
    { bucket: '90+ Days', count: 30, amount: 65000, percent: 14 },
];
