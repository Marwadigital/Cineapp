"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  CreditCard,
  Lock,
  Clock,
  AlertTriangle,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment Form States
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Countdown timer in seconds
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    fetch(`/api/bookings/${bookingId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.booking) {
          setBooking(data.booking);
          setSeats(data.seats || []);

          if (data.booking.status === "CONFIRMED") {
            router.push(`/tickets/${bookingId}`);
            return;
          }

          // Calculate remaining seconds on hold
          const expiresAt = new Date(data.booking.expires_at).getTime();
          const now = Date.now();
          const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
          setTimeLeftSeconds(diff);
        } else {
          setErrorMessage(data.error || "Failed to load booking.");
        }
      })
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // Countdown decrement
  useEffect(() => {
    if (timeLeftSeconds === null || timeLeftSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeftSeconds]);

  const fillDemoCard = () => {
    setCardNumber("4242 4242 4242 4242");
    setExpiry("12/28");
    setCvc("888");
    setCardHolder("CineBook Test Customer");
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeLeftSeconds === 0) {
      setErrorMessage("Your seat hold has expired. Please select seats again.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // Generate client-side idempotency key for this payment
      const idempotencyKey = `idemp_${bookingId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const res = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          provider: "STRIPE_TEST",
          paymentMethod: "pm_card_visa",
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        setErrorMessage(resData.error || "Payment transaction failed.");
        setSubmitting(false);
        return;
      }

      // Success: navigate to tickets confirmation screen
      router.push(`/tickets/${bookingId}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during payment.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4 animate-pulse">
        <div className="h-8 bg-slate-900 rounded w-1/3 mx-auto" />
        <div className="h-80 bg-slate-900 rounded-3xl w-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Booking Not Found</h2>
        <p className="text-xs text-slate-400">{errorMessage || "Invalid booking ID."}</p>
        <Link href="/" className="inline-block px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-lg">
          Back to Movies
        </Link>
      </div>
    );
  }

  const minutesLeft = timeLeftSeconds !== null ? Math.floor(timeLeftSeconds / 60) : 0;
  const secondsLeft = timeLeftSeconds !== null ? timeLeftSeconds % 60 : 0;
  const formattedTimeLeft = `${minutesLeft.toString().padStart(2, "0")}:${secondsLeft.toString().padStart(2, "0")}`;
  const isExpired = timeLeftSeconds === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner & Expiry Timer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <Link
            href={`/showtimes/${booking.showtime_id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 mb-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Seat Map
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Checkout & Ticket Confirmation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Booking Ref: <strong className="text-amber-400 font-mono">{booking.booking_reference}</strong>
          </p>
        </div>

        {/* Hold Countdown */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${
            isExpired
              ? "bg-red-950/60 border-red-500/40 text-red-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          }`}
        >
          <Clock className="w-4 h-4" />
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider block">
              {isExpired ? "Hold Expired" : "Seat Hold Expiration"}
            </span>
            <span className="text-lg font-black font-mono">{formattedTimeLeft}</span>
          </div>
        </div>
      </div>

      {isExpired && (
        <div className="p-5 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>Your 10-minute seat hold has expired. The reserved seats have been released.</span>
          </div>
          <Link
            href={`/showtimes/${booking.showtime_id}`}
            className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-xs shrink-0"
          >
            Re-select Seats
          </Link>
        </div>
      )}

      {errorMessage && !isExpired && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Payment Details (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-white text-base">Payment Method</h2>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
              TEST MODE ENABLED
            </span>
          </div>

          {/* Quick Demo Pre-fill */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-bold text-slate-200 block">Stripe Test Gateway</span>
              <span className="text-slate-400 text-[11px]">Click to auto-populate test credit card</span>
            </div>
            <button
              type="button"
              onClick={fillDemoCard}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-amber-400 border border-amber-400/30 shrink-0 transition-colors"
            >
              Fill Demo Card
            </button>
          </div>

          {/* Card Form */}
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Name on Card
              </label>
              <input
                type="text"
                required
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-slate-900 text-white placeholder-slate-500 text-xs py-2.5 px-3.5 rounded-xl border border-white/10 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Card Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full bg-slate-900 text-white placeholder-slate-500 text-xs py-2.5 px-3.5 rounded-xl border border-white/10 focus:border-amber-400 focus:outline-none pr-10 font-mono"
                />
                <CreditCard className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Expiration Date
                </label>
                <input
                  type="text"
                  required
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full bg-slate-900 text-white placeholder-slate-500 text-xs py-2.5 px-3.5 rounded-xl border border-white/10 focus:border-amber-400 focus:outline-none text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  CVC / CVV
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    maxLength={4}
                    className="w-full bg-slate-900 text-white placeholder-slate-500 text-xs py-2.5 px-3.5 rounded-xl border border-white/10 focus:border-amber-400 focus:outline-none text-center font-mono"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting || isExpired}
                className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  !submitting && !isExpired
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-glow"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {submitting ? (
                  <span className="inline-block animate-spin border-2 border-slate-950 border-t-transparent rounded-full w-4 h-4" />
                ) : (
                  <span>
                    Confirm & Pay ${(booking.total_cents / 100).toFixed(2)}
                  </span>
                )}
              </button>
            </div>
          </form>

          <p className="text-[11px] text-slate-400 text-center">
            <Lock className="w-3 h-3 inline mr-1 text-emerald-400" />
            256-Bit SSL Encrypted. Test mode: no real money will be charged.
          </p>
        </div>

        {/* Right Details: Order Summary (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-6 sm:p-7 rounded-3xl space-y-6">
          <h3 className="font-bold text-white text-base pb-3 border-b border-white/10">
            Booking Summary
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex gap-3">
              <img
                src={booking.poster_url}
                alt={booking.movie_title}
                className="w-16 h-24 object-cover rounded-lg bg-slate-900 border border-white/10 shrink-0"
              />
              <div className="space-y-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                  {booking.format}
                </span>
                <h4 className="font-bold text-white text-sm">{booking.movie_title}</h4>
                <p className="text-slate-400">{booking.cinema_name}</p>
                <p className="text-slate-400">{booking.auditorium_name}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Reserved Seats</span>
                <span className="font-bold text-white">
                  {seats.map((s: any) => `${s.row_label}${s.seat_number}`).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Showtime</span>
                <span className="text-slate-200">
                  {new Date(booking.start_time).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(booking.start_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Ticket Subtotal</span>
                <span>${(booking.subtotal_cents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Booking Service Fee</span>
                <span>${(booking.booking_fee_cents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Sales Tax (8%)</span>
                <span>${(booking.tax_cents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-extrabold text-base pt-2 border-t border-white/10">
                <span>Total Amount</span>
                <span className="text-amber-400">
                  ${(booking.total_cents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
