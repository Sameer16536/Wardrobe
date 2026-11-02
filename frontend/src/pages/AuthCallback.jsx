import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/store";
import { Shirt } from "lucide-react";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, fetchUser } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setToken(token);
      fetchUser().then(() => navigate("/wardrobe", { replace: true }));
    } else {
      navigate("/login", { replace: true });
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "14px",
      backgroundColor: "#0C0D0E",
      color: "#F4F5F7",
    }}>
      <div style={{
        width: "52px",
        height: "52px",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#15161A",
        border: "1px solid #23262D",
        color: "#F2EEE9",
      }}>
        <Shirt size={24} strokeWidth={1.8} />
      </div>
      <p style={{ color: "#747A87", fontSize: "13.5px", letterSpacing: "0.01em" }}>Signing you in...</p>
    </div>
  );
}
