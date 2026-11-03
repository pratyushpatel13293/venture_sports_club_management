import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";

export default function AIPredictionWidget({ matchId }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animatedProbA, setAnimatedProbA] = useState(50);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/ai/match/${matchId}/prediction`);
      setPrediction(res.data);
      setError(null);
      
      // Trigger animation for the progress bar
      setTimeout(() => {
        setAnimatedProbA(res.data.probabilityA);
      }, 100);
    } catch (err) {
      console.error("Failed to fetch AI predictions:", err);
      setError("Unable to load AI predictions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, [matchId]);

  if (loading) {
    return (
      <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 animate-pulse"></div>
        <div className="relative z-10 py-6">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-medium tracking-wider uppercase text-xs animate-pulse">
            🤖 AI Analyst Processing Core Statistics...
          </p>
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 text-center text-slate-400">
        <p>{error || "No prediction data available for this match."}</p>
      </div>
    );
  }

  const {
    tbd,
    teamA,
    teamB,
    probabilityA,
    probabilityB,
    confidence,
    confidenceValue,
    reasons,
    keyFactors,
    movement,
    stats,
    commentary
  } = prediction;

  if (tbd) {
    return (
      <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 text-center">
        <h3 className="font-bold text-lg text-slate-400 mb-2">🤖 AI Match Prediction Engine</h3>
        <p className="text-slate-500 text-sm">Prediction metrics will activate once both participating teams are finalized.</p>
      </div>
    );
  }

  const isUp = movement >= 0;

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6 shadow-2xl shadow-indigo-950/20 relative overflow-hidden transition-all hover:border-indigo-500/40">
      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.12),rgba(255,255,255,0))] pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
          <div>
            <h3 className="font-extrabold text-xl bg-gradient-to-r from-indigo-400 via-blue-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider">
              Venture AI Predictor
            </h3>
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold mt-0.5">
              Live Esports Match Simulator v5.0
            </p>
          </div>
        </div>

        {/* Confidence Badge & Movement */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Movement:</span>
            <span className={`text-xs font-bold flex items-center gap-1 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
              {isUp ? "📈" : "📉"} {isUp ? "+" : ""}{movement}%
            </span>
          </div>

          <div className="bg-indigo-950/50 border border-indigo-500/30 px-3.5 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold">Confidence:</span>
            <span className="text-xs font-black text-indigo-200">
              {confidence} ({confidenceValue}%)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Side: Graphs and LLM Commentary (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Winning Probability Graph */}
          <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Winning Probability</span>
              <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                Live Estimation
              </span>
            </div>

            {/* Team Names and Big Percentages */}
            <div className="flex justify-between items-end mb-4">
              <div className="text-left">
                <span className="text-xs font-semibold text-slate-400 block mb-0.5">Team A</span>
                <span className="font-black text-2xl text-blue-400 truncate max-w-[180px] block">{teamA.teamname}</span>
                <span className="font-extrabold text-3xl text-white">{probabilityA}%</span>
              </div>
              
              <div className="text-slate-600 font-black text-sm pb-1">VS</div>
              
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 block mb-0.5">Team B</span>
                <span className="font-black text-2xl text-pink-400 truncate max-w-[180px] block">{teamB.teamname}</span>
                <span className="font-extrabold text-3xl text-white">{probabilityB}%</span>
              </div>
            </div>

            {/* Horizontal Dual Progress Bar */}
            <div className="h-5 w-full bg-slate-800 rounded-full overflow-hidden flex p-0.5 border border-slate-700">
              <div
                style={{ width: `${animatedProbA}%` }}
                className="h-full rounded-l-full bg-gradient-to-r from-blue-600 via-indigo-650 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out relative"
              >
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
              </div>
              <div
                style={{ width: `${100 - animatedProbA}%` }}
                className="h-full rounded-r-full bg-gradient-to-r from-pink-500 via-rose-550 to-rose-600 shadow-[0_0_12px_rgba(236,72,153,0.5)] transition-all duration-1000 ease-out"
              ></div>
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-semibold px-1">
              <span>PROBABILITY A</span>
              <span>PROBABILITY B</span>
            </div>
          </div>

          {/* Generative AI LLM Commentary */}
          <div className="relative group">
            {/* Cybernetic glowing background */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-15 group-hover:opacity-25 transition duration-300"></div>
            
            <div className="relative bg-slate-950/80 border border-slate-800/80 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🤖</span>
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                  AI Analyst AI commentary
                </span>
              </div>

              <blockquote className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-indigo-500 pl-4 font-medium">
                "{commentary}"
              </blockquote>
            </div>
          </div>

          {/* Key Factors */}
          <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Key Factors Favoring Outcomes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {keyFactors.map((factor, idx) => {
                const isTeamA = factor.advantage === "teamA";
                const isNeutral = factor.advantage === "neutral";
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border ${
                      isNeutral
                        ? "bg-slate-800/40 border-slate-700/50"
                        : isTeamA
                        ? "bg-blue-950/20 border-blue-500/20 text-blue-100"
                        : "bg-pink-950/20 border-pink-500/20 text-pink-100"
                    }`}
                  >
                    <span className="text-sm">
                      {isNeutral ? "ℹ️" : isTeamA ? "🔵" : "🔴"}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold leading-snug">{factor.text}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Advantage: {isNeutral ? "Neutral" : isTeamA ? teamA.teamname : teamB.teamname}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Side: Metrics Table and Reasons (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Reasons List */}
          <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Confidence Breakdown</h4>
            <ul className="space-y-2.5">
              {reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                  <span className="text-indigo-400 mt-0.5">✦</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stat Comparison Table */}
          <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-5 overflow-hidden">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Head-to-Head Statistics</h4>
            
            <div className="space-y-4">
              {/* Stat Row: Win Rate */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5 px-0.5">
                  <span className="text-blue-400">{stats.winRateA}%</span>
                  <span className="text-slate-400 uppercase text-[10px]">Win Rate</span>
                  <span className="text-pink-400">{stats.winRateB}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full flex overflow-hidden">
                  <div style={{ width: `${stats.winRateA}%` }} className="h-full bg-blue-500"></div>
                  <div style={{ width: `${stats.winRateB}%` }} className="h-full bg-pink-500 ml-auto"></div>
                </div>
              </div>

              {/* Stat Row: Recent Form */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5 px-0.5">
                  <span className="text-blue-400">{stats.formA}%</span>
                  <span className="text-slate-400 uppercase text-[10px]">Recent Form (Last 5)</span>
                  <span className="text-pink-400">{stats.formB}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full flex overflow-hidden">
                  <div style={{ width: `${stats.formA}%` }} className="h-full bg-blue-500"></div>
                  <div style={{ width: `${stats.formB}%` }} className="h-full bg-pink-500 ml-auto"></div>
                </div>
              </div>

              {/* Stat Row: K/D Ratio */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5 px-0.5">
                  <span className="text-blue-400">{stats.kdA.toFixed(2)}</span>
                  <span className="text-slate-400 uppercase text-[10px]">Roster avg K/D</span>
                  <span className="text-pink-400">{stats.kdB.toFixed(2)}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full flex overflow-hidden">
                  {/* Map KD values between 0.8 and 1.8 to percentages for progress display */}
                  <div style={{ width: `${Math.max(10, Math.min(90, ((stats.kdA - 0.8) / 1.0) * 100))}%` }} className="h-full bg-blue-500"></div>
                  <div style={{ width: `${Math.max(10, Math.min(90, ((stats.kdB - 0.8) / 1.0) * 100))}%` }} className="h-full bg-pink-500 ml-auto"></div>
                </div>
              </div>

              {/* Stat Row: Team Ranking */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5 px-0.5">
                  <span className="text-blue-400">#{stats.rankA}</span>
                  <span className="text-slate-400 uppercase text-[10px]">Event Seed Rank</span>
                  <span className="text-pink-400">#{stats.rankB}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full flex overflow-hidden">
                  {/* Rankings: lower number is better */}
                  <div style={{ width: `${((17 - stats.rankA) / 16) * 100}%` }} className="h-full bg-blue-500"></div>
                  <div style={{ width: `${((17 - stats.rankB) / 16) * 100}%` }} className="h-full bg-pink-500 ml-auto"></div>
                </div>
              </div>

              {/* Stat Row: Head-to-Head */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5 px-0.5">
                  <span className="text-blue-400">{stats.h2hA} Wins</span>
                  <span className="text-slate-400 uppercase text-[10px]">Head to Head</span>
                  <span className="text-pink-400">{stats.h2hB} Wins</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full flex overflow-hidden">
                  {stats.h2hA + stats.h2hB > 0 ? (
                    <>
                      <div style={{ width: `${(stats.h2hA / (stats.h2hA + stats.h2hB)) * 100}%` }} className="h-full bg-blue-500"></div>
                      <div style={{ width: `${(stats.h2hB / (stats.h2hA + stats.h2hB)) * 100}%` }} className="h-full bg-pink-500 ml-auto"></div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-slate-700"></div>
                  )}
                </div>
              </div>

              {/* Stat Row: Win Streak */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1 px-0.5">
                  <div className="flex gap-0.5">
                    {stats.streakA.map((char, i) => (
                      <span key={i} className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-black text-white ${char === "W" ? "bg-green-600" : "bg-red-600"}`}>
                        {char}
                      </span>
                    ))}
                    {stats.streakA.length === 0 && <span className="text-slate-500 italic text-[10px]">No matches</span>}
                  </div>
                  <span className="text-slate-400 uppercase text-[10px]">Recent Streak</span>
                  <div className="flex gap-0.5">
                    {stats.streakB.map((char, i) => (
                      <span key={i} className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-black text-white ${char === "W" ? "bg-green-600" : "bg-red-600"}`}>
                        {char}
                      </span>
                    ))}
                    {stats.streakB.length === 0 && <span className="text-slate-500 italic text-[10px]">No matches</span>}
                  </div>
                </div>
              </div>

              {/* Stat Row: Bonus Weight */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5 px-0.5">
                  <span className="text-blue-400">+{stats.bonusA}%</span>
                  <span className="text-slate-400 uppercase text-[10px]">AI Synergy Bonus</span>
                  <span className="text-pink-400">+{stats.bonusB}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full flex overflow-hidden">
                  <div style={{ width: `${(stats.bonusA / 25) * 100}%` }} className="h-full bg-blue-500"></div>
                  <div style={{ width: `${(stats.bonusB / 25) * 100}%` }} className="h-full bg-pink-500 ml-auto"></div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
