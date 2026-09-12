import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { holdSeatsAndCreateBooking } from "@/lib/booking-transaction";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to hold seats. Please login." },
        { status: 401 }
      );
    }

    const { showtimeId, seatIds } = await request.json();

    if (!showtimeId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: "Showtime and at least one seat must be selected" },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for") || undefined;

    const result = await holdSeatsAndCreateBooking({
      userId: user.userId,
      showtimeId,
      seatIds,
      holdMinutes: 10,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      booking: result,
    });
  } catch (error: any) {
    console.error("Seat hold error:", error);
    const status = error.message.includes("no longer available") ? 409 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to hold seats" },
      { status }
    );
  }
}
