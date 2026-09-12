import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const query = await db.execute(
      sql.raw(`
        SELECT 
          b.id,
          b.booking_reference,
          b.status,
          b.total_cents,
          b.created_at,
          st.start_time,
          st.format,
          m.title as movie_title,
          m.poster_url,
          m.duration_mins,
          m.rating as movie_rating,
          c.name as cinema_name,
          a.name as auditorium_name,
          (
            SELECT json_agg(json_build_object('row_label', s.row_label, 'seat_number', s.seat_number))
            FROM booking_items bi
            JOIN seats s ON bi.seat_id = s.id
            WHERE bi.booking_id = b.id
          ) as seats
        FROM bookings b
        JOIN showtimes st ON b.showtime_id = st.id
        JOIN movies m ON st.movie_id = m.id
        JOIN auditoriums a ON st.auditorium_id = a.id
        JOIN cinemas c ON a.cinema_id = c.id
        WHERE b.user_id = '${user.userId}'
        ORDER BY b.created_at DESC
      `)
    );

    const bookingList = (query.rows || query) as any[];

    return NextResponse.json({
      success: true,
      bookings: bookingList,
    });
  } catch (error: any) {
    console.error("Fetch user bookings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings", details: error.message },
      { status: 500 }
    );
  }
}
