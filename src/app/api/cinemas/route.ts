import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const query = await db.execute(
      sql.raw(`
        SELECT 
          c.*,
          (
            SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'screen_type', a.screen_type, 'total_seats', a.total_seats))
            FROM auditoriums a
            WHERE a.cinema_id = c.id
          ) as auditoriums
        FROM cinemas c
        ORDER BY c.name ASC
      `)
    );

    const cinemaList = (query.rows || query) as any[];

    return NextResponse.json({
      success: true,
      cinemas: cinemaList,
    });
  } catch (error: any) {
    console.error("Fetch cinemas error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cinemas", details: error.message },
      { status: 500 }
    );
  }
}
