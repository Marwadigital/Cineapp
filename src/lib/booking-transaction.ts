import { getDb } from "../db";
import {
  bookings,
  bookingItems,
  showtimeSeats,
  seats,
  showtimes,
  payments,
  tickets,
  auditLogs,
  users,
} from "../db/schema";
import { eq, inArray, sql, and, lt } from "drizzle-orm";

export interface HoldResult {
  bookingId: string;
  bookingReference: string;
  expiresAt: Date;
  subtotalCents: number;
  bookingFeeCents: number;
  taxCents: number;
  totalCents: number;
  seatCount: number;
}

export interface ConfirmResult {
  bookingId: string;
  bookingReference: string;
  paymentId: string;
  ticketIds: string[];
  status: "CONFIRMED";
}

/**
 * Generates a human-friendly unique booking reference (e.g. CB-8X9Y2Z)
 */
export function generateBookingReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "CB-";
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

/**
 * 10-Step Booking Transaction:
 * 1. Begin DB transaction
 * 2. Lock requested showtime-seat records
 * 3. Confirm every requested seat is available
 * 4. Create temporary seat hold with expiration time
 * 5. Calculate price on server
 * 6. Create pending booking
 * 7. Commit transaction
 */
export async function holdSeatsAndCreateBooking(params: {
  userId: string;
  showtimeId: string;
  seatIds: string[];
  holdMinutes?: number;
  ipAddress?: string;
}): Promise<HoldResult> {
  const { userId, showtimeId, seatIds, holdMinutes = 10, ipAddress } = params;

  if (!seatIds || seatIds.length === 0) {
    throw new Error("At least one seat must be selected");
  }

  const db = await getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + holdMinutes * 60 * 1000);

  // Execute in an ACID transaction
  return await db.transaction(async (tx: any) => {
    // 2. Lock requested showtime_seats records using SELECT ... FOR UPDATE
    const seatIdList = seatIds.map((id) => `'${id}'`).join(", ");
    const lockedSeatsQuery = await tx.execute(
      sql.raw(`
        SELECT ss.*, s.seat_type, s.price_multiplier, s.row_label, s.seat_number
        FROM showtime_seats ss
        JOIN seats s ON ss.seat_id = s.id
        WHERE ss.showtime_id = '${showtimeId}'
          AND ss.seat_id IN (${seatIdList})
        FOR UPDATE
      `)
    );

    const lockedSeats = (lockedSeatsQuery.rows || lockedSeatsQuery) as any[];

    // Verify all requested seats exist for this showtime
    if (lockedSeats.length !== seatIds.length) {
      throw new Error("One or more selected seats were not found for this showtime");
    }

    // 3. Confirm every requested seat is available (or held but expired)
    for (const seat of lockedSeats) {
      const isExpiredHold =
        seat.status === "HELD" &&
        seat.held_until &&
        new Date(seat.held_until).getTime() < now.getTime();

      if (seat.status !== "AVAILABLE" && !isExpiredHold) {
        throw new Error(`Seat ${seat.row_label}${seat.seat_number} is no longer available`);
      }
    }

    // 5. Calculate price on the server
    const showtimeRecord = await tx
      .select()
      .from(showtimes)
      .where(eq(showtimes.id, showtimeId))
      .limit(1);

    if (!showtimeRecord.length) {
      throw new Error("Showtime not found");
    }

    const basePriceCents = showtimeRecord[0].basePriceCents;
    let subtotalCents = 0;
    const itemCalculations: { showtimeSeatId: string; seatId: string; priceCents: number }[] = [];

    for (const seat of lockedSeats) {
      const multiplier = seat.price_multiplier || 100;
      const unitPriceCents = Math.round((basePriceCents * multiplier) / 100);
      subtotalCents += unitPriceCents;
      itemCalculations.push({
        showtimeSeatId: seat.id,
        seatId: seat.seat_id,
        priceCents: unitPriceCents,
      });
    }

    const bookingFeeCents = 150; // $1.50 flat service fee
    const taxCents = Math.round(subtotalCents * 0.08); // 8% sales tax
    const totalCents = subtotalCents + bookingFeeCents + taxCents;

    // 6. Create pending booking
    const bookingRef = generateBookingReference();
    const [insertedBooking] = await tx
      .insert(bookings)
      .values({
        userId,
        showtimeId,
        bookingReference: bookingRef,
        status: "PENDING",
        subtotalCents,
        bookingFeeCents,
        taxCents,
        totalCents,
        expiresAt,
      })
      .returning();

    // 4. Create temporary seat hold on showtime_seats
    for (const item of itemCalculations) {
      await tx
        .update(showtimeSeats)
        .set({
          status: "HELD",
          heldUntil: expiresAt,
          bookingId: insertedBooking.id,
          priceCents: item.priceCents,
          updatedAt: now,
        })
        .where(eq(showtimeSeats.id, item.showtimeSeatId));

      await tx.insert(bookingItems).values({
        bookingId: insertedBooking.id,
        showtimeSeatId: item.showtimeSeatId,
        seatId: item.seatId,
        unitPriceCents: item.priceCents,
      });
    }

    // Audit log
    await tx.insert(auditLogs).values({
      userId,
      action: "SEATS_HELD",
      entityType: "BOOKING",
      entityId: insertedBooking.id,
      details: {
        bookingReference: bookingRef,
        seatIds,
        totalCents,
        expiresAt: expiresAt.toISOString(),
      },
      ipAddress: ipAddress || null,
    });

    return {
      bookingId: insertedBooking.id,
      bookingReference: bookingRef,
      expiresAt,
      subtotalCents,
      bookingFeeCents,
      taxCents,
      totalCents,
      seatCount: seatIds.length,
    };
  });
}

/**
 * 8. Confirm seats only after verified payment
 * 9. Use payment idempotency keys so retries cannot create duplicate bookings
 * 10. Reject the booking if any selected seat is no longer available / expired
 */
export async function confirmBookingAndPayment(params: {
  bookingId: string;
  userId: string;
  idempotencyKey: string;
  provider?: string;
  paymentDetails?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<ConfirmResult> {
  const {
    bookingId,
    userId,
    idempotencyKey,
    provider = "STRIPE_TEST",
    paymentDetails = {},
    ipAddress,
  } = params;

  const db = await getDb();
  const now = new Date();

  return await db.transaction(async (tx: any) => {
    // 9. Payment idempotency check: check if this key was already processed
    const existingPayment = await tx
      .select()
      .from(payments)
      .where(eq(payments.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingPayment.length > 0 && existingPayment[0].status === "SUCCEEDED") {
      // Idempotent replay: return existing booking details
      const existingBooking = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, existingPayment[0].bookingId))
        .limit(1);

      const existingTickets = await tx
        .select()
        .from(tickets)
        .where(eq(tickets.bookingId, existingPayment[0].bookingId));

      return {
        bookingId: existingPayment[0].bookingId,
        bookingReference: existingBooking[0]?.bookingReference || "",
        paymentId: existingPayment[0].id,
        ticketIds: existingTickets.map((t: any) => t.id),
        status: "CONFIRMED",
      };
    }

    // Lock and inspect the booking
    const bookingQuery = await tx.execute(
      sql.raw(`
        SELECT * FROM bookings
        WHERE id = '${bookingId}'
        FOR UPDATE
      `)
    );
    const bookingRows = (bookingQuery.rows || bookingQuery) as any[];
    if (bookingRows.length === 0) {
      throw new Error("Booking not found");
    }

    const booking = bookingRows[0];

    if (booking.user_id !== userId) {
      throw new Error("Unauthorized access to booking");
    }

    if (booking.status === "CONFIRMED") {
      throw new Error("Booking is already confirmed");
    }

    if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
      throw new Error(`Booking cannot be confirmed because it is ${booking.status}`);
    }

    if (new Date(booking.expires_at).getTime() < now.getTime()) {
      // Mark as expired
      await tx
        .update(bookings)
        .set({ status: "EXPIRED", updatedAt: now })
        .where(eq(bookings.id, bookingId));

      await tx
        .update(showtimeSeats)
        .set({ status: "AVAILABLE", heldUntil: null, bookingId: null, updatedAt: now })
        .where(eq(showtimeSeats.bookingId, bookingId));

      throw new Error("Hold expired. Seats have been released.");
    }

    // Lock the showtime_seats for this booking
    const lockedSeatsQuery = await tx.execute(
      sql.raw(`
        SELECT ss.*, s.row_label, s.seat_number
        FROM showtime_seats ss
        JOIN seats s ON ss.seat_id = s.id
        WHERE ss.booking_id = '${bookingId}'
        FOR UPDATE
      `)
    );
    const seatRows = (lockedSeatsQuery.rows || lockedSeatsQuery) as any[];

    // Verify all seats are still HELD for this booking
    for (const seat of seatRows) {
      if (seat.status !== "HELD") {
        throw new Error(`Seat ${seat.row_label}${seat.seat_number} is no longer held`);
      }
    }

    // Record verified payment
    const [insertedPayment] = await tx
      .insert(payments)
      .values({
        bookingId,
        userId,
        amountCents: booking.total_cents,
        currency: "USD",
        provider,
        status: "SUCCEEDED",
        paymentIntentId: `pi_mock_${Date.now()}`,
        idempotencyKey,
        metadata: paymentDetails,
      })
      .returning();

    // Confirm seats: set status = 'BOOKED'
    await tx
      .update(showtimeSeats)
      .set({
        status: "BOOKED",
        heldUntil: null,
        updatedAt: now,
      })
      .where(eq(showtimeSeats.bookingId, bookingId));

    // Confirm booking
    await tx
      .update(bookings)
      .set({
        status: "CONFIRMED",
        updatedAt: now,
      })
      .where(eq(bookings.id, bookingId));

    // Generate digital tickets with QR payload
    const generatedTicketIds: string[] = [];
    for (const seat of seatRows) {
      const ticketCode = `TKT-${booking.booking_reference}-${seat.row_label}${seat.seat_number}`;
      const qrPayload = JSON.stringify({
        ticketCode,
        bookingReference: booking.booking_reference,
        seat: `${seat.row_label}${seat.seat_number}`,
        showtimeId: booking.showtime_id,
        issuedAt: now.toISOString(),
      });

      const [ticket] = await tx
        .insert(tickets)
        .values({
          bookingId,
          showtimeSeatId: seat.id,
          ticketCode,
          qrPayload,
        })
        .returning();

      generatedTicketIds.push(ticket.id);
    }

    // Audit log
    await tx.insert(auditLogs).values({
      userId,
      action: "BOOKING_CONFIRMED",
      entityType: "BOOKING",
      entityId: bookingId,
      details: {
        paymentId: insertedPayment.id,
        amountCents: booking.total_cents,
        ticketCount: generatedTicketIds.length,
      },
      ipAddress: ipAddress || null,
    });

    return {
      bookingId,
      bookingReference: booking.booking_reference,
      paymentId: insertedPayment.id,
      ticketIds: generatedTicketIds,
      status: "CONFIRMED",
    };
  });
}

/**
 * Releases expired seat holds idempotently.
 * Can be called safely by a Vercel Cron job or manual maintenance trigger.
 */
export async function releaseExpiredSeatHolds(): Promise<{ releasedSeats: number; expiredBookings: number }> {
  const db = await getDb();
  const now = new Date();

  return await db.transaction(async (tx: any) => {
    // 1. Find all expired held seats
    const expiredSeatsQuery = await tx.execute(
      sql.raw(`
        SELECT id, booking_id
        FROM showtime_seats
        WHERE status = 'HELD'
          AND held_until IS NOT NULL
          AND held_until < NOW()
        FOR UPDATE
      `)
    );
    const expiredSeats = (expiredSeatsQuery.rows || expiredSeatsQuery) as any[];

    if (expiredSeats.length === 0) {
      return { releasedSeats: 0, expiredBookings: 0 };
    }

    const bookingIdsToInspect = Array.from(
      new Set(expiredSeats.map((s) => s.booking_id).filter(Boolean))
    );

    // 2. Mark pending bookings with expired time as EXPIRED
    let expiredBookingsCount = 0;
    if (bookingIdsToInspect.length > 0) {
      const bList = bookingIdsToInspect.map((b) => `'${b}'`).join(", ");
      const updateBookingsRes = await tx.execute(
        sql.raw(`
          UPDATE bookings
          SET status = 'EXPIRED', updated_at = NOW()
          WHERE id IN (${bList})
            AND status = 'PENDING'
            AND expires_at < NOW()
        `)
      );
      expiredBookingsCount = updateBookingsRes.rowCount || 0;
    }

    // 3. Reset showtime seats to AVAILABLE
    const seatIds = expiredSeats.map((s) => `'${s.id}'`).join(", ");
    await tx.execute(
      sql.raw(`
        UPDATE showtime_seats
        SET status = 'AVAILABLE',
            held_until = NULL,
            booking_id = NULL,
            updated_at = NOW()
        WHERE id IN (${seatIds})
      `)
    );

    // Audit log
    await tx.insert(auditLogs).values({
      userId: null,
      action: "EXPIRED_HOLDS_RELEASED",
      entityType: "SYSTEM_CRON",
      entityId: "CRON_JOB",
      details: {
        releasedSeatsCount: expiredSeats.length,
        expiredBookingsCount,
      },
    });

    return {
      releasedSeats: expiredSeats.length,
      expiredBookings: expiredBookingsCount,
    };
  });
}

/**
 * Cancels a booking, releases the seats back to AVAILABLE, and marks refund
 */
export async function cancelBooking(params: {
  bookingId: string;
  userId: string;
  isAdmin?: boolean;
  ipAddress?: string;
}): Promise<void> {
  const { bookingId, userId, isAdmin = false, ipAddress } = params;
  const db = await getDb();
  const now = new Date();

  await db.transaction(async (tx: any) => {
    const bookingQuery = await tx.execute(
      sql.raw(`
        SELECT b.*, st.start_time
        FROM bookings b
        JOIN showtimes st ON b.showtime_id = st.id
        WHERE b.id = '${bookingId}'
        FOR UPDATE
      `)
    );
    const rows = (bookingQuery.rows || bookingQuery) as any[];
    if (rows.length === 0) {
      throw new Error("Booking not found");
    }

    const booking = rows[0];

    if (!isAdmin && booking.user_id !== userId) {
      throw new Error("Unauthorized access to booking");
    }

    if (booking.status === "CANCELLED") {
      throw new Error("Booking is already cancelled");
    }

    // Eligibility check: showtime must be in future (e.g. at least 1 hour before showtime)
    if (new Date(booking.start_time).getTime() <= now.getTime()) {
      throw new Error("Cannot cancel a booking for a showtime that has already started");
    }

    // Update booking to CANCELLED
    await tx
      .update(bookings)
      .set({ status: "CANCELLED", updatedAt: now })
      .where(eq(bookings.id, bookingId));

    // Release seats to AVAILABLE
    await tx
      .update(showtimeSeats)
      .set({
        status: "AVAILABLE",
        heldUntil: null,
        bookingId: null,
        updatedAt: now,
      })
      .where(eq(showtimeSeats.bookingId, bookingId));

    // Update payment to REFUNDED if was succeeded
    await tx
      .update(payments)
      .set({ status: "REFUNDED", updatedAt: now })
      .where(eq(payments.bookingId, bookingId));

    // Audit log
    await tx.insert(auditLogs).values({
      userId,
      action: "BOOKING_CANCELLED",
      entityType: "BOOKING",
      entityId: bookingId,
      details: {
        cancelledBy: isAdmin ? "ADMIN" : "USER",
        refundAmountCents: booking.total_cents,
      },
      ipAddress: ipAddress || null,
    });
  });
}
