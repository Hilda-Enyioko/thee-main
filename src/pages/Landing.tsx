import { useState } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";

const slides = [
  {
    eyebrow: "THE PROBLEM",
    title: "Insurance should not feel like paperwork.",
    copy: "Customers lose time navigating slow onboarding, unclear products and disconnected providers.",
    meta: "For customers",
  },
  {
    eyebrow: "THE PLATFORM",
    title: "One clear route from cover to confidence.",
    copy: "TheeInsurance connects providers, distributors and customers in one digital operating layer.",
    meta: "For everyone",
  },
  {
    eyebrow: "THE OUTCOME",
    title: "Build the next insurance market.",
    copy: "Launch products faster, reach new customers and manage every relationship from one place.",
    meta: "For growth",
  },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = slides[activeSlide];

  const moveSlide = (direction: number) => {
    setActiveSlide((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <main className="landing">
      <header className="hero-header">
        <nav className="navbar" aria-label="Main navigation">
          <Link to="/" className="navbar-logo"><img src="/logo.png" alt="TheeInsurance" /></Link>
          <div className="desktop-links">
            <a href="#why">Why us</a><a href="#services">Services</a><a href="#contact">Contact</a>
          </div>
          <div className="navbar-actions">
            <Link to="/login" className="login-link">Login</Link>
            <Link to="/onboard" className="desktop-button">Create account</Link>
            <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle navigation">☰</button>
          </div>
        </nav>
        <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
          <a href="#why" onClick={() => setMenuOpen(false)}>Why us</a><a href="#services" onClick={() => setMenuOpen(false)}>Services</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link><Link to="/onboard" className="mobile-btn" onClick={() => setMenuOpen(false)}>Create account</Link>
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy"><p className="kicker">Insurance, reimagined</p><h1><span>THEE</span><em>INSURANCE</em></h1><p className="hero-description">A simpler digital infrastructure for the people and businesses building Africa&apos;s next generation of protection.</p><Link to="/onboard" className="primary-btn">Start building <span>↗</span></Link></div>
        <div className="hero-building"><img src="/hero-image.png" alt="Modern office building representing TheeInsurance" /></div>
        <div className="hero-index"><strong>01</strong><span>/ 03</span></div>
        <div className="hero-scroll">Scroll to explore <span>↓</span></div>
      </section>

      <section className="story" id="why">
        <div className="story-intro"><p className="kicker">A better system</p><h2>Insurance has many sides.<br /><em>We connect them.</em></h2><p>Move through the story of a platform designed to make insurance more accessible, understandable and ready for scale.</p><div className="slide-controls"><button onClick={() => moveSlide(-1)} aria-label="Previous slide">←</button><div className="slide-dots">{slides.map((item, index) => <button key={item.eyebrow} className={index === activeSlide ? "active" : ""} onClick={() => setActiveSlide(index)} aria-label={`Show slide ${index + 1}`} />)}</div><button onClick={() => moveSlide(1)} aria-label="Next slide">→</button></div></div>
        <article className="story-slide" aria-live="polite"><div className="slide-number">0{activeSlide + 1}</div><p className="kicker">{slide.eyebrow}</p><h3>{slide.title}</h3><p>{slide.copy}</p><span className="slide-meta">{slide.meta} <b>↗</b></span></article>
      </section>

      <section className="services" id="services"><div><p className="kicker">The ecosystem</p><h2>One platform.<br /><em>Every perspective.</em></h2></div><div className="service-rail"><article><span>01</span><h3>Providers</h3><p>Bring products to market with a connected distribution layer.</p></article><article><span>02</span><h3>Distributors</h3><p>Access, request and sell plans without the friction.</p></article><article><span>03</span><h3>Customers</h3><p>Understand your cover and get protected with confidence.</p></article></div></section>

      <section className="cta-section" id="contact"><p className="kicker">The next move</p><h2>Make insurance<br /><em>feel possible.</em></h2><Link to="/onboard" className="primary-btn">Create free account <span>↗</span></Link></section>
      <footer className="footer"><img src="/logo.png" alt="TheeInsurance" /><div><a href="#home">Home</a><a href="#services">Services</a><a href="#contact">Contact</a></div><span>© {new Date().getFullYear()} TheeInsurance</span></footer>
    </main>
  );
}
