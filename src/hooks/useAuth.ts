import { useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then((u) => setUser(u as User))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (name: string, password: string) => {
    const u = await api.login(name, password);
    setUser(u as User);
    return u as User;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return { user, loading, login, logout };
}
