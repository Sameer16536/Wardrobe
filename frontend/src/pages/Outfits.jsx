import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Save, GripVertical, Check, Sparkles } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, horizontalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clothesApi, outfitsApi } from "../api/client";
import { useOutfitStore, useWardrobeStore } from "../store/store";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function SortableItem({ item, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="relative flex-shrink-0"
    >
      <img
        src={item.image_url}
        alt={item.name}
        style={{ width: "80px", height: "104px", objectFit: "cover", borderRadius: "10px", border: "1px solid #23262D" }}
      />
      <button
        onClick={() => onRemove(item.id)}
        style={{
          position: "absolute",
          top: "4px",
          right: "4px",
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          backgroundColor: "rgba(12, 13, 14, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#F4F5F7",
          cursor: "pointer",
        }}
      >
        <X size={12} />
      </button>
      <p style={{ margin: "4px 0 0 0", fontSize: "10px", color: "#8E94A0", textAlign: "center", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.name}
      </p>
    </div>
  );
}

function OutfitCard({ outfit, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{
        backgroundColor: "#15161A",
        border: "1px solid #23262D",
        borderRadius: "16px",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "600", color: "#F4F5F7" }}>
            {outfit.name}
          </h3>
          <span className="badge" style={{ fontSize: "11px", textTransform: "capitalize" }}>
            {outfit.occasion || "Modular Collection"}
          </span>
        </div>
        <button
          onClick={() => onDelete(outfit.id)}
          style={{
            background: "transparent",
            border: "none",
            color: "#7E8592",
            padding: "8px",
            cursor: "pointer",
          }}
          title="Delete outfit"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Horizontal thumbnail scroll */}
      <div
        className="hide-scrollbar"
        style={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          paddingBottom: "4px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {(outfit.outfit_items || []).map((oi) => (
          <img
            key={oi.clothing_item_id}
            src={oi.clothing_item?.image_url}
            alt={oi.clothing_item?.name}
            style={{ width: "70px", height: "92px", objectFit: "cover", borderRadius: "10px", border: "1px solid #23262D", flexShrink: 0 }}
          />
        ))}
        {(outfit.outfit_items || []).length === 0 && (
          <p style={{ color: "#5E6472", fontSize: "12px", margin: "12px 0" }}>No garments in this playlist</p>
        )}
      </div>
    </motion.div>
  );
}

export default function Outfits() {
  const navigate = useNavigate();
  const { outfits, builderItems, setOutfits, addOutfit, removeOutfit, addToBuilder,
          removeFromBuilder, clearBuilder, reorderBuilder } = useOutfitStore();
  const { items: wardrobeItems, setItems: setWardrobeItems } = useWardrobeStore();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [outfitName, setOutfitName] = useState("");
  const [outfitOccasion, setOutfitOccasion] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    const load = async () => {
      try {
        const [outfitsRes, wardrobeRes] = await Promise.all([
          outfitsApi.getAll(),
          clothesApi.getAll(),
        ]);
        setOutfits(outfitsRes.data);
        setWardrobeItems(wardrobeRes.data);
      } catch {
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = builderItems.findIndex((i) => i.id === active.id);
      const newIndex = builderItems.findIndex((i) => i.id === over.id);
      reorderBuilder(arrayMove(builderItems, oldIndex, newIndex));
    }
  };

  const handleSaveOutfit = async () => {
    if (!outfitName.trim()) return toast.error("Give your outfit a name!");
    if (builderItems.length === 0) return toast.error("Select at least 1 garment!");
    setIsSaving(true);
    try {
      const res = await outfitsApi.create({
        name: outfitName,
        occasion: outfitOccasion || null,
        items: builderItems.map((item, idx) => ({
          clothing_item_id: item.id,
          position: idx,
        })),
      });
      addOutfit(res.data);
      clearBuilder();
      setOutfitName("");
      setOutfitOccasion("");
      setIsBuilderOpen(false);
      toast.success("Outfit saved!");
    } catch {
      toast.error("Failed to save outfit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOutfit = async (id) => {
    try {
      await outfitsApi.delete(id);
      removeOutfit(id);
      toast.success("Outfit deleted");
    } catch {
      toast.error("Failed to delete outfit");
    }
  };

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#0C0D0E", color: "#F4F5F7" }}>
      {/* Top Header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        padding: "14px 16px",
        backgroundColor: "#0C0D0E",
        borderBottom: "1px solid #1E2027",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "700", letterSpacing: "-0.02em" }}>
              Outfit Playlists
            </h1>
            <p style={{ margin: "2px 0 0 0", color: "#747A87", fontSize: "12px" }}>
              {outfits.length} curated combos
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setIsBuilderOpen(true)}
            id="create-outfit-btn"
            style={{ minHeight: "38px", padding: "8px 16px", fontSize: "13px" }}
          >
            <Plus size={15} /> Create
          </button>
        </div>
      </div>

      {/* Outfits List */}
      <div style={{ padding: "16px", maxWidth: "800px", margin: "0 auto" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "130px", borderRadius: "16px" }} />
            ))}
          </div>
        ) : outfits.length === 0 ? (
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
              margin: "30px auto",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 6px 0", color: "#F4F5F7" }}>
              No outfit playlists yet
            </h2>
            <p style={{ color: "#747A87", fontSize: "13px", margin: "0 0 18px 0" }}>
              Mix and match tops, bottoms, and shoes into saved outfit combos.
            </p>
            <button className="btn-primary" onClick={() => setIsBuilderOpen(true)}>
              <Plus size={15} /> Build First Outfit
            </button>
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <AnimatePresence>
              {outfits.map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} onDelete={handleDeleteOutfit} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ─── Mobile Slide-Up Outfit Builder Sheet ─────────────────────────── */}
      <AnimatePresence>
        {isBuilderOpen && (
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
            onClick={() => setIsBuilderOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              style={{
                width: "100%",
                maxWidth: "520px",
                height: "92vh",
                backgroundColor: "#111215",
                borderTop: "1px solid #23262D",
                borderTopLeftRadius: "24px",
                borderTopRightRadius: "24px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet Header */}
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid #1E2027",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#F4F5F7" }}>
                    Outfit Builder
                  </h2>
                  <p style={{ margin: 0, fontSize: "12px", color: "#747A87" }}>
                    {builderItems.length} {builderItems.length === 1 ? "garment" : "garments"} selected
                  </p>
                </div>
                <button
                  onClick={() => setIsBuilderOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#A0A5B1",
                    padding: "6px",
                    cursor: "pointer",
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Sheet Scrollable Body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 100px 20px", display: "flex", flexDirection: "column", gap: "18px" }}>
                {/* Outfit Name */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "6px" }}>
                    Playlist Title
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Minimalist Workwear, Saturday Brunch"
                    value={outfitName}
                    onChange={(e) => setOutfitName(e.target.value)}
                  />
                </div>

                {/* Selected Canvas Strip */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "6px" }}>
                    Selected Canvas (drag or tap X to remove)
                  </label>
                  {builderItems.length > 0 ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={builderItems.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
                        <div
                          className="hide-scrollbar"
                          style={{
                            display: "flex",
                            gap: "10px",
                            overflowX: "auto",
                            padding: "10px",
                            backgroundColor: "#16171B",
                            border: "1px dashed #282C35",
                            borderRadius: "14px",
                          }}
                        >
                          {builderItems.map((item) => (
                            <SortableItem key={item.id} item={item} onRemove={removeFromBuilder} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "90px",
                      borderRadius: "14px",
                      backgroundColor: "#15161A",
                      border: "1px dashed #242730",
                      color: "#656B77",
                      fontSize: "13px",
                    }}>
                      Tap clothes below to add to canvas
                    </div>
                  )}
                </div>

                {/* Wardrobe Selector */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "8px" }}>
                    Tap to Add / Remove
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    {wardrobeItems.map((item) => {
                      const isSelected = builderItems.some((i) => i.id === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => isSelected ? removeFromBuilder(item.id) : addToBuilder(item)}
                          style={{
                            position: "relative",
                            aspectRatio: "3/4",
                            borderRadius: "12px",
                            overflow: "hidden",
                            border: isSelected ? "2px solid #F2EEE9" : "1px solid #23262D",
                            padding: 0,
                            backgroundColor: "#15161A",
                            cursor: "pointer",
                          }}
                        >
                          <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          {isSelected && (
                            <div style={{
                              position: "absolute",
                              inset: 0,
                              backgroundColor: "rgba(12, 13, 14, 0.65)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}>
                              <div style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor: "#F2EEE9",
                                color: "#0C0D0E",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}>
                                <Check size={14} strokeWidth={2.5} />
                              </div>
                            </div>
                          )}
                          <p style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            margin: 0,
                            padding: "4px",
                            fontSize: "10px",
                            backgroundColor: "rgba(12, 13, 14, 0.8)",
                            color: "#E2E5EB",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {item.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Fixed Bottom Save Button in Sheet */}
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "12px 20px calc(14px + env(safe-area-inset-bottom, 10px)) 20px",
                backgroundColor: "#111215",
                borderTop: "1px solid #1E2027",
              }}>
                <button
                  className="btn-primary"
                  style={{ width: "100%", height: "48px", fontSize: "15px" }}
                  onClick={handleSaveOutfit}
                  disabled={isSaving}
                  id="save-outfit-btn"
                >
                  <Save size={16} />
                  {isSaving ? "Saving..." : "Save Playlist"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
