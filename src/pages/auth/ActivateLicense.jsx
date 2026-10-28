import React, { useState } from 'react';
import { ShieldCheck, LineChart, FileText, Search, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import healthSyncLogo from '../../assets/healthsync-logo.png';
import claimSyncLogo from '../../assets/claimsync-logo.png';
import './Login.css';
import './ActivateLicense.css';

const ActivateLicense = () => {
    const navigate = useNavigate();
    const reduce = useReducedMotion();

    const [activationKey, setActivationKey] = useState('');
    const [activating, setActivating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleActivate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!activationKey.trim()) {
            setError('Please enter your activation key.');
            return;
        }

        setActivating(true);
        try {
            const response = await fetch('/api/auth/activate-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activationKey: activationKey.trim(),
                }),
            });

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error('Network error. Please try again.');
            }

            if (data.success) {
                setSuccess('License activated successfully! Redirecting to login…');
                setTimeout(() => navigate('/login'), 1800);
            } else {
                setError(data.message || 'Activation failed. Please try again.');
            }
        } catch (err) {
            setError(err.message || 'Network error. Please try again.');
        } finally {
            setActivating(false);
        }
    };

    const formMotion = reduce
        ? {}
        : {
              initial: { opacity: 0, y: 12 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.32, ease: [0.2, 0.8, 0.2, 1] },
          };

    const brandMotion = reduce
        ? {}
        : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.5, ease: 'easeOut' },
          };

    return (
        <div className="auth-shell">
            <motion.aside className="auth-brand" {...brandMotion}>
                <div className="auth-brand-mesh" aria-hidden="true" />
                <div className="auth-brand-grid" aria-hidden="true" />

                <div className="auth-brand-inner">
                    <div className="auth-logo">
                        <img
                            src={claimSyncLogo}
                            alt="ClaimSync"
                            className="auth-logo-img"
                        />
                    </div>

                    <div className="auth-brand-copy">
                        <h1 className="auth-brand-headline">
                            Hospital claims,<br />finally clear.
                        </h1>
                        <p className="auth-brand-sub">
                            Track denials, remittances and activities across every facility — in one calm, fast workspace.
                        </p>
                    </div>

                    <ul className="auth-brand-features">
                        <li className="auth-feature">
                            <span className="auth-feature-ic" aria-hidden="true"><LineChart size={15} strokeWidth={1.8} /></span>
                            <div className="auth-feature-copy">
                                <span className="auth-feature-t">Real-time analytics</span>
                                <span className="auth-feature-s">Claim performance by payer, doctor, and month</span>
                            </div>
                        </li>
                        <li className="auth-feature">
                            <span className="auth-feature-ic" aria-hidden="true"><FileText size={15} strokeWidth={1.8} /></span>
                            <div className="auth-feature-copy">
                                <span className="auth-feature-t">Claim &amp; activity drilldown</span>
                                <span className="auth-feature-s">Encounters, remittances, and resubmissions in one place</span>
                            </div>
                        </li>
                        <li className="auth-feature">
                            <span className="auth-feature-ic" aria-hidden="true"><ShieldCheck size={15} strokeWidth={1.8} /></span>
                            <div className="auth-feature-copy">
                                <span className="auth-feature-t">Secure by design</span>
                                <span className="auth-feature-s">Role-based access with office-level isolation</span>
                            </div>
                        </li>
                    </ul>

                    <div className="auth-brand-footer">
                        <span>© {new Date().getFullYear()} HealthSync</span>
                        <span className="auth-brand-dot" />
                        <span>All systems operational</span>
                    </div>
                </div>
            </motion.aside>

            <main className="auth-form-pane">
                <motion.div className="auth-card" {...formMotion}>
                    <div className="auth-card-head">
                        <h2 className="auth-title">Activate license</h2>
                        <p className="auth-sub">
                            Enter your activation key to activate this product.
                        </p>
                    </div>

                    {/* Activation required banner */}
                    {!success && (
                        <div className="auth-error">
                            <span className="auth-error-ic" aria-hidden="true">
                                <AlertCircle size={14} strokeWidth={2.2} />
                            </span>
                            <div>
                                <p className="auth-error-title">Activation required</p>
                                <p className="auth-error-msg">Please purchase the app.</p>
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="auth-error">
                            <span className="auth-error-ic" aria-hidden="true">
                                <AlertCircle size={14} strokeWidth={2.2} />
                            </span>
                            <div>
                                <p className="auth-error-title">Activation failed</p>
                                <p className="auth-error-msg">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Success message */}
                    {success && (
                        <div className="auth-success">
                            <span className="auth-success-ic" aria-hidden="true">
                                <ShieldCheck size={14} strokeWidth={2.2} />
                            </span>
                            <p className="auth-success-msg">{success}</p>
                        </div>
                    )}

                    <form className="auth-form" onSubmit={handleActivate}>
                        <div className="auth-input-group">
                            <div className="auth-input">
                                <span className="auth-input-ic" aria-hidden="true">
                                    <Search size={17} strokeWidth={1.9} />
                                </span>
                                <input
                                    id="activation-key"
                                    type="text"
                                    placeholder="HS-XXXX-XXXX-XXXX-XXXX"
                                    value={activationKey}
                                    onChange={(e) => setActivationKey(e.target.value)}
                                    disabled={activating || !!success}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            id="activate-submit"
                            type="submit"
                            className={`auth-submit${activating ? ' is-loading' : ''}`}
                            disabled={activating || !!success}
                        >
                            <span className="auth-submit-label">
                                {activating ? 'Activating…' : 'Activate'}
                            </span>
                            {!activating && <ArrowRight size={16} strokeWidth={2.2} />}
                        </button>
                    </form>


                    <div className="auth-meta">
                        <span>A product of HealthSync Technologies.</span>
                    </div>

                    <div className="auth-form-bottom">
                        <img
                            src={healthSyncLogo}
                            alt="HealthSync"
                            className="auth-company-logo"
                        />
                    </div>

                    <button
                        type="button"
                        className="activate-back-btn"
                        onClick={() => navigate('/login')}
                    >
                        <ArrowLeft size={14} strokeWidth={2} />
                        <span>Back to login</span>
                    </button>
                </motion.div>
            </main>
        </div>
    );
};

export default ActivateLicense;
