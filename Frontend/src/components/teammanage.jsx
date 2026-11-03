import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/axiosInstance";
import axios from "axios";

export default function TeamManagePage() {
  const {clubid, eventId, teamid } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [maxlength, setMaxlength] = useState(1);
  const [editingName, setEditingName] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [event, setevent] = useState();
  const [loading, setLoading] = useState(true);

  /* -----------------------------------------------------------
        FETCH EVENT
  ------------------------------------------------------------ */
  const fetchEvent = async () => {
    const res = await api.get(`/events/${eventId}`);
    setevent(res.data.event);
    setMaxlength(res.data.event.maxPlayer);
  };

  /* -----------------------------------------------------------
        FETCH TEAM
  ------------------------------------------------------------ */
  const fetchTeam = async () => {
    const res = await api.get(`/teams/team/${teamid}`);
    setTeam(res.data);
    setNewTeamName(res.data.teamname);
    setLoading(false);
  };

  /* -----------------------------------------------------------
        AUTH
  ------------------------------------------------------------ */
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCurrentUser(payload.id);
    }
  }, []);

  useEffect(() => {
    fetchEvent();
    fetchTeam();
  }, []);

  /* -----------------------------------------------------------
        SEARCH USERS
  ------------------------------------------------------------ */
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const res = await api.post("/auth/search-users", {
          q: searchQuery,
        });
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  /* -----------------------------------------------------------
        TEAM ACTIONS
  ------------------------------------------------------------ */

  const inviteUser = async (userid) => {
    await api.post("/teams/invite", { teamid, userid });
    alert("Invite sent");
  };

  const removeUser = async (userid) => {
    await api.post("/teams/remove", { teamid, userid });
    fetchTeam();
  };

  const makeLeader = async (userid) => {
    await api.post("/teams/make-admin", { teamid, userid });
    fetchTeam();
  };

  const updateTeamName = async () => {
    await api.put("/teams/edit", { teamid, name: newTeamName });
    setEditingName(false);
    fetchTeam();
  };

  const dismantleTeam = async () => {
    if (!window.confirm("This will permanently delete the team. Continue?"))
      return;

    await api.post("/teams/dismantle", { teamid });
    navigate(`/events/${eventId}`);
  };

  const leaveTeam = async () => {
    try {
      await api.post("/teams/leave", { teamid });
      navigate(`/events/${clubid}/${eventId}`);
    } catch (err) {
      alert(err.response?.data?.message);
    }
  };

  const proceedToRegister = async () => {
    try {
      const ok = window.confirm(
        "⚠️ Final Registration Warning\n\nAfter proceeding:\n• Team cannot be edited\n• Members cannot be changed\n\nContinue?"
      );
      if (!ok) return;

      const res = await api.post("/teams/register", { teamid });
      if (res.status === 200) {
        navigate(`/events/${clubid}/${eventId}`);
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
          <p className="text-slate-400 animate-pulse">Loading team...</p>
        </div>
      </div>
    );
  }

  if (!team) return null;

  const maxMaleAllowed = event?.genderres === "Mixed" ? event?.maxmale : maxlength;
  const maxFemaleAllowed = event?.genderres === "Mixed" ? event?.maxfemale : maxlength;
  const countMale = team.members.filter((m) => m.gender === "Male").length;
  const countFemale = team.members.filter((m) => m.gender === "Female").length;

  const leaderId = team.leader?._id?.toString() || team.leader?.toString();
  const isLeader = leaderId === currentUser;
  const isRegistered = team.isRegistered;
  const isMember = team.members.some((m) => m._id.toString() === currentUser) || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* HEADER CARD */}
        <div className="relative bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10"></div>
          
          <div className="relative p-8">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate(`/events/${clubid}/${eventId}`)}
                className="px-4 py-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-300 border border-slate-600/50 hover:border-slate-500 flex items-center gap-2"
              >
                <i className="fa-solid fa-arrow-left"></i>
                Back to Event
              </button>

              {isRegistered && (
                <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center gap-2">
                  <i className="fa-solid fa-check-circle text-emerald-400"></i>
                  <span className="text-emerald-400 font-semibold text-sm">Registered</span>
                </div>
              )}
            </div>

            {/* TEAM NAME */}
            {editingName ? (
              <div className="flex gap-3 items-center">
                <input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="flex-1 bg-slate-700/50 border border-indigo-500/50 p-3 rounded-xl text-white text-2xl font-bold focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <button
                  onClick={updateTeamName}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300"
                >
                  <i className="fa-solid fa-check mr-2"></i>
                  Save
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="px-5 py-3 rounded-xl bg-slate-700/50 text-slate-300 hover:text-white transition-all duration-300 border border-slate-600/50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <span className="text-2xl font-bold text-white">
                      {team.teamname?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                      {team.teamname}
                    </h1>
                    <p className="text-slate-400 flex items-center gap-2 mt-1">
                      <i className="fa-solid fa-crown text-amber-400 text-sm"></i>
                      Led by {team.leader?.username || team.leader?.name}
                    </p>
                  </div>
                </div>

                {!isRegistered && isLeader && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-300 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-edit"></i>
                    Edit Name
                  </button>
                )}
              </div>
            )}

            {/* TEAM STATS */}
            <div className="flex gap-3 mt-6">
              <div className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                <span className="text-indigo-400 font-semibold text-sm">
                  <i className="fa-solid fa-users mr-2"></i>
                  {team.members.length}/{maxlength} Members
                </span>
              </div>
              {event?.genderres === "Mixed" && (
                <>
                  <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <span className="text-blue-400 font-semibold text-sm">
                      <i className="fa-solid fa-mars mr-2"></i>
                      {countMale}/{maxMaleAllowed} Male
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-pink-500/10 border border-pink-500/30">
                    <span className="text-pink-400 font-semibold text-sm">
                      <i className="fa-solid fa-venus mr-2"></i>
                      {countFemale}/{maxFemaleAllowed} Female
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* GENDER RESTRICTIONS */}
            {event?.genderres && event.genderres !== "Mixed" && (
              <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <p className="text-rose-400 font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-exclamation-triangle"></i>
                  ONLY {event.genderres} teammates allowed
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MEMBERS LIST */}
        <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-8 mb-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <i className="fa-solid fa-users text-white"></i>
            </div>
            Team Members
          </h2>

          <div className="space-y-3">
            {team.members.map((m) => {
              const memberId = m._id.toString();
              const memberIsLeader = memberId === leaderId;

              return (
                <div
                  key={m._id}
                  className="group p-5 rounded-xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${m.gender === "Male" ? "bg-gradient-to-br from-blue-500 to-blue-600" : "bg-gradient-to-br from-pink-500 to-pink-600"} flex items-center justify-center shadow-lg`}>
                        <span className="text-lg font-bold text-white">
                          {m.username?.charAt(0).toUpperCase() || m.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-200">
                          {m.username || m.name}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {memberIsLeader && (
                            <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 font-semibold flex items-center gap-1">
                              <i className="fa-solid fa-crown"></i>
                              Leader
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-lg border font-semibold ${
                            m.gender === "Male" 
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                              : "bg-pink-500/20 text-pink-400 border-pink-500/30"
                          }`}>
                            {m.gender === "Male" ? "Male" : "Female"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isRegistered && isLeader && !memberIsLeader && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => makeLeader(m._id)}
                          className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 hover:border-emerald-500 transition-all duration-300 text-sm font-semibold"
                        >
                          <i className="fa-solid fa-crown mr-1"></i>
                          Make Leader
                        </button>
                        <button
                          onClick={() => removeUser(m._id)}
                          className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 hover:border-rose-500 transition-all duration-300 text-sm font-semibold"
                        >
                          <i className="fa-solid fa-user-minus mr-1"></i>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* INVITE SECTION */}
        {countMale < maxMaleAllowed && countFemale < maxFemaleAllowed && !isRegistered && isLeader && team.members.length < maxlength && (
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-8 mb-6">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <i className="fa-solid fa-user-plus text-white"></i>
              </div>
              Invite Players
            </h3>

            <div className="relative">
              <input
                className="w-full bg-slate-700/50 border border-slate-600/50 focus:border-indigo-500/50 p-4 rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all duration-300"
                placeholder="Search users by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="fa-solid fa-search absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <span className="text-white font-bold">
                          {u.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-slate-200 font-medium">{u.username}</span>
                    </div>
                    <button
                      onClick={() => inviteUser(u._id)}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
                    >
                      <i className="fa-solid fa-paper-plane mr-2"></i>
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTION BUTTONS */}
        {!isRegistered && (
          <div className="flex gap-4">
            {isLeader ? (
              <>
                <button
                  onClick={proceedToRegister}
                  className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <i className="fa-solid fa-check-circle mr-2"></i>
                  Proceed to Register
                </button>

                <button
                  onClick={dismantleTeam}
                  className="px-6 py-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold hover:shadow-2xl hover:shadow-rose-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <i className="fa-solid fa-trash mr-2"></i>
                  Dismantle Team
                </button>
              </>
            ) : isMember && (
              <button
                onClick={leaveTeam}
                className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-lg hover:shadow-2xl hover:shadow-rose-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <i className="fa-solid fa-right-from-bracket mr-2"></i>
                Leave Team
              </button>
            )}
          </div>
        )}

        {/* REGISTERED MESSAGE */}
        {isRegistered && (
          <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/50 text-center">
            <i className="fa-solid fa-check-circle text-4xl text-emerald-400 mb-3 block"></i>
            <p className="text-emerald-400 font-bold text-lg">
              Team Successfully Registered!
            </p>
            <p className="text-emerald-300/70 text-sm mt-2">
              Your team is locked and ready for competition. No further changes can be made.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}