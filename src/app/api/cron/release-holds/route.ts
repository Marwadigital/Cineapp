import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredSeatHolds } from "@/lib/booking-transaction";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRelease(request);
}

export async function POST(request: NextRequest) {
  return handleRelease(request);
}

async function handleRelease(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "cinebook_cron_local_secret_token_987654321";

  // Check Bearer token or x-cron-secret header or query param
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    request.headers.get("x-cron-secret") === cronSecret ||
    querySecret === cronSecret;

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing CRON_SECRET" },
      { status: 401 }
    );
  }

  try {
    const result = await releaseExpiredSeatHolds();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      releasedSeats: result.releasedSeats,
      expiredBookings: result.expiredBookings,
    });
  } catch (error: any) {
    console.error("Failed to release expired holds:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
