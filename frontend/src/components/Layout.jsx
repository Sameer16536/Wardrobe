import { NavLink, useNavigate } from "react-router-dom";
import { Shirt, Layers, Sparkles, LogOut, User } from "lucide-react";
import { useAuthStore } from "../store/store";

const NAV_ITEMS = [
  { to: "/wardrobe", icon: Shirt, label: "Wardrobe" },
  { to: "/outfits", icon: Layers, label: "Outfits" },
  { to: "/ai", icon: Sparkles, label: "AI Stylist" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0C0D0E", color: "#F4F5F7" }}>
      {/* Sidebar — desktop */}
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
        }}
        className="hidden md:flex"
      >
        {/* Brand / Logo */}
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

        {/* Navigation */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
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

        {/* User Session Footer */}
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
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#E5E8EE";
                e.currentTarget.style.backgroundColor = "#181A1F";
                e.currentTarget.style.borderColor = "#262933";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#7E8592";
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main viewport */}
      <main style={{ flex: 1, minWidth: 0, paddingBottom: "80px" }}>
        {children}
      </main>

      {/* Bottom Nav — mobile */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#0F1013",
          borderTop: "1px solid #1F2128",
          zIndex: 40,
        }}
        className="md:hidden"
      >
        <div style={{ display: "flex" }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                padding: "10px 0",
                fontSize: "11px",
                fontWeight: isActive ? "600" : "500",
                textDecoration: "none",
                color: isActive ? "#F4F5F7" : "#6E7482",
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2 : 1.7} style={{ color: isActive ? "#F2EEE9" : "#6E7482" }} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
