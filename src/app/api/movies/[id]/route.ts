import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: movieId } = await params;
    const db = await getDb();

    // 1. Fetch movie details
    const movieQuery = await db.execute(
      sql.raw(`
        SELECT 
          m.*,
          COALESCE(
            (
              SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'slug', g.slug))
              FROM movie_genres mg
              JOIN genres g ON mg.genre_id = g.id
              WHERE mg.movie_id = m.id
            ),
            '[]'::json
          ) as genres
        FROM movies m
        WHERE m.id = '${movieId}' OR m.slug = '${movieId}'
        LIMIT 1
      `)
    );

    const movieRows = (movieQuery.rows || movieQuery) as any[];
    if (movieRows.length === 0) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const movie = movieRows[0];

    // 2. Fetch upcoming showtimes for this movie with cinema and auditorium
    const showtimesQuery = await db.execute(
      sql.raw(`
        SELECT 
          st.id,
          st.start_time,
          st.end_time,
          st.base_price_cents,
          st.format,
          a.id as auditorium_id,
          a.name as auditorium_name,
          a.screen_type,
          c.id as cinema_id,
          c.name as cinema_name,
          c.address as cinema_address,
          c.city as cinema_city
        FROM showtimes st
        JOIN auditoriums a ON st.auditorium_id = a.id
        JOIN cinemas c ON a.cinema_id = c.id
        WHERE st.movie_id = '${movie.id}'
          AND st.start_time >= NOW() - INTERVAL '2 hours'
        ORDER BY st.start_time ASC
      `)
    );

    const showtimesList = (showtimesQuery.rows || showtimesQuery) as any[];

    return NextResponse.json({
      success: true,
      movie,
      showtimes: showtimesList,
    });
  } catch (error: any) {
    console.error("Fetch movie detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch movie", details: error.message },
      { status: 500 }
    );
  }
}
