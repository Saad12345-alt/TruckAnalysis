import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

type UserRole = 'admin' | 'driver';

function Login() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const navigate = useNavigate();
  const { user, loading, login } = useAuth();

  // Redirect away from the login screen if a real, confirmed user already
  // exists — reading `user` from AuthContext (the single source of truth
  // NavBar also reads), not a raw localStorage token check. Waiting on
  // `loading` stops this firing before /auth/me has even resolved.
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
  };

  const handleLogin = async (role: UserRole): Promise<void> => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (trimmedEmail === '' || trimmedPassword === '') {
      alert('Please enter both email and password');
      return;
    }

    try {
      // Goes through AuthContext now instead of calling api.post directly —
      // this is what actually updates `user` in context, which is what
      // NavBar (and anything else using useAuth()) depends on.
      if (role === 'admin' || role === 'driver') {
        await login(trimmedEmail, trimmedPassword);
        navigate('/dashboard', { replace: true });
        return;
      }

      throw new Error('Unsupported role selected');
    } catch (error: unknown) {
      alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="brand">
          <span className="brand__dot" />
          <span className="eyebrow">FLEET MANIFEST SYSTEM</span>
        </div>
        <h1 className="login-title">WAYBILL</h1>

        <label className="field-label" htmlFor="username">
          USERNAME
        </label>
        <input
          id="username"
          className="field-input"
          placeholder="admin"
          value={email}
          onChange={handleEmailChange}
        />

        <label className="field-label" htmlFor="password">
          PASSWORD
        </label>
        <input
          id="password"
          type="password"
          className="field-input"
          placeholder="????????"
          value={password}
          onChange={handlePasswordChange}
        />

        <button className="btn-primary" onClick={() => void handleLogin('admin')}>
          LOG IN AS ADMIN
        </button>
        <button className="btn-outline" onClick={() => void handleLogin('driver')}>
          LOG IN AS DRIVER
        </button>

        <p className="login-hint">
          Accounts are provisioned by dispatch. No sign-up — pick a role to preview that account.
        </p>
      </div>
    </div>
  );
}

export default Login;