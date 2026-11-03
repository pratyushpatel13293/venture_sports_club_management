import React from "react";
import Inbox from "./Inbox";
import axiosInstance from "../utils/axiosInstance";
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Fixed Navbar */}
      <div className="sticky top-0 z-50">
        <Inbox />
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}