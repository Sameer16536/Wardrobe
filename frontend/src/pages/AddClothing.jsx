import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, X, Check, RefreshCw, Loader,
  ChevronLeft, SwitchCamera, Tag, Plus, AlertCircle,
  Sparkles, SlidersHorizontal, ChevronDown, ChevronUp, Video
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

const SUGGESTED_TAGS = [
  "favorite", "vintage", "oversized", "cotton", "linen",
  "streetwear", "minimal", "thrifted", "everyday", "workout"
];

export default function AddClothing() {
  const navigate = useNavigate();
  const { addItem } = useWardrobeStore();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  const [step, setStep] = useState("capture"); // capture | preview | edit | saving
  const [captureMode, setCaptureMode] = useState("camera"); // camera | upload
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  // Form states - AI handles category, colors, seasons, occasions automatically
  const [tagInput, setTagInput] = useState("");
  const [showManualOverrides, setShowManualOverrides] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tags: [],
    category: "",
    colors: [],
    seasons: [],
    occasions: [],
    brand: "",
    notes: "",
  });

  // Enumerate camera devices on mount
  useEffect(() => {
    async function loadDevices() {
      try {
        if (navigator?.mediaDevices?.enumerateDevices) {
          const devs = await navigator.mediaDevices.enumerateDevices();
          const vDevs = devs.filter((d) => d.kind === "videoinput");
          setVideoDevices(vDevs);
          if (vDevs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(vDevs[0].deviceId);
          }
        }
      } catch (e) {
        console.warn("Could not list video devices:", e);
      }
    }
    loadDevices();
  }, []);

  // Stop camera when unmounting or switching to upload mode
  useEffect(() => {
    if (captureMode === "upload") {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [captureMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async (deviceIdToUse) => {
    setCameraLoading(true);
    setCameraError(null);

    try {
      stopCamera();

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported on this browser.");
      }

      let stream = null;
      const targetDeviceId = deviceIdToUse || selectedDeviceId;

      // 1. Try selected device ID if available
      if (targetDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: targetDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (err) {
          console.warn("Selected deviceId failed, trying fallback:", err);
        }
      }

      // 2. Try standard facing mode or resolution constraint
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (err) {
          console.warn("Resolution constraint failed, trying basic video:", err);
        }
      }

      // 3. Fallback: simplest video constraint (broadest compatibility)
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err) {
          // 4. If failed with NotReadableError, iterate through other detected video devices
          try {
            const allDevs = await navigator.mediaDevices.enumerateDevices();
            const vInputs = allDevs.filter((d) => d.kind === "videoinput");
            setVideoDevices(vInputs);

            for (const d of vInputs) {
              if (d.deviceId && d.deviceId !== targetDeviceId) {
                try {
                  stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: d.deviceId } },
                    audio: false,
                  });
                  if (stream) {
                    setSelectedDeviceId(d.deviceId);
                    break;
                  }
                } catch {}
              }
            }
          } catch {}

          if (!stream) {
            throw err;
          }
        }
      }

      streamRef.current = stream;

      // Update video devices list with labels now that permission is active
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const vDevs = devs.filter((d) => d.kind === "videoinput");
        setVideoDevices(vDevs);
      } catch {}

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);

        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video play warning (safe):", playErr);
        }
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraActive(false);

      let msg = "Unable to access camera on this device.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission was denied in your browser. Click the lock icon in the address bar to allow camera access.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        msg = "Camera is currently locked by another application (Windows Camera app, Zoom, Teams, Discord, OBS, or another tab). Please close any app using your camera and click Retry.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No camera was detected on this PC. Please connect a webcam or choose an image from files.";
      } else if (err.message) {
        msg = `${err.message}. If another app is using the webcam, close it and retry.`;
      }
      setCameraError(msg);
    } finally {
      setCameraLoading(false);
    }
  };

  const handleDeviceChange = (e) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    if (cameraActive) {
      startCamera(newId);
    }
  };

  const flipCamera = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    // If multiple devices, cycle to next device
    if (videoDevices.length > 1) {
      const currIdx = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIdx = (currIdx + 1) % videoDevices.length;
      const nextDevice = videoDevices[nextIdx];
      setSelectedDeviceId(nextDevice.deviceId);
      if (cameraActive) {
        startCamera(nextDevice.deviceId);
      }
    } else if (cameraActive) {
      startCamera();
    }
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

  const handleAddTag = (text) => {
    const tag = (text || tagInput).trim().toLowerCase().replace(/^#/, "");
    if (!tag) return;
    if (form.tags.map((t) => t.toLowerCase()).includes(tag)) {
      toast("Tag already added", { icon: "ℹ️" });
      setTagInput("");
      return;
    }
    setForm((prev) => ({
      ...prev,
      tags: [...prev.tags, tag],
    }));
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const toggleArrayField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSave = async () => {
    if (!imageFile) return;
    setStep("saving");
    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      // User custom tags & optional label
      if (form.name?.trim()) {
        formData.append("name", form.name.trim());
      }
      formData.append("tags", JSON.stringify(form.tags || []));

      // Optional manual overrides (AI will fill these automatically if empty!)
      if (form.category?.trim()) {
        formData.append("category", form.category.trim());
      }
      formData.append("colors", JSON.stringify(form.colors || []));
      formData.append("seasons", JSON.stringify(form.seasons || []));
      formData.append("occasions", JSON.stringify(form.occasions || []));
      if (form.brand?.trim()) {
        formData.append("brand", form.brand.trim());
      }
      if (form.notes?.trim()) {
        formData.append("notes", form.notes.trim());
      }

      // Always run AI vision analysis to detect category, colors, seasons & styling tags
      formData.append("use_ai_tags", "true");

      const res = await clothesApi.add(formData);
      addItem(res.data);
      toast.success("✨ Cataloged by AI into your wardrobe!");
      navigate("/wardrobe");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save garment. Please check connection.");
      setStep("edit");
    }
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
          {step === "capture" && "Add Garment"}
          {step === "preview" && "Verify Photo"}
          {step === "edit" && "Garment Tags"}
          {step === "saving" && "AI Cataloging"}
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
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {/* Clean Mode Switcher: Camera vs Upload */}
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
                  onClick={() => {
                    setCaptureMode("camera");
                    setCameraError(null);
                  }}
                  style={{
                    flex: 1,
                    minHeight: "38px",
                    borderRadius: "8px",
                    border: captureMode === "camera" ? "1px solid #2F333E" : "1px solid transparent",
                    backgroundColor: captureMode === "camera" ? "#1F222A" : "transparent",
                    color: captureMode === "camera" ? "#F4F5F7" : "#747A87",
                    fontSize: "13px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  <Camera size={16} /> Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setCaptureMode("upload");
                  }}
                  style={{
                    flex: 1,
                    minHeight: "38px",
                    borderRadius: "8px",
                    border: captureMode === "upload" ? "1px solid #2F333E" : "1px solid transparent",
                    backgroundColor: captureMode === "upload" ? "#1F222A" : "transparent",
                    color: captureMode === "upload" ? "#F4F5F7" : "#747A87",
                    fontSize: "13px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  <Upload size={16} /> Upload Photo
                </button>
              </div>

              {/* CAMERA MODE */}
              {captureMode === "camera" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "3/4",
                      borderRadius: "20px",
                      overflow: "hidden",
                      backgroundColor: "#131417",
                      border: "1px solid #23262D",
                      boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* Live Camera View */}
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        zIndex: cameraActive ? 5 : 0,
                        opacity: cameraActive ? 1 : 0,
                        pointerEvents: cameraActive ? "auto" : "none",
                        transition: "opacity 0.2s ease",
                      }}
                    />

                    {/* Camera Active Controls Overlay */}
                    {cameraActive && (
                      <div style={{
                        position: "absolute",
                        top: "14px",
                        left: "14px",
                        right: "14px",
                        display: "flex",
                        justifyContent: "space-between",
                        zIndex: 10,
                      }}>
                        <button
                          onClick={stopCamera}
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(12, 13, 14, 0.7)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#F4F5F7",
                            cursor: "pointer",
                          }}
                          title="Close camera"
                        >
                          <X size={18} />
                        </button>

                        <button
                          onClick={flipCamera}
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(12, 13, 14, 0.7)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#F4F5F7",
                            cursor: "pointer",
                          }}
                          title="Switch camera device"
                        >
                          <SwitchCamera size={18} />
                        </button>
                      </div>
                    )}

                    {/* Camera Off / Ready State */}
                    {!cameraActive && (
                      <div style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "14px",
                        padding: "24px",
                        textAlign: "center",
                        zIndex: 1,
                      }}>
                        <div style={{
                          width: "68px",
                          height: "68px",
                          borderRadius: "18px",
                          backgroundColor: "#181A20",
                          border: "1px solid #282C35",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#F2EEE9",
                        }}>
                          <Camera size={30} />
                        </div>

                        <div>
                          <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600", color: "#F4F5F7" }}>
                            Device Camera
                          </h3>
                          <p style={{ margin: 0, fontSize: "13px", color: "#8E94A0", maxWidth: "260px" }}>
                            Turn on your camera to capture and auto-tag your clothing item
                          </p>
                        </div>

                        {cameraError && (
                          <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            padding: "12px 14px",
                            borderRadius: "12px",
                            backgroundColor: "#2B1616",
                            border: "1px solid #4D2626",
                            color: "#FCA5A5",
                            fontSize: "12px",
                            textAlign: "left",
                            maxWidth: "340px",
                            lineHeight: 1.45,
                          }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                              <span>{cameraError}</span>
                            </div>

                            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                              <button
                                type="button"
                                onClick={() => startCamera()}
                                style={{
                                  background: "#3D1C1C",
                                  border: "1px solid #6E2F2F",
                                  color: "#FEE2E2",
                                  borderRadius: "6px",
                                  padding: "4px 10px",
                                  fontSize: "11.5px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                              >
                                🔄 Retry Camera
                              </button>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                  background: "transparent",
                                  border: "1px solid #4D2626",
                                  color: "#FCA5A5",
                                  borderRadius: "6px",
                                  padding: "4px 10px",
                                  fontSize: "11.5px",
                                  cursor: "pointer",
                                }}
                              >
                                📁 Choose Photo
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Camera device selection if multiple cameras exist */}
                        {videoDevices.length > 1 && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", maxWidth: "260px", width: "100%" }}>
                            <Video size={13} style={{ color: "#747A87", flexShrink: 0 }} />
                            <select
                              value={selectedDeviceId}
                              onChange={handleDeviceChange}
                              style={{
                                width: "100%",
                                backgroundColor: "#181A20",
                                color: "#D4D8E2",
                                border: "1px solid #282C35",
                                borderRadius: "8px",
                                padding: "6px 10px",
                                fontSize: "11.5px",
                                outline: "none",
                              }}
                            >
                              {videoDevices.map((d, idx) => (
                                <option key={d.deviceId || idx} value={d.deviceId}>
                                  {d.label || `Camera ${idx + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => startCamera()}
                          disabled={cameraLoading}
                          className="btn-primary"
                          style={{
                            marginTop: "4px",
                            padding: "10px 28px",
                            fontSize: "14px",
                            fontWeight: "600",
                          }}
                        >
                          {cameraLoading ? (
                            <>
                              <Loader size={16} className="animate-spin" />
                              <span>Opening Camera...</span>
                            </>
                          ) : (
                            <>
                              <Camera size={16} />
                              <span>Open Camera</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <canvas ref={canvasRef} style={{ display: "none" }} />
                  </div>

                  {/* Camera Controls Below View */}
                  {cameraActive ? (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "12px",
                      backgroundColor: "#131417",
                      border: "1px solid #20232B",
                      borderRadius: "18px",
                    }}>
                      <button
                        onClick={takePhoto}
                        style={{
                          width: "72px",
                          height: "72px",
                          borderRadius: "50%",
                          backgroundColor: "transparent",
                          border: "4px solid #F2EEE9",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "transform 0.1s ease",
                        }}
                        title="Take photo"
                        id="take-photo-btn"
                      >
                        <div style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          backgroundColor: "#F2EEE9",
                        }} />
                      </button>
                    </div>
                  ) : (
                    /* Helpful secondary actions when camera is off */
                    <div style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "14px",
                      alignItems: "center",
                      padding: "6px 0",
                    }}>
                      <button
                        type="button"
                        onClick={() => nativeCameraInputRef.current?.click()}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#8E94A0",
                          fontSize: "12.5px",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        <Camera size={14} /> Snap with phone camera
                      </button>

                      <span style={{ color: "#3B404D" }}>•</span>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#8E94A0",
                          fontSize: "12.5px",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        <Upload size={14} /> Choose from files
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* UPLOAD / GALLERY MODE */}
              {captureMode === "upload" && (
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
                    boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <div style={{
                    width: "68px",
                    height: "68px",
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
                    Select Photo from Device
                  </h3>
                  <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#8E94A0", maxWidth: "260px", lineHeight: 1.45 }}>
                    Tap to browse image files or drag & drop a photo of your clothing item
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ minHeight: "42px", padding: "8px 24px", fontSize: "13px", pointerEvents: "none" }}
                  >
                    Browse Files
                  </button>
                </div>
              )}

              {/* Hidden file inputs */}
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

              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "12px", color: "#6A707E" }}>
                  Tip: Lay garment flat with clear lighting for best AI styling tags
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
                  }}
                >
                  <RefreshCw size={15} /> Retake
                </button>

                <button
                  className="btn-primary"
                  style={{ flex: 1.4 }}
                  onClick={() => setStep("edit")}
                  id="confirm-photo-btn"
                >
                  <Check size={16} /> Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: ATTRICENT-STYLE ZERO-FRICTION DETAILS & TAGS ──────── */}
          {step === "edit" && (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: "18px", paddingBottom: "24px" }}
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
                    Garment Nickname (optional)
                  </div>
                  <input
                    className="input"
                    placeholder="Leave empty for AI to auto-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{ minHeight: "38px", fontSize: "13.5px" }}
                  />
                </div>
              </div>

              {/* ─── CUSTOM TAGS (THE ONLY THING USER NEEDS TO ADD!) ────────── */}
              <div style={{
                backgroundColor: "#15161A",
                border: "1px solid #282C35",
                borderRadius: "16px",
                padding: "16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    color: "#F2EEE9",
                    fontWeight: "600",
                    margin: 0,
                  }}>
                    <Tag size={15} /> Your Custom Tags
                  </label>
                  <span style={{ fontSize: "11px", color: "#8E94A0" }}>
                    For personal search & filters
                  </span>
                </div>
                <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#747A87", lineHeight: 1.4 }}>
                  Add any personal tags you want (e.g. #favorite, #vintage, #thrifted). Everything else is handled automatically by AI!
                </p>

                {/* Tag Input */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <input
                    className="input"
                    placeholder="Type a tag and press Enter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    style={{ minHeight: "40px", fontSize: "13px" }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    className="btn-secondary"
                    style={{ minHeight: "40px", padding: "0 16px", fontSize: "13px", flexShrink: 0 }}
                  >
                    <Plus size={15} /> Add
                  </button>
                </div>

                {/* Active Tags */}
                {form.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px 10px",
                          borderRadius: "8px",
                          backgroundColor: "#1E2129",
                          border: "1px solid #363C4C",
                          color: "#F4F5F7",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#8E94A0",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggested Quick Tags */}
                <div>
                  <div style={{ fontSize: "11px", color: "#6A707E", marginBottom: "6px", fontWeight: "500" }}>
                    Quick-add suggestions:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {SUGGESTED_TAGS.filter((t) => !form.tags.includes(t)).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleAddTag(suggestion)}
                        style={{
                          background: "#101114",
                          border: "1px dashed #282C35",
                          borderRadius: "6px",
                          padding: "4px 9px",
                          fontSize: "11.5px",
                          color: "#9AA0AF",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <Plus size={11} /> #{suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ─── AI HEAVY-LIFTING PROMISE CARD ──────────────────────────── */}
              <div style={{
                background: "linear-gradient(135deg, rgba(30, 33, 42, 0.6) 0%, rgba(20, 22, 28, 0.8) 100%)",
                border: "1px solid #2B303C",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#F2EEE9" }}>
                  <Sparkles size={18} style={{ color: "#E0D7C9" }} />
                  <span style={{ fontSize: "13.5px", fontWeight: "600" }}>
                    Gemini Vision AI does the heavy lifting
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "#8E94A0", lineHeight: 1.5 }}>
                  When you save, our fashion AI will automatically analyze your photo and detect:
                </p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                  fontSize: "11.5px",
                  color: "#C5C9D3",
                  marginTop: "2px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ color: "#8E94A0" }}>✓</span> Category & Silhouette
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ color: "#8E94A0" }}>✓</span> Dominant Colors
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ color: "#8E94A0" }}>✓</span> Suitable Seasons
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ color: "#8E94A0" }}>✓</span> Occasion Vibes
                  </div>
                </div>
              </div>

              {/* ─── OPTIONAL MANUAL OVERRIDES (COLLAPSED BY DEFAULT) ────────── */}
              <div style={{
                border: "1px solid #20232B",
                borderRadius: "14px",
                backgroundColor: "#111215",
                overflow: "hidden",
              }}>
                <button
                  type="button"
                  onClick={() => setShowManualOverrides(!showManualOverrides)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "transparent",
                    border: "none",
                    color: "#7E8592",
                    fontSize: "12px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <SlidersHorizontal size={13} />
                    Optional: Manually override category or colors
                  </span>
                  {showManualOverrides ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showManualOverrides && (
                  <div style={{ padding: "0 14px 14px 14px", display: "flex", flexDirection: "column", gap: "16px", borderTop: "1px solid #1E2027", paddingTop: "12px" }}>
                    {/* Category */}
                    <div>
                      <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "6px" }}>
                        Category Override
                      </label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {CATEGORIES.map((cat) => {
                          const isSelected = form.category === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setForm({ ...form, category: isSelected ? "" : cat })}
                              style={{
                                cursor: "pointer",
                                fontSize: "11px",
                                padding: "4px 9px",
                                borderRadius: "6px",
                                border: isSelected ? "1px solid #F2EEE9" : "1px solid #23262D",
                                backgroundColor: isSelected ? "#F2EEE9" : "#141518",
                                color: isSelected ? "#0C0D0E" : "#8E94A0",
                                fontWeight: isSelected ? "600" : "500",
                                textTransform: "capitalize",
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
                      <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "6px" }}>
                        Colors Override
                      </label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {COLORS.map((c) => {
                          const isSelected = form.colors.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => toggleArrayField("colors", c)}
                              style={{
                                cursor: "pointer",
                                fontSize: "11px",
                                padding: "4px 9px",
                                borderRadius: "6px",
                                border: isSelected ? "1px solid #F2EEE9" : "1px solid #23262D",
                                backgroundColor: isSelected ? "#F2EEE9" : "#141518",
                                color: isSelected ? "#0C0D0E" : "#8E94A0",
                                textTransform: "capitalize",
                              }}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Brand */}
                    <input
                      className="input"
                      placeholder="Brand / Designer (optional)"
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      style={{ minHeight: "36px", fontSize: "12.5px" }}
                    />
                  </div>
                )}
              </div>

              {/* Primary Save Button (Centered with form on desktop, fully visible above nav bar on mobile) */}
              <div style={{ paddingTop: "8px" }}>
                <button
                  className="btn-primary"
                  style={{
                    width: "100%",
                    minHeight: "48px",
                    fontSize: "15px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 18px rgba(0, 0, 0, 0.4)",
                  }}
                  onClick={handleSave}
                  id="save-to-wardrobe-btn"
                >
                  <Sparkles size={17} /> Save & Auto-Catalog with AI
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 4: AI CATALOGING SPINNER ───────────────────────────── */}
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
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                backgroundColor: "#16171B",
                border: "1px solid #2B303C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F2EEE9",
                marginBottom: "20px",
              }}>
                <Sparkles size={28} className="animate-pulse" />
              </div>

              <h2 style={{ fontSize: "17px", fontWeight: "600", margin: "0 0 8px 0", color: "#F4F5F7" }}>
                AI is Cataloging Your Garment
              </h2>
              <p style={{ color: "#8E94A0", fontSize: "13px", margin: "0 0 24px 0", maxWidth: "280px", lineHeight: 1.45 }}>
                Scanning silhouette, detecting colors, occasions & styling tags with Gemini Vision...
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6A707E", fontSize: "12px" }}>
                <Loader size={14} className="animate-spin" />
                <span>Syncing to your digital wardrobe</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
