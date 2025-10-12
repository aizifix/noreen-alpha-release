import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get the PHP file path
    const phpFilePath = process.cwd() + "/app/api/vendor.php";

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
    const phpProcess = spawn("php", [phpFilePath], {
      env: {
        ...process.env,
        REQUEST_METHOD: "POST",
        CONTENT_TYPE: "application/x-www-form-urlencoded",
        CONTENT_LENGTH: formData.toString().length.toString(),
      },
    });

    // Send the form data to PHP
    phpProcess.stdin.write(formData.toString());
    phpProcess.stdin.end();

    // Collect output
    let stdout = "";
    let stderr = "";

    phpProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    phpProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Wait for the process to complete
    await new Promise<void>((resolve, reject) => {
      phpProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`PHP process exited with code ${code}`));
        }
      });
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
    const phpFilePath = process.cwd() + "/app/api/vendor.php";

    // Build query string
    const queryString = searchParams.toString();

    // Execute the PHP file with GET parameters
    const phpProcess = spawn("php", [`${phpFilePath}?${queryString}`], {
      env: {
        ...process.env,
        REQUEST_METHOD: "GET",
        QUERY_STRING: queryString,
      },
    });

    // Collect output
    let stdout = "";
    let stderr = "";

    phpProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    phpProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Wait for the process to complete
    await new Promise<void>((resolve, reject) => {
      phpProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`PHP process exited with code ${code}`));
        }
      });
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
