import { create } from 'zustand';
import { api, tokens } from '@/lib/api';
import type { AuthResponse, User } from '@/lib/types';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  user: User | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { email: string; password: string; fullName: string; phone?: string; role: 'CUSTOMER' | 'PROVIDER' }) => Promise<User>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  // On app start: if we have saved tokens, load the user.
  async bootstrap() {
    tokens.onExpired(() => set({ status: 'signedOut', user: null }));
    if (!(await tokens.load())) return set({ status: 'signedOut' });
    try {
      const user = await api<User>('/auth/me');
      set({ status: 'signedIn', user });
    } catch {
      await tokens.clear();
      set({ status: 'signedOut', user: null });
    }
  },

  async login(email, password) {
    const res = await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    await tokens.save(res);
    const user = await api<User>('/auth/me');
    set({ status: 'signedIn', user });
    return user;
  },

  async register(input) {
    const res = await api<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false });
    await tokens.save(res);
    set({ status: 'signedIn', user: res.user });
    return res.user;
  },

  async refreshUser() {
    if (get().status !== 'signedIn') return;
    set({ user: await api<User>('/auth/me') });
  },

  async logout() {
    const refreshToken = tokens.refresh;
    if (refreshToken) await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => undefined);
    await tokens.clear();
    set({ status: 'signedOut', user: null });
  },
}));
