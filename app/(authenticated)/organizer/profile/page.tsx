"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { adminApi, organizerApi } from "@/app/utils/api";
import { endpoints } from "@/app/config/api";
import ProfilePictureModal from "@/components/ProfilePictureModal";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Loader2, Save } from "lucide-react";

interface OrganizerProfile {
  user_id: number;
  user_firstName: string | null;
  user_lastName: string | null;
  user_email: string | null;
  user_contact: string | null;
  user_pfp: string | null;
  created_at?: string | null;
}

interface OrganizerExtendedProfile {
  organizer_id: number;
  organizer_experience?: string | null;
  organizer_certifications?: string | null;
  organizer_portfolio_link?: string | null;
  organizer_availability?: string | null;
  remarks?: string | null;
  talent_fee_min?: number | null;
  talent_fee_max?: number | null;
  talent_fee_currency?: string | null;
  talent_fee_notes?: string | null;
  organizer_resume_path?: string | null;
  user_birthdate?: string | null;
  organizer_address?: string | null; // not in API; we map to experience summary if needed
}

export default function OrganizerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);
  const [organizerId, setOrganizerId] = useState<number | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contact: "",
    birthdate: "",
    bio: "",
    yearsOfExperience: "",
    portfolioLink: "",
    certifications: "",
    address: "",
    talentFeeMin: "",
    talentFeeMax: "",
    talentFeeCurrency: "PHP",
    talentFeeNotes: "",
    remarks: "",
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      // Try organizer-specific profile first
      const orgRes = await organizerApi.get({
        operation: "getOrganizerProfile",
        user_id: userId,
      });
      if (orgRes.status === "success" && (orgRes.data as any)) {
        const data = orgRes.data as unknown as OrganizerExtendedProfile & {
          organizer_email?: string | null;
          organizer_phone?: string | null;
          organizer_name?: string | null;
        };
        setOrganizerId(Number(data.organizer_id));
        const name = (data as any).organizer_name || "";
        const parts = String(name).trim().split(/\s+/);
        const first = parts[0] || "";
        const last = parts.length > 1 ? parts.slice(1).join(" ") : "";

        setForm((prev) => ({
          ...prev,
          firstName: first,
          lastName: last,
          email: (data as any).organizer_email || "",
          contact: (data as any).organizer_phone || "",
          birthdate: "",
          bio: data.organizer_experience || "",
          yearsOfExperience: "",
          portfolioLink: data.organizer_portfolio_link || "",
          certifications: data.organizer_certifications || "",
          address: "",
          talentFeeMin:
            data.talent_fee_min != null ? String(data.talent_fee_min) : "",
          talentFeeMax:
            data.talent_fee_max != null ? String(data.talent_fee_max) : "",
          talentFeeCurrency: data.talent_fee_currency || "PHP",
          talentFeeNotes: data.talent_fee_notes || "",
          remarks: data.remarks || "",
        }));

        // Populate generic profile for header/avatar rendering
        setProfile({
          user_id: Number((data as any).user_id) || userId,
          user_firstName: first,
          user_lastName: last,
          user_email: (data as any).organizer_email || "",
          user_contact: (data as any).organizer_phone || "",
          user_pfp: (data as any).profile_picture || null,
          created_at: (data as any).created_at || null,
        });
      } else {
        // Fallback to generic user profile
        const res = await adminApi.get({
          operation: "getUserProfile",
          user_id: userId,
        });
        if ((res as any)?.status === "success") {
          const prof = (res as any).profile;
          setProfile(prof as OrganizerProfile);
          setForm((prev) => ({
            ...prev,
            firstName: prof.user_firstName || "",
            lastName: prof.user_lastName || "",
            email: prof.user_email || "",
            contact: prof.user_contact || "",
          }));
        }
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

  const handleSave = async () => {
    try {
      if (!organizerId) {
        toast({
          title: "Error",
          description: "Organizer not found.",
          variant: "destructive",
        });
        return;
      }
      // Basic validations
      if (!form.firstName.trim() || !form.lastName.trim()) {
        toast({
          title: "Required",
          description: "First and last name are required.",
        });
        return;
      }
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email.",
          variant: "destructive",
        });
        return;
      }
      if (
        form.talentFeeMin &&
        form.talentFeeMax &&
        Number(form.talentFeeMin) > Number(form.talentFeeMax)
      ) {
        toast({
          title: "Invalid Fees",
          description: "Min fee cannot exceed max fee.",
          variant: "destructive",
        });
        return;
      }

      setIsSaving(true);
      const fd = new FormData();
      fd.append("operation", "updateOrganizer");
      fd.append("organizer_id", String(organizerId));
      if (form.firstName) fd.append("first_name", form.firstName);
      if (form.lastName) fd.append("last_name", form.lastName);
      if (form.email) fd.append("email", form.email);
      if (form.contact) fd.append("contact_number", form.contact);
      if (form.birthdate) fd.append("birthdate", form.birthdate);
      if (form.bio || form.yearsOfExperience || form.address) {
        const summaryParts = [] as string[];
        if (form.bio) summaryParts.push(form.bio);
        if (form.yearsOfExperience)
          summaryParts.push(`Years of Experience: ${form.yearsOfExperience}`);
        if (form.address) summaryParts.push(`Address: ${form.address}`);
        fd.append("experience_summary", summaryParts.join("\n"));
      }
      if (form.certifications) fd.append("certifications", form.certifications);
      if (form.portfolioLink) fd.append("portfolio_link", form.portfolioLink);
      if (form.talentFeeMin !== "")
        fd.append("talent_fee_min", form.talentFeeMin);
      if (form.talentFeeMax !== "")
        fd.append("talent_fee_max", form.talentFeeMax);
      if (form.talentFeeCurrency)
        fd.append("talent_fee_currency", form.talentFeeCurrency);
      if (form.talentFeeNotes)
        fd.append("talent_fee_notes", form.talentFeeNotes);
      if (form.remarks) fd.append("remarks", form.remarks);
      if (resumeFile) fd.append("resume", resumeFile);

      const res = await axios.post(endpoints.admin, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        validateStatus: () => true,
      });

      const data =
        typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      if (data?.status === "success") {
        toast({ title: "Saved", description: "Profile updated successfully." });
        // Reload
        const user = secureStorage.getItem("user");
        if (user?.user_id) await fetchOrganizerProfile(user.user_id);
        setResumeFile(null);
      } else {
        throw new Error(data?.message || "Update failed");
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to save.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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
      ? `${endpoints.serveImage}?path=${encodeURIComponent(profile.user_pfp)}`
      : "/default_pfp.png";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
                {form.firstName || ""} {form.lastName || ""}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                placeholder="First Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Last Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Mobile Number *</Label>
              <Input
                id="contact"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="Mobile Number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthdate">Date of Birth</Label>
              <Input
                id="birthdate"
                type="date"
                value={form.birthdate}
                onChange={(e) =>
                  setForm({ ...form, birthdate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                min="0"
                value={form.yearsOfExperience}
                onChange={(e) =>
                  setForm({ ...form, yearsOfExperience: e.target.value })
                }
                placeholder="e.g., 5"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell us about yourself"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="portfolioLink">Portfolio Link (Optional)</Label>
              <Input
                id="portfolioLink"
                value={form.portfolioLink}
                onChange={(e) =>
                  setForm({ ...form, portfolioLink: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="certifications">Certifications</Label>
              <Textarea
                id="certifications"
                rows={2}
                value={form.certifications}
                onChange={(e) =>
                  setForm({ ...form, certifications: e.target.value })
                }
                placeholder="List your certifications"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Your address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="talentFeeMin">Talent Fee Min</Label>
              <Input
                id="talentFeeMin"
                type="number"
                min="0"
                value={form.talentFeeMin}
                onChange={(e) =>
                  setForm({ ...form, talentFeeMin: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="talentFeeMax">Talent Fee Max</Label>
              <Input
                id="talentFeeMax"
                type="number"
                min="0"
                value={form.talentFeeMax}
                onChange={(e) =>
                  setForm({ ...form, talentFeeMax: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.talentFeeCurrency}
                onValueChange={(v) =>
                  setForm({ ...form, talentFeeCurrency: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHP">PHP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="talentFeeNotes">Talent Fee Notes</Label>
              <Textarea
                id="talentFeeNotes"
                rows={2}
                value={form.talentFeeNotes}
                onChange={(e) =>
                  setForm({ ...form, talentFeeNotes: e.target.value })
                }
                placeholder="Any fee-related notes"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="resume">Resume</Label>
              <Input
                id="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="remarks">Admin Remarks</Label>
              <Textarea
                id="remarks"
                rows={2}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Internal remarks (if applicable)"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
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
