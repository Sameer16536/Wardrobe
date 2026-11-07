import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Shuffle, Loader, Save, MessageSquare, Lightbulb } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("suggest"); // suggest | chat
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
              <Lightbulb size={14} /> Suggestions
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
