"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Lock,
  Bell,
  User,
  Loader2,
  Camera,
  Save,
  Eye,
  EyeOff,
  Shield,
  Settings,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import ProfilePictureModal from "@/components/ProfilePictureModal";

interface UserProfile {
  user_id: number;
  user_firstName: string | null;
  user_lastName: string | null;
  user_email: string | null;
  user_contact: string | null;
  user_pfp: string | null;
  created_at: string;
}

interface OrganizerProfileData {
  organizer_id: number;
  organizer_name: string;
  organizer_email: string;
  organizer_phone: string;
  organizer_experience?: string | null;
  organizer_certifications?: string | null;
  organizer_availability?: string | null;
  organizer_portfolio_link?: string | null;
  remarks?: string | null;
  profile_picture?: string | null;
  user_id: number;
}

export default function OrganizerSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contact: "",
  });

  const [organizerProfile, setOrganizerProfile] =
    useState<OrganizerProfileData | null>(null);

  const [organizerForm, setOrganizerForm] = useState({
    experience: "",
    certifications: "",
    availability: "",
    portfolioLink: "",
    remarks: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Global website OTP setting (read-only here)
  const [requireOtpOnLogin, setRequireOtpOnLogin] = useState<number | null>(
    null
  );

  // Organizer local notification prefs
  const [notificationSettings, setNotificationSettings] = useState({
    assignmentUpdates: true,
    upcomingEventReminders: true,
    paymentUpdates: false,
    newMessageAlerts: true,
    emailNotifications: true,
    smsNotifications: false,
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    sessionTimeout: 30,
    passwordExpiry: 90,
  });

  // Organizer personal OTP preference (frontend-only)
  const [personalOtpRequired, setPersonalOtpRequired] =
    useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        protectRoute();
        const userData = secureStorage.getItem("user");
        if (
          !userData ||
          !userData.user_role ||
          (userData.user_role.toLowerCase() !== "organizer" &&
            userData.user_role.toLowerCase() !== "vendor")
        ) {
          console.log("Invalid or missing user data, redirecting to login");
          router.replace("/auth/login");
          return;
        }

        // Load settings
        loadLocalNotifications();
        // Set current user id for per-user preferences (like OTP)
        setCurrentUserId(Number(userData.user_id) || null);
        if (userData.user_id) {
          const raw = localStorage.getItem(
            `organizer_otp_preference_${userData.user_id}`
          );
          if (raw !== null) {
            setPersonalOtpRequired(
              raw === "1" || raw === "true" || raw === "TRUE"
            );
          }
        }

        await Promise.all([fetchUserProfile(), fetchWebsiteSettings()]);
        setIsLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        secureStorage.removeItem("user");
        router.replace("/auth/login");
      }
    };

    checkAuth();
  }, [router]);

  const loadLocalNotifications = () => {
    try {
      const stored = localStorage.getItem("organizer_notification_settings");
      if (stored) setNotificationSettings(JSON.parse(stored));
    } catch {}
  };

  const saveLocalNotifications = (settings: typeof notificationSettings) => {
    try {
      localStorage.setItem(
        "organizer_notification_settings",
        JSON.stringify(settings)
      );
      toast({
        title: "Saved",
        description: "Notification preferences updated.",
      });
    } catch {}
  };

  const fetchUserProfile = async () => {
    try {
      const current = secureStorage.getItem("user");
      if (!current?.user_id) return;

      // Try to get organizer-specific profile first
      try {
        const orgRes = await axios.get(endpoints.organizer, {
          params: {
            operation: "getOrganizerProfile",
            user_id: current.user_id,
          },
        });

        if (orgRes.data?.status === "success" && orgRes.data?.data) {
          const data = orgRes.data.data as OrganizerProfileData;
          setOrganizerProfile(data);

          // Derive first/last name from organizer_name when present
          let first = "";
          let last = "";
          if (data.organizer_name) {
            const parts = String(data.organizer_name).trim().split(/\s+/);
            first = parts[0] || "";
            last = parts.length > 1 ? parts.slice(1).join(" ") : "";
          }

          setProfileForm({
            firstName: first,
            lastName: last,
            email: data.organizer_email || "",
            contact: data.organizer_phone || "",
          });

          setOrganizerForm({
            experience: data.organizer_experience || "",
            certifications: data.organizer_certifications || "",
            availability: data.organizer_availability || "",
            portfolioLink: data.organizer_portfolio_link || "",
            remarks: data.remarks || "",
          });
          return;
        }
      } catch (orgError) {
        console.log(
          "Organizer profile not found, falling back to user profile"
        );
      }

      // Fallback to generic user profile
      const res = await axios.get(endpoints.admin, {
        params: { operation: "getUserProfile", user_id: current.user_id },
      });
      if (res.data?.status === "success") {
        const profile = res.data.profile as UserProfile;
        setUserProfile(profile);
        setProfileForm({
          firstName: profile.user_firstName || "",
          lastName: profile.user_lastName || "",
          email: profile.user_email || "",
          contact: profile.user_contact || "",
        });
      }
    } catch (e) {
      console.error("Failed to load profile:", e);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    }
  };

  const fetchWebsiteSettings = async () => {
    try {
      const res = await axios.get(endpoints.admin, {
        params: { operation: "getWebsiteSettings" },
      });
      if (res.data?.status === "success") {
        const v = res.data.settings?.require_otp_on_login;
        setRequireOtpOnLogin(typeof v === "undefined" ? 1 : Number(v));
      }
    } catch (error) {
      console.error("Failed to load website settings:", error);
    }
  };

  const handleProfileSave = async () => {
    try {
      setIsSaving(true);
      const current = secureStorage.getItem("user");
      if (!current?.user_id) return;

      const res = await axios.post(endpoints.admin, {
        operation: "updateUserProfile",
        user_id: current.user_id,
        ...profileForm,
      });
      if (res.data?.status === "success") {
        toast({ title: "Saved", description: "Profile updated successfully." });
        await fetchUserProfile();
      } else {
        throw new Error(res.data?.message || "Update failed");
      }
    } catch (e: any) {
      console.error("Profile update failed:", e);
      toast({
        title: "Error",
        description:
          e.response?.data?.message || e.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
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

    try {
      setIsSaving(true);
      const current = secureStorage.getItem("user");
      if (!current?.user_id) return;

      const res = await axios.post(endpoints.admin, {
        operation: "changePassword",
        user_id: current.user_id,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      if (res.data?.status === "success") {
        toast({
          title: "Success",
          description: "Password changed successfully.",
        });
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        throw new Error(res.data?.message || "Failed to change password");
      }
    } catch (e: any) {
      console.error("Password change failed:", e);
      toast({
        title: "Error",
        description:
          e.response?.data?.message || e.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePictureUpload = async (filePath: string) => {
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
      await fetchUserProfile();
    } catch (error: any) {
      console.error("Profile picture update failed:", error);
      toast({
        title: "Error",
        description: "Failed to update profile picture",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Settings</h1>
        <div className="text-sm text-gray-500">
          Manage your organizer account and preferences
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Profile Information
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
                        ? `${endpoints.serveImage}?path=${encodeURIComponent(userProfile.user_pfp)}`
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
                  <p className="text-gray-500">Event Organizer</p>
                  <p className="text-sm text-gray-400">
                    Member since{" "}
                    {userProfile?.created_at
                      ? new Date(userProfile.created_at).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>
              </div>

              {/* Basic Profile Form */}
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
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="contact"
                      className="pl-10"
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
              </div>

              <Button
                onClick={handleProfileSave}
                disabled={isSaving}
                className="w-full md:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Organizer-Specific Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Organizer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience</Label>
                  <Textarea
                    id="experience"
                    value={organizerForm.experience}
                    onChange={(e) =>
                      setOrganizerForm({
                        ...organizerForm,
                        experience: e.target.value,
                      })
                    }
                    placeholder="Describe your event planning experience..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certifications">Certifications</Label>
                  <Textarea
                    id="certifications"
                    value={organizerForm.certifications}
                    onChange={(e) =>
                      setOrganizerForm({
                        ...organizerForm,
                        certifications: e.target.value,
                      })
                    }
                    placeholder="List your relevant certifications..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Input
                    id="availability"
                    value={organizerForm.availability}
                    onChange={(e) =>
                      setOrganizerForm({
                        ...organizerForm,
                        availability: e.target.value,
                      })
                    }
                    placeholder="e.g., Weekends, Evenings, Flexible"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolioLink">Portfolio Link</Label>
                  <Input
                    id="portfolioLink"
                    value={organizerForm.portfolioLink}
                    onChange={(e) =>
                      setOrganizerForm({
                        ...organizerForm,
                        portfolioLink: e.target.value,
                      })
                    }
                    placeholder="https://your-portfolio.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks">Additional Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={organizerForm.remarks}
                    onChange={(e) =>
                      setOrganizerForm({
                        ...organizerForm,
                        remarks: e.target.value,
                      })
                    }
                    placeholder="Any additional information you'd like to share..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" /> Change Password
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
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
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
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
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
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={isSaving}
                className="w-full md:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* OTP Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Two-Factor Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">OTP on Login (Personal)</h4>
                  <p className="text-sm text-gray-500">
                    Require OTP verification when logging in (overrides global
                    setting)
                  </p>
                </div>
                <Switch
                  checked={personalOtpRequired}
                  onCheckedChange={(checked: boolean) => {
                    setPersonalOtpRequired(checked);
                    if (currentUserId) {
                      localStorage.setItem(
                        `organizer_otp_preference_${currentUserId}`,
                        checked ? "1" : "0"
                      );
                    }
                    toast({
                      title: "Saved",
                      description: "OTP preference updated.",
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Login Alerts</h4>
                  <p className="text-sm text-gray-500">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" /> Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        emailNotifications: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">SMS Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive notifications via SMS
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        smsNotifications: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Assignment Updates</Label>
                    <p className="text-sm text-gray-500">
                      Notify me when I'm assigned or unassigned to events
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.assignmentUpdates}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        assignmentUpdates: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">
                      Upcoming Event Reminders
                    </Label>
                    <p className="text-sm text-gray-500">
                      Remind me of events I'm assigned to
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.upcomingEventReminders}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        upcomingEventReminders: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Payment Updates</Label>
                    <p className="text-sm text-gray-500">
                      Notify me of component payment status changes
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.paymentUpdates}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        paymentUpdates: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">New Message Alerts</Label>
                    <p className="text-sm text-gray-500">
                      Notify me when I receive new messages
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.newMessageAlerts}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        newMessageAlerts: checked,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="pt-2">
                <Button
                  onClick={() => saveLocalNotifications(notificationSettings)}
                  className="w-full md:w-auto"
                >
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> Account Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">
                      Two-Factor Authentication
                    </Label>
                    <p className="text-sm text-gray-500">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked: boolean) =>
                      setSecuritySettings({
                        ...securitySettings,
                        twoFactorAuth: checked,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">
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
                    className="w-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                  <Input
                    id="passwordExpiry"
                    type="number"
                    value={securitySettings.passwordExpiry}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        passwordExpiry: parseInt(e.target.value) || 90,
                      })
                    }
                    min="30"
                    max="365"
                    className="w-32"
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
        uploadEndpoint={endpoints.admin}
        userId={userProfile?.user_id || 0}
      />
    </div>
  );
}
