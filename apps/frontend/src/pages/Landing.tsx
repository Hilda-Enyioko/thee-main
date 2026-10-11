import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";
import "./Theme.css";

const MEDIA = {
  approach: "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/5fc5651c-3b5d-4171-b507-87f7e635d1b4.mp4",
};

function HeroBackground() {
  return <div className="hero-background" aria-hidden="true">
    <img className="hero-logo-form" src="/theeinsurance-mark.jpg" alt="" />
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="pathBlue" x1="0" x2="1"><stop stopColor="#4e9fff" stopOpacity=".06" /><stop offset=".5" stopColor="#8ec4ff" stopOpacity=".62" /><stop offset="1" stopColor="#4e9fff" stopOpacity=".05" /></linearGradient></defs>
      <path className="hero-path path-one" d="M-110 650C190 450 245 820 530 650S860 282 1090 424s293 55 610-234" />
      <path className="hero-path path-two" d="M-90 330c275-210 443 89 681-4 246-96 340-403 588-227 205 146 238 241 532 105" />
      <path className="hero-path path-three" d="M610 980c-14-246 306-265 420-469 97-173-5-342 316-494" />
      <circle className="hero-node node-one" cx="530" cy="650" r="4" /><circle className="hero-node node-two" cx="1090" cy="424" r="4" />
    </svg>
  </div>;
}

export default function Landing() {
  const [loaded, setLoaded] = useState(false), [progress, setProgress] = useState(0), [menuOpen, setMenuOpen] = useState(false), [inquirySent, setInquirySent] = useState(false), [theme, setTheme] = useState<"dark" | "light">("dark");
  const preload = useRef<HTMLVideoElement>(null), preloadDone = useRef(false);
  useEffect(() => {
    const video = preload.current;
    if (!video) return;
    let frame = 0;
    let startedAt = 0;
    let started = false;
    const finish = () => {
      if (preloadDone.current) return;
      preloadDone.current = true;
      cancelAnimationFrame(frame);
      setProgress(100);
      setLoaded(true);
    };
    const tick = (now: number) => {
      // The counter intentionally stops short of 100 until the approach clip ends.
      setProgress(Math.min(96, Math.round(((now - startedAt) / 3000) * 96)));
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (started) return;
      started = true;
      startedAt = performance.now();
      video.currentTime = 0;
      video.playbackRate = video.duration ? Math.max(.25, video.duration / 3) : 1;
      video.play().catch(finish);
      frame = requestAnimationFrame(tick);
    };
    video.addEventListener("canplay", start, { once: true });
    video.addEventListener("ended", finish, { once: true });
    video.addEventListener("error", finish, { once: true });
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) start();
    video.load();
    return () => cancelAnimationFrame(frame);
  }, []);
  const handleInquiry = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); window.location.href = `mailto:contact@theeinsurance.com.ng?subject=${encodeURIComponent("TheeInsurance enquiry")}&body=${encodeURIComponent(`Name: ${f.get("name")}\nEmail: ${f.get("email")}\n\n${f.get("message")}`)}`; setInquirySent(true); };
  return <main className={`landing theme-${theme} ${loaded ? "is-loaded" : ""}`}>
    <section className="portal-experience editorial-hero" id="home" onPointerMove={(event) => { if (event.pointerType === "mouse") { event.currentTarget.style.setProperty("--hero-x", `${(event.clientX / innerWidth - .5) * 16}px`); event.currentTarget.style.setProperty("--hero-y", `${(event.clientY / innerHeight - .5) * 12}px`); } }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--hero-x", "0px"); event.currentTarget.style.setProperty("--hero-y", "0px"); }}><HeroBackground /><div className="hero-grid" aria-hidden="true" /><div className="preloader"><video ref={preload} src={MEDIA.approach} muted playsInline preload="auto" /><div className="preloader-shade" /></div><div className="preloader-count"><span>{progress}</span><b>%</b></div><a className="brand-lockup" href="#home" aria-label="TheeInsurance home"><img src="/theeinsurance-mark.jpg" alt="" /><span>theeinsurance</span></a>
      <header className="portal-header chrome"><nav><a href="#why">Why</a><a href="#benefits">Benefits</a><a href="#contact">Contact</a></nav><button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? "Light" : "Dark"}</button><button onClick={() => setMenuOpen(!menuOpen)} className="menu-button">Menu</button></header><div className={`mobile-portal-menu ${menuOpen ? "open" : ""}`}><a href="#why">Why</a><a href="#benefits">Benefits</a><Link to="/login">Log in</Link><Link to="/onboard">Create account</Link></div>
      <div className="editorial-copy chrome"><span className="editorial-kicker">TheeInsurance / Digital infrastructure</span><h1>Insurance infrastructure<br />that moves <em>Africa</em> forward.</h1></div>
      <div className="editorial-side chrome"><p>One digital operating layer for providers, distributors and customers - built to make protection easier to launch, understand and grow.</p><Link to="/onboard" className="editorial-cta">Create your account <span>↗</span></Link></div>
      <div className="editorial-wordmark" aria-hidden="true">theeInsurance</div>
    </section>
    <section className="ecosystem-section" id="why"><p className="eyebrow">A shared system, built with care</p><h2>Insurance works better<br /><em>when everyone is connected.</em></h2><div className="ecosystem-grid"><article><span>01 / PROVIDERS</span><h3>Launch with a clearer distribution layer.</h3><p>Manage plans and work with the partners bringing them to market.</p></article><article><span>02 / DISTRIBUTORS</span><h3>Sell trusted products with less friction.</h3><p>Discover the plans you can offer and build more meaningful customer relationships.</p></article><article><span>03 / CUSTOMERS</span><h3>Understand protection on your terms.</h3><p>A simpler path to the cover people and businesses need to move forward.</p></article></div></section>
    <section className="benefits-section" id="benefits"><p className="eyebrow">Why TheeInsurance</p><h2>Key benefits</h2><div className="benefits-grid"><article className="benefit-card"><i /><h3>Preemptive risk<br />awareness</h3><p>Bring plans, partners and customer activity into a more connected operating view - so the next decision is clearer.</p></article><article className="benefit-card video-card"><div><video autoPlay loop muted playsInline src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260421_072701_f6a01abb-eb30-4559-9d6e-774362defbc3.mp4" /><i /></div><h3>Insurance know-how<br />that travels further</h3></article><article className="benefit-card"><i /><h3>Connected growth,<br />built for Africa</h3><p>Make the journey from product setup to customer confidence feel more seamless for every role.</p></article></div></section>
    <section className="contact-section" id="contact"><div><p className="eyebrow">The next move</p><h2>Build a more confident<br /><em>insurance experience.</em></h2><Link to="/onboard" className="primary-btn">Start with TheeInsurance <span>↗</span></Link></div><form onSubmit={handleInquiry}><p className="eyebrow">Start a conversation</p><h3>Tell us what you’re building.</h3><input name="name" required placeholder="Your name" /><input name="email" required type="email" placeholder="Email address" /><textarea name="message" required placeholder="How can we help?" rows={4} /><button type="submit">{inquirySent ? "Inquiry ready to send" : "Send inquiry"}<span>↗</span></button></form></section>
    <footer className="brand-footer"><div className="footer-wrapper"><div className="footer-left"><video autoPlay muted loop playsInline preload="auto" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260503_104800_bc43ae09-f494-43e3-97d7-2f8c1692cfd7.mp4" /><img src="/logo.png" alt="TheeInsurance" /><p>Digital insurance infrastructure,<br /><span>built for more confident growth.</span></p><div className="footer-social"><em>Stay in touch</em><a href="mailto:contact@theeinsurance.com.ng">✉</a><a href="#home">↗</a></div></div><div className="footer-right"><div className="lucky"><b><img src="/theeinsurance-mark.jpg" alt="TheeInsurance" style={{ width: "52px", height: "52px", objectFit: "cover", borderRadius: "14px" }} /></b><em>Built for<br />what’s next</em></div><div className="footer-nav"><div><h4>Explore</h4><a href="#why">Why</a><a href="#benefits">Benefits</a><a href="#contact">Contact</a></div><div><h4>Platform</h4><Link to="/onboard">Create account</Link><Link to="/login">Log in</Link><a href="#home">Privacy</a></div></div><div className="footer-bottom"><small>© {new Date().getFullYear()} TheeInsurance. All rights reserved.</small><div><p>Insurance moves fast.<br /><strong>Move with confidence.</strong></p><Link to="/onboard">Get started</Link></div></div></div></div><div className="footer-watermark" aria-hidden="true">theeInsurance</div></footer>
  </main>;
}
