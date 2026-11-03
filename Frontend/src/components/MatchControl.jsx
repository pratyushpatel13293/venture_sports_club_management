import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "../socket"; // STOMP wrapper with the Socket.IO-style API
import axiosInstance from "../utils/axiosInstance";
import AIPredictionWidget from "./AIPredictionWidget";
import AIHighlightsWidget from "./AIHighlightsWidget";

export default function MatchControl() {
  const { matchId } = useParams();

  const [match, setMatch] = useState(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [showAI, setShowAI] = useState(true);

  const socketRef = useRef(null);
  const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5005`;

  const auth = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    },
  });

  /* ================= FETCH MATCH ================= */
  const fetchMatch = async () => {
    const res = await axiosInstance.get(`/events/matches/${matchId}`, auth());
    const data = res.data;
    setMatch(data);

    const active = data.rounds.find((r) => !r.isCompleted);

    if (active) {
      setScoreA(active.teamA_score);
      setScoreB(active.teamB_score);
    } else {
      setScoreA(0);
      setScoreB(0);
    }
  };

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  /* ================= SOCKET ================= */
  useEffect(() => {
    if (!match?.eventid) return;
    if (socketRef.current) return;

    const socket = io(BACKEND_URL, {
      auth: {
        token: localStorage.getItem("accessToken"),
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:event", {
        eventId: match.eventid.toString(),
      });
    });

    socket.on("match:round:update", (data) => {
      if (data.matchId === matchId) {
        setScoreA(data.teamA_score);
        setScoreB(data.teamB_score);
        fetchMatch();
      }
    });

    socket.on("match:round:ended", (data) => {
      if (data.matchId === matchId) fetchMatch();
    });

    socket.on("match:ended", (data) => {
      if (data.matchId === matchId) fetchMatch();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [match?.eventid, matchId]);

  /* ================= DERIVED STATE ================= */
  const activeRound = useMemo(() => {
    if (!match) return null;
    return match.rounds.find((r) => !r.isCompleted);
  }, [match]);

  const displayRoundNo = activeRound
    ? activeRound.roundNo
    : match
    ? match.rounds.length + 1
    : 1;

  /* ================= ACTIONS ================= */
  const startMatch = async () => {
    await axiosInstance.post(`/events/matches/${matchId}/start`, {}, auth());
    fetchMatch();
  };

  const updateScore = async (team, val) => {
    if (match.status !== "live") return;
    await axiosInstance.put(
      `/events/matches/${matchId}/round/score`,
      { team, points: val },
      auth()
    );
    fetchMatch();
  };

  const incA = () => {
    const v = scoreA + 1;
    setScoreA(v);
    updateScore("A", v);
  };

  const decA = () => {
    if (scoreA === 0) return;
    const v = scoreA - 1;
    setScoreA(v);
    updateScore("A", v);
  };

  const incB = () => {
    const v = scoreB + 1;
    setScoreB(v);
    updateScore("B", v);
  };

  const decB = () => {
    if (scoreB === 0) return;
    const v = scoreB - 1;
    setScoreB(v);
    updateScore("B", v);
  };

  const endRound = async () => {
    if (match.status !== "live") return;
    await axiosInstance.post(`/events/matches/${matchId}/round/end`, {}, auth());
    fetchMatch();
  };

  const endMatch = async () => {
    if (match.status !== "live") return;
    await axiosInstance.post(`/events/matches/${matchId}/end`, {}, auth());
    fetchMatch();
  };

  if (!match)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Match Control Panel
            </h2>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${match.status === 'live' ? 'bg-red-500 animate-pulse' : match.status === 'finished' ? 'bg-green-500' : 'bg-slate-500'}`}></div>
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                {match.status}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-lg">
            <span className="font-bold text-blue-400">{match.teamA.teamId.teamname}</span>
            <span className="text-slate-500 font-bold">VS</span>
            <span className="font-bold text-purple-400">{match.teamB.teamId.teamname}</span>
          </div>

          <p className="text-center text-sm text-slate-400 mt-2">
            Round {displayRoundNo}
          </p>
        </div>

        {/* AI Prediction Widget Section */}
        {match.status !== "finished" && (
          <div className="mb-6">
            <div className="flex justify-center mb-4">
              <button
                onClick={() => setShowAI(!showAI)}
                className="px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl font-bold text-xs tracking-wider uppercase text-indigo-400 hover:text-indigo-300 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                🤖 {showAI ? "Hide" : "Show"} AI Predictions & Analysis
              </button>
            </div>
            {showAI && <AIPredictionWidget matchId={matchId} />}
          </div>
        )}

        {/* Start Match Button */}
        {match.status === "upcoming" && (
          <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 mb-6 text-center">
            <button
              onClick={startMatch}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-semibold text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transform hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Start Match
            </button>
          </div>
        )}

        {/* Score Panel */}
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-700/50 rounded-2xl p-8 mb-6">
          <h3 className="text-lg font-semibold text-center mb-6 text-slate-300">Current Score</h3>
          
          <div className="grid grid-cols-2 gap-8">
            {/* Team A */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center text-blue-400 text-3xl font-bold border-2 border-blue-500/30">
                {match.teamA.teamId.teamname.charAt(0).toUpperCase()}
              </div>
              <p className="font-bold text-white mb-4 truncate px-2">{match.teamA.teamId.teamname}</p>
              
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={decA}
                  disabled={match.status !== "live" || scoreA === 0}
                  className="w-12 h-12 rounded-xl bg-slate-700/50 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-2xl font-bold text-white transition-all hover:scale-110 active:scale-95"
                >
                  −
                </button>
                <span className="text-5xl font-bold text-white min-w-[80px]">{scoreA}</span>
                <button
                  onClick={incA}
                  disabled={match.status !== "live"}
                  className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-2xl font-bold text-white transition-all hover:scale-110 active:scale-95 shadow-lg shadow-blue-500/30"
                >
                  +
                </button>
              </div>
            </div>

            {/* Team B */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center text-purple-400 text-3xl font-bold border-2 border-purple-500/30">
                {match.teamB.teamId.teamname.charAt(0).toUpperCase()}
              </div>
              <p className="font-bold text-white mb-4 truncate px-2">{match.teamB.teamId.teamname}</p>
              
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={decB}
                  disabled={match.status !== "live" || scoreB === 0}
                  className="w-12 h-12 rounded-xl bg-slate-700/50 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-2xl font-bold text-white transition-all hover:scale-110 active:scale-95"
                >
                  −
                </button>
                <span className="text-5xl font-bold text-white min-w-[80px]">{scoreB}</span>
                <button
                  onClick={incB}
                  disabled={match.status !== "live"}
                  className="w-12 h-12 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed text-2xl font-bold text-white transition-all hover:scale-110 active:scale-95 shadow-lg shadow-purple-500/30"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <div className="flex gap-4">
            <button
              onClick={endRound}
              disabled={match.status !== "live" || (scoreA === 0 && scoreB === 0)}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              End Round
            </button>

            <button
              onClick={endMatch}
              disabled={match.status !== "live"}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
              </svg>
              End Match
            </button>
          </div>
        </div>

        {/* Round History */}
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Round History
          </h3>
          
          {match.rounds.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No rounds completed yet</p>
          ) : (
            <div className="space-y-2">
              {match.rounds.map((r) => (
                <div
                  key={r._id}
                  className="flex items-center justify-between bg-slate-800/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center text-xs font-bold text-slate-300">
                      R{r.roundNo}
                    </div>
                    <span className="text-slate-300 font-medium">Round {r.roundNo}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-blue-400 font-bold text-lg">{r.teamA_score}</span>
                    <span className="text-slate-500 font-bold">:</span>
                    <span className="text-purple-400 font-bold text-lg">{r.teamB_score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Winner Display */}
        {match.winner && (
          <div className="backdrop-blur-xl bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/50 rounded-2xl p-6 mt-6 text-center mb-6">
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-xl font-bold text-white mb-1">Match Winner</p>
            <p className="text-2xl font-bold text-green-400">
              {match.winner.toString() === match.teamA.teamId._id
                ? match.teamA.teamId.teamname
                : match.teamB.teamId.teamname}
            </p>
          </div>
        )}

        {/* AI Highlights Widget */}
        {match.status === "finished" && (
          <div className="mt-6">
            <AIHighlightsWidget matchId={matchId} />
          </div>
        )}
      </div>
    </div>
  );
}