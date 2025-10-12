import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { status: "error", message: "Path parameter required" },
        { status: 400 }
      );
    }

    // Security: Remove any directory traversal attempts
    const cleanPath = path.replace(/\.\./g, '').replace(/\\/g, '/');

    // Define the base directory for uploads
    const baseDir = process.cwd();

    // Construct the full file path - the cleanPath should already include 'uploads/'
    let fullPath = join(baseDir, 'app', 'api', cleanPath);

    // Check if file exists and is within the allowed directory
    if (!existsSync(fullPath) || !(await stat(fullPath)).isFile()) {
      // Return default profile picture if file not found
      const defaultPaths = [
        join(baseDir, 'public', 'default_pfp.png'),
        join(baseDir, 'app', 'api', 'uploads', 'user_profile', 'default_pfp.png'),
        join(baseDir, 'app', 'api', 'uploads', 'profile_pictures', 'default_pfp.png')
      ];

      let foundDefault = false;
      for (const defaultPath of defaultPaths) {
        if (existsSync(defaultPath)) {
          fullPath = defaultPath;
          foundDefault = true;
          break;
        }
      }

      if (!foundDefault) {
        return new NextResponse('File not found', { status: 404 });
      }
    }

    // Read the image file
    const imageBuffer = await readFile(fullPath);

    // Determine MIME type based on file extension
    const ext = fullPath.toLowerCase().split('.').pop();
    let mimeType = 'image/jpeg'; // default

    switch (ext) {
      case 'png':
        mimeType = 'image/png';
        break;
      case 'gif':
        mimeType = 'image/gif';
        break;
      case 'webp':
        mimeType = 'image/webp';
        break;
      case 'svg':
        mimeType = 'image/svg+xml';
        break;
      case 'jpg':
      case 'jpeg':
      default:
        mimeType = 'image/jpeg';
        break;
    }

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
