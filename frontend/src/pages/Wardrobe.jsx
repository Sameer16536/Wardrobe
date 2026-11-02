import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, RefreshCw, Trash2, SlidersHorizontal } from "lucide-react";
import { clothesApi } from "../api/client";
import { useWardrobeStore } from "../store/store";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const CATEGORIES = [
  "all", "shirt", "t-shirt", "pants", "jeans", "shorts", "dress",
  "skirt", "jacket", "coat", "sweater", "hoodie", "shoes", "sneakers", "boots", "bag", "accessory"
];

const COLOR_MAP = {
  black: "#111", white: "#eee", grey: "#9ca3af", navy: "#1e3a5f", blue: "#3b82f6",
  red: "#ef4444", green: "#22c55e", yellow: "#eab308", orange: "#f97316", pink: "#ec4899",
  purple: "#a855f7", brown: "#92400e", beige: "#d4b896", cream: "#fef3c7", olive: "#65a30d",
  teal: "#0d9488", maroon: "#7f1d1d",
};

function ClothingCard({ item, onDelete, onRetag }) {
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await clothesApi.delete(item.id);
      onDelete(item.id);
      toast.success("Item removed");
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="card overflow-hidden cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: deleting ? 0.4 : 1,
        backgroundColor: "#15161A",
        border: "1px solid #23262D",
        borderRadius: "12px",
      }}
    >
      {/* Image Container */}
      <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden", backgroundColor: "#111215" }}>
        <img
          src={item.image_url}
          alt={item.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.3s ease",
            transform: hovered ? "scale(1.03)" : "scale(1)",
          }}
        />

        {/* Color swatches */}
        <div style={{ position: "absolute", top: "8px", left: "8px", display: "flex", gap: "4px", zIndex: 2 }}>
          {(item.colors || []).slice(0, 3).map((c) => (
            <div
              key={c}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                backgroundColor: COLOR_MAP[c] || c,
              }}
              title={c}
            />
          ))}
        </div>

        {/* Actions overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(12, 13, 14, 0.55)",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-end",
                gap: "6px",
                padding: "10px",
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onRetag(item.id); }}
                style={{
                  padding: "7px",
                  borderRadius: "8px",
                  backgroundColor: "#1D1F25",
                  border: "1px solid #2F333D",
                  color: "#F4F5F7",
                  cursor: "pointer",
                }}
                title="Re-analyze garment"
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                style={{
                  padding: "7px",
                  borderRadius: "8px",
                  backgroundColor: "#2A1818",
                  border: "1px solid #4D2626",
                  color: "#F87171",
                  cursor: "pointer",
                }}
                title="Delete"
                disabled={deleting}
              >
                <Trash2 size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info details */}
      <div style={{ padding: "12px 14px" }}>
        <p style={{ margin: 0, fontWeight: "600", fontSize: "13px", color: "#F4F5F7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </p>
        <p style={{ margin: "2px 0 8px 0", color: "#747A87", fontSize: "11.5px", textTransform: "capitalize" }}>
          {item.category}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {(item.occasions || []).slice(0, 2).map((o) => (
            <span
              key={o}
              style={{
                fontSize: "10.5px",
                padding: "2px 7px",
                borderRadius: "4px",
                backgroundColor: "#1A1C22",
                border: "1px solid #262932",
                color: "#959BA7",
              }}
            >
              {o}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Wardrobe() {
  const navigate = useNavigate();
  const { items, isLoading, setItems, setLoading, removeItem } = useWardrobeStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const res = await clothesApi.getAll();
        setItems(res.data);
      } catch {
        toast.error("Failed to load wardrobe");
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  const handleRetag = async (id) => {
    toast.loading("Analyzing garment with AI...", { id: "retag" });
    try {
      await clothesApi.retag(id);
      toast.success("Tags updated", { id: "retag" });
      const res = await clothesApi.getAll();
      setItems(res.data);
    } catch {
      toast.error("Analysis failed", { id: "retag" });
    }
  };

  const filtered = items.filter((item) => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0C0D0E", color: "#F4F5F7" }}>
      {/* Top Header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        padding: "20px 28px",
        backgroundColor: "#0C0D0E",
        borderBottom: "1px solid #1F2128",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div>
              <h1 style={{ margin: "0 0 4px 0", fontSize: "22px", fontWeight: "600", letterSpacing: "-0.02em" }}>
                Wardrobe Index
              </h1>
              <p style={{ margin: 0, color: "#747A87", fontSize: "13px" }}>
                {items.length} curated {items.length === 1 ? "garment" : "garments"}
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => navigate("/add")}
              id="add-clothing-btn"
            >
              <Plus size={15} /> Add Garment
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: "14px" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#5E6472" }} />
            <input
              className="input"
              style={{ paddingLeft: "36px" }}
              placeholder="Search by color, fabric, category or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category Chips */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none" }}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: isActive ? "600" : "500",
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: isActive ? "1px solid #F2EEE9" : "1px solid #23262D",
                    backgroundColor: isActive ? "#F2EEE9" : "#141518",
                    color: isActive ? "#0C0D0E" : "#898F9C",
                    transition: "all 0.15s ease",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div style={{ padding: "28px", maxWidth: "1200px", margin: "0 auto" }}>
        {isLoading ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "16px",
          }}>
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="card" style={{ overflow: "hidden", padding: 0 }}>
                <div className="skeleton" style={{ aspectRatio: "3/4" }} />
                <div style={{ padding: "12px" }}>
                  <div className="skeleton" style={{ height: "14px", width: "70%", marginBottom: "8px" }} />
                  <div className="skeleton" style={{ height: "11px", width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: "center",
              padding: "80px 20px",
              backgroundColor: "#131417",
              border: "1px dashed #242730",
              borderRadius: "14px",
              maxWidth: "520px",
              margin: "40px auto",
            }}
          >
            <h2 style={{ fontSize: "17px", fontWeight: "600", margin: "0 0 6px 0", color: "#F4F5F7" }}>
              {items.length === 0 ? "Wardrobe catalog is currently empty" : "No garments match current criteria"}
            </h2>
            <p style={{ color: "#747A87", fontSize: "13px", margin: "0 0 20px 0" }}>
              {items.length === 0
                ? "Digitize your first garment using the camera or file uploader."
                : "Reset search query or select another category filter."}
            </p>
            {items.length === 0 && (
              <button className="btn-primary" onClick={() => navigate("/add")}>
                <Plus size={15} /> Add First Garment
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            layout
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "16px",
            }}
          >
            <AnimatePresence>
              {filtered.map((item) => (
                <ClothingCard
                  key={item.id}
                  item={item}
                  onDelete={removeItem}
                  onRetag={handleRetag}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
