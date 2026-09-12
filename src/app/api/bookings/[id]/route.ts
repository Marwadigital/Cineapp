import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const db = await getDb();

    const query = await db.execute(
      sql.raw(`
        SELECT 
          b.id,
          b.booking_reference,
          b.status,
          b.subtotal_cents,
          b.booking_fee_cents,
          b.tax_cents,
          b.total_cents,
          b.expires_at,
          b.created_at,
          b.user_id,
          st.id as showtime_id,
          st.start_time,
          st.end_time,
          st.format,
          m.id as movie_id,
          m.title as movie_title,
          m.poster_url,
          m.backdrop_url,
          m.rating as movie_rating,
          m.duration_mins,
          a.name as auditorium_name,
          a.screen_type,
          c.name as cinema_name,
          c.address as cinema_address,
          c.city as cinema_city,
          p.status as payment_status,
          p.idempotency_key,
          p.provider as payment_provider
        FROM bookings b
        JOIN showtimes st ON b.showtime_id = st.id
        JOIN movies m ON st.movie_id = m.id
        JOIN auditoriums a ON st.auditorium_id = a.id
        JOIN cinemas c ON a.cinema_id = c.id
        LEFT JOIN payments p ON b.id = p.booking_id
        WHERE b.id = '${bookingId}'
        LIMIT 1
      `)
    );

    const rows = (query.rows || query) as any[];
    if (rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = rows[0];

    // Security check: cannot access another user's booking unless admin
    if (booking.user_id !== user.userId && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch associated tickets with seat information
    const ticketsQuery = await db.execute(
      sql.raw(`
        SELECT 
          t.id as ticket_id,
          t.ticket_code,
          t.qr_payload,
          t.is_used,
          s.row_label,
          s.seat_number,
          s.seat_type,
          bi.unit_price_cents
        FROM tickets t
        JOIN showtime_seats ss ON t.showtime_seat_id = ss.id
        JOIN seats s ON ss.seat_id = s.id
        JOIN booking_items bi ON bi.booking_id = t.booking_id AND bi.showtime_seat_id = ss.id
        WHERE t.booking_id = '${bookingId}'
      `)
    );

    const ticketsList = (ticketsQuery.rows || ticketsQuery) as any[];

    // If tickets are not generated yet (e.g. pending hold before payment), fetch booking items
    let seatsList = ticketsList;
    if (ticketsList.length === 0) {
      const itemsQuery = await db.execute(
        sql.raw(`
          SELECT 
            bi.id as item_id,
            bi.unit_price_cents,
            s.row_label,
            s.seat_number,
            s.seat_type
          FROM booking_items bi
          JOIN seats s ON bi.seat_id = s.id
          WHERE bi.booking_id = '${bookingId}'
        `)
      );
      seatsList = (itemsQuery.rows || itemsQuery) as any[];
    }

    return NextResponse.json({
      success: true,
      booking,
      seats: seatsList,
    });
  } catch (error: any) {
    console.error("Fetch booking error:", error);
    return NextResponse.json(
      { error: "Failed to load booking details", details: error.message },
      { status: 500 }
    );
  }
}
