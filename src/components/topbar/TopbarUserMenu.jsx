import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import './Topbar.css';

const TopbarUserMenu = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onClick = (e) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const displayName =
    user?.role === 'user'
      ? (user?.username || user?.userLabel || user?.name)
      : (user?.userLabel || user?.name || user?.username || 'Admin User');

  const roleLabel = user?.role || 'member';

  const initial = (() => {
    if (!user) return 'A';
    const src = user?.role === 'user' && user?.username
      ? user.username
      : (user.userLabel || user.name || user.username || 'A');
    return String(src).charAt(0).toUpperCase();
  })();

  const settingsHref = user?.role === 'admin' ? '/admin/settings' : '/settings';

  const menuAnim = reduce
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, y: -6, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -6, scale: 0.98 },
        transition: { duration: 0.16, ease: [0.2, 0.8, 0.2, 1] },
      };

  return (
    <div className={`topbar-user${className ? ` ${className}` : ''}`} ref={menuRef}>
      <button
        type="button"
        className={`topbar-user-chip${menuOpen ? ' topbar-user-chip--open' : ''}`}
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <div className="topbar-user-avatar" aria-hidden="true">{initial}</div>
        <div className="topbar-user-info">
          <span className="topbar-user-name">{displayName}</span>
          <span className="topbar-user-role">{roleLabel}</span>
        </div>
        <ChevronDown size={14} className="topbar-user-chev" aria-hidden />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="topbar-user-menu"
            role="menu"
            {...menuAnim}
          >
            <div className="topbar-user-menu-head">
              <div className="topbar-user-menu-name">{displayName}</div>
              <div className="topbar-user-menu-email">
                {user?.email || roleLabel}
              </div>
            </div>

            <Link
              to={settingsHref}
              className="topbar-user-menu-item"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              <SettingsIcon size={15} />
              <span>Settings</span>
            </Link>

            <div className="topbar-user-menu-sep" />

            <button
              type="button"
              className="topbar-user-menu-item is-danger"
              role="menuitem"
              onClick={() => { setMenuOpen(false); logout(); }}
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TopbarUserMenu;
