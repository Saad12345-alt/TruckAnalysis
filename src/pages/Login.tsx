import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import './Login.css';

function Login() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        navigate('/dashboard');
      }
    } catch (e) {
      return;
    }
  }, [navigate]);

  const handleLogin = async (role: string) => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (trimmedEmail === '' || trimmedPassword === '') {
      return alert('Please enter both email and password');
    }

    try {
      const data = await api.post('/auth/login', {
        email: trimmedEmail,
        password: trimmedPassword,
        role,
      });

      localStorage.setItem('token', data.token);
      navigate('/dashboard');
      console.log('Login success:', data);
    } catch (e) {
      alert(`An error occurred: ${e instanceof Error ? e.message : e}`);
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
          onChange={(e) => setEmail(e.target.value)}
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
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="btn-primary" onClick={() => handleLogin('admin')}>
          LOG IN AS ADMIN
        </button>
        <button className="btn-outline" onClick={() => handleLogin('driver')}>
          LOG IN AS DRIVER
        </button>

        <p className="login-hint">
          Accounts are provisioned by dispatch. No sign-up ? pick a role to preview that account.
        </p>
      </div>
    </div>
  );
}

export default Login;
