"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import {
  CheckCircle2,
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Printer,
  XCircle,
  AlertCircle,
  ChevronLeft,
  Share2,
} from "lucide-react";

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchTicket = () => {
    fetch(`/api/bookings/${bookingId}`)
      .then((res) => res.json())
      .then(async (data) => {
        if (data.booking) {
          setBooking(data.booking);
          setSeats(data.seats || []);

          // Generate QR code for the booking reference / primary ticket
          const qrPayload = JSON.stringify({
            bookingRef: data.booking.booking_reference,
            movie: data.booking.movie_title,
            showtime: data.booking.start_time,
            seats: data.seats.map((s: any) => `${s.row_label}${s.seat_number}`),
            verified: true,
          });

          try {
            const url = await QRCode.toDataURL(qrPayload, {
              width: 240,
              margin: 2,
              color: {
                dark: "#0b0f19",
                light: "#ffffff",
              },
            });
            setQrDataUrl(url);
          } catch (e) {
            console.error("QR Code generation error:", e);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (bookingId) fetchTicket();
  }, [bookingId]);

  const handlePrint = () => {
    window.print();
  };

  const handleCancelBooking = async () => {
    setCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setCancelError(data.error || "Failed to cancel booking.");
        setCancelling(false);
        return;
      }

      setShowCancelConfirm(false);
      fetchTicket(); // Refresh status
    } catch (e: any) {
      setCancelError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4 animate-pulse">
        <div className="h-96 bg-slate-900 rounded-3xl w-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
        <Link href="/" className="inline-block px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-lg">
          Back to Movies
        </Link>
      </div>
    );
  }

  const isCancelled = booking.status === "CANCELLED";
  const showtimeDate = new Date(booking.start_time).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const showtimeTime = new Date(booking.start_time).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Eligible for cancellation if not already cancelled and showtime is in future
  const isEligibleForCancel =
    !isCancelled && new Date(booking.start_time).getTime() > Date.now();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between no-print">
        <Link
          href="/my-bookings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
        >
          <ChevronLeft className="w-4 h-4" /> My Bookings
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print Ticket
          </button>
        </div>
      </div>

      {/* Success Notification if confirmed */}
      {!isCancelled && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 no-print">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            Payment verified! Your seats are confirmed and your digital admission pass is ready.
          </span>
        </div>
      )}

      {isCancelled && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
          <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>
            This booking was cancelled. Reserved seats have been released and payment has been refunded.
          </span>
        </div>
      )}

      {/* Ticket Pass Stub Container */}
      <div className="relative rounded-3xl bg-slate-900 border border-white/10 overflow-hidden shadow-2xl">
        {/* Ticket Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-6 sm:p-8 text-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-6 h-6" />
              <span className="font-extrabold tracking-tight text-lg">CineBook Digital Pass</span>
            </div>
            <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-slate-950 text-amber-400">
              {booking.format}
            </span>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 leading-tight">
              {booking.movie_title}
            </h1>
            <p className="text-xs font-semibold text-slate-900 mt-1">
              {booking.cinema_name} &bull; {booking.auditorium_name}
            </p>
          </div>
        </div>

        {/* Perforation Cutout Left & Right */}
        <div className="relative flex items-center justify-center">
          <div className="ticket-edge-left" />
          <div className="w-full border-b-2 border-dashed border-white/20 mx-4" />
          <div className="ticket-edge-right" />
        </div>

        {/* Ticket Body: QR & Details */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* QR Code Section (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center space-y-3 p-4 rounded-2xl bg-white text-slate-950 shadow-md">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Ticket QR Code" className="w-48 h-48 rounded-lg" />
            ) : (
              <div className="w-48 h-48 bg-slate-200 animate-pulse rounded-lg" />
            )}
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider block">
                {booking.booking_reference}
              </span>
              <span className="text-[10px] text-slate-500">Scan at entrance scanner</span>
            </div>
          </div>

          {/* Details Section (7 cols) */}
          <div className="md:col-span-7 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Date
                </span>
                <span className="text-sm font-bold text-white">{showtimeDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Time
                </span>
                <span className="text-sm font-bold text-white">{showtimeTime}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                Confirmed Seats
              </span>
              <div className="flex flex-wrap gap-1.5">
                {seats.map((s: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs"
                  >
                    {s.row_label}{s.seat_number}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Status
                </span>
                <span
                  className={`font-bold uppercase ${
                    isCancelled ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {booking.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Total Paid
                </span>
                <span className="text-sm font-black text-white">
                  ${(booking.total_cents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation Section (if eligible) */}
        {isEligibleForCancel && (
          <div className="p-6 bg-slate-950/80 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300 block">Need to cancel your visit?</span>
              Free cancellations available up until showtime start.
            </div>
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors"
            >
              Cancel Booking & Refund
            </button>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 rounded-3xl space-y-4 border border-red-500/30">
            <h3 className="text-lg font-bold text-white">Cancel this Booking?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to cancel booking <strong>{booking.booking_reference}</strong>?
              Your reserved seats will immediately be released back to the public pool and a refund
              of <strong>${(booking.total_cents / 100).toFixed(2)}</strong> will be credited.
            </p>

            {cancelError && (
              <p className="text-xs text-red-400">{cancelError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white flex items-center gap-1.5"
              >
                {cancelling ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
