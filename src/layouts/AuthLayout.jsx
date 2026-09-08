import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthLayout = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            if (user.role === 'admin') navigate('/admin/dashboard');
            else navigate('/dashboard');
        }
    }, [user, loading, navigate]);

    if (loading) return null;

    return <Outlet />;
};

export default AuthLayout;
