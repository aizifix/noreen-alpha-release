"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";

export default function DeletePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      // Protect route from unauthorized access and back navigation
      protectRoute();

      const userData = secureStorage.getItem("user");
      if (
        !userData ||
        !userData.user_role ||
        (userData.user_role.toLowerCase() !== "organizer" &&
          userData.user_role !== "Organizer")
      ) {
        console.log("Invalid user data in delete account:", userData);
        router.push("/auth/login");
        return;
      }
    } catch (error) {
      console.error("Error accessing user data:", error);
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Vendor Dashboard</h1>
      <p>Welcome to your vendor dashboard!</p>
      DELETE ACCOUNT PAGE
    </div>
  );
}
