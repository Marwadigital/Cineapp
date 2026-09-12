"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Ticket, Calendar, Clock, MapPin, ChevronRight, AlertCircle, Film } from "lucide-react";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"ALL" | "UPCOMING" | "PAST" | "CANCELLED">("ALL");

  useEffect(() => {
    fetch("/api/user/bookings")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/login?redirect=/my-bookings";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.bookings) setBookings(data.bookings);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const filteredBookings = bookings.filter((b) => {
    const showtimeMs = new Date(b.start_time).getTime();
    if (filterTab === "UPCOMING") {
      return b.status === "CONFIRMED" && showtimeMs > now;
    }
    if (filterTab === "PAST") {
      return showtimeMs <= now && b.status !== "CANCELLED";
    }
    if (filterTab === "CANCELLED") {
      return b.status === "CANCELLED";
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
          <Ticket className="w-7 h-7 text-amber-400" /> My Booking History
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your movie reservations, view admission QR codes, and check ticket receipts.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {(["ALL", "UPCOMING", "PAST", "CANCELLED"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterTab === tab
                ? "bg-amber-400 text-slate-950 shadow-glow"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab === "ALL"
              ? "All Bookings"
              : tab === "UPCOMING"
              ? "Upcoming"
              : tab === "PAST"
              ? "Past Showings"
              : "Cancelled"}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl space-y-3">
          <Film className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No bookings found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You don't have any bookings matching this filter. Explore our current movie listings to
            reserve your seats!
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow-glow"
            >
              Browse Movies Now
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const showtimeDate = new Date(b.start_time).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            const showtimeTime = new Date(b.start_time).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div
                key={b.id}
                className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={b.poster_url}
                    alt={b.movie_title}
                    className="w-16 h-24 object-cover rounded-xl bg-slate-900 border border-white/10 shrink-0"
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {b.booking_reference}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          b.status === "CONFIRMED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                            : b.status === "CANCELLED"
                            ? "bg-red-950 text-red-400 border border-red-800/40"
                            : "bg-amber-950 text-amber-400"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base leading-tight">
                      {b.movie_title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {b.cinema_name} &bull; {b.auditorium_name} ({b.format})
                    </p>
                    <p className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      {showtimeDate} at {showtimeTime}
                    </p>
                    {b.seats && (
                      <p className="text-[11px] text-slate-400">
                        Seats:{" "}
                        <strong className="text-white">
                          {b.seats.map((s: any) => `${s.row_label}${s.seat_number}`).join(", ")}
                        </strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Paid</span>
                    <span className="text-base font-black text-white">
                      ${(b.total_cents / 100).toFixed(2)}
                    </span>
                  </div>

                  <Link
                    href={`/tickets/${b.id}`}
                    className="px-4 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400 text-amber-300 hover:text-slate-950 text-xs font-bold border border-amber-400/30 flex items-center gap-1 transition-all"
                  >
                    <span>View Ticket & QR</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
