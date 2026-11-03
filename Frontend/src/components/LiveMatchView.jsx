import React, { useEffect, useRef, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { io } from "../socket"; // STOMP wrapper with the Socket.IO-style API
import axiosInstance from "../utils/axiosInstance";
import AIPredictionWidget from "./AIPredictionWidget";
import AIHighlightsWidget from "./AIHighlightsWidget";

export default function LiveMatchView() {
  const { matchId } = useParams();
  const BACKEND_URL = `localhost:5005`;

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(true);
  const socketRef = useRef(null);

  /* ================= FETCH MATCH ================= */
  useEffect(() => {
    let intervalId;

    const fetchMatch = async () => {
      try {
        console.log("📥 [VIEWER] fetching match:", matchId);
        const res = await axiosInstance.get(`/events/matches/${matchId}`);
        setMatch(res.data);
      } catch (err) {
        console.error("❌ [VIEWER] fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
    intervalId = setInterval(fetchMatch, 4500);

    return () => {
      clearInterval(intervalId);
    };
  }, [matchId]);

  /* ================= SOCKET ================= */
  useEffect(() => {
    if (!match || !match.eventid) return;
    if (socketRef.current) return;

    const eventId = match.eventid.toString();
    console.log("🟡 [VIEWER] creating socket for event:", eventId);

    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      auth: {
        token: localStorage.getItem("accessToken"),
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 [VIEWER] socket connected:", socket.id);
      socket.emit("join:event", { eventId }, (ack) => {
        console.log("📍 [VIEWER] join:event ACK:", ack);
      });
    });

    socket.on("match:round:update", (data) => {
      console.log("🔥 [VIEWER] live update:", data);
      if (data.matchId !== matchId) return;

      setMatch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rounds: prev.rounds.map((r) =>
            r.roundNo === data.roundNo
              ? {
                  ...r,
                  teamA_score: data.teamA_score,
                  teamB_score: data.teamB_score,
                }
              : r
          ),
        };
      });
    });

    socket.on("match:round:ended", (data) => {
      console.log("🏁 [VIEWER] round ended:", data);
    });

    socket.on("match:ended", (data) => {
      console.log("🏆 [VIEWER] match ended:", data);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ [VIEWER] socket error:", err.message);
    });

    return () => {
      console.log("🔴 [VIEWER] socket disconnected");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [match, matchId]);

  /* ================= DERIVED STATE ================= */
  const activeRound = useMemo(() => {
    if (!match) return null;
    return match.rounds.find((r) => !r.isCompleted);
  }, [match]);

  /* ================= UI ================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400">Loading live match...</p>
        </div>
      </div>
    );
  }

  if (!match) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Live Status Banner */}
        {match.status === "live" && (
          <div className="backdrop-blur-xl bg-red-600/20 border border-red-500/50 rounded-2xl p-4 mb-6 flex items-center justify-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-red-400 uppercase tracking-wider">Live Match</span>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>
        )}

        {/* Match Header */}
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-700/50 rounded-2xl p-8 mb-6 text-center">
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center text-blue-400 text-3xl font-bold border-2 border-blue-500/30">
                {match.teamA.teamId.teamname.charAt(0).toUpperCase()}
              </div>
              <p className="font-bold text-xl text-white">{match.teamA.teamId.teamname}</p>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-slate-500 font-bold text-2xl mb-2">VS</span>
              {match.status === "live" && activeRound && (
                <span className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                  Round {activeRound.roundNo}
                </span>
              )}
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center text-purple-400 text-3xl font-bold border-2 border-purple-500/30">
                {match.teamB.teamId.teamname.charAt(0).toUpperCase()}
              </div>
              <p className="font-bold text-xl text-white">{match.teamB.teamId.teamname}</p>
            </div>
          </div>

          {match.status !== "live" && (
            <p className="text-slate-400 text-sm mt-4">Match Finished</p>
          )}
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

        {/* Live Score Display */}
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-700/50 rounded-2xl p-8 mb-6">
          <h3 className="text-center text-slate-400 text-sm font-semibold uppercase tracking-wider mb-6">
            {match.status === "live" ? "Current Score" : "Final Score"}
          </h3>
          
          <div className="grid grid-cols-2 gap-12">
            {/* Team A Score */}
            <div className="text-center">
              <div className="relative">
                <div className="text-7xl font-bold text-white mb-2 drop-shadow-lg">
                  {activeRound?.teamA_score ?? 0}
                </div>
                {activeRound?.teamA_score > activeRound?.teamB_score && match.status === "live" && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-sm">{match.teamA.teamId.teamname}</p>
            </div>

            {/* Team B Score */}
            <div className="text-center">
              <div className="relative">
                <div className="text-7xl font-bold text-white mb-2 drop-shadow-lg">
                  {activeRound?.teamB_score ?? 0}
                </div>
                {activeRound?.teamB_score > activeRound?.teamA_score && match.status === "live" && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-sm">{match.teamB.teamId.teamname}</p>
            </div>
          </div>
        </div>

        {/* Round History */}
        <div className="backdrop-blur-xl bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Round History
          </h3>

          {match.rounds.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No rounds completed yet</p>
          ) : (
            <div className="space-y-2">
              {match.rounds.map((r) => (
                <div
                  key={r.roundNo}
                  className={`flex items-center justify-between bg-slate-800/50 backdrop-blur-sm px-4 py-3 rounded-xl border transition-all ${
                    !r.isCompleted
                      ? "border-amber-500/50 bg-amber-500/5"
                      : "border-slate-700/50 hover:border-blue-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      !r.isCompleted
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-gradient-to-br from-blue-500/20 to-purple-600/20 text-slate-300"
                    }`}>
                      R{r.roundNo}
                    </div>
                    <span className="text-slate-300 font-medium">
                      Round {r.roundNo}
                      {!r.isCompleted && (
                        <span className="ml-2 text-xs text-amber-400 font-semibold">● In Progress</span>
                      )}
                    </span>
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
          <div className="backdrop-blur-xl bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/50 rounded-2xl p-8 text-center animate-pulse mb-6">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-2xl font-bold text-white mb-2">Match Winner</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              {match.winner === match.teamA.teamId._id
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