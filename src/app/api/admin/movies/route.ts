import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { movies, movieGenres, auditLogs } from "@/db/schema";
import { sql, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const db = await getDb();
    const list = await db.select().from(movies).orderBy(movies.releaseDate);
    return NextResponse.json({ success: true, movies: list });
  } catch (error: any) {
    const status = error.message === "UNAUTHORIZED" ? 401 : error.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const {
      title,
      slug,
      description,
      posterUrl,
      backdropUrl,
      trailerUrl,
      durationMins,
      releaseDate,
      language = "English",
      rating = "PG-13",
      isFeatured = false,
      genreIds = [],
    } = body;

    if (!title || !description || !posterUrl || !durationMins) {
      return NextResponse.json(
        { error: "Title, description, poster URL, and duration are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const movieSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const [newMovie] = await db
      .insert(movies)
      .values({
        title,
        slug: movieSlug,
        description,
        posterUrl,
        backdropUrl: backdropUrl || posterUrl,
        trailerUrl,
        durationMins: Number(durationMins),
        releaseDate: new Date(releaseDate || Date.now()),
        language,
        rating,
        isFeatured: Boolean(isFeatured),
      })
      .returning();

    if (genreIds.length > 0) {
      for (const gId of genreIds) {
        await db
          .insert(movieGenres)
          .values({ movieId: newMovie.id, genreId: gId })
          .onConflictDoNothing();
      }
    }

    await db.insert(auditLogs).values({
      userId: user.userId,
      action: "MOVIE_CREATED",
      entityType: "MOVIE",
      entityId: newMovie.id,
      details: { title, slug: movieSlug },
    });

    return NextResponse.json({ success: true, movie: newMovie });
  } catch (error: any) {
    const status = error.message === "UNAUTHORIZED" ? 401 : error.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
