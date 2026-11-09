import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, RefreshCw, Trash2, Camera, X, Tag, Upload } from "lucide-react";
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

function GarmentDetailModal({ item, onClose, onDelete, onRetag, onUpdateItem, onSelectTag }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await clothesApi.delete(item.id);
      onDelete(item.id);
      toast.success("Garment removed");
      onClose();
    } catch {
      toast.error("Failed to delete garment");
      setIsDeleting(false);
    }
  };

  const handleAddTag = async () => {
    const clean = newTagInput.trim().toLowerCase().replace(/^#/, "");
    if (!clean) return;
    const currentTags = item.tags || [];
    if (currentTags.map((t) => t.toLowerCase()).includes(clean)) {
      toast("Tag already exists", { icon: "ℹ️" });
      setNewTagInput("");
      return;
    }

    setIsAddingTag(true);
    const updatedTags = [...currentTags, clean];
    try {
      await clothesApi.update(item.id, { tags: updatedTags });
      onUpdateItem(item.id, { tags: updatedTags });
      item.tags = updatedTags; // local sync
      toast.success(`Added #${clean}`);
      setNewTagInput("");
    } catch {
      toast.error("Failed to add tag");
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    const updatedTags = (item.tags || []).filter((t) => t !== tagToRemove);
    try {
      await clothesApi.update(item.id, { tags: updatedTags });
      onUpdateItem(item.id, { tags: updatedTags });
      item.tags = updatedTags; // local sync
      toast.success(`Removed #${tagToRemove}`);
    } catch {
      toast.error("Failed to remove tag");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#131417",
          borderTop: "1px solid #242732",
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          padding: "20px 20px calc(24px + env(safe-area-inset-bottom, 12px)) 20px",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2E323D", margin: "0 auto 16px auto" }} />

        <div style={{ display: "flex", gap: "16px", marginBottom: "18px" }}>
          <img
            src={item.image_url}
            alt={item.name}
            style={{ width: "96px", height: "128px", objectFit: "cover", borderRadius: "14px", border: "1px solid #23262D" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600", color: "#F4F5F7" }}>
              {item.name}
            </h3>
            <p style={{ margin: "0 0 10px 0", color: "#747A87", fontSize: "12.5px", textTransform: "capitalize" }}>
              {item.category} {item.brand && `• ${item.brand}`}
            </p>

            {/* Colors */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              {(item.colors || []).map((c) => (
                <div
                  key={c}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    backgroundColor: "#1A1C22",
                    border: "1px solid #282C35",
                    fontSize: "11px",
                    color: "#D0D4DC",
                  }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: COLOR_MAP[c] || c }} />
                  <span style={{ textTransform: "capitalize" }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Occasions & Seasons tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {(item.occasions || []).map((o) => (
            <span key={o} className="tag" style={{ fontSize: "11.5px", textTransform: "capitalize" }}>{o}</span>
          ))}
          {(item.seasons || []).map((s) => (
            <span key={s} className="tag" style={{ fontSize: "11.5px", textTransform: "capitalize" }}>{s}</span>
          ))}
        </div>

        {/* Custom Tags Section */}
        <div style={{
          backgroundColor: "#16171B",
          border: "1px solid #252832",
          borderRadius: "14px",
          padding: "12px 14px",
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#C8CBD0", display: "flex", alignItems: "center", gap: "5px" }}>
              <Tag size={13} /> Tags (Click to filter)
            </span>
            <span style={{ fontSize: "11px", color: "#6A707E" }}>
              {(item.tags || []).length} tags
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
            {(item.tags && item.tags.length > 0) ? (
              item.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    backgroundColor: "#1F222A",
                    border: "1px solid #313642",
                    color: "#F2EEE9",
                    fontSize: "11.5px",
                  }}
                >
                  <button
                    onClick={() => {
                      onSelectTag(t);
                      onClose();
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "inherit",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: "500",
                    }}
                    title="Filter wardrobe by this tag"
                  >
                    #{t}
                  </button>
                  <button
                    onClick={() => handleRemoveTag(t)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#7E8492",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Remove tag"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            ) : (
              <span style={{ fontSize: "12px", color: "#6A707E" }}>No custom tags yet.</span>
            )}
          </div>

          {/* Add tag row */}
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              className="input"
              placeholder="Add tag (e.g. vintage, cotton)..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              style={{ minHeight: "36px", fontSize: "12.5px", padding: "6px 12px" }}
            />
            <button
              onClick={handleAddTag}
              disabled={isAddingTag || !newTagInput.trim()}
              className="btn-secondary"
              style={{ minHeight: "36px", padding: "0 14px", fontSize: "12.5px", flexShrink: 0 }}
            >
              Add
            </button>
          </div>
        </div>

        {item.notes && (
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#8E94A0", backgroundColor: "#181A20", padding: "10px 14px", borderRadius: "10px", border: "1px solid #23262D" }}>
            {item.notes}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn-secondary"
            style={{ flex: 1 }}
            onClick={() => {
              onRetag(item.id);
              onClose();
            }}
          >
            <RefreshCw size={14} /> Re-tag with AI
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              flex: 1,
              backgroundColor: "#2B1616",
              border: "1px solid #4D2626",
              color: "#F87171",
              borderRadius: "12px",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontWeight: "600",
              fontSize: "13.5px",
              cursor: "pointer",
            }}
          >
            <Trash2 size={14} /> Remove
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ClothingCard({ item, onClick }) {
  const displayTags = (item.tags || []).slice(0, 2);
  const remainingTagsCount = (item.tags || []).length - displayTags.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={() => onClick(item)}
      style={{
        backgroundColor: "#15161A",
        border: "1px solid #23262D",
        borderRadius: "14px",
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
      }}
      className="card"
    >
      {/* 3:4 aspect ratio image container */}
      <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden", backgroundColor: "#111215" }}>
        <img
          src={item.image_url}
          alt={item.name}
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Color dots */}
        <div style={{ position: "absolute", top: "7px", left: "7px", display: "flex", gap: "3px", zIndex: 2 }}>
          {(item.colors || []).slice(0, 3).map((c) => (
            <div
              key={c}
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                backgroundColor: COLOR_MAP[c] || c,
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Info details */}
      <div style={{ padding: "10px 12px" }}>
        <p style={{ margin: 0, fontWeight: "600", fontSize: "12.5px", color: "#F4F5F7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </p>
        <p style={{ margin: "2px 0 0 0", color: "#747A87", fontSize: "11px", textTransform: "capitalize" }}>
          {item.category} {item.brand && `• ${item.brand}`}
        </p>

        {/* Tag pills on garment card */}
        {displayTags.length > 0 && (
          <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
            {displayTags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: "10px",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  backgroundColor: "#1E2027",
                  color: "#9EA4B0",
                  border: "1px solid #282C35",
                }}
              >
                #{t}
              </span>
            ))}
            {remainingTagsCount > 0 && (
              <span style={{ fontSize: "10px", color: "#6A707E" }}>
                +{remainingTagsCount}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Wardrobe() {
  const navigate = useNavigate();
  const { items, isLoading, setItems, setLoading, removeItem, updateItem } = useWardrobeStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTag, setActiveTag] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadItems = async () => {
      // Stale-while-revalidate: only show skeleton if we have 0 items cached in memory
      if (items.length === 0) {
        setLoading(true);
      }
      try {
        const res = await clothesApi.getAll();
        if (isMounted) {
          setItems(res.data);
        }
      } catch {
        if (isMounted && items.length === 0) {
          toast.error("Failed to load wardrobe");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadItems();
    return () => {
      isMounted = false;
    };
  }, []);

  // Collect all unique custom/AI tags across user's wardrobe items
  const availableTags = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach((t) => {
          if (t && typeof t === "string" && t.trim()) {
            set.add(t.trim().toLowerCase());
          }
        });
      }
    });
    return Array.from(set).sort();
  }, [items]);

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

  // Comprehensive multi-attribute filtering (name, tags, category, color, brand, season, occasion)
  const query = search.trim().toLowerCase().replace(/^#/, "");

  const filtered = items.filter((item) => {
    const matchesSearch = !query || Boolean(
      item.name?.toLowerCase().includes(query) ||
      item.brand?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.notes?.toLowerCase().includes(query) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(query)) ||
      (item.colors || []).some((c) => c.toLowerCase().includes(query)) ||
      (item.seasons || []).some((s) => s.toLowerCase().includes(query)) ||
      (item.occasions || []).some((o) => o.toLowerCase().includes(query))
    );

    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesTag = !activeTag || (item.tags || []).some((t) => t.toLowerCase() === activeTag.toLowerCase());

    return matchesSearch && matchesCategory && matchesTag;
  });

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#0C0D0E", color: "#F4F5F7" }}>
      {/* Top Header & Search bar (Sticky on mobile) */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        padding: "14px 16px 12px 16px",
        backgroundColor: "#0C0D0E",
        borderBottom: "1px solid #1E2027",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Header Row on Desktop */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "700", letterSpacing: "-0.02em" }}>
                My Wardrobe
              </h1>
              <p style={{ margin: "2px 0 0 0", color: "#747A87", fontSize: "12px" }}>
                {items.length} {items.length === 1 ? "garment" : "garments"} cataloged
              </p>
            </div>

            <button
              className="btn-primary hidden sm:inline-flex"
              onClick={() => navigate("/add")}
              style={{ minHeight: "38px", fontSize: "13px", padding: "8px 16px" }}
            >
              <Plus size={15} /> Add Garment
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: "10px" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#5E6472" }} />
            <input
              className="input"
              style={{ paddingLeft: "36px", paddingRight: search ? "36px" : "15px", minHeight: "40px", fontSize: "13px" }}
              placeholder="Search by name, #tag, category, color, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#747A87",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category Chips Carousel */}
          <div
            className="hide-scrollbar"
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: availableTags.length > 0 ? "8px" : "2px",
              WebkitOverflowScrolling: "touch",
            }}
          >
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
                    padding: "6px 13px",
                    borderRadius: "8px",
                    border: isActive ? "1px solid #F2EEE9" : "1px solid #23262D",
                    backgroundColor: isActive ? "#F2EEE9" : "#141518",
                    color: isActive ? "#0C0D0E" : "#898F9C",
                    textTransform: "capitalize",
                    transition: "all 0.12s ease",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Tag Filter Chips Bar */}
          {availableTags.length > 0 && (
            <div
              className="hide-scrollbar"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                overflowX: "auto",
                paddingTop: "2px",
                paddingBottom: "2px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <span style={{
                fontSize: "11px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#6E7482",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexShrink: 0,
                marginRight: "2px",
              }}>
                <Tag size={12} /> Tags:
              </span>

              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  style={{
                    cursor: "pointer",
                    fontSize: "11px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "1px solid #4D2626",
                    backgroundColor: "#2B1616",
                    color: "#F87171",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    flexShrink: 0,
                  }}
                >
                  Clear Tag <X size={11} />
                </button>
              )}

              {availableTags.map((tag) => {
                const isSelected = activeTag?.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(isSelected ? null : tag)}
                    style={{
                      cursor: "pointer",
                      fontSize: "11px",
                      padding: "3px 9px",
                      borderRadius: "6px",
                      border: isSelected ? "1px solid #F2EEE9" : "1px solid #242732",
                      backgroundColor: isSelected ? "#F2EEE9" : "#141518",
                      color: isSelected ? "#0C0D0E" : "#9AA0AD",
                      fontWeight: isSelected ? "600" : "500",
                      whiteSpace: "nowrap",
                      transition: "all 0.12s ease",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    #{tag}
                    {isSelected && <X size={11} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Grid Content */}
      <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto" }}>
        {isLoading ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
          }} className="sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="card" style={{ overflow: "hidden", padding: 0 }}>
                <div className="skeleton" style={{ aspectRatio: "3/4" }} />
                <div style={{ padding: "10px" }}>
                  <div className="skeleton" style={{ height: "13px", width: "70%", marginBottom: "6px" }} />
                  <div className="skeleton" style={{ height: "10px", width: "40%" }} />
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
              padding: "60px 16px",
              backgroundColor: "#131417",
              border: "1px dashed #242730",
              borderRadius: "16px",
              maxWidth: "420px",
              margin: "24px auto",
            }}
          >
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              backgroundColor: "#1A1C22",
              border: "1px solid #282C35",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9EA4B0",
              margin: "0 auto 14px auto",
            }}>
              <Camera size={26} />
            </div>
            <h2 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 6px 0", color: "#F4F5F7" }}>
              {items.length === 0 ? "Wardrobe is empty" : "No items match filter"}
            </h2>
            <p style={{ color: "#747A87", fontSize: "13px", margin: "0 0 18px 0" }}>
              {items.length === 0
                ? "Snap clothes with your camera or upload photos to build your digital wardrobe."
                : (activeTag || search || activeCategory !== "all")
                ? "Try resetting your search query, category, or tag filter."
                : "No garments found."}
            </p>
            {items.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "240px", margin: "0 auto" }}>
                <button className="btn-primary" onClick={() => navigate("/add")} style={{ width: "100%" }}>
                  <Camera size={16} /> Snap First Garment
                </button>
                <button className="btn-secondary" onClick={() => navigate("/add")} style={{ width: "100%" }}>
                  <Upload size={16} /> Upload Photo
                </button>
              </div>
            ) : (
              (activeTag || search || activeCategory !== "all") && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("all");
                    setActiveTag(null);
                  }}
                  style={{ fontSize: "12.5px", padding: "6px 16px" }}
                >
                  Reset All Filters
                </button>
              )
            )}
          </motion.div>
        ) : (
          <motion.div
            layout
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "12px",
            }}
            className="sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4"
          >
            <AnimatePresence>
              {filtered.map((item) => (
                <ClothingCard
                  key={item.id}
                  item={item}
                  onClick={(it) => setSelectedItem(it)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => navigate("/add")}
        style={{
          position: "fixed",
          right: "18px",
          bottom: "calc(74px + env(safe-area-inset-bottom, 10px))",
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          backgroundColor: "#F2EEE9",
          color: "#0C0D0E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          zIndex: 35,
          cursor: "pointer",
        }}
        className="flex sm:hidden"
        title="Add Garment"
      >
        <Camera size={22} strokeWidth={2.2} />
      </button>

      {/* Garment Details Modal/Sheet */}
      <AnimatePresence>
        {selectedItem && (
          <GarmentDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDelete={removeItem}
            onRetag={handleRetag}
            onUpdateItem={(id, updates) => {
              updateItem(id, updates);
              setSelectedItem((prev) => (prev ? { ...prev, ...updates } : null));
            }}
            onSelectTag={(t) => {
              setActiveTag(t);
              setSearch("");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
