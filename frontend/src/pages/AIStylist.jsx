import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Shuffle, Loader, Save, ChevronDown } from "lucide-react";
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{suggestion.outfit_name}</h3>
          <span className="badge" style={{ fontSize: "11px", marginTop: "4px", display: "inline-flex" }}>
            {suggestion.occasion}
          </span>
        </div>
        <button onClick={handleSave} className="btn-primary" style={{ padding: "8px 14px", fontSize: "13px" }}
                disabled={saving}>
          {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
      </div>

      {/* Item thumbnails */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {outfitItems.map((item) => (
          <div key={item.id} className="flex-shrink-0 text-center">
            <img src={item.image_url} alt={item.name}
                 className="w-20 h-28 object-cover rounded-xl" />
            <p style={{ fontSize: "10px", color: "#71717A", marginTop: "4px" }}>{item.name}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: "13px", color: "#A1A1AA", fontStyle: "italic" }}>
        "{suggestion.explanation}"
      </p>
    </motion.div>
  );
}

function ChatMessage({ msg }) {
  return (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3`}>
      {msg.role === "assistant" && (
        <div className="w-7 h-7 rounded-lg mr-2 flex-shrink-0 flex items-center justify-center"
             style={{ backgroundColor: "#181A20", border: "1px solid #272B35", color: "#F2EEE9" }}>
          <Sparkles size={12} strokeWidth={1.8} />
        </div>
      )}
      <div className={`max-w-xs rounded-xl px-4 py-2.5 text-sm ${
        msg.role === "user"
          ? "rounded-br-xs"
          : "rounded-bl-xs"
      }`}
           style={msg.role === "user"
             ? { backgroundColor: "#F2EEE9", color: "#0C0D0E", fontWeight: "500" }
             : { backgroundColor: "#15161A", color: "#F4F5F7", border: "1px solid #23262D" }}>
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
    { role: "assistant", content: "Hey! I'm StyleAI 👋 Tell me about an upcoming event or ask for fashion advice, and I'll help you style an outfit from your wardrobe!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    clothesApi.getAll().then((res) => setWardrobeItems(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const res = await aiApi.suggest({ occasion: selectedOccasion || null });
      setSuggestions(res.data.suggestions || []);
      if (!res.data.suggestions?.length) {
        toast("Add more clothes to get outfit suggestions!", { icon: "💡" });
      }
    } catch {
      toast.error("AI is busy — try again in a moment!");
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
      else toast("Add more items to get a surprise!", { icon: "🎲" });
    } catch {
      toast.error("AI couldn't surprise you this time!");
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
        content: "Sorry, I'm having connection issues. Please try again! 🙏"
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0C0D0E", color: "#F4F5F7" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-6 py-4"
           style={{ background: "#0C0D0E", borderBottom: "1px solid #1F2128" }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: "#181A20", border: "1px solid #272B35", color: "#F2EEE9" }}>
              <Sparkles size={18} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ letterSpacing: "-0.02em" }}>AI Stylist</h1>
              <p style={{ color: "#747A87", fontSize: "12px" }}>Gemini Intelligence Studio</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#141518", border: "1px solid #1F2128" }}>
            {["suggest", "chat"].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150"
                        style={isActive
                          ? { background: "#1F222A", color: "#F4F5F7", border: "1px solid #2F333E" }
                          : { color: "#747A87", border: "1px solid transparent" }}>
                  {tab === "suggest" ? "Outfit Suggestions" : "Stylist Consultation"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {/* SUGGESTIONS TAB */}
          {activeTab === "suggest" && (
            <motion.div key="suggest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Controls */}
              <div className="card p-5 mb-6">
                <p className="text-xs uppercase tracking-wider mb-3 font-semibold" style={{ color: "#747A87" }}>Select Occasion</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {OCCASIONS.map((o) => {
                    const isSelected = selectedOccasion === o;
                    return (
                      <button key={o} onClick={() => setSelectedOccasion(o === selectedOccasion ? "" : o)}
                              style={{
                                cursor: "pointer",
                                fontSize: "12px",
                                padding: "5px 12px",
                                borderRadius: "6px",
                                border: isSelected ? "1px solid #F2EEE9" : "1px solid #23262D",
                                backgroundColor: isSelected ? "#F2EEE9" : "#141518",
                                color: isSelected ? "#0C0D0E" : "#898F9C",
                                fontWeight: isSelected ? "600" : "500",
                              }}>
                        {o}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <button className="btn-primary flex-1 justify-center" onClick={handleGetSuggestions}
                          disabled={isLoading} id="get-suggestions-btn">
                    {isLoading ? <Loader size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    Generate Suggestions
                  </button>
                  <button className="btn-secondary justify-center" onClick={handleSurprise}
                          disabled={isLoading} style={{ padding: "11px 16px" }} title="Surprise Me!" id="surprise-btn">
                    <Shuffle size={15} />
                  </button>
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-4">
                {isLoading && (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl"
                         style={{ background: "#15161A", border: "1px solid #23262D" }}>
                      <Loader size={16} style={{ color: "#F2EEE9" }} className="animate-spin" />
                      <span style={{ color: "#8E94A0", fontSize: "13px" }}>Analyzing wardrobe synergies...</span>
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

          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 pr-1">
                {chatMessages.map((msg, i) => (
                  <ChatMessage key={i} msg={msg} />
                ))}
                {isChatLoading && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                         style={{ backgroundColor: "#181A20", border: "1px solid #272B35", color: "#F2EEE9" }}>
                      <Sparkles size={12} />
                    </div>
                    <div className="px-4 py-2.5 rounded-xl rounded-bl-xs"
                         style={{ background: "#15161A", border: "1px solid #23262D" }}>
                      <div className="flex gap-1.5 items-center">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full"
                               style={{ background: "#8E94A0", animation: "pulse 1.2s infinite ease-in-out", animationDelay: `${i * 0.2}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-3">
                <input className="input flex-1" placeholder="Ask your stylist anything..."
                       value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                       onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                       id="chat-input" />
                <button className="btn-primary" style={{ padding: "12px 16px" }}
                        onClick={handleChatSend} disabled={isChatLoading || !chatInput.trim()}
                        id="chat-send-btn">
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
