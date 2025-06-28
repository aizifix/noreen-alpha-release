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
}

export default function VenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchVenues();
  }, []);

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
          {venues.map((venue) => (
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {venue.venue_title}
                  </h3>
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
                      <span>{venue.venue_capacity} guests</span>
                    </div>
                    <div className="flex items-center text-lg font-semibold text-green-600">
                      <PhilippinePeso className="h-4 w-4 mr-1" />
                      <span>{venue.venue_price?.toLocaleString() || "0"}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleView(venue)}
                    disabled={isLoadingDetails}
                  >
                    {isLoadingDetails ? "Loading..." : "VIEW"}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(venue)}
                  >
                    EDIT
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
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedVenue?.venue_title}
            </DialogTitle>
          </DialogHeader>

          {selectedVenue && (
            <div className="space-y-6">
              {/* Cover Photo */}
              {selectedVenue.venue_cover_photo && (
                <div className="relative h-64 rounded-lg overflow-hidden">
                  <img
                    src={`http://localhost/events-api/${selectedVenue.venue_cover_photo}`}
                    alt={selectedVenue.venue_title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4">
                    <Avatar className="h-16 w-16 border-4 border-white">
                      <AvatarImage
                        src={
                          selectedVenue.venue_profile_picture
                            ? `http://localhost/events-api/${selectedVenue.venue_profile_picture}`
                            : ""
                        }
                        alt={selectedVenue.venue_title}
                      />
                      <AvatarFallback className="bg-blue-500 text-white text-lg">
                        {selectedVenue.venue_title.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              )}

              {/* Venue Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Venue Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Location
                      </label>
                      <p className="text-gray-900">
                        {selectedVenue.venue_location}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Contact
                      </label>
                      <p className="text-gray-900">
                        {selectedVenue.venue_contact}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Type
                      </label>
                      <p className="text-gray-900 capitalize">
                        {selectedVenue.venue_type}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Capacity
                      </label>
                      <p className="text-gray-900">
                        {selectedVenue.venue_capacity} guests
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Base Price
                      </label>
                      <p className="text-gray-900 text-lg font-semibold">
                        ₱{selectedVenue.venue_price?.toLocaleString() || "0"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Description</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedVenue.venue_details || "No description available."}
                  </p>
                </div>
              </div>

              {/* Inclusions Accordion */}
              {selectedVenue.inclusions &&
                selectedVenue.inclusions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Venue Inclusions
                    </h3>
                    <Accordion type="multiple" className="w-full">
                      {selectedVenue.inclusions.map((inclusion, index) => (
                        <AccordionItem
                          key={inclusion.inclusion_id}
                          value={`item-${index}`}
                        >
                          <AccordionTrigger className="text-left">
                            <div className="flex justify-between items-center w-full mr-4">
                              <span>{inclusion.inclusion_name}</span>
                              <span className="text-green-600 font-semibold">
                                ₱
                                {inclusion.inclusion_price?.toLocaleString() ||
                                  "0"}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {inclusion.inclusion_description && (
                              <p className="text-gray-600 mb-3">
                                {inclusion.inclusion_description}
                              </p>
                            )}
                            {inclusion.components &&
                              inclusion.components.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">
                                    Components:
                                  </h4>
                                  <ul className="space-y-1">
                                    {inclusion.components.map((component) => (
                                      <li
                                        key={component.component_id}
                                        className="text-sm text-gray-600"
                                      >
                                        • {component.component_name}
                                        {component.component_description && (
                                          <span className="text-gray-500">
                                            {" "}
                                            - {component.component_description}
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
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
