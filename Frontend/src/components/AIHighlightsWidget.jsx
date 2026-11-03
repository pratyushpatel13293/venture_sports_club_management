import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";

export default function AIHighlightsWidget({ matchId }) {
  const [highlights, setHighlights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchHighlights = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/ai/match/${matchId}/highlights`);
      setHighlights(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch AI highlights:", err);
      setError("Unable to generate match highlights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHighlights();
  }, [matchId]);

  const handleCopyPost = () => {
    if (!highlights?.socialPost) return;
    navigator.clipboard.writeText(highlights.socialPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadHtmlReport = () => {
    if (!highlights) return;

    const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Venture Match Report - ${highlights.winner} vs ${highlights.loser}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      margin: 0;
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .header {
      border-bottom: 2px solid #6366f1;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      background: linear-gradient(to right, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .print-btn {
      background: #6366f1;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: background 0.2s;
    }
    .print-btn:hover {
      background: #4f46e5;
    }
    .summary-box {
      background: #1e293b;
      border-left: 4px solid #6366f1;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .grid {
      display: grid;
      grid-template-cols: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
    }
    .card h3 {
      margin-top: 0;
      border-bottom: 1px solid #334155;
      padding-bottom: 10px;
      color: #cbd5e1;
    }
    .mvp-badge {
      display: inline-block;
      background: #eab308;
      color: #0f172a;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: 900;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .mvp-name {
      font-size: 24px;
      font-weight: 800;
      color: #f8fafc;
      margin-bottom: 15px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dashed #334155;
    }
    .stat-row:last-child {
      border-bottom: none;
    }
    .roster-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .roster-list li {
      padding: 6px 0;
      border-bottom: 1px solid #334155;
    }
    .roster-list li:last-child {
      border-bottom: none;
    }
    @media print {
      body {
        background-color: white;
        color: black;
        padding: 0;
      }
      .container {
        box-shadow: none;
        border: none;
        max-width: 100%;
        padding: 0;
      }
      .print-btn {
        display: none;
      }
      .summary-box {
        background: #f1f5f9;
        border-color: #6366f1;
        color: black;
      }
      .card {
        background: #f8fafc;
        border-color: #cbd5e1;
      }
      .card h3 {
        color: black;
        border-color: #cbd5e1;
      }
      .mvp-name {
        color: black;
      }
      .stat-row {
        border-color: #cbd5e1;
      }
      .roster-list li {
        border-color: #cbd5e1;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Venture Esports Match Report</h1>
        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Event: Venture Tournament | Match ID: ${highlights.matchId}</p>
      </div>
      <button class="print-btn" onclick="window.print()">Print to PDF</button>
    </div>

    <div class="summary-box">
      <h2 style="margin-top: 0; font-size: 20px; color: #818cf8;">🏆 Match Summary</h2>
      <p style="font-size: 16px; margin-bottom: 0;">${highlights.summary}</p>
    </div>

    <div class="grid">
      <!-- MVP Performance -->
      <div class="card">
        <div class="mvp-badge">Most Valuable Player</div>
        <div class="mvp-name">${highlights.mvp.name}</div>
        <div class="stat-row">
          <span>Team</span>
          <span style="font-weight: bold; color: #818cf8;">${highlights.winner}</span>
        </div>
        <div class="stat-row">
          <span>Kills</span>
          <span style="font-weight: bold; color: #10b981;">${highlights.mvp.kills}</span>
        </div>
        <div class="stat-row">
          <span>Deaths</span>
          <span style="font-weight: bold; color: #ef4444;">${highlights.mvp.deaths}</span>
        </div>
        <div class="stat-row">
          <span>Assists</span>
          <span style="font-weight: bold; color: #3b82f6;">${highlights.mvp.assists}</span>
        </div>
        <div class="stat-row">
          <span>K/D Ratio</span>
          <span style="font-weight: bold; color: #f59e0b;">${highlights.mvp.kdRatio}</span>
        </div>
      </div>

      <!-- Analysis -->
      <div class="card">
        <h3>⚡ Key Turning Point</h3>
        <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 0;">${highlights.keyTurningPoint}</p>
      </div>
    </div>

    <div class="grid">
      <!-- Winner Roster -->
      <div class="card">
        <h3>🔵 Winner Roster (${highlights.winner})</h3>
        <ul class="roster-list">
          ${highlights.winnerRoster.map(player => `<li>${player}</li>`).join("")}
        </ul>
      </div>

      <!-- Loser Roster -->
      <div class="card">
        <h3>🔴 Runner-up Roster (${highlights.loser})</h3>
        <ul class="roster-list">
          ${highlights.loserRoster.map(player => `<li>${player}</li>`).join("")}
        </ul>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([reportHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Venture-MatchReport-${highlights.winner}-vs-${highlights.loser}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-indigo-500/5 animate-pulse"></div>
        <div className="relative z-10 py-6">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-medium tracking-wider uppercase text-xs animate-pulse">
            ⚡ Generating AI Post-Match Highlight Summaries...
          </p>
        </div>
      </div>
    );
  }

  if (error || !highlights) {
    return (
      <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 text-center text-slate-400">
        <p>{error || "No match highlights available."}</p>
      </div>
    );
  }

  const { winner, loser, mvp, summary, keyTurningPoint, socialPost } = highlights;

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-green-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all hover:border-green-500/40">
      {/* Decorative Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))] pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <h3 className="font-extrabold text-xl bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent uppercase tracking-wider">
              AI Match Highlights
            </h3>
            <p className="text-[10px] text-green-400 uppercase tracking-widest font-semibold mt-0.5">
              Generative Summary & MVP Statistics
            </p>
          </div>
        </div>

        <button
          onClick={downloadHtmlReport}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold text-xs text-white shadow-lg shadow-green-500/25 transition-all active:scale-95"
        >
          📄 Download PDF Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Side: Summary & MVP Performance (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Highlights Summary */}
          <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">AI Summary</h4>
            <p className="text-slate-200 text-sm leading-relaxed font-medium">
              {summary}
            </p>
          </div>

          {/* Key Turning Point */}
          <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-5 border-l-4 border-l-yellow-500">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">⚡ Key Turning Point</h4>
            <p className="text-slate-300 text-xs leading-relaxed font-medium">
              {keyTurningPoint}
            </p>
          </div>

          {/* Social Media Post Panel */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Social Share Template</span>
              <button
                onClick={handleCopyPost}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-750 text-indigo-400 px-3 py-1 rounded font-bold transition-all active:scale-95 flex items-center gap-1.5"
              >
                {copied ? "✅ Copied" : "📋 Copy Post"}
              </button>
            </div>
            <textarea
              readOnly
              value={socialPost}
              rows={3}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-slate-300 text-xs focus:outline-none resize-none font-medium"
            />
          </div>
        </div>

        {/* Right Side: MVP Card (5 Cols) */}
        <div className="lg:col-span-5">
          {/* MVP Card */}
          <div className="relative group rounded-xl overflow-hidden border border-yellow-500/30 shadow-xl shadow-yellow-950/5">
            {/* MVP Card Header Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-slate-950 pointer-events-none"></div>
            
            <div className="relative bg-slate-900/80 p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-500/15 border-2 border-yellow-500/40 flex items-center justify-center text-3xl mb-3 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                👑
              </div>

              <div className="bg-yellow-500/20 text-yellow-400 text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border border-yellow-500/20 mb-2">
                Series MVP
              </div>

              <h4 className="font-black text-2xl text-white mb-1 tracking-wide">{mvp.name}</h4>
              <p className="text-xs text-slate-400 font-semibold mb-6">Roster: {winner}</p>

              {/* Stats Grid */}
              <div className="w-full grid grid-cols-4 gap-2 border-t border-slate-800 pt-4 mb-4">
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Kills</span>
                  <span className="text-lg font-black text-emerald-400">{mvp.kills}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Deaths</span>
                  <span className="text-lg font-black text-rose-500">{mvp.deaths}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Assists</span>
                  <span className="text-lg font-black text-blue-400">{mvp.assists}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">K/D</span>
                  <span className="text-lg font-black text-yellow-500">{mvp.kdRatio}</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-semibold italic mt-2">
                *Computed from active server performance records
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
