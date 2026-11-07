import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Shirt, Layers, Sparkles, LogOut, User, Camera, Plus, Menu, X
} from "lucide-react";
import { useAuthStore } from "../store/store";

const NAV_ITEMS = [
  { to: "/wardrobe", icon: Shirt, label: "Wardrobe" },
  { to: "/add", icon: Camera, label: "Camera", isAction: true },
  { to: "/outfits", icon: Layers, label: "Outfits" },
  { to: "/ai", icon: Sparkles, label: "AI Stylist" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate("/login");
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: isDesktop ? "row" : "column",
      minHeight: "100dvh",
      backgroundColor: "#0C0D0E",
      color: "#F4F5F7",
      width: "100%",
      position: "relative",
    }}>
      {/* ─── Mobile Top Header ────────────────────────────────────────────── */}
      {!isDesktop && (
        <header
          style={{
            height: "56px",
            paddingLeft: "16px",
            paddingRight: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#0C0D0E",
            borderBottom: "1px solid #1E2027",
            position: "sticky",
            top: 0,
            zIndex: 30,
            width: "100%",
          }}
        >
          {/* Logo */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
            onClick={() => {
              navigate("/wardrobe");
              setMobileMenuOpen(false);
            }}
          >
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              backgroundColor: "#16171B",
              border: "1px solid #262933",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F2EEE9",
            }}>
              <Shirt size={16} strokeWidth={1.8} />
            </div>
            <span style={{ fontSize: "15px", fontWeight: "700", letterSpacing: "-0.02em", color: "#F4F5F7" }}>
              Wardrobe AI
            </span>
          </div>

          {/* Right actions: Menu toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {user?.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.name}
                style={{ width: "26px", height: "26px", borderRadius: "50%", border: "1px solid #282B34" }}
              />
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: "#15161A",
                border: "1px solid #23262D",
                borderRadius: "8px",
                color: "#A0A5B1",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </header>
      )}

      {/* ─── Mobile Slide-out Menu Drawer (Closes on option selection) ──── */}
      {!isDesktop && mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 45,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: "280px",
              backgroundColor: "#111215",
              borderRight: "1px solid #23262D",
              display: "flex",
              flexDirection: "column",
              padding: "20px 16px",
              zIndex: 50,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Brand */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "#181A20",
                  border: "1px solid #282B34",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#F2EEE9",
                }}>
                  <Shirt size={16} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#F4F5F7" }}>Wardrobe AI</div>
                  <div style={{ fontSize: "10px", color: "#6A707E", letterSpacing: "0.06em", textTransform: "uppercase" }}>Navigation</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{ background: "transparent", border: "none", color: "#8E94A0", padding: "4px", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav list - each clicks and immediately closes drawer */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
              {[
                { to: "/wardrobe", icon: Shirt, label: "Wardrobe Index" },
                { to: "/add", icon: Camera, label: "Camera Scanner" },
                { to: "/outfits", icon: Layers, label: "Outfit Playlists" },
                { to: "/ai", icon: Sparkles, label: "AI Stylist" },
              ].map(({ to, icon: Icon, label }) => {
                const isActive = location.pathname === to;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      fontSize: "13.5px",
                      fontWeight: isActive ? "600" : "500",
                      textDecoration: "none",
                      backgroundColor: isActive ? "#181A20" : "transparent",
                      color: isActive ? "#F4F5F7" : "#838996",
                      border: isActive ? "1px solid #282B35" : "1px solid transparent",
                    }}
                  >
                    <Icon size={18} style={{ color: isActive ? "#F2EEE9" : "#6E7482" }} />
                    <span>{label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User Session Footer */}
            {user && (
              <div style={{ borderTop: "1px solid #1F2128", paddingTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "#181A20",
                    border: "1px solid #282B34",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9AA0AD",
                  }}>
                    <User size={14} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: "12.5px", fontWeight: "600", color: "#E5E8EE", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.name}
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#646A77", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#F87171",
                    backgroundColor: "#201313",
                    border: "1px solid #3F1D1D",
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Desktop Sidebar (Only rendered on desktop screens >= 768px) ─── */}
      {isDesktop && (
        <aside
          style={{
            width: "240px",
            position: "sticky",
            top: 0,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            padding: "24px 16px",
            backgroundColor: "#0F1013",
            borderRight: "1px solid #1F2128",
            flexShrink: 0,
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 8px", marginBottom: "32px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#181A1F",
              border: "1px solid #282B34",
              color: "#F2EEE9",
            }}>
              <Shirt size={18} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", letterSpacing: "-0.02em", color: "#F4F5F7" }}>
                Wardrobe AI
              </div>
              <div style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6A707E" }}>
                Studio Edition
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
            {[
              { to: "/wardrobe", icon: Shirt, label: "Wardrobe" },
              { to: "/add", icon: Camera, label: "Camera" },
              { to: "/outfits", icon: Layers, label: "Outfits" },
              { to: "/ai", icon: Sparkles, label: "AI Stylist" },
            ].map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "11px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: isActive ? "600" : "500",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  backgroundColor: isActive ? "#181A20" : "transparent",
                  color: isActive ? "#F4F5F7" : "#838996",
                  border: isActive ? "1px solid #272B35" : "1px solid transparent",
                })}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} strokeWidth={isActive ? 2 : 1.7} style={{ color: isActive ? "#F2EEE9" : "#6E7482" }} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User Section */}
          {user && (
            <div style={{ borderTop: "1px solid #1F2128", paddingTop: "16px", marginTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 8px 12px 8px" }}>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #282B34" }}
                    alt={user.name}
                  />
                ) : (
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "#181A1F",
                    border: "1px solid #282B34",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9AA0AD",
                  }}>
                    <User size={14} />
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "12.5px", fontWeight: "600", color: "#E5E8EE", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.name}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: "#646A77", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: "500",
                  color: "#7E8592",
                  backgroundColor: "transparent",
                  border: "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </aside>
      )}

      {/* ─── Main Viewport (Takes full 100% width on mobile) ─────────────── */}
      <main style={{
        flex: 1,
        width: "100%",
        minWidth: 0,
        paddingBottom: isDesktop ? "0" : "calc(72px + env(safe-area-inset-bottom, 12px))",
      }}>
        {children}
      </main>

      {/* ─── Mobile Bottom Navigation Bar ─────────────────────────────────── */}
      {!isDesktop && (
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#0D0E11",
            borderTop: "1px solid #1E2027",
            zIndex: 40,
            paddingBottom: "calc(6px + env(safe-area-inset-bottom, 6px))",
            paddingTop: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
            {NAV_ITEMS.map(({ to, icon: Icon, label, isAction }) => {
              const isActive = location.pathname === to;
              if (isAction) {
                return (
                  <NavLink
                    key={to}
                    to={to}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                      position: "relative",
                      marginTop: "-16px",
                    }}
                  >
                    <div style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: "#F2EEE9",
                      color: "#0C0D0E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.6)",
                      border: "3px solid #0D0E11",
                    }}>
                      <Camera size={21} strokeWidth={2.2} />
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: "600", color: "#E5E8EE", marginTop: "2px" }}>
                      {label}
                    </span>
                  </NavLink>
                );
              }

              return (
                <NavLink
                  key={to}
                  to={to}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px 0",
                    textDecoration: "none",
                    minHeight: "44px",
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    backgroundColor: isActive ? "#1C1E24" : "transparent",
                  }}>
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.7}
                      style={{ color: isActive ? "#F2EEE9" : "#6E7482" }}
                    />
                  </div>
                  <span style={{
                    fontSize: "10.5px",
                    fontWeight: isActive ? "600" : "500",
                    color: isActive ? "#F2EEE9" : "#6E7482",
                    marginTop: "1px",
                  }}>
                    {label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
