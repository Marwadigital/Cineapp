"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  MapPin,
  Ticket,
  ChevronLeft,
  ShieldCheck,
  AlertCircle,
  Armchair,
  Check,
  Lock,
} from "lucide-react";

export default function SeatSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const showtimeId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSeatMap = () => {
    fetch(`/api/showtimes/${showtimeId}/seats`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData);
        } else {
          setErrorMessage(resData.error || "Failed to load seat layout");
        }
      })
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (showtimeId) {
      fetchSeatMap();
      // Auto-refresh seat availability every 15 seconds
      const interval = setInterval(fetchSeatMap, 15000);
      return () => clearInterval(interval);
    }
  }, [showtimeId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4 animate-pulse">
        <div className="h-12 bg-slate-900 rounded-xl w-1/3 mx-auto" />
        <div className="h-96 bg-slate-900 rounded-3xl w-full" />
      </div>
    );
  }

  if (!data || !data.showtime) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Showtime Not Found</h2>
        <p className="text-xs text-slate-400">{errorMessage || "Invalid showtime ID."}</p>
        <Link href="/" className="inline-block px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-lg">
          Back to Movies
        </Link>
      </div>
    );
  }

  const { showtime, seats } = data;

  // Group seats by row
  const rowsMap: Record<string, any[]> = {};
  for (const s of seats) {
    if (!rowsMap[s.row_label]) {
      rowsMap[s.row_label] = [];
    }
    rowsMap[s.row_label].push(s);
  }
  const sortedRowLabels = Object.keys(rowsMap).sort();

  // Calculate pricing breakdown
  const selectedSeats = seats.filter((s: any) => selectedSeatIds.includes(s.seat_id));
  const subtotalCents = selectedSeats.reduce((acc: number, curr: any) => acc + curr.price_cents, 0);
  const bookingFeeCents = selectedSeats.length > 0 ? 150 : 0; // $1.50 flat fee
  const taxCents = Math.round(subtotalCents * 0.08); // 8% sales tax
  const totalCents = subtotalCents + bookingFeeCents + taxCents;

  const handleSeatClick = (seat: any) => {
    setErrorMessage(null);
    if (seat.current_status !== "AVAILABLE") return;

    if (selectedSeatIds.includes(seat.seat_id)) {
      setSelectedSeatIds(selectedSeatIds.filter((id) => id !== seat.seat_id));
    } else {
      if (selectedSeatIds.length >= 8) {
        setErrorMessage("Maximum of 8 seats can be reserved per transaction.");
        return;
      }
      setSelectedSeatIds([...selectedSeatIds, seat.seat_id]);
    }
  };

  const handleProceedToCheckout = async () => {
    if (selectedSeatIds.length === 0) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/bookings/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showtimeId,
          seatIds: selectedSeatIds,
        }),
      });

      const resData = await res.json();

      if (res.status === 401) {
        // Redirect to login if user is not authenticated
        router.push(`/login?redirect=/showtimes/${showtimeId}`);
        return;
      }

      if (!res.ok) {
        setErrorMessage(resData.error || "Failed to hold seats. Please select different seats.");
        fetchSeatMap(); // Refresh seat status
        setSubmitting(false);
        return;
      }

      // Successfully held: redirect to checkout screen
      router.push(`/checkout/${resData.booking.bookingId}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Network error occurred.");
      setSubmitting(false);
    }
  };

  const showtimeTime = new Date(showtime.start_time).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const showtimeDate = new Date(showtime.start_time).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Movie Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <Link
            href={`/movies/${showtime.movie_id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 mb-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Movie Details
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
              {showtime.screen_type}
            </span>
            <span className="text-xs text-slate-400">{showtime.auditorium_name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {showtime.movie_title}
          </h1>
          <p className="text-xs text-slate-300 flex items-center gap-2 mt-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            {showtime.cinema_name} &bull; {showtimeDate} at {showtimeTime}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Seat Map Left, Summary Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Seat Map Theater Visual */}
        <div className="lg:col-span-2 glass-panel p-6 sm:p-10 rounded-3xl space-y-10 overflow-hidden">
          {/* Cinema Curved Screen */}
          <div className="text-center">
            <div className="cinema-screen-curve" />
            <div className="cinema-screen-glow" />
            <span className="text-[11px] font-bold text-cyan-400/80 uppercase tracking-widest">
              CINEMA SCREEN PROJECTION
            </span>
          </div>

          {/* Seat Grid */}
          <div className="flex flex-col items-center gap-3 overflow-x-auto py-2 scrollbar-none">
            {sortedRowLabels.map((rowLabel) => (
              <div key={rowLabel} className="flex items-center gap-2">
                <span className="w-6 text-xs font-bold text-slate-400 text-center select-none">
                  {rowLabel}
                </span>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {rowsMap[rowLabel].map((seat: any) => {
                    const isSelected = selectedSeatIds.includes(seat.seat_id);
                    const isAvailable = seat.current_status === "AVAILABLE";
                    const isHeld = seat.current_status === "HELD";
                    const isBooked = seat.current_status === "BOOKED";
                    const isBlocked = seat.current_status === "BLOCKED";

                    let seatStyles = "bg-slate-700 hover:bg-amber-400/30 text-slate-300 cursor-pointer";
                    if (isSelected) {
                      seatStyles = "bg-emerald-500 text-slate-950 font-bold shadow-seat-glow scale-110";
                    } else if (isBooked) {
                      seatStyles = "bg-red-900/60 border border-red-500/30 text-red-400/60 cursor-not-allowed";
                    } else if (isHeld) {
                      seatStyles = "bg-amber-600/50 border border-amber-500/40 text-amber-300/80 cursor-not-allowed";
                    } else if (isBlocked) {
                      seatStyles = "bg-slate-900 border border-slate-800 text-slate-700 cursor-not-allowed";
                    } else if (seat.seat_type === "VIP" || seat.seat_type === "RECLINER") {
                      seatStyles = "bg-purple-900/40 border border-purple-500/40 text-purple-300 hover:border-purple-400 cursor-pointer";
                    }

                    return (
                      <button
                        key={seat.seat_id}
                        onClick={() => handleSeatClick(seat)}
                        disabled={!isAvailable && !isSelected}
                        title={`Row ${seat.row_label}, Seat ${seat.seat_number} - ${seat.seat_type} ($${(seat.price_cents / 100).toFixed(2)})`}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] font-semibold transition-all duration-150 ${seatStyles}`}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : isBooked ? (
                          <span className="text-[9px]">✕</span>
                        ) : isHeld ? (
                          <Lock className="w-2.5 h-2.5" />
                        ) : (
                          seat.seat_number
                        )}
                      </button>
                    );
                  })}
                </div>

                <span className="w-6 text-xs font-bold text-slate-400 text-center select-none">
                  {rowLabel}
                </span>
              </div>
            ))}
          </div>

          {/* Seat Legend */}
          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-slate-700" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-emerald-500 shadow-seat-glow" />
              <span className="text-white font-medium">Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-purple-900/60 border border-purple-500/40" />
              <span>VIP / Recliner</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-amber-600/50 border border-amber-500/40" />
              <span>Held</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-red-900/60 border border-red-500/30" />
              <span>Booked</span>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Ticket className="w-4 h-4 text-amber-400" /> Selected Seats
            </h3>
            <span className="text-xs font-bold text-amber-400">
              {selectedSeats.length} {selectedSeats.length === 1 ? "seat" : "seats"}
            </span>
          </div>

          {/* Selected Seat Badges */}
          {selectedSeats.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              <Armchair className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              Click seats on the map above to select your preferred viewing spots.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedSeats.map((s: any) => (
                <div
                  key={s.seat_id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                      {s.row_label}{s.seat_number}
                    </span>
                    <span className="text-slate-400 capitalize">{s.seat_type.toLowerCase()}</span>
                  </div>
                  <span className="font-bold text-slate-200">
                    ${(s.price_cents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Price Breakdown */}
          <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span>${(subtotalCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Booking Service Fee</span>
              <span>${(bookingFeeCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Estimated Sales Tax (8%)</span>
              <span>${(taxCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-white font-extrabold text-base pt-2 border-t border-white/10">
              <span>Total Due</span>
              <span className="text-amber-400">${(totalCents / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout CTA */}
          <button
            onClick={handleProceedToCheckout}
            disabled={selectedSeats.length === 0 || submitting}
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              selectedSeats.length > 0 && !submitting
                ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-glow"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <span className="inline-block animate-spin border-2 border-slate-950 border-t-transparent rounded-full w-4 h-4" />
            ) : (
              <span>Lock Seats & Proceed to Checkout</span>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 inline text-emerald-400 mr-1" />
            Proceeding locks your selected seats for 10 minutes to complete checkout safely.
          </p>
        </div>
      </div>
    </div>
  );
}
