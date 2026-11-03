import React, { useEffect, useState } from "react";
import api from "../utils/axiosInstance";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Search, Heart, User, Pointer } from 'lucide-react';
import { Moon, Sun } from "lucide-react";
import {useTheme } from "../utils/theme.jsx";

export default function Inbox() {
  const [notifications, setNotifications] = useState([]);
  const [showInbox, setShowInbox] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const {theme,toggleTheme}=useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    console.log("logout called");
    localStorage.clear();
    delete api.defaults.headers.common["Authorization"];
    navigate("/", { replace: true });
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/teams/team/notifications");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error("Inbox fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const approveRequest = async (notificationId) => {
    await api.post("/teams/team/accept-request", { notificationId });
    fetchNotifications();
  };

  const rejectRequest = async (notificationId) => {
    await api.post("/teams/team/reject-request", { notificationId });
    fetchNotifications();
  };

  useEffect(() => {
    const handleClick = () => {
      setShowProfileMenu(false);
      setShowInbox(false);
    };
  }, []);

  return (
    <>
      <nav className="relative glass-panel border-b-0 rounded-b-2xl mx-4 mt-2 px-6 py-4 flex items-center justify-between shadow-2xl shadow-black/30 backdrop-blur-xl bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-slate-700/50">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-b-2xl opacity-50"></div>
        
        {/* LOGO */}
        <div 
          className="relative flex items-center gap-3 cursor-pointer group z-10" 
          onClick={() => navigate("/home")}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all duration-300 group-hover:scale-110">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 group-hover:from-indigo-300 group-hover:via-purple-300 group-hover:to-pink-300 transition-all duration-300">
            VENTURE
          </h1>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="relative flex items-center gap-4 z-10">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInbox(!showInbox);
                setShowProfileMenu(false);
              }}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                showInbox 
                  ? 'bg-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/20 scale-95' 
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white hover:scale-105'
              } border border-slate-700/50 hover:border-indigo-500/50`}
            >
              <i className={`fa-solid fa-bell text-xl transition-transform duration-300 ${showInbox ? 'animate-pulse' : ''}`}></i>
            </button>
            
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 text-white text-xs font-bold rounded-full border-2 border-slate-900 shadow-lg shadow-rose-500/50 animate-pulse">
                {notifications.length}
              </span>
            )}

            {/* NOTIFICATION DROPDOWN */}
            {showInbox && (
              <div 
                className="absolute right-0 top-14 w-96 bg-gradient-to-b from-slate-800/98 to-slate-900/98 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col animate-in fade-in slide-in-from-top-2 duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                    <span className="font-semibold text-base text-slate-200">Notifications</span>
                  </div>
                  <button 
                    onClick={() => fetchNotifications()} 
                    className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition-all duration-200 border border-indigo-500/20 hover:border-indigo-500/40"
                  >
                    <i className="fa-solid fa-rotate-right mr-1"></i>
                    Refresh
                  </button>
                </div>
                
                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                        <i className="fa-regular fa-envelope-open text-3xl text-slate-600"></i>
                      </div>
                      <p className="text-sm font-medium">No new notifications</p>
                      <p className="text-xs text-slate-600 mt-1">You're all caught up!</p>
                    </div>
                  ) : (
                    notifications.map((note, index) => (
                      <div 
                        key={note.id} 
                        className="group bg-gradient-to-br from-slate-700/40 to-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 backdrop-blur-sm"
                        style={{
                          animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`
                        }}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                            <i className="fa-solid fa-user-plus text-white text-xs"></i>
                          </div>
                          <p className="text-sm text-slate-200 leading-relaxed flex-1">{note.message}</p>
                        </div>
                        
                        {note.requser && note.teamid && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveRequest(note.id)}
                              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600/20 to-emerald-500/20 text-emerald-400 hover:from-emerald-600 hover:to-emerald-500 hover:text-white rounded-lg text-xs font-semibold transition-all duration-300 border border-emerald-500/30 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-105 active:scale-95"
                            >
                              <i className="fa-solid fa-check mr-1"></i>
                              Accept
                            </button>
                            <button
                              onClick={() => rejectRequest(note.id)}
                              className="flex-1 py-2.5 bg-gradient-to-r from-rose-600/20 to-rose-500/20 text-rose-400 hover:from-rose-600 hover:to-rose-500 hover:text-white rounded-lg text-xs font-semibold transition-all duration-300 border border-rose-500/30 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/20 hover:scale-105 active:scale-95"
                            >
                              <i className="fa-solid fa-xmark mr-1"></i>
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileMenu(!showProfileMenu);
                setShowInbox(false);
              }}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 overflow-hidden ${
                showProfileMenu
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 scale-95'
                  : 'bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-700/50 hover:scale-105'
              }`}
            >
              <i className={`fa-solid fa-user ${showProfileMenu ? 'text-white' : 'text-slate-400'}`}></i>
            </button>

            {/* PROFILE DROPDOWN */}
            {showProfileMenu && (
              <div
                className="absolute right-0 top-14 w-56 bg-gradient-to-b from-slate-800/98 to-slate-900/98 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-700/30 hover:text-white transition-all duration-200 flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all duration-200 border border-slate-600/50 group-hover:border-indigo-500/50">
                    <i className="fa-regular fa-id-card text-slate-400 group-hover:text-indigo-400 transition-colors duration-200"></i>
                  </div>
                  <span className="font-medium">Profile</span>
                </button>
                
                <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-2 mx-3"></div>
                
                <button
                  onClick={() => {
                    console.log("logout called");
                    localStorage.clear();
                    navigate("/", { replace: true });
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-rose-400 hover:bg-gradient-to-r hover:from-rose-900/30 hover:to-rose-900/20 hover:text-rose-300 transition-all duration-200 flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-all duration-200 border border-rose-500/20 group-hover:border-rose-500/40">
                    <i className="fa-solid fa-right-from-bracket text-rose-400 group-hover:text-rose-300 transition-colors duration-200"></i>
                  </div>
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #4f46e5, #7c3aed);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #6366f1, #8b5cf6);
        }

        .animate-in {
          animation-fill-mode: both;
        }

        .fade-in {
          animation-name: fadeIn;
        }

        .slide-in-from-top-2 {
          animation-name: slideInFromTop;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInFromTop {
          from {
            transform: translateY(-8px);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}