import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Shuffle,
  Loader,
  Save,
  MessageSquare,
  Lightbulb,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Shirt,
  X,
  RotateCcw
} from "lucide-react";
import { aiApi, outfitsApi } from "../api/client";
import { clothesApi } from "../api/client";
import { useOutfitStore } from "../store/store";
import toast from "react-hot-toast";

const OCCASIONS = ["casual", "formal", "party", "gym", "work", "outdoor", "date night"];

function SuggestionCard({ suggestion, items, onSave }) {
  const [saving, setSaving] = useState(false);
  const outfitItems = suggestion.item_ids
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(suggestion);
      toast.success("Outfit saved to your collection!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
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
            {suggestion.outfit_name}
          </h3>
          <span className="badge" style={{ fontSize: "11px", textTransform: "capitalize" }}>
            {suggestion.occasion}
          </span>
        </div>
        <button
          onClick={handleSave}
          className="btn-primary"
          style={{ minHeight: "36px", padding: "6px 14px", fontSize: "12.5px" }}
          disabled={saving}
        >
          {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
      </div>

      {/* Item thumbnails */}
      <div
        className="hide-scrollbar"
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "12px",
          overflowX: "auto",
          paddingBottom: "2px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {outfitItems.map((item) => (
          <div key={item.id} style={{ flexShrink: 0, textAlign: "center" }}>
            <img
              src={item.image_url}
              alt={item.name}
              style={{ width: "72px", height: "96px", objectFit: "cover", borderRadius: "10px", border: "1px solid #23262D" }}
            />
            <p style={{ margin: "3px 0 0 0", fontSize: "9.5px", color: "#8E94A0", maxWidth: "72px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.name}
            </p>
          </div>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: "12.5px", color: "#959BA7", lineHeight: 1.45 }}>
        "{suggestion.explanation}"
      </p>
    </motion.div>
  );
}

function ChatMessage({ msg }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
      marginBottom: "12px",
    }}>
      {msg.role === "assistant" && (
        <div style={{
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          marginRight: "8px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#181A20",
          border: "1px solid #272B35",
          color: "#F2EEE9",
        }}>
          <Sparkles size={13} strokeWidth={1.8} />
        </div>
      )}
      <div style={{
        maxWidth: "82%",
        borderRadius: "14px",
        padding: "10px 14px",
        fontSize: "13.5px",
        lineHeight: 1.45,
        backgroundColor: msg.role === "user" ? "#F2EEE9" : "#15161A",
        color: msg.role === "user" ? "#0C0D0E" : "#F4F5F7",
        fontWeight: msg.role === "user" ? "500" : "400",
        border: msg.role === "user" ? "1px solid #F2EEE9" : "1px solid #23262D",
        borderBottomRightRadius: msg.role === "user" ? "4px" : "14px",
        borderBottomLeftRadius: msg.role === "assistant" ? "4px" : "14px",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function AIStylist() {
  const { addOutfit } = useOutfitStore();
  const [wardrobeItems, setWardrobeItems] = useState([]);
  const [activeTab, setActiveTab] = useState("suggest"); // suggest | fitcheck | chat
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mirror Fit Check State
  const [fitFile, setFitFile] = useState(null);
  const [fitPreview, setFitPreview] = useState(null);
  const [fitOccasion, setFitOccasion] = useState("date night");
  const [fitQuestion, setFitQuestion] = useState("Does this outfit look good for this occasion?");
  const [fitLoading, setFitLoading] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  const fitFileInputRef = useRef(null);
  const fitCameraInputRef = useRef(null);

  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your AI Stylist. Tell me what event or vibe you're dressing for, and I'll assemble cohesive outfits directly from your wardrobe!"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    clothesApi.getAll().then((res) => setWardrobeItems(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const res = await aiApi.suggest({ occasion: selectedOccasion || null });
      setSuggestions(res.data.suggestions || []);
      if (!res.data.suggestions?.length) {
        toast("Add more clothes to generate outfit synergies!", { icon: "💡" });
      }
    } catch {
      toast.error("AI is busy right now. Please retry in a moment!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSurprise = async () => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const res = await aiApi.surprise();
      if (res.data.suggestion) setSuggestions([res.data.suggestion]);
      else toast("Add more clothes for surprise combos!", { icon: "🎲" });
    } catch {
      toast.error("Could not generate surprise outfit!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOutfit = async (suggestion) => {
    const res = await outfitsApi.create({
      name: suggestion.outfit_name,
      occasion: suggestion.occasion,
      items: suggestion.item_ids.map((id, idx) => ({ clothing_item_id: id, position: idx })),
    });
    addOutfit(res.data);
  };

  const handleFitPhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFitFile(file);
    setFitPreview(URL.createObjectURL(file));
    setFitResult(null);
  };

  const handleClearFitCheck = () => {
    setFitFile(null);
    if (fitPreview) URL.revokeObjectURL(fitPreview);
    setFitPreview(null);
    setFitResult(null);
  };

  const handleRunFitCheck = async () => {
    if (!fitFile) {
      toast.error("Please take or upload a photo first!");
      return;
    }
    setFitLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", fitFile);
      if (fitOccasion) formData.append("occasion", fitOccasion);
      if (fitQuestion) formData.append("question", fitQuestion);

      const res = await aiApi.fitCheck(formData);
      setFitResult(res.data);
      toast.success("Fit Check complete!");
    } catch {
      toast.error("Failed to analyze outfit. Please retry!");
    } finally {
      setFitLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await aiApi.chat({ message: chatInput });
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch {
      setChatMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I had trouble generating a reply. Please try again! 🙏"
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#0C0D0E", color: "#F4F5F7" }}>
      {/* Top Header & Tabs (Sticky) */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        padding: "14px 16px 10px 16px",
        backgroundColor: "#0C0D0E",
        borderBottom: "1px solid #1E2027",
      }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          {/* Segmented Switcher Tab */}
          <div style={{
            display: "flex",
            gap: "4px",
            padding: "4px",
            borderRadius: "12px",
            backgroundColor: "#141518",
            border: "1px solid #20232B",
          }}>
            <button
              onClick={() => setActiveTab("suggest")}
              style={{
                flex: 1,
                minHeight: "38px",
                borderRadius: "8px",
                border: activeTab === "suggest" ? "1px solid #2F333E" : "1px solid transparent",
                backgroundColor: activeTab === "suggest" ? "#1F222A" : "transparent",
                color: activeTab === "suggest" ? "#F4F5F7" : "#747A87",
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
              <Lightbulb size={14} /> Combos
            </button>

            <button
              onClick={() => setActiveTab("fitcheck")}
              style={{
                flex: 1,
                minHeight: "38px",
                borderRadius: "8px",
                border: activeTab === "fitcheck" ? "1px solid #2F333E" : "1px solid transparent",
                backgroundColor: activeTab === "fitcheck" ? "#1F222A" : "transparent",
                color: activeTab === "fitcheck" ? "#F4F5F7" : "#747A87",
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
              <Camera size={14} /> Fit Check
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              style={{
                flex: 1,
                minHeight: "38px",
                borderRadius: "8px",
                border: activeTab === "chat" ? "1px solid #2F333E" : "1px solid transparent",
                backgroundColor: activeTab === "chat" ? "#1F222A" : "transparent",
                color: activeTab === "chat" ? "#F4F5F7" : "#747A87",
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
              <MessageSquare size={14} /> Style Chat
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ padding: "16px", maxWidth: "680px", margin: "0 auto" }}>
        <AnimatePresence mode="wait">
          {/* ─── SUGGESTIONS TAB ──────────────────────────────────────────── */}
          {activeTab === "suggest" && (
            <motion.div
              key="suggest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {/* Occasion Filter & Trigger Box */}
              <div style={{
                backgroundColor: "#15161A",
                border: "1px solid #23262D",
                borderRadius: "16px",
                padding: "16px",
              }}>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "8px" }}>
                  Occasion Vibe
                </label>

                {/* Chips Carousel */}
                <div
                  className="hide-scrollbar"
                  style={{
                    display: "flex",
                    gap: "6px",
                    overflowX: "auto",
                    paddingBottom: "10px",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  {OCCASIONS.map((o) => {
                    const isSelected = selectedOccasion === o;
                    return (
                      <button
                        key={o}
                        onClick={() => setSelectedOccasion(isSelected ? "" : o)}
                        style={{
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                          fontSize: "12px",
                          padding: "6px 13px",
                          borderRadius: "8px",
                          border: isSelected ? "1px solid #F2EEE9" : "1px solid #23262D",
                          backgroundColor: isSelected ? "#F2EEE9" : "#121316",
                          color: isSelected ? "#0C0D0E" : "#8E94A0",
                          fontWeight: isSelected ? "600" : "500",
                          textTransform: "capitalize",
                          transition: "all 0.12s ease",
                        }}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleGetSuggestions}
                    disabled={isLoading}
                    id="get-suggestions-btn"
                  >
                    {isLoading ? <Loader size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    Generate Outfit
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={handleSurprise}
                    disabled={isLoading}
                    title="Surprise Me"
                    style={{ minWidth: "48px", padding: "10px" }}
                    id="surprise-btn"
                  >
                    <Shuffle size={16} />
                  </button>
                </div>
              </div>

              {/* Suggestions List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {isLoading && (
                  <div style={{ textAlign: "center", padding: "32px 16px" }}>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px 18px",
                      borderRadius: "12px",
                      backgroundColor: "#15161A",
                      border: "1px solid #23262D",
                    }}>
                      <Loader size={16} className="animate-spin" color="#F2EEE9" />
                      <span style={{ fontSize: "13px", color: "#8E94A0" }}>Styling best combinations...</span>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {suggestions.map((s, i) => (
                    <SuggestionCard key={i} suggestion={s} items={wardrobeItems} onSave={handleSaveOutfit} />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ─── FIT CHECK / MIRROR REVIEW TAB ────────────────────────────── */}
          {activeTab === "fitcheck" && (
            <motion.div
              key="fitcheck"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {/* Hidden file inputs */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fitCameraInputRef}
                style={{ display: "none" }}
                onChange={handleFitPhotoSelect}
              />
              <input
                type="file"
                accept="image/*"
                ref={fitFileInputRef}
                style={{ display: "none" }}
                onChange={handleFitPhotoSelect}
              />

              {/* Photo Input / Viewfinder */}
              {!fitPreview ? (
                <div style={{
                  backgroundColor: "#15161A",
                  border: "1px dashed #2B2F3A",
                  borderRadius: "18px",
                  padding: "36px 20px",
                  textAlign: "center",
                }}>
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    backgroundColor: "#1C1E24",
                    border: "1px solid #282C36",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#F2EEE9",
                    marginBottom: "14px",
                  }}>
                    <Camera size={26} strokeWidth={1.8} />
                  </div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "600", color: "#F4F5F7" }}>
                    Mirror Fit Check
                  </h3>
                  <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#8E94A0", maxWidth: "340px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.45 }}>
                    Snap your outfit in the mirror or lay out your clothes. AI will evaluate your fit, colors, and suggest improvements from your closet!
                  </p>

                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      className="btn-primary"
                      onClick={() => fitCameraInputRef.current?.click()}
                      style={{ minHeight: "44px", padding: "10px 18px", fontSize: "13px" }}
                    >
                      <Camera size={16} /> Snap Photo
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => fitFileInputRef.current?.click()}
                      style={{ minHeight: "44px", padding: "10px 18px", fontSize: "13px" }}
                    >
                      <Upload size={16} /> Upload Image
                    </button>
                  </div>
                </div>
              ) : (
                /* Selected Photo & Evaluation Card */
                <div style={{
                  backgroundColor: "#15161A",
                  border: "1px solid #23262D",
                  borderRadius: "18px",
                  padding: "16px",
                }}>
                  <div style={{ position: "relative", marginBottom: "16px", textAlign: "center" }}>
                    <img
                      src={fitPreview}
                      alt="Fit Preview"
                      style={{
                        width: "100%",
                        maxHeight: "360px",
                        objectFit: "contain",
                        backgroundColor: "#0C0D0E",
                        borderRadius: "12px",
                        border: "1px solid #23262D",
                      }}
                    />
                    <button
                      onClick={handleClearFitCheck}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(12, 13, 14, 0.85)",
                        border: "1px solid #2A2E37",
                        color: "#F4F5F7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                      title="Remove Photo"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Context Options */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "6px" }}>
                        Where are you heading?
                      </label>
                      <div
                        className="hide-scrollbar"
                        style={{
                          display: "flex",
                          gap: "6px",
                          overflowX: "auto",
                          paddingBottom: "4px",
                          WebkitOverflowScrolling: "touch",
                        }}
                      >
                        {OCCASIONS.map((occ) => {
                          const isSel = fitOccasion === occ;
                          return (
                            <button
                              key={occ}
                              type="button"
                              onClick={() => setFitOccasion(occ)}
                              style={{
                                whiteSpace: "nowrap",
                                cursor: "pointer",
                                fontSize: "11.5px",
                                padding: "5px 12px",
                                borderRadius: "8px",
                                border: isSel ? "1px solid #F2EEE9" : "1px solid #23262D",
                                backgroundColor: isSel ? "#F2EEE9" : "#121316",
                                color: isSel ? "#0C0D0E" : "#8E94A0",
                                fontWeight: isSel ? "600" : "500",
                                textTransform: "capitalize",
                              }}
                            >
                              {occ}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "6px" }}>
                        Specific Question (Optional)
                      </label>
                      <input
                        className="input"
                        placeholder="e.g. Does this look good? Should I swap the shoes?"
                        value={fitQuestion}
                        onChange={(e) => setFitQuestion(e.target.value)}
                        style={{ fontSize: "13px", minHeight: "40px" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn-primary"
                      style={{ flex: 1, minHeight: "44px" }}
                      onClick={handleRunFitCheck}
                      disabled={fitLoading}
                    >
                      {fitLoading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      {fitLoading ? "Analyzing Outfit..." : "Review My Look"}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => fitCameraInputRef.current?.click()}
                      disabled={fitLoading}
                      title="Retake"
                      style={{ minWidth: "44px", padding: 0 }}
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Fit Result Display */}
              {fitResult && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    backgroundColor: "#15161A",
                    border: "1px solid #23262D",
                    borderRadius: "18px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {/* Rating Header */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: "14px",
                    borderBottom: "1px solid #1E2027",
                  }}>
                    <div>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#8E94A0", fontWeight: "600" }}>
                        Stylist Verdict
                      </span>
                      <h4 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: "600", color: "#F4F5F7" }}>
                        {fitResult.verdict || "Look Breakdown"}
                      </h4>
                    </div>
                    {fitResult.score && (
                      <div style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        backgroundColor: "#1B1D23",
                        border: "1px solid #2B2F3A",
                        textAlign: "center",
                      }}>
                        <span style={{ fontSize: "18px", fontWeight: "700", color: "#F2EEE9" }}>
                          {fitResult.score}
                        </span>
                        <span style={{ fontSize: "11px", color: "#8E94A0" }}>/10</span>
                      </div>
                    )}
                  </div>

                  {/* Pros */}
                  {fitResult.pros?.length > 0 && (
                    <div>
                      <span style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "8px" }}>
                        What Works Well
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {fitResult.pros.map((pro, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <CheckCircle2 size={15} color="#A3B899" style={{ flexShrink: 0, marginTop: "2px" }} />
                            <span style={{ fontSize: "13px", color: "#D2D6DC", lineHeight: 1.45 }}>{pro}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fixes / Tweaks */}
                  {fitResult.fixes?.length > 0 && (
                    <div>
                      <span style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#747A87", fontWeight: "600", marginBottom: "8px" }}>
                        Stylist Tweaks to Elevate
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {fitResult.fixes.map((fix, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <AlertCircle size={15} color="#D1A76A" style={{ flexShrink: 0, marginTop: "2px" }} />
                            <span style={{ fontSize: "13px", color: "#D2D6DC", lineHeight: 1.45 }}>{fix}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Wardrobe closet swaps */}
                  {fitResult.closet_suggestions?.length > 0 && (
                    <div style={{
                      backgroundColor: "#111215",
                      border: "1px solid #1F222A",
                      borderRadius: "12px",
                      padding: "12px 14px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <Shirt size={14} color="#F2EEE9" />
                        <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#F2EEE9", fontWeight: "600" }}>
                          From Your Wardrobe
                        </span>
                      </div>
                      {fitResult.closet_suggestions.map((sug, idx) => (
                        <p key={idx} style={{ margin: "2px 0", fontSize: "12.5px", color: "#959BA7", lineHeight: 1.45 }}>
                          • {sug}
                        </p>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── CHAT TAB ─────────────────────────────────────────────────── */}
          {activeTab === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: "flex",
                flexDirection: "column",
                height: "calc(100dvh - 180px)",
              }}
            >
              {/* Messages area */}
              <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px", paddingBottom: "12px" }}>
                {chatMessages.map((msg, i) => (
                  <ChatMessage key={i} msg={msg} />
                ))}

                {isChatLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <div style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      backgroundColor: "#181A20",
                      border: "1px solid #272B35",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#F2EEE9",
                    }}>
                      <Sparkles size={13} />
                    </div>
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: "14px",
                      backgroundColor: "#15161A",
                      border: "1px solid #23262D",
                    }}>
                      <Loader size={14} className="animate-spin" color="#8E94A0" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Docked */}
              <div style={{
                display: "flex",
                gap: "8px",
                paddingTop: "8px",
                borderTop: "1px solid #1E2027",
                backgroundColor: "#0C0D0E",
              }}>
                <input
                  className="input"
                  style={{ flex: 1, minHeight: "44px" }}
                  placeholder="Ask for fashion advice, event pairing..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                  id="chat-input"
                />
                <button
                  className="btn-primary"
                  style={{ width: "48px", minHeight: "44px", padding: 0 }}
                  onClick={handleChatSend}
                  disabled={isChatLoading || !chatInput.trim()}
                  id="chat-send-btn"
                >
                  <Send size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
