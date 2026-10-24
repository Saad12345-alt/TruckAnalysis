import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

export const TOKEN_KEY = 'token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await api.post('/auth/logout', {});
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
