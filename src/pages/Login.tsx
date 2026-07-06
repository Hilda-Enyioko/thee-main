import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../lib/api';
import { setTokens } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { setAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/auth/login/', { email, password });
      const { tokens } = response.data;
      setTokens(tokens.access, tokens.refresh);

      const meResponse = await api.get('/partner/me/');
      setAdmin({
        email: meResponse.data.email,
        firstName: meResponse.data.first_name,
        role: meResponse.data.role,
        partnerType: meResponse.data.partner_type,
        partnerName: meResponse.data.partner_name,
      });
      navigate(meResponse.data.partner_type === 'provider' ? '/plans' : '/access-requests');

      navigate('/analytics');
    } catch (err: unknown) { // 1. Change 'any' to 'unknown'
      // 2. Use Axios' built-in type guard to safely infer the type
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 400) {
          setError('Incorrect email or password.');
          return;
        }
      }
      
      // Fallback for non-Axios errors or other status codes
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <nav className="login-nav">
        <Link to="/" className="logo">
          <span className="logo-mark">the</span>e<span className="logo-accent">insurance</span>
        </Link>
      </nav>

      <div className="login-card">
        <h1>Welcome back</h1>
        <p className="form-subtext">Log in to manage your plans and view analytics.</p>

        {error && <div className="form-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="form-footer-link">
          Don't have an account? <Link to="/onboard">Get started</Link>
        </p>
      </div>
    </div>
  );
}
