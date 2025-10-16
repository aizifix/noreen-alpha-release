"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Users,
  Calendar,
  Filter,
  MoreVertical,
  Camera,
  Check,
  RefreshCw,
} from "lucide-react";

interface Staff {
  staff_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  profile_picture: string;
  branch_name?: string | null;
  role_title: string; // e.g., "head_organizer", "on_site"
  can_handle_bookings: boolean;
  is_active: boolean;
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
  branch_name?: string;
  role_title: string;
  can_handle_bookings: boolean;
  admin_remarks: string;
  username: string;
  password: string;
}

interface FilterState {
  search: string;
  status: string;
  role: string;
}

import { API_URL } from "../../../config/api";

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentProfilePicture, setCurrentProfilePicture] =
    useState<string>("");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    role: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "+63",
    branch_name: "",
    role_title: "head_organizer",
    can_handle_bookings: true,
    admin_remarks: "",
    username: "",
    password: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profilePictureFile, setProfilePictureFile] =
    useState<FilePreview | null>(null);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleSelectAll = (checked: boolean | string) => {
    const isChecked = checked === true;
    setSelectAll(isChecked);
    setSelectedRows(isChecked ? staff.map((s) => s.staff_id) : []);
  };

  const handleSelectRow = (rowId: number, checked: boolean | string) => {
    const isChecked = checked === true;
    setSelectedRows((prev) =>
      isChecked ? [...prev, rowId] : prev.filter((id) => id !== rowId)
    );
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key !== "search") setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: "", status: "", role: "" });
    setCurrentPage(1);
  };

  const fetchStaff = useCallback(
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
            }).filter(([, v]) => v)
          ),
        });

        const response = await fetch(
          `${API_URL}/admin.php?operation=getAllStaff&${queryParams}`
        );
        const data = await response.json();
        if (data.status === "success") {
          setStaff(data.data?.staff || []);
          setTotalPages(data.data?.pagination?.total_pages || 1);
        } else {
          setError(data.message || "Failed to fetch staff");
        }
      } catch (err) {
        setError("Failed to fetch staff");
      } finally {
        setLoading(false);
      }
    },
    [currentPage, filters.status, filters.role]
  );

  useEffect(() => {
    fetchStaff();
  }, [currentPage, fetchStaff]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchStaff(filters.search);
  };

  const openModal = (mode: "add" | "edit" | "view", row?: Staff) => {
    setModalMode(mode);
    setIsModalOpen(true);
    if (mode === "edit" && row) {
      setSelectedStaff(row);
      setFormData({
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.contact_number,
        branch_name: row.branch_name || "",
        role_title: row.role_title,
        can_handle_bookings: row.can_handle_bookings,
        admin_remarks: "",
        username: row.username,
        password: "",
      });
      setCurrentProfilePicture(row.profile_picture || "");
    } else if (mode === "view" && row) {
      setSelectedStaff(row);
      return;
    } else {
      setSelectedStaff(null);
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "+63",
        branch_name: "",
        role_title: "head_organizer",
        can_handle_bookings: true,
        admin_remarks: "",
        username: "",
        password: "",
      });
      setProfilePictureFile(null);
      setCurrentProfilePicture("");
    }
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++)
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData((prev) => ({ ...prev, password }));
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast(`Copied! ${type} copied to clipboard`);
  };

  const uploadProfile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "profile");
    fd.append("operation", "upload");
    const response = await axios.post(`${API_URL}/admin.php`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (response.data.status === "success") return response.data.filePath;
    throw new Error(response.data.message || "Upload failed");
  };

  const handleProfileFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large. Please select a file smaller than 5MB");
      return;
    }
    setProfilePictureFile({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      uploading: true,
      progress: 0,
    });
    try {
      const filePath = await uploadProfile(file);
      setProfilePictureFile((prev) =>
        prev ? { ...prev, uploaded: true, url: filePath } : null
      );
      toast.success("Upload successful. Profile uploaded successfully");
    } catch (e) {
      toast.error("Upload failed. Failed to upload file");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      setIsModalOpen(false);
      toast(modalMode === "add" ? "Creating staff..." : "Updating staff...");
      const payload = {
        ...formData,
        profile_picture: profilePictureFile?.url || currentProfilePicture,
      };
      const url =
        modalMode === "add"
          ? `${API_URL}/admin.php?operation=createStaff`
          : `${API_URL}/admin.php?operation=updateStaff&staff_id=${selectedStaff?.staff_id}`;
      const response = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
      });
      const data = response.data;
      if (data.status === "success") {
        toast.success(
          modalMode === "add"
            ? "Success! Staff added successfully"
            : "Success! Staff updated successfully"
        );
        await fetchStaff();
      } else {
        toast.error(
          `Error: ${data.message || data.debug?.error || "Operation failed"}`
        );
        await fetchStaff();
      }
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      const apiDebug = err?.response?.data?.debug?.error;
      toast.error(
        `Error: ${apiMessage || apiDebug || "An error occurred. Please try again."}`
      );
      await fetchStaff();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this staff?")) return;
    try {
      const response = await axios.post(
        `${API_URL}/admin.php?operation=deleteStaff`,
        { staff_id: id }
      );
      const data = response.data;
      if (data.status === "success") {
        toast.success("Success! Staff deleted successfully");
        fetchStaff();
      } else {
        toast.error(`Error: ${data.message || "Delete failed"}`);
      }
    } catch (err) {
      toast.error("Error: An error occurred. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#028A75] mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading staff...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchStaff()}
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
            Add Staff
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-[#028A75]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter((s) => s.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Booking-capable
            </CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter((s) => s.can_handle_bookings).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" /> Filters
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
                  placeholder="Search staff... (Press Enter)"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange("role", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75]"
              >
                <option value="">All Roles</option>
                <option value="head_organizer">Head Organizer</option>
                <option value="on_site">On-site Staff</option>
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

      {selectedRows.length > 0 && (
        <Card className="border mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedRows.length} staff selected
              </span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  className="border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
                >
                  Export Selected
                </Button>
                <Button variant="destructive">Delete Selected</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border">
        <CardHeader>
          <CardTitle>Staff ({staff.length})</CardTitle>
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
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Bookings</th>
                  <th className="text-left py-3 px-4">Registered</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((row) => (
                  <tr key={row.staff_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Checkbox
                        checked={selectedRows.includes(row.staff_id)}
                        onCheckedChange={(checked: boolean | string) =>
                          handleSelectRow(row.staff_id, checked)
                        }
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={
                            row.profile_picture
                              ? `${API_URL}/serve-image.php?path=${encodeURIComponent(row.profile_picture)}`
                              : undefined
                          }
                          alt={`${row.first_name} ${row.last_name}`}
                        />
                        <AvatarFallback>
                          {getInitials(row.first_name, row.last_name)}
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">
                        {row.first_name} {row.last_name}
                      </div>
                      <div className="text-gray-500 text-xs">
                        @{row.username}
                      </div>
                    </td>
                    <td className="py-3 px-4">{row.email}</td>
                    <td className="py-3 px-4">{row.contact_number}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        {row.role_title.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {row.can_handle_bookings ? "yes" : "no"}
                    </td>
                    <td className="py-3 px-4">{formatDate(row.created_at)}</td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openModal("view", row)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openModal("edit", row)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(row.staff_id)}
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto backdrop-blur-sm bg-white/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {modalMode === "add" ? "Add New Staff" : "Edit Staff"}
            </DialogTitle>
            <DialogDescription>
              Fill in the information below to manage the staff
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {profilePictureFile?.preview || currentProfilePicture ? (
                      // eslint-disable-next-line @next/next/no-img-element
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
                    onChange={(e) => handleProfileFile(e.target.files)}
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
                      setFormData((p) => ({ ...p, first_name: e.target.value }))
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
                      setFormData((p) => ({ ...p, last_name: e.target.value }))
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
                      setFormData((p) => ({ ...p, email: e.target.value }))
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
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, phone: e.target.value }))
                    }
                    className="mt-1"
                    placeholder="+63xxxxxxxxxx"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role_title">Role</Label>
                  <select
                    id="role_title"
                    value={formData.role_title}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, role_title: e.target.value }))
                    }
                    className="mt-1 border rounded px-2 py-2"
                  >
                    <option value="head_organizer">Head Organizer</option>
                    <option value="on_site">On-site Staff</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="inline-flex items-center space-x-2 mt-6">
                    <input
                      type="checkbox"
                      checked={formData.can_handle_bookings}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          can_handle_bookings: e.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm">
                      Can handle bookings (on-site)
                    </span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="branch_name">Branch (optional)</Label>
                  <Input
                    id="branch_name"
                    value={formData.branch_name}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        branch_name: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {modalMode === "add" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <div className="flex mt-1">
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, username: e.target.value }))
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
                        setFormData((p) => ({ ...p, password: e.target.value }))
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

            <div>
              <Label htmlFor="admin_remarks">Admin Remarks</Label>
              <Textarea
                id="admin_remarks"
                value={formData.admin_remarks}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, admin_remarks: e.target.value }))
                }
                className="mt-1"
                rows={3}
                placeholder="Notes or remarks about this staff..."
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
                    {modalMode === "edit" ? "Update Staff" : "Create Staff"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {staff.length === 0 && !loading && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No staff found</h3>
          <p className="text-muted-foreground">
            No staff have been registered yet.
          </p>
        </div>
      )}
    </div>
  );
}
