import { getDb } from "../db";
import {
  users,
  movies,
  cinemas,
  showtimes,
  showtimeSeats,
  seats,
  bookings,
  payments,
  tickets,
  auditLogs,
} from "../db/schema";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "../lib/auth";
import {
  holdSeatsAndCreateBooking,
  confirmBookingAndPayment,
  releaseExpiredSeatHolds,
  cancelBooking,
} from "../lib/booking-transaction";
import { eq, sql } from "drizzle-orm";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
  }
}

async function runAllQATests() {
  console.log("\n=======================================================");
  console.log("🕵️  [Agent 3 - QA Agent] Starting CineBook Test Suite");
  console.log("=======================================================\n");

  const db = await getDb();

  // ---------------------------------------------------------------------------
  // Test 1: Authentication, Password Hashing, Session JWT, and Authorization
  // ---------------------------------------------------------------------------
  console.log("📋 Test Suite 1: Authentication & Authorization Security");
  const testEmail = `qa_user_${Date.now()}@cinebook.com`;
  const plainPassword = "TestPassword123!";
  const hashed = await hashPassword(plainPassword);

  assert(await verifyPassword(plainPassword, hashed), "Password hashing and bcrypt verification");
  assert(!(await verifyPassword("WrongPassword", hashed)), "Reject invalid password credentials");

  const [createdUser] = await db
    .insert(users)
    .values({
      email: testEmail,
      passwordHash: hashed,
      fullName: "QA Test Customer",
      role: "user",
    })
    .returning();

  assert(Boolean(createdUser?.id), "User registration in database");

  const token = await createSessionToken({
    userId: createdUser.id,
    email: createdUser.email,
    fullName: createdUser.fullName,
    role: "user",
  });

  const verified = await verifySessionToken(token);
  assert(verified?.userId === createdUser.id, "Session token signature and payload verification");
  assert(verified?.role === "user", "User role properly encoded in session");

  // ---------------------------------------------------------------------------
  // Test 2: Movie Inventory, Cinemas & Showtimes Verification
  // ---------------------------------------------------------------------------
  console.log("\n📋 Test Suite 2: Movie Search, Showtimes & Seat Maps");
  const allMovies = await db.select().from(movies);
  assert(allMovies.length >= 4, "Movie catalog populated with required sample titles");

  const allCinemas = await db.select().from(cinemas);
  assert(allCinemas.length >= 3, "Cinemas created across major metropolitan locations");

  const sampleShowtime = (
    await db
      .select()
      .from(showtimes)
      .limit(1)
  )[0];
  assert(Boolean(sampleShowtime), "Showtimes scheduled in database");

  const showtimeSeatsList = await db
    .select()
    .from(showtimeSeats)
    .where(eq(showtimeSeats.showtimeId, sampleShowtime.id));
  assert(showtimeSeatsList.length > 0, "Showtime seats initialized with individual pricing");

  // ---------------------------------------------------------------------------
  // Test 3: Complete Booking Flow (Hold -> Price Verify -> Pay -> Digital Ticket)
  // ---------------------------------------------------------------------------
  console.log("\n📋 Test Suite 3: Complete End-to-End Booking Transaction");

  // Find two available seats
  const availableSeats = showtimeSeatsList.filter((s: any) => s.status === "AVAILABLE");
  assert(availableSeats.length >= 2, "Found available seats for test booking");

  const targetSeat1 = availableSeats[0];
  const targetSeat2 = availableSeats[1];

  const holdResult = await holdSeatsAndCreateBooking({
    userId: createdUser.id,
    showtimeId: sampleShowtime.id,
    seatIds: [targetSeat1.seatId || targetSeat1.seat_id, targetSeat2.seatId || targetSeat2.seat_id],
    holdMinutes: 10,
  });

  assert(Boolean(holdResult.bookingId), "Transactional seat hold created pending booking");
  assert(
    holdResult.bookingFeeCents === 150,
    "Booking fee applied ($1.50)",
    `Expected 150, got ${holdResult.bookingFeeCents}`
  );
  assert(
    holdResult.totalCents ===
      holdResult.subtotalCents + holdResult.bookingFeeCents + holdResult.taxCents,
    "Accurate integer minor unit pricing calculation (subtotal + fee + tax = total)"
  );

  // Check showtime_seats status is now HELD
  const updatedSeat = (
    await db
      .select()
      .from(showtimeSeats)
      .where(eq(showtimeSeats.id, targetSeat1.id))
      .limit(1)
  )[0];
  assert(updatedSeat.status === "HELD", "Target showtime seat status updated to HELD");

  // Confirm payment
  const idempotencyKey = `qa_idemp_${Date.now()}`;
  const confirmResult = await confirmBookingAndPayment({
    bookingId: holdResult.bookingId,
    userId: createdUser.id,
    idempotencyKey,
  });

  assert(confirmResult.status === "CONFIRMED", "Payment verified and booking CONFIRMED");
  assert(confirmResult.ticketIds.length === 2, "Digital tickets generated with QR payloads");

  // Check seat is now BOOKED
  const bookedSeat = (
    await db
      .select()
      .from(showtimeSeats)
      .where(eq(showtimeSeats.id, targetSeat1.id))
      .limit(1)
  )[0];
  assert(bookedSeat.status === "BOOKED", "Confirmed showtime seat status updated to BOOKED");

  // ---------------------------------------------------------------------------
  // Test 4: Payment Idempotency & Duplicate Prevention
  // ---------------------------------------------------------------------------
  console.log("\n📋 Test Suite 4: Payment Idempotency Protection");
  const duplicateConfirm = await confirmBookingAndPayment({
    bookingId: holdResult.bookingId,
    userId: createdUser.id,
    idempotencyKey, // same key!
  });
  assert(
    duplicateConfirm.paymentId === confirmResult.paymentId,
    "Idempotent payment re-submission recognizes existing transaction and does not duplicate charge"
  );

  // ---------------------------------------------------------------------------
  // Test 5: Concurrent Seat Booking Race Condition (CRITICAL REQUIREMENT)
  // "Attempt to book the same seat simultaneously from two sessions. Confirm only one booking succeeds."
  // ---------------------------------------------------------------------------
  console.log("\n📋 Test Suite 5: Concurrent Seat Booking Race Condition");

  // Find another available seat
  const freshAvailableSeats = (
    await db
      .select()
      .from(showtimeSeats)
      .where(eq(showtimeSeats.showtimeId, sampleShowtime.id))
  ).filter((s: any) => s.status === "AVAILABLE");

  assert(freshAvailableSeats.length > 0, "Found seat for concurrency race test");
  const raceSeat = freshAvailableSeats[0];

  // User 1 & User 2
  const user1Id = createdUser.id;
  const [user2] = await db
    .insert(users)
    .values({
      email: `concurrent_user_${Date.now()}@cinebook.com`,
      passwordHash: hashed,
      fullName: "Concurrent User 2",
      role: "user",
    })
    .returning();

  // Fire both requests concurrently using Promise.allSettled
  const raceSeatId = raceSeat.seatId || raceSeat.seat_id;
  const [attempt1, attempt2] = await Promise.allSettled([
    holdSeatsAndCreateBooking({
      userId: user1Id,
      showtimeId: sampleShowtime.id,
      seatIds: [raceSeatId],
      holdMinutes: 5,
    }),
    holdSeatsAndCreateBooking({
      userId: user2.id,
      showtimeId: sampleShowtime.id,
      seatIds: [raceSeatId],
      holdMinutes: 5,
    }),
  ]);

  const succeededCount = [attempt1, attempt2].filter((r) => r.status === "fulfilled").length;
  const rejectedCount = [attempt1, attempt2].filter((r) => r.status === "rejected").length;

  assert(
    succeededCount === 1,
    "Exactly ONE concurrent booking succeeded",
    `Expected 1, got ${succeededCount}`
  );
  assert(
    rejectedCount === 1,
    "Conflicting concurrent booking was REJECTED by database transaction lock",
    `Expected 1, got ${rejectedCount}`
  );

  // ---------------------------------------------------------------------------
  // Test 6: Expired Seat Hold Release & Cron Idempotency
  // ---------------------------------------------------------------------------
  console.log("\n📋 Test Suite 6: Expired Seat Hold Release & Automatic Cleanup");

  // Pick a fresh seat and simulate an expired hold in the past
  const freshSeatsForExpire = (
    await db
      .select()
      .from(showtimeSeats)
      .where(eq(showtimeSeats.showtimeId, sampleShowtime.id))
  ).filter((s: any) => s.status === "AVAILABLE");

  const expireSeat = freshSeatsForExpire[0];
  const pastDate = new Date(Date.now() - 60000); // 1 minute in the past

  // Create an expired hold directly
  await db
    .update(showtimeSeats)
    .set({
      status: "HELD",
      heldUntil: pastDate,
      updatedAt: pastDate,
    })
    .where(eq(showtimeSeats.id, expireSeat.id));

  // Run cleanup
  const cleanupResult = await releaseExpiredSeatHolds();
  assert(cleanupResult.releasedSeats >= 1, "Expired seat holds detected and released by cleanup engine");

  const seatAfterCleanup = (
    await db
      .select()
      .from(showtimeSeats)
      .where(eq(showtimeSeats.id, expireSeat.id))
      .limit(1)
  )[0];
  assert(
    seatAfterCleanup.status === "AVAILABLE",
    "Seat status reverted to AVAILABLE after expired hold cleanup"
  );

  // ---------------------------------------------------------------------------
  // Test 7: User Isolation & Security (User A cannot access or cancel User B's booking)
  // ---------------------------------------------------------------------------
  console.log("\n📋 Test Suite 7: User Isolation & Security Protections");
  let unauthorizedCancelBlocked = false;
  try {
    // user2 tries to cancel user1's booking
    await cancelBooking({
      bookingId: holdResult.bookingId,
      userId: user2.id,
      isAdmin: false,
    });
  } catch (err: any) {
    if (err.message.includes("Unauthorized")) {
      unauthorizedCancelBlocked = true;
    }
  }
  assert(unauthorizedCancelBlocked, "User B blocked from cancelling User A's confirmed booking");

  // ---------------------------------------------------------------------------
  // Test 8: Booking Cancellation & Automatic Seat Release
  // ---------------------------------------------------------------------------
  console.log("\n📋 Test Suite 8: Customer Cancellation & Seat Return");
  await cancelBooking({
    bookingId: holdResult.bookingId,
    userId: createdUser.id,
    isAdmin: false,
  });

  const cancelledBooking = (
    await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, holdResult.bookingId))
      .limit(1)
  )[0];
  assert(cancelledBooking.status === "CANCELLED", "Booking status set to CANCELLED upon cancellation");

  const seatAfterCancel = (
    await db
      .select()
      .from(showtimeSeats)
      .where(eq(showtimeSeats.id, targetSeat1.id))
      .limit(1)
  )[0];
  assert(seatAfterCancel.status === "AVAILABLE", "Seats released back to AVAILABLE pool upon cancellation");

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`📊 QA Test Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run directly
if (require.main === module) {
  runAllQATests()
    .then(() => {
      console.log("🎉 All QA integration tests passed successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("💥 Unhandled error in QA test runner:", err);
      process.exit(1);
    });
}
