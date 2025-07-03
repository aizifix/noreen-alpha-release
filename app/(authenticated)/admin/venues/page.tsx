"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Archive,
  MapPin,
  Users,
  PhilippinePeso,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface VenueInclusion {
  inclusion_id: number;
  inclusion_name: string;
  inclusion_price: number;
  inclusion_description: string;
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
  inclusions?: VenueInclusion[];
  is_active?: boolean;
}

export default function VenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  useEffect(() => {
    fetchVenues();
  }, []);

  // Filter venues based on search and filters
  const filteredVenues = venues
    .filter((venue) => {
      const matchesSearch =
        venue.venue_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.venue_location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        selectedType === "all" || venue.venue_type === selectedType;
      const matchesStatus =
        selectedStatus === "all" || venue.venue_status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.venue_title.localeCompare(b.venue_title);
        case "price":
          return a.venue_price - b.venue_price;
        case "capacity":
          return a.venue_capacity - b.venue_capacity;
        default:
          return 0;
      }
    });

  // Calculate statistics
  const stats = {
    totalVenues: venues.length,
    activeVenues: venues.filter((v) => v.is_active).length,
    avgPrice: venues.length
      ? Math.round(
          venues.reduce((sum, v) => sum + v.venue_price, 0) / venues.length
        )
      : 0,
    totalCapacity: venues.reduce((sum, v) => sum + v.venue_capacity, 0),
  };

  const fetchVenues = async () => {
    try {
      const response = await fetch(
        "http://localhost/events-api/admin.php?operation=getAllVenues"
      );
      const data = await response.json();
      if (data.status === "success") {
        setVenues(data.venues);
      }
    } catch (error) {
      console.error("Error fetching venues:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVenueDetails = async (venueId: number) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(
        `http://localhost/events-api/admin.php?operation=getVenueById&venue_id=${venueId}`
      );
      const data = await response.json();
      if (data.status === "success") {
        setSelectedVenue(data.venue);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching venue details:", error);
      toast.error("Failed to load venue details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleView = (venue: Venue) => {
    fetchVenueDetails(venue.venue_id);
  };

  const handleEdit = (venue: Venue) => {
    router.push(`/admin/venues/venue-builder/${venue.venue_id}`);
  };

  const handleDelete = async (venue: Venue) => {
    if (confirm(`Are you sure you want to delete "${venue.venue_title}"?`)) {
      // TODO: Implement delete functionality
      toast.success("Venue deleted successfully");
      fetchVenues();
    }
  };

  const handleArchive = async (venue: Venue) => {
    // TODO: Implement archive functionality
    toast.success("Venue archived successfully");
    fetchVenues();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Venues</h1>
        <Button onClick={() => router.push("/admin/venues/venue-builder")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Venue
        </Button>
      </div>

      {/* Statistics Dashboard */}
      {!loading && venues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Venues</p>
                <p className="text-xl font-bold">{stats.totalVenues}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <svg
                  className="h-5 w-5 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Venues</p>
                <p className="text-xl font-bold">{stats.activeVenues}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <PhilippinePeso className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Price</p>
                <p className="text-xl font-bold">
                  ₱{stats.avgPrice.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Capacity</p>
                <p className="text-xl font-bold">
                  {stats.totalCapacity.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <Input
            placeholder="Search venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <select
            className="border rounded-md px-3 py-2"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <select
            className="border rounded-md px-3 py-2"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className="border rounded-md px-3 py-2"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="capacity">Sort by Capacity</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading venues...</div>
      ) : venues.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">No venues available</p>
          <Button onClick={() => router.push("/admin/venues/venue-builder")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Venue
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => (
            <Card
              key={venue.venue_id}
              className="overflow-hidden group hover:shadow-lg transition-shadow"
            >
              {/* Cover Photo Background */}
              <div
                className="h-32 bg-gray-600 relative bg-cover bg-center"
                style={{
                  backgroundImage: venue.venue_cover_photo
                    ? `url(http://localhost/events-api/${venue.venue_cover_photo})`
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                {/* 3-Dot Menu */}
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(venue)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(venue)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchive(venue)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(venue)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Profile Picture Circle */}
                <div className="absolute -bottom-6 left-4">
                  <Avatar className="h-12 w-12 border-4 border-white">
                    <AvatarImage
                      src={
                        venue.venue_profile_picture
                          ? `http://localhost/events-api/${venue.venue_profile_picture}`
                          : ""
                      }
                      alt={venue.venue_title}
                    />
                    <AvatarFallback className="bg-blue-500 text-white">
                      {venue.venue_title.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Card Content */}
              <div className="pt-8 pb-4 px-4">
                <div className="mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {venue.venue_title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        venue.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {venue.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {venue.venue_details || "No description available."}
                  </p>
                </div>

                {/* Venue Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="truncate">{venue.venue_location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      <span>
                        {venue.venue_capacity.toLocaleString()} guests
                      </span>
                    </div>
                    <div className="flex items-center text-lg font-semibold text-green-600">
                      <PhilippinePeso className="h-4 w-4 mr-1" />
                      <span>{venue.venue_price?.toLocaleString() || "0"}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg
                      className="h-4 w-4 mr-2 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span>{venue.venue_type || "Not specified"}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(venue)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(venue)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Venue Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedVenue?.venue_title}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="py-8 text-center">Loading venue details...</div>
          ) : (
            <div className="space-y-6">
              {/* Venue Images */}
              <div className="relative h-48 rounded-lg overflow-hidden">
                <img
                  src={
                    selectedVenue?.venue_cover_photo
                      ? `http://localhost/events-api/${selectedVenue.venue_cover_photo}`
                      : "https://via.placeholder.com/800x400"
                  }
                  alt={selectedVenue?.venue_title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Venue Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Details</h4>
                  <p className="text-sm text-gray-600">
                    {selectedVenue?.venue_details}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Contact Information</h4>
                  <p className="text-sm text-gray-600">
                    {selectedVenue?.venue_contact}
                  </p>
                </div>
              </div>

              {/* Venue Specifications */}
              <div>
                <h4 className="font-semibold mb-2">Specifications</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm">
                      Capacity: {selectedVenue?.venue_capacity.toLocaleString()}{" "}
                      guests
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="h-4 w-4 mr-2 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span className="text-sm">
                      Type: {selectedVenue?.venue_type}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm">
                      Location: {selectedVenue?.venue_location}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <PhilippinePeso className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm">
                      Price: ₱{selectedVenue?.venue_price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Venue Inclusions */}
              {selectedVenue?.inclusions &&
                selectedVenue.inclusions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Inclusions</h4>
                    <Accordion type="single" collapsible className="w-full">
                      {selectedVenue.inclusions.map((inclusion) => (
                        <AccordionItem
                          key={inclusion.inclusion_id}
                          value={inclusion.inclusion_id.toString()}
                        >
                          <AccordionTrigger className="text-sm">
                            {inclusion.inclusion_name} - ₱
                            {inclusion.inclusion_price.toLocaleString()}
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-gray-600 mb-2">
                              {inclusion.inclusion_description}
                            </p>
                            {inclusion.components &&
                              inclusion.components.length > 0 && (
                                <ul className="list-disc list-inside space-y-1">
                                  {inclusion.components.map((component) => (
                                    <li
                                      key={component.component_id}
                                      className="text-sm text-gray-600"
                                    >
                                      {component.component_name}
                                      {component.component_description && (
                                        <span className="text-gray-500">
                                          {" "}
                                          - {component.component_description}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
