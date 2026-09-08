/**
 * Module store for doctor-rejection clinician selection.
 * Lets the dashboard cache fetchFn read the active clinician without React context,
 * and keeps selection across tab switches (cleared only on filter apply).
 */

let selectedClinicianId = null;
const listeners = new Set();

export function getDoctorRejectionClinicianId() {
  return selectedClinicianId;
}

export function setDoctorRejectionClinicianId(nextId) {
  const normalized = nextId != null && nextId !== '' ? String(nextId) : null;
  if (selectedClinicianId === normalized) return;
  selectedClinicianId = normalized;
  listeners.forEach((cb) => {
    try {
      cb(selectedClinicianId);
    } catch {
      /* ignore subscriber errors */
    }
  });
}

export function subscribeDoctorRejectionClinician(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
