import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="hero-header">
      <nav className="navbar">
        {/* Left Navigation Group */}
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">
            <img src="/logo.png" alt="TheeInsurance" />
          </Link>

          <div className="desktop-links left-links">
            <a href="/#why">Why TheeInsurance</a>
            <a href="/#services">Services</a>
            <a href="/#developers">Developers</a>
          </div>
        </div>

        {/* Right Navigation Group */}
        <div className="navbar-right">
          <div className="desktop-links right-links">
            <a href="/#contact">Contact</a>
            <Link to="/login" className="login-link">
              Login
            </Link>
          </div>

          <Link to="/onboard" className="desktop-button">
            Create Free Account
          </Link>

          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Open Navigation"
          >
            ☰
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <a href="/#why" onClick={() => setMenuOpen(false)}>
          Why TheeInsurance
        </a>
        <a href="/#services" onClick={() => setMenuOpen(false)}>
          Services
        </a>
        <a href="/#developers" onClick={() => setMenuOpen(false)}>
          Developers
        </a>
        <a href="/#contact" onClick={() => setMenuOpen(false)}>
          Contact
        </a>
        <Link to="/login" onClick={() => setMenuOpen(false)}>
          Login
        </Link>
        <Link
          to="/onboard"
          className="mobile-btn"
          onClick={() => setMenuOpen(false)}
        >
          Create Free Account
        </Link>
      </div>
    </header>
  );
}
