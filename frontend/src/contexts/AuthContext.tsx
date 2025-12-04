import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (googleData: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) => Promise<void>;
  emailLogin: (email: string, password: string) => Promise<void>;
  emailRegister: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  checkAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = useCallback(async () => {
    try {
      await api.adminGetStats();
      setIsAdmin(true);
      return true;
    } catch {
      setIsAdmin(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api
        .getMe()
        .then((userData) => {
          setUser(userData);
          checkAdminStatus();
        })
        .catch(() => {
          api.setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [checkAdminStatus]);

  const login = useCallback(async (googleData: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) => {
    const { token, user } = await api.googleAuth({
      ...googleData,
      language: navigator.language.startsWith('ja') ? 'ja' : 'en',
    });
    api.setToken(token);
    setUser(user);
    checkAdminStatus();
  }, [checkAdminStatus]);

  const emailLogin = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.emailLogin({ email, password });
    api.setToken(token);
    setUser(user);
    checkAdminStatus();
  }, [checkAdminStatus]);

  const emailRegister = useCallback(async (email: string, password: string, name: string) => {
    const language = navigator.language.startsWith('ja') ? 'ja' : 'en';
    const { token, user } = await api.emailRegister({ email, password, name, language });
    api.setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
    setIsAdmin(false);
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    const updated = await api.updateMe(data);
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, login, emailLogin, emailRegister, logout, updateUser, checkAdminStatus }}>
      {children}
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
