"use client";

import Link from "next/link";
import {
  Plus,
  MapPin,
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
  Building,
  Archive,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { endpoints } from "@/app/config/api";

// Image URL helper function
const getImageUrl = (imagePath: string | null) => {
  if (!imagePath) return null;
  const cleanPath = imagePath.startsWith("uploads/")
    ? imagePath
    : `uploads/${imagePath}`;
  return `${endpoints.serveImage}?path=${encodeURIComponent(cleanPath)}`;
};

// Define venue interface
interface VenueInclusion {
  inclusion_id: number;
  venue_id: number;
  inclusion_name: string;
  inclusion_price: number;
  inclusion_description: string;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  components: Array<{
    component_id: number;
    component_name: string;
    component_description: string;
  }>;
}

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_details: string;
  venue_location: string;
  venue_contact: string;
  venue_capacity: number;
  venue_type: string;
  venue_price: number;
  venue_profile_picture: string | null;
  venue_cover_photo: string | null;
  venue_status: string;
  inclusions: VenueInclusion[];
  is_active?: boolean;
  created_at?: string;
  created_by_name?: string;
  inclusion_count?: number;
}

interface FilterState {
  search: string;
  status: string;
  priceRange: string;
  capacity: string;
  type: string;
}

export default function VenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingVenue, setEditingVenue] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    venue_title: string;
    venue_details: string;
    venue_location: string;
    venue_contact: string;
    venue_capacity: number;
    venue_price: number;
  }>({
    venue_title: "",
    venue_details: "",
    venue_location: "",
    venue_contact: "",
    venue_capacity: 0,
    venue_price: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    priceRange: "",
    capacity: "",
    type: "",
  });

  useEffect(() => {
    // Fetch venues when component mounts
    fetchVenues();
  }, []);

  // Filter venues when filters or venues change
  useEffect(() => {
    let filtered = [...venues];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(
        (venue) =>
          venue.venue_title
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          venue.venue_details
            ?.toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          venue.venue_location
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          venue.created_by_name
            ?.toLowerCase()
            .includes(filters.search.toLowerCase())
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter((venue) => {
        if (filters.status === "active") return venue.is_active === true;
        if (filters.status === "inactive") return venue.is_active === false;
        return true;
      });
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter((venue) => {
        if (filters.type === "indoor") return venue.venue_type === "indoor";
        if (filters.type === "outdoor") return venue.venue_type === "outdoor";
        if (filters.type === "hybrid") return venue.venue_type === "hybrid";
        return true;
      });
    }

    // Price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split("-").map(Number);
      filtered = filtered.filter((venue) => {
        const price = venue.venue_price;
        if (max) {
          return price >= min && price <= max;
        }
        return price >= min;
      });
    }

    // Capacity filter
    if (filters.capacity) {
      const [min, max] = filters.capacity.split("-").map(Number);
      filtered = filtered.filter((venue) => {
        if (max) {
          return venue.venue_capacity >= min && venue.venue_capacity <= max;
        }
        return venue.venue_capacity >= min;
      });
    }

    setFilteredVenues(filtered);
  }, [venues, filters]);

  const fetchVenues = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(endpoints.admin, {
        params: { operation: "getAllVenues" },
      });

      if (response.data.status === "success") {
        setVenues(response.data.data || []);
      } else {
        console.error("Error fetching venues:", response.data.message);
        toast.error("Failed to fetch venues: " + response.data.message);
      }
    } catch (error) {
      console.error("API error:", error);
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVenue = async (venueId: number) => {
    if (confirm("Are you sure you want to delete this venue?")) {
      try {
        const response = await axios.post(endpoints.admin, {
          operation: "deleteVenue",
          venue_id: venueId,
        });

        if (response.data.status === "success") {
          toast.success(response.data.message || "Venue deleted successfully");
          // Refresh the list
          fetchVenues();
        } else {
          console.error("Delete error:", response.data.message);
          toast.error("Failed to delete venue: " + response.data.message);
        }
      } catch (error) {
        console.error("API error:", error);
        toast.error("Failed to connect to server");
      }
    }
  };

  const handleDuplicateVenue = async (venueId: number) => {
    if (
      confirm(
        "Are you sure you want to duplicate this venue? This will create a copy with all the same details."
      )
    ) {
      try {
        const response = await axios.post(endpoints.admin, {
          operation: "duplicateVenue",
          venue_id: venueId,
        });

        if (response.data.status === "success") {
          toast.success(
            response.data.message || "Venue duplicated successfully"
          );
          // Refresh the list
          fetchVenues();
        } else {
          console.error("Duplicate error:", response.data.message);
          toast.error("Failed to duplicate venue: " + response.data.message);
        }
      } catch (error) {
        console.error("API error:", error);
        toast.error("Failed to connect to server");
      }
    }
  };

  const handleEditClick = (venue: Venue) => {
    setEditForm({
      venue_title: venue.venue_title,
      venue_details: venue.venue_details || "",
      venue_location: venue.venue_location,
      venue_contact: venue.venue_contact,
      venue_capacity: venue.venue_capacity,
      venue_price: venue.venue_price,
    });
    setEditingVenue(venue.venue_id);
  };

  const handleCancelEdit = () => {
    setEditingVenue(null);
    setEditForm({
      venue_title: "",
      venue_details: "",
      venue_location: "",
      venue_contact: "",
      venue_capacity: 0,
      venue_price: 0,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingVenue) return;

    try {
      setIsSaving(true);
      const response = await axios.post(endpoints.admin, {
        operation: "updateVenue",
        venue_id: editingVenue,
        venue_title: editForm.venue_title,
        venue_details: editForm.venue_details,
        venue_location: editForm.venue_location,
        venue_contact: editForm.venue_contact,
        venue_capacity: editForm.venue_capacity,
        venue_price: editForm.venue_price,
      });

      if (response.data.status === "success") {
        toast.success("Venue updated successfully");
        setEditingVenue(null);
        fetchVenues();
      } else {
        console.error("Update error:", response.data.message);
        toast.error("Failed to update venue: " + response.data.message);
      }
    } catch (error) {
      console.error("API error:", error);
      toast.error("Failed to connect to server");
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
      type: "",
    });
  };

  const getStats = () => {
    const totalVenues = venues.length;
    const activeVenues = venues.filter((v) => v.is_active).length;
    const avgPrice =
      venues.length > 0
        ? Math.round(
            venues.reduce((sum, v) => sum + v.venue_price, 0) / venues.length
          )
        : 0;
    const maxCapacity =
      venues.length > 0 ? Math.max(...venues.map((v) => v.venue_capacity)) : 0;

    return { totalVenues, activeVenues, avgPrice, maxCapacity };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section with Slide-up Animation */}
        <div className="animate-slide-up mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Venue Management
              </h1>
              <p className="text-gray-600 text-lg">
                Manage and organize your event venues
              </p>
            </div>
            <Link href="/admin/venues/venue-builder">
              <Button
                size="lg"
                className="bg-[#028A75] hover:bg-[#027A65] text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Venue
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards with Slide-up Animation */}
        {!isLoading && venues.length > 0 && (
          <div className="animate-slide-up-delay-1 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Total Venues
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats.totalVenues}
                      </p>
                    </div>
                    <div className="bg-[#E6F4F1] p-3 rounded-xl">
                      <Building className="h-6 w-6 text-[#028A75]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Active Venues
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stats.activeVenues}
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-lg">
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

              <Card className="bg-white border-0 shadow-lg">
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
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search venues..."
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
                    filters.capacity ||
                    filters.type) && (
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
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                        Type
                      </Label>
                      <select
                        value={filters.type}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            type: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-transparent"
                      >
                        <option value="">All Types</option>
                        <option value="indoor">Indoor</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="hybrid">Hybrid</option>
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
              <p className="text-lg text-gray-600">Loading venues...</p>
            </div>
          </div>
        ) : (
          /* Venues Grid with Staggered Animation */
          <div className="animate-slide-up-delay-3">
            {filteredVenues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredVenues.map((venue, index) => (
                  <div
                    key={`venue-${venue.venue_id ?? index}`}
                    className="animate-slide-up-stagger"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Card className="bg-white border-0 shadow-lg overflow-hidden group flex flex-col h-full">
                      {/* Cover Photo Section */}
                      <div className="relative h-48 w-full overflow-hidden">
                        <div
                          className="h-full w-full bg-cover bg-center"
                          style={{
                            backgroundImage: venue.venue_cover_photo
                              ? `url(${getImageUrl(venue.venue_cover_photo)})`
                              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          }}
                        />
                        {/* 3-Dot Menu Overlay */}
                        <div className="absolute top-3 right-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 bg-white/80 hover:bg-white text-gray-700 hover:text-[#028A75] backdrop-blur-sm"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleEditClick(venue)}
                                className="cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Quick Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/admin/venues/venue-builder/${venue.venue_id}`
                                  )
                                }
                                className="cursor-pointer"
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Full Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDuplicateVenue(venue.venue_id)
                                }
                                className="cursor-pointer"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate Venue
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteVenue(venue.venue_id)
                                }
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                disabled={!venue.is_active}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete Venue
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Main Content */}
                      <CardContent className="p-6 flex-1 flex flex-col">
                        {/* Profile Picture and Title Section */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
                              {venue.venue_profile_picture ? (
                                <img
                                  src={
                                    getImageUrl(venue.venue_profile_picture) ||
                                    "/placeholder.jpg"
                                  }
                                  alt={venue.venue_title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-br from-[#028A75] to-[#027A65] flex items-center justify-center text-white font-bold text-lg">
                                  {venue.venue_title[0]}
                                </div>
                              )}
                            </div>
                            {/* Status Badge */}
                            <div className="absolute -top-1 -right-1">
                              <Badge
                                variant={
                                  venue.is_active ? "default" : "secondary"
                                }
                                className={`${venue.is_active ? "bg-[#E6F4F1] text-[#028A75] hover:bg-[#D1E8E3]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} text-xs px-2 py-1`}
                              >
                                {venue.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex-1">
                            {editingVenue === venue.venue_id ? (
                              <Input
                                value={editForm.venue_title}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    venue_title: e.target.value,
                                  }))
                                }
                                className="text-lg font-bold text-gray-900 bg-white border-[#028A75]/30 mb-2"
                                placeholder="Venue title"
                              />
                            ) : (
                              <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                                {venue.venue_title}
                              </h3>
                            )}
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-4 w-4 mr-1" />
                              {venue.venue_location}
                            </div>
                          </div>
                        </div>

                        {/* Quick Edit Form */}
                        {editingVenue === venue.venue_id && (
                          <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs font-medium text-gray-700 mb-1 block">
                                  Price
                                </Label>
                                <Input
                                  type="number"
                                  value={editForm.venue_price}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      venue_price:
                                        parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                  className="text-sm bg-white border-[#028A75]/30"
                                  placeholder="Price"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-gray-700 mb-1 block">
                                  Capacity
                                </Label>
                                <Input
                                  type="number"
                                  value={editForm.venue_capacity}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      venue_capacity:
                                        parseInt(e.target.value) || 0,
                                    }))
                                  }
                                  className="text-sm bg-white border-[#028A75]/30"
                                  placeholder="Capacity"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-gray-700 mb-1 block">
                                Description
                              </Label>
                              <Textarea
                                value={editForm.venue_details}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    venue_details: e.target.value,
                                  }))
                                }
                                className="text-sm bg-white border-[#028A75]/30"
                                placeholder="Venue description"
                                rows={2}
                              />
                            </div>
                          </div>
                        )}

                        {/* Venue Details */}
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center text-gray-600">
                              <Users className="h-4 w-4 mr-2" />
                              <span>Capacity</span>
                            </div>
                            <span className="font-medium text-gray-900">
                              {venue.venue_capacity.toLocaleString()} guests
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center text-gray-600">
                              <DollarSign className="h-4 w-4 mr-2" />
                              <span>Price</span>
                            </div>
                            <span className="font-medium text-gray-900">
                              ₱{venue.venue_price.toLocaleString()}
                            </span>
                          </div>
                          {venue.venue_type && (
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-gray-600">
                                <Building className="h-4 w-4 mr-2" />
                                <span>Type</span>
                              </div>
                              <span className="font-medium text-gray-900 capitalize">
                                {venue.venue_type}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Contact Info */}
                        {venue.venue_contact && (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-[#028A75]" />
                              Contact
                            </h4>
                            <p className="text-sm text-gray-600">
                              📞 {venue.venue_contact}
                            </p>
                          </div>
                        )}

                        {/* Inclusions Preview */}
                        {venue.inclusions && venue.inclusions.length > 0 && (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                              <Building className="h-4 w-4 text-blue-600" />
                              Inclusions
                            </h4>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">
                                {venue.inclusions.length} items
                              </span>
                              {venue.inclusions.length > 0 && (
                                <span className="text-gray-500">
                                  {" "}
                                  including{" "}
                                  {venue.inclusions
                                    .slice(0, 2)
                                    .map((inc) => inc.inclusion_name)
                                    .join(", ")}
                                  {venue.inclusions.length > 2 &&
                                    ", and more..."}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-auto pt-4">
                          {editingVenue === venue.venue_id ? (
                            <div className="flex gap-3">
                              <Button
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                                className="flex-1 bg-[#028A75] hover:bg-[#027A65] text-white rounded-xl py-2 font-medium transition-all duration-300 text-sm"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                {isSaving ? "Saving..." : "Save Changes"}
                              </Button>
                              <Button
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                variant="outline"
                                className="flex-1 border-gray-300 hover:bg-gray-50 rounded-xl py-2 font-medium text-sm"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() =>
                                router.push(`/admin/venues/${venue.venue_id}`)
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
            ) : (
              /* Empty State */
              <div className="text-center py-20 animate-slide-up">
                <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Building className="h-12 w-12 text-gray-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {filters.search ||
                  filters.status ||
                  filters.priceRange ||
                  filters.capacity ||
                  filters.type
                    ? "No venues found"
                    : "No venues yet!"}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {filters.search ||
                  filters.status ||
                  filters.priceRange ||
                  filters.capacity ||
                  filters.type
                    ? "Try adjusting your filters to see more results."
                    : "Create your first venue to offer to clients and start growing your business."}
                </p>
                {!(
                  filters.search ||
                  filters.status ||
                  filters.priceRange ||
                  filters.capacity ||
                  filters.type
                ) && (
                  <Link href="/admin/venues/venue-builder">
                    <Button
                      size="lg"
                      className="bg-[#028A75] hover:bg-[#027A65] text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create Your First Venue
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

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
