import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Force static for export
export const dynamic = "force-static";

// Ensure upload directories exist
async function ensureUploadDirectories() {
  const dirs = [
    "public/uploads",
    "public/uploads/supplier_docs",
    "public/uploads/supplier_offers",
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
    const operation = formData.get("operation") as string;

    if (operation === "createSupplier") {
      return await handleCreateSupplier(formData);
    } else if (operation === "createOffer") {
      return await handleCreateOffer(formData);
    } else {
      return NextResponse.json(
        { status: "error", message: "Invalid operation" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in supplier API:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

async function handleCreateSupplier(formData: FormData) {
  try {
    // Extract supplier data
    const business_name = formData.get("business_name") as string;
    const contact_person = formData.get("contact_person") as string;
    const contact_number = formData.get("contact_number") as string;
    const contact_email = formData.get("contact_email") as string;
    const business_address = formData.get("business_address") as string;
    const supplier_type = formData.get("supplier_type") as string;
    const specialty_category = formData.get("specialty_category") as string;
    const business_description = formData.get("business_description") as string;
    const agreement_signed = formData.get("agreement_signed") === "true";
    const is_verified = formData.get("is_verified") === "true";
    const password = formData.get("password") as string;

    // Handle file uploads for registration documents
    const registration_docs = [];
    let fileIndex = 0;

    while (formData.has(`registration_doc_${fileIndex}`)) {
      const file = formData.get(`registration_doc_${fileIndex}`) as File;
      const documentType = formData.get(`doc_type_${fileIndex}`) as string;

      if (file && file.size > 0) {
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const filename = `${Date.now()}_${file.name}`;
          const filePath = join(
            process.cwd(),
            "public/uploads/supplier_docs",
            filename
          );

          await writeFile(filePath, buffer);

          registration_docs.push({
            file_name: filename,
            file_path: `uploads/supplier_docs/${filename}`,
            original_name: file.name,
            document_type: documentType,
            file_size: file.size,
            uploaded_at: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          // Continue with other files even if one fails
        }
      }

      fileIndex++;
    }

    // Prepare supplier data for API
    const supplierData = {
      business_name,
      contact_person,
      contact_number,
      contact_email,
      business_address,
      supplier_type,
      specialty_category,
      business_description,
      agreement_signed,
      is_verified,
      registration_docs,
      ...(password && { password }),
    };

    // Send to PHP API
    const response = await fetch("supplier.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operation: "createSupplier",
        ...supplierData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating supplier:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to create supplier",
      },
      { status: 500 }
    );
  }
}

async function handleCreateOffer(formData: FormData) {
  try {
    // Extract offer data
    const supplier_id = formData.get("supplier_id") as string;
    const offer_title = formData.get("offer_title") as string;
    const offer_description = formData.get("offer_description") as string;
    const price_min = formData.get("price_min") as string;
    const price_max = formData.get("price_max") as string;
    const service_category = formData.get("service_category") as string;
    const package_size = formData.get("package_size") as string;
    const delivery_timeframe = formData.get("delivery_timeframe") as string;
    const terms_conditions = formData.get("terms_conditions") as string;

    // Handle file uploads for offer attachments (portfolio, samples)
    const offer_attachments = [];
    let fileIndex = 0;

    while (formData.has(`offer_attachment_${fileIndex}`)) {
      const file = formData.get(`offer_attachment_${fileIndex}`) as File;
      const attachmentType = formData.get(
        `attachment_type_${fileIndex}`
      ) as string;

      if (file && file.size > 0) {
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const filename = `${Date.now()}_${file.name}`;
          const filePath = join(
            process.cwd(),
            "public/uploads/supplier_offers",
            filename
          );

          await writeFile(filePath, buffer);

          offer_attachments.push({
            file_name: filename,
            file_path: `uploads/supplier_offers/${filename}`,
            original_name: file.name,
            attachment_type: attachmentType,
            file_size: file.size,
            file_type: file.type,
            uploaded_at: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error uploading attachment ${file.name}:`, error);
          // Continue with other files even if one fails
        }
      }

      fileIndex++;
    }

    // Prepare offer data for API
    const offerData = {
      supplier_id: parseInt(supplier_id),
      offer_title,
      offer_description,
      price_min: parseFloat(price_min),
      price_max: parseFloat(price_max || price_min),
      service_category,
      package_size,
      delivery_timeframe,
      terms_conditions,
      offer_attachments,
    };

    // Send to PHP API
    const response = await fetch("supplier.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operation: "createOffer",
        ...offerData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating offer:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to create offer",
      },
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

    // Build query string from all search params
    const queryString = searchParams.toString();

    // Get the PHP file path
    const phpFilePath = process.cwd() + "/app/api/supplier.php";

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
    console.error("Error fetching supplier data:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to fetch data",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get("operation");
    const supplier_id = searchParams.get("supplier_id");

    if (!operation || !supplier_id) {
      return NextResponse.json(
        {
          status: "error",
          message: "Operation and supplier_id parameters required",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Forward request to PHP API
    const response = await fetch(
      `supplier.php?operation=${operation}&supplier_id=${supplier_id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating supplier:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to update supplier",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get("operation");
    const supplier_id = searchParams.get("supplier_id");

    if (!operation || !supplier_id) {
      return NextResponse.json(
        {
          status: "error",
          message: "Operation and supplier_id parameters required",
        },
        { status: 400 }
      );
    }

    // Forward request to PHP API
    const response = await fetch(
      `supplier.php?operation=${operation}&supplier_id=${supplier_id}`,
      {
        method: "DELETE",
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
    console.error("Error deleting supplier:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to delete supplier",
      },
      { status: 500 }
    );
  }
}
