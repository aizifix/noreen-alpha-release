// components/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { secureStorage } from "@/app/utils/encryption";
import axios from "axios";

export const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = () => {
    try {
      const user = secureStorage.getItem("user");
      if (user?.user_id) {
        axios
          .post(
            "auth.php",
            { operation: "logout", user_id: user.user_id },
            { headers: { "Content-Type": "application/json" } }
          )
          .catch(() => {});
      }
    } catch (e) {
      // ignore
    }
    // Clear all authentication-related data
    secureStorage.removeItem("user");

    // Clear session localStorage keys
    if (typeof window !== "undefined") {
      localStorage.removeItem("session_client_absolute_start");
      localStorage.removeItem("session_client_last_activity");
      localStorage.removeItem("session_organizer_absolute_start");
      localStorage.removeItem("session_organizer_last_activity");
      localStorage.removeItem("session_admin_absolute_start");
      localStorage.removeItem("session_admin_last_activity");
    }

    // Clear any other stored data
    document.cookie =
      "pending_otp_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie =
      "pending_otp_email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    // Ensure mirrored user cookie is removed
    document.cookie =
      "user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";

    // Replace the current URL with login page (prevents going back)
    router.replace("/auth/login");
  };

  // Prevent back navigation after logout
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = function () {
      window.history.pushState(null, "", window.location.href);
    };

    // Cleanup
    return () => {
      window.onpopstate = null;
    };
  }, []);

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
    >
      Logout
    </button>
  );
};
