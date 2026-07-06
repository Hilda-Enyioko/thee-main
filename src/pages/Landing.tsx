import { Link } from 'react-router-dom';
import './Landing.css';

const stats = [
  { value: '14 Days', label: 'Saved on Processing' },
  { value: '40%', label: 'More Revenue' },
  { value: 'Zero', label: 'Paperwork' },
  { value: '100%', label: 'Digital Cover' },
];

const problems = [
  {
    problem: 'Getting covered means weeks of paper forms and back-and-forth.',
    fix: 'Document upload and verification happen online, start to finish.',
  },
  {
    problem: 'Distributors have no easy way to sell a provider\u2019s plans.',
    fix: 'Distributors request access to a plan and start selling once approved.',
  },
  {
    problem: 'Customers don\u2019t know what they\u2019re signing up for.',
    fix: 'Plans are written in plain language, with status tracked in real time.',
  },
  {
    problem: 'Providers struggle to reach customers outside their own network.',
    fix: 'A network of distributors extends reach with no extra sales infrastructure.',
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <nav className="navbar">
        <div className="logo">
          <span className="logo-mark">the</span>e<span className="logo-accent">insurance</span>
        </div>
        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#contact">Contact Us</a>
          <Link to="/onboard" className="nav-cta">Get Started</Link>
        </div>
      </nav>

      <section className="hero" id="home">
        <div className="hero-text">
          <span className="eyebrow">theeinsurance</span>
          <h1>Insurance that doesn't feel like paperwork.</h1>
          <p>
            We connect insurance providers and distributors on one platform,
            so people can get covered without the waiting, the forms, or the confusion.
          </p>
          <div className="hero-actions">
            <Link to="/onboard" className="btn-primary">Get Started</Link>
            <a href="#how-it-works" className="btn-ghost">See how it works</a>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-image-placeholder">
            <img alt="Secure your future" src='/home_image.png' />
          </div>
        </div>
      </section>

      <section className="stats">
        {stats.map((s) => (
          <div className="stat-box" key={s.label}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="verify-line" />
          </div>
        ))}
      </section>

      <section className="problems" id="about">
        <div className="section-heading">
          <span className="eyebrow">The gap in Nigerian insurance</span>
          <h2>What's broken, and how we fix it</h2>
        </div>
        <div className="problem-grid">
          {problems.map((p, i) => (
            <div className="problem-card" key={i}>
              <div className="problem-card-inner">
                <div className="card-face card-front">
                  <span className="card-label">The problem</span>
                  <p>{p.problem}</p>
                </div>
                <div className="card-face card-back">
                  <span className="card-label">Our fix</span>
                  <p>{p.fix}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="section-heading">
          <span className="eyebrow">How it works</span>
          <h2>One path, two sides of the business</h2>
        </div>
        <div className="diagram">
          <div className="diagram-row">
            <div className="diagram-box">Insurance Providers</div>
            <div className="diagram-arrow">&#8594;</div>
            <div className="diagram-box diagram-box-center">theeinsurance</div>
            <div className="diagram-arrow">&#8594;</div>
            <div className="diagram-box">Distributors</div>
          </div>
          <div className="diagram-down-arrow">&#8595;</div>
          <div className="diagram-box diagram-box-wide">Digital Customers, on either side</div>
        </div>
      </section>

      <section className="cta" id="contact">
        <h2>Ready to bring your insurance business online?</h2>
        <p>Onboarding takes minutes. Verification is handled for you.</p>
        <Link to="/onboard" className="btn-primary">Get Started</Link>
      </section>

      <footer className="footer">
        <div className="footer-logo">
          <span className="logo-mark">the</span>e<span className="logo-accent">insurance</span>
        </div>
        <div className="footer-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#contact">Contact Us</a>
        </div>
        <div className="footer-copy">&copy; {new Date().getFullYear()} theeinsurance. All rights reserved.</div>
      </footer>
    </div>
  );
}
