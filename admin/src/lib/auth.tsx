import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, session } from './api';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    const refreshToken = session.refresh;
    if (refreshToken) api('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined);
    session.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('fixmate:logout', onExpired);
    if (session.refresh) {
      api<User>('/auth/me')
        .then((me) => (me.role === 'ADMIN' ? setUser(me) : logout()))
        .catch(() => session.clear())
        .finally(() => setLoading(false));
    } else setLoading(false);
    return () => window.removeEventListener('fixmate:logout', onExpired);
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await api<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', { method: 'POST', body: { email, password } });
    if (res.user.role !== 'ADMIN') {
      // Don't keep a customer/provider session in the admin site.
      await api('/auth/logout', { method: 'POST', body: { refreshToken: res.refreshToken } }).catch(() => undefined);
      throw new Error('This account is not an administrator');
    }
    session.save(res);
    setUser(res.user);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
