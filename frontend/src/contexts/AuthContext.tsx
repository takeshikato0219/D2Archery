import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (googleData: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api
        .getMe()
        .then(setUser)
        .catch(() => {
          api.setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

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
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    const updated = await api.updateMe(data);
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
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
