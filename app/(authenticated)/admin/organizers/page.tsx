"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { toast } from "@/hooks/use-toast";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  admin_remarks: string;
  username: string;
  password: string;
}

interface FilterState {
  search: string;
  status: string;
  experience_level: string;
}

const API_URL = "http://localhost/events-api";

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

  // Load organizers on component mount
  useEffect(() => {
    fetchOrganizers();
  }, [currentPage, filters]);

  // Filter handlers
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      experience_level: "",
    });
    setCurrentPage(1);
  };

  // Auto-generate username when name changes
  useEffect(() => {
    if (formData.first_name && formData.last_name) {
      const username = `${formData.first_name.toLowerCase()}.${formData.last_name.toLowerCase()}${Math.floor(Math.random() * 100)}`;
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
    if (organizer.is_active) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Generate secure password
  const generatePassword = () => {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const password = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((byte) => charset[byte % charset.length])
      .join("");
    setFormData((prev) => ({ ...prev, password }));
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${type} copied to clipboard`,
    });
  };

  // Fetch organizers
  const fetchOrganizers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value)
        ),
      });

      const response = await fetch(
        `${API_URL}/admin.php?operation=getAllOrganizers&${queryParams}`
      );
      const data = await response.json();

      if (data.status === "success") {
        setOrganizers(data.data.organizers || []);
        setTotalPages(data.data.pagination?.total_pages || 1);
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
  };

  // File upload handlers
  const uploadFile = async (file: File, fileType: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("operation", "uploadFile");
    formData.append("fileType", fileType);

    const response = await axios.post(`${API_URL}/admin.php`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
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

    // File validation
    const maxSize = type === "profile" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `File size must be less than ${type === "profile" ? "5MB" : "10MB"}`,
        variant: "destructive",
      });
      return;
    }

    const filePreview: FilePreview = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      uploading: false,
      progress: 0,
      uploaded: false,
    };

    // Generate preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        filePreview.preview = e.target?.result as string;

        // For profile pictures, upload immediately
        if (type === "profile") {
          filePreview.uploading = true;
          setProfilePictureFile({ ...filePreview });

          try {
            const uploadedPath = await uploadFile(file, "profile_picture");
            filePreview.uploaded = true;
            filePreview.uploading = false;
            filePreview.url = uploadedPath;
            setCurrentProfilePicture(uploadedPath);
            setProfilePictureFile({ ...filePreview });

            toast({
              title: "Success",
              description: "Profile picture uploaded successfully",
            });
          } catch (error: any) {
            filePreview.uploading = false;
            setProfilePictureFile({ ...filePreview });

            toast({
              title: "Upload Failed",
              description: error.message || "Failed to upload profile picture",
              variant: "destructive",
            });
          }
        }
      };
      reader.readAsDataURL(file);
    }

    // Set file based on type
    if (type === "profile") {
      if (!file.type.startsWith("image/")) {
        setProfilePictureFile(filePreview);
      }
    } else if (type === "resume") {
      setResumeFile(filePreview);
    } else if (type === "certification") {
      setCertificationFiles((prev) => [...prev, filePreview]);
    }
  };

  const removeFile = (
    type: "profile" | "resume" | "certification",
    index?: number
  ) => {
    if (type === "profile") {
      setProfilePictureFile(null);
      setCurrentProfilePicture("");
    } else if (type === "resume") {
      setResumeFile(null);
    } else if (type === "certification" && index !== undefined) {
      setCertificationFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Phone number formatting
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+63")) {
      return "+63";
    }
    if (cleaned.length > 13) {
      return cleaned.slice(0, 13);
    }
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  // Form handlers
  const openModal = (mode: "add" | "edit" | "view", organizer?: Organizer) => {
    setModalMode(mode);
    setSelectedOrganizer(organizer || null);

    if (mode === "add") {
      resetForm();
      generatePassword();
    } else if (organizer) {
      setFormData({
        first_name: organizer.first_name,
        last_name: organizer.last_name,
        email: organizer.email,
        phone: organizer.contact_number,
        address:
          organizer.experience_summary
            ?.split("\n")[1]
            ?.replace("Address: ", "") || "",
        date_of_birth: organizer.birthdate,
        years_of_experience: parseInt(
          organizer.experience_summary?.match(
            /Years of Experience: (\d+)/
          )?.[1] || "0"
        ),
        portfolio_link: organizer.portfolio_link || "",
        admin_remarks: organizer.remarks || "",
        username: organizer.username || "",
        password: "",
      });
      setCurrentProfilePicture(organizer.profile_picture || "");
    }

    setIsModalOpen(true);
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
      admin_remarks: "",
      username: "",
      password: "",
    });
    setProfilePictureFile(null);
    setResumeFile(null);
    setCertificationFiles([]);
    setCurrentProfilePicture("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.first_name.trim()) {
        throw new Error("First name is required");
      }
      if (!formData.last_name.trim()) {
        throw new Error("Last name is required");
      }
      if (!formData.email.trim()) {
        throw new Error("Email is required");
      }
      if (!formData.phone.trim() || formData.phone === "+63") {
        throw new Error("Phone number is required");
      }

      // Upload files first
      let profilePicturePath = currentProfilePicture;
      let resumePath = "";
      const certificationPaths: string[] = [];

      // Upload resume
      if (resumeFile && !resumeFile.uploaded) {
        try {
          resumePath = await uploadFile(resumeFile.file, "resume");
        } catch (error) {
          console.error("Resume upload failed:", error);
        }
      }

      // Upload certifications
      for (const cert of certificationFiles) {
        if (!cert.uploaded) {
          try {
            const path = await uploadFile(cert.file, "certification");
            certificationPaths.push(path);
          } catch (error) {
            console.error("Certification upload failed:", error);
          }
        }
      }

      // Prepare API data
      const apiData = {
        operation: modalMode === "edit" ? "updateOrganizer" : "createOrganizer",
        ...(modalMode === "edit" && {
          organizer_id: selectedOrganizer?.organizer_id,
        }),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        date_of_birth: formData.date_of_birth,
        years_of_experience: formData.years_of_experience,
        certification_files: certificationPaths,
        resume_path: resumePath,
        portfolio_link: formData.portfolio_link.trim(),
        profile_picture: profilePicturePath,
        admin_remarks: formData.admin_remarks.trim(),
        username: formData.username.trim(),
        ...(modalMode === "add" && { password: formData.password }),
      };

      const response = await axios.post(`${API_URL}/admin.php`, apiData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description:
            modalMode === "edit"
              ? "Organizer updated successfully"
              : "Organizer created successfully",
        });
        setIsModalOpen(false);
        resetForm();
        fetchOrganizers();
      } else {
        throw new Error(response.data.message || "Operation failed");
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Operation failed",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (organizerId: number) => {
    if (!confirm("Are you sure you want to delete this organizer?")) return;

    try {
      const response = await axios.post(
        `${API_URL}/admin.php`,
        {
          operation: "deleteOrganizer",
          organizer_id: organizerId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: "Organizer deleted successfully",
        });
        fetchOrganizers();
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete organizer",
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
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading organizers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Organizer Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button onClick={() => openModal("add")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Organizer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Organizers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Organizers
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organizers.filter((org) => org.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Experience
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search organizers..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Experience Level
              </label>
              <select
                value={filters.experience_level}
                onChange={(e) =>
                  handleFilterChange("experience_level", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All Levels</option>
                <option value="junior">Junior (&lt; 3 years)</option>
                <option value="mid">Mid (3-7 years)</option>
                <option value="senior">Senior (&gt; 7 years)</option>
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

      {/* Organizers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organizers ({organizers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Profile</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Phone</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Experience</th>
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
                      {formatDate(organizer.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOrganizer(organizer);
                            setShowOrganizerDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal("edit", organizer)}
                          className="text-green-600 hover:text-green-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(organizer.organizer_id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                  className="px-3 py-1 border rounded disabled:opacity-50"
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
                  className="px-3 py-1 border rounded disabled:opacity-50"
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
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
                      className="rounded-l-none border-l-0"
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
                      className="rounded-none border-l-0 border-r-0"
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
                      className="rounded-l-none border-l-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={generatePassword}
                    className="p-0 h-auto text-xs mt-1"
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
                  className="w-full mt-2"
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
                  className="w-full mt-2"
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
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
        <DialogContent className="max-w-2xl">
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
                    Registration Date
                  </label>
                  <p className="text-sm">
                    {formatDate(selectedOrganizer.created_at)}
                  </p>
                </div>
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
