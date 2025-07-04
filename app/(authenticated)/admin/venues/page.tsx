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
  ImageIcon,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
}

interface VenueEditForm {
  venue_title: string;
  venue_details: string;
  venue_location: string;
  venue_contact: string;
  venue_capacity: number;
  venue_price: number;
  venue_profile_picture?: File;
  venue_cover_photo?: File;
}

export default function VenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<VenueEditForm | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>("");
  const [coverPreview, setCoverPreview] = useState<string>("");

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
    totalVenues: venues?.length || 0,
    activeVenues: venues?.filter((v) => v.is_active)?.length || 0,
    avgPrice: venues?.length
      ? Math.round(
          venues.reduce((sum, v) => sum + v.venue_price, 0) / venues.length
        )
      : 0,
    totalCapacity: venues?.reduce((sum, v) => sum + v.venue_capacity, 0) || 0,
  };

  const fetchVenues = async () => {
    try {
      const response = await fetch(
        "http://localhost/events-api/admin.php?operation=getAllVenues"
      );
      const data = await response.json();
      if (data.status === "success") {
        setVenues(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching venues:", error);
      setVenues([]);
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
    router.push(`/admin/venues/${venue.venue_id}`);
  };

  const handleEdit = () => {
    if (!selectedVenue) return;
    setEditForm({
      venue_title: selectedVenue.venue_title,
      venue_details: selectedVenue.venue_details || "",
      venue_location: selectedVenue.venue_location,
      venue_contact: selectedVenue.venue_contact,
      venue_capacity: selectedVenue.venue_capacity,
      venue_price: selectedVenue.venue_price,
    });
    setIsEditing(true);
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

  const handleToggleActive = async (venue: Venue) => {
    try {
      const response = await fetch(
        `http://localhost/events-api/admin.php?operation=updateVenueStatus&venue_id=${venue.venue_id}&is_active=${!venue.is_active ? 1 : 0}`
      );
      const data = await response.json();
      if (data.status === "success") {
        toast.success(
          `Venue ${venue.is_active ? "deactivated" : "activated"} successfully`
        );
        fetchVenues();
      } else {
        toast.error(data.message || "Failed to update venue status");
      }
    } catch (error) {
      console.error("Error updating venue status:", error);
      toast.error("Failed to update venue status");
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "profile" | "cover"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          if (type === "profile") {
            setProfilePreview(reader.result);
            setEditForm((prev) =>
              prev ? { ...prev, venue_profile_picture: file } : null
            );
          } else {
            setCoverPreview(reader.result);
            setEditForm((prev) =>
              prev ? { ...prev, venue_cover_photo: file } : null
            );
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!editForm || !selectedVenue) return;

    const formData = new FormData();
    formData.append("operation", "updateVenue");
    formData.append("venue_id", selectedVenue.venue_id.toString());
    formData.append("venue_title", editForm.venue_title);
    formData.append("venue_details", editForm.venue_details);
    formData.append("venue_location", editForm.venue_location);
    formData.append("venue_contact", editForm.venue_contact);
    formData.append("venue_capacity", editForm.venue_capacity.toString());
    formData.append("venue_price", editForm.venue_price.toString());

    if (editForm.venue_profile_picture) {
      formData.append("venue_profile_picture", editForm.venue_profile_picture);
    }
    if (editForm.venue_cover_photo) {
      formData.append("venue_cover_photo", editForm.venue_cover_photo);
    }

    try {
      const response = await fetch("http://localhost/events-api/admin.php", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.status === "success") {
        toast.success("Venue updated successfully");
        setIsEditing(false);
        fetchVenues();
        setIsModalOpen(false);
      } else {
        toast.error(data.message || "Failed to update venue");
      }
    } catch (error) {
      console.error("Error updating venue:", error);
      toast.error("Failed to update venue");
    }
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
            <Card key={venue.venue_id} className="relative">
              <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{
                    backgroundImage: venue.venue_cover_photo
                      ? `url(http://localhost/events-api/${venue.venue_cover_photo})`
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                />
              </div>

              <div className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    {venue.venue_profile_picture ? (
                      <AvatarImage
                        src={`http://localhost/events-api/${venue.venue_profile_picture}`}
                        alt={venue.venue_title}
                      />
                    ) : (
                      <AvatarFallback>{venue.venue_title[0]}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{venue.venue_title}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {venue.venue_location}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-2" />
                    <span>Capacity: {venue.venue_capacity}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <PhilippinePeso className="h-4 w-4 mr-2" />
                    <span>Price: ₱{venue.venue_price.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    className="w-full bg-[#16a34a] hover:bg-[#059669] text-white"
                    onClick={() => handleView(venue)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Venue Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-xl">
                {selectedVenue?.venue_title}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(
                    `/admin/venues/venue-builder/${selectedVenue?.venue_id}`
                  )
                }
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Venue
              </Button>
            </div>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="py-8 text-center">Loading venue details...</div>
          ) : (
            <div className="space-y-6">
              {/* Cover Photo */}
              <div className="relative h-64 rounded-lg overflow-hidden">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: selectedVenue?.venue_cover_photo
                      ? `url(http://localhost/events-api/${selectedVenue.venue_cover_photo})`
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                />
                {/* Profile Picture Overlay */}
                <div className="absolute -bottom-6 left-6">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                    {selectedVenue?.venue_profile_picture ? (
                      <AvatarImage
                        src={`http://localhost/events-api/${selectedVenue.venue_profile_picture}`}
                        alt={selectedVenue?.venue_title}
                      />
                    ) : (
                      <AvatarFallback>
                        {selectedVenue?.venue_title[0]}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
              </div>

              {/* Venue Details Grid */}
              <div className="grid grid-cols-2 gap-8 pt-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">About</h3>
                    <p className="text-gray-600">
                      {selectedVenue?.venue_details ||
                        "No description available."}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Location</h3>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {selectedVenue?.venue_location}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Contact</h3>
                    <p className="text-gray-600">
                      {selectedVenue?.venue_contact}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Specifications
                    </h3>
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-gray-500" />
                          <span>Capacity</span>
                        </div>
                        <span className="font-medium">
                          {selectedVenue?.venue_capacity.toLocaleString()}{" "}
                          guests
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <PhilippinePeso className="h-4 w-4 mr-2 text-gray-500" />
                          <span>Price</span>
                        </div>
                        <span className="font-medium">
                          ₱{selectedVenue?.venue_price.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <svg
                            className="h-4 w-4 mr-2 text-gray-500"
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
                          <span>Type</span>
                        </div>
                        <span className="font-medium capitalize">
                          {selectedVenue?.venue_type || "Not specified"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Status</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedVenue?.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {selectedVenue?.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Venue Inclusions */}
              {selectedVenue?.inclusions &&
                selectedVenue.inclusions.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Inclusions</h3>
                    <Accordion type="single" collapsible className="w-full">
                      {selectedVenue.inclusions.map((inclusion) => (
                        <AccordionItem
                          key={inclusion.inclusion_id}
                          value={inclusion.inclusion_id.toString()}
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex justify-between items-center w-full pr-4">
                              <span>{inclusion.inclusion_name}</span>
                              <span className="text-green-600 font-medium">
                                ₱{inclusion.inclusion_price.toLocaleString()}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="p-4 space-y-4">
                              <p className="text-gray-600">
                                {inclusion.inclusion_description}
                              </p>
                              {inclusion.components &&
                                inclusion.components.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">
                                      Components:
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1">
                                      {inclusion.components.map((component) => (
                                        <li
                                          key={component.component_id}
                                          className="text-gray-600"
                                        >
                                          <span className="font-medium">
                                            {component.component_name}
                                          </span>
                                          {component.component_description && (
                                            <span className="text-gray-500">
                                              {" "}
                                              -{" "}
                                              {component.component_description}
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                            </div>
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
