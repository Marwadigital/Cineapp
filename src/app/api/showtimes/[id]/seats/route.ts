import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: showtimeId } = await params;
    const db = await getDb();

    // 1. Fetch showtime with movie, cinema, and auditorium details
    const showtimeQuery = await db.execute(
      sql.raw(`
        SELECT 
          st.id,
          st.start_time,
          st.end_time,
          st.base_price_cents,
          st.format,
          m.id as movie_id,
          m.title as movie_title,
          m.poster_url,
          m.backdrop_url,
          m.rating as movie_rating,
          m.duration_mins,
          a.id as auditorium_id,
          a.name as auditorium_name,
          a.screen_type,
          c.id as cinema_id,
          c.name as cinema_name,
          c.address as cinema_address,
          c.city as cinema_city
        FROM showtimes st
        JOIN movies m ON st.movie_id = m.id
        JOIN auditoriums a ON st.auditorium_id = a.id
        JOIN cinemas c ON a.cinema_id = c.id
        WHERE st.id = '${showtimeId}'
        LIMIT 1
      `)
    );

    const showtimeRows = (showtimeQuery.rows || showtimeQuery) as any[];
    if (showtimeRows.length === 0) {
      return NextResponse.json({ error: "Showtime not found" }, { status: 404 });
    }

    const showtime = showtimeRows[0];

    // 2. Fetch seats and current status
    const seatsQuery = await db.execute(
      sql.raw(`
        SELECT 
          ss.id as showtime_seat_id,
          ss.seat_id,
          s.row_label,
          s.seat_number,
          s.seat_type,
          s.price_multiplier,
          ss.status as raw_status,
          ss.held_until,
          ss.price_cents,
          CASE
            WHEN ss.status = 'HELD' AND ss.held_until IS NOT NULL AND ss.held_until < NOW() THEN 'AVAILABLE'
            ELSE ss.status
          END as current_status
        FROM showtime_seats ss
        JOIN seats s ON ss.seat_id = s.id
        WHERE ss.showtime_id = '${showtimeId}'
        ORDER BY s.row_label ASC, s.seat_number ASC
      `)
    );

    const seatRows = (seatsQuery.rows || seatsQuery) as any[];

    return NextResponse.json({
      success: true,
      showtime,
      seats: seatRows,
    });
  } catch (error: any) {
    console.error("Error fetching showtime seats:", error);
    return NextResponse.json(
      { error: "Failed to load seat layout", details: error.message },
      { status: 500 }
    );
  }
}
