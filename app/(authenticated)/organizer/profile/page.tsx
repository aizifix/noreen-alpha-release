"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { adminApi } from "@/app/utils/api";
import ProfilePictureModal from "@/components/ProfilePictureModal";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";

interface OrganizerProfile {
  user_id: number;
  user_firstName: string | null;
  user_lastName: string | null;
  user_email: string | null;
  user_contact: string | null;
  user_pfp: string | null;
  created_at?: string | null;
}

export default function OrganizerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);

  useEffect(() => {
    try {
      protectRoute();
      const userData = secureStorage.getItem("user");
      if (
        !userData ||
        (userData.user_role || "").toLowerCase() !== "organizer"
      ) {
        router.push("/auth/login");
        return;
      }
      fetchOrganizerProfile(userData.user_id);
    } catch (_e) {
      router.push("/auth/login");
    }
  }, [router]);

  const fetchOrganizerProfile = async (userId: number) => {
    try {
      setLoading(true);
      // Reuse admin getUserProfile to retrieve user info for organizer
      const res = await adminApi.get({
        params: { operation: "getUserProfile", user_id: userId },
      });
      if (res.data?.status === "success") {
        setProfile(res.data.profile as OrganizerProfile);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = (filePath: string) => {
    setProfile((prev) => (prev ? { ...prev, user_pfp: filePath } : prev));
    // Safely update secure storage so navbar reflects new pfp
    try {
      const currentUser = secureStorage.getItem("user");
      if (currentUser && typeof currentUser === "object") {
        const updatedUser = { ...currentUser, user_pfp: filePath };
        secureStorage.setItem("user", updatedUser);
        window.dispatchEvent(new CustomEvent("userDataChanged"));
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#028A75]" />
      </div>
    );
  }

  const imageSrc =
    profile?.user_pfp && profile.user_pfp.trim() !== ""
      ? `http://localhost/events-api/serve-image.php?path=${encodeURIComponent(profile.user_pfp)}`
      : "/default_pfp.png";

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={imageSrc}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover border-4 border-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowProfilePictureModal(true)}
                className="absolute bottom-0 right-0 bg-[#028A75] text-white p-2 rounded-full hover:bg-[#027a65]"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {profile?.user_firstName || ""} {profile?.user_lastName || ""}
              </h3>
              <p className="text-sm text-gray-600">Organizer</p>
              {profile?.created_at && (
                <p className="text-xs text-gray-400">
                  Member since{" "}
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={() => router.back()} variant="outline">
              Back
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProfilePictureModal
        isOpen={showProfilePictureModal}
        onClose={() => setShowProfilePictureModal(false)}
        onUploadSuccess={handleProfilePictureUpload}
        uploadEndpoint={adminApi}
        userId={profile?.user_id || 0}
      />
    </div>
  );
}
