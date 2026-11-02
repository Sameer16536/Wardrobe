import { motion } from "framer-motion";
import { Sparkles, Camera, Layers, Shirt, ArrowRight, ShieldCheck } from "lucide-react";
import { authApi } from "../api/client";

export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = authApi.loginUrl();
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0C0D0E",
      color: "#F4F5F7",
      padding: "24px",
      position: "relative",
    }}>
      {/* Subtle architectural hairline border grid / frame */}
      <div style={{
        position: "absolute",
        inset: "20px",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        pointerEvents: "none",
        borderRadius: "16px",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: "440px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Main Card */}
        <div style={{
          backgroundColor: "#15161A",
          border: "1px solid #23262D",
          borderRadius: "16px",
          padding: "40px 32px",
          boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.45)",
        }}>
          {/* Header & Emblem */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              backgroundColor: "#1C1E23",
              border: "1px solid #2A2E37",
              marginBottom: "20px",
              color: "#F2EEE9",
            }}>
              <Shirt size={26} strokeWidth={1.8} />
            </div>

            <div style={{
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#8E94A0",
              fontWeight: 600,
              marginBottom: "8px",
            }}>
              Personal Wardrobe Intelligence
            </div>

            <h1 style={{
              fontSize: "30px",
              fontWeight: "600",
              letterSpacing: "-0.03em",
              color: "#F4F5F7",
              margin: "0 0 8px 0",
            }}>
              Wardrobe AI
            </h1>

            <p style={{
              fontSize: "14px",
              color: "#8E94A0",
              margin: 0,
              lineHeight: 1.5,
            }}>
              Catalog your garments, orchestrate outfit combos, and style with precision.
            </p>
          </div>

          {/* Value Highlights */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "10px",
            marginBottom: "32px",
          }}>
            {[
              {
                icon: Camera,
                title: "Camera Capture",
                desc: "Instant garment digitization & smart metadata extraction",
              },
              {
                icon: Layers,
                title: "Outfit Playlists",
                desc: "Curate modular collections like favorite playlists",
              },
              {
                icon: Sparkles,
                title: "AI Stylist",
                desc: "Context-aware combinations tuned for weather & occasion",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  backgroundColor: "#111215",
                  border: "1px solid #1F2128",
                }}
              >
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "#181A1F",
                  border: "1px solid #252831",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#D0D4DC",
                  flexShrink: 0,
                }}>
                  <Icon size={17} strokeWidth={1.75} />
                </div>
                <div style={{ minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#E4E7ED" }}>
                    {title}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#747A87", lineHeight: 1.3 }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action CTA */}
          <div>
            <motion.button
              onClick={handleGoogleLogin}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              id="google-login-btn"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "13px 20px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                backgroundColor: "#F2EEE9",
                color: "#0C0D0E",
                border: "1px solid #F2EEE9",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
              <ArrowRight size={15} style={{ marginLeft: "4px", color: "#555A64" }} />
            </motion.button>

            {/* Dev Mode Quick Access */}
            <button
              onClick={() => { window.location.href = "http://localhost:8000/auth/dev-login"; }}
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: "500",
                color: "#838996",
                backgroundColor: "transparent",
                border: "1px dashed #282C35",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#F4F5F7";
                e.currentTarget.style.borderColor = "#444A56";
                e.currentTarget.style.backgroundColor = "#181A20";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#838996";
                e.currentTarget.style.borderColor = "#282C35";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              id="dev-demo-btn"
            >
              Demo Preview Mode (Skip OAuth)
            </button>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            marginTop: "18px",
            fontSize: "12px",
            color: "#646A77",
          }}>
            <ShieldCheck size={14} color="#7E8592" />
            <span>Private & secure session authentication</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
