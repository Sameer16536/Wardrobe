import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  me: () => api.get("/auth/me"),
  loginUrl: () => `${API_BASE}/auth/login`,
};

// ─── Clothes ──────────────────────────────────────────────────────────────────
export const clothesApi = {
  getAll: (params = {}) => api.get("/clothes/", { params }),
  getById: (id) => api.get(`/clothes/${id}`),
  add: (formData) =>
    api.post("/clothes/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, data) => api.patch(`/clothes/${id}`, data),
  delete: (id) => api.delete(`/clothes/${id}`),
  retag: (id) => api.post(`/clothes/${id}/retag`),
};

// ─── Outfits ──────────────────────────────────────────────────────────────────
export const outfitsApi = {
  getAll: () => api.get("/outfits/"),
  getById: (id) => api.get(`/outfits/${id}`),
  create: (data) => api.post("/outfits/", data),
  update: (id, data) => api.patch(`/outfits/${id}`, data),
  delete: (id) => api.delete(`/outfits/${id}`),
};

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiApi = {
  suggest: (data) => api.post("/ai/suggest", data),
  chat: (data) => api.post("/ai/chat", data),
  surprise: () => api.get("/ai/surprise"),
  fitCheck: (formData) =>
    api.post("/ai/fit-check", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export default api;
