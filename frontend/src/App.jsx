import { useEffect, useRef, useState, useTransition } from "react";
import { Routes, Route, Link, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  MessageCircleHeart, Sparkles, Trash2, Send, LogOut, Plus, ShieldAlert, 
  User, BarChart2, Clock, Smile, ChevronRight, Star, Calendar, 
  Activity, CheckCircle2, Shield, HeartPulse, Brain, Zap, ArrowRight,
  Headphones, Users, BookOpen, AlertTriangle, X, MessageSquare, Maximize2, Minimize2
} from "lucide-react";
import { api, getToken } from "./api.js";
import Brain3D from "./Brain3D.jsx";

const DISCLAIMER = "MindCare AI provides clinical-grade emotional guidance and is not a substitute for emergency medical care. In urgent crisis, please contact local emergency services immediately.";
const EMO = { happy: "\u{1F60A}", calm: "\u{1F60C}", sad: "\u{1F614}", anxious: "\u{1F630}", stressed: "\u{1F62B}", angry: "\u{1F624}", lonely: "\u{1F97A}", neutral: "\u{1F610}" };

/* -- User storage helpers (prevents blank screen flashing) -- */
function getStoredUser() {
  try {
    const raw = localStorage.getItem("mindcare_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  try {
    if (user) localStorage.setItem("mindcare_user", JSON.stringify(user));
    else localStorage.removeItem("mindcare_user");
  } catch {}
}

/* -- Shared hooks -- */
function useUser(redirectOnFail = true) {
  const [user, setUser] = useState(() => getStoredUser());
  const nav = useNavigate();
  const token = getToken();

  useEffect(() => {
    if (!token) {
      setUser(null);
      setStoredUser(null);
      if (redirectOnFail) nav("/login");
      return;
    }
    api("/auth/me")
      .then(d => {
        setUser(d.user);
        setStoredUser(d.user);
      })
      .catch(() => {
        setUser(null);
        setStoredUser(null);
        if (redirectOnFail) nav("/login");
      });
  }, [token]);

  return user;
}

function useToast() {
  const [m, setM] = useState("");
  return [m, t => { setM(t); setTimeout(() => setM(""), 3500); }];
}

/* -- Small components -- */
function Toast({ msg }) {
  if (!msg) return null;
  return <div role="alert" className="toast">{msg}</div>;
}

function Logo() {
  return (
    <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #00c0e8 0%, #004452 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 15px rgba(0, 192, 232, 0.5)" }}>
          <Brain size={20} color="#020d14" strokeWidth={2.5} />
        </div>
        <Sparkles size={12} color="#00c0e8" style={{ position: "absolute", top: -4, right: -4, filter: "drop-shadow(0 0 6px #00c0e8)" }} />
      </div>
      <span className="font-orbitron" style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "0.08em", color: "#f0fbff" }}>
        MIND<span style={{ color: "#00c0e8" }}>CARE</span>
      </span>
    </Link>
  );
}

/* -- Shell layout for Authenticated & Portal Pages -- */
function Shell({ user, children }) {
  const nav = useNavigate();
  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setStoredUser(null);
    nav("/");
  };

  return (
    <div className="min-h-screen" style={{ background: "#020d14", color: "#f0fbff" }}>
      <div className="neural-grid-bg" />
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1rem 2rem", maxWidth: "85rem", margin: "0 auto",
        background: "rgba(2, 13, 20, 0.88)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(0, 192, 232, 0.2)"
      }}>
        <Logo />
        <nav style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link to="/" className="btn-pill-cyan" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}>Home</Link>
          <Link to="/dashboard" className="btn-pill-cyan" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}>Dashboard</Link>
          <Link to="/chat" className="btn-pill-cyan active" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}>AI Chat</Link>
          <Link to="/history" className="btn-pill-cyan" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}>History</Link>
          <Link to="/safety" className="btn-pill-cyan" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}>Safety</Link>
          <Link to="/profile" className="btn-pill-cyan" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}>Profile</Link>
          {user?.role === "admin" && (
            <Link to="/admin" className="btn-pill-cyan" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", borderColor: "#38ef7d", color: "#38ef7d" }}>Admin</Link>
          )}
          {user ? (
            <button onClick={logout} className="btn-pill-cyan" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", borderColor: "rgba(239,68,68,0.5)", color: "#ef4444" }}>
              <LogOut size={14} /> Logout
            </button>
          ) : (
            <Link to="/login" className="btn-overcome" style={{ fontSize: "0.8rem", padding: "0.4rem 1.2rem" }}>
              Log In
            </Link>
          )}
        </nav>
      </header>
      <main style={{ maxWidth: "85rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {children}
      </main>
    </div>
  );
}

/* -- Interactive Booking Modal -- */
function BookingModal({ doc, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("Tomorrow at 10:00 AM");
  const [notes, setNotes] = useState("Overcoming depression & anxiety");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !email) return setErr("Please enter your name and email.");
    setBusy(true);
    setErr("");
    try {
      const res = await api("/public/book-session", {
        method: "POST",
        body: { name, email, doctor_id: doc.id, date, notes }
      });
      setConfirmed(res);
      if (onSuccess) onSuccess(res);
    } catch (err) {
      setErr(err.message);
    }
    setBusy(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0, 5, 10, 0.85)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
    }}>
      <div className="mc-card-glow" style={{ maxWidth: "32rem", width: "100%", padding: "2rem", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "1.25rem", right: "1.25rem", color: "#a2c0cb" }}>
          <X size={20} />
        </button>

        {!confirmed ? (
          <form onSubmit={submit}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
              <img src={doc.avatar} alt={doc.name} style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "2px solid #00c0e8" }} />
              <div>
                <h3 className="font-orbitron" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f0fbff" }}>{doc.name}</h3>
                <p style={{ fontSize: "0.8rem", color: "#00c0e8" }}>{doc.specialty}</p>
                <span style={{ fontSize: "0.75rem", color: "#8a8a8a" }}>{doc.price}</span>
              </div>
            </div>

            <h4 className="font-orbitron" style={{ fontSize: "0.95rem", marginBottom: "1rem", color: "#e6faff" }}>
              Book Your Confidential Consultation
            </h4>

            {err && (
              <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", padding: "0.75rem", borderRadius: "0.5rem", color: "#fca5a5", fontSize: "0.85rem", marginBottom: "1rem" }}>
                {err}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#a2c0cb", display: "block", marginBottom: "0.3rem" }}>Your Full Name</label>
                <input className="mc-input" placeholder="e.g. Alex Morgan" value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "#a2c0cb", display: "block", marginBottom: "0.3rem" }}>Email Address (for calendar invite & link)</label>
                <input type="email" className="mc-input" placeholder="you@domain.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "#a2c0cb", display: "block", marginBottom: "0.3rem" }}>Preferred Time Slot</label>
                <select className="mc-input" value={date} onChange={e => setDate(e.target.value)}>
                  <option value="Tomorrow at 10:00 AM">Tomorrow at 10:00 AM (Virtual Room A)</option>
                  <option value="Tomorrow at 3:00 PM">Tomorrow at 3:00 PM (Virtual Room B)</option>
                  <option value="In 2 days at 11:30 AM">In 2 days at 11:30 AM (Virtual Room A)</option>
                  <option value="This Weekend at 2:00 PM">This Weekend at 2:00 PM (Flexible Slot)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "#a2c0cb", display: "block", marginBottom: "0.3rem" }}>Primary Focus or Symptoms</label>
                <input className="mc-input" placeholder="e.g. Dealing with anxiety, burnout, sleep disturbance" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <button type="submit" className="btn-overcome" style={{ width: "100%", marginTop: "0.5rem" }} disabled={busy}>
                {busy ? "Securing Slot..." : "CONFIRM FREE CONSULTATION"}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(0, 192, 232, 0.2)", border: "2px solid #00c0e8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
              <CheckCircle2 size={36} color="#00c0e8" />
            </div>
            <h3 className="font-orbitron text-gradient-cyan" style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
              SESSION CONFIRMED
            </h3>
            <p style={{ color: "#a2c0cb", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Your private video consultation has been reserved with {doc.name}.
            </p>
            <div style={{ background: "rgba(2, 44, 53, 0.8)", border: "1px solid rgba(0, 192, 232, 0.3)", borderRadius: "1rem", padding: "1rem", marginBottom: "1.5rem", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                <span style={{ color: "#8a8a8a" }}>Booking Code:</span>
                <span className="font-orbitron" style={{ color: "#00c0e8", fontWeight: 700 }}>{confirmed.booking_code}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                <span style={{ color: "#8a8a8a" }}>Scheduled Time:</span>
                <span style={{ color: "#f0fbff" }}>{confirmed.date}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span style={{ color: "#8a8a8a" }}>Client:</span>
                <span style={{ color: "#f0fbff" }}>{confirmed.name}</span>
              </div>
            </div>
            <button onClick={onClose} className="btn-overcome" style={{ width: "100%" }}>
              DONE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -- MindCare Behance-accurate Landing Page -- */
function Landing() {
  const [selectedTag, setSelectedTag] = useState("depression");
  const [activeServiceTab, setActiveServiceTab] = useState("Individual therapy");
  const [psychologists, setPsychologists] = useState([]);
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [assessmentMood, setAssessmentMood] = useState(null);

  // Live AI Preview state
  const [previewMsg, setPreviewMsg] = useState("");
  const [previewHistory, setPreviewHistory] = useState([
    { sender: "assistant", content: "Hello. I'm MindCare AI. Whatever is weighing on your mind today, you don't have to carry it by yourself. How are you feeling right now?" }
  ]);
  const [previewEmotion, setPreviewEmotion] = useState("neutral");
  const [previewConfidence, setPreviewConfidence] = useState(0.95);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewScrollRef = useRef(null);

  // User state
  const currentUser = getStoredUser();

  // Load psychologists from backend
  useEffect(() => {
    api("/public/psychologists")
      .then(d => setPsychologists(d.psychologists || []))
      .catch(() => {});
  }, []);

  // Smooth scroll container internally without moving whole browser window
  const scrollTerminal = () => {
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollTo({
        top: previewScrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollTerminal();
  }, [previewHistory, previewLoading]);

  // Send message in live AI preview
  const handlePreviewSend = async (customText) => {
    const textToSend = (typeof customText === "string" ? customText : previewMsg).trim();
    if (!textToSend || previewLoading) return;

    setPreviewMsg("");
    setPreviewLoading(true);

    const updatedHistory = [...previewHistory, { sender: "user", content: textToSend }];
    setPreviewHistory(updatedHistory);

    try {
      const res = await api("/public/ai-preview", {
        method: "POST",
        body: { message: textToSend, history: updatedHistory.slice(-6) }
      });

      if (res && res.response) {
        setPreviewHistory(prev => [...prev, { sender: "assistant", content: res.response }]);
        setPreviewEmotion(res.emotion || "neutral");
        setPreviewConfidence(Number(res.confidence) || 0.95);
      } else {
        throw new Error("No response");
      }
    } catch {
      setPreviewHistory(prev => [
        ...prev,
        { sender: "assistant", content: "I'm listening closely. Take a slow, calm breath with me. What is the main thought or challenge you'd like to work through right now?" }
      ]);
    }
    setPreviewLoading(false);
  };

  // Quick preset suggestions
  const presetPrompts = [
    "I feel overwhelmed by burnout and work pressure.",
    "My chest feels tight and anxiety won't stop.",
    "Feeling empty, lonely and disconnected from everything.",
    "Can you guide me through a 2-minute calming breath?"
  ];

  // Services definitions matching Behance design
  const servicesList = [
    {
      category: "Individual therapy",
      title: "One-on-One Clinical Psychotherapy",
      desc: "Private 50-minute virtual sessions with accredited Ph.D. psychologists specializing in overcoming acute depression, trauma recovery, and mood stabilization.",
      features: ["Confidential encrypted video", "Personalized treatment roadmap", "24/7 asynchronous doctor messaging"],
      badge: "Most Popular",
      duration: "50 min sessions",
      stat: "99.2% Positive Outcome"
    },
    {
      category: "Psychoeducation",
      title: "Neuroplasticity & CBT Rewiring",
      desc: "Structured cognitive behavioral courses and neuro-educational masterclasses designed to break depressive rumination and rewire self-critical thought loops.",
      features: ["Interactive cognitive reframing", "Neuro-educational guides", "Daily actionable mental drills"],
      badge: "Clinical Track",
      duration: "Self-Paced + Live Q&A",
      stat: "14 Practical Modules"
    },
    {
      category: "Couples",
      title: "Relational Dynamics & Couples Healing",
      desc: "Guided partner therapy focused on de-escalating conflict cycles, restoring emotional safety, and rebuilding intimate vulnerability.",
      features: ["Joint & individual check-ins", "Conflict de-escalation protocols", "Attachment style integration"],
      badge: "Couples Focus",
      duration: "60 min sessions",
      stat: "Over 2,400 Couples Aided"
    },
    {
      category: "AI 24/7 Companion",
      title: "Real-Time AI Emotional Support & Triage",
      desc: "State-of-the-art empathetic AI companion trained in clinical de-escalation, emotional sentiment tracking, and grounding exercises whenever panic strikes.",
      features: ["Instant sub-second response", "Emotion & distress sentiment scoring", "Emergency crisis detection"],
      badge: "Zero Wait Time",
      duration: "Always Active 24/7",
      stat: "50k+ Sessions Guided"
    },
    {
      category: "Crisis Support",
      title: "Rapid De-escalation & Somatic Stabilization",
      desc: "Immediate grounding exercises, panic relief breathing pacers, and instant linkage to human crisis coordinators and national emergency care.",
      features: ["One-tap emergency lifeline", "Somatic calming audio guides", "Direct supervisor escalation"],
      badge: "Critical Priority",
      duration: "Immediate Response",
      stat: "100% Free & Unrestricted"
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: "#020d14", color: "#f0fbff", overflowX: "hidden" }}>
      {/* Cybernetic Neural Backdrop */}
      <div className="neural-grid-bg" />

      {/* Top Behance-Style Navigation */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1.25rem 2.5rem", maxWidth: "85rem", margin: "0 auto",
        background: "rgba(2, 13, 20, 0.88)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0, 192, 232, 0.2)"
      }}>
        <Logo />

        {/* Pill Navigation Badges */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.85rem" }} className="hidden md:flex">
          <a href="#services" className="btn-pill-cyan">SERVICES</a>
          <a href="#who-we-are" className="btn-pill-cyan">ABOUT</a>
          <a href="#psychologists" className="btn-pill-cyan">PSYCHOLOGISTS</a>
          <a href="#reviews" className="btn-pill-cyan">REVIEWS</a>
          <a href="#ai-companion" className="btn-pill-cyan active">AI COMPANION</a>
        </nav>

        {/* Action CTAs */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {currentUser ? (
            <Link to="/dashboard" className="btn-pill-cyan" style={{ color: "#00c0e8", borderColor: "#00c0e8" }}>
              My Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn-pill-cyan" style={{ border: "none", color: "#a2c0cb" }}>
              Log in
            </Link>
          )}
          <Link to="/chat" className="btn-overcome" style={{ padding: "0.65rem 1.6rem", fontSize: "0.8rem" }}>
            OVERCOME
          </Link>
        </div>
      </header>

      {/* Hero Section: Three.js 3D Brain & Behance Masterpiece */}
      <section style={{ maxWidth: "85rem", margin: "0 auto", padding: "3rem 1.5rem 2rem", position: "relative" }}>
        
        {/* Top Floating Badge */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.6rem",
            background: "rgba(0, 192, 232, 0.12)", border: "1px solid #00c0e8",
            borderRadius: "9999px", padding: "0.45rem 1.4rem",
            boxShadow: "0 0 20px rgba(0, 192, 232, 0.35)"
          }}>
            <Zap size={14} color="#00c0e8" />
            <span className="font-orbitron" style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", color: "#e6faff" }}>
              HIGH QUALITY SERVICES · OVERCOME IT FOR FREE NOW!
            </span>
          </div>
        </div>

        {/* Main Headline */}
        <div style={{ textAlign: "center", maxWidth: "62rem", margin: "0 auto 2rem" }}>
          <h1 className="font-orbitron" style={{
            fontSize: "clamp(2.4rem, 6vw, 4.4rem)",
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "0.02em",
            marginBottom: "1.25rem"
          }}>
            <span style={{ color: "#ffffff", display: "block" }}>You don't need fight it alone...</span>
            <span className="text-gradient-cyan text-glow-cyan">
              Let's overcome depression together!
            </span>
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            color: "#a2c0cb",
            lineHeight: 1.7,
            maxWidth: "48rem",
            margin: "0 auto 2.25rem"
          }}>
            Online sessions with certified psychologists specializing in overcoming depression:
            <strong style={{ color: "#00c0e8" }}> safe, confidential, and effective</strong>. Supported 24/7 by our responsive 3D AI companion.
          </p>

          {/* Primary Action Buttons */}
          <div style={{ display: "flex", gap: "1.25rem", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            <Link to="/chat" className="btn-overcome" style={{ fontSize: "1.05rem", padding: "1.1rem 3rem" }}>
              OVERCOME NOW
              <ArrowRight size={20} />
            </Link>

            <a
              href="#ai-companion"
              onClick={(e) => {
                const el = document.getElementById("ai-companion");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="btn-outline-cyan"
              style={{ fontSize: "0.95rem", padding: "1rem 2.25rem" }}
            >
              <Brain size={18} />
              TEST 3D AI COMPANION
            </a>
          </div>
        </div>

        {/* 3D WebGL Neural Brain Experience */}
        <div style={{ position: "relative", margin: "1rem auto 2.5rem", maxWidth: "78rem" }}>
          <Brain3D
            activeTag={selectedTag}
            onTagClick={(tag) => {
              setSelectedTag(tag.id);
              if (tag.id === "depression") handlePreviewSend("I want to understand how to overcome this depression.");
              if (tag.id === "burnout") handlePreviewSend("I am experiencing severe emotional burnout and fatigue.");
              if (tag.id === "anxiety") handlePreviewSend("Can you help calm my panic and racing anxiety right now?");
              if (tag.id === "loneliness") handlePreviewSend("I feel profoundly lonely and isolated from the world.");
              const comp = document.getElementById("ai-companion");
              if (comp) comp.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        </div>

        {/* Quick Feeling Selector Bar (Direct Patient Touchpoint) */}
        <div className="mc-card" style={{ padding: "1.75rem 2rem", maxWidth: "64rem", margin: "0 auto", textAlign: "center" }}>
          <div className="font-orbitron" style={{ fontSize: "0.9rem", color: "#00c0e8", letterSpacing: "0.1em", marginBottom: "0.75rem", textTransform: "uppercase" }}>
            What are you fighting today? Select to begin tailored relief:
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { id: "depression", label: "Severe Depression", icon: "[Recovery]" },
              { id: "burnout", label: "Work & Life Burnout", icon: "[Recharge]" },
              { id: "anxiety", label: "Anxiety & Racing Thoughts", icon: "[Grounding]" },
              { id: "loneliness", label: "Deep Loneliness", icon: "[Connection]" },
              { id: "insomnia", label: "Sleep Deprivation", icon: "[Rest]" },
              { id: "apathy", label: "Apathy & Low Motivation", icon: "[Spark]" }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setAssessmentMood(item.id);
                  handlePreviewSend(`I'm currently dealing with ${item.label.toLowerCase()}. What is the first step?`);
                  const el = document.getElementById("ai-companion");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className={`mood-pill ${assessmentMood === item.id ? "active" : ""}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Metrics Row */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem", maxWidth: "64rem", margin: "2.5rem auto 0"
        }}>
          {[
            { label: "SESSIONS GUIDED", val: "15,000+", sub: "Clinical video & AI chats" },
            { label: "POSITIVE FEEDBACK", val: "98.9%", sub: "Verified patient satisfaction" },
            { label: "AI RESPONSE SPEED", val: "< 0.8s", sub: "24/7 instantaneous empathy" },
            { label: "CERTIFIED DOCTORS", val: "150+", sub: "Board-accredited specialists" }
          ].map((stat, i) => (
            <div key={i} className="mc-card" style={{ padding: "1.5rem", textAlign: "center" }}>
              <div className="font-orbitron text-gradient-cyan" style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.25rem" }}>
                {stat.val}
              </div>
              <div className="font-orbitron" style={{ fontSize: "0.75rem", letterSpacing: "0.08em", color: "#e6faff", marginBottom: "0.25rem" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#8a8a8a" }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* "Who We Are?" Section (Behance Section 7) */}
      <section id="who-we-are" style={{ maxWidth: "85rem", margin: "0 auto", padding: "6rem 1.5rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span className="font-orbitron text-glow-cyan" style={{ fontSize: "0.9rem", color: "#00c0e8", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            MISSION & CLINICAL EXCELLENCE
          </span>
          <h2 className="font-orbitron" style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", fontWeight: 900, marginTop: "0.5rem" }}>
            Who we are?
          </h2>
          <p style={{ color: "#a2c0cb", maxWidth: "46rem", margin: "1rem auto 0", fontSize: "1.1rem", lineHeight: 1.7 }}>
            "You don't need to fight it alone... Let's overcome depression, apathy, and burnout. Our qualified psychologists and AI will take care of this."
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem", alignItems: "stretch" }}>
          
          {/* Card 1: 3D Holographic Brain Motif */}
          <div className="mc-card-glow" style={{ padding: "2.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "inline-flex", padding: "0.75rem", borderRadius: "1rem", background: "rgba(0, 192, 232, 0.2)", marginBottom: "1.5rem" }}>
                <HeartPulse size={32} color="#00c0e8" />
              </div>
              <h3 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1rem", color: "#ffffff" }}>
                We care about your health mind.
              </h3>
              <p style={{ color: "#a2c0cb", lineHeight: 1.7, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
                Mental well-being is not a solitary uphill battle. MindCare fuses the emotional warmth of human psychologists with instant real-time AI cognitive support, giving you a safety net whenever depression or anxiety strikes.
              </p>
            </div>

            <div style={{ background: "rgba(2, 44, 53, 0.6)", padding: "1.25rem", borderRadius: "1rem", border: "1px solid rgba(0, 192, 232, 0.3)" }}>
              <div className="font-orbitron" style={{ fontSize: "0.8rem", color: "#00c0e8", marginBottom: "0.5rem" }}>
                CLINICAL CONFIDENTIALITY PROTOCOL
              </div>
              <p style={{ fontSize: "0.8rem", color: "#8a8a8a" }}>
                Zero telemetry selling. End-to-end encrypted session records. You retain full control over your conversation logs.
              </p>
            </div>
          </div>

          {/* Card 2: 3 Core Pillars */}
          <div className="mc-card" style={{ padding: "2.5rem" }}>
            <h3 className="font-orbitron" style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "1.5rem", color: "#ffffff" }}>
              How MindCare Protects You
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {[
                {
                  icon: <Brain size={22} color="#00c0e8" />,
                  title: "Neuroplastic Thought Reconstruction",
                  desc: "We don't just offer temporary platitudes. Our programs utilize proven CBT and neuroplasticity drills to interrupt recursive rumination."
                },
                {
                  icon: <Activity size={22} color="#00c0e8" />,
                  title: "Real-Time Emotion Tone Detection",
                  desc: "Our neural language model automatically computes confidence scores across 8 emotional states, tailoring empathy dynamically."
                },
                {
                  icon: <Shield size={22} color="#00c0e8" />,
                  title: "Crisis Safety & Rapid Escalation",
                  desc: "Automatic risk-level triage (Low, Medium, High). If self-harm indicators occur, emergency helpline resources activate instantly."
                }
              ].map((pillar, idx) => (
                <div key={idx} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div style={{ padding: "0.5rem", borderRadius: "0.75rem", background: "rgba(0, 192, 232, 0.15)", flexShrink: 0 }}>
                    {pillar.icon}
                  </div>
                  <div>
                    <h4 className="font-orbitron" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f0fbff", marginBottom: "0.25rem" }}>
                      {pillar.title}
                    </h4>
                    <p style={{ fontSize: "0.85rem", color: "#a2c0cb", lineHeight: 1.6 }}>
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section (Behance Section 6) */}
      <section id="services" style={{ maxWidth: "85rem", margin: "0 auto", padding: "5rem 1.5rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span className="font-orbitron text-glow-cyan" style={{ fontSize: "0.9rem", color: "#00c0e8", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            FOCUSED INTERVENTIONS
          </span>
          <h2 className="font-orbitron" style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", fontWeight: 900, marginTop: "0.5rem" }}>
            High Quality Services
          </h2>
          <p style={{ color: "#a2c0cb", maxWidth: "46rem", margin: "1rem auto 2rem", fontSize: "1.1rem" }}>
            Targeted care models built by clinicians to resolve depression, relationship strain, and burnout.
          </p>

          {/* Behance-Style Pill Selector */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "2.5rem" }}>
            {["Psychoeducation", "Couples", "Individual therapy", "AI 24/7 Companion", "Crisis Support"].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveServiceTab(cat)}
                className={`btn-pill-cyan ${activeServiceTab === cat ? "active" : ""}`}
                style={{ fontSize: "0.95rem", padding: "0.75rem 2rem" }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Service Spotlight Card */}
        {(() => {
          const activeService = servicesList.find(s => s.category === activeServiceTab) || servicesList[0];
          return (
            <div className="mc-card-glow" style={{ padding: "3rem 2.5rem", maxWidth: "68rem", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem", marginBottom: "1.5rem" }}>
                <div>
                  <span className="font-orbitron" style={{ fontSize: "0.8rem", color: "#00c0e8", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {activeService.badge} · {activeService.duration}
                  </span>
                  <h3 className="font-orbitron text-gradient-cyan" style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", fontWeight: 800, marginTop: "0.5rem" }}>
                    {activeService.title}
                  </h3>
                </div>

                <div className="font-orbitron" style={{ background: "rgba(0, 192, 232, 0.15)", border: "1px solid #00c0e8", padding: "0.5rem 1.25rem", borderRadius: "9999px", color: "#00c0e8", fontSize: "0.85rem", fontWeight: 700 }}>
                  {activeService.stat}
                </div>
              </div>

              <p style={{ color: "#e6faff", fontSize: "1.1rem", lineHeight: 1.8, marginBottom: "2rem" }}>
                {activeService.desc}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
                {activeService.features.map((feat, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(2, 44, 53, 0.5)", padding: "0.85rem 1.25rem", borderRadius: "1rem", border: "1px solid rgba(0, 192, 232, 0.2)" }}>
                    <CheckCircle2 size={18} color="#00c0e8" />
                    <span style={{ fontSize: "0.9rem", color: "#f0fbff" }}>{feat}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <a href="#psychologists" className="btn-overcome" style={{ padding: "0.85rem 2.25rem" }}>
                  MATCH WITH SPECIALIST
                </a>
                <Link to="/chat" className="btn-outline-cyan">
                  OPEN FULL AI COMPANION
                </Link>
              </div>
            </div>
          );
        })()}
      </section>

      {/* "Our Best Psychologists" Section (Behance Section 8) */}
      <section id="psychologists" style={{ maxWidth: "85rem", margin: "0 auto", padding: "5rem 1.5rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span className="font-orbitron text-glow-cyan" style={{ fontSize: "0.9rem", color: "#00c0e8", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            ACCREDITED CLINICAL BOARD
          </span>
          <h2 className="font-orbitron" style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", fontWeight: 900, marginTop: "0.5rem" }}>
            Our best psychologists
          </h2>
          <p style={{ color: "#a2c0cb", maxWidth: "46rem", margin: "1rem auto 0", fontSize: "1.1rem" }}>
            Compassionate, board-certified therapists specializing in clinical depression, PTSD, burnout, and acute anxiety.
          </p>
        </div>

        {/* Doctor Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
          {psychologists.map(doc => (
            <div key={doc.id} className="mc-card" style={{ padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                {/* Doctor Avatar */}
                <div style={{ position: "relative", marginBottom: "1.5rem", textAlign: "center" }}>
                  <img
                    src={doc.avatar}
                    alt={doc.name}
                    style={{
                      width: "120px", height: "120px", borderRadius: "50%",
                      objectFit: "cover", margin: "0 auto",
                      border: "3px solid #00c0e8",
                      boxShadow: "0 0 25px rgba(0, 192, 232, 0.45)"
                    }}
                  />
                  <span style={{
                    position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                    background: "#004452", border: "1px solid #00c0e8", borderRadius: "9999px",
                    padding: "0.2rem 0.8rem", fontSize: "0.7rem", fontWeight: 700, color: "#00c0e8",
                    fontFamily: "var(--font-display)"
                  }}>
                    {doc.badge}
                  </span>
                </div>

                <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                  <h3 className="font-orbitron" style={{ fontSize: "1.15rem", fontWeight: 800, color: "#ffffff", marginBottom: "0.25rem" }}>
                    {doc.name}
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "#00c0e8", fontWeight: 600, marginBottom: "0.5rem" }}>
                    {doc.title}
                  </p>
                  <p style={{ fontSize: "0.85rem", color: "#a2c0cb", lineHeight: 1.5, marginBottom: "1rem" }}>
                    {doc.specialty}
                  </p>
                </div>

                {/* Rating & Experience */}
                <div style={{ display: "flex", justifyContent: "space-around", background: "rgba(2, 44, 53, 0.5)", padding: "0.75rem", borderRadius: "0.75rem", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Star size={15} color="#fbbf24" fill="#fbbf24" />
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>{doc.rating}</span>
                    <span style={{ fontSize: "0.75rem", color: "#8a8a8a" }}>({doc.reviews_count})</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#8a8a8a" }}>
                    {doc.experience}
                  </div>
                </div>

                {/* Tags */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "1.5rem" }}>
                  {doc.focus.map(f => (
                    <span key={f} style={{ fontSize: "0.7rem", background: "rgba(0, 192, 232, 0.1)", border: "1px solid rgba(0, 192, 232, 0.25)", color: "#e6faff", padding: "0.2rem 0.6rem", borderRadius: "9999px" }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={() => setBookingDoctor(doc)}
                  className="btn-overcome"
                  style={{ width: "100%", padding: "0.8rem 1.5rem", fontSize: "0.8rem" }}
                >
                  BOOK FREE SESSION
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* "Client Reviews" Section (Behance Section 9 & 10 Exact Quotes) */}
      <section id="reviews" style={{ maxWidth: "85rem", margin: "0 auto", padding: "5rem 1.5rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span className="font-orbitron text-glow-cyan" style={{ fontSize: "0.9rem", color: "#00c0e8", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            REAL RECOVERIES
          </span>
          <h2 className="font-orbitron" style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", fontWeight: 900, marginTop: "0.5rem" }}>
            Patient Voices & Reviews
          </h2>
          <p style={{ color: "#a2c0cb", maxWidth: "46rem", margin: "1rem auto 0", fontSize: "1.1rem" }}>
            Real experiences from people who chose to speak up and overcome.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
          {/* Review Card 1 (Direct from Behance design) */}
          <div className="mc-card" style={{ padding: "2.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1.25rem" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} color="#00c0e8" fill="#00c0e8" />
                ))}
              </div>
              <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "#f0fbff", marginBottom: "1.5rem", fontStyle: "italic" }}>
                "The service genuinely helped me organize my thoughts and stabilize my mood. Sometimes the response felt a bit slow, but overall it was a solid and supportive experience."
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px solid rgba(0, 192, 232, 0.2)", paddingTop: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#0c7287", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#ffffff" }}>
                AM
              </div>
              <div>
                <div className="font-orbitron" style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f0fbff" }}>Alex M.</div>
                <div style={{ fontSize: "0.75rem", color: "#00c0e8" }}>Verified Client · Overcame Chronic Stress</div>
              </div>
            </div>
          </div>

          {/* Review Card 2 (Direct from Behance design) */}
          <div className="mc-card-glow" style={{ padding: "2.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1.25rem" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} color="#00c0e8" fill="#00c0e8" />
                ))}
              </div>
              <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "#f0fbff", marginBottom: "1.5rem", fontStyle: "italic" }}>
                "Not a magic cure, but surprisingly close: warm support, practical advice, no fluff. For the first time in a long while, it felt like depression was something I could actually move through, not just endure."
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px solid rgba(0, 192, 232, 0.3)", paddingTop: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#006e84", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#ffffff" }}>
                SK
              </div>
              <div>
                <div className="font-orbitron" style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f0fbff" }}>Sarah K.</div>
                <div style={{ fontSize: "0.75rem", color: "#00c0e8" }}>Verified Client · Individual Therapy Graduate</div>
              </div>
            </div>
          </div>

          {/* Review Card 3 */}
          <div className="mc-card" style={{ padding: "2.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1.25rem" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} color="#00c0e8" fill="#00c0e8" />
                ))}
              </div>
              <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "#f0fbff", marginBottom: "1.5rem", fontStyle: "italic" }}>
                "Having the AI companion available during 3:00 AM anxiety spikes, and then talking through root patterns with Dr. Vance the next week, completely reset my life."
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px solid rgba(0, 192, 232, 0.2)", paddingTop: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#024452", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#ffffff" }}>
                DR
              </div>
              <div>
                <div className="font-orbitron" style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f0fbff" }}>David R.</div>
                <div style={{ fontSize: "0.75rem", color: "#00c0e8" }}>Verified Client · Anxiety Program</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 3D AI Companion Terminal (Demo directly on page) */}
      <section id="ai-companion" style={{ maxWidth: "85rem", margin: "0 auto", padding: "5rem 1.5rem 6rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <span className="font-orbitron text-glow-cyan" style={{ fontSize: "0.9rem", color: "#00c0e8", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            ALWAYS ACTIVE · ZERO DELAY
          </span>
          <h2 className="font-orbitron" style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", fontWeight: 900, marginTop: "0.5rem" }}>
            Experience MindCare AI
          </h2>
          <p style={{ color: "#a2c0cb", maxWidth: "46rem", margin: "1rem auto 0", fontSize: "1.1rem" }}>
            Type below or select a prompt. Watch our neural companion respond with real-time sentiment awareness right on the screen.
          </p>
        </div>

        {/* Live Chat Terminal Box */}
        <div className="mc-card-glow" style={{ maxWidth: "60rem", margin: "0 auto", padding: "2rem", overflow: "hidden" }}>
          
          {/* Terminal Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0, 192, 232, 0.25)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="w-3 h-3 rounded-full bg-[#00c0e8] animate-ping" />
              <span className="font-orbitron" style={{ fontSize: "0.9rem", fontWeight: 800, letterSpacing: "0.08em", color: "#e6faff" }}>
                MINDCARE NEURAL COMPANION v2.4
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.75rem", background: "rgba(0, 192, 232, 0.15)", border: "1px solid #00c0e8", color: "#00c0e8", padding: "0.25rem 0.75rem", borderRadius: "9999px" }}>
                Tone: {String(previewEmotion || "neutral").toUpperCase()} · {Math.round((Number(previewConfidence) || 0.95) * 100)}% Confidence
              </span>
            </div>
          </div>

          {/* Messages Stream */}
          <div
            ref={previewScrollRef}
            style={{
              minHeight: "260px", maxHeight: "360px", overflowY: "auto",
              display: "flex", flexDirection: "column", gap: "1rem",
              marginBottom: "1.5rem", paddingRight: "0.5rem"
            }}
          >
            {previewHistory.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  background: m.sender === "user" ? "linear-gradient(135deg, #0c7287, #004452)" : "rgba(2, 44, 53, 0.8)",
                  border: `1px solid ${m.sender === "user" ? "#00c0e8" : "rgba(0, 192, 232, 0.3)"}`,
                  borderRadius: "1.25rem",
                  padding: "1rem 1.25rem",
                  boxShadow: m.sender === "user" ? "0 0 20px rgba(0, 192, 232, 0.3)" : "none"
                }}
              >
                <div style={{ fontSize: "0.75rem", color: m.sender === "user" ? "#00c0e8" : "#8a8a8a", marginBottom: "0.35rem", fontWeight: 600 }}>
                  {m.sender === "user" ? "YOU" : "MINDCARE AI"}
                </div>
                <p style={{ color: "#f0fbff", fontSize: "0.95rem", lineHeight: 1.6 }}>
                  {m.content}
                </p>
              </div>
            ))}
            {previewLoading && (
              <div style={{ alignSelf: "flex-start", background: "rgba(2, 44, 53, 0.8)", border: "1px solid rgba(0, 192, 232, 0.3)", borderRadius: "1.25rem", padding: "0.75rem 1.25rem" }}>
                <span className="font-orbitron" style={{ fontSize: "0.8rem", color: "#00c0e8" }}>
                  Generating compassionate response...
                </span>
              </div>
            )}
          </div>

          {/* Preset Prompts Chips */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {presetPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handlePreviewSend(p)}
                style={{
                  fontSize: "0.75rem", background: "rgba(2, 68, 82, 0.4)", border: "1px solid rgba(0, 192, 232, 0.25)",
                  color: "#a2c0cb", padding: "0.4rem 0.8rem", borderRadius: "9999px", transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#00c0e8"; e.currentTarget.style.color = "#ffffff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0, 192, 232, 0.25)"; e.currentTarget.style.color = "#a2c0cb"; }}
              >
                "{p}"
              </button>
            ))}
          </div>

          {/* Input & Send Bar (with e.preventDefault() to guarantee no page reload) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePreviewSend();
            }}
            style={{ display: "flex", gap: "0.75rem" }}
          >
            <input
              className="mc-input"
              placeholder="Tell me what you're feeling right now..."
              value={previewMsg}
              onChange={e => setPreviewMsg(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handlePreviewSend();
                }
              }}
            />
            <button
              type="submit"
              className="btn-overcome"
              style={{ padding: "0.85rem 1.75rem" }}
              disabled={previewLoading}
            >
              <Send size={18} />
            </button>
          </form>

          {/* Full Account Upgrade Prompt */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", borderTop: "1px solid rgba(0, 192, 232, 0.15)", paddingTop: "1rem", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#8a8a8a" }}>
              Want to save continuous history and access full dashboard sessions?
            </div>
            <Link to="/chat" className="btn-pill-cyan" style={{ fontSize: "0.8rem", padding: "0.45rem 1.25rem" }}>
              OPEN FULL AI CHAT <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(0, 192, 232, 0.2)", background: "#01090e", padding: "4rem 1.5rem 2rem" }}>
        <div style={{ maxWidth: "85rem", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "3rem", marginBottom: "3rem" }}>
          <div>
            <Logo />
            <p style={{ color: "#8a8a8a", fontSize: "0.85rem", lineHeight: 1.7, marginTop: "1rem" }}>
              Empowering mental clarity through state-of-the-art 3D AI companionship and accredited psychological care.
            </p>
          </div>

          <div>
            <h4 className="font-orbitron" style={{ fontSize: "0.9rem", color: "#00c0e8", marginBottom: "1rem" }}>SERVICES</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem", color: "#a2c0cb" }}>
              <li>Individual Therapy</li>
              <li>Psychoeducation & CBT</li>
              <li>Couples Counseling</li>
              <li>24/7 AI Triage Companion</li>
            </ul>
          </div>

          <div>
            <h4 className="font-orbitron" style={{ fontSize: "0.9rem", color: "#00c0e8", marginBottom: "1rem" }}>CRISIS HELPLINES</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem", color: "#a2c0cb" }}>
              <div>United States: <strong style={{ color: "#00c0e8" }}>988</strong></div>
              <div>United Kingdom: <strong style={{ color: "#00c0e8" }}>111</strong></div>
              <div>India: <strong style={{ color: "#00c0e8" }}>14416 (Tele-MANAS)</strong></div>
              <div>Emergency: <strong style={{ color: "#ef4444" }}>112 / 911</strong></div>
            </div>
          </div>

          <div>
            <h4 className="font-orbitron" style={{ fontSize: "0.9rem", color: "#00c0e8", marginBottom: "1rem" }}>OVERCOME IT NOW</h4>
            <Link to="/chat" className="btn-overcome" style={{ width: "100%", padding: "0.75rem", fontSize: "0.8rem" }}>
              LAUNCH INSTANT CHAT
            </Link>
          </div>
        </div>

        <div style={{ maxWidth: "85rem", margin: "0 auto", textAlign: "center", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "1.5rem" }}>
          <p style={{ fontSize: "0.75rem", color: "#565353", lineHeight: 1.6 }}>
            {DISCLAIMER}
          </p>
          <p style={{ fontSize: "0.75rem", color: "#565353", marginTop: "0.5rem" }}>
            (C) {new Date().getFullYear()} MindCare AI. All rights reserved. Built with 3D WebGL Neural Engine.
          </p>
        </div>
      </footer>

      {/* Booking Modal */}
      {bookingDoctor && (
        <BookingModal
          doc={bookingDoctor}
          onClose={() => setBookingDoctor(null)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}

/* -- Auth Page (Cyber Dark Theme) -- */
function AuthPage({ mode }) {
  const nav = useNavigate();
  const reg = mode === "register";
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", remember: true });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setErr("");
    if (reg && f.password !== f.confirm) return setErr("Passwords do not match.");
    setBusy(true);
    try {
      const d = await api(reg ? "/auth/register" : "/auth/login", { method: "POST", body: f });
      (f.remember ? localStorage : sessionStorage).setItem("token", d.token);
      setStoredUser(d.user);
      nav("/dashboard");
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const set = k => e => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div className="min-h-screen grid place-items-center" style={{ background: "#020d14", padding: "1.5rem", position: "relative" }}>
      <div className="neural-grid-bg" />
      <div className="mc-card-glow" style={{ width: "100%", maxWidth: "26rem", padding: "2.5rem 2rem" }}>
        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}><Logo /></div>
        <h2 className="font-orbitron text-gradient-cyan" style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem", textAlign: "center" }}>
          {reg ? "START YOUR RECOVERY" : "WELCOME BACK"}
        </h2>
        <p style={{ color: "#a2c0cb", fontSize: "0.85rem", textAlign: "center", marginBottom: "1.5rem" }}>
          {reg ? "Confidential access to 24/7 AI & clinical support" : "Enter your credentials to continue"}
        </p>

        {err && (
          <div role="alert" style={{ color: "#fca5a5", fontSize: "0.85rem", marginBottom: "1rem", padding: "0.75rem", background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", borderRadius: "0.5rem" }}>
            {err}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {reg && (
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#a2c0cb", marginBottom: "0.3rem" }}>
                Full Name
              </label>
              <input className="mc-input" value={f.name} onChange={set("name")} required placeholder="Jane Doe" />
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#a2c0cb", marginBottom: "0.3rem" }}>
              Email Address
            </label>
            <input type="email" className="mc-input" value={f.email} onChange={set("email")} required placeholder="you@example.com" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#a2c0cb", marginBottom: "0.3rem" }}>
              Password
            </label>
            <input type="password" className="mc-input" value={f.password} onChange={set("password")} required placeholder="Min. 8 characters" />
          </div>
          {reg && (
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#a2c0cb", marginBottom: "0.3rem" }}>
                Confirm Password
              </label>
              <input type="password" className="mc-input" value={f.confirm} onChange={set("confirm")} required placeholder="Repeat password" />
            </div>
          )}
          {!reg && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "#a2c0cb", cursor: "pointer" }}>
              <input type="checkbox" checked={f.remember} onChange={set("remember")} /> Keep session active
            </label>
          )}

          <button className="btn-overcome" style={{ width: "100%", marginTop: "0.5rem" }} disabled={busy}>
            {busy ? "AUTHENTICATING..." : reg ? "CREATE FREE ACCOUNT" : "ENTER MINDCARE"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.85rem", marginTop: "1.5rem", color: "#8a8a8a" }}>
          {reg ? (
            <>Already registered? <Link to="/login" style={{ color: "#00c0e8", fontWeight: 600 }}>Log In</Link></>
          ) : (
            <>Don't have an account? <Link to="/register" style={{ color: "#00c0e8", fontWeight: 600 }}>Create One</Link></>
          )}
        </p>
      </div>
    </div>
  );
}

/* -- Dashboard (Cyber Dark Theme) -- */
function Dashboard() {
  const user = useUser(true);
  const [d, setD] = useState(null);
  const [toast, say] = useToast();

  useEffect(() => {
    if (user) {
      api("/dashboard").then(setD).catch(() => {});
    }
  }, [user]);

  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const moods = [["great","[Great] Great"],["good","[Good] Good"],["okay","[Okay] Okay"],["low","[Low] Low"],["stressed","[Stressed] Stressed"]];
  
  const save = async m => {
    try { 
      await api("/moods", { method: "POST", body: { mood: m } }); 
      say("Mood recorded into neuro-balance timeline ✨"); 
    } catch (e) { say(e.message); }
  };

  return (
    <Shell user={user}>
      <div>
        <div style={{ marginBottom: "2rem" }}>
          <h1 className="font-orbitron text-gradient-cyan" style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            {greet}, {user?.name ? user.name.split(" ")[0] : "Friend"}
          </h1>
          <p style={{ color: "#a2c0cb", fontSize: "0.95rem" }}>Here is your real-time neuro-emotional wellness trajectory.</p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          {[
            [<BarChart2 size={24} color="#00c0e8" />, "CONVERSATIONS", d?.conversations ?? "-"],
            [<Clock size={24} color="#00c0e8" />, "MESSAGES THIS WEEK", d?.messages_week ?? "-"],
            [<Smile size={24} color="#00c0e8" />, "LAST RECORDED TONE", d?.recent_emotions?.length ? EMO[d.recent_emotions.at(-1)] : "-"]
          ].map(([icon, label, val], i) => (
            <div key={i} className="mc-card" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ background: "rgba(0, 192, 232, 0.15)", padding: "0.75rem", borderRadius: "1rem" }}>{icon}</div>
              <div>
                <p className="font-orbitron" style={{ fontSize: "0.75rem", color: "#8a8a8a", letterSpacing: "0.08em" }}>{label}</p>
                <p className="font-orbitron" style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f0fbff" }}>{val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mood Check-In Card */}
        <div className="mc-card" style={{ padding: "1.75rem 2rem", marginBottom: "2rem" }}>
          <h2 className="font-orbitron" style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "#f0fbff" }}>
            Log Today's Neural Energy State
          </h2>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {moods.map(([k, l]) => (
              <button key={k} onClick={() => save(k)} className="btn-pill-cyan" style={{ fontSize: "0.85rem" }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Emotion Trend Tracker */}
        <div className="mc-card" style={{ padding: "1.75rem 2rem", marginBottom: "2rem" }}>
          <h2 className="font-orbitron" style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem", color: "#f0fbff" }}>
            Recent Emotional Sequence <span style={{ fontSize: "0.75rem", color: "#00c0e8", fontWeight: 400 }}>(AI Analyzed)</span>
          </h2>
          <div style={{ display: "flex", gap: "1.25rem", fontSize: "2rem", alignItems: "center" }}>
            {d?.recent_emotions?.length
              ? d.recent_emotions.map((e, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <span title={e}>{EMO[e]}</span>
                    <div style={{ fontSize: "0.65rem", color: "#8a8a8a", textTransform: "capitalize" }}>{e}</div>
                  </div>
                ))
              : <span style={{ fontSize: "0.9rem", color: "#8a8a8a" }}>Start a conversation to visualize emotional trajectory.</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link to="/chat" className="btn-overcome">
            START NEW SESSION <ArrowRight size={18} />
          </Link>
          <Link to="/history" className="btn-outline-cyan">
            VIEW PAST CONVERSATIONS
          </Link>
        </div>
      </div>
      <Toast msg={toast} />
    </Shell>
  );
}

/* -- Chat Page (Rock-Solid: Never Disappears or Blanks Out) -- */
function Chat() {
  // Pass false to not forcefully redirect guests to login
  const user = useUser(false);
  const { id } = useParams();
  const nav = useNavigate();
  const [convs, setConvs] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(null);
  const [demo, setDemo] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const messagesScrollRef = useRef(null);
  const justCreatedIdRef = useRef(null);

  const loadConvs = () => {
    if (!getToken()) return;
    api("/conversations?q=" + encodeURIComponent(q))
      .then(d => setConvs(d.conversations || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadConvs();
  }, [user, q]);

  // Load conversation messages when id changes
  useEffect(() => {
    setHelp(null);
    if (id) {
      // If we just created this conversation, keep existing messages and don't wipe!
      if (justCreatedIdRef.current === String(id) && msgs.length > 0) {
        justCreatedIdRef.current = null;
        return;
      }
      if (getToken()) {
        api("/conversations/" + id)
          .then(d => {
            if (d && Array.isArray(d.messages)) setMsgs(d.messages);
          })
          .catch(e => setErr(e.message));
      }
    } else {
      // Starting fresh chat
      if (justCreatedIdRef.current === null) {
        setMsgs([]);
      }
    }
  }, [id]);

  // Internal smooth scrolling without moving the outer page
  useEffect(() => {
    if (messagesScrollRef.current) {
      messagesScrollRef.current.scrollTo({
        top: messagesScrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [msgs, busy]);

  const send = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;

    setText("");
    setErr("");
    setBusy(true);

    const tempMsg = { id: "tmp-" + Date.now(), sender: "user", content: t, timestamp: new Date().toISOString() };
    setMsgs(m => [...m, tempMsg]);

    try {
      const token = getToken();
      if (token) {
        // Authenticated chat
        const d = await api("/chat", {
          method: "POST",
          body: { message: t, conversation_id: id ? Number(id) : undefined }
        });

        setMsgs(m => [...m.filter(x => x.id !== tempMsg.id), d.user_message, d.ai_message]);
        setDemo(Boolean(d.demo_mode));
        setHelp(d.show_help_card ? d.emergency_info : null);

        if (!id && d.conversation_id) {
          justCreatedIdRef.current = String(d.conversation_id);
          nav("/chat/" + d.conversation_id, { replace: true });
        }
        loadConvs();
      } else {
        // Guest mode fallback: instant chat without any login requirement!
        const res = await api("/public/ai-preview", {
          method: "POST",
          body: { message: t, history: msgs.slice(-6).map(m => ({ sender: m.sender, content: m.content })) }
        });

        const aiMsg = {
          id: "guest-ai-" + Date.now(),
          sender: "ai",
          content: res.response || "I hear you. Let us take this one breath and step at a time.",
          emotion: res.emotion,
          confidence: res.confidence,
          risk_level: res.risk_level,
          timestamp: new Date().toISOString()
        };
        setMsgs(m => [...m.filter(x => x.id !== tempMsg.id), { ...tempMsg, id: "guest-user-" + Date.now() }, aiMsg]);
        setDemo(true);
        if (res.risk_level === "high") {
          setHelp("If you're in severe crisis or immediate danger, please reach out to emergency helplines: India 14416 / 112; US 988; UK 111.");
        }
      }
    } catch (e) {
      setErr(e.message);
      setMsgs(m => m.filter(x => x.id !== tempMsg.id));
      setText(t);
    }
    setBusy(false);
  };

  const del = async (cid, e) => {
    if (e) e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await api("/conversations/" + cid, { method: "DELETE" });
      loadConvs();
      if (String(cid) === String(id)) nav("/chat");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <Shell user={user}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 280px) 1fr", gap: "1.5rem", minHeight: "78vh" }}>
        {/* Sidebar */}
        <aside className="mc-card" style={{ display: "flex", flexDirection: "column", padding: "1.25rem" }}>
          <Link
            to="/chat"
            onClick={() => { setMsgs([]); setErr(""); }}
            className="btn-overcome"
            style={{ marginBottom: "1rem", padding: "0.75rem", fontSize: "0.8rem", width: "100%" }}
          >
            <Plus size={16} /> NEW CONVERSATION
          </Link>
          
          {getToken() ? (
            <>
              <input
                className="mc-input"
                style={{ marginBottom: "1rem", fontSize: "0.85rem", padding: "0.6rem 0.9rem" }}
                placeholder="Search history..."
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {convs.length === 0 && (
                  <p style={{ fontSize: "0.8rem", color: "#8a8a8a", textAlign: "center", marginTop: "1.5rem" }}>
                    No saved chats yet.
                  </p>
                )}
                {convs.map(c => (
                  <div
                    key={c.id}
                    onClick={() => nav("/chat/" + c.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.65rem 0.85rem", borderRadius: "0.75rem", cursor: "pointer",
                      background: String(c.id) === String(id) ? "rgba(0, 192, 232, 0.2)" : "rgba(2, 44, 53, 0.4)",
                      border: `1px solid ${String(c.id) === String(id) ? "#00c0e8" : "transparent"}`
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#f0fbff" }}>
                      {c.title}
                    </span>
                    <button onClick={(e) => del(c.id, e)} style={{ color: "#8a8a8a", padding: "0.2rem", background: "none", border: "none" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ background: "rgba(2, 44, 53, 0.5)", border: "1px solid rgba(0, 192, 232, 0.25)", borderRadius: "1rem", padding: "1.25rem", marginTop: "0.5rem" }}>
              <div className="font-orbitron" style={{ fontSize: "0.8rem", color: "#00c0e8", marginBottom: "0.5rem" }}>
                GUEST SESSION ACTIVE
              </div>
              <p style={{ fontSize: "0.8rem", color: "#8a8a8a", lineHeight: 1.6, marginBottom: "1rem" }}>
                You can chat freely right now! Create a free account anytime to store continuous conversation logs.
              </p>
              <Link to="/register" className="btn-pill-cyan" style={{ fontSize: "0.75rem", width: "100%", justifyContent: "center" }}>
                Save History (Sign Up)
              </Link>
            </div>
          )}
        </aside>

        {/* Chat Area */}
        <section className="mc-card" style={{ display: "flex", flexDirection: "column", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid rgba(0, 192, 232, 0.2)", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#00c0e8", boxShadow: "0 0 10px #00c0e8" }} />
              <span className="font-orbitron" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f0fbff" }}>
                MindCare AI Companion
              </span>
            </div>
            {demo && (
              <span style={{ fontSize: "0.75rem", color: "#00c0e8", background: "rgba(0, 192, 232, 0.15)", padding: "0.2rem 0.6rem", borderRadius: "9999px" }}>
                Neural Engine Online
              </span>
            )}
          </div>

          {/* Emergency Card if triggered */}
          {help && (
            <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1.5px solid #ef4444", borderRadius: "1rem", padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ef4444", fontWeight: 700, marginBottom: "0.5rem" }}>
                <ShieldAlert size={20} /> Immediate Support Needed
              </div>
              <p style={{ fontSize: "0.85rem", color: "#fca5a5", lineHeight: 1.6 }}>{help}</p>
            </div>
          )}

          {/* Messages */}
          <div
            ref={messagesScrollRef}
            style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", paddingRight: "0.5rem", marginBottom: "1rem", minHeight: "340px", maxHeight: "560px" }}
          >
            {msgs.length === 0 && (
              <div style={{ textAlign: "center", marginTop: "3rem", color: "#8a8a8a" }}>
                <Brain size={48} color="#00c0e8" style={{ margin: "0 auto 1rem", opacity: 0.7 }} />
                <h3 className="font-orbitron" style={{ color: "#f0fbff", marginBottom: "0.5rem" }}>MindCare AI is listening</h3>
                <p style={{ fontSize: "0.85rem", maxWidth: "26rem", margin: "0 auto", lineHeight: 1.6 }}>
                  Speak openly about what you are feeling. Whether it is depression, burnout, anxiety, or life stress, this space is safe and private.
                </p>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
                  {[
                    "I feel completely drained today.",
                    "Can we do a quick anxiety de-escalation?",
                    "I'm feeling stuck and discouraged."
                  ].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { setText(p); }}
                      style={{ fontSize: "0.75rem", background: "rgba(2, 68, 82, 0.4)", border: "1px solid rgba(0, 192, 232, 0.25)", color: "#a2c0cb", padding: "0.4rem 0.8rem", borderRadius: "9999px" }}
                    >
                      "{p}"
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div
                key={m.id || i}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "75%",
                  background: m.sender === "user" ? "linear-gradient(135deg, #0c7287, #004452)" : "rgba(2, 44, 53, 0.7)",
                  border: `1px solid ${m.sender === "user" ? "#00c0e8" : "rgba(0, 192, 232, 0.25)"}`,
                  borderRadius: "1.25rem",
                  padding: "0.9rem 1.25rem",
                  boxShadow: m.sender === "user" ? "0 0 15px rgba(0, 192, 232, 0.25)" : "none"
                }}
              >
                <div style={{ fontSize: "0.7rem", color: m.sender === "user" ? "#00c0e8" : "#8a8a8a", marginBottom: "0.25rem" }}>
                  {m.sender === "user" ? "YOU" : "MINDCARE AI"}
                  {m.emotion && <span style={{ marginLeft: "0.5rem" }}>· {EMO[m.emotion] || ""} {m.emotion}</span>}
                </div>
                <p style={{ color: "#f0fbff", fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</p>
              </div>
            ))}
            {busy && (
              <div style={{ alignSelf: "flex-start", background: "rgba(2, 44, 53, 0.7)", border: "1px solid rgba(0, 192, 232, 0.25)", borderRadius: "1.25rem", padding: "0.75rem 1.25rem" }}>
                <span className="font-orbitron" style={{ fontSize: "0.8rem", color: "#00c0e8" }}>
                  Processing empathetic response...
                </span>
              </div>
            )}
          </div>

          {err && <p style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{err}</p>}

          {/* Form Input Box with e.preventDefault() guaranteed */}
          <form onSubmit={send} style={{ display: "flex", gap: "0.75rem" }}>
            <input
              className="mc-input"
              placeholder="What thoughts are repeating right now?..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(e);
                }
              }}
            />
            <button type="submit" className="btn-overcome" style={{ padding: "0.85rem 1.75rem" }} disabled={busy}>
              <Send size={18} />
            </button>
          </form>
        </section>
      </div>
    </Shell>
  );
}

/* -- History Page -- */
function History() {
  const user = useUser(true);
  const [c, setC] = useState([]);
  const [q, setQ] = useState("");
  const load = () => {
    if (getToken()) {
      api("/conversations?q=" + encodeURIComponent(q))
        .then(d => setC(d.conversations || []))
        .catch(() => {});
    }
  };
  useEffect(() => { if (user) load(); }, [user, q]);
  if (!user) return null;

  return (
    <Shell user={user}>
      <h1 className="font-orbitron text-gradient-cyan" style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "1.25rem" }}>
        Conversation Archives
      </h1>
      <input className="mc-input" style={{ marginBottom: "1.5rem", maxWidth: "26rem" }} placeholder="Search conversation records..." value={q} onChange={e => setQ(e.target.value)} />
      {c.length === 0 && <p style={{ color: "#8a8a8a" }}>No conversations found.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {c.map(x => (
          <div key={x.id} className="mc-card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link to={"/chat/" + x.id} style={{ flex: 1 }}>
              <b style={{ color: "#f0fbff", display: "block", fontSize: "1.05rem" }}>{x.title}</b>
              <span style={{ fontSize: "0.8rem", color: "#8a8a8a" }}>{new Date(x.updated_at).toLocaleString()}</span>
            </Link>
            <button
              onClick={async () => { if (confirm("Delete this conversation?")) { await api("/conversations/" + x.id, { method: "DELETE" }); load(); } }}
              style={{ color: "#8a8a8a", padding: "0.5rem" }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </Shell>
  );
}

/* -- Profile Page -- */
function Profile() {
  const user = useUser(true);
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [toast, say] = useToast();
  useEffect(() => { if (user) setName(user.name); }, [user]);
  if (!user) return null;

  const save = async () => {
    try {
      const res = await api("/profile", { method: "PUT", body: { name, password: pw || undefined } });
      setStoredUser({ ...user, name });
      setPw("");
      say("Profile updated successfully ✨");
    } catch (e) { say(e.message); }
  };

  return (
    <Shell user={user}>
      <div className="mc-card" style={{ maxWidth: "28rem", padding: "2rem" }}>
        <h1 className="font-orbitron" style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <User size={22} color="#00c0e8" /> Account Profile
        </h1>
        <p style={{ fontSize: "0.85rem", color: "#8a8a8a", marginBottom: "1.5rem" }}>{user.email}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#a2c0cb", marginBottom: "0.3rem" }}>Display Name</label>
            <input className="mc-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#a2c0cb", marginBottom: "0.3rem" }}>New Password (Optional)</label>
            <input type="password" className="mc-input" value={pw} onChange={e => setPw(e.target.value)} placeholder="Min. 8 characters" />
          </div>
          <button onClick={save} className="btn-overcome" style={{ marginTop: "0.5rem" }}>
            SAVE PROFILE CHANGES
          </button>
        </div>
      </div>
      <Toast msg={toast} />
    </Shell>
  );
}

/* -- Safety Page -- */
function Safety() {
  const user = useUser(false);

  return (
    <Shell user={user}>
      <div className="mc-card-glow" style={{ maxWidth: "48rem", padding: "2.5rem" }}>
        <h1 className="font-orbitron" style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ShieldAlert size={28} color="#00c0e8" /> Clinical Safety & Urgent Help
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <p style={{ color: "#a2c0cb", lineHeight: 1.7 }}>
            {DISCLAIMER} MindCare AI is engineered to give continuous empathetic emotional support, but cannot provide acute emergency medical triage.
          </p>

          <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1.5px solid #ef4444", borderRadius: "1rem", padding: "1.5rem" }}>
            <h3 className="font-orbitron" style={{ color: "#ef4444", fontWeight: 800, marginBottom: "0.5rem" }}>
              CRISIS / EMERGENCY SUPPORT DIRECTORY
            </h3>
            <p style={{ color: "#fca5a5", lineHeight: 1.7 }}>
              If you or someone you know is considering self-harm or experiencing an acute psychiatric emergency, please connect immediately with human emergency professionals:
            </p>
            <ul style={{ marginTop: "0.75rem", listStyle: "inside", color: "#ffffff", lineHeight: 1.8 }}>
              <li><strong>India:</strong> Call <strong>112</strong> (National Emergency) or <strong>14416</strong> (Tele-MANAS free 24/7).</li>
              <li><strong>United States:</strong> Call or text <strong>988</strong> (Suicide & Crisis Lifeline).</li>
              <li><strong>United Kingdom:</strong> Call <strong>111</strong> or <strong>999</strong>.</li>
              <li><strong>International:</strong> Reach your nearest medical emergency room or local crisis hotline.</li>
            </ul>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* -- Admin Page -- */
function Admin() {
  const user = useUser(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  const load = () => {
    api("/admin/stats").then(setStats).catch(() => {});
    api("/admin/users?q=" + encodeURIComponent(q)).then(d => setUsers(d.users || [])).catch(() => {});
  };

  useEffect(() => { if (user?.role === "admin") load(); }, [user, q]);
  if (!user || user.role !== "admin") return null;

  return (
    <Shell user={user}>
      <h1 className="font-orbitron text-gradient-cyan" style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "1.5rem" }}>
        Platform Administration & Telemetry
      </h1>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
          {[
            ["TOTAL USERS", stats.total_users],
            ["TOTAL CONVERSATIONS", stats.total_conversations],
            ["MESSAGES TODAY", stats.messages_today],
            ["ACTIVE (7 DAYS)", stats.active_users],
            ["AVG MSGS / CHAT", stats.avg_messages_per_conversation]
          ].map(([k, v], i) => (
            <div key={i} className="mc-card" style={{ padding: "1.25rem" }}>
              <div className="font-orbitron" style={{ fontSize: "0.75rem", color: "#8a8a8a", letterSpacing: "0.08em" }}>{k}</div>
              <div className="font-orbitron text-gradient-cyan" style={{ fontSize: "1.75rem", fontWeight: 800 }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mc-card" style={{ padding: "1.75rem" }}>
        <h2 className="font-orbitron" style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>Registered Accounts</h2>
        <input className="mc-input" style={{ marginBottom: "1rem", maxWidth: "24rem" }} placeholder="Search user name or email..." value={q} onChange={e => setQ(e.target.value)} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", textAlign: "left", fontSize: "0.85rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0, 192, 232, 0.2)", color: "#00c0e8" }}>
                <th style={{ padding: "0.75rem" }}>ID</th>
                <th style={{ padding: "0.75rem" }}>Name</th>
                <th style={{ padding: "0.75rem" }}>Email</th>
                <th style={{ padding: "0.75rem" }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.75rem", color: "#8a8a8a" }}>{u.id}</td>
                  <td style={{ padding: "0.75rem", color: "#f0fbff", fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: "0.75rem", color: "#a2c0cb" }}>{u.email}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <span style={{ background: u.role === "admin" ? "rgba(0, 192, 232, 0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${u.role === "admin" ? "#00c0e8" : "rgba(255,255,255,0.1)"}`, padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem" }}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

/* -- Not Found -- */
function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center text-center" style={{ background: "#020d14", padding: "1.5rem" }}>
      <div className="mc-card-glow" style={{ padding: "3rem", maxWidth: "28rem" }}>
        <h1 className="font-orbitron text-gradient-cyan" style={{ fontSize: "3rem", fontWeight: 900, marginBottom: "0.5rem" }}>404</h1>
        <p style={{ color: "#a2c0cb", marginBottom: "1.5rem" }}>The requested neural pathway does not exist.</p>
        <Link to="/" className="btn-overcome">RETURN TO SAFE GROUND</Link>
      </div>
    </div>
  );
}

/* -- Main App Component with Clean Routing -- */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/chat/:id" element={<Chat />} />
      <Route path="/history" element={<History />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/safety" element={<Safety />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
