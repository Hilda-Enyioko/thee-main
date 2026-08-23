import { Link } from 'react-router-dom';

export function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Main navigation">
      <Link to="/" className="site-logo"><img src="/logo.png" alt="TheeInsurance" /></Link>
      <div className="site-nav-links">
        <Link to="/#why">Why us</Link>
        <Link to="/#services">Services</Link>
        <Link to="/#contact">Contact</Link>
        <Link to="/login">Login</Link>
        <Link to="/onboard" className="site-nav-cta">Create account</Link>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <img src="/logo.png" alt="TheeInsurance" />
      <div className="site-footer-links">
        <Link to="/">Home</Link><Link to="/#services">Services</Link><Link to="/#contact">Contact</Link>
      </div>
      <span>© {new Date().getFullYear()} TheeInsurance</span>
    </footer>
  );
}
