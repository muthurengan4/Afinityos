'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

const ACCESS_KEY = 'afinity_access_token';
const REFRESH_KEY = 'afinity_refresh_token';
const USER_KEY = 'afinity_user';
const ORG_KEY = 'afinity_org';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Bootstrap session on mount
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const cachedUser = localStorage.getItem(USER_KEY);
        const cachedOrg = localStorage.getItem(ORG_KEY);
        const accessToken = localStorage.getItem(ACCESS_KEY);
        if (cachedUser) setUser(JSON.parse(cachedUser));
        if (cachedOrg) setOrganization(JSON.parse(cachedOrg));
        if (accessToken) {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setOrganization(data.organization);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            if (data.organization) localStorage.setItem(ORG_KEY, JSON.stringify(data.organization));
          } else if (res.status === 401) {
            // try refresh
            const ok = await refresh();
            if (!ok) clearSession();
          }
        }
      } catch (e) {
        console.error('bootstrap failed', e);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearSession = () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ORG_KEY);
    setUser(null);
    setOrganization(null);
  };

  const persist = (data) => {
    if (data.accessToken) localStorage.setItem(ACCESS_KEY, data.accessToken);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
    if (data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
    }
    if (data.organization) {
      localStorage.setItem(ORG_KEY, JSON.stringify(data.organization));
      setOrganization(data.organization);
    }
  };

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    persist(data);
    return data;
  };

  const register = async (payload) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    persist(data);
    return data;
  };

  const refresh = useCallback(async () => {
    const rt = localStorage.getItem(REFRESH_KEY);
    if (!rt) return false;
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.accessToken) localStorage.setItem(ACCESS_KEY, data.accessToken);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
    return true;
  }, []);

  const logout = async () => {
    const rt = localStorage.getItem(REFRESH_KEY);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
    } catch (e) {
      // ignore network errors on logout
    }
    clearSession();
    router.push('/login');
  };

  const forgotPassword = async (email) => {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const updateProfile = async (patch) => {
    const at = localStorage.getItem(ACCESS_KEY);
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${at}` },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');
    setUser(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  };

  const authFetch = async (url, options = {}) => {
    const at = localStorage.getItem(ACCESS_KEY);
    const res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${at}` },
    });
    if (res.status === 401) {
      const refreshed = await refresh();
      if (refreshed) {
        const newAt = localStorage.getItem(ACCESS_KEY);
        return fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${newAt}` } });
      }
    }
    return res;
  };

  const value = {
    user,
    organization,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refresh,
    forgotPassword,
    updateProfile,
    authFetch,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
