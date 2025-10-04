import { NextRequest, NextResponse } from "next/server";

// Force static export for this API route
export const dynamic = "force-static";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("id");

    if (!venueId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Venue ID is required",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `admin.php?operation=getVenueById&venue_id=${venueId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching venue details:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch venue details",
      },
      { status: 500 }
    );
  }
}
