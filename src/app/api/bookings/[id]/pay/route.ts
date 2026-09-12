import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { confirmBookingAndPayment } from "@/lib/booking-transaction";

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
    const { idempotencyKey, provider = "STRIPE_TEST", paymentMethod = "pm_card_visa" } = await request.json();

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Payment idempotency key is required" },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for") || undefined;

    const result = await confirmBookingAndPayment({
      bookingId,
      userId: user.userId,
      idempotencyKey,
      provider,
      paymentDetails: {
        paymentMethod,
        cardBrand: "visa",
        last4: "4242",
        testMode: true,
      },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Payment confirmation error:", error);
    const status = error.message.includes("expired") ? 410 : 400;
    return NextResponse.json(
      { error: error.message || "Payment processing failed" },
      { status }
    );
  }
}
