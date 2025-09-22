import { NextRequest, NextResponse } from "next/server";

// Force static for export
export const dynamic = "force-static";

// This is a Next.js API route that acts as a proxy to the PHP admin.php file
// It handles organizer-related operations

const API_URL = "http://localhost/events-api/admin.php";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const params = new URLSearchParams({
      operation: "getAllOrganizers",
      page,
      limit,
      search,
      status,
    });

    const response = await fetch(`${API_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/organizers error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch organizers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let formData: FormData;

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData (file uploads)
      formData = await request.formData();
    } else {
      // Handle JSON data
      const body = await request.json();

      // Convert JSON to FormData for PHP compatibility
      formData = new FormData();
      Object.keys(body).forEach((key) => {
        if (Array.isArray(body[key])) {
          body[key].forEach((item: any, index: number) => {
            formData.append(`${key}[${index}]`, item);
          });
        } else if (body[key] !== null && body[key] !== undefined) {
          formData.append(key, body[key].toString());
        }
      });
    }

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
    console.error("POST /api/organizers error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to create organizer" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    console.error("PUT /api/organizers error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to update organizer" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizerId = searchParams.get("id");

    if (!organizerId) {
      return NextResponse.json(
        { status: "error", message: "Organizer ID is required" },
        { status: 400 }
      );
    }

    const formData = new FormData();
    formData.append("operation", "deleteOrganizer");
    formData.append("organizer_id", organizerId);

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
    console.error("DELETE /api/organizers error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to delete organizer" },
      { status: 500 }
    );
  }
}
