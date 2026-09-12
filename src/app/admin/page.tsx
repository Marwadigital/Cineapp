"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  TrendingUp,
  Ticket,
  Film,
  Calendar,
  Layers,
  PlusCircle,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  History,
} from "lucide-react";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"METRICS" | "MOVIES" | "SHOWTIMES" | "AUDITS">("METRICS");
  const [metrics, setMetrics] = useState<any>(null);
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [showtimesList, setShowtimesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [cinemas, setCinemas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  // New Movie Form State
  const [newMovieTitle, setNewMovieTitle] = useState("");
  const [newMovieDesc, setNewMovieDesc] = useState("");
  const [newMoviePoster, setNewMoviePoster] = useState("");
  const [newMovieDuration, setNewMovieDuration] = useState("120");
  const [newMovieRating, setNewMovieRating] = useState("PG-13");
  const [creatingMovie, setCreatingMovie] = useState(false);

  // New Showtime Form State
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [selectedAuditoriumId, setSelectedAuditoriumId] = useState("");
  const [showtimeStart, setShowtimeStart] = useState("");
  const [showtimePriceDollars, setShowtimePriceDollars] = useState("15.00");
  const [showtimeFormat, setShowtimeFormat] = useState("2D");
  const [creatingShowtime, setCreatingShowtime] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setAuthError(false);

    try {
      // 1. Metrics
      const metRes = await fetch("/api/admin/metrics");
      if (metRes.status === 401 || metRes.status === 403) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      const metData = await metRes.json();
      if (metData.metrics) setMetrics(metData.metrics);

      // 2. Movies
      const movRes = await fetch("/api/admin/movies");
      const movData = await movRes.json();
      if (movData.movies) setMoviesList(movData.movies);

      // 3. Showtimes
      const stRes = await fetch("/api/admin/showtimes");
      const stData = await stRes.json();
      if (stData.showtimes) setShowtimesList(stData.showtimes);

      // 4. Audits
      const audRes = await fetch("/api/admin/audits");
      const audData = await audRes.json();
      if (audData.logs) setAuditLogs(audData.logs);

      // 5. Cinemas & Auditoriums
      const cinRes = await fetch("/api/cinemas");
      const cinData = await cinRes.json();
      if (cinData.cinemas) setCinemas(cinData.cinemas);
    } catch (e) {
      console.error("Admin fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingMovie(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch("/api/admin/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newMovieTitle,
          description: newMovieDesc,
          posterUrl: newMoviePoster,
          durationMins: Number(newMovieDuration),
          rating: newMovieRating,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFeedbackMsg("Movie added successfully!");
      setNewMovieTitle("");
      setNewMovieDesc("");
      setNewMoviePoster("");
      fetchAdminData();
    } catch (e: any) {
      setFeedbackMsg(`Error: ${e.message}`);
    } finally {
      setCreatingMovie(false);
    }
  };

  const handleCreateShowtime = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingShowtime(true);
    setFeedbackMsg(null);

    try {
      const start = new Date(showtimeStart);
      const end = new Date(start.getTime() + 150 * 60000); // 2.5 hours later
      const basePriceCents = Math.round(parseFloat(showtimePriceDollars) * 100);

      const res = await fetch("/api/admin/showtimes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: selectedMovieId,
          auditoriumId: selectedAuditoriumId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          basePriceCents,
          format: showtimeFormat,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFeedbackMsg("Showtime scheduled successfully!");
      fetchAdminData();
    } catch (e: any) {
      setFeedbackMsg(`Error: ${e.message}`);
    } finally {
      setCreatingShowtime(false);
    }
  };

  if (authError) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <ShieldAlert className="w-14 h-14 text-amber-400 mx-auto" />
        <h2 className="text-2xl font-black text-white">Administrator Access Required</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The admin console is restricted to users with administrator privileges. Please sign in with
          the administrator account.
        </p>
        <div className="pt-2">
          <Link
            href="/login?redirect=/admin"
            className="inline-block px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow-glow"
          >
            Sign In as Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-extrabold uppercase tracking-wider">
              Protected Admin Area
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-8 h-8 text-amber-400" /> CineBook Operations Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage movie inventory, auditorium showtimes, and inspect real-time transaction audit logs.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab("METRICS")}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors ${
              activeTab === "METRICS" ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("MOVIES")}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors ${
              activeTab === "MOVIES" ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => setActiveTab("SHOWTIMES")}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors ${
              activeTab === "SHOWTIMES" ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Showtimes
          </button>
          <button
            onClick={() => setActiveTab("AUDITS")}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors ${
              activeTab === "AUDITS" ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Audit Logs
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 1. OVERVIEW & METRICS */}
      {activeTab === "METRICS" && metrics && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Revenue
              </span>
              <div className="text-3xl font-black text-amber-400">
                ${metrics.totalRevenueDollars}
              </div>
              <p className="text-[11px] text-emerald-400 font-medium">Verified completed payments</p>
            </div>

            <div className="glass-card p-6 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Bookings
              </span>
              <div className="text-3xl font-black text-white">{metrics.activeBookings}</div>
              <p className="text-[11px] text-slate-400">Confirmed customer reservations</p>
            </div>

            <div className="glass-card p-6 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Seat Occupancy
              </span>
              <div className="text-3xl font-black text-cyan-400">{metrics.occupancyRate}%</div>
              <p className="text-[11px] text-slate-400">
                {metrics.bookedSeats} of {metrics.totalSeats} seats booked
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Movies
              </span>
              <div className="text-3xl font-black text-purple-400">{metrics.totalMovies}</div>
              <p className="text-[11px] text-slate-400">In theatrical rotation</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. MOVIE INVENTORY */}
      {activeTab === "MOVIES" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Add Movie Form (5 cols) */}
          <div className="lg:col-span-5 glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-amber-400" /> Add New Movie
            </h3>
            <form onSubmit={handleCreateMovie} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Movie Title</label>
                <input
                  type="text"
                  required
                  value={newMovieTitle}
                  onChange={(e) => setNewMovieTitle(e.target.value)}
                  placeholder="e.g. Gladiator II"
                  className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-white/10"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Synopsis</label>
                <textarea
                  required
                  rows={3}
                  value={newMovieDesc}
                  onChange={(e) => setNewMovieDesc(e.target.value)}
                  placeholder="Detailed storyline synopsis..."
                  className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-white/10"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Poster Image URL</label>
                <input
                  type="url"
                  required
                  value={newMoviePoster}
                  onChange={(e) => setNewMoviePoster(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Runtime (mins)</label>
                  <input
                    type="number"
                    required
                    value={newMovieDuration}
                    onChange={(e) => setNewMovieDuration(e.target.value)}
                    className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Rating</label>
                  <select
                    value={newMovieRating}
                    onChange={(e) => setNewMovieRating(e.target.value)}
                    className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-white/10"
                  >
                    <option value="G">G</option>
                    <option value="PG">PG</option>
                    <option value="PG-13">PG-13</option>
                    <option value="R">R</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingMovie}
                className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors"
              >
                {creatingMovie ? "Creating Movie..." : "Add to Catalog"}
              </button>
            </form>
          </div>

          {/* Current Movies List (7 cols) */}
          <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Current Movie Catalog</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {moviesList.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={m.posterUrl || m.poster_url}
                      alt={m.title}
                      className="w-10 h-14 object-cover rounded-lg bg-slate-800"
                    />
                    <div>
                      <h4 className="font-bold text-white text-sm">{m.title}</h4>
                      <p className="text-slate-400">
                        {m.rating} &bull; {m.durationMins || m.duration_mins} mins
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-slate-300">
                    ID: {m.id.substring(0, 8)}...
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. SHOWTIME SCHEDULER */}
      {activeTab === "SHOWTIMES" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Schedule Showtime Form (5 cols) */}
          <div className="lg:col-span-5 glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-amber-400" /> Schedule Showtime
            </h3>
            <form onSubmit={handleCreateShowtime} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Movie</label>
                <select
                  required
                  value={selectedMovieId}
                  onChange={(e) => setSelectedMovieId(e.target.value)}
                  className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-white/10"
                >
                  <option value="">Choose a movie...</option>
                  {moviesList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Select Auditorium</label>
                <select
                  required
                  value={selectedAuditoriumId}
                  onChange={(e) => setSelectedAuditoriumId(e.target.value)}
                  className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-white/10"
                >
                  <option value="">Choose a screen...</option>
                  {cinemas.map((c) =>
                    c.auditoriums?.map((aud: any) => (
                      <option key={aud.id} value={aud.id}>
                        {c.name} - {aud.name} ({aud.screen_type})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={showtimeStart}
                  onChange={(e) => setShowtimeStart(e.target.value)}
                  className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={showtimePriceDollars}
                    onChange={(e) => setShowtimePriceDollars(e.target.value)}
                    className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Format</label>
                  <select
                    value={showtimeFormat}
                    onChange={(e) => setShowtimeFormat(e.target.value)}
                    className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-white/10"
                  >
                    <option value="2D">2D Standard</option>
                    <option value="3D">3D RealD</option>
                    <option value="IMAX">IMAX Laser</option>
                    <option value="DOLBY_CINEMA">Dolby Atmos</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingShowtime}
                className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors"
              >
                {creatingShowtime ? "Creating Showtime..." : "Save Showtime & Initialize Seats"}
              </button>
            </form>
          </div>

          {/* Current Showtimes List (7 cols) */}
          <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Upcoming Showtimes</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {showtimesList.map((st) => (
                <div
                  key={st.id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/40">
                      {st.format}
                    </span>
                    <h4 className="font-bold text-white text-sm">{st.movie_title}</h4>
                    <p className="text-slate-400">
                      {st.cinema_name} &bull; {st.auditorium_name}
                    </p>
                    <p className="text-slate-300">
                      {new Date(st.start_time).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-white text-sm">
                      ${(st.base_price_cents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. AUDIT LOGS */}
      {activeTab === "AUDITS" && (
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" /> Security & Transaction Audit Logs
            </h3>
            <span className="text-xs text-slate-400">Last 100 System Events</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {auditLogs.map((log) => {
              const timeFormatted = new Date(log.created_at).toLocaleString();
              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-white/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-slate-400 font-semibold">{log.entity_type}</span>
                    </div>
                    <p className="text-slate-300 font-mono text-[11px]">
                      {JSON.stringify(log.details)}
                    </p>
                    {log.user_email && (
                      <span className="text-[10px] text-slate-400">
                        Triggered by: {log.user_email}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                    {timeFormatted}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
