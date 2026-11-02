import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, Check, RefreshCw, Loader, ChevronDown } from "lucide-react";
import { clothesApi } from "../api/client";
import { useWardrobeStore } from "../store/store";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const CATEGORIES = ["shirt", "t-shirt", "pants", "jeans", "shorts", "dress", "skirt",
  "jacket", "coat", "sweater", "hoodie", "shoes", "sneakers", "boots", "heels", "sandals",
  "bag", "hat", "scarf", "belt", "accessory", "other"];
const COLORS = ["black", "white", "grey", "navy", "blue", "red", "green", "yellow",
  "orange", "pink", "purple", "brown", "beige", "cream", "olive", "teal", "maroon"];
const SEASONS = ["summer", "winter", "spring", "autumn"];
const OCCASIONS = ["casual", "formal", "party", "gym", "outdoor", "work"];

export default function AddClothing() {
  const navigate = useNavigate();
  const { addItem } = useWardrobeStore();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [step, setStep] = useState("capture"); // capture | preview | edit | saving
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [aiTags, setAiTags] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "", colors: [], seasons: [], occasions: [], brand: "", notes: "",
  });

  // ─── Camera ───────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
    } catch {
      toast.error("Could not access camera. Please allow camera permission.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      setCameraActive(false);
    }
  };

  const takePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setCapturedImage(url);
      setImageFile(file);
      stopCamera();
      setStep("preview");
    }, "image/jpeg", 0.9);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCapturedImage(url);
    setImageFile(file);
    setStep("preview");
  };

  // ─── AI Analysis ─────────────────────────────────────────────────────────
  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("use_ai_tags", "true");
      // We'll do a preview analysis — just send a temp request and read response
      // For now, pre-fill form with estimated tags via a lightweight call
      // (In production, you can add a dedicated /ai/analyze endpoint)
      toast.loading("AI is analyzing your item...", { id: "ai-analyze" });
      await new Promise((r) => setTimeout(r, 1500)); // simulate
      // We'll let the actual save call do the tagging and then update
      toast.success("Ready! AI will auto-tag on save.", { id: "ai-analyze" });
      setStep("edit");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!imageFile) return;
    setStep("saving");
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("name", form.name || "Clothing Item");
      formData.append("category", form.category || "other");
      formData.append("colors", JSON.stringify(form.colors));
      formData.append("seasons", JSON.stringify(form.seasons));
      formData.append("occasions", JSON.stringify(form.occasions));
      formData.append("brand", form.brand || "");
      formData.append("notes", form.notes || "");
      formData.append("use_ai_tags", form.name ? "false" : "true");

      const res = await clothesApi.add(formData);
      addItem(res.data);
      toast.success("✨ Added to your wardrobe!");
      navigate("/wardrobe");
    } catch {
      toast.error("Failed to save item. Please try again.");
      setStep("edit");
    }
  };

  const toggleArrayField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "#09090B" }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/wardrobe")} className="btn-ghost">←</button>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Add Clothing</h1>
            <p style={{ color: "#71717A", fontSize: "14px" }}>Capture or upload a photo</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP: CAPTURE */}
          {step === "capture" && (
            <motion.div key="capture" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="card overflow-hidden mb-4" style={{ aspectRatio: "4/3", position: "relative" }}>
                <video ref={videoRef} className="w-full h-full object-cover"
                       style={{ display: cameraActive ? "block" : "none" }} />
                {!cameraActive && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3"
                       style={{ background: "#111113" }}>
                    <Camera size={48} style={{ color: "#27272A" }} />
                    <p style={{ color: "#52525B" }}>Camera off</p>
                  </div>
                )}
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>

              <div className="flex flex-col gap-3">
                {!cameraActive ? (
                  <button className="btn-primary justify-center py-4" onClick={startCamera} id="open-camera-btn">
                    <Camera size={18} /> Open Camera
                  </button>
                ) : (
                  <button className="btn-primary justify-center py-4" onClick={takePhoto} id="take-photo-btn">
                    <div className="w-5 h-5 rounded-full bg-white" />
                    Take Photo
                  </button>
                )}
                <button className="btn-secondary justify-center py-3" id="upload-file-btn"
                        onClick={() => fileInputRef.current.click()}>
                  <Upload size={16} /> Upload from Gallery
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                       onChange={handleFileUpload} />
              </div>
            </motion.div>
          )}

          {/* STEP: PREVIEW */}
          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="card overflow-hidden mb-4" style={{ aspectRatio: "4/3" }}>
                <img src={capturedImage} className="w-full h-full object-cover" alt="Captured clothing" />
              </div>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1 justify-center" onClick={() => { setStep("capture"); setCapturedImage(null); }}>
                  <RefreshCw size={16} /> Retake
                </button>
                <button className="btn-primary flex-1 justify-center" onClick={analyzeWithAI} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
                  Use This Photo
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP: EDIT TAGS */}
          {step === "edit" && (
            <motion.div key="edit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="space-y-5">
              {/* Image thumbnail */}
              <div className="flex gap-4 items-center card p-4">
                <img src={capturedImage} className="w-20 h-20 object-cover rounded-xl" alt="Preview" />
                <div className="flex-1">
                  <p className="text-sm mb-2" style={{ color: "#71717A" }}>AI is tagging on save. Edit manually:</p>
                  <input className="input" placeholder="Item name (e.g. Blue Oxford Shirt)"
                         value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "#A1A1AA" }}>Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button key={cat} onClick={() => setForm({ ...form, category: cat })}
                            className={form.category === cat ? "badge" : "tag"}
                            style={form.category === cat ? {} : { cursor: "pointer" }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "#A1A1AA" }}>Colors</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => toggleArrayField("colors", c)}
                            className={form.colors.includes(c) ? "badge" : "tag"}
                            style={{ cursor: "pointer" }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seasons */}
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "#A1A1AA" }}>Season</label>
                <div className="flex flex-wrap gap-2">
                  {SEASONS.map((s) => (
                    <button key={s} onClick={() => toggleArrayField("seasons", s)}
                            className={form.seasons.includes(s) ? "badge" : "tag"}
                            style={{ cursor: "pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Occasions */}
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: "#A1A1AA" }}>Occasions</label>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((o) => (
                    <button key={o} onClick={() => toggleArrayField("occasions", o)}
                            className={form.occasions.includes(o) ? "badge" : "tag"}
                            style={{ cursor: "pointer" }}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand & Notes */}
              <input className="input" placeholder="Brand (optional)"
                     value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              <textarea className="input" placeholder="Notes (optional)" rows={2}
                        value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        style={{ resize: "none" }} />

              <button className="btn-primary w-full justify-center py-4 text-base" onClick={handleSave}>
                <Check size={18} /> Save to Wardrobe
              </button>
            </motion.div>
          )}

          {/* STEP: SAVING */}
          {step === "saving" && (
            <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-center py-20">
              <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
                   style={{ backgroundColor: "#181A20", border: "1px solid #272B35" }}>
                <Loader size={22} color="#F2EEE9" className="animate-spin" />
              </div>
              <p className="font-semibold mb-1" style={{ color: "#F4F5F7" }}>Saving garment...</p>
              <p style={{ color: "#747A87", fontSize: "13px" }}>Analyzing silhouette and attributes</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
