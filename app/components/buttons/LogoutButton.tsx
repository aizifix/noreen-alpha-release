// components/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { secureStorage } from "@/app/utils/encryption";

export const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = () => {
    // Clear all authentication-related data
    secureStorage.removeItem("user");

    // Clear any other stored data
    document.cookie =
      "pending_otp_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie =
      "pending_otp_email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

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
