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
        const initAuth = async () => {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                let parsedUser = JSON.parse(storedUser);

                // Self-healing: If user is logged in (and not admin) but missing officeId or permission, try to fetch
                const needsRefresh = !parsedUser.isDevBypass && parsedUser.role !== 'admin' && (parsedUser.userId || parsedUser.id) &&
                    (!parsedUser.officeId || !parsedUser.permission);
                if (needsRefresh) {
                    try {
                        const uid = parsedUser.userId || parsedUser.id;
                        const token = localStorage.getItem('token');
                        console.log(`AuthContext: Refreshing profile for user ${uid} to get officeId...`);
                        const res = await fetch(`/api/users/${uid}`, {
                            headers: {
                                Authorization: token ? `Bearer ${token}` : '',
                                'ngrok-skip-browser-warning': 'true',
                            },
                        });
                        if (res.ok) {
                            const details = await res.json();
                            // Merge and save
                            parsedUser = { ...parsedUser, ...details };
                            // Normalize role if needed
                            parsedUser.role = parsedUser.roleName?.toLowerCase() || parsedUser.role;

                            console.log("AuthContext: Profile refreshed, officeId:", parsedUser.officeId, "permission:", parsedUser.permission);
                            localStorage.setItem("user", JSON.stringify(parsedUser));
                        } else {
                            const body = await res.text().catch(() => '');
                            console.error(`AuthContext: GET /api/users/${uid} failed ${res.status}. Body:`, body);
                        }
                    } catch (err) {
                        console.error("AuthContext: Failed to refresh user profile:", err);
                    }
                }

                setUser(parsedUser);
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (credentials) => {
        // Use relative path to leverage Vite proxy for CORS
        const url = `/api/auth/login`;
        console.log("Login URL:", url);

        const getResponseMessage = async (res, fallbackMessage) => {
            try {
                const data = await res.json();
                return data?.message || fallbackMessage;
            } catch {
                return fallbackMessage;
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            if (!response.ok) {
                const message = await getResponseMessage(response, 'Network error. Please try again.');
                throw new Error(message);
            }

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error('Network error. Please try again.');
            }
            const rawUser = data.user || data; // backend might return { user: ... } or just user data

            // Store token immediately so subsequent API calls can use it
            if (data.token) {
                localStorage.setItem("token", data.token);
            }

            // Normalize user data to match app expectations (expecting 'role', API sends 'roleName')
            let userData = {
                ...rawUser,
                role: rawUser.roleName?.toLowerCase() || rawUser.role
            };

            const token = data.token || localStorage.getItem('token');
            const authHeaders = {
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true'
            };

            // For non-admin users, fetch detailed profile and transactions
            if (userData.role !== 'admin') {
                try {
                    const userId = userData.userId || userData.id;
                    if (userId) {
                        const userDetailsResponse = await fetch(`/api/users/${userId}`, { headers: authHeaders });
                        if (userDetailsResponse.ok) {
                            const userDetails = await userDetailsResponse.json();
                            // Merge detailed info
                            userData = { ...userData, ...userDetails };

                            // Ensure role is consistent if needed
                            userData.role = userData.roleName?.toLowerCase() || userData.role;
                        }
                    }
                } catch (extraError) {
                    console.error("Error fetching additional user data:", extraError);
                }
            }

            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
            return { success: true, user: userData };
        } catch (error) {
            console.error("Login error:", error);
            const message =
                error instanceof TypeError ||
                String(error?.message || '').includes("Failed to execute 'json' on 'Response'")
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
