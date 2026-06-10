import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '../api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await apiGet('/api/auth/me');
      setUser(me.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function login(email, password, remember = true) {
    // remember=false → session-only cookie on the server (ends on browser close).
    await apiPost('/api/auth/login', { email, password, remember });
    await refresh();
  }

  async function register(payload) {
    await apiPost('/api/auth/register', payload);
  }

  async function logout() {
    try { await apiPost('/api/auth/logout', {}); } catch {}
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}
