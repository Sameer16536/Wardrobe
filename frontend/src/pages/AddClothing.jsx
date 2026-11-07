import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, X, Check, RefreshCw, Loader,
  ChevronLeft, SwitchCamera, Sparkles, Tag
} from "lucide-react";
import { clothesApi } from "../api/client";
import { useWardrobeStore } from "../store/store";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  "shirt", "t-shirt", "pants", "jeans", "shorts", "dress", "skirt",
  "jacket", "coat", "sweater", "hoodie", "shoes", "sneakers", "boots",
  "bag", "accessory", "other"
];

const COLORS = [
  "black", "white", "grey", "navy", "blue", "red", "green", "yellow",
  "orange", "pink", "purple", "brown", "beige", "cream", "olive"
];

const SEASONS = ["summer", "winter", "spring", "autumn"];
const OCCASIONS = ["casual", "formal", "party", "work", "gym", "date night"];

export default function AddClothing() {
  const navigate = useNavigate();
  const { addItem } = useWardrobeStore();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  const [step, setStep] = useState("capture"); // capture | preview | edit | saving
  const [captureMode, setCaptureMode] = useState("camera"); // camera | gallery
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // environment = rear, user = front
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    colors: [],
    seasons: [],
    occasions: [],
    brand: "",
    notes: "",
  });

  // Manage camera lifecycle based on mode and facing orientation
  useEffect(() => {
    if (captureMode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [facingMode, captureMode]);

  const startCamera = async () => {
    try {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      setCameraActive(false);
    }
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const takePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setCapturedImage(url);
      setImageFile(file);
      stopCamera();
      setStep("preview");
    }, "image/jpeg", 0.92);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCapturedImage(url);
    setImageFile(file);
    stopCamera();
    setStep("preview");
  };

  const proceedToEdit = () => {
    setStep("edit");
  };

  const handleSave = async () => {
    if (!imageFile) return;
    setStep("saving");
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("name", form.name || "Garment");
      formData.append("category", form.category || "other");
      formData.append("colors", JSON.stringify(form.colors));
      formData.append("seasons", JSON.stringify(form.seasons));
      formData.append("occasions", JSON.stringify(form.occasions));
      formData.append("brand", form.brand || "");
      formData.append("notes", form.notes || "");
      formData.append("use_ai_tags", form.name ? "false" : "true");

      const res = await clothesApi.add(formData);
      addItem(res.data);
      toast.success("Added to your wardrobe!");
      navigate("/wardrobe");
    } catch {
      toast.error("Failed to save garment. Please check connection.");
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
    <div style={{ minHeight: "100dvh", backgroundColor: "#0C0D0E", color: "#F4F5F7" }}>
      {/* ─── Top Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        backgroundColor: "#0C0D0E",
        borderBottom: "1px solid #1F2128",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <button
          onClick={() => {
            stopCamera();
            navigate("/wardrobe");
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#A0A5B1",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "14px",
            cursor: "pointer",
            padding: "6px 0",
          }}
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>

        <h1 style={{ fontSize: "15px", fontWeight: "600", margin: 0, letterSpacing: "-0.01em" }}>
          {step === "capture" && "Camera Capture"}
          {step === "preview" && "Verify Photo"}
          {step === "edit" && "Garment Details"}
          {step === "saving" && "Processing"}
        </h1>

        <div style={{ width: "40px" }} />
      </div>

      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "16px" }}>
        <AnimatePresence mode="wait">
          {/* ─── STEP 1: CAPTURE / UPLOAD ─────────────────────────────────── */}
          {step === "capture" && (
            <motion.div
              key="capture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Mode Toggle: Camera vs Gallery */}
              <div style={{
                display: "flex",
                gap: "4px",
                padding: "4px",
                borderRadius: "12px",
                backgroundColor: "#141518",
                border: "1px solid #20232B",
              }}>
                <button
                  type="button"
                  onClick={() => setCaptureMode("camera")}
                  style={{
                    flex: 1,
                    minHeight: "36px",
                    borderRadius: "8px",
                    border: captureMode === "camera" ? "1px solid #2F333E" : "1px solid transparent",
                    backgroundColor: captureMode === "camera" ? "#1F222A" : "transparent",
                    color: captureMode === "camera" ? "#F4F5F7" : "#747A87",
                    fontSize: "12.5px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  <Camera size={14} /> Live Camera
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureMode("gallery")}
                  style={{
                    flex: 1,
                    minHeight: "36px",
                    borderRadius: "8px",
                    border: captureMode === "gallery" ? "1px solid #2F333E" : "1px solid transparent",
                    backgroundColor: captureMode === "gallery" ? "#1F222A" : "transparent",
                    color: captureMode === "gallery" ? "#F4F5F7" : "#747A87",
                    fontSize: "12.5px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  <Upload size={14} /> Photo Gallery
                </button>
              </div>

              {/* GALLERY DROPZONE VIEW */}
              {captureMode === "gallery" ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.length) {
                      handleFileUpload({ target: { files: e.dataTransfer.files } });
                    }
                  }}
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "3/4",
                    borderRadius: "20px",
                    backgroundColor: "#131417",
                    border: "2px dashed #2A2E38",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                    textAlign: "center",
                    cursor: "pointer",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "18px",
                    backgroundColor: "#1C1E24",
                    border: "1px solid #282C36",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#F2EEE9",
                    marginBottom: "16px",
                  }}>
                    <Upload size={28} strokeWidth={1.8} />
                  </div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "600", color: "#F4F5F7" }}>
                    Select from Gallery
                  </h3>
                  <p style={{ margin: "0 0 18px 0", fontSize: "13px", color: "#8E94A0", maxWidth: "260px", lineHeight: 1.45 }}>
                    Tap to choose clothes from your photo library or drag & drop image files
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ minHeight: "42px", padding: "8px 24px", fontSize: "13px", pointerEvents: "none" }}
                  >
                    Browse Gallery
                  </button>
                </div>
              ) : (
                /* LIVE CAMERA VIEWFINDER */
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "3/4",
                    borderRadius: "20px",
                    overflow: "hidden",
                    backgroundColor: "#131417",
                    border: "1px solid #23262D",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                  }}
                >
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: cameraActive ? "block" : "none",
                    }}
                  />

                  {!cameraActive && (
                    <div style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      padding: "24px",
                      textAlign: "center",
                    }}>
                      <div style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "16px",
                        backgroundColor: "#181A20",
                        border: "1px solid #282C35",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#A0A5B1",
                      }}>
                        <Camera size={28} />
                      </div>
                      <div>
                        <p style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "600", color: "#F4F5F7" }}>
                          Camera Standby
                        </p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#747A87" }}>
                          Use live viewfinder or launch your phone's native camera
                        </p>
                      </div>
                      <button
                        onClick={startCamera}
                        className="btn-secondary"
                        style={{ marginTop: "8px", fontSize: "13px" }}
                      >
                        Enable Live Viewfinder
                      </button>
                    </div>
                  )}

                  {/* Flip camera overlay button */}
                  {cameraActive && (
                    <button
                      onClick={flipCamera}
                      style={{
                        position: "absolute",
                        top: "14px",
                        right: "14px",
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(12, 13, 14, 0.65)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#F4F5F7",
                        cursor: "pointer",
                        zIndex: 10,
                      }}
                      title="Flip camera"
                    >
                      <SwitchCamera size={18} />
                    </button>
                  )}

                  {/* Viewfinder frame guide */}
                  <div style={{
                    position: "absolute",
                    inset: "20px",
                    border: "1px dashed rgba(255, 255, 255, 0.2)",
                    borderRadius: "14px",
                    pointerEvents: "none",
                  }} />

                  <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>
              )}

              {/* Shutter & Actions Bar (Thumb-optimized) */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                backgroundColor: "#131417",
                border: "1px solid #20232B",
                borderRadius: "18px",
              }}>
                {captureMode === "gallery" ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary"
                    style={{
                      width: "100%",
                      minHeight: "46px",
                      fontSize: "13.5px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Upload size={17} />
                    <span>Choose from Photo Gallery</span>
                  </button>
                ) : (
                  <>
                    {/* Upload from gallery */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        background: "transparent",
                        border: "none",
                        color: "#A0A5B1",
                        cursor: "pointer",
                        padding: "8px 12px",
                        minWidth: "70px",
                      }}
                      id="upload-file-btn"
                    >
                      <Upload size={20} />
                      <span style={{ fontSize: "11px", fontWeight: "500" }}>Gallery</span>
                    </button>

                {/* Main Shutter Button */}
                {cameraActive ? (
                  <button
                    onClick={takePhoto}
                    style={{
                      width: "68px",
                      height: "68px",
                      borderRadius: "50%",
                      backgroundColor: "transparent",
                      border: "4px solid #F2EEE9",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      outline: "none",
                      transition: "transform 0.1s ease",
                    }}
                    id="take-photo-btn"
                  >
                    <div style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: "#F2EEE9",
                    }} />
                  </button>
                ) : (
                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    style={{
                      padding: "12px 24px",
                      borderRadius: "14px",
                      backgroundColor: "#F2EEE9",
                      color: "#0C0D0E",
                      fontWeight: "600",
                      fontSize: "14px",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <Camera size={18} />
                    <span>Open Camera</span>
                  </button>
                )}

                {/* Direct Native Camera App Trigger (for phones) */}
                <button
                  onClick={() => nativeCameraInputRef.current?.click()}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    background: "transparent",
                    border: "none",
                    color: "#A0A5B1",
                    cursor: "pointer",
                    padding: "8px 12px",
                    minWidth: "70px",
                  }}
                  title="Snap with phone camera"
                >
                  <Camera size={20} />
                  <span style={{ fontSize: "11px", fontWeight: "500" }}>Native</span>
                </button>
              </>
            )}

            {/* Hidden native inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </div>

              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "12px", color: "#6A707E" }}>
                  Tip: Lay garment flat with clean lighting for best AI styling tags
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 2: PREVIEW ──────────────────────────────────────────── */}
          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div style={{
                position: "relative",
                width: "100%",
                aspectRatio: "3/4",
                borderRadius: "20px",
                overflow: "hidden",
                border: "1px solid #23262D",
                backgroundColor: "#111215",
              }}>
                <img
                  src={capturedImage}
                  alt="Captured garment"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setStep("capture");
                    setCapturedImage(null);
                    setImageFile(null);
                    startCamera();
                  }}
                >
                  <RefreshCw size={15} /> Retake
                </button>

                <button
                  className="btn-primary"
                  style={{ flex: 1.4 }}
                  onClick={proceedToEdit}
                  id="confirm-photo-btn"
                >
                  <Check size={16} /> Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: EDIT TAGS & METADATA ─────────────────────────────── */}
          {step === "edit" && (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "80px" }}
            >
              {/* Image banner preview */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 14px",
                backgroundColor: "#15161A",
                border: "1px solid #23262D",
                borderRadius: "14px",
              }}>
                <img
                  src={capturedImage}
                  alt="Garment thumbnail"
                  style={{ width: "64px", height: "72px", objectFit: "cover", borderRadius: "10px" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", color: "#8E94A0", marginBottom: "4px" }}>
                    Garment Label (optional)
                  </div>
                  <input
                    className="input"
                    placeholder="e.g. Vintage Leather Jacket"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{ minHeight: "38px", fontSize: "13.5px" }}
                  />
                </div>
              </div>

              {/* Category horizontal pills */}
              <div>
                <label style={{ display: "block", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "8px" }}>
                  Category
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = form.category === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setForm({ ...form, category: cat })}
                        style={{
                          cursor: "pointer",
                          fontSize: "12px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: isSelected ? "1px solid #F2EEE9" : "1px solid #23262D",
                          backgroundColor: isSelected ? "#F2EEE9" : "#141518",
                          color: isSelected ? "#0C0D0E" : "#8E94A0",
                          fontWeight: isSelected ? "600" : "500",
                          textTransform: "capitalize",
                          transition: "all 0.12s ease",
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors */}
              <div>
                <label style={{ display: "block", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "8px" }}>
                  Primary Colors
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {COLORS.map((c) => {
                    const isSelected = form.colors.includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => toggleArrayField("colors", c)}
                        style={{
                          cursor: "pointer",
                          fontSize: "12px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: isSelected ? "1px solid #F2EEE9" : "1px solid #23262D",
                          backgroundColor: isSelected ? "#F2EEE9" : "#141518",
                          color: isSelected ? "#0C0D0E" : "#8E94A0",
                          fontWeight: isSelected ? "600" : "500",
                          textTransform: "capitalize",
                          transition: "all 0.12s ease",
                        }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Season */}
              <div>
                <label style={{ display: "block", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "8px" }}>
                  Suitable Seasons
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {SEASONS.map((s) => {
                    const isSelected = form.seasons.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleArrayField("seasons", s)}
                        style={{
                          cursor: "pointer",
                          fontSize: "12px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: isSelected ? "1px solid #F2EEE9" : "1px solid #23262D",
                          backgroundColor: isSelected ? "#F2EEE9" : "#141518",
                          color: isSelected ? "#0C0D0E" : "#8E94A0",
                          fontWeight: isSelected ? "600" : "500",
                          textTransform: "capitalize",
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Occasions */}
              <div>
                <label style={{ display: "block", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "8px" }}>
                  Occasion Vibe
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {OCCASIONS.map((o) => {
                    const isSelected = form.occasions.includes(o);
                    return (
                      <button
                        key={o}
                        onClick={() => toggleArrayField("occasions", o)}
                        style={{
                          cursor: "pointer",
                          fontSize: "12px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: isSelected ? "1px solid #F2EEE9" : "1px solid #23262D",
                          backgroundColor: isSelected ? "#F2EEE9" : "#141518",
                          color: isSelected ? "#0C0D0E" : "#8E94A0",
                          fontWeight: isSelected ? "600" : "500",
                          textTransform: "capitalize",
                        }}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brand & Notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input
                  className="input"
                  placeholder="Brand / Designer (optional)"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
                <textarea
                  className="input"
                  placeholder="Styling notes, fabric, or fit details (optional)"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ resize: "none", minHeight: "64px" }}
                />
              </div>

              {/* Fixed Bottom Save Bar (One-thumb reachable) */}
              <div style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "12px 16px calc(14px + env(safe-area-inset-bottom, 10px)) 16px",
                backgroundColor: "#0D0E11",
                borderTop: "1px solid #1E2027",
                zIndex: 40,
                maxWidth: "480px",
                margin: "0 auto",
              }}>
                <button
                  className="btn-primary"
                  style={{ width: "100%", height: "48px", fontSize: "15px" }}
                  onClick={handleSave}
                  id="save-to-wardrobe-btn"
                >
                  <Check size={18} /> Save to Wardrobe
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 4: SAVING SPINNER ───────────────────────────────────── */}
          {step === "saving" && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                textAlign: "center",
                padding: "80px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                backgroundColor: "#16171B",
                border: "1px solid #272B35",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F2EEE9",
                marginBottom: "16px",
              }}>
                <Loader size={24} className="animate-spin" />
              </div>
              <h2 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 6px 0", color: "#F4F5F7" }}>
                Uploading to Supabase
              </h2>
              <p style={{ color: "#747A87", fontSize: "13px", margin: 0 }}>
                Compressing silhouette & syncing to cloud storage
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
