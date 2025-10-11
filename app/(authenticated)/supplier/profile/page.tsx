"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  FileText,
  Save,
  Edit,
  Camera,
  Star,
  Calendar,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

interface SupplierProfile {
  supplier_id: number;
  user_id?: number;
  supplier_type: "internal" | "external";
  business_name: string;
  contact_number: string;
  contact_email?: string;
  contact_person?: string;
  business_address?: string;
  business_description?: string;
  specialty_category?: string;
  rating_average: number;
  total_ratings: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // User details for internal suppliers
  user_firstName?: string;
  user_lastName?: string;
  user_email?: string;
}

interface ProfileStats {
  total_offers: number;
  total_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  avg_rating: number;
  total_ratings: number;
  join_date: string;
  last_active: string;
}

const specialtyCategories = [
  "Catering",
  "Photography",
  "Videography",
  "Decorations",
  "Entertainment",
  "Venue",
  "Transportation",
  "Flowers",
  "Audio/Visual",
  "Security",
  "Other",
];

export default function SupplierProfile() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<SupplierProfile>>({});
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const userId = 1; // This should come from authentication

      const response = await axios.get(
        `${endpoints.supplier}?operation=getDashboard&user_id=${userId}`
      );
      const data = response.data;

      if (data.status === "success") {
        setProfile(data.profile);
        setFormData(data.profile);
      } else {
        console.error("Failed to fetch profile:", data.message);
        // Set mock data for demonstration
        setProfile(getMockProfile());
        setFormData(getMockProfile());
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Set mock data for demonstration
      setProfile(getMockProfile());
      setFormData(getMockProfile());
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const userId = 1; // This should come from authentication

      const response = await axios.get(
        `${endpoints.supplier}?operation=getAnalytics&user_id=${userId}`
      );
      const data = response.data;

      if (data.status === "success") {
        setStats(data.stats);
      } else {
        console.error("Failed to fetch stats:", data.message);
        // Set mock data for demonstration
        setStats(getMockStats());
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Set mock data for demonstration
      setStats(getMockStats());
    }
  };

  const getMockProfile = (): SupplierProfile => ({
    supplier_id: 1,
    user_id: 1,
    supplier_type: "internal",
    business_name: "Elegant Events Catering",
    contact_number: "+63 917 123 4567",
    contact_email: "info@elegantevents.com",
    contact_person: "Maria Santos",
    business_address: "123 Quezon Ave, Quezon City, Metro Manila, Philippines",
    business_description:
      "Premium catering service specializing in weddings, corporate events, and special occasions. We provide high-quality food and exceptional service for memorable events.",
    specialty_category: "Catering",
    rating_average: 4.7,
    total_ratings: 42,
    is_verified: true,
    is_active: true,
    created_at: "2023-06-15T08:30:00Z",
    updated_at: "2024-01-15T14:20:00Z",
    user_firstName: "Maria",
    user_lastName: "Santos",
    user_email: "maria@elegantevents.com",
  });

  const getMockStats = (): ProfileStats => ({
    total_offers: 8,
    total_bookings: 48,
    completed_bookings: 42,
    pending_bookings: 6,
    avg_rating: 4.7,
    total_ratings: 42,
    join_date: "2023-06-15T08:30:00Z",
    last_active: "2024-01-15T14:20:00Z",
  });

  const handleInputChange = (field: keyof SupplierProfile, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      const userId = 1; // This should come from authentication

      const response = await axios.post(
        endpoints.supplier,
        { operation: "updateProfile", user_id: userId, ...formData },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = response.data;

      if (data.status === "success") {
        setProfile({ ...profile, ...formData });
        setEditing(false);
      } else {
        console.error("Failed to update profile:", data.message);
        toast.error("Failed to update profile: " + data.message);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile || {});
    setEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderStarsRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Profile Not Found
          </h3>
          <p className="text-gray-600">Unable to load profile information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Profile Settings
            </h1>
            <p className="text-gray-600">
              Manage your business information and settings
            </p>
          </div>
          <div className="flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center">
                <Building2 className="h-12 w-12 text-brand-600" />
              </div>
              {editing && (
                <button className="absolute -bottom-2 -right-2 p-2 bg-brand-600 text-white rounded-full hover:bg-brand-700 transition-colors">
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-3 text-center">
              <div className="flex items-center gap-2 justify-center">
                {profile.is_verified ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    profile.is_verified ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {profile.is_verified ? "Verified" : "Pending Verification"}
                </span>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {profile.business_name}
              </h2>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  profile.supplier_type === "internal"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {profile.supplier_type === "internal" ? "Internal" : "External"}{" "}
                Supplier
              </span>
            </div>

            {profile.specialty_category && (
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  {profile.specialty_category}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700">{profile.contact_number}</span>
            </div>

            {profile.contact_email && (
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{profile.contact_email}</span>
              </div>
            )}

            {profile.business_address && (
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  {profile.business_address}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4">
              {renderStarsRating(profile.rating_average)}
              <span className="text-sm text-gray-500">
                ({profile.total_ratings} reviews)
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="flex flex-col gap-4 md:w-64">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-900">
                    {stats.total_offers}
                  </div>
                  <div className="text-sm text-gray-600">Offers</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-900">
                    {stats.total_bookings}
                  </div>
                  <div className="text-sm text-gray-600">Bookings</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {stats.completed_bookings}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">
                    {stats.pending_bookings}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "general", label: "General Information", icon: User },
              { id: "business", label: "Business Details", icon: Building2 },
              { id: "contact", label: "Contact Information", icon: Phone },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                General Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      value={formData.business_name || ""}
                      onChange={(e) =>
                        handleInputChange("business_name", e.target.value)
                      }
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                      {profile.business_name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialty Category
                  </label>
                  {editing ? (
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      value={formData.specialty_category || ""}
                      onChange={(e) =>
                        handleInputChange("specialty_category", e.target.value)
                      }
                    >
                      <option value="">Select category</option>
                      {specialtyCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                      {profile.specialty_category || "Not specified"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      value={formData.contact_person || ""}
                      onChange={(e) =>
                        handleInputChange("contact_person", e.target.value)
                      }
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                      {profile.contact_person || "Not specified"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier Type
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {profile.supplier_type === "internal"
                      ? "Internal Supplier"
                      : "External Supplier"}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Description
              </label>
              {editing ? (
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  rows={4}
                  value={formData.business_description || ""}
                  onChange={(e) =>
                    handleInputChange("business_description", e.target.value)
                  }
                  placeholder="Describe your business and services..."
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900 min-h-[100px]">
                  {profile.business_description || "No description provided"}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "business" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Business Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Date
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(profile.created_at)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Status
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900 flex items-center gap-2">
                    {profile.is_verified ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">Verified</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span className="text-yellow-600">
                          Pending Verification
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Average Rating
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {renderStarsRating(profile.rating_average)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Reviews
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {profile.total_ratings} reviews
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Address
              </label>
              {editing ? (
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  rows={3}
                  value={formData.business_address || ""}
                  onChange={(e) =>
                    handleInputChange("business_address", e.target.value)
                  }
                  placeholder="Enter complete business address..."
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900 min-h-[80px]">
                  {profile.business_address || "No address provided"}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "contact" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number *
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      value={formData.contact_number || ""}
                      onChange={(e) =>
                        handleInputChange("contact_number", e.target.value)
                      }
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                      {profile.contact_number}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email
                  </label>
                  {editing ? (
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      value={formData.contact_email || ""}
                      onChange={(e) =>
                        handleInputChange("contact_email", e.target.value)
                      }
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                      {profile.contact_email || "Not provided"}
                    </div>
                  )}
                </div>

                {profile.supplier_type === "internal" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        User Account Email
                      </label>
                      <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                        {profile.user_email || "Not linked"}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        User Name
                      </label>
                      <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                        {profile.user_firstName && profile.user_lastName
                          ? `${profile.user_firstName} ${profile.user_lastName}`
                          : "Not linked"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {!profile.is_verified && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Verification Pending</p>
                    <p>
                      Your profile is currently under review. Once verified,
                      you'll have access to all supplier features. Please ensure
                      all your contact information is accurate and up-to-date.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
