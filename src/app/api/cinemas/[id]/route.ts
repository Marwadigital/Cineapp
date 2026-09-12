import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cinemaId } = await params;
    const db = await getDb();

    const cinemaQuery = await db.execute(
      sql.raw(`
        SELECT 
          c.*,
          (
            SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'screen_type', a.screen_type, 'total_seats', a.total_seats))
            FROM auditoriums a
            WHERE a.cinema_id = c.id
          ) as auditoriums
        FROM cinemas c
        WHERE c.id = '${cinemaId}' OR c.slug = '${cinemaId}'
        LIMIT 1
      `)
    );

    const rows = (cinemaQuery.rows || cinemaQuery) as any[];
    if (rows.length === 0) {
      return NextResponse.json({ error: "Cinema not found" }, { status: 404 });
    }

    const cinema = rows[0];

    // Fetch upcoming showtimes at this cinema
    const showtimesQuery = await db.execute(
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
          m.duration_mins,
          m.rating,
          a.name as auditorium_name,
          a.screen_type
        FROM showtimes st
        JOIN movies m ON st.movie_id = m.id
        JOIN auditoriums a ON st.auditorium_id = a.id
        WHERE a.cinema_id = '${cinema.id}'
          AND st.start_time >= NOW()
        ORDER BY st.start_time ASC
      `)
    );

    const showtimesList = (showtimesQuery.rows || showtimesQuery) as any[];

    return NextResponse.json({
      success: true,
      cinema,
      showtimes: showtimesList,
    });
  } catch (error: any) {
    console.error("Fetch cinema detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cinema details", details: error.message },
      { status: 500 }
    );
  }
}
