import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "../api/client";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      setToken: (token) => {
        localStorage.setItem("access_token", token);
        set({ token });
      },

      fetchUser: async () => {
        try {
          set({ isLoading: true });
          const res = await authApi.me();
          set({ user: res.data, isLoading: false });
        } catch {
          set({ user: null, token: null, isLoading: false });
          localStorage.removeItem("access_token");
        }
      },

      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null });
      },

      isAuthenticated: () => !!get().token && !!get().user,
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export const useWardrobeStore = create((set, get) => ({
  items: [],
  isLoading: false,
  filters: { category: null, season: null, occasion: null },

  setItems: (items) => set({ items }),
  setLoading: (isLoading) => set({ isLoading }),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  clearFilters: () => set({ filters: { category: null, season: null, occasion: null } }),

  addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),

  filteredItems: () => {
    const { items, filters } = get();
    return items.filter((item) => {
      if (filters.category && item.category !== filters.category) return false;
      if (filters.season && !item.seasons?.includes(filters.season)) return false;
      if (filters.occasion && !item.occasions?.includes(filters.occasion)) return false;
      return true;
    });
  },
}));

export const useOutfitStore = create((set) => ({
  outfits: [],
  isLoading: false,
  builderItems: [],  // items in the current outfit being built

  setOutfits: (outfits) => set({ outfits }),
  setLoading: (isLoading) => set({ isLoading }),

  addOutfit: (outfit) => set((state) => ({ outfits: [outfit, ...state.outfits] })),
  removeOutfit: (id) =>
    set((state) => ({ outfits: state.outfits.filter((o) => o.id !== id) })),

  // Outfit builder
  addToBuilder: (item) =>
    set((state) => {
      if (state.builderItems.find((i) => i.id === item.id)) return state;
      return { builderItems: [...state.builderItems, item] };
    }),
  removeFromBuilder: (id) =>
    set((state) => ({ builderItems: state.builderItems.filter((i) => i.id !== id) })),
  clearBuilder: () => set({ builderItems: [] }),
  reorderBuilder: (items) => set({ builderItems: items }),
}));
