import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Search,
  MapPin,
  Bot,
  User,
  Loader2,
  ExternalLink,
  Shield,
  Zap,
  Cpu,
  BookmarkPlus,
  Trash2,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { ChatMessage, GroundingSource } from '../types.js';
import {
  sendChatMessage,
  fetchSearchGrounding,
  fetchMapsGrounding
} from '../api/client.js';

interface GeminiChatbotProps {
  cycloneName: string;
  landfallRegion?: string;
  criticalCount: number;
  highCount: number;
  userEmail?: string | null;
  onSaveBookmark?: (text: string) => void;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  cycloneName,
  landfallRegion,
  criticalCount,
  highCount,
  userEmail,
  onSaveBookmark
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      text: `Hello Commander. I am **Vayu AI**, your dedicated emergency response and tactical mitigation assistant.

Current Active Storm: **${cycloneName}**  
Landfall Target: **${landfallRegion || 'East Coast Maritime Sector'}**  
Vulnerable Assets: **${criticalCount} Critical**, **${highCount} High Risk**

How can I assist your operation? You can ask about **hospital vertical evacuation**, **substation de-energization**, **shelter supplies**, or use the one-click **Google Search** and **Google Maps Grounding** tools below.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-2.5-flash'
    }
  ]);

  const [input, setInput] = useState('');
  const [taskType, setTaskType] = useState<'general' | 'complex' | 'fast'>('general');
  const [loading, setLoading] = useState(false);
  const [groundingMode, setGroundingMode] = useState<'chat' | 'search' | 'maps'>('chat');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      if (groundingMode === 'search') {
        // Use Google Search Grounding (gemini-3.5-flash with googleSearch tool)
        const res = await fetchSearchGrounding({
          query: textToSend,
          cycloneName
        });
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'model',
          text: res.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: res.model,
          groundingType: 'search',
          sources: res.sources
        };
        setMessages((prev) => [...prev, botMsg]);
      } else if (groundingMode === 'maps') {
        // Use Google Maps Grounding (gemini-3.5-flash with googleMaps tool)
        const res = await fetchMapsGrounding({
          query: textToSend,
          lat: 19.81,
          lon: 85.83
        });
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'model',
          text: res.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: res.model,
          groundingType: 'maps',
          sources: res.sources
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        // Multi-turn chat with role-based Gemini models:
        // complex: gemini-3.1-pro-preview
        // general: gemini-3.5-flash
        // fast: gemini-3.1-flash-lite
        const conversationHistory = [...messages, userMsg].map((m) => ({
          role: m.role,
          text: m.text
        }));

        const res = await sendChatMessage({
          messages: conversationHistory,
          taskType,
          contextData: {
            cycloneName,
            landfallRegion,
            criticalAssetsCount: criticalCount,
            highAssetsCount: highCount
          }
        });

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'model',
          text: res.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: res.modelUsed,
          groundingType: 'none'
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `Commander, an advisory synchronization issue occurred. Please check network connectivity or retry: ${err?.message || 'Unknown error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'System Error Fallback'
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'model',
        text: `Conversation history reset. Tactical channel ready for **${cycloneName}**. Ask an operational question or select Google Search / Google Maps grounding.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.5-flash'
      }
    ]);
  };

  const quickPrompts = [
    { label: 'Hospital Triage Plan', prompt: 'What is the immediate vertical evacuation and oxygen cylinder protocol for coastal district hospitals?' },
    { label: 'Grid De-Energization', prompt: 'Outline the step-by-step 33kV & 11kV substation pre-emptive de-energization timeline before eyewall landfall.' },
    { label: 'Shelter Supply Checklist', prompt: 'Provide a mandatory supply checklist for 2,500-capacity multi-purpose cyclone shelters.' },
    { label: 'Search Real-time Bulletin', prompt: `Check latest meteorological warnings and track advisory for ${cycloneName}`, mode: 'search' as const },
    { label: 'Maps Emergency Shelters', prompt: 'Find hospitals, emergency medical centers, and cyclone relief shelters near coastal Puri and Paradip.', mode: 'maps' as const }
  ];

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm flex flex-col h-[650px] overflow-hidden">
      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-[#0C4A8A] via-[#0B5FA5] to-[#1D70B8] text-white flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <Bot className="w-5 h-5 text-sky-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                Vayu Tactical Assistant
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-300/30 font-medium">
                Multi-Turn Gemini
              </span>
            </div>
            <p className="text-[11px] text-sky-100/80">
              Role: Lead Scientific Disaster Mitigation Strategist • {cycloneName}
            </p>
          </div>
        </div>

        {/* Model Selector & Actions */}
        <div className="flex items-center gap-2 text-xs">
          {/* Task Type Switcher for Gemini */}
          <div className="flex items-center bg-white/10 p-0.5 rounded-lg border border-white/20 text-[11px]">
            <button
              onClick={() => setTaskType('fast')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                taskType === 'fast' ? 'bg-white text-[#0B5FA5] font-bold shadow-xs' : 'text-white/80 hover:text-white'
              }`}
              title="gemini-3.1-flash-lite: Low latency rapid tactical triage"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Fast</span>
            </button>
            <button
              onClick={() => setTaskType('general')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                taskType === 'general' ? 'bg-white text-[#0B5FA5] font-bold shadow-xs' : 'text-white/80 hover:text-white'
              }`}
              title="gemini-2.5-flash: Resilient real-time disaster advisory"
            >
              <Sparkles className="w-3 h-3 text-sky-300" />
              <span>General</span>
            </button>
            <button
              onClick={() => setTaskType('complex')}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                taskType === 'complex' ? 'bg-white text-[#0B5FA5] font-bold shadow-xs' : 'text-white/80 hover:text-white'
              }`}
              title="gemini-2.5-flash: Deep hydro-meteorological reasoning & multi-sector policy"
            >
              <Cpu className="w-3 h-3 text-purple-300" />
              <span>Pro</span>
            </button>
          </div>

          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Clear Chat Thread"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grounding Mode Toggle Bar */}
      <div className="bg-sky-50/70 border-b border-sky-100 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 font-medium text-slate-600">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mode:</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setGroundingMode('chat')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                groundingMode === 'chat'
                  ? 'bg-white text-[#0B5FA5] shadow-xs border border-sky-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Role Chat
            </button>
            <button
              onClick={() => setGroundingMode('search')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                groundingMode === 'search'
                  ? 'bg-[#0B5FA5] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3 h-3 text-sky-200" />
              <span>Google Search Grounding</span>
            </button>
            <button
              onClick={() => setGroundingMode('maps')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                groundingMode === 'maps'
                  ? 'bg-[#107C41] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3 h-3 text-emerald-200" />
              <span>Google Maps Grounding</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 hidden sm:block">
          Active Model:{' '}
          <span className="font-semibold text-slate-700">
            {groundingMode === 'search' || groundingMode === 'maps'
              ? 'gemini-3.5-flash (grounded)'
              : taskType === 'complex'
              ? 'gemini-3.1-pro-preview'
              : taskType === 'fast'
              ? 'gemini-3.1-flash-lite'
              : 'gemini-3.5-flash'}
          </span>
        </div>
      </div>

      {/* Quick Prompts Carousel */}
      <div className="px-4 py-1.5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-slate-400 text-[10px] font-bold uppercase whitespace-nowrap">Suggested:</span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (qp.mode) setGroundingMode(qp.mode);
              handleSend(qp.prompt);
            }}
            className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-sky-300 hover:text-[#0B5FA5] whitespace-nowrap transition-colors shadow-2xs cursor-pointer"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Messages Scrollable Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#FAFDFE] to-white">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#0B5FA5] flex items-center justify-center shrink-0 mt-0.5 border border-sky-200 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                  isUser
                    ? 'bg-[#0B5FA5] text-white rounded-tr-none'
                    : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none'
                }`}
              >
                {/* Meta Badge */}
                <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-75">
                  <span className="font-semibold">
                    {isUser ? (userEmail ? userEmail.split('@')[0] : 'Emergency Commander') : 'Vayu Strategist'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {msg.modelUsed && (
                      <span className="px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 text-[9px]">
                        {msg.modelUsed}
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {/* Message Body */}
                <div className="whitespace-pre-wrap font-sans text-xs space-y-1.5">
                  {msg.text}
                </div>

                {/* Grounding Sources (Google Search or Google Maps) */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1 text-[#0B5FA5] font-semibold mb-1.5">
                      {msg.groundingType === 'maps' ? (
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Search className="w-3.5 h-3.5 text-sky-600" />
                      )}
                      <span>
                        {msg.groundingType === 'maps'
                          ? 'Google Maps Verified Locations:'
                          : 'Google Search Verified Sources:'}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {msg.sources.map((src, i) => (
                        <li key={i}>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#0B5FA5] hover:underline font-medium break-all"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span>{src.title}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Save Bookmark Action */}
                {!isUser && onSaveBookmark && (
                  <div className="mt-2 pt-1 flex justify-end">
                    <button
                      onClick={() => {
                        onSaveBookmark(msg.text);
                        setToastMessage('Advisory saved to your persistent operational log!');
                        setTimeout(() => setToastMessage(null), 3000);
                      }}
                      className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-[#0B5FA5] transition-colors cursor-pointer"
                      title="Save this advisory to your persistent Firestore incident notes"
                    >
                      <BookmarkPlus className="w-3 h-3" />
                      <span>Bookmark Advisory</span>
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#0B5FA5] flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-600 shadow-2xs flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0B5FA5]" />
              <span>
                {groundingMode === 'search'
                  ? 'Querying real-time Google Search with gemini-3.5-flash...'
                  : groundingMode === 'maps'
                  ? 'Grounding spatial places with Google Maps & gemini-3.5-flash...'
                  : `Synthesizing tactical response via ${
                      taskType === 'complex'
                        ? 'gemini-3.1-pro-preview'
                        : taskType === 'fast'
                        ? 'gemini-3.1-flash-lite'
                        : 'gemini-3.5-flash'
                    }...`}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="mx-4 my-1 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Input Box */}
      <div className="p-3 bg-white border-t border-sky-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            id="gemini-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              groundingMode === 'search'
                ? 'Ask Google Search for latest storm advisories, road closures, or port alerts...'
                : groundingMode === 'maps'
                ? 'Search Google Maps for hospitals, trauma centers, and cyclone relief shelters...'
                : `Type emergency directive or ask tactical mitigation question...`
            }
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0B5FA5] focus:bg-white transition-all"
            disabled={loading}
          />
          <button
            id="gemini-chat-send-btn"
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-[#0B5FA5] hover:bg-[#0C4A8A] text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
