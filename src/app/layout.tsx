import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "CineBook - Premium Cinema Ticket Booking",
  description:
    "Experience movies on the big screen. Reserve IMAX, Dolby Atmos, and VIP seats with live interactive seat maps, instant digital QR tickets, and secure checkout.",
  keywords: ["cinema", "movie tickets", "IMAX", "Dolby Cinema", "seat reservation", "CineBook"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
