import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { api } from '../api/client';

// Matches the JWT payload built in login() exactly: { id, username, email, role, name }.
// iat/exp are added automatically by jwt.sign — present when decoded via
// verifyToken (i.e. on /auth/me), but absent on the object returned straight
// from /auth/login until the next /auth/me call.
interface User {
  id: number; // confirm this — could be `string` if your Postgres id column is a UUID
  username: string;
  email: string | null;
  role: string;
  name: string | null;
  iat?: number;
  exp?: number;
}

interface AuthResponse {
  user: User;
  token?: string; // only present on /auth/login — /auth/me has no token field
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

export const TOKEN_KEY = 'token';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((data: AuthResponse) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const data: AuthResponse = await api.post('/auth/login', { username, password });


    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }

    setUser(data.user);
    return data.user;
  };

  const logout = async (): Promise<void> => {
    await api.post('/auth/logout', {});
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Throws instead of returning null so every consumer gets a non-nullable
// AuthContextValue without a null-check at every call site — practical here
// since AuthProvider wraps the whole app once at the root. Swap back to
// `AuthContextValue | null` with no throw if you'd rather null-check explicitly.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}