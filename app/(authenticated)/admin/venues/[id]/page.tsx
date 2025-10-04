"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Edit,
  MapPin,
  Users,
  PhilippinePeso,
  Building,
  Phone,
  FileText,
  Package,
  CheckCircle,
  XCircle,
  Save,
  X,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { endpoints } from "@/app/config/api";

// Image URL helper function
const getImageUrl = (imagePath: string | null) => {
  if (!imagePath) return null;
  // Fix the image URL construction - ensure proper path for image serving
  const cleanPath = imagePath.startsWith("uploads/")
    ? imagePath
    : `uploads/${imagePath}`;
  // Use the events-api endpoint for serving images
  const eventsApiUrl = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace("/app/api", "/events-api")
    : "http://localhost/events-api";
  return `${eventsApiUrl}/${cleanPath}`;
};

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
  venue_type: string;
  venue_profile_picture?: File;
  venue_cover_photo?: File;
}

export default function VenueDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const venueId = params.id as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<VenueEditForm | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string>("");
  const [coverPreview, setCoverPreview] = useState<string>("");

  useEffect(() => {
    if (venueId) {
      fetchVenueDetails();
    }
  }, [venueId]);

  const fetchVenueDetails = async () => {
    try {
      const response = await fetch(
        `${endpoints.admin}?operation=getVenueById&venue_id=${venueId}`
      );
      const data = await response.json();
      if (data.status === "success") {
        setVenue(data.venue);
      } else {
        toast.error("Failed to load venue details");
      }
    } catch (error) {
      console.error("Error fetching venue details:", error);
      toast.error("Failed to load venue details");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!venue) return;
    setEditForm({
      venue_title: venue.venue_title,
      venue_details: venue.venue_details || "",
      venue_location: venue.venue_location,
      venue_contact: venue.venue_contact,
      venue_capacity: venue.venue_capacity,
      venue_price: venue.venue_price,
      venue_type: venue.venue_type,
    });
    setIsEditModalOpen(true);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "profile" | "cover"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        alert(
          `File size must be less than 5MB. Current file size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
        );
        return;
      }

      // Check file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("Please select a valid image file (JPEG, PNG, or WebP)");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (type === "profile") {
          setProfilePreview(result);
        } else {
          setCoverPreview(result);
        }
      };
      reader.readAsDataURL(file);

      if (editForm) {
        setEditForm({
          ...editForm,
          [type === "profile" ? "venue_profile_picture" : "venue_cover_photo"]:
            file,
        });
      }
    }
  };

  const handleSave = async () => {
    if (!editForm || !venue) return;

    const formData = new FormData();
    formData.append("operation", "updateVenue");
    formData.append("venue_id", venue.venue_id.toString());
    formData.append("venue_title", editForm.venue_title);
    formData.append("venue_details", editForm.venue_details);
    formData.append("venue_location", editForm.venue_location);
    formData.append("venue_contact", editForm.venue_contact);
    formData.append("venue_capacity", editForm.venue_capacity.toString());
    formData.append("venue_price", editForm.venue_price.toString());
    formData.append("venue_type", editForm.venue_type);

    if (editForm.venue_profile_picture) {
      formData.append("venue_profile_picture", editForm.venue_profile_picture);
    }
    if (editForm.venue_cover_photo) {
      formData.append("venue_cover_photo", editForm.venue_cover_photo);
    }

    try {
      const response = await fetch(endpoints.admin, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.status === "success") {
        toast.success("Venue updated successfully");
        setIsEditModalOpen(false);
        fetchVenueDetails(); // Refresh the data
      } else {
        toast.error(data.message || "Failed to update venue");
      }
    } catch (error) {
      console.error("Error updating venue:", error);
      toast.error("Failed to update venue");
    }
  };

  const handleToggleActive = async () => {
    if (!venue) return;

    try {
      const response = await fetch(endpoints.admin, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `operation=toggleVenueActive&venue_id=${venue.venue_id}`,
      });
      const data = await response.json();
      if (data.status === "success") {
        toast.success(
          `Venue ${venue.is_active ? "deactivated" : "activated"} successfully`
        );
        fetchVenueDetails(); // Refresh the data
      } else {
        toast.error(data.message || "Failed to update venue status");
      }
    } catch (error) {
      console.error("Error updating venue status:", error);
      toast.error("Failed to update venue status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading venue details...</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Venue Not Found</h2>
          <p className="text-gray-600 mb-4">
            The venue you're looking for doesn't exist.
          </p>
          <Button
            onClick={() => router.back()}
            className="bg-[#028A75] hover:bg-[#027a68] text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                {venue.venue_title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleToggleActive}
                className={
                  venue.is_active
                    ? "text-red-600 border-red-600 hover:bg-red-50"
                    : "text-[#028A75] border-[#028A75] hover:bg-[#028A75] hover:text-white"
                }
              >
                {venue.is_active ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
              <Button
                onClick={handleEdit}
                className="bg-[#028A75] hover:bg-[#027a68] text-white"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Venue
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover Photo and Profile Picture */}
            <Card className="relative h-80 overflow-hidden">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{
                  backgroundImage: venue.venue_cover_photo
                    ? `url(${getImageUrl(venue.venue_cover_photo)})`
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              />
              <div className="absolute -bottom-6 left-6">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  {venue.venue_profile_picture ? (
                    <AvatarImage
                      src={
                        getImageUrl(venue.venue_profile_picture) ||
                        "/placeholder.jpg"
                      }
                      alt={venue.venue_title}
                    />
                  ) : (
                    <AvatarFallback className="text-lg">
                      {venue.venue_title[0]}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
            </Card>

            {/* Venue Details */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Venue Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Venue Name
                    </Label>
                    <p className="text-lg font-medium">{venue.venue_title}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Type
                    </Label>
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="capitalize">{venue.venue_type}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Location
                    </Label>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{venue.venue_location}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Contact
                    </Label>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{venue.venue_contact}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Capacity
                    </Label>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      <span>
                        {venue.venue_capacity.toLocaleString()} guests
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Price
                    </Label>
                    <div className="flex items-center">
                      <PhilippinePeso className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-lg font-semibold text-green-600">
                        ₱{venue.venue_price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Status
                    </Label>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        venue.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {venue.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Description */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <div className="flex items-start">
                <FileText className="h-4 w-4 mr-2 text-gray-400 mt-1" />
                <p className="text-gray-700 leading-relaxed">
                  {venue.venue_details || "No description available."}
                </p>
              </div>
            </Card>

            {/* Inclusions */}
            {venue.inclusions && venue.inclusions.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Inclusions</h2>
                <Accordion type="single" collapsible className="w-full">
                  {venue.inclusions.map((inclusion, idx) => (
                    <AccordionItem
                      key={`inclusion-${inclusion.inclusion_id ?? 0}-${idx}`}
                      value={`${inclusion.inclusion_id ?? 0}-${idx}`}
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex justify-between items-center w-full pr-4">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{inclusion.inclusion_name}</span>
                          </div>
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
                                <ul className="space-y-1">
                                  {inclusion.components.map((component) => (
                                    <li
                                      key={component.component_id}
                                      className="text-sm text-gray-600"
                                    >
                                      • {component.component_name}
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
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Inclusions</span>
                  <span className="font-semibold">
                    {venue.inclusions?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Venue Type</span>
                  <span className="font-semibold capitalize">
                    {venue.venue_type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      venue.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {venue.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="venue_title">Venue Name</Label>
                  <Input
                    id="venue_title"
                    value={editForm.venue_title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, venue_title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_type">Venue Type</Label>
                  <Select
                    value={editForm.venue_type}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, venue_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_capacity">Capacity</Label>
                  <Input
                    id="venue_capacity"
                    type="number"
                    value={editForm.venue_capacity}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        venue_capacity: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_price">Price (₱)</Label>
                  <Input
                    id="venue_price"
                    type="number"
                    value={editForm.venue_price}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        venue_price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_location">Location</Label>
                  <Input
                    id="venue_location"
                    value={editForm.venue_location}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        venue_location: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_contact">Contact</Label>
                  <Input
                    id="venue_contact"
                    value={editForm.venue_contact}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        venue_contact: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_profile_picture">Profile Picture</Label>
                  <Input
                    id="venue_profile_picture"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "profile")}
                  />
                  {profilePreview && (
                    <img
                      src={profilePreview}
                      alt="Profile preview"
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_cover_photo">Cover Photo</Label>
                  <Input
                    id="venue_cover_photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "cover")}
                  />
                  {coverPreview && (
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue_details">Description</Label>
                <Textarea
                  id="venue_details"
                  value={editForm.venue_details}
                  onChange={(e) =>
                    setEditForm({ ...editForm, venue_details: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-[#028A75] hover:bg-[#027a68] text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
