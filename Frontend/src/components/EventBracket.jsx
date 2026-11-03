import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function EventBracket() {
  const { eventId, clubid } = useParams();
  const navigate = useNavigate();
  const [stages, setStages] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const auth = () => {
    const token = localStorage.getItem("accessToken");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [stagesRes, eventRes] = await Promise.all([
          axiosInstance.get(`/events/${eventId}/stages`, auth()),
          axiosInstance.get(`/events/${eventId}`, auth())
        ]);
        setStages(stagesRes.data);
        setEvent(eventRes.data.event);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const statusColor = (status) => {
    if (status === "finished") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (status === "live") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  const getTeamLabel = (teamData) => {
    if (teamData?.teamId?.teamname) {
      return teamData.teamId.teamname;
    }
    return "TBD";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400">Loading tournament bracket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Tournament Bracket
          </h1>
          {event?.eventname && (
            <p className="text-slate-400 mt-1">{event.eventname}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {stages.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 border border-slate-700 mb-4">
              <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No Bracket Available</h3>
            <p className="text-slate-500">The tournament bracket hasn't been generated yet</p>
          </div>
        ) : (
          <div className="space-y-10">
            {stages.map((stage, stageIdx) => (
              <div key={stage._id} className="relative">
                {/* Stage Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg">
                      {stageIdx + 1}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {stage.name}
                      </h2>
                      <p className="text-sm text-slate-400">
                        {stage.matches.length} {stage.matches.length === 1 ? 'match' : 'matches'}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
                </div>

                {/* Matches Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stage.matches.map((match, matchIdx) => (
                    <div
                      key={match._id}
                      onClick={() => navigate(`/events/${clubid}/${eventId}/matches/${match._id}/live`)}
                      className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.02]"
                    >
                      {/* Match Number Badge */}
                      <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                        {matchIdx + 1}
                      </div>

                      <div className="p-5">
                        {/* Team A */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">
                            {getTeamLabel(match.teamA).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                              {getTeamLabel(match.teamA)}
                            </p>
                          </div>
                        </div>

                        {/* VS Divider */}
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-slate-700"></div>
                          <span className="text-xs font-bold text-slate-500 bg-slate-700/50 px-3 py-1 rounded-full">
                            VS
                          </span>
                          <div className="flex-1 h-px bg-slate-700"></div>
                        </div>

                        {/* Team B */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center text-purple-400 font-bold border border-purple-500/30">
                            {getTeamLabel(match.teamB).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                              {getTeamLabel(match.teamB)}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex justify-end">
                          <span className={`text-xs font-semibold px-4 py-1.5 rounded-full border ${statusColor(match.status)} transition-all duration-300`}>
                            {match.status === 'finished' ? '✓ Finished' : 
                             match.status === 'live' ? '● Live' : 
                             '◌ Upcoming'}
                          </span>
                        </div>
                      </div>

                      {/* Hover Overlay Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}