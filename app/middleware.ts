import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/auth/login", "/auth/signup"];
  const otpPath = "/auth/verify-otp";

  // Get stored data
  const userStr = request.cookies.get("user")?.value;
  const pendingOtpUserId = request.cookies.get("pending_otp_user_id")?.value;
  let user: any = null;
  if (userStr) {
    try {
      user = JSON.parse(decodeURIComponent(userStr));
      console.log("Middleware: Found user cookie:", user);
    } catch (e) {
      console.log("Middleware: Failed to parse user cookie:", e);
      user = null;
    }
  } else {
    console.log("Middleware: No user cookie found");
  }

  // Handle OTP verification flow
  if (pathname === otpPath) {
    // If no pending OTP verification, redirect to login
    if (!pendingOtpUserId) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return NextResponse.next();
  }

  // If user has pending OTP verification, redirect to OTP page
  if (pendingOtpUserId && pathname !== otpPath) {
    return NextResponse.redirect(new URL("/auth/verify-otp", request.url));
  }

  // If user is on a public path or root and is authenticated, redirect to appropriate dashboard
  if ((publicPaths.includes(pathname) || pathname === "/") && user) {
    console.log(
      "Middleware: Redirecting authenticated user from",
      pathname,
      "to dashboard"
    );
    const role = user.user_role.toLowerCase();
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    } else if (role === "vendor" || role === "organizer") {
      return NextResponse.redirect(
        new URL("/organizer/dashboard", request.url)
      );
    } else if (role === "client") {
      return NextResponse.redirect(new URL("/client/dashboard", request.url));
    }
  }

  // If user is not authenticated and tries to access protected routes
  if (
    !user &&
    (pathname.startsWith("/admin") ||
      pathname.startsWith("/organizer") ||
      pathname.startsWith("/client"))
  ) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Role-based access control
  if (user) {
    const role = user.user_role.toLowerCase();

    if (pathname.startsWith("/admin") && role !== "admin") {
      if (role === "organizer" || role === "vendor") {
        return NextResponse.redirect(
          new URL("/organizer/dashboard", request.url)
        );
      } else if (role === "client") {
        return NextResponse.redirect(new URL("/client/dashboard", request.url));
      }
    }

    if (
      pathname.startsWith("/organizer") &&
      role !== "organizer" &&
      role !== "vendor"
    ) {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      } else if (role === "client") {
        return NextResponse.redirect(new URL("/client/dashboard", request.url));
      }
    }

    if (pathname.startsWith("/client") && role !== "client") {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      } else if (role === "organizer" || role === "vendor") {
        return NextResponse.redirect(
          new URL("/organizer/dashboard", request.url)
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/organizer/:path*",
    "/client/:path*",
    "/auth/login",
    "/auth/signup",
    "/auth/verify-otp",
  ],
};
