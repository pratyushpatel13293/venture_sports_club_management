import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "../utils/axiosInstance";

export default function EditEventPage() {
  const { clubid, eventId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    maxPlayer: 1,
    registrationOpen: true,
    status: "registration",
    imgURL:"",
    Sport:"",
    teamsBy:"",
    genderres:"None",
    maxmale:0,
    maxfemale:0
  });
  const [rules,setRules]=useState([{
    title:"",
    points:[],
  }]);

  const addRule = () => {
    setRules([...rules, { title: "", points: [] }]);
  };

  const removeRule = (ruleIndex) => {
    setRules(rules.filter((_, i) => i !== ruleIndex));
  };

  const updateRuleTitle = (ruleIndex, value) => {
    const updated = [...rules];
    updated[ruleIndex].title = value;
    setRules(updated);
  };

  const addPoint = (ruleIndex) => {
    const updated = [...rules];
    updated[ruleIndex].points.push("");
    setRules(updated);
  };

  const updatePoint = (ruleIndex, pointIndex, value) => {
    const updated = [...rules];
    updated[ruleIndex].points[pointIndex] = value;
    setRules(updated);
  };

  const removePoint = (ruleIndex, pointIndex) => {
    const updated = [...rules];
    updated[ruleIndex].points = updated[ruleIndex].points.filter(
      (_, i) => i !== pointIndex
    );
    setRules(updated);
  };

  const getAuthConfig = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;

    try {
      const payload = jwtDecode(token);
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("accessToken");
        return null;
      }
    } catch {
      localStorage.removeItem("accessToken");
      return null;
    }

    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchEvent = async () => {
    try {
      const config = getAuthConfig();
      if (!config) return;

      const res = await axiosInstance.get(
        `/events/${eventId}`,
        config
      );

      const e = res.data.event;

      setForm({
        name: e.name || "",
        description: e.description || "",
        maxPlayer: e.maxPlayer || 1,
        registrationOpen: e.registrationOpen ?? true,
        status: e.status || "registration",
        imgURL:e.imgURL || "",
        Sport:e.Sport || "",
        teamsBy:e.teamsBy || "users",
        genderres: e.genderres || "None",
        maxmale: e.maxmale || 0,
        maxfemale: e.maxfemale || 0,
      });
      setRules(
        Array.isArray(e.rules) && e.rules.length > 0
          ? e.rules
          : []
      );
    } catch {
      setMessage("Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.maxPlayer < 1) {
      return setMessage("Max team size must be at least 1");
    }

    try {
      const config = getAuthConfig();
      if (!config) return;
      console.log("edit event");
      await axiosInstance.post(
        `/extra/${eventId}/edit-event`,{
          ...form, rules
        },
        config
      );

      navigate(`/events/${clubid}/${eventId}`);
    } catch (err) {
      console.log(err.response?.data?.message);
      setMessage(err.response?.data?.message || "Update failed");
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-slate-800/60 text-slate-200 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-500";
  const labelClass = "text-sm font-medium text-slate-300 mb-2 block";
  const cardClass = "bg-gradient-to-br from-slate-800/60 to-slate-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading event details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header Card */}
        <div className={cardClass}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Edit Event</h1>
              <p className="text-slate-400 text-sm">Update event details and configuration</p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Basic Information */}
          <div className={cardClass}>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Basic Information
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Event Name *</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g., Annual Cricket Tournament 2026"
                />
              </div>

              <div>
                <label className={labelClass}>Event Type *</label>
                <select
                  className={inputClass}
                  value={form.Sport}
                  onChange={(e) => setForm({ ...form, Sport: e.target.value })}
                >
                  <option value="">Select type of Sport</option>
                  <option value="Cricket">Cricket</option>
                  <option value="Football">Football</option>
                  <option value="Chess">Chess</option>
                  <option value="Badminton">Badminton</option>
                  <option value="Volleyball">Volleyball</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className={labelClass}>Event Description</label>
              <textarea
                className={inputClass}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Describe your event..."
              />
            </div>

            <div className="mt-6">
              <label className={labelClass}>Event Banner URL</label>
              <input
                className={inputClass}
                value={form.imgURL}
                onChange={(e) => setForm({ ...form, imgURL: e.target.value })}
                placeholder="https://example.com/banner.jpg"
              />
            </div>
          </div>

          {/* Team Settings */}
          <div className={cardClass}>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Team Configuration
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Max Team Size *</label>
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.maxPlayer}
                  onChange={(e) => setForm({ ...form, maxPlayer: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className={labelClass}>Team Creation Rights</label>
                <select
                  className={inputClass}
                  value={form.teamsBy}
                  onChange={(e) => setForm({ ...form, teamsBy: e.target.value })}
                >
                  <option value="">Select Team Creation Rights</option>
                  <option value="admin">Admin/Managers Only</option>
                  <option value="users">All Users</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className={labelClass}>Gender Restriction</label>
              <select
                className={inputClass}
                value={form.genderres}
                onChange={(e) => setForm({ ...form, genderres: e.target.value })}
              >
                <option value="None">None</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            {form.genderres === "Mixed" && (
              <div className="mt-6 grid grid-cols-2 gap-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div>
                  <label className={labelClass}>Max Male Players</label>
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={form.maxmale}
                    onChange={(e) => setForm({ ...form, maxmale: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max Female Players</label>
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={form.maxfemale}
                    onChange={(e) => setForm({ ...form, maxfemale: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rules & Guidelines */}
          <div className={cardClass}>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Rules & Guidelines
            </h2>

            <div className="space-y-4">
              {rules.map((rule, ruleIndex) => (
                <div
                  key={ruleIndex}
                  className="border border-slate-700/50 rounded-xl p-5 bg-slate-900/40 hover:border-slate-600/50 transition-all"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">
                        {ruleIndex + 1}
                      </span>
                      Rule {ruleIndex + 1}
                    </h3>

                    {rules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRule(ruleIndex)}
                        className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove Rule
                      </button>
                    )}
                  </div>

                  <input
                    className={inputClass + " mb-4"}
                    placeholder="Rule title (e.g., Team Composition)"
                    value={rule.title}
                    onChange={(e) => updateRuleTitle(ruleIndex, e.target.value)}
                  />

                  <div className="space-y-3">
                    {rule.points.map((point, pointIndex) => (
                      <div key={pointIndex} className="flex gap-2">
                        <input
                          className={inputClass + " flex-1"}
                          placeholder={`Point ${pointIndex + 1}`}
                          value={point}
                          onChange={(e) => updatePoint(ruleIndex, pointIndex, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removePoint(ruleIndex, pointIndex)}
                          className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addPoint(ruleIndex)}
                    className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Point
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addRule}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Another Rule
            </button>
          </div>

          {/* Event Status */}
          <div className={cardClass}>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Event Status
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-700/50">
                <input
                  type="checkbox"
                  id="regOpen"
                  checked={form.registrationOpen}
                  onChange={(e) => setForm({ ...form, registrationOpen: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="regOpen" className="text-slate-200 cursor-pointer flex-1">
                  Team registration open
                </label>
              </div>

              <div>
                <label className={labelClass}>Event Status</label>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="registration">Registration</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={cardClass}>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate(`/events/${clubid}/${eventId}`)}
                className="px-6 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 border border-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>

        {/* Message */}
        {message && (
          <div className={`${cardClass} ${message.includes('Failed') || message.includes('failed') ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
            <div className="flex items-center gap-3">
              <svg className={`w-5 h-5 ${message.includes('Failed') || message.includes('failed') ? 'text-red-400' : 'text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className={message.includes('Failed') || message.includes('failed') ? 'text-red-300' : 'text-emerald-300'}>{message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}