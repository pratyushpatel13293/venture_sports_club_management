import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "../socket"; // STOMP wrapper with the Socket.IO-style API
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function EventQueries() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const BACKEND = import.meta.env.VITE_API_URL || "http://";

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  // auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return;
    }

    // load history
    const loadHistory = async () => {
      try {
        const res = await axiosInstance.get(
          `/events/${eventId}/queries`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(res.data?.data || []);
      } catch (e) {
        console.error("history fetch failed", e);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();

    // socket
    const s = io(BACKEND, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = s;

    s.on("query:new", (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => s.disconnect();
  }, [eventId, navigate]);

  const sendMessage = () => {
    if (!text.trim()) return;
    const msg = text;
    setText("");

    socketRef.current.emit(
      "query:send",
      { eventId, message: msg },
      () => {}
    );
  };

  // helper for date label
  const formatDate = (d) =>
    new Date(d).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  let lastDate = null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col text-white">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .message-appear {
          animation: slideUp 0.3s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.7);
        }
      `}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="relative px-8 py-6 flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="group w-11 h-11 rounded-xl bg-slate-800/50 hover:bg-indigo-600/20 border border-slate-700/50 hover:border-indigo-500/50 flex items-center justify-center transition-all duration-300 hover:scale-105"
          >
            <i className="fa-solid fa-arrow-left text-slate-400 group-hover:text-indigo-400 transition-colors"></i>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white">Event Support</h2>
              <div className="px-3 py-1 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Online
              </div>
            </div>
            <p className="text-sm text-slate-400">Private chat with event organizers</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
              <i className="fa-solid fa-headset"></i>
            </div>
          </div>
        </div>
      </div>

      {/* CHAT BODY */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 flex items-center justify-center mb-6">
              <i className="fa-solid fa-comments text-slate-600 text-4xl"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No messages yet</h3>
            <p className="text-slate-400">Start the conversation with the event organizers</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderRole === "participant";
            const msgDate = formatDate(m.createdAt);
            const showDate = msgDate !== lastDate;
            lastDate = msgDate;

            return (
              <React.Fragment key={m._id}>
                {/* DATE SEPARATOR */}
                {showDate && (
                  <div className="flex justify-center my-8">
                    <div className="px-4 py-2 rounded-full bg-slate-800/50 backdrop-blur-md border border-slate-700/50 text-xs font-medium text-slate-400">
                      {msgDate}
                    </div>
                  </div>
                )}

                {/* MESSAGE */}
                <div
                  className={`flex ${
                    isMe ? "justify-end" : "justify-start"
                  } message-appear`}
                >
                  <div className="flex items-end gap-3 max-w-[70%]">
                    {!isMe && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg shadow-purple-500/30">
                        <i className="fa-solid fa-user-tie"></i>
                      </div>
                    )}
                    <div
                      className={`relative overflow-hidden rounded-2xl px-5 py-4 ${
                        isMe
                          ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm shadow-lg shadow-indigo-500/30"
                          : "bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 text-white rounded-bl-sm"
                      }`}
                    >
                      {!isMe && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                      )}
                      <div className="text-xs font-semibold opacity-70 mb-2 flex items-center gap-2">
                        {isMe ? (
                          <>
                            <i className="fa-solid fa-user"></i>
                            You
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-shield-halved"></i>
                            Organizer
                          </>
                        )}
                      </div>
                      <div className="text-[15px] leading-relaxed">{m.message}</div>
                      <div className="text-[11px] opacity-60 mt-2 text-right flex items-center justify-end gap-1">
                        <i className="fa-solid fa-clock"></i>
                        {formatTime(m.createdAt)}
                      </div>
                    </div>
                    {isMe && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg shadow-indigo-500/30">
                        <i className="fa-solid fa-user"></i>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-purple-600/5 to-transparent"></div>
        <div className="relative px-8 py-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <textarea
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900/70 transition-all resize-none custom-scrollbar"
                placeholder="Type your message..."
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-slate-500">
                <i className="fa-solid fa-info-circle"></i>
                <span>Press Enter to send</span>
              </div>
            </div>
            <button
              onClick={sendMessage}
              className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg shadow-indigo-500/30 flex items-center gap-3"
            >
              <span>Send</span>
              <i className="fa-solid fa-paper-plane group-hover:translate-x-1 transition-transform"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}