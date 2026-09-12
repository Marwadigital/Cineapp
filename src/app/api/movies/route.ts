import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { movies, genres, movieGenres, showtimes, auditoriums, cinemas } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title")?.trim();
    const genre = searchParams.get("genre")?.trim();
    const language = searchParams.get("language")?.trim();
    const cinemaId = searchParams.get("cinemaId")?.trim();
    const date = searchParams.get("date")?.trim(); // YYYY-MM-DD

    const db = await getDb();

    // Query movies with joined genres and showtime information
    let whereClauses = ["1 = 1"];
    if (title) {
      whereClauses.push(`LOWER(m.title) LIKE '%${title.toLowerCase().replace(/'/g, "''")}%'`);
    }
    if (language) {
      whereClauses.push(`LOWER(m.language) = '${language.toLowerCase().replace(/'/g, "''")}'`);
    }
    if (genre) {
      whereClauses.push(`
        EXISTS (
          SELECT 1 FROM movie_genres mg
          JOIN genres g ON mg.genre_id = g.id
          WHERE mg.movie_id = m.id AND (g.slug = '${genre.replace(/'/g, "''")}' OR LOWER(g.name) = '${genre.toLowerCase().replace(/'/g, "''")}')
        )
      `);
    }
    if (cinemaId) {
      whereClauses.push(`
        EXISTS (
          SELECT 1 FROM showtimes st
          JOIN auditoriums a ON st.auditorium_id = a.id
          WHERE st.movie_id = m.id AND a.cinema_id = '${cinemaId.replace(/'/g, "''")}'
        )
      `);
    }
    if (date) {
      whereClauses.push(`
        EXISTS (
          SELECT 1 FROM showtimes st
          WHERE st.movie_id = m.id AND DATE(st.start_time) = '${date.replace(/'/g, "''")}'
        )
      `);
    }

    const query = `
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
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY m.is_featured DESC, m.release_date DESC
    `;

    const result = await db.execute(sql.raw(query));
    const movieList = (result.rows || result) as any[];

    return NextResponse.json({
      success: true,
      movies: movieList,
    });
  } catch (error: any) {
    console.error("Error fetching movies:", error);
    return NextResponse.json(
      { error: "Failed to fetch movies", details: error.message },
      { status: 500 }
    );
  }
}
