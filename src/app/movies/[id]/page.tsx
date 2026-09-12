"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Calendar,
  Film,
  Sparkles,
  MapPin,
  Play,
  Ticket,
  ChevronLeft,
  Tv,
} from "lucide-react";

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<any>(null);
  const [showtimes, setShowtimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    if (!movieId) return;
    setLoading(true);
    fetch(`/api/movies/${movieId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.movie) {
          setMovie(data.movie);
          setShowtimes(data.showtimes || []);

          // Set initial date filter to first available showtime date or today
          if (data.showtimes && data.showtimes.length > 0) {
            const firstDate = new Date(data.showtimes[0].start_time)
              .toISOString()
              .split("T")[0];
            setSelectedDate(firstDate);
          } else {
            setSelectedDate(new Date().toISOString().split("T")[0]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [movieId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4 animate-pulse">
        <div className="h-64 bg-slate-900 rounded-2xl w-full" />
        <div className="h-8 bg-slate-800 rounded w-1/3 mx-auto" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <Film className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">Movie Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested movie could not be located in our database.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Movies
        </Link>
      </div>
    );
  }

  // Get distinct showtime dates
  const availableDates = Array.from(
    new Set(
      showtimes.map((st) => new Date(st.start_time).toISOString().split("T")[0])
    )
  ).sort();

  // Filter showtimes by selected date
  const filteredShowtimes = showtimes.filter(
    (st) => new Date(st.start_time).toISOString().split("T")[0] === selectedDate
  );

  // Group filtered showtimes by cinema
  const showtimesByCinema: Record<string, { cinema: any; showtimes: any[] }> = {};
  for (const st of filteredShowtimes) {
    if (!showtimesByCinema[st.cinema_id]) {
      showtimesByCinema[st.cinema_id] = {
        cinema: {
          id: st.cinema_id,
          name: st.cinema_name,
          address: st.cinema_address,
          city: st.cinema_city,
        },
        showtimes: [],
      };
    }
    showtimesByCinema[st.cinema_id].showtimes.push(st);
  }

  return (
    <div className="pb-24 space-y-12">
      {/* Movie Hero Header */}
      <div className="relative w-full h-[400px] sm:h-[480px] overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${movie.backdrop_url || movie.poster_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-end pb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
            {/* Poster Card */}
            <div className="w-36 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-900 shrink-0 hidden sm:block">
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="space-y-3 max-w-3xl">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 mb-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> All Movies
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-xs font-bold border border-white/10">
                  {movie.rating}
                </span>
                <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> {movie.duration_mins} mins
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  Language: <strong className="text-white">{movie.language}</strong>
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {movie.title}
              </h1>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {movie.genres?.map((g: any) => (
                  <span
                    key={g.slug || g.name}
                    className="text-xs font-semibold text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800/40"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Synopsis & Info */}
        <div className="space-y-6 lg:col-span-1">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Synopsis</h2>
            <p className="text-sm text-slate-300 leading-relaxed">{movie.description}</p>

            {movie.trailer_url && (
              <div className="pt-2">
                <a
                  href={movie.trailer_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/20 flex items-center justify-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4 text-amber-400 fill-amber-400" /> Watch Official Trailer
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right: Showtimes by Date & Cinema */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" /> Select Date & Showtime
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose your cinema, screen format, and time slot to select seats
            </p>
          </div>

          {/* Date Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {availableDates.map((dateStr) => {
              const d = new Date(dateStr + "T12:00:00Z");
              const isSelected = selectedDate === dateStr;
              const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = d.toLocaleDateString("en-US", { day: "numeric" });
              const month = d.toLocaleDateString("en-US", { month: "short" });

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`px-4 py-2.5 rounded-xl border text-center min-w-[90px] transition-all ${
                    isSelected
                      ? "bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-glow"
                      : "glass-card text-slate-300 border-white/10 hover:border-amber-400/40"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-wider">{weekday}</div>
                  <div className="text-lg font-black">{dayNum}</div>
                  <div className="text-[10px]">{month}</div>
                </button>
              );
            })}
          </div>

          {/* Cinema & Showtime List */}
          {Object.keys(showtimesByCinema).length === 0 ? (
            <div className="glass-panel text-center py-12 rounded-2xl">
              <Film className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                No showtimes available for the selected date.
              </p>
              <p className="text-xs text-slate-500 mt-1">Please select another date above.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(showtimesByCinema).map(({ cinema, showtimes: cinemaShowtimes }) => (
                <div key={cinema.id} className="glass-panel p-6 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-white/10">
                    <div>
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-400" /> {cinema.name}
                      </h3>
                      <p className="text-xs text-slate-400 ml-6">
                        {cinema.address}, {cinema.city}
                      </p>
                    </div>
                  </div>

                  {/* Showtimes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                    {cinemaShowtimes.map((st) => {
                      const startTime = new Date(st.start_time).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      const priceDollars = (st.base_price_cents / 100).toFixed(2);

                      return (
                        <Link
                          key={st.id}
                          href={`/showtimes/${st.id}`}
                          className="group p-3 rounded-xl bg-slate-900/80 hover:bg-amber-400/10 border border-white/10 hover:border-amber-400/50 transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                              {st.format}
                            </span>
                            <span className="text-[11px] font-bold text-slate-300">
                              ${priceDollars}
                            </span>
                          </div>
                          <div className="text-lg font-black text-white group-hover:text-amber-400 transition-colors">
                            {startTime}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-1">
                            {st.auditorium_name}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
