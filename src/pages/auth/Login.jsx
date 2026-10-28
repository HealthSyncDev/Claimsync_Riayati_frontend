import React, { useState } from 'react';
import { ShieldCheck, LineChart, FileText, User, Lock, Eye, EyeOff, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import healthSyncLogo from '../../assets/healthsync-logo.png';
import claimSyncLogo from '../../assets/claimsync-logo.png';
import './Login.css';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const reduce = useReducedMotion();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [licenseStatus, setLicenseStatus] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLicenseStatus(null);

        if (!username.trim() || !password) {
            setError('Please enter both username and password.');
            return;
        }
        setSubmitting(true);
        const result = await login({ username: username.trim(), password });
        if (!result.success) {
            if (result.licenseStatus) {
                setLicenseStatus(result.licenseStatus);
            } else {
                setError(result.message || 'Login failed. Please try again.');
            }
            setSubmitting(false);
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
                        <h2 className="auth-title">Welcome back</h2>
                        <p className="auth-sub">
                            Sign in to your account to continue.
                        </p>
                    </div>

                    {/* Standard error (non-license) */}
                    {error && !licenseStatus && (
                        <div className="auth-error">
                            <span className="auth-error-ic" aria-hidden="true">
                                <AlertCircle size={14} strokeWidth={2.2} />
                            </span>
                            <div>
                                <p className="auth-error-title">Sign-in failed</p>
                                <p className="auth-error-msg">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* License required — ADMIN: navigate to /activate-license */}
                    {licenseStatus === 'LICENSE_REQUIRED_ADMIN' && (
                        <div className="auth-error auth-license-error">
                            <span className="auth-error-ic" aria-hidden="true">
                                <AlertCircle size={14} strokeWidth={2.2} />
                            </span>
                            <div className="auth-license-error-content">
                                <p className="auth-error-title">Sign-in failed</p>
                                <p className="auth-error-msg">Please purchase the app.</p>
                            </div>
                            <button
                                type="button"
                                className="auth-license-btn"
                                onClick={() => navigate('/activate-license')}
                            >
                                <KeyRound size={14} strokeWidth={2} />
                                Enter Activation Key
                            </button>
                        </div>
                    )}

                    {/* License required — USER */}
                    {licenseStatus === 'LICENSE_REQUIRED_USER' && (
                        <div className="auth-error auth-license-error">
                            <span className="auth-error-ic" aria-hidden="true">
                                <AlertCircle size={14} strokeWidth={2.2} />
                            </span>
                            <div>
                                <p className="auth-error-title">Sign-in failed</p>
                                <p className="auth-error-msg">Please contact administrator.</p>
                            </div>
                        </div>
                    )}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-input-group">
                            <div className="auth-input">
                                <span className="auth-input-ic" aria-hidden="true">
                                    <User size={17} strokeWidth={1.9} />
                                </span>
                                <input
                                    id="login-username"
                                    type="text"
                                    placeholder="Username"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={submitting}
                                />
                            </div>

                            <div className="auth-input">
                                <span className="auth-input-ic" aria-hidden="true">
                                    <Lock size={17} strokeWidth={1.9} />
                                </span>
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={submitting}
                                />
                                <button
                                    type="button"
                                    className="auth-toggle-password"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    tabIndex={-1}
                                >
                                    {showPassword
                                        ? <EyeOff size={16} strokeWidth={1.9} />
                                        : <Eye size={16} strokeWidth={1.9} />}
                                </button>
                            </div>
                        </div>

                        <button
                            id="login-submit"
                            type="submit"
                            className={`auth-submit${submitting ? ' is-loading' : ''}`}
                            disabled={submitting}
                        >
                            <span className="auth-submit-label">
                                {submitting ? 'Signing in…' : 'Sign in'}
                            </span>
                            {!submitting && <ArrowRight size={16} strokeWidth={2.2} />}
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
                </motion.div>
            </main>
        </div>
    );
};

export default Login;
