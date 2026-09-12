import React from "react";
import Link from "next/link";
import { Film, ShieldCheck, Zap, Server, Database } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">CineBook</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Next-generation cinema ticketing with atomic seat reservations, real-time showtime
            maps, and instant QR digital tickets.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Vercel Serverless & Neon PostgreSQL Active
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:text-amber-400 transition-colors">
                Now Showing
              </Link>
            </li>
            <li>
              <Link href="/cinemas" className="hover:text-amber-400 transition-colors">
                Cinemas & IMAX
              </Link>
            </li>
            <li>
              <Link href="/my-bookings" className="hover:text-amber-400 transition-colors">
                My Tickets & Passes
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-amber-400 transition-colors">
                Admin Console
              </Link>
            </li>
          </ul>
        </div>

        {/* Features */}
        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Technologies</h4>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2 text-slate-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Next.js 15 App Router & SSR
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              Neon Serverless Postgres & Drizzle ORM
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ACID Transaction Locking (`FOR UPDATE`)
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <Server className="w-3.5 h-3.5 text-purple-400" />
              Payment Idempotency & QR Verification
            </li>
          </ul>
        </div>

        {/* Support & Disclaimer */}
        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Information</h4>
          <p className="text-xs leading-relaxed text-slate-400 mb-3">
            Tickets are secured with 10-minute hold transactions. Eligible bookings can be cancelled
            anytime prior to scheduled showtime start for an automatic instant refund.
          </p>
          <p className="text-[11px] text-slate-500">
            &copy; {new Date().getFullYear()} CineBook Inc. Ready for Vercel Deployment.
          </p>
        </div>
      </div>
    </footer>
  );
}
