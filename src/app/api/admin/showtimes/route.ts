import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { showtimes, showtimeSeats, seats, auditLogs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const db = await getDb();
    const query = await db.execute(
      sql.raw(`
        SELECT 
          st.*,
          m.title as movie_title,
          a.name as auditorium_name,
          c.name as cinema_name
        FROM showtimes st
        JOIN movies m ON st.movie_id = m.id
        JOIN auditoriums a ON st.auditorium_id = a.id
        JOIN cinemas c ON a.cinema_id = c.id
        ORDER BY st.start_time DESC
        LIMIT 50
      `)
    );
    const rows = (query.rows || query) as any[];
    return NextResponse.json({ success: true, showtimes: rows });
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
      movieId,
      auditoriumId,
      startTime,
      endTime,
      basePriceCents,
      format = "2D",
    } = body;

    if (!movieId || !auditoriumId || !startTime || !endTime || !basePriceCents) {
      return NextResponse.json(
        { error: "Movie, auditorium, start time, end time, and price are required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const [newShowtime] = await db
      .insert(showtimes)
      .values({
        movieId,
        auditoriumId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        basePriceCents: Number(basePriceCents),
        format,
      })
      .returning();

    // Populate showtime_seats for all seats in this auditorium
    const auditoriumSeats = await db
      .select()
      .from(seats)
      .where(eq(seats.auditoriumId, auditoriumId));

    for (const s of auditoriumSeats) {
      const price = Math.round((Number(basePriceCents) * s.priceMultiplier) / 100);
      await db.insert(showtimeSeats).values({
        showtimeId: newShowtime.id,
        seatId: s.id,
        status: "AVAILABLE",
        priceCents: price,
      });
    }

    await db.insert(auditLogs).values({
      userId: user.userId,
      action: "SHOWTIME_CREATED",
      entityType: "SHOWTIME",
      entityId: newShowtime.id,
      details: {
        movieId,
        auditoriumId,
        startTime,
        basePriceCents,
      },
    });

    return NextResponse.json({ success: true, showtime: newShowtime });
  } catch (error: any) {
    const status = error.message === "UNAUTHORIZED" ? 401 : error.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
