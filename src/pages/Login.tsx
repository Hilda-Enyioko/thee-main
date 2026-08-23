import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { setTokens, setPartnerKey } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import { SiteNav, SiteFooter } from '../components/SiteChrome';

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
      // Step 1: authenticate, get JWTs
      const loginResponse = await api.post('/auth/login/', { email, password });
      const { tokens } = loginResponse.data;
      setTokens(tokens.access, tokens.refresh);

      // Step 2: retrieve X-Partner-Key using the same password, while it's
      // still in memory.
      const keyResponse = await api.post('/partner/api-key/retrieve/', { password });
      setPartnerKey(keyResponse.data.api_key);

      // Step 3: fetch partner context
      const meResponse = await api.get('/partner/me/');
      const me = meResponse.data;

      setAdmin({
        partnerType: me.partner_type,
        partnerName: me.partner_name,
        isActive: me.is_active,
      });

      if (!me.is_active) {
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
      <SiteNav />
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
      <SiteFooter />
    </div>
  );
}
