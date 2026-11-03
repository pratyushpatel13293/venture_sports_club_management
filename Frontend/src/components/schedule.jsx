import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams ,useNavigate} from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "../utils/axiosInstance";
export default function SchedulePage() {
const { clubid, eventId, scheduleid } = useParams();
const scheduleId = scheduleid;


const navigate=useNavigate();
const [teams, setTeams] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [matches, setMatches] = useState([]);
  const [qualifiedTeams, setQualifiedTeams] = useState([]);
  const [role, setRole] = useState("participant");
  const [loading, setLoading] = useState(true);
const [showCreateMatch, setShowCreateMatch] = useState(false);
// console.log(teams);
const [newMatch, setNewMatch] = useState({
  teamA: "",
  teamB: "",
  slotIndex: "",
  matchType: ""
});
const [showSmartSchedule, setShowSmartSchedule] = useState(false);
const [smartSuggestions, setSmartSuggestions] = useState(null);
const [loadingSuggestions, setLoadingSuggestions] = useState(false);

const fetchSmartSuggestions = async () => {
  try {
    setLoadingSuggestions(true);
    const config = getAuthConfig();
    const res = await axiosInstance.get(`/ai/schedule/${scheduleId}/smart-schedule`, config);
    setSmartSuggestions(res.data);
    setShowSmartSchedule(true);
  } catch (err) {
    console.error("Failed to fetch smart schedule suggestions:", err);
  } finally {
    setLoadingSuggestions(false);
  }
};

const applySmartSchedule = async () => {
  if (!smartSuggestions || !smartSuggestions.recommendations) return;
  try {
    const config = getAuthConfig();
    const pairings = smartSuggestions.recommendations.map(r => ({
      teamAId: r.teamA._id,
      teamBId: r.teamB._id,
      slotIndex: r.slotIndex
    }));
    await axiosInstance.post(
      `/ai/schedule/${scheduleId}/smart-schedule/apply`,
      { pairings },
      config
    );
    setShowSmartSchedule(false);
    fetchMatches();
    fetchAvailableTeams();
  } catch (err) {
    console.error("Failed to apply smart schedule:", err);
  }
};
  const getAuthConfig = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    return { headers: { Authorization: `Bearer ${token}` } };
  };
const fetchAvailableTeams = async () => {
  try {

    const config = getAuthConfig();

    const res = await axiosInstance.get(
      `/match/available-teams/${scheduleId}`,
      config
    );

    setTeams(res.data.teams);

  } catch (err) {
    console.error(err);
  }
};
  const fetchScheduleInfo = async () => {
    try {
      const config = getAuthConfig();
      const res = await axiosInstance.get(
        `/schedule/${scheduleId}`,
        config
      );

      setSchedule(res.data.schedule);
      setMatches(res.data.matches);
      setQualifiedTeams(res.data.qualified || []);
      setRole(res.data.role);
    } catch (err) {
      console.error("Schedule fetch failed", err);
    } finally {
      setLoading(false);
    }
  };
const fetchMatches = async () => {
  try {
    const config = getAuthConfig();

    const res = await axiosInstance.get(
      `/match/schedule/${scheduleId}`,
      config
    );

    setMatches(res.data.matches);
  } catch (err) {
    console.error(err);
  }
};


const createMatch = async () => {
  try {

    const config = getAuthConfig();

    await axiosInstance.post(
      "/match/create",
      {
        eventid: eventId,
        scheduleid: scheduleId,

        teamA: newMatch.teamA,
        teamB: newMatch.teamB,

        slotIndex: Number(newMatch.slotIndex),

        matchType: schedule.title
      },
      config
    );

    setShowCreateMatch(false);

    fetchMatches();

  } catch (err) {
    console.error(err);
  }
};
  useEffect(() => {
    fetchScheduleInfo();
    fetchMatches();
    fetchAvailableTeams();
  }, [scheduleId]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading schedule…
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* HEADING */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h1 className="text-3xl font-bold">{schedule.title}</h1>
          <p className="text-slate-400 mt-1">{schedule.date} • {schedule.time}</p>
          <p className="text-slate-400">{schedule.location}</p>
          {schedule.description && (
            <p className="mt-2 text-slate-300">{schedule.description}</p>
          )}
        </div>

       <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold">
      Matches
    </h2>

    {role !== "participant" && (
      <div className="flex items-center gap-3">
        <button
          onClick={fetchSmartSuggestions}
          disabled={loadingSuggestions}
          className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white rounded font-semibold text-xs tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-lg"
        >
          {loadingSuggestions ? "🤖 Analyzing..." : "🤖 AI Smart Scheduler"}
        </button>
        <button
          onClick={() => setShowCreateMatch(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer"
        >
          Create Match
        </button>
      </div>
    )}
  </div>

  {matches.length === 0 ? (
    <p className="text-slate-500">
      No matches scheduled yet
    </p>
  ) : (
    <div className="space-y-3">
      {matches.map((match) => (
        <div
        onClick={
()=>{
  navigate(`/events/${clubid}/${eventId}/matches/${match._id}`)
}
}
          key={match._id}
          className="bg-slate-700 rounded p-4"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">
                {match.teamA?.teamId?.teamname || "TBD"}
                {" vs "}
                {match.teamB?.teamId?.teamname || "TBD"}
              </p>

              <p className="text-xs text-slate-400">
                Slot #{match.slotIndex}
              </p>

              <p className="text-xs text-slate-400">
                {match.matchType}
              </p>
            </div>

            <span
              className={`px-2 py-1 rounded text-xs ${
                match.status === "upcoming"
                  ? "bg-blue-600"
                  : match.status === "live"
                  ? "bg-green-600"
                  : "bg-yellow-600"
              }`}
            >
              {match.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

        {/* QUALIFIED TEAMS */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h2 className="text-xl font-semibold">Qualified Teams</h2>

          {qualifiedTeams.length === 0 ? (
            <p className="text-slate-500 text-sm mt-2">No teams qualified yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {qualifiedTeams.map((t) => (
                <div
                  key={t._id}
                  className="p-3 bg-slate-700 rounded border border-slate-600"
                >
                  <p className="font-medium">{t.teamname}</p>
                  <p className="text-xs text-slate-400">
                    Members: {t.members.length}
                  </p>
                </div>
              ))}
            </div>
          )}
          {
showCreateMatch && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center">

    <div className="bg-slate-800 p-6 rounded-lg w-96">

      <h2 className="text-xl font-bold mb-4">
        Create Match
      </h2>


      <select
  value={newMatch.teamA}
  onChange={(e) =>
    setNewMatch({
      ...newMatch,
      teamA: e.target.value
    })
  }
  className="w-full p-2 bg-slate-700 rounded"
>
  <option value="">
    Select Team A
  </option>

  {teams.map(team => (
    <option
      key={team._id}
      value={team._id}
    >
      {team.teamname}
    </option>
  ))}
</select>

     <select
  value={newMatch.teamB}
  onChange={(e) =>
    setNewMatch({
      ...newMatch,
      teamB: e.target.value
    })
  }
  className="w-full p-2 bg-slate-700 rounded"
>
  <option value="">
    Select Team B
  </option>

  {teams
    .filter(
      team =>
        team._id !== newMatch.teamA
    )
    .map(team => (
      <option
        key={team._id}
        value={team._id}
      >
        {team.teamname}
      </option>
    ))}
</select>

      <input
        placeholder="Slot Index"
        type="number"
        className="w-full p-2 rounded bg-slate-700 mb-3"
        onChange={(e)=>
          setNewMatch({
            ...newMatch,
            slotIndex:e.target.value
          })
        }
      />

      <button
        onClick={createMatch}
        className="w-full bg-emerald-600 p-2 rounded"
      >
        Create
      </button>
      <button onClick={()=>{setShowCreateMatch(false)}} className="text-xl font-bold mb-4">
        Back
      </button>

    </div>

  </div>
)
}

{/* Smart Scheduling Recommendations Modal */}
{showSmartSchedule && smartSuggestions && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-slate-900 border border-slate-700/60 p-6 rounded-2xl w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col">
      
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-xl">🤖</span>
        <h2 className="text-xl font-black bg-gradient-to-r from-indigo-400 via-blue-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider">
          AI Smart Scheduler
        </h2>
      </div>
      <p className="text-slate-400 text-xs mb-4">
        Based on tournament histories, the AI has generated optimal pairings for {smartSuggestions.availableTeamsCount} available teams with conflict-free slot assignments.
      </p>

      {/* Recommendations List Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
        {smartSuggestions.recommendations && smartSuggestions.recommendations.length > 0 ? (
          smartSuggestions.recommendations.map((rec, idx) => (
            <div key={idx} className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors hover:border-indigo-500/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 uppercase">Slot #{rec.slotIndex}</span>
                  <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-550/20 px-2 py-0.5 rounded-full font-bold">
                    ⏱️ {rec.recommendedTime}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    rec.competitiveness === "High"
                      ? "bg-green-950/40 text-green-400 border-green-500/20"
                      : "bg-yellow-950/40 text-yellow-400 border-yellow-500/20"
                  }`}>
                    {rec.competitiveness} Match
                  </span>
                </div>
                <p className="font-bold text-slate-200">
                  {rec.teamA.teamname} <span className="text-slate-500 text-sm font-medium">vs</span> {rec.teamB.teamname}
                </p>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-lg">
                  {rec.reason}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-slate-800/20 border border-slate-800 rounded-xl">
            <span className="text-2xl block mb-2">⚠️</span>
            <p className="text-slate-400 text-sm font-semibold">Not enough teams available for pairing recommendations.</p>
            <p className="text-slate-500 text-xs mt-1">Make sure you have at least 2 registered teams not currently scheduled in this bracket.</p>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-6 border-t border-slate-800 pt-4">
        <button
          onClick={() => setShowSmartSchedule(false)}
          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
        >
          Cancel
        </button>
        {smartSuggestions.recommendations && smartSuggestions.recommendations.length > 0 && (
          <button
            onClick={applySmartSchedule}
            className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-green-550/20 transition-all cursor-pointer text-center"
          >
            Apply AI Schedule
          </button>
        )}
      </div>
      
    </div>
  </div>
)}
        </div>

      </div>
    </div>
  );
}
