import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

/** Local-only personas so the UI can be used without hitting /api/auth/login. */
export const DEV_LOGIN_PERSONAS = {
    user: {
        isDevBypass: true,
        userId: 'dev-user',
        id: 'dev-user',
        username: 'dev.user',
        userName: 'dev.user',
        userLabel: 'Normal User',
        name: 'Normal User',
        firstName: 'Normal',
        lastName: 'User',
        email: 'dev.user@claimsync.local',
        role: 'user',
        roleName: 'User',
        permission: 'Office',
        officeId: 1,
        officeName: 'Main Office',
    },
    allOffice: {
        isDevBypass: true,
        userId: 'dev-all-office',
        id: 'dev-all-office',
        username: 'dev.alloffice',
        userName: 'dev.alloffice',
        userLabel: 'All Offices User',
        name: 'All Offices User',
        firstName: 'All Offices',
        lastName: 'User',
        email: 'dev.alloffice@claimsync.local',
        role: 'user',
        roleName: 'User',
        permission: 'All',
        officeId: 1,
        officeName: 'All Offices',
    },
    admin: {
        isDevBypass: true,
        userId: 'dev-admin',
        id: 'dev-admin',
        username: 'dev.admin',
        userName: 'dev.admin',
        userLabel: 'Admin',
        name: 'Admin User',
        firstName: 'Admin',
        lastName: 'User',
        email: 'dev.admin@claimsync.local',
        role: 'admin',
        roleName: 'Admin',
        permission: 'All',
    },
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check localStorage for persisted user
        const initAuth = () => {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                } catch {
                    localStorage.removeItem("user");
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (credentials) => {
        // Use relative path to leverage Vite proxy for CORS
        const url = `/api/auth/login`;
        console.log("Login URL:", url);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error('Network error. Please try again.');
            }

            // Backend returns: { success: boolean, message: string, role?: string, userId?: number, licenseStatus?: string }
            if (!data.success) {
                return {
                    success: false,
                    message: data.message || 'Login failed. Please try again.',
                    licenseStatus: data.licenseStatus || null,
                    role: data.role || null,
                };
            }

            // Build user data from the backend AuthResponse
            const userData = {
                userId: data.userId,
                id: data.userId,
                username: credentials.username,
                role: data.role?.toLowerCase() || 'user',
                name: credentials.username,
            };

            // Store token if the backend ever starts returning one
            if (data.token) {
                localStorage.setItem("token", data.token);
            }

            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
            return { success: true, user: userData };
        } catch (error) {
            console.error("Login error:", error);
            const message =
                error instanceof TypeError
                    ? 'Network error. Please try again.'
                    : (error.message || 'Network error. Please try again.');
            return { success: false, message };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
    };

    const devLogin = (personaKey) => {
        const userData = DEV_LOGIN_PERSONAS[personaKey];
        if (!userData) {
            return { success: false, message: 'Unknown persona' };
        }
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.removeItem("token");
        return { success: true, user: userData };
    };

    const updateUser = (userData) => {
        setUser(prev => ({ ...prev, ...userData }));
        localStorage.setItem("user", JSON.stringify({ ...user, ...userData }));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser, devLogin }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
