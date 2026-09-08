/**
 * Map GET /api/dashboard/doctors → ClinicianPicker shape { id, name, specialty }.
 *
 * Example API row:
 *   { clinician_id: "DHA-P-17812734", clinician_name: "Dr. John Doe", department: "Dental" }
 * → { id: "DHA-P-17812734", name: "Dr. John Doe", specialty: "Dental" }
 */
export function mapDashboardDoctor(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(
    raw.clinician_id ?? raw.clinicianId ?? raw.id ?? '',
  ).trim();
  if (!id) return null;

  // Display label is always clinician_name — never the id
  const name = String(
    raw.clinician_name ?? raw.clinicianName ?? raw.name ?? '',
  ).trim();

  const dept = String(
    raw.department ?? raw.specialty ?? raw.speciality ?? '',
  ).trim();

  return {
    id,
    name: name || 'Unknown clinician',
    specialty: dept || '—',
  };
}

export function mapDashboardDoctorsResponse(raw) {
  const list = Array.isArray(raw?.doctors)
    ? raw.doctors
    : Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
        ? raw.data
        : [];
  return list.map(mapDashboardDoctor).filter(Boolean);
}

/** @deprecated Mock list removed — doctors come from /api/dashboard/doctors */
export const DOCTOR_OPTIONS = [];
