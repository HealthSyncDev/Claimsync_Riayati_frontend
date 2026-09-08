import React, { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import { toast } from '../../../utils/confirm';
import '../denial-codes/DenialCodeList.css';

const ENCOUNTER_TYPES_API = '/api/encounter-types';
const encounterTypeByIdUrl = (id) => `${ENCOUNTER_TYPES_API}/${encodeURIComponent(String(id))}`;

const PATIENT_TYPE_OPTIONS = [
    { value: 'OP', label: 'OP' },
    { value: 'IP', label: 'IP' },
];

const normalizePatientType = (value) => {
    const raw = String(value ?? '').trim().toUpperCase();
    if (raw === 'OP' || raw === '1') return 'OP';
    if (raw === 'IP' || raw === '2') return 'IP';
    return PATIENT_TYPE_OPTIONS.some((opt) => opt.value === raw) ? raw : '';
};

const EncounterTypeList = () => {
    const [encounterTypes, setEncounterTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        encounter_type_id: '',
        encounter_type: '',
        encounter_desc: '',
        patient_type: ''
    });

    const getToken = () => localStorage.getItem('token');
    const headers = () => ({
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    });

    const normalizeEncounterType = (item = {}) => ({
        encounter_type_id:
            item.encounter_type_id ??
            item.id ??
            item.encounterTypeId ??
            item.encounter_typeId ??
            '',
        encounter_type: item.encounter_type ?? item.encounterType ?? '',
        encounter_desc:
            item.encounter_type_description ??
            item.encounter_desc ??
            item.encounterDesc ??
            item.encounterTypeDescription ??
            item.encounter_description ??
            '',
        patient_type: normalizePatientType(item.patient_type ?? item.patientType)
    });

    const fetchAllEncounterTypes = async () => {
        const response = await fetch(ENCOUNTER_TYPES_API, { headers: headers() });
        const textData = await response.text();

        let data;
        try {
            data = JSON.parse(textData);
        } catch (e) {
            throw new Error('API connection failed: received non-JSON response.');
        }

        if (!response.ok) {
            throw new Error(data.message || data.error || `Server error: ${response.status}`);
        }

        const rawList = Array.isArray(data) ? data : data?.data ?? data?.encounter_types ?? [];
        return rawList.map((row) => normalizeEncounterType(row));
    };

    const loadPage = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const list = await fetchAllEncounterTypes();
            setEncounterTypes(list);
        } catch (err) {
            console.error('Load encounter types page:', err);
            setError(err.message);
            setEncounterTypes([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPage();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddClick = () => {
        setIsEdit(false);
        setFormData({
            encounter_type_id: '',
            encounter_type: '',
            encounter_desc: '',
            patient_type: ''
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (item) => {
        setIsEdit(true);
        setFormData(normalizeEncounterType(item));
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                encounter_type: formData.encounter_type.trim(),
                encounter_type_description: formData.encounter_desc.trim(),
                patient_type: formData.patient_type,
            };

            if (!payload.encounter_type || !payload.encounter_type_description || !payload.patient_type) {
                toast.error('Encounter type, description, and patient type are required.');
                setIsSubmitting(false);
                return;
            }

            if (!['OP', 'IP'].includes(payload.patient_type)) {
                toast.error('Patient type must be OP or IP.');
                setIsSubmitting(false);
                return;
            }

            if (isEdit && (formData.encounter_type_id === '' || formData.encounter_type_id == null)) {
                toast.error('Missing record id. Refresh and try again.');
                setIsSubmitting(false);
                return;
            }

            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? encounterTypeByIdUrl(formData.encounter_type_id) : ENCOUNTER_TYPES_API;

            const response = await fetch(url, {
                method,
                headers: headers(),
                body: JSON.stringify(payload)
            });

            const respData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(respData.message || respData.error || 'Operation failed');
            }

            await loadPage();
            setIsModalOpen(false);
            toast.success(isEdit ? 'Encounter type updated successfully' : 'Encounter type added successfully');
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-col gap-md">
            <div className="flex justify-between items-center flex-wrap gap-sm">
                <p className="text-muted" style={{ maxWidth: '42rem', margin: 0 }}>
                    Manage encounter type mappings with description and patient type.
                </p>
                <div className="flex gap-sm items-center flex-wrap dr-toolbar-actions">
                    <button
                        type="button"
                        className="btn dr-btn-refresh"
                        onClick={loadPage}
                        disabled={isLoading}
                    >
                        Refresh List
                    </button>
                    <Button className="dr-btn-add" onClick={handleAddClick}>
                        Add Encounter Type
                    </Button>
                </div>
            </div>

            {error && (
                <div
                    style={{
                        padding: '16px',
                        backgroundColor: 'var(--status-error-bg)',
                        color: 'var(--status-error)',
                        borderRadius: 'var(--radius-md)'
                    }}
                >
                    {error}
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="w-full" style={{ textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead
                        style={{
                            backgroundColor: 'var(--bg-hover)',
                            borderBottom: '1px solid var(--border-color)'
                        }}
                    >
                        <tr>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                S.No
                            </th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                Encounter Type
                            </th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                Encounter Desc
                            </th>
                            <th className="text-sm font-medium text-muted" style={{ padding: '16px 24px' }}>
                                Patient Type
                            </th>
                            <th
                                className="text-sm font-medium text-muted"
                                style={{ padding: '16px 24px', textAlign: 'right' }}
                            >
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan="5"
                                    style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}
                                >
                                    Loading encounter types...
                                </td>
                            </tr>
                        ) : encounterTypes.length > 0 ? (
                            encounterTypes.map((item, index) => (
                                <tr
                                    key={item.encounter_type_id ?? `${item.encounter_type}-${index}`}
                                    style={{ borderBottom: '1px solid var(--bg-hover)' }}
                                >
                                    <td style={{ padding: '16px 24px' }} className="text-muted">
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>
                                        {item.encounter_type || '—'}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>{item.encounter_desc || '—'}</td>
                                    <td style={{ padding: '16px 24px' }}>
                                        {normalizePatientType(item.patient_type) || '—'}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button
                                            type="button"
                                            className="text-primary text-sm font-medium"
                                            onClick={() => handleEditClick(item)}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan="5"
                                    style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
                                >
                                    {!error && 'No encounter types found. Add one to get started.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div
                    className="dr-modal-overlay"
                    role="presentation"
                    onClick={(e) => e.target === e.currentTarget && !isSubmitting && setIsModalOpen(false)}
                >
                    <div
                        className="dr-modal-panel card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="et-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="dr-modal-header">
                            <div>
                                <h3 id="et-modal-title" className="dr-modal-title">
                                    {isEdit ? 'Edit encounter type' : 'Add encounter type'}
                                </h3>
                                <p className="dr-modal-subtitle">
                                    Set the encounter type with description and patient type.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="dr-modal-close"
                                onClick={() => !isSubmitting && setIsModalOpen(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="dr-modal-body">
                            <div className="dr-form-stack">
                                <div className="dr-field">
                                    <label htmlFor="et-encounter-type">
                                        Encounter type<span className="dr-required">*</span>
                                    </label>
                                    <input
                                        id="et-encounter-type"
                                        type="text"
                                        name="encounter_type"
                                        value={formData.encounter_type}
                                        onChange={handleInputChange}
                                        placeholder="e.g. OP"
                                        autoComplete="off"
                                        required
                                    />
                                </div>

                                <div className="dr-field">
                                    <label htmlFor="et-encounter-desc">
                                        Encounter desc<span className="dr-required">*</span>
                                    </label>
                                    <input
                                        id="et-encounter-desc"
                                        type="text"
                                        name="encounter_desc"
                                        value={formData.encounter_desc}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Outpatient"
                                        autoComplete="off"
                                        required
                                    />
                                </div>

                                <div className="dr-field">
                                    <label htmlFor="et-patient-type">
                                        Patient type<span className="dr-required">*</span>
                                    </label>
                                    <select
                                        id="et-patient-type"
                                        name="patient_type"
                                        value={formData.patient_type}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select patient type</option>
                                        {PATIENT_TYPE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="dr-modal-footer">
                                <button
                                    type="button"
                                    className="btn dr-modal-btn-cancel"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <Button className="dr-modal-btn-save" type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add encounter type'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EncounterTypeList;
