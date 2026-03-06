import { useState, useEffect, useRef } from "react";

const GLITCH_CHARS = "!<>-_\\/[]{}—=+*^?#@$%&";

function GlitchText({ text, className = "" }) {
  const [display, setDisplay] = useState(text);
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.85) {
        setGlitching(true);
        let count = 0;
        const glitch = setInterval(() => {
          setDisplay(text.split("").map((c, i) =>
            Math.random() > 0.7 ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : c
          ).join(""));
          count++;
          if (count > 5) {
            clearInterval(glitch);
            setDisplay(text);
            setGlitching(false);
          }
        }, 50);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [text]);

  return <span className={className} style={{ fontFamily: "monospace" }}>{display}</span>;
}

function MatrixRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cols = Math.floor(canvas.width / 20);
    const drops = Array(cols).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(8, 13, 20, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00ff8822";
      ctx.font = "14px monospace";

      drops.forEach((y, i) => {
        const char = String.fromCharCode(0x30A0 + Math.random() * 96);
        ctx.fillText(char, i * 20, y * 20);
        if (y * 20 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    };

    const interval = setInterval(draw, 50);
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    return () => { clearInterval(interval); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, zIndex: 0, opacity: 0.4, pointerEvents: "none" }} />;
}

function TypeWriter({ text, speed = 50, onDone }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) { clearInterval(t); onDone && onDone(); }
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return <span>{displayed}<span style={{ animation: "blink 1s infinite", color: "#00ff88" }}>_</span></span>;
}

const FEATURES = [
  { icon: "⚡", title: "CHALLENGES", desc: "Web, Crypto, Forensics, OSINT — tous les domaines du hacking éthique." },
  { icon: "🏆", title: "SCOREBOARD", desc: "Classement en temps réel. Prouve ta valeur face à l'élite mauritanienne." },
  { icon: "👥", title: "TEAMS", desc: "Forme ton équipe, coordonne les attaques, domine le leaderboard." },
  { icon: "🎯", title: "EVENTS", desc: "Compétitions officielles CTF avec prix et certifications." },
];

const STATS = [
  { value: "∞", label: "CHALLENGES" },
  { value: "24/7", label: "UPTIME" },
  { value: "🇲🇷", label: "MAURITANIE" },
  { value: "FREE", label: "ACCÈS" },
];

export default function Landing() {
  const [typed, setTyped] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#080d14", color: "#c9d8e8", fontFamily: "monospace", overflowX: "hidden" }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanline { 0%{top:-10%} 100%{top:110%} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 20px #00ff8840} 50%{box-shadow:0 0 40px #00ff8880} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes glowText { 0%,100%{text-shadow:0 0 10px #00ff8860} 50%{text-shadow:0 0 30px #00ff88,0 0 60px #00ff8840} }
        .nav-btn { background:transparent; border:1px solid #00ff8866; color:#00ff88; padding:8px 20px; cursor:pointer; font-family:monospace; font-size:13px; letter-spacing:2px; transition:all 0.2s; text-decoration:none; display:inline-block; }
        .nav-btn:hover { background:#00ff8822; border-color:#00ff88; box-shadow:0 0 15px #00ff8840; }
        .nav-btn.primary { background:#00ff8822; border-color:#00ff88; }
        .nav-btn.primary:hover { background:#00ff8844; box-shadow:0 0 25px #00ff8860; }
        .feature-card { background:#0d1520; border:1px solid #1a2a3a; padding:30px; transition:all 0.3s; cursor:default; }
        .feature-card:hover { border-color:#00ff8866; background:#0d1520ee; transform:translateY(-4px); box-shadow:0 10px 30px #00ff8820; }
        .cta-btn { background:#00ff88; color:#080d14; padding:16px 48px; font-family:monospace; font-size:15px; font-weight:700; letter-spacing:3px; cursor:pointer; border:none; transition:all 0.3s; animation:pulse 2s infinite; }
        .cta-btn:hover { background:#00dd77; transform:scale(1.05); }
        .scanline { position:absolute; left:0; width:100%; height:2px; background:linear-gradient(transparent,#00ff8820,transparent); animation:scanline 4s linear infinite; pointer-events:none; }
      `}</style>

      <MatrixRain />

      {/* NAVBAR */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(8,13,20,0.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid #1a2a3a", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: 32, height: 32, border: "2px solid #00ff88", display: "flex", alignItems: "center", justifyContent: "center", color: "#00ff88", fontSize: 16, animation: "glowText 3s infinite" }}>⚔</div>
          <span style={{ color: "#00ff88", fontSize: 20, letterSpacing: 4, fontWeight: 700, animation: "glowText 3s infinite" }}>NKTCTF</span>
          <span style={{ color: "#4a6070", fontSize: 10, letterSpacing: 2 }}>WHERE HACKERS RISE</span>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ color: "#4a6070", fontSize: 11, marginRight: 16 }}>🇲🇷 NOUAKCHOTT</span>
          <a href="/login" className="nav-btn">[ LOGIN ]</a>
          <a href="/register" className="nav-btn primary">[ JOIN ]</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 64, overflow: "hidden" }}>
        <div className="scanline" />

        {/* Grid overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#1a2a3a11 1px,transparent 1px),linear-gradient(90deg,#1a2a3a11 1px,transparent 1px)", backgroundSize: "40px 40px", zIndex: 1 }} />

        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 20px", opacity: visible ? 1 : 0, transition: "opacity 1s" }}>
          {/* Terminal window */}
          <div style={{ background: "#0d1520", border: "1px solid #1a2a3a", borderRadius: 8, padding: "40px 60px", maxWidth: 800, margin: "0 auto", boxShadow: "0 0 80px #00ff8820" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 30, justifyContent: "flex-start" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f56" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f" }} />
              <span style={{ color: "#4a6070", fontSize: 12, marginLeft: 10 }}>nktctf@terminal ~ $</span>
            </div>

            <div style={{ color: "#4a6070", fontSize: 13, marginBottom: 20, textAlign: "left" }}>
              <span style={{ color: "#00ff88" }}>{">"}</span> Initializing NKTCTF platform...
            </div>

            <h1 style={{ fontSize: "clamp(40px, 8vw, 80px)", letterSpacing: 8, margin: "0 0 10px", color: "#00ff88", animation: "glowText 3s infinite", lineHeight: 1 }}>
              <GlitchText text="NKTCTF" />
            </h1>

            <div style={{ color: "#c9d8e8", fontSize: 14, letterSpacing: 6, marginBottom: 30 }}>
              WHERE HACKERS RISE <span style={{ color: "#00ff88" }}>🇲🇷</span>
            </div>

            <div style={{ color: "#4a6070", fontSize: 14, marginBottom: 40, textAlign: "left", minHeight: 24 }}>
              <span style={{ color: "#00ff88" }}>{">"}</span>{" "}
              {!typed
                ? <TypeWriter text="La première plateforme CTF de Mauritanie. Hack. Learn. Dominate." speed={40} onDone={() => setTyped(true)} />
                : "La première plateforme CTF de Mauritanie. Hack. Learn. Dominate."
              }
            </div>

            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/register" className="cta-btn">[ COMMENCER MAINTENANT ]</a>
              <a href="/login" className="nav-btn" style={{ padding: "16px 32px", fontSize: 14 }}>[ SE CONNECTER ]</a>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ position: "relative", zIndex: 2, background: "#0a0f18", borderTop: "1px solid #1a2a3a", borderBottom: "1px solid #1a2a3a", padding: "40px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "30px 20px", borderRight: i < 3 ? "1px solid #1a2a3a" : "none" }}>
              <div style={{ fontSize: 32, color: "#00ff88", fontWeight: 700, letterSpacing: 2, animation: "glowText 3s infinite" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#4a6070", letterSpacing: 3, marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ position: "relative", zIndex: 2, padding: "100px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ color: "#00ff88", fontSize: 12, letterSpacing: 4, marginBottom: 16 }}>{"// MODULES"}</div>
          <h2 style={{ fontSize: 36, color: "#c9d8e8", letterSpacing: 4, margin: 0 }}>ARSENAL COMPLET</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 2 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
              <div style={{ color: "#00ff88", fontSize: 13, letterSpacing: 3, marginBottom: 12 }}>{f.title}</div>
              <div style={{ color: "#4a6070", fontSize: 13, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ position: "relative", zIndex: 2, padding: "80px 40px", textAlign: "center", background: "#0a0f18", borderTop: "1px solid #1a2a3a" }}>
        <div style={{ color: "#00ff88", fontSize: 12, letterSpacing: 4, marginBottom: 20 }}>{"// READY ?"}</div>
        <h2 style={{ fontSize: 36, color: "#c9d8e8", letterSpacing: 4, marginBottom: 16 }}>REJOINS L'ÉLITE</h2>
        <p style={{ color: "#4a6070", marginBottom: 40, fontSize: 14 }}>Inscription gratuite. Commence à hacker maintenant.</p>
        <a href="/register" className="cta-btn">[ CRÉER UN COMPTE ]</a>
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 2, padding: "30px 40px", borderTop: "1px solid #1a2a3a", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <span style={{ color: "#00ff88", letterSpacing: 3, fontSize: 14 }}>NKTCTF</span>
        <span style={{ color: "#4a6070", fontSize: 12 }}>© 2025 NKTCTF — Nouakchott, Mauritanie 🇲🇷</span>
        <span style={{ color: "#4a6070", fontSize: 12 }}>Made with ❤️ for hackers</span>
      </footer>
    </div>
  );
}