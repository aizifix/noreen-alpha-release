"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  User,
  Lock,
  Save,
  Eye,
  EyeOff,
  Calendar,
  Mail,
  Phone,
  Camera,
  Loader2,
} from "lucide-react";
import ProfilePictureModal from "@/components/ProfilePictureModal";
import { userDataHelper } from "@/app/utils/userDataHelper";

interface UserProfile {
  user_id: number;
  user_firstName: string | null;
  user_lastName: string | null;
  user_email: string | null;
  user_contact: string | null;
  user_pfp: string | null;
  created_at: string;
}

export default function ClientSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);

  // Profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contact: "",
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    console.log("Client Settings: Component mounting...");
    try {
      protectRoute();
      const userData = secureStorage.getItem("user");
      console.log("Client Settings: Retrieved user data:", userData);

      if (!userData) {
        console.log(
          "Client Settings: No user data found, redirecting to login"
        );
        router.push("/auth/login");
        return;
      }

      if (!userData.user_role) {
        console.log(
          "Client Settings: No user role found, redirecting to login"
        );
        router.push("/auth/login");
        return;
      }

      if (userData.user_role.toLowerCase() !== "client") {
        console.log(
          "Client Settings: Invalid user role:",
          userData.user_role,
          "redirecting to login"
        );
        router.push("/auth/login");
        return;
      }

      console.log(
        "Client Settings: Authentication successful, fetching profile"
      );
      fetchUserProfile();
    } catch (error) {
      console.error("Client Settings: Error accessing user data:", error);
      router.push("/auth/login");
    }
  }, [router]);

  const fetchUserProfile = async () => {
    try {
      console.log("Client Settings: Fetching user profile...");
      setIsLoading(true);
      const userData = secureStorage.getItem("user");

      console.log("Client Settings: UserData:", userData);

      if (!userData || !userData.user_id) {
        console.log(
          "Client Settings: Missing user data or user_id, redirecting to login"
        );
        router.push("/auth/login");
        return;
      }

      console.log("Client Settings: Making API call to fetch profile");
      const response = await axios.get(
        `http://localhost/events-api/client.php?operation=getUserProfile&user_id=${userData.user_id}`
      );

      console.log("Client Settings: API response:", response.data);

      if (response.data.status === "success") {
        const profile = response.data.profile;
        console.log("Client Settings: Profile data received:", profile);
        setUserProfile(profile);
        setProfileForm({
          firstName: profile.user_firstName || "",
          lastName: profile.user_lastName || "",
          email: profile.user_email || "",
          contact: profile.user_contact || "",
        });
        console.log("Client Settings: Profile state updated successfully");
      } else {
        console.log("Client Settings: API returned error:", response.data);
      }
    } catch (error) {
      console.error("Client Settings: Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      console.log("Client Settings: Setting loading to false");
      setIsLoading(false);
    }
  };

  // Function to safely update user data in secure storage after profile picture upload
  const updateUserDataSafely = async () => {
    try {
      const userData = secureStorage.getItem("user");

      if (!userData || !userData.user_id) return;

      const response = await axios.get(
        `http://localhost/events-api/client.php?operation=getUserProfile&user_id=${userData.user_id}`
      );

      if (response.data.status === "success") {
        const profile = response.data.profile;

        // Get current user data from secure storage
        const currentUser = secureStorage.getItem("user");
        if (currentUser && typeof currentUser === "object") {
          // Update only the profile picture field while preserving all other data
          const updatedUser = {
            ...currentUser,
            user_pfp: profile.user_pfp,
          };

          console.log(
            "Safely updating user data with new profile picture:",
            updatedUser
          );
          secureStorage.setItem("user", updatedUser);

          // Dispatch event to update navbar
          window.dispatchEvent(new CustomEvent("userDataChanged"));
        }
      }
    } catch (error) {
      console.error("Error updating user data safely:", error);
    }
  };

  const handleProfileUpdate = async () => {
    setIsSaving(true);
    try {
      const userData = secureStorage.getItem("user");

      const response = await axios.post(
        "http://localhost/events-api/client.php",
        {
          operation: "updateUserProfile",
          user_id: userData?.user_id,
          ...profileForm,
        }
      );

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const userData = secureStorage.getItem("user");

      const response = await axios.post(
        "http://localhost/events-api/client.php",
        {
          operation: "changePassword",
          user_id: userData?.user_id,
          ...passwordForm,
        }
      );

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: "Password changed successfully",
        });
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePictureUpload = (filePath: string) => {
    console.log("Profile picture uploaded successfully:", filePath);
    setUserProfile((prev) => (prev ? { ...prev, user_pfp: filePath } : null));

    // Use a safer approach: first refresh the profile data, then update secure storage
    setTimeout(async () => {
      await fetchUserProfile(); // Refresh the profile data first
      await updateUserDataSafely(); // Then safely update the secure storage for navbar
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Settings</h1>
        <div className="text-sm text-gray-500">
          Manage your account preferences
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <img
                    src={
                      userProfile?.user_pfp &&
                      userProfile.user_pfp.trim() !== ""
                        ? `http://localhost/events-api/serve-image.php?path=${encodeURIComponent(userProfile.user_pfp)}`
                        : "/default_pfp.png"
                    }
                    alt="Profile"
                    className="h-24 w-24 rounded-full object-cover border-4 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfilePictureModal(true)}
                    className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full cursor-pointer hover:bg-green-700 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-medium">
                    {userProfile?.user_firstName || ""}{" "}
                    {userProfile?.user_lastName || ""}
                  </h3>
                  <p className="text-gray-500">Client</p>
                  <p className="text-sm text-gray-400">
                    Member since{" "}
                    {userProfile?.created_at
                      ? new Date(userProfile.created_at).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>
              </div>

              {/* Profile Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        firstName: e.target.value,
                      })
                    }
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        lastName: e.target.value,
                      })
                    }
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="inline-block h-4 w-4 mr-1" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">
                    <Phone className="inline-block h-4 w-4 mr-1" />
                    Contact Number
                  </Label>
                  <Input
                    id="contact"
                    value={profileForm.contact}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        contact: e.target.value,
                      })
                    }
                    placeholder="Enter your contact number"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileUpdate} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={handlePasswordChange} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Profile Picture Modal */}
      <ProfilePictureModal
        isOpen={showProfilePictureModal}
        onClose={() => setShowProfilePictureModal(false)}
        onUploadSuccess={handleProfilePictureUpload}
        uploadEndpoint="http://localhost/events-api/client.php"
        userId={userProfile?.user_id || 0}
      />
    </div>
  );
}
