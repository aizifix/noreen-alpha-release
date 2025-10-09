import { NextRequest, NextResponse } from 'next/server';

// Force static for export
export const dynamic = "force-static";

// This is a Next.js API route that acts as a proxy to the PHP admin.php file
// It handles fetching available organizers

const API_URL = "admin.php";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("event_id");
    const date = searchParams.get("date");
    const status = searchParams.get("status") || "active";

    const params = new URLSearchParams({
      operation: "getAvailableOrganizers",
      status: status,
    });

    if (eventId) params.append("event_id", eventId);
    if (date) params.append("date", date);

    const response = await fetch(`${API_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/organizers/available error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch available organizers' },
      { status: 500 }
    );
  }
}
