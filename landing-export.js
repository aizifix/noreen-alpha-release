// This script creates a minimal version of the app for static export
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Create temp directory
const tempDir = path.join(__dirname, ".temp-landing");

// Clean up any previous temp directory
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// Create temp directory
fs.mkdirSync(tempDir, { recursive: true });
fs.mkdirSync(path.join(tempDir, "app"), { recursive: true });
fs.mkdirSync(path.join(tempDir, "public"), { recursive: true });
fs.mkdirSync(path.join(tempDir, "components", "ui"), { recursive: true });

console.log(
  "Creating a minimal version of the app for static landing page export..."
);

// Copy page.tsx
fs.copyFileSync(
  path.join(__dirname, "app", "page.tsx"),
  path.join(tempDir, "app", "page.tsx")
);
fs.copyFileSync(
  path.join(__dirname, "app", "globals.css"),
  path.join(tempDir, "app", "globals.css")
);

// Create a simplified layout.tsx
fs.writeFileSync(
  path.join(tempDir, "app", "layout.tsx"),
  `import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Noreen Event System",
  description: "Streamlined event management for unforgettable experiences",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fontSans.variable
      )}>
        {children}
      </body>
    </html>
  );
}`
);

// Copy LandingPage component
fs.mkdirSync(path.join(tempDir, "app", "components"), { recursive: true });
fs.writeFileSync(
  path.join(tempDir, "app", "components", "LandingPage.tsx"),
  `"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Welcome to Noreen Event System
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                Streamlined event management for unforgettable experiences.
              </p>
            </div>
            <div className="space-x-4">
              <Link href="/auth/login">
                <Button className="bg-[#028A75] text-white hover:bg-[#026B5C]">Login</Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="outline">Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-12">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Effortless Event Planning</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Plan and organize events with our intuitive interface.</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Venue Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Find and book the perfect venue for your event.</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Client Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Seamlessly collaborate with clients throughout the planning process.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} Noreen Event System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}`
);

fs.copyFileSync(
  path.join(__dirname, "app", "components", "PublicNavbar.tsx"),
  path.join(tempDir, "app", "components", "PublicNavbar.tsx")
);

// Copy necessary UI components
const uiComponents = ["button", "card", "separator", "badge", "dialog"];

uiComponents.forEach((component) => {
  // Copy UI component from /components/ui
  if (
    fs.existsSync(path.join(__dirname, "components", "ui", `${component}.tsx`))
  ) {
    fs.copyFileSync(
      path.join(__dirname, "components", "ui", `${component}.tsx`),
      path.join(tempDir, "components", "ui", `${component}.tsx`)
    );
  }
});

// Copy public assets
fs.copyFileSync(
  path.join(__dirname, "public", "logo.png"),
  path.join(tempDir, "public", "logo.png")
);

// Create a simple version of utils.ts
fs.mkdirSync(path.join(tempDir, "lib"), { recursive: true });
fs.writeFileSync(
  path.join(tempDir, "lib", "utils.ts"),
  `export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}`
);

// Create next.config.js with export configuration
fs.writeFileSync(
  path.join(tempDir, "next.config.js"),
  `/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export
  output: "export",

  // Image configuration for static export
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "noreen-events.online",
        pathname: "/**",
      }
    ],
    domains: ["localhost", "noreen-events.online"],
  },
};

module.exports = nextConfig;`
);

// Copy necessary config files
const configFiles = [
  "package.json",
  "tsconfig.json",
  "tailwind.config.ts",
  "postcss.config.mjs",
  "components.json",
];

configFiles.forEach((file) => {
  if (fs.existsSync(path.join(__dirname, file))) {
    fs.copyFileSync(path.join(__dirname, file), path.join(tempDir, file));
  }
});

console.log("Files prepared. Building landing pages...");

// Build the landing pages
try {
  process.chdir(tempDir);
  execSync("npx next build --no-lint", { stdio: "inherit" });

  console.log("Build completed. Checking for output directory...");

  // Check if 'out' directory exists
  if (fs.existsSync(path.join(tempDir, "out"))) {
    console.log("Output found at out/ directory");

    // Copy the entire 'out' directory to the main project
    const outDir = path.join(__dirname, "out-landing");

    if (fs.existsSync(outDir)) {
      console.log("Removing existing output directory...");
      fs.rmSync(outDir, { recursive: true, force: true });
    }

    // Execute a copy command instead of using fs.copyFileSync to avoid permission issues
    console.log("Copying output directory...");
    try {
      if (process.platform === "win32") {
        // Windows
        execSync(`xcopy "${path.join(tempDir, "out")}" "${outDir}" /E /I /Y`);
      } else {
        // Linux/Mac
        execSync(`cp -R "${path.join(tempDir, "out")}" "${outDir}"`);
      }
      console.log("Success! Landing pages exported to out-landing directory");
    } catch (copyError) {
      console.error("Error copying output directory:", copyError);
      // Try alternative method
      console.log("Trying alternative copy method...");
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      execSync(`npm run build -- --no-lint`, {
        cwd: tempDir,
        env: {
          ...process.env,
          NEXT_OUTPUT_DIRECTORY: path.resolve(outDir),
        },
        stdio: "inherit",
      });
      console.log("Alternative build complete!");
    }
  } else {
    console.error("No output directory found after build!");
  }
} catch (error) {
  console.error("Build failed:", error);
} finally {
  // Clean up temp directory
  process.chdir(__dirname);
  fs.rmSync(tempDir, { recursive: true, force: true });
}
