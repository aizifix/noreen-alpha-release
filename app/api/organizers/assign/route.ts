import { NextRequest, NextResponse } from 'next/server';

// Force static for export
export const dynamic = "force-static";

// This is a Next.js API route that acts as a proxy to the PHP admin.php file
// It handles organizer assignment operations

const API_URL = "admin.php";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Convert JSON to FormData for PHP compatibility
    const formData = new FormData();
    Object.keys(body).forEach((key) => {
      if (Array.isArray(body[key])) {
        body[key].forEach((item: any, index: number) => {
          formData.append(`${key}[${index}]`, item);
        });
      } else if (body[key] !== null && body[key] !== undefined) {
        formData.append(key, body[key].toString());
      }
    });

    const response = await fetch(API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('POST /api/organizers/assign error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to assign organizer' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("event_id");
    const organizerId = searchParams.get("organizer_id");

    const params = new URLSearchParams({
      operation: "getOrganizerAssignments",
    });

    if (eventId) params.append("event_id", eventId);
    if (organizerId) params.append("organizer_id", organizerId);

    const response = await fetch(`${API_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/organizers/assign error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch organizer assignments' },
      { status: 500 }
    );
  }
}
