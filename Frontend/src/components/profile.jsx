import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/auth/me");
        setUser(res.data);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
          <p className="text-slate-400 animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700">
          <i className="fa-solid fa-exclamation-triangle text-4xl text-amber-500 mb-4"></i>
          <p className="text-slate-400">Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto mt-10">
        {/* Profile Card */}
        <div className="relative bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10"></div>
          
          {/* Content */}
          <div className="relative">
            {/* Header Section */}
            <div className="p-8 border-b border-slate-700/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <i className="fa-solid fa-user text-white text-xl"></i>
                  </div>
                  My Profile
                </h2>
                
                <button
                  onClick={() => navigate("/home")}
                  className="px-5 py-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-300 border border-slate-600/50 hover:border-slate-500 flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  Back
                </button>
              </div>

              {/* Avatar & Name */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                    <span className="text-4xl font-bold text-white">
                      {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <h1 className="text-3xl font-bold text-slate-100 mb-2">
                    {user.name || "Anonymous User"}
                  </h1>
                  <p className="text-slate-400 flex items-center gap-2">
                    <i className="fa-solid fa-at text-indigo-400"></i>
                    {user.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Information Section */}
            <div className="p-8">
              <div className="space-y-5">
                <div className="group p-6 rounded-xl bg-gradient-to-br from-slate-700/30 to-slate-800/30 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block font-semibold flex items-center gap-2">
                    <i className="fa-solid fa-signature text-indigo-400"></i>
                    Full Name
                  </label>
                  <p className="text-xl text-slate-200 font-medium">
                    {user.name || "Not provided"}
                  </p>
                </div>

                <div className="group p-6 rounded-xl bg-gradient-to-br from-slate-700/30 to-slate-800/30 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block font-semibold flex items-center gap-2">
                    <i className="fa-solid fa-user text-indigo-400"></i>
                    Username
                  </label>
                  <p className="text-xl text-slate-200 font-medium flex items-center gap-2">
                    <i className="fa-solid fa-at text-indigo-400 text-base"></i>
                    {user.username}
                  </p>
                </div>

                <div className="group p-6 rounded-xl bg-gradient-to-br from-slate-700/30 to-slate-800/30 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block font-semibold flex items-center gap-2">
                    <i className="fa-solid fa-envelope text-indigo-400"></i>
                    Email Address
                  </label>
                  <p className="text-xl text-slate-200 font-medium flex items-center gap-2">
                    <i className="fa-solid fa-envelope text-indigo-400 text-base"></i>
                    {user.email}
                  </p>
                </div>

                {user.createdAt && (
                  <div className="group p-6 rounded-xl bg-gradient-to-br from-slate-700/30 to-slate-800/30 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block font-semibold flex items-center gap-2">
                      <i className="fa-solid fa-calendar text-indigo-400"></i>
                      Member Since
                    </label>
                    <p className="text-xl text-slate-200 font-medium flex items-center gap-2">
                      <i className="fa-solid fa-calendar-check text-indigo-400 text-base"></i>
                      {new Date(user.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}