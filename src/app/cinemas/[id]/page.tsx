"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Phone, Mail, Clock, Ticket, ChevronLeft, Tv } from "lucide-react";

export default function CinemaDetailPage() {
  const params = useParams();
  const cinemaId = params.id as string;

  const [cinema, setCinema] = useState<any>(null);
  const [showtimes, setShowtimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cinemaId) return;
    setLoading(true);
    fetch(`/api/cinemas/${cinemaId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.cinema) {
          setCinema(data.cinema);
          setShowtimes(data.showtimes || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cinemaId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4 animate-pulse">
        <div className="h-64 bg-slate-900 rounded-2xl w-full" />
      </div>
    );
  }

  if (!cinema) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Cinema Not Found</h2>
        <Link href="/cinemas" className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold">
          <ChevronLeft className="w-4 h-4" /> Back to Cinemas
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <Link
        href="/cinemas"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Cinemas
      </Link>

      {/* Cinema Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
            Cinema Location
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white">{cinema.name}</h1>
          <p className="text-sm text-slate-300 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            {cinema.address}, {cinema.city}, {cinema.state} {cinema.postal_code}
          </p>
          {cinema.phone && (
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-500" /> {cinema.phone}
            </p>
          )}
        </div>
      </div>

      {/* Showtimes Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Ticket className="w-6 h-6 text-amber-400" /> Scheduled Showtimes
        </h2>

        {showtimes.length === 0 ? (
          <div className="glass-panel text-center py-12 rounded-2xl">
            <p className="text-sm text-slate-300">No scheduled showtimes currently listed for this cinema.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {showtimes.map((st) => {
              const timeStr = new Date(st.start_time).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });
              const dateStr = new Date(st.start_time).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });

              return (
                <div key={st.id} className="glass-card p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-bold">{dateStr}</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40 text-[10px] font-extrabold">
                        {st.format}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base">{st.movie_title}</h3>
                    <p className="text-xs text-slate-400">
                      {st.auditorium_name} &bull; {st.duration_mins} mins
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Starts At</span>
                      <div className="text-lg font-black text-white">{timeStr}</div>
                    </div>
                    <Link
                      href={`/showtimes/${st.id}`}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-glow transition-all"
                    >
                      Book Seats (${(st.base_price_cents / 100).toFixed(2)})
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
