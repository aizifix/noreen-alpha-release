"use client";
import Link from "next/link";
import {
  Plus,
  Package,
  Edit,
  Trash,
  Save,
  X,
  Eye,
  Settings,
  Search,
  Filter,
  Users,
  Calendar,
  DollarSign,
  CheckCircle,
  Gift,
  Archive,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Copy,
  Tag,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { Check, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { EventTypeSelector } from "@/components/ui/event-type-selector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// API Configuration is now handled by the centralized config

// Define package interface
interface PackageItem {
  package_id: number;
  package_title: string;
  package_description: string;
  package_price: string | number;
  guest_capacity: number;
  created_at: string;
  user_firstName: string;
  user_lastName: string;
  created_by_name?: string;
  is_active: number;
  component_count: number;
  venue_count?: number;
  inclusions: string[];
  freebies: string[];
  freebie_count: number;
  event_type_ids?: number[];
  event_type_names?: string[];
}

// Update types to include price at each level
interface SubComponent {
  name: string;
  price: number | string;
}

interface Component {
  name: string;
  price: number | string;
  subComponents: SubComponent[];
}

interface Inclusion {
  name: string;
  price: number | string;
  components: Component[];
}

interface EventType {
  event_type_id: number;
  event_name: string;
  event_description: string | null;
}

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_location: string;
  venue_capacity: number;
  total_price: number;
  venue_profile_picture: string | null;
  venue_cover_photo: string | null;
  inclusions: VenueInclusion[];
}

interface VenueInclusion {
  inclusion_id: number;
  inclusion_name: string;
  inclusion_price: number;
}

interface FilterState {
  search: string;
  status: string;
  priceRange: string;
  capacity: string;
}

export default function PackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    package_title: string;
    package_description: string;
    package_price: string;
    guest_capacity: number;
  }>({
    package_title: "",
    package_description: "",
    package_price: "",
    guest_capacity: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    priceRange: "",
    capacity: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof PackageItem>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // View toggle state
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Modal states
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: "destructive" | "warning" | "default";
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
    variant: "default",
  });
  const [eventTypeModal, setEventTypeModal] = useState<{
    isOpen: boolean;
    packageId: number | null;
    currentTypes: number[];
  }>({
    isOpen: false,
    packageId: null,
    currentTypes: [],
  });

  useEffect(() => {
    // Fetch packages when component mounts
    fetchPackages();
  }, []);

  // Filter and sort packages when filters, packages, or sort settings change
  useEffect(() => {
    let filtered = [...packages];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(
        (pkg) =>
          pkg.package_title
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          pkg.package_description
            ?.toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          pkg.created_by_name
            ?.toLowerCase()
            .includes(filters.search.toLowerCase())
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter((pkg) => {
        if (filters.status === "active") return pkg.is_active === 1;
        if (filters.status === "inactive") return pkg.is_active === 0;
        return true;
      });
    }

    // Price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split("-").map(Number);
      filtered = filtered.filter((pkg) => {
        const price = parseFloat(pkg.package_price.toString());
        if (max) {
          return price >= min && price <= max;
        }
        return price >= min;
      });
    }

    // Capacity filter
    if (filters.capacity) {
      const [min, max] = filters.capacity.split("-").map(Number);
      filtered = filtered.filter((pkg) => {
        if (max) {
          return pkg.guest_capacity >= min && pkg.guest_capacity <= max;
        }
        return pkg.guest_capacity >= min;
      });
    }

    // Sort packages
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle different data types
      if (sortField === "package_price") {
        aValue = parseFloat((aValue || 0).toString());
        bValue = parseFloat((bValue || 0).toString());
      } else if (sortField === "created_at") {
        aValue = new Date((aValue as string) || "").getTime();
        bValue = new Date((bValue as string) || "").getTime();
      }

      if (sortDirection === "asc") {
        return (aValue || 0) < (bValue || 0)
          ? -1
          : (aValue || 0) > (bValue || 0)
            ? 1
            : 0;
      } else {
        return (aValue || 0) > (bValue || 0)
          ? -1
          : (aValue || 0) < (bValue || 0)
            ? 1
            : 0;
      }
    });

    setFilteredPackages(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [packages, filters, sortField, sortDirection]);

  const fetchPackages = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${endpoints.admin}?operation=getAllPackages`
      );

      if (response.data?.status === "success") {
        setPackages(response.data?.packages || []);
      } else {
        console.error("Error fetching packages:", response.data?.message);
        toast.error(
          "Failed to fetch packages: " +
            (response.data?.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("API error:", error);
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePackage = async (packageId: number) => {
    setConfirmationModal({
      isOpen: true,
      title: "Delete Package",
      description:
        "Are you sure you want to delete this package? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const response = await axios.post(
            endpoints.admin,
            {
              operation: "deletePackage",
              package_id: packageId,
            },
            { headers: { "Content-Type": "application/json" } }
          );

          if (response.data?.status === "success") {
            toast.success(
              response.data?.message || "Package deleted successfully"
            );
            // Refresh the list
            fetchPackages();
          } else {
            console.error("Delete error:", response.data?.message);
            toast.error(
              "Failed to delete package: " +
                (response.data?.message || "Unknown error")
            );
          }
        } catch (error) {
          console.error("API error:", error);
          toast.error("Failed to connect to server");
        }
        setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
      },
      variant: "destructive",
    });
  };

  const handleDuplicatePackage = async (packageId: number) => {
    setConfirmationModal({
      isOpen: true,
      title: "Duplicate Package",
      description:
        "Are you sure you want to duplicate this package? This will create a copy with all the same details.",
      onConfirm: async () => {
        try {
          const response = await axios.post(
            endpoints.admin,
            {
              operation: "duplicatePackage",
              package_id: packageId,
            },
            { headers: { "Content-Type": "application/json" } }
          );

          if (response.data?.status === "success") {
            toast.success(
              response.data?.message || "Package duplicated successfully"
            );
            // Refresh the list
            fetchPackages();
          } else {
            console.error("Duplicate error:", response.data?.message);
            toast.error(
              "Failed to duplicate package: " +
                (response.data?.message || "Unknown error")
            );
          }
        } catch (error) {
          console.error("API error:", error);
          toast.error("Failed to connect to server");
        }
        setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
      },
      variant: "warning",
    });
  };

  const handleEditClick = (pkg: PackageItem) => {
    setEditingPackage(pkg.package_id);
    setEditForm({
      package_title: pkg.package_title,
      package_description: pkg.package_description || "",
      package_price: pkg.package_price.toString(),
      guest_capacity: pkg.guest_capacity,
    });
  };

  const handleCancelEdit = () => {
    setEditingPackage(null);
    setEditForm({
      package_title: "",
      package_description: "",
      package_price: "",
      guest_capacity: 0,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPackage) return;

    setIsSaving(true);
    try {
      const updateData: any = {
        operation: "updatePackage",
        package_id: editingPackage,
        package_title: editForm.package_title,
        package_description: editForm.package_description,
        package_price: parseFloat(editForm.package_price),
        guest_capacity: editForm.guest_capacity,
      };

      const response = await axios.post(endpoints.admin, updateData, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data?.status === "success") {
        toast.success("Package updated successfully");
        setEditingPackage(null);
        fetchPackages(); // Refresh the list
      } else if (
        response.data?.status === "warning" &&
        response.data?.data?.requires_confirmation
      ) {
        // Handle budget overage warning
        setConfirmationModal({
          isOpen: true,
          title: "Budget Overage Warning",
          description: `Budget overage detected: ₱${response.data?.data?.overage_amount?.toLocaleString()} over budget. Continue anyway?`,
          onConfirm: async () => {
            updateData.confirm_overage = true;
            const retryResponse = await axios.post(
              endpoints.admin,
              updateData,
              { headers: { "Content-Type": "application/json" } }
            );

            if (retryResponse.data?.status === "success") {
              toast.success("Package updated successfully");
              setEditingPackage(null);
              fetchPackages();
            } else {
              toast.error(
                retryResponse.data?.message || "Failed to update package"
              );
            }
            setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
          },
          variant: "warning",
        });
      } else {
        toast.error(response.data?.message || "Failed to update package");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update package");
    } finally {
      setIsSaving(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      priceRange: "",
      capacity: "",
    });
  };

  // Pagination helpers
  const totalPages = Math.ceil(filteredPackages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPackages = filteredPackages.slice(startIndex, endIndex);

  const handleSort = (field: keyof PackageItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const getStats = () => {
    const totalPackages = packages.length;
    const activePackages = packages.filter((p) => p.is_active).length;
    const avgPrice =
      packages.length > 0
        ? packages.reduce(
            (sum, p) => sum + parseFloat(p.package_price.toString()),
            0
          ) / packages.length
        : 0;
    const maxCapacity =
      packages.length > 0
        ? Math.max(...packages.map((p) => p.guest_capacity))
        : 0;

    return { totalPackages, activePackages, avgPrice, maxCapacity };
  };

  const stats = getStats();

  const handleEventTypeEdit = (packageId: number, currentTypes: number[]) => {
    setEventTypeModal({
      isOpen: true,
      packageId,
      currentTypes,
    });
  };

  const handleEventTypeSave = async (selectedTypes: number[]) => {
    if (!eventTypeModal.packageId) return;

    try {
      const response = await axios.post(
        endpoints.admin,
        {
          operation: "updatePackageEventTypes",
          package_id: eventTypeModal.packageId,
          event_type_ids: selectedTypes,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data?.status === "success") {
        toast.success("Event types updated successfully");
        fetchPackages();
      } else {
        toast.error("Failed to update event types");
      }
    } catch (error) {
      console.error("Error updating event types:", error);
      toast.error("Failed to update event types");
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section with Slide-up Animation */}
        <div className="animate-slide-up mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">
                Package Management
              </h1>
              <p className="text-gray-600 text-sm lg:text-lg">
                Manage and organize your event packages
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className={`${
                    viewMode === "cards"
                      ? "bg-[#028A75] text-white shadow-sm"
                      : "hover:bg-gray-200"
                  }`}
                >
                  <Grid3X3 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Cards</span>
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={`${
                    viewMode === "table"
                      ? "bg-[#028A75] text-white shadow-sm"
                      : "hover:bg-gray-200"
                  }`}
                >
                  <List className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
              </div>

              <Link href="/admin/packages/package-builder">
                <Button
                  size="lg"
                  className="bg-[#028A75] hover:bg-[#027A65] text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Package
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards with Slide-up Animation */}
        {!isLoading && packages.length > 0 && (
          <div className="animate-slide-up-delay-1 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Total Packages
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats.totalPackages}
                      </p>
                    </div>
                    <div className="bg-[#E6F4F1] p-3 rounded-xl">
                      <Package className="h-6 w-6 text-[#028A75]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Active Packages
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats.activePackages}
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Average Price
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        ₱{Math.round(stats.avgPrice).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded-xl">
                      <DollarSign className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Max Capacity
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats.maxCapacity}
                      </p>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-xl">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Search and Filters Section */}
        <div className="animate-slide-up-delay-2 mb-8">
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search packages..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        search: e.target.value,
                      }))
                    }
                    className="pl-10 pr-4 py-3 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#028A75] focus:border-transparent"
                  />
                </div>

                {/* Filter Toggle */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="border-gray-200 hover:bg-gray-50 rounded-xl px-4 py-2"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {showFilters ? (
                      <ChevronUp className="h-4 w-4 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2" />
                    )}
                  </Button>
                  {(filters.search ||
                    filters.status ||
                    filters.priceRange ||
                    filters.capacity) && (
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Filters */}
              {showFilters && (
                <div className="mt-6 pt-6 border-t border-gray-100 animate-slide-down">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Status
                      </Label>
                      <select
                        value={filters.status}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-transparent"
                      >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Price Range
                      </Label>
                      <select
                        value={filters.priceRange}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            priceRange: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-transparent"
                      >
                        <option value="">All Prices</option>
                        <option value="0-50000">Under ₱50,000</option>
                        <option value="50000-100000">₱50,000 - ₱100,000</option>
                        <option value="100000-200000">
                          ₱100,000 - ₱200,000
                        </option>
                        <option value="200000-">Over ₱200,000</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Capacity
                      </Label>
                      <select
                        value={filters.capacity}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            capacity: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-transparent"
                      >
                        <option value="">All Capacities</option>
                        <option value="0-50">Under 50 guests</option>
                        <option value="50-100">50 - 100 guests</option>
                        <option value="100-200">100 - 200 guests</option>
                        <option value="200-">Over 200 guests</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="w-full border-gray-200 hover:bg-gray-50"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="animate-slide-up-delay-3">
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
              <p className="text-lg text-gray-600">Loading packages...</p>
            </div>
          </div>
        ) : (
          /* Packages Content - Cards or Table View */
          <div className="animate-slide-up-delay-3">
            {filteredPackages.length > 0 ? (
              <>
                {/* View Controls - Only show for table view */}
                {viewMode === "table" && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-gray-600">
                        Showing {startIndex + 1} to{" "}
                        {Math.min(endIndex, filteredPackages.length)} of{" "}
                        {filteredPackages.length} packages
                      </p>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={handleItemsPerPageChange}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>
                  </div>
                )}

                {/* Cards View */}
                {viewMode === "cards" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredPackages.map((pkg, index) => (
                      <div
                        key={pkg.package_id}
                        className="animate-slide-up-stagger"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <Card className="bg-white border border-gray-200 overflow-hidden group flex flex-col h-full">
                          {/* Header Section */}
                          <div className="bg-gradient-to-r from-[#E6F4F1] to-[#D1E8E3] p-6 border-b border-[#028A75]/20 relative">
                            <div className="flex justify-between items-start mb-4">
                              {editingPackage === pkg.package_id ? (
                                <div className="flex-1">
                                  <Input
                                    value={editForm.package_title}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        package_title: e.target.value,
                                      }))
                                    }
                                    className="text-xl font-bold text-[#028A75] bg-white border-[#028A75]/30 mb-2"
                                    placeholder="Package title"
                                  />
                                </div>
                              ) : (
                                <h3 className="text-xl font-bold text-[#028A75] line-clamp-2 flex-1 pr-4">
                                  {pkg.package_title}
                                </h3>
                              )}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      pkg.is_active ? "default" : "secondary"
                                    }
                                    className={`${pkg.is_active ? "bg-[#E6F4F1] text-[#028A75] hover:bg-[#D1E8E3]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                                  >
                                    {pkg.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                  <Badge
                                    variant={
                                      pkg.event_type_names &&
                                      pkg.event_type_names.length > 0
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className={`${
                                      pkg.event_type_names &&
                                      pkg.event_type_names.length > 0
                                        ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
                                    } cursor-pointer`}
                                    onClick={() =>
                                      handleEventTypeEdit(
                                        pkg.package_id,
                                        pkg.event_type_ids || []
                                      )
                                    }
                                  >
                                    {pkg.event_type_names &&
                                    pkg.event_type_names.length > 0
                                      ? pkg.event_type_names[0]
                                      : "No Event Type"}
                                  </Badge>
                                </div>

                                {/* 3-Dot Menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-[#028A75]/10"
                                    >
                                      <MoreVertical className="h-4 w-4 text-[#028A75]" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-48"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => handleEditClick(pkg)}
                                      className="cursor-pointer"
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Quick Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleEventTypeEdit(
                                          pkg.package_id,
                                          pkg.event_type_ids || []
                                        )
                                      }
                                      className="cursor-pointer"
                                    >
                                      <Tag className="h-4 w-4 mr-2" />
                                      Edit Event Types
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDuplicatePackage(pkg.package_id)
                                      }
                                      className="cursor-pointer"
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Duplicate Package
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDeletePackage(pkg.package_id)
                                      }
                                      className="cursor-pointer text-red-600 focus:text-red-600"
                                      disabled={!pkg.is_active}
                                    >
                                      <Trash className="h-4 w-4 mr-2" />
                                      Delete Package
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {editingPackage === pkg.package_id ? (
                              <div className="space-y-3">
                                <Input
                                  type="number"
                                  value={editForm.package_price}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      package_price: e.target.value,
                                    }))
                                  }
                                  className="text-2xl font-bold text-[#028A75] bg-white border-[#028A75]/30"
                                  placeholder="Price"
                                />
                                <Input
                                  type="number"
                                  value={editForm.guest_capacity}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      guest_capacity:
                                        parseInt(e.target.value) || 0,
                                    }))
                                  }
                                  className="bg-white border-[#028A75]/30"
                                  placeholder="Guest capacity"
                                />
                                <Textarea
                                  value={editForm.package_description}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      package_description: e.target.value,
                                    }))
                                  }
                                  className="bg-white border-[#028A75]/30"
                                  placeholder="Package description"
                                  rows={3}
                                />
                              </div>
                            ) : (
                              <>
                                <div className="text-3xl font-bold text-[#028A75] mb-3">
                                  ₱
                                  {parseFloat(
                                    pkg.package_price.toString()
                                  ).toLocaleString()}
                                </div>
                                <p className="text-gray-600 text-sm line-clamp-2">
                                  {pkg.package_description ||
                                    "No description provided"}
                                </p>
                              </>
                            )}

                            <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {pkg.created_by_name || "Unknown"}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(pkg.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* Main Content */}
                          <CardContent className="p-6 flex-1 flex flex-col">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                              <div className="bg-gray-50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-gray-800 mb-1">
                                  {pkg.guest_capacity}
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                  Max Guests
                                </div>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-gray-800 mb-1">
                                  {pkg.component_count || 0}
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                  Components
                                </div>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-gray-800 mb-1">
                                  {pkg.venue_count || 0}
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                  Venues
                                </div>
                              </div>
                            </div>

                            {/* Inclusions */}
                            <div className="mb-6">
                              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-[#028A75]" />
                                Inclusions
                              </h4>
                              {pkg.inclusions && pkg.inclusions.length > 0 ? (
                                <div className="space-y-2">
                                  {pkg.inclusions
                                    .slice(0, 3)
                                    .map((item: string, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-start text-sm"
                                      >
                                        <Check className="h-4 w-4 text-[#028A75] mr-2 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-700 line-clamp-1">
                                          {item}
                                        </span>
                                      </div>
                                    ))}
                                  {pkg.inclusions.length > 3 && (
                                    <div className="text-sm text-gray-500 ml-6">
                                      +{pkg.inclusions.length - 3} more items...
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm">
                                  No inclusions specified
                                </p>
                              )}
                            </div>

                            {/* Freebies */}
                            <div className="mb-6">
                              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Gift className="h-4 w-4 text-blue-600" />
                                Freebies
                              </h4>
                              {pkg.freebies && pkg.freebies.length > 0 ? (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">
                                    {pkg.freebie_count || pkg.freebies.length}{" "}
                                    items
                                  </span>
                                  {pkg.freebies.length > 0 && (
                                    <span className="text-gray-500">
                                      {" "}
                                      including{" "}
                                      {pkg.freebies.slice(0, 2).join(", ")}
                                      {pkg.freebies.length > 2 &&
                                        ", and more..."}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm">
                                  No freebies specified
                                </p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-auto pt-6">
                              {editingPackage === pkg.package_id ? (
                                <div className="flex gap-3">
                                  <Button
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                    className="flex-1 bg-[#028A75] hover:bg-[#027A65] text-white rounded-xl py-3 font-medium transition-all duration-300"
                                  >
                                    <Save className="h-4 w-4 mr-2" />
                                    {isSaving ? "Saving..." : "Save Changes"}
                                  </Button>
                                  <Button
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    variant="outline"
                                    className="flex-1 border-gray-300 hover:bg-gray-50 rounded-xl py-3 font-medium"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={() =>
                                    router.push(
                                      `/admin/packages/${pkg.package_id}`
                                    )
                                  }
                                  className="w-full bg-[#028A75] hover:bg-[#027A65] text-white rounded-xl py-3 font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                )}

                {/* Table View */}
                {viewMode === "table" && (
                  <div className="space-y-6">
                    {/* Table */}
                    <Card className="bg-white border border-gray-200">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort("package_title")}
                              >
                                <div className="flex items-center gap-2">
                                  Package Name
                                  {sortField === "package_title" && (
                                    <span className="text-[#028A75]">
                                      {sortDirection === "asc" ? "↑" : "↓"}
                                    </span>
                                  )}
                                </div>
                              </TableHead>
                              <TableHead
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort("package_price")}
                              >
                                <div className="flex items-center gap-2">
                                  Price
                                  {sortField === "package_price" && (
                                    <span className="text-[#028A75]">
                                      {sortDirection === "asc" ? "↑" : "↓"}
                                    </span>
                                  )}
                                </div>
                              </TableHead>
                              <TableHead
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort("guest_capacity")}
                              >
                                <div className="flex items-center gap-2">
                                  Capacity
                                  {sortField === "guest_capacity" && (
                                    <span className="text-[#028A75]">
                                      {sortDirection === "asc" ? "↑" : "↓"}
                                    </span>
                                  )}
                                </div>
                              </TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Event Types</TableHead>
                              <TableHead>Components</TableHead>
                              <TableHead
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort("created_at")}
                              >
                                <div className="flex items-center gap-2">
                                  Created
                                  {sortField === "created_at" && (
                                    <span className="text-[#028A75]">
                                      {sortDirection === "asc" ? "↑" : "↓"}
                                    </span>
                                  )}
                                </div>
                              </TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentPackages.map((pkg) => (
                              <TableRow
                                key={pkg.package_id}
                                className="hover:bg-gray-50"
                              >
                                <TableCell className="font-medium">
                                  <div className="space-y-1">
                                    <div className="font-semibold text-gray-900">
                                      {pkg.package_title}
                                    </div>
                                    <div className="text-sm text-gray-500 line-clamp-1">
                                      {pkg.package_description ||
                                        "No description"}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-bold text-[#028A75]">
                                    ₱
                                    {parseFloat(
                                      pkg.package_price.toString()
                                    ).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium">
                                      {pkg.guest_capacity}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      pkg.is_active ? "default" : "secondary"
                                    }
                                    className={`${
                                      pkg.is_active
                                        ? "bg-[#E6F4F1] text-[#028A75] hover:bg-[#D1E8E3]"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                  >
                                    {pkg.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {pkg.event_type_names &&
                                  pkg.event_type_names.length > 0 ? (
                                    <Badge
                                      variant="secondary"
                                      className="bg-blue-100 text-blue-800"
                                    >
                                      {pkg.event_type_names[0]}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-gray-400">
                                      No event type
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">
                                      {pkg.component_count || 0} components
                                    </span>
                                    {pkg.venue_count && (
                                      <span className="text-xs text-gray-400">
                                        • {pkg.venue_count} venues
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm text-gray-600">
                                    {new Date(
                                      pkg.created_at
                                    ).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    by {pkg.created_by_name || "Unknown"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-gray-100"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-48"
                                    >
                                      <DropdownMenuItem
                                        onClick={() =>
                                          router.push(
                                            `/admin/packages/${pkg.package_id}`
                                          )
                                        }
                                        className="cursor-pointer"
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleEditClick(pkg)}
                                        className="cursor-pointer"
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          router.push(
                                            `/admin/packages/package-builder/edit/${pkg.package_id}`
                                          )
                                        }
                                        className="cursor-pointer"
                                      >
                                        <Settings className="h-4 w-4 mr-2" />
                                        Full Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleEventTypeEdit(
                                            pkg.package_id,
                                            pkg.event_type_ids || []
                                          )
                                        }
                                        className="cursor-pointer"
                                      >
                                        <Tag className="h-4 w-4 mr-2" />
                                        Edit Event Types
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDuplicatePackage(pkg.package_id)
                                        }
                                        className="cursor-pointer"
                                      >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Duplicate Package
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDeletePackage(pkg.package_id)
                                        }
                                        className="cursor-pointer text-red-600 focus:text-red-600"
                                        disabled={!pkg.is_active}
                                      >
                                        <Trash className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (currentPage > 1) {
                                    handlePageChange(currentPage - 1);
                                  }
                                }}
                                className={
                                  currentPage <= 1
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>

                            {/* Page Numbers */}
                            {Array.from(
                              { length: Math.min(5, totalPages) },
                              (_, i) => {
                                let pageNumber;
                                if (totalPages <= 5) {
                                  pageNumber = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNumber = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNumber = totalPages - 4 + i;
                                } else {
                                  pageNumber = currentPage - 2 + i;
                                }

                                return (
                                  <PaginationItem key={pageNumber}>
                                    <PaginationLink
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handlePageChange(pageNumber);
                                      }}
                                      isActive={currentPage === pageNumber}
                                      className="cursor-pointer"
                                    >
                                      {pageNumber}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              }
                            )}

                            {totalPages > 5 && currentPage < totalPages - 2 && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}

                            <PaginationItem>
                              <PaginationNext
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (currentPage < totalPages) {
                                    handlePageChange(currentPage + 1);
                                  }
                                }}
                                className={
                                  currentPage >= totalPages
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Empty State */
              <div className="text-center py-20 animate-slide-up">
                <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Package className="h-12 w-12 text-gray-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {filters.search ||
                  filters.status ||
                  filters.priceRange ||
                  filters.capacity
                    ? "No packages found"
                    : "No packages yet!"}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {filters.search ||
                  filters.status ||
                  filters.priceRange ||
                  filters.capacity
                    ? "Try adjusting your filters to see more results."
                    : "Create your first package to offer to clients and start growing your business."}
                </p>
                {!(
                  filters.search ||
                  filters.status ||
                  filters.priceRange ||
                  filters.capacity
                ) && (
                  <Link href="/admin/packages/package-builder">
                    <Button
                      size="lg"
                      className="bg-[#028A75] hover:bg-[#027A65] text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create Your First Package
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={() =>
            setConfirmationModal((prev) => ({ ...prev, isOpen: false }))
          }
          onConfirm={confirmationModal.onConfirm}
          title={confirmationModal.title}
          description={confirmationModal.description}
          variant={confirmationModal.variant}
        />

        {/* Event Type Selector Modal */}
        <EventTypeSelector
          isOpen={eventTypeModal.isOpen}
          onClose={() =>
            setEventTypeModal((prev) => ({ ...prev, isOpen: false }))
          }
          onSave={handleEventTypeSave}
          currentTypes={eventTypeModal.currentTypes}
        />

        {/* Custom CSS for animations */}
        <style jsx>{`
          @keyframes slide-up {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slide-down {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-slide-up {
            animation: slide-up 0.6s ease-out;
          }

          .animate-slide-up-delay-1 {
            animation: slide-up 0.6s ease-out 0.1s both;
          }

          .animate-slide-up-delay-2 {
            animation: slide-up 0.6s ease-out 0.2s both;
          }

          .animate-slide-up-delay-3 {
            animation: slide-up 0.6s ease-out 0.3s both;
          }

          .animate-slide-up-stagger {
            animation: slide-up 0.6s ease-out both;
          }

          .animate-slide-down {
            animation: slide-down 0.3s ease-out;
          }

          .line-clamp-1 {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      </div>
    </div>
  );
}
