import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Wardrobe from "./pages/Wardrobe";
import AddClothing from "./pages/AddClothing";
import Outfits from "./pages/Outfits";
import AIStylist from "./pages/AIStylist";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#18181B",
            color: "#FAFAFA",
            border: "1px solid #27272A",
            borderRadius: "12px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#8B5CF6", secondary: "#FAFAFA" } },
          error: { iconTheme: { primary: "#F43F5E", secondary: "#FAFAFA" } },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected routes */}
        <Route path="/" element={<Navigate to="/wardrobe" replace />} />
        <Route
          path="/wardrobe"
          element={
            <ProtectedRoute>
              <Layout><Wardrobe /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/add"
          element={
            <ProtectedRoute>
              <Layout><AddClothing /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/outfits"
          element={
            <ProtectedRoute>
              <Layout><Outfits /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <Layout><AIStylist /></Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
