import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/store";
import { Shirt } from "lucide-react";

export default function ProtectedRoute({ children }) {
  const { token, user, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    if (token && !user) fetchUser();
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;

  if (isLoading || (token && !user)) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        backgroundColor: "#0C0D0E",
        color: "#F4F5F7",
      }}>
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#15161A",
          border: "1px solid #23262D",
          color: "#F2EEE9",
        }}>
          <Shirt size={22} strokeWidth={1.8} />
        </div>
        <p style={{ color: "#747A87", fontSize: "13px", letterSpacing: "0.02em" }}>Loading session...</p>
      </div>
    );
  }

  return children;
}
