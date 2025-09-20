"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { protectRoute } from "@/app/utils/routeProtection";

export default function OrganizerSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      protectRoute();
    } catch {}
    router.replace("/organizer/profile");
  }, [router]);
  return null;
}
