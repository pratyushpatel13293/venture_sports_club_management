// src/components/AdminEventQueries.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "../socket"; // STOMP wrapper with the Socket.IO-style API
import { useParams } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function AdminEventQueries() {
  const { clubid, eventId } = useParams();
  const BACKEND = import.meta.env.VITE_API_URL || "http://";

  const [threads, setThreads] = useState({});
  const [participantsOrder, setParticipantsOrder] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const log = (...args) => console.log("[AdminEventQueries]", ...args);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [threads, selectedUser]);

  const addMessageToThread = (msg) => {
    const uid = msg.targetUser
      ? String(msg.targetUser)
      : (msg.sender?._id ? String(msg.sender._id) : String(msg.sender));
    setThreads((prev) => {
      const copy = { ...prev };
      if (!copy[uid]) copy[uid] = { messages: [], user: msg.sender || null, unread: 0 };
      if (!copy[uid].messages.some(m => String(m._id) === String(msg._id))) {
        copy[uid].messages = [...copy[uid].messages, msg].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        if (selectedUser !== uid) copy[uid].unread = (copy[uid].unread || 0) + 1;
      }
      return copy;
    });
    setParticipantsOrder(prev => {
      if (!prev.includes(uid)) return [uid, ...prev];
      return [uid, ...prev.filter(x => x !== uid)];
    });
  };

  useEffect(() => {
    log("mount -> clubid:", clubid, "eventId:", eventId, "BACKEND:", BACKEND);

    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.warn("[AdminEventQueries] no token");
      return;
    }

    const loadAllQueries = async () => {
      try {
        log("GET", `${BACKEND}/events/${eventId}/queries`);
        const res = await axiosInstance.get(`/events/${eventId}/queries`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        log("GET queries response:", res?.data);
        const items = Array.isArray(res?.data?.data) ? res.data.data : [];
        const grouped = {};
        const order = [];
        items.forEach((m) => {
          let participantId = null;
          if (m.senderRole === "participant") participantId = (m.sender?._id) ? String(m.sender._id) : String(m.sender);
          else if (m.targetUser) participantId = String(m.targetUser);
          else participantId = (m.sender?._id) ? String(m.sender._id) : String(m.sender);

          if (!grouped[participantId]) grouped[participantId] = { messages: [], user: m.sender || null, unread: 0 };
          if (!grouped[participantId].messages.some(x => String(x._id) === String(m._id))) grouped[participantId].messages.push(m);
          if (!order.includes(participantId)) order.push(participantId);
        });
        Object.keys(grouped).forEach(k => {
          grouped[k].messages.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        });

        setThreads(grouped);
        setParticipantsOrder(order.reverse());
      } catch (err) {
        console.error("[AdminEventQueries] loadAllQueries error:", err?.response || err);
      } finally {
        setLoading(false);
      }
    };
    loadAllQueries();

    try {
      log("Initializing socket.io client to", BACKEND);
      const s = io(BACKEND, { auth: { token }, transports: ["websocket"], path: "/socket.io" });
      socketRef.current = s;

      s.on("connect", () => {
        log("Socket connected", s.id);
        s.emit("join:organizer", { eventId }, (ack) => {
          log("join:organizer ack:", ack);
        });
      });

      s.on("query:new", (msg) => {
        log("socket -> query:new", msg);
        addMessageToThread(msg);
      });

      s.on("connect_error", (err) => {
        console.error("[AdminEventQueries] socket connect_error:", err);
      });

      s.on("disconnect", (reason) => {
        console.warn("[AdminEventQueries] socket disconnected:", reason);
      });
    } catch (err) {
      console.error("[AdminEventQueries] socket init failed:", err);
    }

    return () => {
      log("cleanup -> disconnect socket");
      if (socketRef.current) {
        try {
          socketRef.current.emit("leave:event", { eventId }, (ack) => log("leave:event ack:", ack));
        } catch (e) { log("leave:event error", e); }
        try { socketRef.current.disconnect(); } catch(e){ log("socket disconnect error", e); }
        socketRef.current = null;
      }
    };
  }, [clubid, eventId]);

  const selectParticipant = (participantId) => {
    setSelectedUser(participantId);
    setThreads(prev => {
      const copy = { ...prev };
      if (copy[participantId]) copy[participantId].unread = 0;
      return copy;
    });
  };

  const sendReply = async () => {
    if (!replyText?.trim() || !selectedUser) return;
    const token = localStorage.getItem("accessToken");
    if (!token) { console.warn("no token"); return; }

    const s = socketRef.current;
    if (s && s.connected) {
      log("Emitting admin reply via socket to targetUser:", selectedUser, "message:", replyText);
      s.emit("query:send", { eventId, message: replyText, targetUser: selectedUser }, (ack) => {
        log("reply ack:", ack);
        if (ack?.success && ack?.data) {
          addMessageToThread(ack.data);
          setReplyText("");
        }
      });
    } else {
      try {
        log("Socket not connected - POST fallback", `${BACKEND}/events/${eventId}/queries`);
        const res = await axiosInstance.post(
          `/events/${eventId}/queries`,
          { message: replyText, targetUser: selectedUser },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        log("reply POST res:", res?.data);
        if (res?.data?.data) {
          addMessageToThread(res.data.data);
          setReplyText("");
        }
      } catch (err) {
        console.error("[AdminEventQueries] reply POST failed:", err?.response || err);
      }
    }
  };

  const renderInbox = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    if (participantsOrder.length === 0) {
      return (
        <div className="p-8 text-center text-slate-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm">No queries yet</p>
        </div>
      );
    }

    return participantsOrder.map((pid) => {
      const t = threads[pid] || { messages: [], user: null, unread: 0 };
      const last = t.messages[t.messages.length - 1];
      const displayName = (t.user && (t.user.username || t.user.name)) || `User ${pid.slice(0,6)}`;
      const isActive = selectedUser === pid;
      
      return (
        <div
          key={pid}
          onClick={() => selectParticipant(pid)}
          className={`relative p-4 border-b border-slate-700/50 cursor-pointer transition-all duration-200 group hover:bg-slate-700/30 ${
            isActive ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-l-4 border-l-blue-500' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {displayName}
                </div>
                <div className="text-xs text-slate-500">ID: {pid.slice(0,8)}...</div>
              </div>
            </div>
            {t.unread > 0 && (
              <div className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                {t.unread}
              </div>
            )}
          </div>
          <div className="text-sm text-slate-400 ml-13 line-clamp-1">
            {last ? last.message : "—"}
          </div>
        </div>
      );
    });
  };

  const renderConversation = () => {
    if (!selectedUser) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <svg className="w-24 h-24 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="text-lg font-medium">Select a participant</p>
          <p className="text-sm text-slate-500">Choose a conversation to view messages</p>
        </div>
      );
    }
    const t = threads[selectedUser] || { messages: [], user: null, unread: 0 };
    const userName = (t.user && (t.user.username || t.user.name)) || `User ${selectedUser.slice(0,6)}`;
    
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-white text-lg">{userName}</div>
              <div className="text-xs text-slate-400">Participant ID: {selectedUser.slice(0,12)}...</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-900/30 to-slate-900/50">
          {t.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <svg className="w-16 h-16 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p>No messages yet</p>
            </div>
          ) : (
            t.messages.map((m, idx) => {
              const isParticipant = m.senderRole === "participant";
              return (
                <div key={m._id} className={`flex ${isParticipant ? 'justify-start' : 'justify-end'} animate-fadeIn`}>
                  <div className={`max-w-[75%] ${isParticipant ? 'order-1' : 'order-2'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-medium text-slate-400">
                        {m.sender?.username || m.sender?.name || (m.senderRole || "system")}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${
                        isParticipant
                          ? 'bg-gradient-to-br from-white to-slate-50 text-slate-900 rounded-tl-sm'
                          : 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{m.message}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          <div className="flex gap-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendReply();
                }
              }}
              placeholder="Type your reply... (Press Enter to send)"
              className="flex-1 px-4 py-3 rounded-xl bg-slate-700/50 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
              rows={3}
            />
            <button
              onClick={sendReply}
              disabled={!replyText.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Participant Queries
          </h1>
          <p className="text-slate-400">Manage and respond to participant questions</p>
        </div>
        
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
          <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Conversations
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderInbox()}
            </div>
          </div>

          <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
            {renderConversation()}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}