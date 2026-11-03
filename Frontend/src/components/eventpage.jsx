import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "../utils/axiosInstance";

// --- SUB-COMPONENTS (Defined outside to prevent re-mounting focus issues) ---

const OverviewTab = ({ event, role, admins, managers, clubid, eventId, setShowImageModal }) => (
  <div className="space-y-8 animate-fadeIn">
    <style>{`
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes gradient {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      .animate-fadeIn {
        animation: fadeIn 0.6s ease-out;
      }
      .animate-gradient {
        background-size: 200% 200%;
        animation: gradient 8s ease infinite;
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
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        {/* Hero Image Section */}
        {event?.imgURL ? (
          <div 
            className="relative rounded-3xl overflow-hidden group cursor-pointer transform transition-all duration-500 hover:scale-[1.02]"
            onClick={() => setShowImageModal(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20 animate-gradient"></div>
            <img 
              src={event.imgURL} 
              alt={event.name}
              className="w-full h-[400px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <div className="transform transition-transform duration-500 group-hover:translate-y-[-8px]">
                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">{event?.name}</h2>
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 backdrop-blur-xl rounded-xl text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/20">
                    <i className="fa-solid fa-users mr-2"></i>Max Team: {event?.maxPlayer}
                  </div>
                  <div className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 backdrop-blur-xl rounded-xl text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/20">
                    <i className="fa-solid fa-user-shield mr-2"></i>Role: {role.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium">
              Click to expand
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl p-8 min-h-[200px] flex flex-col justify-center">
            <h2 className="text-4xl font-black text-white tracking-tight">{event?.name}</h2>
          </div>
        )}

        {/* Description Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-full blur-3xl"></div>
          <div className="relative p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <i className="fa-solid fa-info-circle text-white text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-white">About Event</h3>
            </div>
            <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">{event?.description || "No description provided."}</p>
          </div>
        </div>

        {/* Rules Section */}
        {event?.rules?.length > 0 && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-indigo-500/30 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-purple-600/5"></div>
            <div className="relative p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <i className="fa-solid fa-scale-balanced text-white text-xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-white">Rules & Regulations</h3>
              </div>
              <div className="space-y-6">
                {event.rules.map((rule, idx) => (
                  <div key={idx} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-6 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 transform hover:translate-x-2">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                    {rule.title && <h4 className="font-bold text-indigo-400 mb-4 text-lg">{rule.title}</h4>}
                    <ul className="space-y-3">
                      {rule.points?.map((point, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-3 text-slate-300">
                          <div className="w-6 h-6 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          </div>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Announcements */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-full blur-3xl"></div>
          <div className="relative p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center animate-pulse">
                <i className="fa-solid fa-bullhorn text-white text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-white">Announcements</h3>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
              {event?.updates?.length > 0 ? (
                event.updates.slice().reverse().map((u) => (
                  <div key={u._id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-5 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative">
                      <p className="text-slate-200 mb-3 leading-relaxed">{u.message}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <i className="fa-solid fa-clock"></i>
                        <span>{new Date(u.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-slate-800/50 mx-auto mb-4 flex items-center justify-center">
                    <i className="fa-solid fa-inbox text-slate-600 text-3xl"></i>
                  </div>
                  <p className="text-slate-500 italic">No announcements yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Key People Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-full blur-2xl"></div>
          <div className="relative p-6">
            <h3 className="font-bold text-white mb-6 text-xl flex items-center gap-2">
              <i className="fa-solid fa-crown text-yellow-500"></i>
              Key People
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-indigo-400 uppercase mb-3 tracking-wider">Admins</p>
                <div className="space-y-2">
                  {admins.map(a => (
                    <div key={a._id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
                        {a.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-slate-300 font-medium">{a.username}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase mb-3 tracking-wider">Managers</p>
                {managers.length ? (
                  <div className="space-y-2">
                    {managers.map(m => (
                      <div key={m._id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold">
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-slate-300 font-medium">{m.username}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">No managers assigned</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-full blur-2xl"></div>
          <div className="relative p-6">
            <h3 className="font-bold text-white mb-6 text-xl flex items-center gap-2">
              <i className="fa-solid fa-link text-indigo-400"></i>
              Quick Links
            </h3>
            <div className="space-y-3">
              {/* <Link to={`/events/${clubid}/${eventId}/bracket`} className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-indigo-500/50 p-4 transition-all duration-300 hover:scale-105 block">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div className="relative flex items-center justify-between">
                  <span className="font-medium text-slate-200 group-hover:text-white transition-colors flex items-center gap-3">
                    <i className="fa-solid fa-sitemap"></i>
                    Bracket
                  </span>
                  <i className="fa-solid fa-arrow-right text-slate-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-1"></i>
                </div>
              </Link> */}
              <Link to={`/events/${clubid}/${eventId}/matches`} className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-indigo-500/50 p-4 transition-all duration-300 hover:scale-105 block">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div className="relative flex items-center justify-between">
                  <span className="font-medium text-slate-200 group-hover:text-white transition-colors flex items-center gap-3">
                    <i className="fa-solid fa-trophy"></i>
                    Matches
                  </span>
                  <i className="fa-solid fa-arrow-right text-slate-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-1"></i>
                </div>
              </Link>
              <Link 
                to={role === "participant" ? `/events/${clubid}/${eventId}/query` : `/events/${clubid}/${eventId}/queries/admin`} 
                className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-indigo-500/50 p-4 transition-all duration-300 hover:scale-105 block"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-rose-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div className="relative flex items-center justify-between">
                  <span className="font-medium text-slate-200 group-hover:text-white transition-colors flex items-center gap-3">
                    <i className="fa-solid fa-question-circle"></i>
                    {role === "participant" ? "Raise a Query" : "Manage Queries"}
                  </span>
                  <i className="fa-solid fa-arrow-right text-slate-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-1"></i>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ScheduleTab = ({ schedules, isAdmin, scheduleForm, setScheduleForm, postAction, eventId, navigate, clubid }) => (
  <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
    <div className="lg:col-span-2 space-y-4">
      {schedules.map((s, idx) => (
        <div key={s._id} onClick={() => navigate(`/events/${clubid}/${eventId}/${s._id}`)} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 hover:border-indigo-500/50 p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] group shadow-xl">
          <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${idx % 3 === 0 ? 'from-indigo-500 to-purple-500' : idx % 3 === 1 ? 'from-purple-500 to-pink-500' : 'from-pink-500 to-rose-500'}`}></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-bold text-white text-xl mb-3 group-hover:text-indigo-400 transition-colors">{s.title}</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                    <i className="fa-solid fa-calendar text-indigo-400"></i>
                  </div>
                  <span>{s.date}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <i className="fa-solid fa-clock text-purple-400"></i>
                  </div>
                  <span>{s.time}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-8 h-8 rounded-lg bg-pink-600/20 flex items-center justify-center">
                    <i className="fa-solid fa-location-dot text-pink-400"></i>
                  </div>
                  <span>{s.location}</span>
                </div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:bg-indigo-600/20 transition-all">
              <i className="fa-solid fa-chevron-right text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all"></i>
            </div>
          </div>
        </div>
      ))}
    </div>
    {isAdmin && (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl h-fit">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-full blur-3xl"></div>
        <div className="relative p-6">
          <h3 className="font-bold text-white mb-6 text-xl flex items-center gap-2">
            <i className="fa-solid fa-plus-circle text-indigo-400"></i>
            Create Schedule
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); postAction(`/schedule/${eventId}/new-schedule`, scheduleForm); }} className="space-y-4">
            <input className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all text-sm" placeholder="Event Title" value={scheduleForm.title} onChange={e => setScheduleForm({ ...scheduleForm, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" className="bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm" onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })} />
              <input type="time" className="bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm" onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })} />
            </div>
            <input className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all text-sm" placeholder="Location" value={scheduleForm.location} onChange={e => setScheduleForm({ ...scheduleForm, location: e.target.value })} />
            <textarea className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all h-24 resize-none text-sm" placeholder="Description" value={scheduleForm.description} onChange={e => setScheduleForm({ ...scheduleForm, description: e.target.value })} />
            <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-indigo-500/30 text-sm">
              <i className="fa-solid fa-plus mr-2"></i>
              Add Schedule
            </button>
          </form>
        </div>
      </div>
    )}
  </div>
);

const TeamsTab = ({ teams, currentUser, isAdmin, event, eventId, teamForm, setTeamForm, postAction, navigate, clubid }) => {
  const myTeam = teams.find(t => t.members.some(m => String(m._id) === String(currentUser)));
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-slate-900/40 backdrop-blur-xl border border-indigo-500/30 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 animate-gradient"></div>
        <div className="relative p-8">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <i className="fa-solid fa-star text-white"></i>
            </div>
            My Team Status
          </h3>
          {myTeam ? (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h4 className="text-3xl font-bold text-indigo-400 mb-2">{myTeam.teamname}</h4>
                <div className="flex items-center gap-4 text-slate-400">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-users"></i>
                    <span>Members: {myTeam.members.length}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => navigate(`/events/${clubid}/${eventId}/team/${myTeam._id}`)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-indigo-500/30 text-sm">
                Manage Team
              </button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <div className="inline-block px-4 py-1 rounded-full bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 text-sm font-medium mb-3">
                  <i className="fa-solid fa-info-circle mr-2"></i>
                  Not Registered
                </div>
                <p className="text-slate-400 text-lg">Create or join a team to participate in the event.</p>
              </div>
              {(isAdmin || event?.teamsBy !== "admin") && event?.status === "registration" && (
                <form onSubmit={(e) => { e.preventDefault(); postAction("/teams/new-team", { teamname: teamForm.teamname, eventid: eventId }); }} className="flex gap-3 w-full md:w-auto">
                  <input className="bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all text-sm" placeholder="Team Name" value={teamForm.teamname} onChange={e => setTeamForm({ teamname: e.target.value })} />
                  <button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-indigo-500/30 text-sm whitespace-nowrap">
                    <i className="fa-solid fa-plus mr-2"></i>
                    Create Team
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <i className="fa-solid fa-people-group text-indigo-400"></i>
          Registered Teams
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {teams.filter(t => t.isRegistered).map((t, idx) => (
            <div key={t._id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-emerald-500/30 shadow-xl hover:border-emerald-500/60 transition-all duration-300 hover:scale-105 group cursor-pointer">
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${idx % 3 === 0 ? 'from-indigo-500 to-purple-500' : idx % 3 === 1 ? 'from-purple-500 to-pink-500' : 'from-pink-500 to-rose-500'}`}></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/30">
                    {t.teamname.charAt(0)}
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                    <i className="fa-solid fa-check-circle mr-1"></i>
                    Registered
                  </div>
                </div>
                <h4 className="font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors">{t.teamname}</h4>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <i className="fa-solid fa-users"></i>
                  <span>{t.members.length} members</span>
                </div>
                <button onClick={() => navigate(`/events/${clubid}/${eventId}/team/${t._id}`)} className="w-full bg-slate-800/50 hover:bg-emerald-600/20 border border-slate-700/50 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 font-medium py-2 rounded-lg transition-all duration-300 group-hover:translate-x-1 text-sm">
                  View Details
                  <i className="fa-solid fa-arrow-right ml-2"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminTab = ({ searchQuery, setSearchQuery, searchResults, setSearchResults, promoteForm, setPromoteForm, postAction, eventId, updateMsg, setUpdateMsg, schedules, teams, matchForm, setMatchForm }) => (
  <div className="grid lg:grid-cols-2 gap-6 animate-fadeIn">
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl p-6">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-full blur-2xl"></div>
      <div className="relative">
        <h3 className="font-bold text-white mb-6 text-xl flex items-center gap-2">
          <i className="fa-solid fa-user-plus text-indigo-400"></i>
          Promote Members
        </h3>
        <input 
          className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all mb-3" 
          placeholder="Search user..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
        />
        {searchResults.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl mb-4 max-h-40 overflow-y-auto custom-scrollbar">
            {searchResults.map(u => (
              <div key={u._id} onClick={() => { setPromoteForm({ ...promoteForm, userid: u._id }); setSearchQuery(u.username); setSearchResults([]); }} className="p-3 hover:bg-slate-700/50 cursor-pointer text-sm text-slate-300 transition-colors">
                {u.username}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <select className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all" value={promoteForm.post} onChange={e => setPromoteForm({ ...promoteForm, post: e.target.value })}>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={() => postAction("/events/promote", { ...promoteForm, eventid: eventId })} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-indigo-500/30">
            Promote
          </button>
        </div>
      </div>
    </div>

    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl p-6">
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-full blur-2xl"></div>
      <div className="relative">
        <h3 className="font-bold text-white mb-6 text-xl flex items-center gap-2">
          <i className="fa-solid fa-bullhorn text-purple-400"></i>
          Post Announcement
        </h3>
        <textarea 
          className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all h-32 resize-none mb-4 custom-scrollbar" 
          placeholder="What's happening?" 
          value={updateMsg} 
          onChange={e => setUpdateMsg(e.target.value)} 
        />
        <button onClick={() => { postAction("/events/updates", { eventid: eventId, message: updateMsg }); setUpdateMsg(""); }} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-purple-500/30">
          Post Announcement
        </button>
      </div>
    </div>

    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl p-6 lg:col-span-2">
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-rose-600/10 to-orange-600/10 rounded-full blur-3xl"></div>
      <div className="relative">
        <h3 className="font-bold text-white mb-6 text-xl flex items-center gap-2">
          <i className="fa-solid fa-swords text-rose-400"></i>
          Quick Match Creation
        </h3>
        <div className="grid md:grid-cols-4 gap-3">
          <select className="bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm" onChange={e => setMatchForm({ ...matchForm, scheduleid: e.target.value })}>
            <option value="">Select Schedule</option>
            {schedules.map(s => <option key={s._id} value={s._id}>{s.title}</option>)}
          </select>
          <select className="bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm" onChange={e => setMatchForm({ ...matchForm, teamA: e.target.value })}>
            <option value="">Team A</option>
            {teams.filter(t => t.isRegistered).map(t => <option key={t._id} value={t._id}>{t.teamname}</option>)}
          </select>
          <select className="bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm" onChange={e => setMatchForm({ ...matchForm, teamB: e.target.value })}>
            <option value="">Team B</option>
            {teams.filter(t => t.isRegistered).map(t => <option key={t._id} value={t._id}>{t.teamname}</option>)}
          </select>
          <button onClick={() => postAction("/events/match/create", { ...matchForm, eventid: eventId })} className="bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-rose-500/30 text-sm">
            Create Match
          </button>
        </div>
      </div>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export default function EventPage() {
  const { clubid, eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [role, setRole] = useState("participant");
  const [schedules, setSchedules] = useState([]);
  const [teams, setTeams] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showImageModal, setShowImageModal] = useState(false);

  // Forms
  const [scheduleForm, setScheduleForm] = useState({ title: "", date: "", time: "", location: "", description: "" });
  const [teamForm, setTeamForm] = useState({ teamname: "" });
  const [promoteForm, setPromoteForm] = useState({ userid: "", post: "manager" });
  const [updateMsg, setUpdateMsg] = useState("");
  const [matchForm, setMatchForm] = useState({ scheduleid: "", teamA: "", teamB: "", time: "" });
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const isAdmin = role === "admin" || role === "manager";

  const getAuthConfig = useCallback(() => {
    let token = localStorage.getItem("accessToken");
    if (!token) return null;
    try {
      const payload = jwtDecode(token);
      setCurrentUser(payload.id);
      return { headers: { Authorization: `Bearer ${token}` } };
    } catch { return null; }
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      const config = getAuthConfig();
      if (!config) return;
      const [evtRes, roleRes, schRes, teamRes] = await Promise.all([
        axiosInstance.get(`/events/${eventId}`, config),
        axiosInstance.get(`/events/roles/${eventId}`, config),
        axiosInstance.get(`/events/${eventId}/schedules`, config),
        axiosInstance.get(`/teams/${eventId}`, config)
      ]);
      setEvent(evtRes.data.event);
      setRole(evtRes.data.role);
      setAdmins(roleRes.data.admins);
      setManagers(roleRes.data.managers);
      setSchedules(schRes.data);
      setTeams(teamRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [eventId, getAuthConfig]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (!searchQuery.trim()) { setSearchResults([]); return; }
      axiosInstance.post("/auth/search-users", { q: searchQuery }, getAuthConfig())
        .then(res => setSearchResults(res.data))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery, getAuthConfig]);

  const postAction = async (url, body) => {
    try {
      await axiosInstance.post(url, body, getAuthConfig());
      fetchAllData();
      alert("Success!");
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-lg">Loading Event...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-slate-800/50">
          <div>
            <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
              <Link to="/home" className="hover:text-white cursor-pointer transition-colors">Home</Link>
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
              <span className="text-indigo-400 font-medium">Event Dashboard</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
              {event?.name}
            </h1>
          </div>
          {isAdmin && (
            <button onClick={() => navigate(`/events/${clubid}/${eventId}/edit`)} className="group relative overflow-hidden bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 hover:border-indigo-500/50 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-indigo-600/10 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative flex items-center gap-2">
                <i className="fa-solid fa-gear"></i>
                Settings
              </span>
            </button>
          )}
        </div>

        <div className="relative">
          <div className="flex gap-3 overflow-x-auto pb-3 border-b border-slate-800/50 scrollbar-hide">
            {[
              { id: "overview", label: "Overview", icon: "fa-chart-pie" },
              { id: "schedule", label: "Schedule", icon: "fa-calendar-days" },
              { id: "teams", label: "Teams", icon: "fa-people-group" },
              ...(isAdmin ? [{ id: "admin", label: "Admin Tools", icon: "fa-toolbox" }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <i className={`fa-solid ${tab.icon} text-lg`}></i>
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[500px]">
          {activeTab === "overview" && <OverviewTab event={event} role={role} admins={admins} managers={managers} clubid={clubid} eventId={eventId} setShowImageModal={setShowImageModal} />}
          {activeTab === "schedule" && <ScheduleTab schedules={schedules} isAdmin={isAdmin} scheduleForm={scheduleForm} setScheduleForm={setScheduleForm} postAction={postAction} eventId={eventId} navigate={navigate} clubid={clubid} />}
          {activeTab === "teams" && <TeamsTab teams={teams} currentUser={currentUser} isAdmin={isAdmin} event={event} eventId={eventId} teamForm={teamForm} setTeamForm={setTeamForm} postAction={postAction} navigate={navigate} clubid={clubid} />}
          {activeTab === "admin" && isAdmin && (
            <AdminTab 
              searchQuery={searchQuery} setSearchQuery={setSearchQuery} 
              searchResults={searchResults} setSearchResults={setSearchResults}
              promoteForm={promoteForm} setPromoteForm={setPromoteForm}
              postAction={postAction} eventId={eventId}
              updateMsg={updateMsg} setUpdateMsg={setUpdateMsg}
              schedules={schedules} teams={teams}
              matchForm={matchForm} setMatchForm={setMatchForm}
            />
          )}
        </div>
      </div>

      {showImageModal && event?.imgURL && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-fadeIn" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-7xl w-full h-full flex items-center justify-center">
            <img src={event.imgURL} alt={event.name} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
            <button className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all hover:scale-110" onClick={() => setShowImageModal(false)}>
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}