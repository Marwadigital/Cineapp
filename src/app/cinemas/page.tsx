"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Phone, Mail, Tv, ChevronRight, Sparkles } from "lucide-react";

export default function CinemasPage() {
  const [cinemas, setCinemas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cinemas")
      .then((res) => res.json())
      .then((data) => {
        if (data.cinemas) setCinemas(data.cinemas);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-2">
          <MapPin className="w-8 h-8 text-amber-400" /> Cinemas & Screening Rooms
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Explore our premier cinema locations equipped with IMAX Laser, Dolby Atmos, and VIP Luxe Suites.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cinemas.map((cinema) => (
            <div
              key={cinema.id}
              className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                  <img
                    src={cinema.image_url || "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80"}
                    alt={cinema.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                      {cinema.city}, {cinema.state}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                    {cinema.name}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    {cinema.address}, {cinema.city}, {cinema.state} {cinema.postal_code}
                  </p>

                  {/* Auditoriums badge list */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Screens & Formats:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cinema.auditoriums?.map((aud: any) => (
                        <span
                          key={aud.id}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-white/10"
                        >
                          {aud.screen_type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <Link
                  href={`/cinemas/${cinema.id}`}
                  className="w-full py-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400 text-amber-300 hover:text-slate-950 font-bold text-xs border border-amber-400/30 flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>View Today's Showtimes</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
