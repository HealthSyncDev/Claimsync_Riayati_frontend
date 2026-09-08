import React from 'react';
import { ArrowRight, ShieldCheck, LineChart, FileText, User, Building2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import healthSyncLogo from '../../assets/healthsync-logo.png';
import claimSyncLogo from '../../assets/claimsync-logo.png';
import './Login.css';

const DEV_ROLES = [
    {
        key: 'user',
        title: 'Normal user',
        description: 'Single-office access — scoped to the assigned branch.',
        icon: User,
    },
    {
        key: 'allOffice',
        title: 'Normal user with all office privilege',
        description: 'User role with permission to view every office.',
        icon: Building2,
    },
    {
        key: 'admin',
        title: 'Admin',
        description: 'Full admin portal — users, offices, and master data.',
        icon: ShieldCheck,
    },
];

const Login = () => {
    const { devLogin } = useAuth();
    const reduce = useReducedMotion();

    const handleDevLogin = (personaKey) => {
        devLogin(personaKey);
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
                            Hospital claims,<br /> finally clear.
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
                    <div className="auth-role-chip" aria-label="Development sign-in">
                        <span>Dev bypass</span>
                    </div>

                    <div className="auth-card-head">
                        <h2 className="auth-title">Continue as</h2>
                        <p className="auth-sub">
                            Login is temporarily bypassed. Pick a role to open the app.
                        </p>
                    </div>

                    <div className="auth-role-picker" role="list">
                        {DEV_ROLES.map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    className="auth-role-option"
                                    onClick={() => handleDevLogin(option.key)}
                                >
                                    <span className="auth-role-option-ic" aria-hidden="true">
                                        <Icon size={18} strokeWidth={1.9} />
                                    </span>
                                    <span className="auth-role-option-copy">
                                        <span className="auth-role-option-title">{option.title}</span>
                                        <span className="auth-role-option-desc">{option.description}</span>
                                    </span>
                                    <ArrowRight size={16} strokeWidth={2.2} className="auth-role-option-arrow" />
                                </button>
                            );
                        })}
                    </div>

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
