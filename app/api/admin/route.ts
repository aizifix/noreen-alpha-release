import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get the PHP file path
    const phpFilePath = process.cwd() + "/app/api/admin.php";

    // Convert the request body to URL-encoded format for PHP
    const formData = new URLSearchParams();
    Object.entries(body).forEach(([key, value]) => {
      if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });

    // Execute the PHP file with the data
    const { stdout, stderr } = await execAsync(`php ${phpFilePath}`, {
      input: formData.toString(),
      env: {
        ...process.env,
        REQUEST_METHOD: "POST",
        CONTENT_TYPE: "application/x-www-form-urlencoded",
        CONTENT_LENGTH: formData.toString().length.toString(),
      },
    });

    if (stderr) {
      console.error("PHP Error:", stderr);
      return NextResponse.json(
        { status: "error", message: "PHP execution error" },
        { status: 500 }
      );
    }

    // Parse the PHP response
    try {
      const response = JSON.parse(stdout);
      return NextResponse.json(response);
    } catch (parseError) {
      console.error("Response parsing error:", parseError);
      console.log("Raw PHP output:", stdout);
      return NextResponse.json(
        { status: "error", message: "Invalid response format" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get("operation");

    if (!operation) {
      return NextResponse.json(
        { status: "error", message: "Operation parameter required" },
        { status: 400 }
      );
    }

    // Get the PHP file path
    const phpFilePath = process.cwd() + "/app/api/admin.php";

    // Build query string
    const queryString = searchParams.toString();

    // Execute the PHP file with GET parameters
    const { stdout, stderr } = await execAsync(
      `php ${phpFilePath}?${queryString}`,
      {
        env: {
          ...process.env,
          REQUEST_METHOD: "GET",
          QUERY_STRING: queryString,
        },
      }
    );

    if (stderr) {
      console.error("PHP Error:", stderr);
      return NextResponse.json(
        { status: "error", message: "PHP execution error" },
        { status: 500 }
      );
    }

    // Parse the PHP response
    try {
      const response = JSON.parse(stdout);
      return NextResponse.json(response);
    } catch (parseError) {
      console.error("Response parsing error:", parseError);
      console.log("Raw PHP output:", stdout);
      return NextResponse.json(
        { status: "error", message: "Invalid response format" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
