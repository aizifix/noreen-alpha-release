"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import {
  User,
  Lock,
  Palette,
  MessageSquare,
  Bell,
  Shield,
  Upload,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Star,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Camera,
  Loader2,
  Settings,
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

interface WebsiteSettings {
  company_name: string;
  company_logo: string;
  hero_image: string;
  primary_color: string;
  secondary_color: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  about_text: string;
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  require_otp_on_login: number;
}

interface Feedback {
  feedback_id: number;
  client_name: string;
  rating: number;
  feedback_text: string;
  created_at: string;
  event_title?: string;
  store_name?: string;
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

  // Website customization state
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>({
    company_name: "Event Coordination System",
    company_logo: "",
    hero_image: "",
    primary_color: "#16a34a",
    secondary_color: "#059669",
    contact_email: "",
    contact_phone: "",
    address: "",
    about_text: "",
    social_facebook: "",
    social_instagram: "",
    social_twitter: "",
    require_otp_on_login: 1,
  });

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState("all");

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    newBookings: true,
    paymentReminders: true,
    eventReminders: true,
    systemUpdates: false,
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    sessionTimeout: 30,
    passwordExpiry: 90,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = secureStorage.getItem("user");
        if (
          !userData ||
          !userData.user_role ||
          userData.user_role !== "Client"
        ) {
          console.log("Invalid or missing user data, redirecting to login");
          router.replace("/auth/login");
          return;
        }
        await loadUserProfile();
        await loadWebsiteSettings();
        await loadFeedbacks();
        setIsLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        // Clear potentially corrupted data
        secureStorage.removeItem("user");
        router.replace("/auth/login");
      }
    };

    checkAuth();
  }, [router]);

  const loadUserProfile = async () => {
    try {
      const userData = secureStorage.getItem("user");
      if (!userData || !userData.user_id) {
        console.error("Invalid user data for profile loading");
        return;
      }

      const response = await axios.get(
        `${endpoints.client}?operation=getUserProfile&user_id=${userData.user_id}`
      );
      if (response.data.status === "success") {
        const profile = response.data.profile;
        setUserProfile(profile);
        setProfileForm({
          firstName: profile.user_firstName || "",
          lastName: profile.user_lastName || "",
          email: profile.user_email || "",
          contact: profile.user_contact || "",
        });
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    }
  };

  const loadWebsiteSettings = async () => {
    try {
      const response = await axios.get(
        `${endpoints.client}?operation=getWebsiteSettings`
      );
      if (response.data.status === "success") {
        setWebsiteSettings(response.data.settings);
      }
    } catch (error) {
      console.error("Failed to load website settings:", error);
    }
  };

  const loadFeedbacks = async () => {
    try {
      const response = await axios.get(
        `${endpoints.admin}?operation=getFeedbacks`
      );
      if (response.data.status === "success") {
        setFeedbacks(response.data.feedbacks);
      }
    } catch (error) {
      console.error("Failed to load feedbacks:", error);
    }
  };

  const handleProfileUpdate = async () => {
    if (!userProfile) return;

    setIsSaving(true);
    try {
      const response = await axios.post(`${endpoints.client}`, {
        operation: "updateUserProfile",
        user_id: userProfile.user_id,
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        email: profileForm.email,
        contact: profileForm.contact,
      });

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        await loadUserProfile();
      } else {
        throw new Error(response.data.message || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Profile update failed:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!userProfile) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.post(`${endpoints.client}`, {
        operation: "changePassword",
        user_id: userProfile.user_id,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

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
        throw new Error(response.data.message || "Failed to change password");
      }
    } catch (error: any) {
      console.error("Password change failed:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePictureUpload = async (filePath: string) => {
    if (!userProfile) return;

    try {
      // Update the user profile state immediately for real-time update
      setUserProfile((prev) => (prev ? { ...prev, user_pfp: filePath } : null));

      // Update user data in storage for persistence
      const userData = secureStorage.getItem("user");
      if (userData && userData.user_id) {
        userData.user_pfp = filePath;
        secureStorage.setItem("user", userData);

        // Trigger user data change event for other components
        window.dispatchEvent(
          new CustomEvent("userDataChanged", {
            detail: { user_pfp: filePath },
          })
        );
      }

      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });

      // Reload user profile to ensure data consistency
      await loadUserProfile();
    } catch (error: any) {
      console.error("Profile picture update failed:", error);
      toast({
        title: "Error",
        description: "Failed to update profile picture",
        variant: "destructive",
      });
    }
  };

  const handleOTPToggle = async (enabled: boolean) => {
    try {
      const response = await axios.post(`${endpoints.client}`, {
        operation: "updateWebsiteSettings",
        settings: {
          ...websiteSettings,
          require_otp_on_login: enabled ? 1 : 0,
        },
      });

      if (response.data.status === "success") {
        setWebsiteSettings((prev) => ({
          ...prev,
          require_otp_on_login: enabled ? 1 : 0,
        }));
        toast({
          title: "Success",
          description: `OTP requirement ${enabled ? "enabled" : "disabled"} successfully`,
        });
      } else {
        throw new Error(
          response.data.message || "Failed to update OTP setting"
        );
      }
    } catch (error: any) {
      console.error("OTP toggle failed:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update OTP setting",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Settings
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
          <TabsTrigger value="profile" className="text-xs md:text-sm">
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs md:text-sm">
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs md:text-sm">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs md:text-sm">
            Preferences
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
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="relative">
                  <img
                    src={
                      userProfile?.user_pfp &&
                      userProfile.user_pfp.trim() !== "" &&
                      !userProfile.user_pfp.includes("default_pfp.png")
                        ? `${endpoints.serveImage}?path=${encodeURIComponent(userProfile.user_pfp)}`
                        : "/default_pfp.png"
                    }
                    alt="Profile"
                    className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-4 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfilePictureModal(true)}
                    className="absolute bottom-0 right-0 bg-green-600 text-white p-1.5 sm:p-2 rounded-full cursor-pointer hover:bg-green-700 transition-colors"
                  >
                    <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-base sm:text-lg font-medium">
                    {userProfile?.user_firstName || ""}{" "}
                    {userProfile?.user_lastName || ""}
                  </h3>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="text-xs sm:text-sm text-gray-400">
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
                  <Label htmlFor="email">Email</Label>
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
                  <Label htmlFor="contact">Contact Number</Label>
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

              <Button
                onClick={handleProfileUpdate}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
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
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
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
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
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
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handlePasswordChange}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* OTP Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">OTP on Login</h4>
                  <p className="text-sm text-gray-500">
                    Require OTP verification when logging in
                  </p>
                </div>
                <Switch
                  checked={websiteSettings.require_otp_on_login === 1}
                  onCheckedChange={handleOTPToggle}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Bell className="h-4 w-4 md:h-5 md:w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <h4 className="font-medium text-sm md:text-base">
                      Email Notifications
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        emailNotifications: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <h4 className="font-medium text-sm md:text-base">
                      SMS Notifications
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500">
                      Receive notifications via SMS
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        smsNotifications: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <h4 className="font-medium text-sm md:text-base">
                      New Bookings
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500">
                      Get notified about new bookings
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.newBookings}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        newBookings: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <h4 className="font-medium text-sm md:text-base">
                      Payment Reminders
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500">
                      Get notified about payment due dates
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.paymentReminders}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        paymentReminders: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <h4 className="font-medium text-sm md:text-base">
                      Event Reminders
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500">
                      Get notified about upcoming events
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.eventReminders}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        eventReminders: checked,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
                Account Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 pr-4">
                    <h4 className="font-medium text-sm md:text-base">
                      Login Alerts
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500">
                      Get notified when someone logs into your account
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.loginAlerts}
                    onCheckedChange={(checked: boolean) =>
                      setSecuritySettings({
                        ...securitySettings,
                        loginAlerts: checked,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="sessionTimeout"
                    className="text-sm md:text-base"
                  >
                    Session Timeout (minutes)
                  </Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        sessionTimeout: parseInt(e.target.value) || 30,
                      })
                    }
                    min="5"
                    max="480"
                    className="w-full"
                  />
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
        uploadEndpoint={endpoints.client}
        userId={userProfile?.user_id || 0}
      />
    </div>
  );
}
