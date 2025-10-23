"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Star,
  MapPin,
  Phone,
  Mail,
  FileText,
  Users,
  Upload,
  X,
  Download,
  Send,
  AlertCircle,
  CheckCircle,
  Copy,
  Key,
  RefreshCw,
  MoreVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Supplier {
  supplier_id: number;
  business_name: string;
  contact_person: string;
  contact_number: string;
  contact_email: string;
  business_address: string;
  supplier_type: "internal" | "external";
  specialty_category: string;
  agreement_signed: boolean;
  is_verified: boolean;
  is_active: boolean;
  rating_average: number;
  total_ratings: number;
  total_offers: number;
  registration_docs: any[];
  created_at: string;
  supplier_pfp?: string;
  onboarding_status?:
    | "pending"
    | "documents_uploaded"
    | "verified"
    | "active"
    | "suspended";
  last_activity?: string;
  business_description?: string;
  user_id?: number;
}

interface DocumentType {
  type_code: string;
  type_name: string;
  description: string;
  is_required: boolean;
  max_file_size_mb: number;
  allowed_extensions: string[];
}

interface SupplierDocument {
  document_id: number;
  document_type: string;
  document_title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  upload_date: string;
  is_verified: boolean;
  verified_at?: string;
  verified_by?: number;
  verification_notes?: string;
}

interface SupplierTier {
  name: string;
  price: number | "";
  description?: string;
}

interface SupplierStats {
  total_suppliers: number;
  internal_suppliers: number;
  external_suppliers: number;
  verified_suppliers: number;
  overall_avg_rating: number;
  category_breakdown: { specialty_category: string; supplier_count: number }[];
}

interface FilterState {
  search: string;
  supplier_type: string;
  specialty_category: string;
  is_verified: string;
  onboarding_status: string;
}

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"view" | "edit" | "add">("view");
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Filters and pagination
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    supplier_type: "",
    specialty_category: "",
    is_verified: "",
    onboarding_status: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch suppliers
  const fetchSuppliers = useCallback(
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

        const response = await axios.get(
          `${endpoints.admin}?operation=getAllSuppliers&${queryParams}`
        );
        const data = response.data;

        if (data.status === "success") {
          setSuppliers(data.suppliers || []);
          setTotalPages(data.pagination?.total_pages || 1);
        } else {
          console.error("API Error:", data.message);
          setError(data.message || "Failed to fetch suppliers");
        }
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      currentPage,
      filters.supplier_type,
      filters.specialty_category,
      filters.is_verified,
      filters.onboarding_status,
    ]
  );

  // Fetch metadata including document types
  const fetchMetadata = async () => {
    try {
      const [categoriesRes, statsRes, docTypesRes] = await Promise.all([
        axios.get(`${endpoints.admin}?operation=getSupplierCategories`),
        axios.get(`${endpoints.admin}?operation=getSupplierStats`),
        axios.get(`${endpoints.admin}?operation=getDocumentTypes`),
      ]);

      const categoriesData = categoriesRes.data;
      const statsData = statsRes.data;
      const docTypesData = docTypesRes.data;

      if (categoriesData.status === "success") {
        // Ensure categories is an array of strings
        const validCategories = Array.isArray(categoriesData.categories)
          ? categoriesData.categories.filter(
              (cat: any) => typeof cat === "string"
            )
          : [];
        setCategories(validCategories);
      }
      if (statsData.status === "success") {
        // Ensure category_breakdown is properly formatted
        const formattedStats = {
          ...statsData.stats,
          category_breakdown: Array.isArray(statsData.stats.category_breakdown)
            ? statsData.stats.category_breakdown
            : [],
        };
        setStats(formattedStats);
      }
      if (docTypesData.status === "success") {
        setDocumentTypes(docTypesData.document_types);
      }
    } catch (error) {
      console.error("Error fetching metadata:", error);
      setError("Failed to load supplier metadata");
    }
  };

  // Effect for filters (immediate)
  useEffect(() => {
    if (
      filters.supplier_type ||
      filters.specialty_category ||
      filters.is_verified ||
      filters.onboarding_status
    ) {
      fetchSuppliers();
    }
  }, [
    filters.supplier_type,
    filters.specialty_category,
    filters.is_verified,
    filters.onboarding_status,
    fetchSuppliers,
  ]);

  // Effect for pagination
  useEffect(() => {
    fetchSuppliers();
  }, [currentPage, fetchSuppliers]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Manual search function
  const handleSearch = () => {
    setCurrentPage(1);
    fetchSuppliers(filters.search);
  };

  // Handle Enter key in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key !== "search") {
      setCurrentPage(1);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: "",
      supplier_type: "",
      specialty_category: "",
      is_verified: "",
      onboarding_status: "",
    });
    setCurrentPage(1);
  };

  // Checkbox handlers
  const handleSelectAll = (checked: boolean | string) => {
    const isChecked = checked === true;
    setSelectAll(isChecked);
    if (isChecked) {
      setSelectedSuppliers(suppliers.map((supplier) => supplier.supplier_id));
    } else {
      setSelectedSuppliers([]);
    }
  };

  const handleSelectSupplier = (
    supplierId: number,
    checked: boolean | string
  ) => {
    const isChecked = checked === true;
    if (isChecked) {
      setSelectedSuppliers((prev) => [...prev, supplierId]);
    } else {
      setSelectedSuppliers((prev) => prev.filter((id) => id !== supplierId));
    }
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedSuppliers.length === 0) {
      toast.error("No suppliers selected - Please select suppliers to delete");
      return;
    }
    // Implement bulk delete logic here
    toast.success(`Deleting ${selectedSuppliers.length} suppliers...`);
  };

  const handleBulkExport = () => {
    if (selectedSuppliers.length === 0) {
      toast.error("No suppliers selected - Please select suppliers to export");
      return;
    }
    // Implement bulk export logic here
    toast.success(`Exporting ${selectedSuppliers.length} suppliers...`);
  };

  // Handle supplier actions
  const handleViewSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setViewMode("view");
    setShowAddModal(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setViewMode("edit");
    setShowAddModal(true);
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setViewMode("add");
    setShowAddModal(true);
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;

    try {
      const response = await axios.post(
        endpoints.admin,
        { operation: "deleteSupplier", supplier_id: supplierId },
        { headers: { "Content-Type": "application/json" } }
      );
      const data = response.data;

      if (data.status === "success") {
        fetchSuppliers();
        toast.success("Supplier deleted successfully");
      } else {
        toast.error(data.message || "Failed to delete supplier");
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("Failed to delete supplier");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getSupplierTypeColor = (type: string) => {
    return type === "internal"
      ? "bg-blue-100 text-blue-800"
      : "bg-green-100 text-green-800";
  };

  const getVerificationColor = (verified: boolean) => {
    return verified
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";
  };

  const getOnboardingStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      documents_uploaded: "bg-blue-100 text-blue-800",
      verified: "bg-green-100 text-green-800",
      active: "bg-emerald-100 text-emerald-800",
      suspended: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#028A75] mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading suppliers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-lg font-semibold mb-2">Error</div>
            <div className="text-gray-600">{error}</div>
            <button
              onClick={() => {
                setError(null);
                fetchMetadata();
              }}
              className="mt-4 px-4 py-2 bg-[#028A75] text-white rounded hover:bg-[#027a68]"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Supplier Management
          </h1>
          <p className="text-gray-600">
            Manage your event suppliers and their offerings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchSuppliers()}
            variant="outline"
            className="bg-white border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleAddSupplier}
            className="bg-[#028A75] hover:bg-[#027a68] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-[#028A75]" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">
                    Total Suppliers
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_suppliers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Internal</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.internal_suppliers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">External</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.external_suppliers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Verified</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.verified_suppliers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Star className="w-8 h-8 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">
                    Avg Rating
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(stats.overall_avg_rating || 0).toFixed(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border mb-6">
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
                  placeholder="Search suppliers... (Press Enter)"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={filters.supplier_type}
                onChange={(e) =>
                  handleFilterChange("supplier_type", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75]"
              >
                <option value="">All Types</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={filters.specialty_category}
                onChange={(e) =>
                  handleFilterChange("specialty_category", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75]"
              >
                <option value="">All Categories</option>
                {categories.map((category, index) => (
                  <option
                    key={`filter-category-${index}-${category}`}
                    value={String(category)}
                  >
                    {String(category)}
                  </option>
                ))}
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
      {selectedSuppliers.length > 0 && (
        <Card className="border mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedSuppliers.length} supplier(s) selected
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

      {/* Suppliers Table */}
      <Card className="border">
        <CardHeader>
          <CardTitle>Suppliers ({suppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto overflow-y-visible">
            <style jsx>{`
              div::-webkit-scrollbar {
                height: 8px;
              }
              div::-webkit-scrollbar-track {
                background: #f3f4f6;
                border-radius: 4px;
              }
              div::-webkit-scrollbar-thumb {
                background: #d1d5db;
                border-radius: 4px;
              }
              div::-webkit-scrollbar-thumb:hover {
                background: #9ca3af;
              }
            `}</style>
            <table className="w-full text-sm" style={{ minWidth: "1200px" }}>
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left py-3 px-4 w-16 min-w-[64px]">
                    Profile
                  </th>
                  <th className="text-left py-3 px-4 w-48 min-w-[192px]">
                    Business Name
                  </th>
                  <th className="text-left py-3 px-4 w-40 min-w-[160px]">
                    Contact Person
                  </th>
                  <th className="text-left py-3 px-4 w-32 min-w-[128px]">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 w-32 min-w-[128px]">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 w-32 min-w-[128px]">
                    Verification
                  </th>
                  <th className="text-left py-3 px-4 w-32 min-w-[128px]">
                    Onboarding
                  </th>
                  <th className="text-left py-3 px-4 w-24 min-w-[96px]">
                    Rating
                  </th>
                  <th className="text-left py-3 px-4 w-24 min-w-[96px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.supplier_id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <Checkbox
                        checked={selectedSuppliers.includes(
                          supplier.supplier_id
                        )}
                        onCheckedChange={(checked: boolean | string) =>
                          handleSelectSupplier(supplier.supplier_id, checked)
                        }
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={
                            supplier.supplier_pfp
                              ? `${endpoints.serveImage}?path=${supplier.supplier_pfp}`
                              : undefined
                          }
                          alt={supplier.business_name}
                        />
                        <AvatarFallback>
                          {supplier.business_name
                            .split(" ")
                            .map((word) => word.charAt(0))
                            .join("")
                            .toUpperCase()
                            .substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium whitespace-nowrap">
                          {String(supplier.business_name || "")}
                        </div>
                        <div
                          className="text-gray-500 text-xs truncate max-w-[180px]"
                          title={supplier.contact_email}
                        >
                          {String(supplier.contact_email || "")}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="whitespace-nowrap">
                          {String(supplier.contact_person || "")}
                        </div>
                        <div className="text-gray-500 text-xs whitespace-nowrap">
                          {String(supplier.contact_number || "")}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${getSupplierTypeColor(supplier.supplier_type)}`}
                      >
                        {String(supplier.supplier_type || "")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="whitespace-nowrap">
                        {String(supplier.specialty_category || "")}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${getVerificationColor(supplier.is_verified)}`}
                      >
                        {supplier.is_verified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${getOnboardingStatusColor(supplier.onboarding_status || "pending")}`}
                      >
                        {supplier.onboarding_status || "pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center whitespace-nowrap">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span>
                          {Number(supplier.rating_average || 0).toFixed(1)}
                        </span>
                        <span className="text-gray-500 ml-1">
                          ({Number(supplier.total_ratings || 0)})
                        </span>
                      </div>
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
                            onClick={() => handleViewSupplier(supplier)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditSupplier(supplier)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                              handleDeleteSupplier(supplier.supplier_id)
                            }
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

      {/* Enhanced Modal */}
      {showAddModal && (
        <EnhancedSupplierModal
          supplier={selectedSupplier}
          mode={viewMode}
          categories={categories}
          documentTypes={documentTypes}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchSuppliers();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

// Enhanced Supplier Modal Component
interface EnhancedSupplierModalProps {
  supplier: Supplier | null;
  mode: "view" | "edit" | "add";
  categories: string[];
  documentTypes: DocumentType[];
  onClose: () => void;
  onSuccess: () => void;
}

function EnhancedSupplierModal({
  supplier,
  mode,
  categories,
  documentTypes,
  onClose,
  onSuccess,
}: EnhancedSupplierModalProps) {
  const [formData, setFormData] = useState({
    business_name: "",
    contact_person: "",
    contact_number: "",
    contact_email: "",
    business_address: "",
    supplier_type: "external",
    specialty_category: "",
    business_description: "",
    agreement_signed: false,
    is_verified: false,
    send_email: true,
    create_user_account: false,
  });

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<
    string | null
  >(null);

  const [documents, setDocuments] = useState<{ [key: string]: File | null }>(
    {}
  );
  const [uploadedDocuments, setUploadedDocuments] = useState<
    SupplierDocument[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    username: string;
    password: string;
    email_sent: boolean;
  } | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);

  // Pricing tiers state
  const [tiers, setTiers] = useState<SupplierTier[]>([]);
  const [supplierOffers, setSupplierOffers] = useState<any[]>([]);

  // Auto-generate username based on business name
  const generateUsername = (businessName: string) => {
    return (
      businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 15) + Math.floor(Math.random() * 1000)
    );
  };

  // Auto-generate secure password
  const generatePassword = () => {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  useEffect(() => {
    if (supplier) {
      setFormData({
        business_name: supplier.business_name || "",
        contact_person: supplier.contact_person || "",
        contact_number: supplier.contact_number || "",
        contact_email: supplier.contact_email || "",
        business_address: supplier.business_address || "",
        supplier_type: supplier.supplier_type || "external",
        specialty_category: supplier.specialty_category || "",
        business_description: supplier.business_description || "",
        agreement_signed: supplier.agreement_signed || false,
        is_verified: supplier.is_verified || false,
        send_email: true,
        create_user_account: supplier.supplier_type === "internal",
      });

      // Set profile picture preview if exists
      if (supplier.supplier_pfp) {
        setProfilePicturePreview(
          `${endpoints.serveImage}?path=${supplier.supplier_pfp}`
        );
      }

      // Parse existing tiers from registration_docs if present
      try {
        const docs: any = supplier.registration_docs as any;
        let parsed: any = docs;
        if (typeof docs === "string") {
          parsed = JSON.parse(docs);
        }
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const docTiers = parsed.tiers;
          if (Array.isArray(docTiers)) {
            const normalized: SupplierTier[] = docTiers.map((t: any) => ({
              name: String(t.name ?? t.tier_name ?? ""),
              price:
                typeof t.price === "number"
                  ? t.price
                  : Number(t.price ?? t.tier_price ?? 0) || 0,
              description:
                typeof t.description === "string"
                  ? t.description
                  : String(t.tier_description ?? ""),
            }));
            setTiers(normalized);
          }
        }
      } catch {
        // ignore malformed docs
      }

      // Fetch existing documents and offers if editing
      if (mode === "edit" || mode === "view") {
        fetchSupplierDocuments(supplier.supplier_id);
        fetchSupplierOffers(supplier.supplier_id);
      }
    }
  }, [supplier, mode]);

  const fetchSupplierDocuments = async (supplierId: number) => {
    try {
      const response = await axios.get(
        `${endpoints.admin}?operation=getSupplierDocuments&supplier_id=${supplierId}`
      );
      const data = response.data;
      if (data.status === "success") {
        setUploadedDocuments(data.documents);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const fetchSupplierOffers = async (supplierId: number) => {
    try {
      const response = await axios.get(
        `${endpoints.admin}?operation=getSupplierById&supplier_id=${supplierId}`
      );
      const data = response.data;
      if (data.status === "success" && data.supplier.offers) {
        setSupplierOffers(data.supplier.offers);
        // Convert offers to tiers format
        const offersAsTiers: SupplierTier[] = data.supplier.offers.map(
          (offer: any) => ({
            name: offer.offer_title || "",
            price: offer.price_min || 0,
            description: offer.offer_description || "",
          })
        );
        setTiers(offersAsTiers);
      }
    } catch (error) {
      console.error("Error fetching supplier offers:", error);
    }
  };

  const handleFileChange = (documentType: string, file: File | null) => {
    setDocuments((prev) => ({
      ...prev,
      [documentType]: file,
    }));
  };

  // Image compression utility
  const compressImage = (
    file: File,
    maxWidth: number = 400,
    quality: number = 0.8
  ): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleProfilePictureChange = async (file: File | null) => {
    if (file) {
      try {
        // Show loading state
        setProfilePicturePreview("loading");

        // Compress the image
        const compressedFile = await compressImage(file, 400, 0.8);

        // Update state with compressed file
        setProfilePicture(compressedFile);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setProfilePicturePreview(e.target?.result as string);
        };
        reader.readAsDataURL(compressedFile);

        // Show compression info
        const originalSize = (file.size / 1024 / 1024).toFixed(2);
        const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
        const savings = (
          ((file.size - compressedFile.size) / file.size) *
          100
        ).toFixed(1);

        toast.success(
          `Image compressed! Size reduced from ${originalSize}MB to ${compressedSize}MB (${savings}% savings)`
        );
      } catch (error) {
        console.error("Error compressing image:", error);
        toast.error("Failed to compress image. Using original file.");

        // Fallback to original file
        setProfilePicture(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setProfilePicturePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    } else {
      setProfilePicture(null);
      setProfilePicturePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create FormData for file uploads
      const formDataToSend = new FormData();

      // Add text fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.toString());
      });

      // Add pricing tiers under registration_docs
      const cleanedTiers: SupplierTier[] = (tiers || [])
        .map((t) => ({
          name: (t.name || "").trim(),
          price: typeof t.price === "number" ? t.price : Number(t.price),
          description: (t.description || "").trim(),
        }))
        .filter((t) => t.name && !Number.isNaN(t.price) && t.price >= 0);

      if (cleanedTiers.length > 0) {
        cleanedTiers.forEach((tier, index) => {
          formDataToSend.append(
            `registration_docs[tiers][${index}][name]`,
            tier.name
          );
          formDataToSend.append(
            `registration_docs[tiers][${index}][price]`,
            String(tier.price)
          );
          if (tier.description) {
            formDataToSend.append(
              `registration_docs[tiers][${index}][description]`,
              tier.description
            );
          }
        });
      }

      // Add files
      Object.entries(documents).forEach(([type, file]) => {
        if (file) {
          formDataToSend.append(`documents[${type}]`, file);
        }
      });

      // Add profile picture
      if (profilePicture) {
        formDataToSend.append("supplier_pfp", profilePicture);
      }

      // Build operation-specific request
      if (mode === "edit") {
        formDataToSend.append("operation", "updateSupplier");
        if (supplier?.supplier_id) {
          formDataToSend.append("supplier_id", String(supplier.supplier_id));
          console.log("Sending supplier ID:", supplier.supplier_id);
        } else {
          console.error("No supplier ID found for edit mode");
        }
      } else {
        formDataToSend.append("operation", "createSupplier");
      }

      const response = await axios.post(endpoints.admin, formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = response.data;

      // Debug logging
      console.log("API Response:", data);
      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      // Check if response is empty or invalid
      if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
        console.error("Empty or invalid API response:", data);
        toast.error("Server returned an empty response. Please try again.");
        return;
      }

      if (data.status === "success") {
        if (mode === "add" && data.credentials) {
          setGeneratedCredentials(data.credentials);
          setShowCredentials(true);
        }

        toast.success(
          mode === "edit"
            ? "Supplier updated successfully!"
            : "Supplier created successfully!"
        );

        if (!showCredentials) {
          onSuccess();
        }
      } else {
        console.error("API Error:", data);
        toast.error(data.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = mode === "view";

  // Credentials display modal
  if (showCredentials && generatedCredentials) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="text-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">
              Supplier Created Successfully!
            </h2>
            <p className="text-gray-600">
              Login credentials have been generated
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <div className="flex items-center mt-1">
                  <input
                    type="text"
                    value={generatedCredentials.username}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border rounded-l-lg"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(generatedCredentials.username)
                    }
                    className="px-3 py-2 bg-gray-200 border border-l-0 rounded-r-lg hover:bg-gray-300"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="flex items-center mt-1">
                  <input
                    type="text"
                    value={generatedCredentials.password}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border rounded-l-lg font-mono"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(generatedCredentials.password)
                    }
                    className="px-3 py-2 bg-gray-200 border border-l-0 rounded-r-lg hover:bg-gray-300"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {generatedCredentials.email_sent && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-800">
                  <Send className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    Email notification sent successfully!
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => {
                setShowCredentials(false);
                onSuccess();
              }}
              className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Sticky Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white rounded-t-lg sticky top-0 z-10">
          <h2 className="text-xl font-bold">
            {mode === "add"
              ? "Add New Supplier"
              : mode === "edit"
                ? "Edit Supplier"
                : "Supplier Details"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <Avatar className="h-20 w-20">
                    {profilePicturePreview === "loading" ? (
                      <div className="flex items-center justify-center h-full w-full bg-gray-100">
                        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                      </div>
                    ) : (
                      <AvatarImage
                        src={profilePicturePreview || undefined}
                        alt={formData.business_name || "Supplier"}
                      />
                    )}
                    <AvatarFallback className="text-lg">
                      {formData.business_name
                        ? formData.business_name
                            .split(" ")
                            .map((word) => word.charAt(0))
                            .join("")
                            .toUpperCase()
                            .substring(0, 2)
                        : "SP"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleProfilePictureChange(e.target.files?.[0] || null)
                    }
                    className="hidden"
                    id="profile-picture-upload"
                    disabled={isReadOnly}
                  />
                  <div className="flex items-center space-x-2">
                    <label
                      htmlFor="profile-picture-upload"
                      className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 ${
                        isReadOnly ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {profilePicture ? "Change Picture" : "Upload Picture"}
                    </label>
                    {profilePicture && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleProfilePictureChange(null)}
                        className="inline-flex items-center px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 200x200px, JPG/PNG format. Images will be
                    automatically compressed.
                  </p>
                  {profilePicture && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Image ready for upload (compressed)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        business_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                    required
                    readOnly={isReadOnly}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contact_person: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                    required
                    readOnly={isReadOnly}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Contact Number *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_number}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contact_number: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                    required
                    readOnly={isReadOnly}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contact_email: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                    required
                    readOnly={isReadOnly}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Supplier Type
                  </label>
                  <select
                    value={formData.supplier_type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        supplier_type: e.target.value as
                          | "internal"
                          | "external",
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                    disabled={isReadOnly}
                  >
                    <option value="external">External</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Specialty Category
                  </label>
                  <select
                    value={formData.specialty_category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        specialty_category: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                    disabled={isReadOnly}
                  >
                    <option value="">Select Category</option>
                    {categories.map((category, index) => (
                      <option
                        key={`modal-category-${index}-${category}`}
                        value={String(category)}
                      >
                        {String(category)}
                      </option>
                    ))}
                    <option value="Catering">Catering</option>
                    <option value="Photography">Photography</option>
                    <option value="Floral Design">Floral Design</option>
                    <option value="Audio Visual">Audio Visual</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">
                  Business Address
                </label>
                <textarea
                  value={formData.business_address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      business_address: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                  rows={3}
                  readOnly={isReadOnly}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">
                  Business Description
                </label>
                <textarea
                  value={formData.business_description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      business_description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                  rows={3}
                  readOnly={isReadOnly}
                  placeholder="Brief description of services and expertise..."
                />
              </div>
            </div>

            {/* Current Offers (View Mode) */}
            {mode === "view" && supplierOffers.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Current Offers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {supplierOffers.map((offer, index) => (
                    <div
                      key={`supplier-offer-${index}`}
                      className="bg-white p-4 rounded-lg border"
                    >
                      <div className="font-medium text-lg">
                        {offer.offer_title}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {offer.offer_description}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        ₱{Number(offer.price_min).toLocaleString()}
                        {offer.price_max &&
                          offer.price_max !== offer.price_min &&
                          ` - ₱${Number(offer.price_max).toLocaleString()}`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Tier Level: {offer.tier_level} | Category:{" "}
                        {offer.service_category}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Tiers */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {mode === "view" ? "Pricing Tiers" : "Pricing Tiers"}
                </h3>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() =>
                      setTiers((prev) => [
                        ...prev,
                        { name: "", price: "", description: "" },
                      ])
                    }
                    className="inline-flex items-center px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Tier
                  </button>
                )}
              </div>

              {tiers.length === 0 && (
                <p className="text-sm text-gray-600">
                  No tiers yet.{" "}
                  {isReadOnly ? "" : "Click Add Tier to create one."}
                </p>
              )}

              <div className="space-y-3">
                {tiers.map((tier, index) => (
                  <div
                    key={`supplier-tier-${index}`}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-3 border rounded-lg"
                  >
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium mb-1">
                        Tier Name
                      </label>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTiers((prev) =>
                            prev.map((t, i) =>
                              i === index ? { ...t, name: value } : t
                            )
                          );
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                        readOnly={isReadOnly}
                        placeholder="e.g., Basic / Premium"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.price}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTiers((prev) =>
                            prev.map((t, i) =>
                              i === index
                                ? {
                                    ...t,
                                    price: value === "" ? "" : Number(value),
                                  }
                                : t
                            )
                          );
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                        readOnly={isReadOnly}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={tier.description || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTiers((prev) =>
                            prev.map((t, i) =>
                              i === index ? { ...t, description: value } : t
                            )
                          );
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                        readOnly={isReadOnly}
                        placeholder="Short notes (optional)"
                      />
                    </div>
                    {!isReadOnly && (
                      <div className="md:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() =>
                            setTiers((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                          className="px-3 py-2 border rounded text-red-600 hover:bg-red-50 w-full"
                          title="Remove tier"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Document Upload Section */}
            {mode === "add" && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Document Upload</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentTypes.map((docType) => (
                    <div
                      key={docType.type_code}
                      className="border rounded-lg p-4 bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium">
                          {docType.type_name}
                          {docType.is_required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        {docType.description}
                      </p>

                      <div className="relative">
                        <input
                          type="file"
                          onChange={(e) =>
                            handleFileChange(
                              docType.type_code,
                              e.target.files?.[0] || null
                            )
                          }
                          className="hidden"
                          id={`file-${docType.type_code}`}
                          accept={docType.allowed_extensions
                            .map((ext) => `.${ext}`)
                            .join(",")}
                        />
                        <label
                          htmlFor={`file-${docType.type_code}`}
                          className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-500 hover:bg-brand-50"
                        >
                          <Upload className="w-5 h-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">
                            {documents[docType.type_code]
                              ? documents[docType.type_code]?.name
                              : `Upload ${docType.type_name}`}
                          </span>
                        </label>
                      </div>

                      <p className="text-xs text-gray-500 mt-1">
                        Max size: {docType.max_file_size_mb}MB | Formats:{" "}
                        {docType.allowed_extensions.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Documents (Edit/View Mode) */}
            {(mode === "edit" || mode === "view") &&
              uploadedDocuments.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Uploaded Documents
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {uploadedDocuments.map((doc) => (
                      <div
                        key={doc.document_id}
                        className="flex items-center justify-between bg-white p-3 rounded-lg border"
                      >
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="font-medium">
                              {doc.document_title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {doc.file_name} •{" "}
                              {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {doc.is_verified ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                          )}
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-800"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Settings and Options */}
            {mode === "add" && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.create_user_account}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          create_user_account: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">
                      Create user account (enables portal access)
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.send_email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          send_email: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">
                      Send welcome email with credentials
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.agreement_signed}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          agreement_signed: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Agreement signed</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_verified}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_verified: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Mark as verified</span>
                  </label>
                </div>
              </div>
            )}

            {/* Status Checkboxes for Edit Mode */}
            {mode === "edit" && (
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.agreement_signed}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        agreement_signed: e.target.checked,
                      }))
                    }
                    className="mr-2"
                    disabled={isReadOnly}
                  />
                  Agreement Signed
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_verified}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_verified: e.target.checked,
                      }))
                    }
                    className="mr-2"
                    disabled={isReadOnly}
                  />
                  Verified
                </label>
              </div>
            )}
          </form>
        </div>

        {/* Sticky Footer */}
        {!isReadOnly && (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-white rounded-b-lg sticky bottom-0 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="flex items-center px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              {loading
                ? "Processing..."
                : mode === "edit"
                  ? "Update Supplier"
                  : "Create Supplier"}
            </button>
          </div>
        )}

        {/* View Mode Close Button */}
        {isReadOnly && (
          <div className="flex justify-end p-6 border-t border-gray-200 bg-white rounded-b-lg sticky bottom-0 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
