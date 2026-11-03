import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "../socket"; // STOMP wrapper with the Socket.IO-style API
import {jwtDecode} from "jwt-decode";
import axiosInstance from "../utils/axiosInstance";

export default function ClubChat({ clubId, token: propToken }) {
  console.log("🔥 ClubChat mounted", { clubId, propToken });

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const listRef = useRef(null);

  const token = propToken || localStorage.getItem("accessToken");

  console.log("📌 Token & LocalStorage at start:", {
    token,
    localStorageUser: localStorage.getItem("user"),
    localStorageAccessToken: localStorage.getItem("accessToken"),
    localStorageRefresh: localStorage.getItem("refreshToken"),
  });

  const getCurrentUser = () => {
    try {
      const userJson = localStorage.getItem("user");
      console.log("getCurrentUser -> raw localStorage user:", userJson);
      if (userJson) {
        const parsed = JSON.parse(userJson);
        console.log("getCurrentUser -> parsed localStorage user:", parsed);
        if (parsed && (parsed._id || parsed.id)) {
          return { _id: parsed._id || parsed.id, ...parsed };
        }
      }
    } catch (e) {
      console.error("🔴 getCurrentUser JSON parse error:", e);
    }

    if (token) {
      try {
        const payload = jwtDecode(token);
        console.log("getCurrentUser -> JWT decoded:", payload);
        const id = payload.id || payload._id || payload.sub;
        if (id) return { _id: id, ...payload };
      } catch (e) {
        console.error("🔴 getCurrentUser JWT decode error:", e);
      }
    }

    return null;
  };

  const currentUser = getCurrentUser();
  console.log("👤 currentUser result:", currentUser);

  useEffect(() => {
    console.log("🔍 ClubChat useEffect fired", { clubId, token });

    if (!clubId) {
      console.warn("⚠ ClubChat useEffect: no clubId provided");
      setLoading(false);
      return;
    }

    if (!token) {
      console.warn("⚠ ClubChat useEffect: no auth token");
      setError("Not authenticated — please login.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchInitial() {
      console.log("📡 fetchInitial started");
      setLoading(true);

      try {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        console.log("📌 Axios auth header set:", axios.defaults.headers.common["Authorization"]);

        const chatRes = await axiosInstance.get(`/clubs/${clubId}/chat`);
        console.log("📨 GET /clubs/:clubId/chat response:", chatRes.status, chatRes.data);

        if (!cancelled) {
          setMessages(Array.isArray(chatRes.data?.data) ? chatRes.data.data : []);
        }

        const clubRes = await axiosInstance.get(`/clubs/${clubId}`);
        console.log("📨 GET /clubs/:clubId response:", clubRes.status, clubRes.data);

        const club = clubRes.data?.club ?? clubRes.data;
        console.log("🏷 Normalized club object:", club);

        let adminId = null;
        if (club?.admin) {
          if (typeof club.admin === "string") {
            adminId = club.admin;
          } else if (club.admin._id) {
            adminId = club.admin._id;
          } else if (Array.isArray(club.admin) && club.admin.length > 0) {
            adminId = club.admin[0]?._id ?? club.admin[0] ?? null;
          }
        }
        console.log("🔑 adminId resolved:", adminId);

        const userId = currentUser?._id ?? null;
        console.log("🆔 userId resolved:", userId);

        const adminMatch = userId && adminId && userId.toString() === adminId.toString();
        console.log("✅ Admin match result:", adminMatch);

        setIsAdmin(adminMatch);
        setLoading(false);
      } catch (err) {
        console.error("❌ fetchInitial error:", err);
        setError(err.response?.data?.error || err.message || "Failed to load chat");
        setLoading(false);
        setIsAdmin(false);
      }
    }

    fetchInitial();

    try {
      console.log("💬 Initializing socket connection...");
      const s = io("http://", { auth: { token } });
      socketRef.current = s;

      s.on("connect", () => {
        console.log("🔗 socket connected, id =", s.id);
        s.emit("join:club", { clubId }, (ack) => {
          console.log("📡 join:club ack:", ack);
        });
      });

      s.on("chat:new:club", (m) => {
        console.log("🔥 socket event chat:new:club:", m);
        setMessages((prev) => [...prev, m]);
        setTimeout(() => {
          if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
        }, 50);
      });

      s.on("connect_error", (err) => {
        console.error("⚠ socket connect_error:", err);
      });

      s.on("error", (err) => {
        console.error("⚠ socket error:", err);
      });
    } catch (e) {
      console.error("🔴 socket setup failed:", e);
    }

    return () => {
      console.log("🧹 ClubChat cleanup");
      cancelled = true;
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("leave:club", { clubId });
        socketRef.current.disconnect();
      }
      socketRef.current = null;
    };
  }, [clubId, token]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError(null);

    const payload = { clubId, message: text.trim() };

    try {
      await new Promise((resolve, reject) => {
        const s = socketRef.current;
        if (!s || !s.connected) return reject(new Error("Socket not connected"));
        s.emit("chat:send:club", payload, (ack) => {
          if (ack?.success) {
            console.log("chat:send:club ack:", ack);
            
            if (ack.data) {
              setMessages((prev) => {
                if (prev.some((m) => m._id === ack.data._id)) return prev;
                return [...prev, ack.data];
              });
            }

            setText("");
            resolve(ack.data);
          } else {
            reject(new Error(ack?.error || "send failed"));
          }
        });
      });
    } catch (sockErr) {
      try {
        const postRes = await axiosInstance.post(`/clubs/${clubId}/chat`, {
          message: text.trim(),
        });
        const newMsg = postRes.data?.data;
        if (newMsg) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === newMsg._id)) return prev;
            return [...prev, newMsg];
          });
        }
        setText("");
      } catch (restErr) {
        setError(restErr.response?.data?.error || restErr.message || "Send failed");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                Club Announcements
              </h3>
              <p className="text-sm text-slate-400 mt-1">Official updates and messages</p>
            </div>
            <div className="px-3 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <span className="text-xs text-slate-400">Room:</span>
              <span className="text-xs font-mono text-blue-400 ml-1">club:{clubId}</span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={listRef}
          className="h-80 overflow-auto p-6 bg-gradient-to-b from-slate-900/40 to-slate-900/60"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-sm">Loading messages…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <svg className="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="font-medium">No announcements yet</p>
              <p className="text-sm text-slate-600 mt-1">Check back later for updates</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, idx) => (
                <div 
                  key={m._id} 
                  className="group p-4 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-800/40 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 hover:shadow-lg"
                  style={{
                    animation: `slideIn 0.3s ease-out ${idx * 0.05}s both`
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                        {(m.sender?.username || m.sender?.name || "A").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-white">
                        {m.sender?.username || m.sender?.name || "Admin"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(m.createdAt || Date.now()).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-slate-200 leading-relaxed pl-10">
                    {m.message || m.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700/50 bg-slate-800/40 p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          
          <div className="flex gap-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && isAdmin) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={2}
              disabled={!isAdmin}
              placeholder={isAdmin ? "Write announcement… (Press Enter to send)" : "Only club admins can post announcements"}
              className={`flex-1 bg-slate-700/50 border rounded-xl p-3 text-white placeholder-slate-500 resize-none focus:outline-none transition-all ${
                isAdmin 
                  ? 'border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                  : 'border-slate-700/50 cursor-not-allowed opacity-60'
              }`}
            />
            
            <div className="flex flex-col gap-2">
              <button
                onClick={sendMessage}
                disabled={!isAdmin || sending || !text.trim()}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                  isAdmin && !sending && text.trim()
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                    : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                }`}
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm">Sending…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span className="text-sm">Send</span>
                  </>
                )}
              </button>

              {isAdmin && (
                <button
                  onClick={() => setText("")}
                  disabled={!text}
                  className="px-4 py-2 rounded-xl bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {!isAdmin && (
            <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>If you are an admin but cannot post, make sure you are logged in and part of this club.</span>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}