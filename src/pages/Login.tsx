import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

      // /auth/login/ doesn't return partner_type or kyc_status, so fetch
      // the full partner context right after storing tokens.
      const meResponse = await api.get('/partner/me/');
      const me = meResponse.data;

      setAdmin({
        email: me.email,
        firstName: me.first_name,
        role: me.role,
        partnerType: me.partner_type,
        partnerName: me.partner_name,
      });

      // Not yet verified -> send them to submit KYC regardless of partner_type,
      // since Plan Management / Access Requests are functionally locked until
      // the account is verified anyway.
      if (me.kyc_status && me.kyc_status !== 'verified') {
        navigate('/kyc');
        return;
      }

      navigate(me.partner_type === 'provider' ? '/plans' : '/access-requests');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 400) {
        setError('Incorrect email or password.');
      } else {
        setError('Something went wrong. Please try again.');
      }
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
