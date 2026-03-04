import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, pass: string) => Promise<boolean>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const validEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@dnd.com';
                if (user.email === validEmail) {
                    setIsAuthenticated(true);
                } else {
                    setIsAuthenticated(false);
                    signOut(auth);
                }
            } else {
                setIsAuthenticated(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, pass: string) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            const validEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@dnd.com';

            if (userCredential.user.email === validEmail) {
                setIsAuthenticated(true);
                navigate('/');
                return true;
            } else {
                await signOut(auth);
                return false;
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setIsAuthenticated(false);
            navigate('/login');
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
