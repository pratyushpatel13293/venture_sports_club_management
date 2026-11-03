import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function Home() {
  const navigate = useNavigate();
  const [adminTournaments, setAdminTournaments] = useState([]);
  const [participantTournaments, setParticipantTournaments] = useState([]);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [joinTournamentId, setJoinTournamentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("admin"); // 'admin' or 'joined'

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const [adminRes, participantRes] = await Promise.all([
        axiosInstance.get("/clubs/my-admin"),
        axiosInstance.get("/clubs/participant"),
      ]);
      setAdminTournaments(adminRes.data.tournaments || []);
      setParticipantTournaments(participantRes.data.tournaments || []);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTournamentName.trim()) return;
    try {
      await axiosInstance.post("/clubs/new", { name: newTournamentName.trim() });
      setNewTournamentName("");
      fetchTournaments();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create");
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinTournamentId.trim()) return;
    try {
      await axiosInstance.post("/clubs/join", { clubId: joinTournamentId.trim() });
      setJoinTournamentId("");
      fetchTournaments();
      setActiveTab("joined");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to join");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-10 animate-fadeIn">
        {/* HERO SECTION */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-slate-900/40 backdrop-blur-xl border border-indigo-500/20 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 animate-gradient"></div>
          
          {/* Decorative Orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 float-animation"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2 float-animation" style={{animationDelay: '1.5s'}}></div>
          
          <div className="relative z-10 p-12 md:p-16">
            <div className="max-w-3xl">
              <div className="inline-block mb-6">
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-600/20 border border-indigo-500/30 backdrop-blur-md">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-sm font-semibold text-indigo-300">Platform Active</span>
                </div>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                Welcome to{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  Venture
                </span>
              </h1>
              
              <p className="text-slate-300 text-lg md:text-xl leading-relaxed mb-8 max-w-2xl">
                Manage your sports clubs, organize tournaments, and track live scores seamlessly. 
                The ultimate platform for competitive gaming and esports management.
              </p>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/50 backdrop-blur-md border border-slate-700/50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                    <i className="fa-solid fa-trophy text-white"></i>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total Clubs</p>
                    <p className="text-lg font-bold text-white">{adminTournaments.length + participantTournaments.length}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/50 backdrop-blur-md border border-slate-700/50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                    <i className="fa-solid fa-shield-halved text-white"></i>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">As Admin</p>
                    <p className="text-lg font-bold text-white">{adminTournaments.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Gradient Line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
        </div>

        {/* ACTION GRID */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* CREATE CARD */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl hover:border-emerald-500/50 transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-plus text-white text-2xl"></i>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                    Create Club
                  </h2>
                  <p className="text-slate-400 leading-relaxed">
                    Start a new tournament group and invite members to compete
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="relative">
                  <input
                    value={newTournamentName}
                    onChange={(e) => setNewTournamentName(e.target.value)}
                    placeholder="Enter club name..."
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:bg-slate-900/70 transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                    <i className="fa-solid fa-pen"></i>
                  </div>
                </div>
                <button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2">
                  <i className="fa-solid fa-plus"></i>
                  <span>Create New Club</span>
                </button>
              </form>
            </div>
          </div>

          {/* JOIN CARD */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl hover:border-indigo-500/50 transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-users text-white text-2xl"></i>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                    Join Club
                  </h2>
                  <p className="text-slate-400 leading-relaxed">
                    Enter a Club ID to join an existing tournament group
                  </p>
                </div>
              </div>

              <form onSubmit={handleJoin} className="space-y-4">
                <div className="relative">
                  <input
                    value={joinTournamentId}
                    onChange={(e) => setJoinTournamentId(e.target.value)}
                    placeholder="Paste Club ID..."
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900/70 transition-all font-mono text-sm"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                    <i className="fa-solid fa-key"></i>
                  </div>
                </div>
                <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2">
                  <i className="fa-solid fa-right-to-bracket"></i>
                  <span>Join Existing Club</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* TOURNAMENTS LIST */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl p-8">
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-full blur-3xl"></div>
          
          <div className="relative">
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-8 bg-slate-900/50 rounded-2xl p-2 w-fit">
              <button
                onClick={() => setActiveTab("admin")}
                className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === "admin"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <i className="fa-solid fa-crown mr-2"></i>
                My Clubs
                {adminTournaments.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                    {adminTournaments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("joined")}
                className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === "joined"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <i className="fa-solid fa-users mr-2"></i>
                Joined Clubs
                {participantTournaments.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                    {participantTournaments.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content */}
            {loading ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400 text-lg">Loading clubs...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeTab === "admin" ? adminTournaments : participantTournaments).length === 0 ? (
                  <div className="col-span-full">
                    <div className="text-center py-16 bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-700/50">
                      <div className="w-20 h-20 rounded-full bg-slate-800/50 mx-auto mb-6 flex items-center justify-center">
                        <i className="fa-solid fa-inbox text-slate-600 text-3xl"></i>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">No Clubs Found</h3>
                      <p className="text-slate-400 mb-6">
                        {activeTab === "admin" 
                          ? "Create your first club to get started" 
                          : "Join a club using an invitation ID"}
                      </p>
                      {activeTab === "admin" && (
                        <button 
                          onClick={() => document.querySelector('input[placeholder="Enter club name..."]').focus()}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-indigo-500/30"
                        >
                          <i className="fa-solid fa-plus"></i>
                          <span>Create First Club</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  (activeTab === "admin" ? adminTournaments : participantTournaments).map((t, idx) => (
                    <div
                      key={t._id}
                      onClick={() => navigate(`/events/${t._id}`)}
                      className="group relative overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl hover:border-indigo-500/50 transition-all duration-300 cursor-pointer hover:scale-105 shadow-xl hover:shadow-2xl"
                    >
                      {/* Top Accent Line */}
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                        idx % 3 === 0 
                          ? 'from-indigo-500 to-purple-500' 
                          : idx % 3 === 1 
                          ? 'from-purple-500 to-pink-500' 
                          : 'from-pink-500 to-rose-500'
                      }`}></div>

                      {/* Hover Glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 via-purple-600/0 to-pink-600/0 group-hover:from-indigo-600/5 group-hover:via-purple-600/5 group-hover:to-pink-600/5 transition-all duration-500"></div>

                      <div className="relative p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 group-hover:from-indigo-600 group-hover:to-purple-600 flex items-center justify-center text-2xl font-black text-white transition-all duration-300 shadow-lg">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
                            activeTab === "admin"
                              ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-400"
                              : "bg-indigo-600/20 border border-indigo-500/30 text-indigo-400"
                          }`}>
                            {activeTab === "admin" ? "ADMIN" : "MEMBER"}
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors line-clamp-1">
                          {t.name}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                          <i className="fa-solid fa-fingerprint"></i>
                          <span className="font-mono truncate">ID: {t._id}</span>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                          <span className="text-sm text-slate-400 flex items-center gap-2">
                            <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                            View Details
                          </span>
                          <div className="w-8 h-8 rounded-lg bg-slate-800/50 group-hover:bg-indigo-600/20 flex items-center justify-center transition-all">
                            <i className="fa-solid fa-chevron-right text-slate-600 group-hover:text-indigo-400 text-sm"></i>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Shimmer Effect */}
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}