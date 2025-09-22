import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Force static for export
export const dynamic = "force-static";

// Ensure upload directories exist
async function ensureUploadDirectories() {
  const dirs = [
    "public/uploads",
    "public/uploads/venue_profile_pictures",
    "public/uploads/venue_cover_photos",
  ];

  for (const dir of dirs) {
    const path = join(process.cwd(), dir);
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure upload directories exist
    await ensureUploadDirectories();

    const formData = await request.formData();
    const venue_title = formData.get("venue_title") as string;
    const venue_details = formData.get("venue_details") as string;
    const venue_location = formData.get("venue_location") as string;
    const venue_type = formData.get("venue_type") as string;
    const venue_capacity = parseInt(formData.get("venue_capacity") as string);
    const venue_profile_picture = formData.get("venue_profile_picture") as File;
    const venue_cover_photo = formData.get("venue_cover_photo") as File;
    const inclusions = JSON.parse(formData.get("inclusions") as string);

    // Handle file uploads
    let profile_picture_path = null;
    let cover_photo_path = null;

    if (venue_profile_picture) {
      try {
        const bytes = await venue_profile_picture.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}_${venue_profile_picture.name}`;
        const path = join(
          process.cwd(),
          "public/uploads/venue_profile_pictures",
          filename
        );
        await writeFile(path, buffer);
        profile_picture_path = `uploads/venue_profile_pictures/${filename}`;
      } catch (error) {
        console.error("Error uploading profile picture:", error);
        throw new Error("Failed to upload profile picture");
      }
    }

    if (venue_cover_photo) {
      try {
        const bytes = await venue_cover_photo.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}_${venue_cover_photo.name}`;
        const path = join(
          process.cwd(),
          "public/uploads/venue_cover_photos",
          filename
        );
        await writeFile(path, buffer);
        cover_photo_path = `uploads/venue_cover_photos/${filename}`;
      } catch (error) {
        console.error("Error uploading cover photo:", error);
        throw new Error("Failed to upload cover photo");
      }
    }

    // Connect to database
    const response = await fetch("http://localhost/events-api/admin.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operation: "createVenue",
        venue_data: {
          venue_title,
          venue_details,
          venue_location,
          venue_type,
          venue_capacity,
          venue_profile_picture: profile_picture_path,
          venue_cover_photo: cover_photo_path,
        },
        inclusions_data: inclusions,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Server response:", data); // Debug log

    if (data.status === "success") {
      return NextResponse.json(data);
    } else {
      throw new Error(data.message || "Failed to create venue");
    }
  } catch (error) {
    console.error("Error creating venue:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to create venue",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch(
      "http://localhost/events-api/admin.php?operation=getAllVenues",
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
    console.error("Error fetching venues:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to fetch venues",
      },
      { status: 500 }
    );
  }
}
