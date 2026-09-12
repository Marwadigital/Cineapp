import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cancelBooking } from "@/lib/booking-transaction";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;

    await cancelBooking({
      bookingId,
      userId: user.userId,
      isAdmin: user.role === "admin",
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully and seats released.",
    });
  } catch (error: any) {
    console.error("Cancel booking error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel booking" },
      { status: 400 }
    );
  }
}
