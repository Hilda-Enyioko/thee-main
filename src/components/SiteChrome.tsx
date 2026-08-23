import { useState } from 'react';
import { Link } from 'react-router-dom';

export function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <>
      <nav className="site-nav" aria-label="Main navigation">
        <Link to="/" className="site-logo" onClick={closeMenu}><img src="/logo.png" alt="TheeInsurance" /></Link>
        <div className="site-nav-links">
          <Link to="/#why" onClick={closeMenu}>Why us</Link>
          <Link to="/#services" onClick={closeMenu}>Services</Link>
          <Link to="/#contact" onClick={closeMenu}>Contact</Link>
          <Link to="/onboard" className="site-nav-cta" onClick={closeMenu}>Create account</Link>
        </div>
        <button className="site-nav-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">☰</button>
      </nav>
      <div className={`site-nav-mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link to="/#why" onClick={closeMenu}>Why us</Link>
        <Link to="/#services" onClick={closeMenu}>Services</Link>
        <Link to="/#contact" onClick={closeMenu}>Contact</Link>
        <Link to="/onboard" className="site-nav-cta" onClick={closeMenu}>Create account</Link>
      </div>
    </>
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
