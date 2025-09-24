"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { secureStorage } from "@/app/utils/encryption";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Lock, Bell, User, Loader2 } from "lucide-react";

interface UserProfile {
  user_id: number;
  user_firstName: string | null;
  user_lastName: string | null;
  user_email: string | null;
  user_contact: string | null;
}

interface OrganizerProfileData {
  organizer_name: string;
  organizer_email: string;
  organizer_phone: string;
  organizer_experience?: string | null;
  organizer_certifications?: string | null;
  organizer_availability?: string | null;
  organizer_portfolio_link?: string | null;
  remarks?: string | null;
  profile_picture?: string | null;
}

export default function OrganizerSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contact: "",
  });

  const [organizerProfile, setOrganizerProfile] =
    useState<OrganizerProfileData | null>(null);

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
  });

  // Organizer personal OTP preference (frontend-only)
  const [personalOtpRequired, setPersonalOtpRequired] =
    useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const user = secureStorage.getItem("user");
      if (!user?.user_role) {
        router.replace("/auth/login");
        return;
      }
      const role = String(user.user_role).toLowerCase();
      if (role !== "organizer" && role !== "vendor") {
        // Not an organizer; send to their own dashboard
        if (role === "admin") router.replace("/admin/dashboard");
        else router.replace("/client/dashboard");
        return;
      }

      // Load settings
      loadLocalNotifications();
      // Set current user id for per-user preferences (like OTP)
      try {
        setCurrentUserId(Number(user.user_id) || null);
        if (user.user_id) {
          const raw = localStorage.getItem(
            `organizer_otp_preference_${user.user_id}`
          );
          if (raw !== null) {
            setPersonalOtpRequired(
              raw === "1" || raw === "true" || raw === "TRUE"
            );
          }
        }
      } catch {}

      void Promise.all([fetchUserProfile(), fetchWebsiteSettings()]).finally(
        () => setIsLoading(false)
      );
    } catch {
      router.replace("/auth/login");
    }
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

      // Prefer organizer-specific profile to populate richer details
      const orgRes = await axios.get(
        "http://localhost/events-api/organizer.php",
        {
          params: {
            operation: "getOrganizerProfile",
            user_id: current?.user_id,
          },
        }
      );

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
        return;
      }

      // Fallback to generic user profile
      const res = await axios.get("http://localhost/events-api/admin.php", {
        params: { operation: "getUserProfile", user_id: current?.user_id },
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
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    }
  };

  const fetchWebsiteSettings = async () => {
    try {
      const res = await axios.get("http://localhost/events-api/admin.php", {
        params: { operation: "getWebsiteSettings" },
      });
      if (res.data?.status === "success") {
        const v = res.data.settings?.require_otp_on_login;
        setRequireOtpOnLogin(typeof v === "undefined" ? 1 : Number(v));
      }
    } catch {}
  };

  const handleProfileSave = async () => {
    try {
      setIsSaving(true);
      const current = secureStorage.getItem("user");
      const res = await axios.post("http://localhost/events-api/admin.php", {
        operation: "updateUserProfile",
        user_id: current?.user_id,
        ...profileForm,
      });
      if (res.data?.status === "success") {
        toast({ title: "Saved", description: "Profile updated successfully." });
        await fetchUserProfile();
      } else {
        throw new Error(res.data?.message || "Update failed");
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to update profile",
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
    try {
      setIsSaving(true);
      const current = secureStorage.getItem("user");
      const res = await axios.post("http://localhost/events-api/admin.php", {
        operation: "changePassword",
        user_id: current?.user_id,
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
      toast({
        title: "Error",
        description: e.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Settings</h1>
        <div className="text-sm text-gray-500">
          Manage your organizer preferences
        </div>
      </div>

      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
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
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">
                    Require OTP on Login (Personal)
                  </Label>
                  <p className="text-sm text-gray-500">
                    When on, you will be asked for OTP during login even if the
                    global setting is off.
                  </p>
                </div>
                <Switch
                  checked={personalOtpRequired}
                  onCheckedChange={(checked) => {
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact</Label>
                  <Input
                    id="contact"
                    value={profileForm.contact}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        contact: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handleProfileSave}
                disabled={isSaving}
                className="w-full md:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={isSaving}
                className="w-full md:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Change Password
              </Button>
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Assignment Updates</Label>
                  <p className="text-sm text-gray-500">
                    Notify me when I'm assigned or unassigned to events.
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.assignmentUpdates}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      assignmentUpdates: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Upcoming Event Reminders</Label>
                  <p className="text-sm text-gray-500">
                    Remind me of events I'm assigned to.
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.upcomingEventReminders}
                  onCheckedChange={(checked) =>
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
                    Notify me of component payment status changes.
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.paymentUpdates}
                  onCheckedChange={(checked) =>
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
                    Notify me when I receive new messages.
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.newMessageAlerts}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      newMessageAlerts: checked,
                    }))
                  }
                />
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
      </Tabs>
    </div>
  );
}
