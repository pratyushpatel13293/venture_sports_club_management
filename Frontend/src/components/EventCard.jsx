import React from "react";
import axiosInstance from "../utils/axiosInstance";
export default function EventCard({ event, onOpen }) {
  return (
    <div 
      onClick={onOpen}
      className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/40 hover:border-indigo-500/30 transition-all cursor-pointer"
    >
      {/* Icon Placeholder */}
      <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
        <i className="fa-solid fa-trophy text-xl"></i>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-white font-semibold text-base truncate group-hover:text-indigo-300 transition-colors">
          {event.name || "Unnamed Event"}
        </h4>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
          <span className="truncate max-w-[150px]">ID: {event._id}</span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <span>{new Date(event.createdAt || Date.now()).toLocaleDateString()}</span>
        </div>
      </div>

      <button className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
        <i className="fa-solid fa-chevron-right text-xs"></i>
      </button>
    </div>
  );
}