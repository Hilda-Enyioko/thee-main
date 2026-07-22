import { useState } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";

const problems = [
  {
    problem:
      "Getting covered means weeks of paperwork and manual verification.",
    fix: "Customers complete onboarding digitally with real-time status updates.",
  },
  {
    problem:
      "Insurance providers struggle to reach new markets efficiently.",
    fix: "Distributors extend provider reach through one centralized platform.",
  },
  {
    problem:
      "Distributors have no unified portal for selling insurance products.",
    fix: "Request, receive approval and begin selling plans immediately.",
  },
  {
    problem:
      "Customers rarely understand what they're actually buying.",
    fix: "Insurance plans are explained in plain language before purchase.",
  },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="landing">
      {/* ================= NAVBAR ================= */}

      <header className="hero-header">
        <nav className="navbar">
          {/* Left Navigation Group */}
          <div className="navbar-left">
            <Link to="/" className="navbar-logo">
              <img src="/logo.png" alt="TheeInsurance" />
            </Link>

            <div className="desktop-links left-links">
              <a href="#why">Why TheeInsurance</a>
              <a href="#services">Services</a>
              <a href="#developers">Developers</a>
            </div>
          </div>

          {/* Right Navigation Group */}
          <div className="navbar-right">
            <div className="desktop-links right-links">
              <a href="#contact">Contact</a>
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
          <a href="#why" onClick={() => setMenuOpen(false)}>
            Why TheeInsurance
          </a>
          <a href="#services" onClick={() => setMenuOpen(false)}>
            Services
          </a>
          <a href="#developers" onClick={() => setMenuOpen(false)}>
            Developers
          </a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>
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

      {/* ================= HERO ================= */}

      <section className="hero" id="home">
        <h1 className="hero-title">
          <span className="hero-black">THEE</span>
          <span className="hero-blue">INSURANCE</span>
        </h1>

        <div className="hero-building">
          <img src="/hero-image.png" alt="Modern office building" />
        </div>

        <div className="hero-content">
          <p>
            Helping insurance providers and distributors digitize onboarding,
            policy management and customer acquisition across Nigeria.
          </p>

          <div className="hero-buttons">
            <Link to="/onboard" className="primary-btn">
              Create Free Account
            </Link>

            <a href="#why" className="secondary-btn">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* ================= WHY ================= */}

      <section className="problems-section" id="why">
        <div className="section-heading">
          <span>Why TheeInsurance</span>

          <h2>Solving Nigeria's Insurance Infrastructure Problem</h2>

          <p>
            We bridge the gap between insurance providers, distributors and
            digital customers through one platform.
          </p>
        </div>

        <div className="problem-grid">
          {problems.map((item, index) => (
            <div className="problem-card" key={index}>
              <div className="problem-inner">
                <div className="problem-front">
                  <small>THE PROBLEM</small>
                  <p>{item.problem}</p>
                </div>

                <div className="problem-back">
                  <small>OUR SOLUTION</small>
                  <p>{item.fix}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= WORKFLOW ================= */}

      <section id="services" className="workflow">
        <div className="section-heading">
          <span>How It Works</span>

          <h2>
            One Platform.
            <br />
            Multiple Stakeholders.
          </h2>
        </div>

        <div className="workflow-diagram">
          <div className="workflow-box">Insurance Providers</div>
          <div className="workflow-arrow">→</div>
          <div className="workflow-center">TheeInsurance</div>
          <div className="workflow-arrow">→</div>
          <div className="workflow-box">Distributors</div>
        </div>

        <div className="workflow-down">↓</div>

        <div className="workflow-bottom">Digital Customers</div>
      </section>

      {/* ================= CTA ================= */}

      <section className="cta-section" id="contact">
        <h2>Ready to modernize your insurance business?</h2>

        <p>
          Launch faster, onboard customers digitally and expand your
          distribution network with TheeInsurance.
        </p>

        <Link to="/onboard" className="primary-btn">
          Create Free Account
        </Link>
      </section>

      {/* ================= FOOTER ================= */}

      <footer className="footer">
        <div className="footer-logo">
          <img src="/logo.png" alt="TheeInsurance" />
        </div>

        <div className="footer-links">
          <a href="#home">Home</a>
          <a href="#services">Services</a>
          <a href="#why">Why Us</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="footer-copy">
          © {new Date().getFullYear()} TheeInsurance. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
