import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function EventMatches() {
  const { clubid, eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [role, setRole] = useState("participant");
 const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const auth = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    },
  });

  const isAdmin = role === "admin" || role === "manager";

  useEffect(() => {
    const fetchEvent = async () => {
      const res = await axiosInstance.get(`/events/${eventId}`, auth());
      setEvent(res.data.event);
      setRole(res.data.role);
    };
    fetchEvent();
  }, [eventId]);

  const fetchMatches = async () => {
  try {
    setLoading(true);

    const res = await axiosInstance.get(
      `/match/all/${eventId}`,
      auth()
    );

    console.log(res.data);

    setMatches(res.data.matches);

  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchMatches();
  }, [eventId]);



  const statusColor = status => {
    if (status === "finished") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (status === "live") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  const isByeMatch = (match) => {
    // A bye match is one where one team is missing and the other auto-advanced
    const hasTeamA = match.teamA?.teamId;
    const hasTeamB = match.teamB?.teamId;
    
    return (hasTeamA && !hasTeamB) || (!hasTeamA && hasTeamB);
  };

  // Filter out bye matches from display
  const getDisplayMatches = (matches) => {
    return matches.filter(match => !isByeMatch(match) || match.status !== 'finished');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header with glassmorphism effect */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Tournament Bracket
              </h1>
              {event?.eventname && (
                <p className="text-slate-400 mt-1">
                  {event.eventname}
                </p>
              )}
            </div>

         
          </div>
        </div>
      </div>

      {/* Matches Container */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!matches? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 border border-slate-700 mb-4">
              <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No matches Yet</h3>
            
          </div>
        ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {matches?.map((match, idx) => (
    <div
      key={match._id}
      onClick={() => {
        navigate(
          isAdmin
            ? `/events/${clubid}/${eventId}/matches/${match._id}`
            : `/events/${clubid}/${eventId}/matches/${match._id}/live`
        );
      }}
      className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.02]"
    >
      <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-xs font-bold">
        {idx + 1}
      </div>

      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center font-bold text-blue-400">
            {(match.teamA?.teamId?.teamname || "T")
              .charAt(0)
              .toUpperCase()}
          </div>

          <p className="font-semibold text-white">
            {match.teamA?.teamId?.teamname || "TBD"}
          </p>
        </div>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-slate-700"></div>
          <span className="text-xs font-bold text-slate-500">
            VS
          </span>
          <div className="flex-1 h-px bg-slate-700"></div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center font-bold text-purple-400">
            {(match.teamB?.teamId?.teamname || "T")
              .charAt(0)
              .toUpperCase()}
          </div>

          <p className="font-semibold text-white">
            {match.teamB?.teamId?.teamname || "TBD"}
          </p>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">
            {match.matchType}
          </span>

          <span
            className={`text-xs font-semibold px-4 py-1 rounded-full border ${statusColor(
              match.status
            )}`}
          >
            {match.status === "finished"
              ? "✓ Finished"
              : match.status === "live"
              ? "● Live"
              : "◌ Upcoming"}
          </span>
        </div>
      </div>
    </div>
  ))}
</div>
        )}
      </div>
    </div>
  );
}