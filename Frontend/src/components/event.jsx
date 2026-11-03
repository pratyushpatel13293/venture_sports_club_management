import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import EventCard from "./EventCard";
import axiosInstance from "../utils/axiosInstance";

function EventsDashboard() {
  const { clubid } = useParams();
  const [myAdminClubs, setMyAdminClubs] = useState([]);
  const [participantClubs, setParticipantClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(clubid);
  const [status, setstatus] = useState("");
  const [teamc, setteamc] = useState("");
  const [event, setEvent] = useState({
    name: "",
    description: "",
    maxPlayer: "",
  });
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const [showShare, setShowShare] = useState(false);
  const [clubEvents, setClubEvents] = useState([]);
  
  const FRONTEND_URL = "https://venture-flax.vercel.app";
  const link = `${FRONTEND_URL}/events/${clubid}/login`;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token)
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    fetchClubs();
  }, []);

  const leaveClub = async (clubId) => {
    if (!window.confirm("Are you sure you want to leave this club?")) return;

    try {
      const config = getAuthConfig();
      if (!config) return;

      await axiosInstance.post(
        "/clubs/leave",
        { clubid: clubId },
        config
      );

      fetchClubs();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to leave club");
    }
  };

  const deleteClub = async (clubId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this club? This action cannot be reversed!!"
      )
    )
      return;

    try {
      const config = getAuthConfig();
      if (!config) return;

      // axios.delete(url, config): a request body must go in config.data
      await axiosInstance.delete("/clubs/delete", {
        ...config,
        data: { clubid: clubId },
      });

      fetchClubs();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete club");
    }
  };

  const getAuthConfig = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setMessage("Please login again.");
      return null;
    }
    try {
      const payload = jwtDecode(token);
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        localStorage.removeItem("accessToken");
        setMessage("Please login again, session expired.");
        return null;
      }
    } catch (e) {
      localStorage.removeItem("accessToken");
      setMessage("Please login again, session expired.");
      return null;
    }
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
  };

  const fetchClubs = async () => {
    try {
      setMessage("");
      const config = getAuthConfig();
      if (!config) return;
      const [adminRes, partRes] = await Promise.all([
        axiosInstance.get("/clubs/my-admin", config),
        axiosInstance.get("/clubs/participant", config),
      ]);
      setMyAdminClubs(adminRes.data.tournaments || adminRes.data.clubs || []);
      setParticipantClubs(partRes.data.tournaments || partRes.data.clubs || []);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Failed to load clubs");
    }
  };

  const sharelink = () => {
    setShowShare(true);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!selectedClub) {
      setMessage("Select a club (tournament) to create the event under.");
      return;
    }
    if (!event.name.trim()) {
      setMessage("Event name required.");
      return;
    }
    setIsCreating(true);
    setMessage("");
    try {
      const config = getAuthConfig();
      if (!config) return;
      const res = await axiosInstance.post(
        "/events/new",
        { clubid: selectedClub, ...event, status, teamc },
        config
      );
      setMessage(res.data?.message || "Event created");
      setEvent({ name: "", description: "", maxPlayer: "" });
      const updatedEvents = await fetchEventsForClub(selectedClub);
      setClubEvents(updatedEvents);
      if (res.data?.eventId) navigate(`/events/${res.data.eventId}`);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Failed to create event");
    } finally {
      setIsCreating(false);
    }
  };

  const fetchEventsForClub = async (clubId) => {
    try {
      const config = getAuthConfig();
      if (!config) return [];

      const res = await axiosInstance.get(
        `/events/club/${selectedClub}`,
        config
      );

      return res.data.events || [];
    } catch (err) {
      console.error("fetchEventsForClub error", err);
      setMessage(err.response?.data?.message || "Failed to load events");
      return [];
    }
  };

  useEffect(() => {
    (async () => {
      if (!selectedClub) return setClubEvents([]);
      const events = await fetchEventsForClub(selectedClub);
      setClubEvents(events);
    })();
  }, [selectedClub]);

  const inputClass = "w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";
  const cardClass = "bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="w-full max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2">
              Events <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Manager</span>
            </h1>
            <p className="text-slate-400">Create and manage events inside your clubs</p>
          </div>
          <button
            onClick={sharelink}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 flex items-center gap-2 hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Club Link
          </button>
        </div>

        {/* Share Modal */}
        {showShare && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowShare(false)}
            />

            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 w-full max-w-md rounded-2xl shadow-2xl p-6 z-[10000] border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share Link
                </h2>
                <button
                  onClick={() => setShowShare(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                <input
                  value={link}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-slate-300 outline-none"
                />

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    alert("Link copied!");
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm font-semibold hover:shadow-lg transition-all hover:scale-105"
                >
                  Copy
                </button>
              </div>

              <p className="text-xs text-slate-400 mt-3">Share this link with others to join your club</p>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className={cardClass + " mb-8"}>
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Create Event Section */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                Create Event
              </h2>
              <p className="text-slate-400 text-sm mb-6">Select a club and create an event inside it</p>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Select Club *</label>
                  <select
                    value={selectedClub}
                    onChange={(e) => setSelectedClub(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select a club (tournament)</option>
                    {myAdminClubs.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name || `Club ${c._id || c.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Event Name *</label>
                  <input
                    type="text"
                    value={event.name}
                    onChange={(e) => setEvent({ ...event, name: e.target.value })}
                    placeholder="e.g. Football Championship 2026"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Description</label>
                  <textarea
                    value={event.description}
                    onChange={(e) => setEvent({ ...event, description: e.target.value })}
                    placeholder="Event description"
                    className={inputClass}
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Max Players per Team</label>
                  <input
                    type="number"
                    value={event.maxPlayer}
                    onChange={(e) => setEvent({ ...event, maxPlayer: e.target.value })}
                    placeholder="e.g. 11"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setstatus(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select status</option>
                      <option value="registration">Registration Open</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Team Creation</label>
                    <select
                      value={teamc}
                      onChange={(e) => setteamc(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select rights</option>
                      <option value="admin">Admin/Manager's only</option>
                      <option value="users">All users</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Event
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Quick Actions Section */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                Quick Actions
              </h2>
              <p className="text-slate-400 text-sm mb-6">Jump to events or paste an Event ID</p>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste Event ID to open"
                    className={inputClass + " flex-1"}
                    id="openEventId"
                  />

                  <button
                    onClick={() => {
                      const val = document.getElementById("openEventId").value.trim();
                      if (val) navigate(`/events/${val}`);
                    }}
                    className="px-5 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white border border-slate-600 transition-all hover:scale-105"
                  >
                    Open
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Selected Club Events
                  </h3>
                  {clubEvents.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-slate-900/40 border border-slate-700/50">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-slate-500 text-sm">No events for this club yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {clubEvents.map((ev) => (
                        <EventCard
                          key={ev._id || ev.id}
                          event={ev}
                          onOpen={() => navigate(`/events/${selectedClub}/${ev._id || ev.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mt-6 p-4 rounded-xl text-sm text-center flex items-center justify-center gap-2 ${
              message.includes('Failed') || message.includes('failed') || message.includes('required')
                ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {message}
            </div>
          )}
        </div>

        {/* Clubs Lists */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Admin Clubs */}
          <div className={cardClass}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Your Clubs (Admin)
            </h3>
            {myAdminClubs.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-700/50">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-20 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-slate-500">You don't admin any clubs yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {myAdminClubs.map((c) => (
                  <div
                    key={c._id || c.id}
                    className="bg-slate-900/40 border border-slate-700/50 rounded-xl px-4 py-3 flex justify-between items-center hover:border-slate-600/50 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                        {c.name || "Unnamed Club"}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        ID: {c._id || c.id}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteClub(c._id || c.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 text-xs font-medium transition-all"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setSelectedClub(c._id || c.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 text-xs font-medium transition-all"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Joined Clubs */}
          <div className={cardClass}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Clubs You Joined
            </h3>
            {participantClubs.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-700/50">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-20 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-slate-500">You haven't joined any clubs yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {participantClubs.map((c) => (
                  <div
                    key={c._id || c.id}
                    className="bg-slate-900/40 border border-slate-700/50 rounded-xl px-4 py-3 flex justify-between items-center hover:border-slate-600/50 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {c.name || "Unnamed Club"}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        ID: {c._id || c.id}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!myAdminClubs.some(
                        (adminClub) =>
                          String(adminClub._id || adminClub.id) ===
                          String(c._id || c.id)
                      ) && (
                        <button
                          onClick={() => leaveClub(c._id || c.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-700/20 hover:bg-red-700/30 text-red-400 border border-red-700/30 text-xs font-medium transition-all"
                        >
                          Leave
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedClub(c._id || c.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 border border-slate-600 text-xs font-medium transition-all"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventsDashboard;