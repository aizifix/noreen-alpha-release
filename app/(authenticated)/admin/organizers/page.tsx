"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Upload,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  FileText,
  Image as ImageIcon,
  Camera,
  Check,
  Users,
  Calendar,
  Filter,
  MoreVertical,
  Star,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

// Types
interface Organizer {
  organizer_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  suffix?: string;
  birthdate: string;
  experience_summary: string;
  certifications: string;
  resume_path: string;
  portfolio_link: string;
  talent_fee_min?: number | null;
  talent_fee_max?: number | null;
  talent_fee_currency?: string;
  talent_fee_notes?: string | null;
  profile_picture: string;
  is_active: boolean;
  availability: string;
  remarks: string;
  created_at: string;
  username: string;
}

interface FilePreview {
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  uploading?: boolean;
  progress?: number;
  uploaded?: boolean;
  url?: string;
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  years_of_experience: number;
  portfolio_link: string;
  talent_fee_min?: number | null;
  talent_fee_max?: number | null;
  talent_fee_currency?: string;
  talent_fee_notes?: string;
  admin_remarks: string;
  username: string;
  password: string;
}

interface FilterState {
  search: string;
  status: string;
  experience_level: string;
}

import { API_URL } from "../../../config/api";

export default function OrganizersPage() {
  // State management
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(
    null
  );
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOrganizerDetails, setShowOrganizerDetails] = useState(false);
  const [currentProfilePicture, setCurrentProfilePicture] =
    useState<string>("");
  const [selectedOrganizers, setSelectedOrganizers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Filters and pagination
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    experience_level: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form data
  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "+63",
    address: "",
    date_of_birth: "",
    years_of_experience: 0,
    portfolio_link: "",
    talent_fee_min: null,
    talent_fee_max: null,
    talent_fee_currency: "PHP",
    talent_fee_notes: "",
    admin_remarks: "",
    username: "",
    password: "",
  });

  // File handling
  const [profilePictureFile, setProfilePictureFile] =
    useState<FilePreview | null>(null);
  const [resumeFile, setResumeFile] = useState<FilePreview | null>(null);
  const [certificationFiles, setCertificationFiles] = useState<FilePreview[]>(
    []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const certificationInputRef = useRef<HTMLInputElement>(null);

  const fetchOrganizers = useCallback(
    async (searchTerm?: string) => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: "20",
          ...Object.fromEntries(
            Object.entries({
              ...filters,
              search: searchTerm !== undefined ? searchTerm : filters.search,
            }).filter(([, value]) => value)
          ),
        });

        const response = await fetch(
          `${API_URL}/admin.php?operation=getAllOrganizers&${queryParams}`
        );
        const data = await response.json();

        if (data.status === "success") {
          setOrganizers(data.data?.organizers || []);
          setTotalPages(data.data?.pagination?.total_pages || 1);
        } else {
          console.error("API Error:", data.message);
          setError(data.message || "Failed to fetch organizers");
        }
      } catch (error) {
        console.error("Error fetching organizers:", error);
        setError("Failed to fetch organizers");
      } finally {
        setLoading(false);
      }
    },
    [currentPage, filters.status, filters.experience_level]
  );

  // Effect for filters (immediate)
  useEffect(() => {
    if (filters.status || filters.experience_level) {
      fetchOrganizers();
    }
  }, [filters.status, filters.experience_level, fetchOrganizers]);

  // Effect for pagination
  useEffect(() => {
    fetchOrganizers();
  }, [currentPage, fetchOrganizers]);

  // Manual search function
  const handleSearch = () => {
    setCurrentPage(1);
    fetchOrganizers(filters.search);
  };

  // Handle Enter key in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Filter handlers
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key !== "search") {
      setCurrentPage(1);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      experience_level: "",
    });
    setCurrentPage(1);
  };

  // Checkbox handlers
  const handleSelectAll = (checked: boolean | string) => {
    const isChecked = checked === true;
    setSelectAll(isChecked);
    if (isChecked) {
      setSelectedOrganizers(
        organizers.map((organizer) => organizer.organizer_id)
      );
    } else {
      setSelectedOrganizers([]);
    }
  };

  const handleSelectOrganizer = (
    organizerId: number,
    checked: boolean | string
  ) => {
    const isChecked = checked === true;
    if (isChecked) {
      setSelectedOrganizers((prev) => [...prev, organizerId]);
    } else {
      setSelectedOrganizers((prev) => prev.filter((id) => id !== organizerId));
    }
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedOrganizers.length === 0) {
      toast({
        title: "No organizers selected",
        description: "Please select organizers to delete",
        variant: "destructive",
      });
      return;
    }
    // Implement bulk delete logic here
    toast({
      title: "Bulk delete",
      description: `Deleting ${selectedOrganizers.length} organizers...`,
    });
  };

  const handleBulkExport = () => {
    if (selectedOrganizers.length === 0) {
      toast({
        title: "No organizers selected",
        description: "Please select organizers to export",
        variant: "destructive",
      });
      return;
    }
    // Implement bulk export logic here
    toast({
      title: "Bulk export",
      description: `Exporting ${selectedOrganizers.length} organizers...`,
    });
  };

  // Auto-generate username when name changes
  useEffect(() => {
    if (formData.first_name && formData.last_name) {
      const username =
        `${formData.first_name.toLowerCase()}.${formData.last_name.toLowerCase()}`.replace(
          /[^a-z0-9.]/g,
          ""
        );
      setFormData((prev) => ({ ...prev, username }));
    }
  }, [formData.first_name, formData.last_name]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getOrganizerStatusColor = (organizer: Organizer) => {
    return organizer.is_active
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password }));
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    });
  };

  const uploadFile = async (file: File, fileType: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", fileType);
    formData.append("operation", "upload");

    const response = await axios.post(`${API_URL}/admin.php`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data.status === "success") {
      return response.data.filePath;
    } else {
      throw new Error(response.data.message || "Upload failed");
    }
  };

  const handleFileSelect = async (
    files: FileList | null,
    type: "profile" | "resume" | "certification"
  ) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = {
      profile: ["image/jpeg", "image/png", "image/gif"],
      resume: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      certification: ["application/pdf", "image/jpeg", "image/png"],
    };

    if (!allowedTypes[type].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Please select a valid ${type} file`,
        variant: "destructive",
      });
      return;
    }

    const filePreview: FilePreview = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      uploading: true,
      progress: 0,
    };

    if (type === "profile") {
      // Create preview for image
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePictureFile({
          ...filePreview,
          preview: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else if (type === "resume") {
      setResumeFile(filePreview);
    } else if (type === "certification") {
      setCertificationFiles((prev) => [...prev, filePreview]);
    }

    try {
      const filePath = await uploadFile(file, type);

      if (type === "profile") {
        setProfilePictureFile((prev) =>
          prev ? { ...prev, uploaded: true, url: filePath } : null
        );
      } else if (type === "resume") {
        setResumeFile((prev) =>
          prev ? { ...prev, uploaded: true, url: filePath } : null
        );
      } else if (type === "certification") {
        setCertificationFiles((prev) =>
          prev.map((f) =>
            f.file === file ? { ...f, uploaded: true, url: filePath } : f
          )
        );
      }

      toast({
        title: "Upload successful",
        description: `${type} uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeFile = (
    type: "profile" | "resume" | "certification",
    index?: number
  ) => {
    if (type === "profile") {
      setProfilePictureFile(null);
    } else if (type === "resume") {
      setResumeFile(null);
    } else if (type === "certification" && index !== undefined) {
      setCertificationFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, "");

    // If empty, return +63
    if (cleaned.length === 0) {
      return "+63";
    }

    // Format as +63 xxx xxx xxxx
    const match = cleaned.match(/^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      const parts = ["+63", match[1], match[2], match[3], match[4]].filter(
        Boolean
      );
      return parts.join(" ");
    }

    // If doesn't match pattern, just return +63 + digits
    return "+63 " + cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatPhoneNumber(inputValue);
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  const openModal = (mode: "add" | "edit" | "view", organizer?: Organizer) => {
    setModalMode(mode);
    setIsModalOpen(true);

    if (mode === "edit" && organizer) {
      setSelectedOrganizer(organizer);
      setFormData({
        first_name: organizer.first_name,
        last_name: organizer.last_name,
        email: organizer.email,
        phone: organizer.contact_number,
        address: organizer.availability || "",
        date_of_birth: organizer.birthdate,
        years_of_experience: parseInt(
          organizer.experience_summary?.match(
            /Years of Experience: (\d+)/
          )?.[1] || "0"
        ),
        portfolio_link: organizer.portfolio_link || "",
        talent_fee_min: organizer.talent_fee_min ?? null,
        talent_fee_max: organizer.talent_fee_max ?? null,
        talent_fee_currency: organizer.talent_fee_currency || "PHP",
        talent_fee_notes: organizer.talent_fee_notes || "",
        admin_remarks: organizer.remarks || "",
        username: organizer.username,
        password: "",
      });
      setCurrentProfilePicture(organizer.profile_picture || "");
    } else if (mode === "view" && organizer) {
      setSelectedOrganizer(organizer);
      setShowOrganizerDetails(true);
      return;
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "+63",
      address: "",
      date_of_birth: "",
      years_of_experience: 0,
      portfolio_link: "",
      talent_fee_min: null,
      talent_fee_max: null,
      talent_fee_currency: "PHP",
      talent_fee_notes: "",
      admin_remarks: "",
      username: "",
      password: "",
    });
    setProfilePictureFile(null);
    setResumeFile(null);
    setCertificationFiles([]);
    setCurrentProfilePicture("");
    setSelectedOrganizer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Optimistically close modal and show loading toast
      setIsModalOpen(false);
      toast({
        title: "Saving organizer...",
        description: "Please wait while we apply your changes.",
      });
      // Client-side validation: ensure fee min/max are logical
      if (
        (formData.talent_fee_min != null && formData.talent_fee_min < 0) ||
        (formData.talent_fee_max != null && formData.talent_fee_max < 0)
      ) {
        toast({
          title: "Invalid fee",
          description: "Talent fees cannot be negative.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      if (
        formData.talent_fee_min != null &&
        formData.talent_fee_max != null &&
        formData.talent_fee_min > formData.talent_fee_max
      ) {
        toast({
          title: "Invalid fee range",
          description: "Minimum fee cannot be greater than maximum fee.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const submitData = {
        ...formData,
        profile_picture: profilePictureFile?.url || currentProfilePicture,
        resume_path: resumeFile?.url || "",
        certification_files: certificationFiles
          .map((f) => f.url)
          .filter(Boolean),
      };

      const url =
        modalMode === "add"
          ? `${API_URL}/admin.php?operation=createOrganizer`
          : `${API_URL}/admin.php?operation=updateOrganizer&organizer_id=${selectedOrganizer?.organizer_id}`;

      const response = await axios.post(url, submitData, {
        headers: { "Content-Type": "application/json" },
      });
      const data = response.data;

      if (data.status === "success") {
        toast({
          title: "Success!",
          description:
            modalMode === "add"
              ? "Organizer added successfully"
              : "Organizer updated successfully",
          className: "border-green-200 bg-green-50 text-green-800",
        });
        resetForm();
        await fetchOrganizers();
      } else {
        toast({
          title: "Error",
          description: data.message || data.debug?.error || "Operation failed",
          variant: "destructive",
        });
        await fetchOrganizers();
      }
    } catch (error) {
      console.error("Submit error:", error);
      const apiMessage = (error as any)?.response?.data?.message;
      const apiDebug = (error as any)?.response?.data?.debug?.error;
      toast({
        title: "Error",
        description:
          apiMessage || apiDebug || "An error occurred. Please try again.",
        variant: "destructive",
      });
      await fetchOrganizers();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (organizerId: number) => {
    if (!confirm("Are you sure you want to delete this organizer?")) {
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/admin.php?operation=deleteOrganizer`,
        { organizer_id: organizerId }
      );
      const data = response.data;

      if (data.status === "success") {
        toast({
          title: "Success!",
          description: "Organizer deleted successfully",
        });
        fetchOrganizers();
      } else {
        toast({
          title: "Error",
          description: data.message || "Delete failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#028A75] mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading organizers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Organizer Management</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchOrganizers()}
            variant="outline"
            className="bg-white border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => openModal("add")}
            className="bg-[#028A75] hover:bg-[#027a68] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Organizer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Organizers
            </CardTitle>
            <Users className="h-4 w-4 text-[#028A75]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizers.length}</div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Organizers
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organizers.filter((org) => org.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Experience
            </CardTitle>
            <Briefcase className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organizers.length > 0
                ? Math.round(
                    organizers.reduce((sum, org) => {
                      const expMatch = org.experience_summary?.match(
                        /Years of Experience: (\d+)/
                      );
                      return sum + (expMatch ? parseInt(expMatch[1]) : 0);
                    }, 0) / organizers.length
                  )
                : 0}{" "}
              years
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search organizers... (Press Enter)"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75]"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedOrganizers.length > 0 && (
        <Card className="border mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedOrganizers.length} organizer(s) selected
              </span>
              <div className="flex space-x-2">
                <Button
                  onClick={handleBulkExport}
                  variant="outline"
                  className="border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
                >
                  Export Selected
                </Button>
                <Button onClick={handleBulkDelete} variant="destructive">
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizers Table */}
      <Card className="border">
        <CardHeader>
          <CardTitle>Organizers ({organizers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left py-3 px-4">Profile</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Phone</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Experience</th>
                  <th className="text-left py-3 px-4">Talent Fee</th>
                  <th className="text-left py-3 px-4">Registered</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizers.map((organizer) => (
                  <tr
                    key={organizer.organizer_id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <Checkbox
                        checked={selectedOrganizers.includes(
                          organizer.organizer_id
                        )}
                        onCheckedChange={(checked: boolean | string) =>
                          handleSelectOrganizer(organizer.organizer_id, checked)
                        }
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={
                            organizer.profile_picture
                              ? `${API_URL}/serve-image.php?path=${encodeURIComponent(organizer.profile_picture)}`
                              : undefined
                          }
                          alt={`${organizer.first_name} ${organizer.last_name}`}
                        />
                        <AvatarFallback>
                          {getInitials(
                            organizer.first_name,
                            organizer.last_name
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">
                        {organizer.first_name} {organizer.last_name}
                      </div>
                      <div className="text-gray-500 text-xs">
                        @{organizer.username}
                      </div>
                    </td>
                    <td className="py-3 px-4">{organizer.email}</td>
                    <td className="py-3 px-4">{organizer.contact_number}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${organizer.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                      >
                        {organizer.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {organizer.experience_summary
                        ? organizer.experience_summary
                            .split("\n")[0]
                            .replace("Years of Experience: ", "")
                        : "0"}{" "}
                      years
                    </td>
                    <td className="py-3 px-4">
                      {organizer.talent_fee_min != null ||
                      organizer.talent_fee_max != null ? (
                        <span>
                          {(organizer.talent_fee_currency || "PHP") + " "}
                          {organizer.talent_fee_min != null
                            ? organizer.talent_fee_min.toLocaleString()
                            : "?"}
                          {" - "}
                          {organizer.talent_fee_max != null
                            ? organizer.talent_fee_max.toLocaleString()
                            : "?"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {formatDate(organizer.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedOrganizer(organizer);
                              setShowOrganizerDetails(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openModal("edit", organizer)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(organizer.organizer_id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-sm bg-white/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {modalMode === "add" ? "Add New Organizer" : "Edit Organizer"}
            </DialogTitle>
            <DialogDescription>
              Fill in the information below to manage the organizer
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {profilePictureFile?.preview || currentProfilePicture ? (
                      <img
                        src={
                          profilePictureFile?.preview ||
                          `${API_URL}/serve-image.php?path=${encodeURIComponent(currentProfilePicture)}`
                        }
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileSelect(e.target.files, "profile")
                    }
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-[#028A75] hover:bg-[#027a68] text-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Click to upload
                  <br />
                  Max 5MB
                </p>
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="last_name">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">
                    Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="mt-1"
                    placeholder="+63xxxxxxxxxx"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Account Information */}
            {modalMode === "add" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <div className="flex mt-1">
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      className="rounded-r-none"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(formData.username, "Username")
                      }
                      className="rounded-l-none border-l-0 border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">Temporary Password</Label>
                  <div className="flex mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="rounded-r-none"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="rounded-none border-l-0 border-r-0 border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(formData.password, "Password")
                      }
                      className="rounded-l-none border-l-0 border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={generatePassword}
                    className="p-0 h-auto text-xs mt-1 text-[#028A75] hover:text-[#027a68]"
                  >
                    Generate New Password
                  </Button>
                </div>
              </div>
            )}

            {/* Other Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      date_of_birth: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="years_of_experience">Years of Experience</Label>
                <Input
                  id="years_of_experience"
                  type="number"
                  min="0"
                  value={formData.years_of_experience}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      years_of_experience: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="portfolio_link">
                  Portfolio Link (Optional)
                </Label>
                <Input
                  id="portfolio_link"
                  type="url"
                  value={formData.portfolio_link}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      portfolio_link: e.target.value,
                    }))
                  }
                  className="mt-1"
                  placeholder="https://portfolio.example.com"
                />
              </div>
            </div>

            {/* Talent Fees */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="talent_fee_min">Talent Fee Min</Label>
                <Input
                  id="talent_fee_min"
                  type="number"
                  step="0.01"
                  value={formData.talent_fee_min ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      talent_fee_min:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className="mt-1"
                  placeholder="e.g. 2000"
                />
              </div>
              <div>
                <Label htmlFor="talent_fee_max">Talent Fee Max</Label>
                <Input
                  id="talent_fee_max"
                  type="number"
                  step="0.01"
                  value={formData.talent_fee_max ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      talent_fee_max:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className="mt-1"
                  placeholder="e.g. 5000"
                />
              </div>
              <div>
                <Label htmlFor="talent_fee_currency">Currency</Label>
                <Input
                  id="talent_fee_currency"
                  value={formData.talent_fee_currency || "PHP"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      talent_fee_currency: e.target.value,
                    }))
                  }
                  className="mt-1"
                  placeholder="PHP"
                />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="talent_fee_notes">Talent Fee Notes</Label>
                <Textarea
                  id="talent_fee_notes"
                  value={formData.talent_fee_notes || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      talent_fee_notes: e.target.value,
                    }))
                  }
                  className="mt-1"
                  rows={2}
                  placeholder="Any notes about fees, inclusions, conditions..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                className="mt-1"
                rows={2}
              />
            </div>

            {/* File Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Resume</Label>
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileSelect(e.target.files, "resume")}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resumeInputRef.current?.click()}
                  className="w-full mt-2 border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Resume
                </Button>
                {resumeFile && (
                  <div className="mt-2 p-2 border rounded bg-gray-50 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{resumeFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile("resume")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Certifications</Label>
                <input
                  ref={certificationInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      Array.from(e.target.files).forEach((file) => {
                        handleFileSelect([file] as any, "certification");
                      });
                    }
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => certificationInputRef.current?.click()}
                  className="w-full mt-2 border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Certifications
                </Button>
                {certificationFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {certificationFiles.map((file, index) => (
                      <div
                        key={index}
                        className="p-2 border rounded bg-gray-50 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span>{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile("certification", index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="admin_remarks">Admin Remarks</Label>
              <Textarea
                id="admin_remarks"
                value={formData.admin_remarks}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    admin_remarks: e.target.value,
                  }))
                }
                className="mt-1"
                rows={3}
                placeholder="Any additional notes or remarks about this organizer..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#028A75] hover:bg-[#027a68] text-white"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {modalMode === "edit" ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {modalMode === "edit"
                      ? "Update Organizer"
                      : "Create Organizer"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Organizer Details Dialog */}
      <Dialog
        open={showOrganizerDetails}
        onOpenChange={setShowOrganizerDetails}
      >
        <DialogContent className="max-w-2xl bg-white/95">
          <DialogHeader>
            <DialogTitle>Organizer Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedOrganizer?.first_name}{" "}
              {selectedOrganizer?.last_name}
            </DialogDescription>
          </DialogHeader>
          {selectedOrganizer && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={
                      selectedOrganizer.profile_picture
                        ? `${API_URL}/serve-image.php?path=${encodeURIComponent(selectedOrganizer.profile_picture)}`
                        : undefined
                    }
                    alt={`${selectedOrganizer.first_name} ${selectedOrganizer.last_name}`}
                  />
                  <AvatarFallback className="text-lg">
                    {getInitials(
                      selectedOrganizer.first_name,
                      selectedOrganizer.last_name
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedOrganizer.first_name} {selectedOrganizer.last_name}
                  </h3>
                  <Badge className={getOrganizerStatusColor(selectedOrganizer)}>
                    {selectedOrganizer.is_active ? "active" : "inactive"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="text-sm">{selectedOrganizer.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Phone
                  </label>
                  <p className="text-sm">{selectedOrganizer.contact_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Experience
                  </label>
                  <p className="text-sm">
                    {selectedOrganizer.experience_summary
                      ?.split("\n")[0]
                      ?.replace("Years of Experience: ", "") || "0"}{" "}
                    years
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Talent Fee
                  </label>
                  <p className="text-sm">
                    {selectedOrganizer.talent_fee_min != null ||
                    selectedOrganizer.talent_fee_max != null ? (
                      <>
                        {(selectedOrganizer.talent_fee_currency || "PHP") + " "}
                        {selectedOrganizer.talent_fee_min != null
                          ? selectedOrganizer.talent_fee_min.toLocaleString()
                          : "?"}
                        {" - "}
                        {selectedOrganizer.talent_fee_max != null
                          ? selectedOrganizer.talent_fee_max.toLocaleString()
                          : "?"}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Registration Date
                  </label>
                  <p className="text-sm">
                    {formatDate(selectedOrganizer.created_at)}
                  </p>
                </div>
                {selectedOrganizer.talent_fee_notes && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Talent Fee Notes
                    </label>
                    <p className="text-sm">
                      {selectedOrganizer.talent_fee_notes}
                    </p>
                  </div>
                )}
                {selectedOrganizer.portfolio_link && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Portfolio
                    </label>
                    <p className="text-sm">
                      <a
                        href={selectedOrganizer.portfolio_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedOrganizer.portfolio_link}
                      </a>
                    </p>
                  </div>
                )}
                {selectedOrganizer.experience_summary?.split("\n")[1] && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Address
                    </label>
                    <p className="text-sm">
                      {selectedOrganizer.experience_summary
                        .split("\n")[1]
                        .replace("Address: ", "")}
                    </p>
                  </div>
                )}
                {selectedOrganizer.remarks && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Admin Remarks
                    </label>
                    <p className="text-sm">{selectedOrganizer.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {organizers.length === 0 && !loading && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No organizers found</h3>
          <p className="text-muted-foreground">
            No organizers have been registered yet.
          </p>
        </div>
      )}
    </div>
  );
}
