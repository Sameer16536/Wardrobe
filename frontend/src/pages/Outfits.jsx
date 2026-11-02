import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Save, ChevronRight, GripVertical } from "lucide-react";
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
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
         className="relative group flex-shrink-0">
      <img src={item.image_url} alt={item.name}
           className="w-24 h-32 object-cover rounded-xl border border-[#27272A]" />
      <button {...attributes} {...listeners}
              className="absolute top-1 left-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.6)", cursor: "grab" }}>
        <GripVertical size={12} color="white" />
      </button>
      <button onClick={() => onRemove(item.id)}
              className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(244,63,94,0.8)" }}>
        <X size={10} color="white" />
      </button>
      <p className="text-center mt-1" style={{ fontSize: "10px", color: "#71717A" }}>{item.name}</p>
    </div>
  );
}

function OutfitCard({ outfit, onDelete }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{outfit.name}</h3>
          <p style={{ color: "#71717A", fontSize: "12px" }}>{outfit.occasion || "Any occasion"}</p>
        </div>
        <button onClick={() => onDelete(outfit.id)}
                className="btn-ghost p-1.5" style={{ color: "#F43F5E" }}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(outfit.outfit_items || []).map((oi) => (
          <img key={oi.clothing_item_id} src={oi.clothing_item?.image_url}
               className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
               alt={oi.clothing_item?.name} />
        ))}
        {(outfit.outfit_items || []).length === 0 && (
          <p style={{ color: "#52525B", fontSize: "12px" }}>No items in this outfit</p>
        )}
      </div>
      {outfit.description && (
        <p className="mt-2 text-xs" style={{ color: "#71717A" }}>{outfit.description}</p>
      )}
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
    if (builderItems.length === 0) return toast.error("Add at least one item to the outfit!");
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
      toast.success("🎉 Outfit saved!");
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
    <div className="min-h-screen" style={{ background: "#0C0D0E", color: "#F4F5F7" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-6 py-4"
           style={{ background: "#0C0D0E", borderBottom: "1px solid #1F2128" }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ letterSpacing: "-0.02em" }}>Outfit Playlists</h1>
            <p style={{ color: "#747A87", fontSize: "13px" }}>{outfits.length} saved collections</p>
          </div>
          <button className="btn-primary" onClick={() => setIsBuilderOpen(true)} id="create-outfit-btn">
            <Plus size={16} /> Create Outfit
          </button>
        </div>
      </div>

      {/* Outfit List */}
      <div className="px-6 py-6 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
          </div>
        ) : outfits.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "Sora, sans-serif" }}>
              No outfits yet
            </h2>
            <p style={{ color: "#71717A", marginBottom: "24px" }}>
              Create outfit playlists from your wardrobe
            </p>
            <button className="btn-primary" onClick={() => setIsBuilderOpen(true)}>
              <Plus size={16} /> Create First Outfit
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {outfits.map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} onDelete={handleDeleteOutfit} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Outfit Builder Drawer */}
      <AnimatePresence>
        {isBuilderOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex"
                      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30 }}
                        className="ml-auto w-full max-w-md h-full overflow-y-auto"
                        style={{ background: "#111113", borderLeft: "1px solid #27272A" }}>

              {/* Drawer Header */}
              <div className="flex items-center justify-between p-5 sticky top-0"
                   style={{ background: "#111113", borderBottom: "1px solid #27272A" }}>
                <h2 className="text-lg font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Outfit Builder</h2>
                <button onClick={() => setIsBuilderOpen(false)} className="btn-ghost p-2">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* Outfit name */}
                <div>
                  <label className="block mb-2 text-sm font-medium" style={{ color: "#A1A1AA" }}>Outfit Name *</label>
                  <input className="input" placeholder="e.g. Monday Vibes, Date Night..."
                         value={outfitName} onChange={(e) => setOutfitName(e.target.value)} />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium" style={{ color: "#A1A1AA" }}>Occasion</label>
                  <div className="flex flex-wrap gap-2">
                    {["casual", "formal", "party", "gym", "work", "outdoor"].map((o) => (
                      <button key={o} onClick={() => setOutfitOccasion(o === outfitOccasion ? "" : o)}
                              className={outfitOccasion === o ? "badge" : "tag"}
                              style={{ cursor: "pointer" }}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Builder canvas */}
                <div>
                  <label className="block mb-2 text-sm font-medium" style={{ color: "#A1A1AA" }}>
                    Selected Items ({builderItems.length}) — drag to reorder
                  </label>
                  {builderItems.length > 0 ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={builderItems.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
                        <div className="flex gap-3 overflow-x-auto pb-2 p-3 rounded-2xl"
                             style={{ background: "#18181B", border: "1px dashed #27272A" }}>
                          {builderItems.map((item) => (
                            <SortableItem key={item.id} item={item} onRemove={removeFromBuilder} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="flex items-center justify-center h-28 rounded-2xl"
                         style={{ background: "#18181B", border: "1px dashed #27272A" }}>
                      <p style={{ color: "#52525B", fontSize: "14px" }}>Select items from below</p>
                    </div>
                  )}
                </div>

                {/* Wardrobe picker */}
                <div>
                  <label className="block mb-2 text-sm font-medium" style={{ color: "#A1A1AA" }}>Your Wardrobe</label>
                  <div className="grid grid-cols-3 gap-2">
                    {wardrobeItems.map((item) => {
                      const isSelected = builderItems.some((i) => i.id === item.id);
                      return (
                        <button key={item.id} onClick={() => isSelected ? removeFromBuilder(item.id) : addToBuilder(item)}
                                className="relative rounded-xl overflow-hidden"
                                style={{ aspectRatio: "3/4", border: isSelected ? "2px solid #F2EEE9" : "2px solid #23262D" }}>
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center"
                                 style={{ background: "rgba(12, 13, 14, 0.65)" }}>
                              <div className="w-6 h-6 rounded-full flex items-center justify-center"
                                   style={{ backgroundColor: "#F2EEE9", color: "#0C0D0E", fontWeight: "bold" }}>
                                <span style={{ fontSize: "11px" }}>✓</span>
                              </div>
                            </div>
                          )}
                          <p className="absolute bottom-0 left-0 right-0 px-1 pb-1 pt-4 text-center"
                             style={{ fontSize: "9px", background: "rgba(12, 13, 14, 0.75)", color: "#F4F5F7" }}>
                            {item.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Save button */}
                <button className="btn-primary w-full justify-center py-4" onClick={handleSaveOutfit}
                        disabled={isSaving} id="save-outfit-btn">
                  <Save size={16} />
                  {isSaving ? "Saving..." : "Save Outfit"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
