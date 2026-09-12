import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const db = await getDb();

    // 1. Total Revenue (sum of succeeded payments in cents)
    const revQuery = await db.execute(
      sql.raw(`SELECT COALESCE(SUM(amount_cents), 0) as total_revenue_cents FROM payments WHERE status = 'SUCCEEDED'`)
    );
    const totalRevenueCents = Number((revQuery.rows || revQuery)[0]?.total_revenue_cents || 0);

    // 2. Active Bookings
    const bookingsQuery = await db.execute(
      sql.raw(`SELECT COUNT(*) as active_count FROM bookings WHERE status = 'CONFIRMED'`)
    );
    const activeBookings = Number((bookingsQuery.rows || bookingsQuery)[0]?.active_count || 0);

    // 3. Total Movies
    const moviesCountQuery = await db.execute(
      sql.raw(`SELECT COUNT(*) as movie_count FROM movies`)
    );
    const totalMovies = Number((moviesCountQuery.rows || moviesCountQuery)[0]?.movie_count || 0);

    // 4. Seat Occupancy Rate (Booked vs Total showtime seats)
    const seatStatsQuery = await db.execute(
      sql.raw(`
        SELECT 
          COUNT(*) as total_showtime_seats,
          COUNT(*) FILTER (WHERE status = 'BOOKED') as booked_seats
        FROM showtime_seats
      `)
    );
    const statsRow = (seatStatsQuery.rows || seatStatsQuery)[0];
    const totalSeats = Number(statsRow?.total_showtime_seats || 1);
    const bookedSeats = Number(statsRow?.booked_seats || 0);
    const occupancyRate = Math.round((bookedSeats / (totalSeats || 1)) * 100);

    return NextResponse.json({
      success: true,
      metrics: {
        totalRevenueCents,
        totalRevenueDollars: (totalRevenueCents / 100).toFixed(2),
        activeBookings,
        totalMovies,
        occupancyRate,
        bookedSeats,
        totalSeats,
      },
    });
  } catch (error: any) {
    const status = error.message === "UNAUTHORIZED" ? 401 : error.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
