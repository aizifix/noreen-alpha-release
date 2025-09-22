"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";

interface RouteProtectionProps {
  children: React.ReactNode;
  authRequired?: boolean;
}

/**
 * Client-side only component that handles route protection
 * Prevents hydration mismatches by only running on the client
 */
export default function ClientRouteProtection({
  children,
  authRequired = true,
}: RouteProtectionProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run on client-side
    const userData = secureStorage.getItem("user");

    if (authRequired) {
      // Route requires authentication
      if (!userData?.user_role) {
        // Not authenticated, redirect to login
        router.replace("/auth/login");
      } else {
        // Authenticated, prevent back button to auth pages
        window.history.pushState(null, "", window.location.href);
        window.onpopstate = function () {
          window.history.pushState(null, "", window.location.href);
        };
      }
    } else {
      // Auth pages - redirect if already logged in
      if (userData?.user_role) {
        const role = userData.user_role.toLowerCase();
        if (role === "admin") {
          router.replace("/admin/dashboard");
        } else if (role === "vendor" || role === "organizer") {
          router.replace("/organizer/dashboard");
        } else if (role === "client") {
          router.replace("/client/dashboard");
        }
      }
    }
  }, [authRequired, router, pathname]);

  return <>{children}</>;
}
