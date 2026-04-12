"use client";

import { useState, useCallback } from "react";

/* ─── SVG helpers ─── */
const IconMail = () => (
  <svg className="ii" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
    <path d="M1.5 5.5l6.5 4.5 6.5-4.5" />
  </svg>
);
const IconLock = () => (
  <svg className="ii" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2.5" y="7" width="11" height="7.5" rx="1.5" />
    <path d="M5 7V5.5a3 3 0 016 0V7" />
  </svg>
);
const IconUser = () => (
  <svg className="ii" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="5.5" r="3" />
    <path d="M2 14.5c0-3.3 2.7-6 6-6s6 2.7 6 6" />
  </svg>
);
const IconPhone = () => (
  <svg className="ii" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="4.5" y="1" width="7" height="14" rx="2" />
    <circle cx="8" cy="12" r=".8" fill="currentColor" />
  </svg>
);
const IconPin = () => (
  <svg className="ii" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.5-2-4.5-4.5-4.5z" />
    <circle cx="8" cy="6" r="1.5" />
  </svg>
);
const IconCard = () => (
  <svg className="ii" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
    <path d="M4 7h3M4 9.5h5" />
    <circle cx="11.5" cy="8" r="1.5" />
  </svg>
);
const IconAddr = () => (
  <svg className="ii" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <path d="M2 6h12" />
  </svg>
);
const IconChevron = () => (
  <svg style={{ position: "absolute", right: 13, pointerEvents: "none" }} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#b0c4b8" strokeWidth="1.6">
    <polyline points="2 4 6 8 10 4" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 10 8" fill="none" stroke="#fff" strokeWidth="1.8">
    <polyline points="1 4 3.5 6.5 9 1" />
  </svg>
);
const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
    <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);

const LogoFallback = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
    <rect width="72" height="72" rx="16" fill="#E8F8F2" />
    <path d="M36 8C24 8 14 18 14 30c0 15 14 30 22 34 8-4 22-19 22-34C58 18 48 8 36 8z" fill="#1D9E75" />
    <circle cx="36" cy="27" r="9" fill="white" fillOpacity="0.85" />
    <line x1="36" y1="34" x2="36" y2="60" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.4" />
    <line x1="24" y1="45" x2="36" y2="34" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
    <line x1="48" y1="45" x2="36" y2="34" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
  </svg>
);

/* ─── Reusable field wrapper ─── */
function Field({ label, hint, error, children }) {
  return (
    <div className="fld">
      <div className="frow">
        <span className="flbl">{label}</span>
        {hint && <span className="fhint">{hint}</span>}
      </div>
      {children}
      {error && <div className={`errmsg ${error ? "show" : ""}`}>{error}</div>}
    </div>
  );
}

/* ─── Password strength ─── */
function strengthInfo(v) {
  let sc = 0;
  if (v.length >= 8) sc++;
  if (/[A-Z]/.test(v)) sc++;
  if (/[0-9]/.test(v)) sc++;
  if (/[^A-Za-z0-9]/.test(v)) sc++;
  const pal = ["#e8ede9", "#e0605e", "#e0605e", "#d4a017", "#1D9E75"];
  const lbl = ["", "Weak — add uppercase & numbers", "Fair — add a symbol", "Strong", "Very strong"];
  const col = sc <= 1 ? "#b33" : sc === 2 ? "#854F0B" : "#0a6637";
  return { sc, color: pal[sc], label: v.length > 0 ? lbl[sc] : "", labelColor: col };
}

const DISTRICTS = [
  "Ampara","Anuradhapura","Badulla","Batticaloa","Colombo","Galle","Gampaha",
  "Hambantota","Jaffna","Kalutara","Kandy","Kegalle","Kilinochchi","Kurunegala",
  "Mannar","Matale","Matara","Monaragala","Mullaitivu","Negombo","Nuwara Eliya",
  "Polonnaruwa","Puttalam","Ratnapura","Trincomalee","Vavuniya",
];

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function AgroNexaAuth() {
  const [tab, setTab] = useState("login");

  // login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginPwVisible, setLoginPwVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loginEmailErr, setLoginEmailErr] = useState("");

  // register state
  const [role, setRole] = useState("farmer");
  const [regEmail, setRegEmail] = useState("");
  const [regEmailErr, setRegEmailErr] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPhoneErr, setRegPhoneErr] = useState("");
  const [regPw, setRegPw] = useState("");
  const [regPwVisible, setRegPwVisible] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [logoErr, setLogoErr] = useState(false);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleLoginEmail = (v) => {
    setLoginEmail(v);
    if (v.length > 0 && !validateEmail(v)) setLoginEmailErr("Please enter a valid email address.");
    else setLoginEmailErr("");
  };
  const handleRegEmail = (v) => {
    setRegEmail(v);
    if (v.length > 0 && !validateEmail(v)) setRegEmailErr("Please enter a valid email address.");
    else setRegEmailErr("");
  };
  const handleRegPhone = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 10);
    setRegPhone(digits);
    if (digits.length > 0 && digits.length !== 10) setRegPhoneErr("Enter a valid 10-digit Sri Lankan number.");
    else setRegPhoneErr("");
  };

  const strength = strengthInfo(regPw);

  const emailInputClass = (val, err) => {
    if (!val) return "inp";
    return err ? "inp no" : "inp ok";
  };

  return (
    <>
      {/* ─── Global styles (mirrors original CSS exactly) ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{
          --g950:#021a0e;--g900:#032d18;--g800:#064a27;--g700:#0a6637;--g600:#0d7d43;
          --g500:#1D9E75;--g400:#3dba90;--g300:#6fd4b0;--g200:#a8e8d2;--g100:#d4f4ea;--g50:#edfaf5;
          --cream:#f7f4ee;--warm:#fdfcf9;
          --td:#0f1a12;--tm:#3a5240;--ts:#6b8c74;
          --bl:rgba(29,158,117,0.15);--bm:rgba(29,158,117,0.28);
          --s1:0 2px 8px rgba(2,26,14,0.06);--s2:0 8px 32px rgba(2,26,14,0.12);--s3:0 20px 64px rgba(2,26,14,0.18);
          --tr:all 0.22s cubic-bezier(0.4,0,0.2,1);
        }
        html,body{font-family:'Outfit',sans-serif;font-size:15px;line-height:1.6;color:var(--td);min-height:100vh;background:var(--cream);}
        .shell{display:flex;flex-direction:column;width:100%;min-height:100vh;overflow:hidden;animation:rise .5s cubic-bezier(.22,1,.36,1) both;}
        @keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .lp{width:100%;background:var(--g950);display:flex;flex-direction:column;position:relative;overflow:hidden;}
        .lp-bg{position:absolute;inset:0;pointer-events:none;}
        .lp-stripe{position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--g500) 40%,var(--g400) 60%,transparent);}
        .lp-glow1{position:absolute;top:-120px;right:-80px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(29,158,117,.18) 0%,transparent 68%);}
        .lp-glow2{position:absolute;bottom:-100px;left:-60px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(61,186,144,.10) 0%,transparent 68%);}
        .lp-grid{position:absolute;inset:0;opacity:.028;background-image:linear-gradient(rgba(29,158,117,1) 1px,transparent 1px),linear-gradient(90deg,rgba(29,158,117,1) 1px,transparent 1px);background-size:38px 38px;}
        .lp-logo{padding:28px 20px 18px;display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;z-index:1;}
        .logo-ring{width:100px;height:100px;border-radius:22px;background:rgba(255,255,255,.97);display:flex;align-items:center;justify-content:center;margin-bottom:12px;box-shadow:0 0 0 1px rgba(29,158,117,.22),0 4px 8px rgba(0,0,0,.15),0 16px 40px rgba(0,0,0,.30);overflow:hidden;position:relative;flex-shrink:0;}
        .logo-ring img{width:100%;height:100%;object-fit:contain;padding:6px;display:block;transform:scale(1.6);}
        .lp-name{font-family:'DM Serif Display',serif;font-size:1.25rem;color:#fff;letter-spacing:-.3px;margin-bottom:6px;}
        .lp-pill{font-size:9px;letter-spacing:2.2px;text-transform:uppercase;color:var(--g400);background:rgba(29,158,117,.11);border:.5px solid rgba(29,158,117,.26);border-radius:20px;padding:4px 12px;display:inline-block;}
        .lp-header-row{display:flex;align-items:center;gap:14px;padding:20px 20px 16px;position:relative;z-index:1;}
        .lp-header-row .logo-ring{margin-bottom:0;width:72px;height:72px;border-radius:18px;}
        .lp-header-text .lp-name{font-size:1.1rem;margin-bottom:3px;}
        .lp-sep{height:1px;margin:0 20px;background:linear-gradient(90deg,transparent,rgba(29,158,117,.22),transparent);position:relative;z-index:1;}
        .lp-body{padding:14px 20px 0;position:relative;z-index:1;}
        .lp-h{font-family:'DM Serif Display',serif;font-size:1.2rem;color:#fff;line-height:1.25;letter-spacing:-.4px;margin-bottom:6px;}
        .lp-h em{color:var(--g300);font-style:italic;}
        .lp-p{font-size:12px;color:rgba(111,212,176,.78);line-height:1.65;margin-bottom:14px;}
        .feats{display:flex;flex-direction:column;gap:0;}
        .feat{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:.5px solid rgba(29,158,117,.09);}
        .feat:last-child{border-bottom:none;}
        .ficon{width:28px;height:28px;border-radius:8px;background:rgba(29,158,117,.12);border:.5px solid rgba(29,158,117,.20);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .ftxt strong{display:block;font-size:11.5px;font-weight:600;color:#ddf0e8;margin-bottom:1px;}
        .ftxt span{font-size:10.5px;color:rgba(111,212,176,.68);line-height:1.5;}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 0;}
        .scard{background:rgba(29,158,117,.08);border:.5px solid rgba(29,158,117,.15);border-radius:10px;padding:10px 6px;text-align:center;}
        .snum{font-family:'DM Serif Display',serif;font-size:17px;color:#fff;line-height:1;}
        .slbl{font-size:9px;color:var(--g400);letter-spacing:.3px;margin-top:3px;text-transform:uppercase;}
        .lp-foot{padding:14px 20px 18px;position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;margin-top:6px;}
        .fcopy{font-size:10px;color:rgba(111,212,176,.32);}
        .fbadge{background:rgba(29,158,117,.10);border:.5px solid rgba(29,158,117,.18);border-radius:20px;padding:4px 10px;font-size:9px;color:var(--g400);letter-spacing:.8px;text-transform:uppercase;}
        .rp{flex:1;background:var(--warm);display:flex;flex-direction:column;}
        .fw{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px 32px;}
        .fi{width:100%;max-width:420px;}
        .tabs{display:flex;background:var(--g50);border:.5px solid var(--bl);border-radius:11px;padding:4px;gap:4px;margin-bottom:28px;}
        .tab{flex:1;height:40px;border:none;border-radius:8px;font-family:'Outfit',sans-serif;font-size:13.5px;font-weight:500;cursor:pointer;background:transparent;color:var(--ts);transition:var(--tr);}
        .tab.on{background:#fff;color:var(--g800);font-weight:600;box-shadow:var(--s1);border:.5px solid var(--bl);}
        .ftitle{font-family:'DM Serif Display',serif;font-size:1.5rem;color:#0f1a12;letter-spacing:-.4px;margin-bottom:4px;}
        .fsub{font-size:13px;color:var(--ts);margin-bottom:22px;line-height:1.6;}
        .fld{margin-bottom:13px;}
        .frow{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}
        .flbl{font-size:10.5px;font-weight:600;color:var(--tm);letter-spacing:.7px;text-transform:uppercase;}
        .fhint{font-size:11.5px;color:var(--g600);cursor:pointer;font-weight:500;transition:var(--tr);}
        .fhint:hover{color:var(--g800);}
        .iw{position:relative;display:flex;align-items:center;}
        .ii{position:absolute;left:13px;width:15px;height:15px;color:#b0c4b8;pointer-events:none;flex-shrink:0;}
        .inp{width:100%;height:46px;padding:0 44px;border:1.5px solid #e4ede8;border-radius:11px;font-family:'Outfit',sans-serif;font-size:14px;color:var(--td);background:#fff;outline:none;transition:var(--tr);}
        .inp::placeholder{color:#b8ccc0;}
        .inp:hover{border-color:#c0d8cc;}
        .inp:focus{border-color:var(--g500);box-shadow:0 0 0 4px rgba(29,158,117,.10);}
        .inp.ok{border-color:var(--g400);}
        .inp.no{border-color:#e0605e;}
        .itr{position:absolute;right:13px;background:none;border:none;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;color:var(--ts);cursor:pointer;transition:var(--tr);padding:4px;}
        .itr:hover{color:var(--g700);}
        .errmsg{font-size:11.5px;color:#b33;margin-top:5px;display:none;padding:6px 10px;background:#fef2f2;border-radius:7px;border-left:2.5px solid #e0605e;}
        .errmsg.show{display:block;animation:shake .3s ease;}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
        .metarow{display:flex;align-items:center;margin-bottom:18px;}
        .ckwrap{display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;}
        .cb{width:17px;height:17px;border:1.5px solid #d0ddd6;border-radius:5px;background:#fff;display:flex;align-items:center;justify-content:center;transition:var(--tr);flex-shrink:0;}
        .cb.on{background:var(--g500);border-color:var(--g500);}
        .cb svg{display:none;width:10px;height:10px;}
        .cb.on svg{display:block;}
        .cblbl{font-size:12.5px;color:var(--ts);}
        .sbar{display:flex;gap:5px;margin-top:8px;}
        .ss{height:3px;flex:1;border-radius:2px;background:#e8ede9;transition:background .25s;}
        .slbl2{font-size:11px;margin-top:5px;color:var(--ts);}
        .btnp{width:100%;height:48px;background:var(--g700);border:none;border-radius:11px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:var(--tr);}
        .btnp:hover{background:var(--g800);}
        .btnp:active{transform:scale(.985);}
        .arr{transition:transform .2s;display:inline-block;}
        .btnp:hover .arr{transform:translateX(3px);}
        .sep{display:flex;align-items:center;gap:12px;margin:14px 0;font-size:12px;color:#c0cec4;}
        .sepl{flex:1;height:1px;background:#edf0ec;}
        .btng{width:100%;height:44px;background:#fff;border:1.5px solid #e4ede8;border-radius:11px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;color:var(--tm);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:var(--tr);}
        .btng:hover{background:var(--g50);border-color:#c8dcce;}
        .bcta{text-align:center;margin-top:16px;font-size:12.5px;color:var(--ts);}
        .blink{color:var(--g600);font-weight:600;cursor:pointer;background:none;border:none;font-family:'Outfit',sans-serif;font-size:12.5px;transition:var(--tr);}
        .blink:hover{color:var(--g800);}
        .rgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
        .rcard{border:1.5px solid #e4ede8;border-radius:11px;padding:12px 10px;text-align:center;cursor:pointer;background:#fff;transition:var(--tr);}
        .rcard:hover{border-color:var(--g400);background:var(--g50);}
        .rcard.sel{border-color:var(--g500);background:var(--g50);}
        .ricon{width:34px;height:34px;border-radius:10px;background:#f0f4f2;display:flex;align-items:center;justify-content:center;margin:0 auto 7px;transition:var(--tr);}
        .rcard.sel .ricon{background:var(--g200);}
        .rlbl{font-size:12px;font-weight:500;color:var(--ts);}
        .rcard.sel .rlbl{color:var(--g800);font-weight:600;}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .trow{display:flex;align-items:flex-start;gap:9px;margin-bottom:14px;}
        .ttxt{font-size:12px;color:var(--ts);line-height:1.65;}
        .tlink{color:var(--g600);cursor:pointer;font-weight:500;}
        .isel{width:100%;height:46px;padding:0 44px 0 44px;border:1.5px solid #e4ede8;border-radius:11px;font-family:'Outfit',sans-serif;font-size:14px;color:var(--td);background:#fff;outline:none;transition:var(--tr);appearance:none;cursor:pointer;}
        .isel:focus{border-color:var(--g500);box-shadow:0 0 0 4px rgba(29,158,117,.10);}
        @media (min-width:720px){
          body{align-items:center;min-height:100vh;padding:20px;}
          .shell{flex-direction:row;min-height:auto;max-width:960px;border-radius:22px;box-shadow:var(--s3);}
          .lp{width:360px;flex-shrink:0;}
          .lp-header-row{display:none!important;}
          .lp-logo{display:flex!important;padding:36px 32px 20px;}
          .logo-ring{width:124px;height:124px;border-radius:28px;}
          .lp-name{font-size:1.4rem;}
          .lp-sep{margin:0 32px;}
          .lp-body{padding:20px 32px 0;}
          .lp-h{font-size:1.5rem;}
          .lp-p{font-size:12.5px;}
          .lp-foot{padding:14px 32px 24px;}
          .fw{padding:40px 48px;}
        }
        @media (max-width:719px){
          .lp-logo{display:none!important;}
          .lp-sep.first{display:none!important;}
          .lp-body{padding:12px 16px 0;}
          .lp-h{font-size:1.1rem;}
          .feats .ftxt span{display:none;}
          .lp-sep{margin:0 16px;}
          .lp-foot{padding:12px 16px 16px;}
          .lp-header-row{padding:18px 16px 14px;}
          .fw{padding:20px 16px 28px;}
          .ftitle{font-size:1.35rem;}
          .two{grid-template-columns:1fr;}
        }
        @media (max-width:360px){
          .rgrid{grid-template-columns:1fr;}
          .two{grid-template-columns:1fr;}
        }
      `}</style>

      <div className="shell">
        {/* ═══ LEFT PANEL ═══ */}
        <div className="lp">
          <div className="lp-bg">
            <div className="lp-stripe" />
            <div className="lp-glow1" />
            <div className="lp-glow2" />
            <div className="lp-grid" />
          </div>

          {/* Mobile compact header */}
          <div className="lp-header-row">
            <div className="logo-ring">
              {logoErr ? <LogoFallback /> : (
                <img src="/images/logo.png" alt="AgroNexa LK" onError={() => setLogoErr(true)} />
              )}
            </div>
            <div className="lp-header-text">
              <div className="lp-name">AgroNexa LK</div>
              <div className="lp-pill">Agriculture · Tech · Innovation</div>
            </div>
          </div>

          {/* Desktop full logo */}
          <div className="lp-logo">
            <div className="logo-ring">
              {logoErr ? <LogoFallback /> : (
                <img src="/images/logo.png" alt="AgroNexa LK" onError={() => setLogoErr(true)} />
              )}
            </div>
            <div className="lp-name">AgroNexa LK</div>
            <div className="lp-pill">Agriculture · Technology · Innovation</div>
          </div>

          <div className="lp-sep first" />

          <div className="lp-body">
            <div className="lp-h">Smart Farming,<br /><em>Direct Connections</em></div>
            <p className="lp-p">Sri Lanka's modern agri-marketplace — connecting farmers directly to buyers with full transparency.</p>

            <div className="feats">
              <div className="feat">
                <div className="ficon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#5DCAA5" strokeWidth="1.4">
                    <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.5-2-4.5-4.5-4.5z" />
                    <circle cx="8" cy="6" r="1.5" />
                  </svg>
                </div>
                <div className="ftxt">
                  <strong>Direct Marketplace</strong>
                  <span>Sell your harvest without middlemen — better prices, faster deals.</span>
                </div>
              </div>
              <div className="feat">
                <div className="ficon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#5DCAA5" strokeWidth="1.4">
                    <rect x="2" y="4" width="12" height="9" rx="1.5" />
                    <path d="M2 7h12" />
                    <circle cx="5.5" cy="10.5" r="1" fill="#5DCAA5" />
                    <circle cx="8" cy="10.5" r="1" fill="#5DCAA5" />
                  </svg>
                </div>
                <div className="ftxt">
                  <strong>Blockchain-Verified Records</strong>
                  <span>Immutable history that builds lasting buyer trust.</span>
                </div>
              </div>
              <div className="feat">
                <div className="ficon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#5DCAA5" strokeWidth="1.4">
                    <rect x="4" y="1" width="8" height="14" rx="2" />
                    <circle cx="8" cy="12" r=".8" fill="#5DCAA5" />
                    <path d="M6 4h4M6 6.5h4" />
                  </svg>
                </div>
                <div className="ftxt">
                  <strong>Real-Time SMS Alerts</strong>
                  <span>Stay updated on offers and orders — even offline.</span>
                </div>
              </div>
            </div>

            <div className="stats">
              <div className="scard"><div className="snum">12K+</div><div className="slbl">Farmers</div></div>
              <div className="scard"><div className="snum">25</div><div className="slbl">Districts</div></div>
              <div className="scard"><div className="snum">98%</div><div className="slbl">Uptime</div></div>
            </div>
          </div>

          <div className="lp-foot">
            <span className="fcopy">© 2026 AgroNexa LK</span>
            <div className="fbadge">Trusted Platform</div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div className="rp">
          <div className="fw">
            <div className="fi">
              {/* Tabs */}
              <div className="tabs">
                <button className={`tab${tab === "login" ? " on" : ""}`} onClick={() => setTab("login")}>Sign in</button>
                <button className={`tab${tab === "register" ? " on" : ""}`} onClick={() => { setTab("register"); setRole("farmer"); }}>Create account</button>
              </div>

              {/* ── LOGIN ── */}
              {tab === "login" && (
                <div>
                  <div className="ftitle">Welcome back</div>
                  <div className="fsub">Sign in to your AgroNexa LK account</div>

                  <div className="fld">
                    <div className="frow"><span className="flbl">Email</span></div>
                    <div className="iw">
                      <IconMail />
                      <input
                        className={emailInputClass(loginEmail, loginEmailErr)}
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => handleLoginEmail(e.target.value)}
                      />
                    </div>
                    <div className={`errmsg${loginEmailErr ? " show" : ""}`}>Please enter a valid email address.</div>
                  </div>

                  <div className="fld">
                    <div className="frow">
                      <span className="flbl">Password</span>
                      <span className="fhint">Forgot password?</span>
                    </div>
                    <div className="iw">
                      <IconLock />
                      <input
                        className="inp"
                        type={loginPwVisible ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPw}
                        onChange={(e) => setLoginPw(e.target.value)}
                      />
                      <button className="itr" type="button" onClick={() => setLoginPwVisible(!loginPwVisible)}>
                        {loginPwVisible ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="metarow">
                    <div className="ckwrap" onClick={() => setRemember(!remember)}>
                      <div className={`cb${remember ? " on" : ""}`}><IconCheck /></div>
                      <span className="cblbl">Remember me for 30 days</span>
                    </div>
                  </div>

                  <button className="btnp" type="button">
                    Sign in to AgroNexa &nbsp;<span className="arr">→</span>
                  </button>
                  <div className="sep"><div className="sepl" /><span>or continue with</span><div className="sepl" /></div>
                  <button className="btng" type="button"><IconGoogle /> Continue with Google</button>
                  <div className="bcta">
                    New to AgroNexa?{" "}
                    <button className="blink" onClick={() => { setTab("register"); setRole("farmer"); }}>Create a free account</button>
                  </div>
                </div>
              )}

              {/* ── REGISTER ── */}
              {tab === "register" && (
                <div>
                  <div className="ftitle">Join AgroNexa LK</div>
                  <div className="fsub">Free to join — choose your role to get started</div>

                  {/* Role cards */}
                  <div className="rgrid">
                    <div className={`rcard${role === "farmer" ? " sel" : ""}`} onClick={() => setRole("farmer")}>
                      <div className="ricon">
                        <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke={role === "farmer" ? "#0a6637" : "#6b8c74"} strokeWidth="1.4">
                          <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.5-2-4.5-4.5-4.5z" />
                          <circle cx="8" cy="6" r="1.5" />
                        </svg>
                      </div>
                      <div className="rlbl">Farmer / Seller</div>
                    </div>
                    <div className={`rcard${role === "buyer" ? " sel" : ""}`} onClick={() => setRole("buyer")}>
                      <div className="ricon">
                        <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke={role === "buyer" ? "#0a6637" : "#6b8c74"} strokeWidth="1.4">
                          <circle cx="8" cy="5.5" r="3" />
                          <path d="M2 14.5c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                        </svg>
                      </div>
                      <div className="rlbl">Buyer</div>
                    </div>
                  </div>

                  {/* Name row */}
                  <div className="two">
                    <div className="fld">
                      <div className="frow"><span className="flbl">First name</span></div>
                      <div className="iw">
                        <IconUser />
                        <input className="inp" type="text" placeholder="Rashminda" />
                      </div>
                    </div>
                    <div className="fld">
                      <div className="frow"><span className="flbl">Last name</span></div>
                      <div className="iw">
                        <IconUser />
                        <input className="inp" type="text" placeholder="Aluvihare" />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="fld">
                    <div className="frow"><span className="flbl">Email address</span></div>
                    <div className="iw">
                      <IconMail />
                      <input
                        className={emailInputClass(regEmail, regEmailErr)}
                        type="email"
                        placeholder="you@example.com"
                        value={regEmail}
                        onChange={(e) => handleRegEmail(e.target.value)}
                      />
                    </div>
                    <div className={`errmsg${regEmailErr ? " show" : ""}`}>Please enter a valid email address.</div>
                  </div>

                  {/* Phone */}
                  <div className="fld">
                    <div className="frow"><span className="flbl">Phone (SMS alerts)</span></div>
                    <div className="iw">
                      <IconPhone />
                      <input
                        className={regPhone.length > 0 ? `inp ${regPhone.length === 10 ? "ok" : "no"}` : "inp"}
                        type="tel"
                        placeholder="07X XXX XXXX"
                        value={regPhone}
                        onChange={(e) => handleRegPhone(e.target.value)}
                        maxLength={10}
                      />
                    </div>
                    <div className={`errmsg${regPhoneErr ? " show" : ""}`}>Enter a valid 10-digit Sri Lankan number.</div>
                  </div>

                  {/* District */}
                  <div className="fld">
                    <div className="frow"><span className="flbl">District</span></div>
                    <div className="iw">
                      <IconPin />
                      <select className="isel" defaultValue="">
                        <option value="" disabled>Select your district</option>
                        {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                      </select>
                      <IconChevron />
                    </div>
                  </div>

                  {/* Role-specific extra fields */}
                  <div className="fld">
                    <div className="frow"><span className="flbl">Address</span></div>
                    <div className="iw">
                      <IconAddr />
                      <input className="inp" type="text" placeholder="123 Main Road, Village, Sri Lanka" />
                    </div>
                  </div>
                  <div className="fld">
                    <div className="frow"><span className="flbl">NIC Number</span></div>
                    <div className="iw">
                      <IconCard />
                      <input className="inp" type="text" placeholder="198512345678 or 851234567V" maxLength={12} />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="fld">
                    <div className="frow"><span className="flbl">Password</span></div>
                    <div className="iw">
                      <IconLock />
                      <input
                        className="inp"
                        type={regPwVisible ? "text" : "password"}
                        placeholder="Minimum 8 characters"
                        value={regPw}
                        onChange={(e) => setRegPw(e.target.value)}
                      />
                      <button className="itr" type="button" onClick={() => setRegPwVisible(!regPwVisible)}>
                        {regPwVisible ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="sbar">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="ss" style={{ background: i <= strength.sc ? strength.color : "#e8ede9" }} />
                      ))}
                    </div>
                    {regPw.length > 0 && (
                      <div className="slbl2" style={{ color: strength.labelColor }}>{strength.label}</div>
                    )}
                  </div>

                  {/* Terms */}
                  <div className="trow">
                    <div className={`cb${agreed ? " on" : ""}`} onClick={() => setAgreed(!agreed)} style={{ marginTop: 3, flexShrink: 0, cursor: "pointer" }}>
                      <IconCheck />
                    </div>
                    <div className="ttxt">
                      I agree to AgroNexa LK's{" "}
                      <span className="tlink">Terms of Service</span> and{" "}
                      <span className="tlink">Privacy Policy</span>
                    </div>
                  </div>

                  <button className="btnp" type="button">
                    Create my account &nbsp;<span className="arr">→</span>
                  </button>
                  <div className="bcta">
                    Already have an account?{" "}
                    <button className="blink" onClick={() => setTab("login")}>Sign in</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
