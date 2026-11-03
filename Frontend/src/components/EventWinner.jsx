import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function EventWinner() {
  const { eventId } = useParams();
  const [winner, setWinner] = useState(null);

  const auth = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
  });

  useEffect(() => {
    axiosInstance.get(
      `/events/${eventId}/winner`,
      auth()
    ).then(res => {
      setWinner(res.data.winner);
    });
  }, [eventId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-8 relative overflow-hidden text-white">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
        .glow-animation {
          animation: glow 2s ease-in-out infinite;
        }
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti 5s linear infinite;
        }
      `}</style>

      {/* Confetti Effect */}
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20}%`,
            backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'][Math.floor(Math.random() * 4)],
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        />
      ))}

      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-full blur-3xl glow-animation"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-full blur-3xl glow-animation" style={{ animationDelay: '1s' }}></div>

      {/* Winner Card */}
      <div className="relative z-10 max-w-3xl w-full">
        <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-800/80 backdrop-blur-2xl border border-slate-700/50 shadow-2xl p-12 text-center float-animation">
          {/* Top Border Glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent glow-animation"></div>

          {/* Trophy Icon */}
          <div className="mb-8">
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/30 to-orange-600/30 rounded-full blur-2xl glow-animation"></div>
              <div className="relative w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-yellow-500 via-yellow-600 to-orange-600 flex items-center justify-center shadow-2xl shadow-yellow-500/50">
                <i className="fa-solid fa-trophy text-white text-6xl"></i>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-6xl font-black text-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 bg-clip-text mb-4 tracking-tight">
              CHAMPION
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
              <div className="px-4 py-1 rounded-full bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 text-sm font-semibold">
                Tournament Winner
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
            </div>
          </div>

          {/* Winner Name */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 rounded-3xl blur-xl"></div>
            <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
              <p className="text-5xl font-black text-white mb-2">{winner?.teamname}</p>
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm font-medium">Verified Winner</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: "fa-star", label: "Rating", value: "5.0", color: "from-yellow-600 to-orange-600" },
              { icon: "fa-trophy", label: "Victories", value: "12", color: "from-indigo-600 to-purple-600" },
              { icon: "fa-medal", label: "MVP", value: "3", color: "from-emerald-600 to-teal-600" }
            ].map((stat, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-6">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.color}`}></div>
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <i className={`fa-solid ${stat.icon} text-white text-xl`}></i>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Celebration Message */}
          <div className="mt-10 pt-8 border-t border-slate-700/50">
            <p className="text-slate-400 text-lg italic">
              "Congratulations to the champions! An outstanding performance throughout the tournament."
            </p>
          </div>
        </div>

        {/* Share Button */}
        <div className="mt-8 text-center">
          <button className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg shadow-indigo-500/30 inline-flex items-center gap-3">
            <i className="fa-solid fa-share-nodes group-hover:rotate-12 transition-transform"></i>
            <span>Share Results</span>
          </button>
        </div>
      </div>
    </div>
  );
}