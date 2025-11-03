"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  Pencil,
  Trash2,
  Upload,
  Crop,
  Copy,
} from "lucide-react";
import ReactCrop, { Crop as CropType, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { endpoints, api } from "@/app/config/api";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

// Image URL helper function
const getImageUrl = (imagePath: string | null) => {
  if (!imagePath || imagePath.trim() === "") return null;

  // If already a full URL, return as is
  if (imagePath.startsWith("http")) return imagePath;

  // Handle case where imagePath might be a JSON string (from upload response)
  let actualPath = imagePath;
  try {
    const parsed = JSON.parse(imagePath);
    if (parsed && typeof parsed === "object" && parsed.filePath) {
      actualPath = parsed.filePath;
    }
  } catch (e) {
    // If it's not JSON, use the original path
    actualPath = imagePath;
  }

  // Use the proper API configuration for image serving
  return api.getServeImageUrl(actualPath);
};

// Price formatting helper function
const formatPrice = (price: number | string) => {
  // Convert to number first, then to string with 2 decimal places
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  const priceStr = numPrice.toFixed(2);
  const parts = priceStr.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${formattedInteger}.${decimalPart}`;
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
  extra_pax_rate: number;
  venue_profile_picture: string | null;
  venue_cover_photo: string | null;
  venue_status: string;
  venue_owner?: string;
  inclusions: VenueInclusion[];
  is_active?: boolean;
}

interface VenueEditForm {
  venue_title: string;
  venue_details: string;
  venue_location: string;
  venue_contact: string;
  venue_capacity: number;
  extra_pax_rate: number;
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

  // Modular edit states
  const [activeEditSection, setActiveEditSection] = useState<string | null>(
    null
  );
  const [isBasicInfoModalOpen, setIsBasicInfoModalOpen] = useState(false);
  const [isProfilePictureModalOpen, setIsProfilePictureModalOpen] =
    useState(false);
  const [isCoverPhotoModalOpen, setIsCoverPhotoModalOpen] = useState(false);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [isInclusionsModalOpen, setIsInclusionsModalOpen] = useState(false);

  // Confirmation modal states
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

  // Image editing states
  const [selectedImageType, setSelectedImageType] = useState<
    "profile" | "cover" | null
  >(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      extra_pax_rate: venue.extra_pax_rate,
      venue_type: venue.venue_type,
    });
    setIsEditModalOpen(true);
  };

  // Modular edit handlers
  const handleEditBasicInfo = () => {
    if (!venue) return;
    setEditForm({
      venue_title: venue.venue_title,
      venue_details: venue.venue_details || "",
      venue_location: venue.venue_location,
      venue_contact: venue.venue_contact,
      venue_capacity: venue.venue_capacity,
      extra_pax_rate: venue.extra_pax_rate,
      venue_type: venue.venue_type,
    });
    setIsBasicInfoModalOpen(true);
  };

  const handleEditProfilePicture = () => {
    if (!venue) return;
    setEditForm({
      venue_title: venue.venue_title,
      venue_details: venue.venue_details || "",
      venue_location: venue.venue_location,
      venue_contact: venue.venue_contact,
      venue_capacity: venue.venue_capacity,
      extra_pax_rate: venue.extra_pax_rate,
      venue_type: venue.venue_type,
    });
    setIsProfilePictureModalOpen(true);
  };

  const handleEditCoverPhoto = () => {
    if (!venue) return;
    setEditForm({
      venue_title: venue.venue_title,
      venue_details: venue.venue_details || "",
      venue_location: venue.venue_location,
      venue_contact: venue.venue_contact,
      venue_capacity: venue.venue_capacity,
      extra_pax_rate: venue.extra_pax_rate,
      venue_type: venue.venue_type,
    });
    setIsCoverPhotoModalOpen(true);
  };

  const handleEditDescription = () => {
    if (!venue) return;
    setEditForm({
      venue_title: venue.venue_title,
      venue_details: venue.venue_details || "",
      venue_location: venue.venue_location,
      venue_contact: venue.venue_contact,
      venue_capacity: venue.venue_capacity,
      extra_pax_rate: venue.extra_pax_rate,
      venue_type: venue.venue_type,
    });
    setIsDescriptionModalOpen(true);
  };

  const handleEditInclusions = () => {
    setIsInclusionsModalOpen(true);
  };

  // Image cropping and management functions
  const onImageLoad = (img: HTMLImageElement) => {
    imgRef.current = img;
    const { width, height } = img;
    const cropSize = Math.min(width, height) * 0.8;
    const x = (width - cropSize) / 2;
    const y = (height - cropSize) / 2;

    setCrop({
      unit: "px",
      x,
      y,
      width: cropSize,
      height: cropSize,
    });
  };

  const getCroppedImg = (
    image: HTMLImageElement,
    crop: PixelCrop
  ): Promise<File> => {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error("Canvas not found");
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context not found");
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio;

    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "cropped-image.jpg", {
              type: "image/jpeg",
            });
            resolve(file);
          }
        },
        "image/jpeg",
        0.9
      );
    });
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedFile = await getCroppedImg(imgRef.current, completedCrop);

      if (selectedImageType === "profile") {
        setEditForm((prev) =>
          prev ? { ...prev, venue_profile_picture: croppedFile } : null
        );
        setProfilePreview(URL.createObjectURL(croppedFile));
      } else if (selectedImageType === "cover") {
        setEditForm((prev) =>
          prev ? { ...prev, venue_cover_photo: croppedFile } : null
        );
        setCoverPreview(URL.createObjectURL(croppedFile));
      }

      setIsCropping(false);
      setSelectedImageType(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
    } catch (error) {
      console.error("Error cropping image:", error);
      toast.error("Failed to crop image");
    }
  };

  const handleDeleteImage = async (imageType: "profile" | "cover") => {
    if (!venue) return;

    try {
      const formData = new FormData();
      formData.append("operation", "deleteVenueImage");
      formData.append("venue_id", venue.venue_id.toString());
      formData.append("image_type", imageType);

      const response = await fetch(endpoints.admin, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.status === "success") {
        toast.success(
          `${imageType === "profile" ? "Profile picture" : "Cover photo"} deleted successfully`
        );
        fetchVenueDetails(); // Refresh the data

        // Navigate back to venues list to show updated data
        setTimeout(() => {
          router.push("/admin/venues");
        }, 1000); // Small delay to show success message
      } else {
        toast.error(data.message || "Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "profile" | "cover"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast.error(
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
        toast.error("Please select a valid image file (JPEG, PNG, or WebP)");
        return;
      }

      setSelectedImageType(type);
      setIsCropping(true);

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
    }
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
        toast.error(
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
        toast.error("Please select a valid image file (JPEG, PNG, or WebP)");
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
    const toastId = toast.loading("Saving changes...");

    const formData = new FormData();
    formData.append("operation", "updateVenue");
    formData.append("venue_id", venue.venue_id.toString());
    formData.append("venue_title", editForm.venue_title);
    formData.append("venue_details", editForm.venue_details || "");
    formData.append("venue_location", editForm.venue_location);
    formData.append("venue_contact", editForm.venue_contact);
    formData.append("venue_capacity", editForm.venue_capacity.toString());
    formData.append("venue_price", editForm.extra_pax_rate.toString());
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Update venue response:", data);

      if (data.status === "success") {
        // Dismiss loading toast and show success toast
        toast.dismiss(toastId);
        toast.success("Venue updated successfully", {
          duration: 3000,
        });

        // Close all modals
        setIsEditModalOpen(false);
        setIsBasicInfoModalOpen(false);
        setIsProfilePictureModalOpen(false);
        setIsCoverPhotoModalOpen(false);
        setIsDescriptionModalOpen(false);
        setIsInclusionsModalOpen(false);

        // Clear previews
        setProfilePreview("");
        setCoverPreview("");

        // Refresh the data to show updated venue
        await fetchVenueDetails();
      } else {
        toast.dismiss(toastId);
        const errorMessage = data.message || "Failed to update venue";
        console.error("Venue update failed:", errorMessage);
        toast.error(errorMessage, {
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error updating venue:", error);
      toast.dismiss(toastId);
      toast.error(`Failed to update venue: ${error instanceof Error ? error.message : "Unknown error"}`, {
        duration: 3000,
      });
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

        // Navigate back to venues list to show updated status
        setTimeout(() => {
          router.push("/admin/venues");
        }, 1000); // Small delay to show success message
      } else {
        toast.error(data.message || "Failed to update venue status");
      }
    } catch (error) {
      console.error("Error updating venue status:", error);
      toast.error("Failed to update venue status");
    }
  };

  const handleDeleteVenue = () => {
    if (!venue) return;

    setConfirmationModal({
      isOpen: true,
      title: "Delete Venue",
      description: `Are you sure you want to delete "${venue.venue_title}"? This action cannot be undone and will remove all associated data.`,
      onConfirm: async () => {
        try {
          const response = await fetch(endpoints.admin, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `operation=deleteVenue&venue_id=${venue.venue_id}`,
          });
          const data = await response.json();
          if (data.status === "success") {
            toast.success("Venue deleted successfully");
            router.push("/admin/venues");
          } else {
            toast.error(data.message || "Failed to delete venue");
          }
        } catch (error) {
          console.error("Error deleting venue:", error);
          toast.error("Failed to delete venue");
        }
        setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
      },
      variant: "destructive",
    });
  };

  const handleDuplicateVenue = () => {
    if (!venue) return;

    setConfirmationModal({
      isOpen: true,
      title: "Duplicate Venue",
      description: `Are you sure you want to create a copy of "${venue.venue_title}"? This will create a new venue with the same details.`,
      onConfirm: async () => {
        try {
          const response = await fetch(endpoints.admin, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `operation=duplicateVenue&venue_id=${venue.venue_id}`,
          });
          const data = await response.json();
          if (data.status === "success") {
            toast.success("Venue duplicated successfully");
            router.push("/admin/venues");
          } else {
            toast.error(data.message || "Failed to duplicate venue");
          }
        } catch (error) {
          console.error("Error duplicating venue:", error);
          toast.error("Failed to duplicate venue");
        }
        setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
      },
      variant: "default",
    });
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
              <button
                onClick={handleDuplicateVenue}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Venue
              </button>
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#028A75] hover:bg-[#027a68]"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Venue
              </button>
              <button
                onClick={handleDeleteVenue}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Venue
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover Photo and Profile Picture */}
            <div className="relative group">
              <Card className="relative h-80 overflow-hidden rounded-xl">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: venue.venue_cover_photo
                      ? `url(${getImageUrl(venue.venue_cover_photo)})`
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                />
                {/* Overlay for better text readability if needed */}
                <div className="absolute inset-0 bg-black bg-opacity-20" />

                {/* Edit button for cover photo */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleEditCoverPhoto}
                    className="bg-white/90 hover:bg-white text-gray-700 shadow-lg"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit Cover
                  </Button>
                </div>
              </Card>

              {/* Profile Picture positioned outside the card */}
              <div className="absolute -bottom-8 left-8 z-10 group/avatar">
                <Avatar className="h-32 w-32 border-4 border-white relative">
                  {venue.venue_profile_picture ? (
                    <AvatarImage
                      src={
                        getImageUrl(venue.venue_profile_picture) || undefined
                      }
                      alt={venue.venue_title}
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-[#028A75] to-[#027a68] text-white font-bold">
                      {venue.venue_title[0]}
                    </AvatarFallback>
                  )}

                  {/* Edit button for profile picture */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 rounded-full flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleEditProfilePicture}
                      className="bg-white/90 hover:bg-white text-gray-700 shadow-lg"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </Avatar>
              </div>
            </div>

            {/* Venue Details */}
            <Card className="p-6 mt-16 rounded-xl group">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Venue Details
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEditBasicInfo}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-500 hover:text-gray-700"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
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
                        ₱{formatPrice(venue.extra_pax_rate)} per guest
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
            <Card className="p-6 rounded-xl group">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Description
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEditDescription}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-500 hover:text-gray-700"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-start">
                <FileText className="h-4 w-4 mr-2 text-gray-400 mt-1" />
                <p className="text-gray-700 leading-relaxed">
                  {venue.venue_details || "No description available."}
                </p>
              </div>
            </Card>

            {/* Inclusions */}
            {venue.inclusions && venue.inclusions.length > 0 && (
              <div className="space-y-4 group">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Inclusions
                  </h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEditInclusions}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-500 hover:text-gray-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {venue.inclusions.map((inclusion, idx) => (
                    <div
                      key={`inclusion-${inclusion.inclusion_id ?? 0}-${idx}`}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center mb-2">
                        <Package className="h-4 w-4 mr-2 text-gray-500" />
                        <h3 className="font-medium text-gray-800">
                          {inclusion.inclusion_name}
                        </h3>
                      </div>

                      {inclusion.inclusion_description && (
                        <p className="text-gray-600 text-sm mb-3">
                          {inclusion.inclusion_description}
                        </p>
                      )}

                      {inclusion.components &&
                        inclusion.components.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">
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
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Quick Stats
              </h3>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold">Edit Venue</DialogTitle>
            <DialogDescription className="mt-2 text-gray-600">
              Update the venue information including basic details, images, and
              description.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="venue_title" className="text-sm font-medium">Venue Name</Label>
                  <Input
                    id="venue_title"
                    value={editForm.venue_title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, venue_title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_type" className="text-sm font-medium">Venue Type</Label>
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
                  <Label htmlFor="venue_capacity" className="text-sm font-medium">Capacity</Label>
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
                  <Label htmlFor="extra_pax_rate" className="text-sm font-medium">Extra Pax Rate (₱)</Label>
                  <Input
                    id="extra_pax_rate"
                    type="number"
                    value={editForm.extra_pax_rate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        extra_pax_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_location" className="text-sm font-medium">Location</Label>
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
                  <Label htmlFor="venue_contact" className="text-sm font-medium">Contact</Label>
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
                  <Label htmlFor="venue_profile_picture" className="text-sm font-medium">Profile Picture</Label>
                  <Input
                    id="venue_profile_picture"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "profile")}
                  />
                  {profilePreview && profilePreview.trim() !== "" && (
                    <img
                      src={profilePreview}
                      alt="Profile preview"
                      className="w-20 h-20 object-cover rounded mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_cover_photo" className="text-sm font-medium">Cover Photo</Label>
                  <Input
                    id="venue_cover_photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "cover")}
                  />
                  {coverPreview && coverPreview.trim() !== "" && (
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-32 object-cover rounded mt-2"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue_details" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="venue_details"
                  value={editForm.venue_details}
                  onChange={(e) =>
                    setEditForm({ ...editForm, venue_details: e.target.value })
                  }
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="border-gray-300 hover:bg-gray-50 px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-[#028A75] hover:bg-[#027a68] text-white px-6"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Basic Info Edit Modal */}
      <Dialog
        open={isBasicInfoModalOpen}
        onOpenChange={setIsBasicInfoModalOpen}
      >
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold">Edit Basic Information</DialogTitle>
            <DialogDescription className="mt-2 text-gray-600">
              Update the basic venue information such as name, type, capacity,
              price, location, and contact details.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="venue_title" className="text-sm font-medium">Venue Name</Label>
                  <Input
                    id="venue_title"
                    value={editForm.venue_title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, venue_title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_type" className="text-sm font-medium">Venue Type</Label>
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
                  <Label htmlFor="venue_capacity" className="text-sm font-medium">Capacity</Label>
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
                  <Label htmlFor="extra_pax_rate" className="text-sm font-medium">Extra Pax Rate (₱)</Label>
                  <Input
                    id="extra_pax_rate"
                    type="number"
                    value={editForm.extra_pax_rate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        extra_pax_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_location" className="text-sm font-medium">Location</Label>
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
                  <Label htmlFor="venue_contact" className="text-sm font-medium">Contact</Label>
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
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsBasicInfoModalOpen(false)}
                  className="border-gray-300 hover:bg-gray-50 px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-[#028A75] hover:bg-[#027a68] text-white px-6"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Picture Edit Modal */}
      <Dialog
        open={isProfilePictureModalOpen}
        onOpenChange={setIsProfilePictureModalOpen}
      >
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold">Edit Profile Picture</DialogTitle>
            <DialogDescription className="mt-2 text-gray-600">
              Upload a new profile picture for the venue. You can crop the image
              to fit properly.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Profile Picture</h3>
                  {venue?.venue_profile_picture && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteImage("profile")}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Current
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Profile Picture */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Current Profile Picture</Label>
                    <div className="w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      {venue?.venue_profile_picture ? (
                        <img
                          src={
                            getImageUrl(venue.venue_profile_picture) ||
                            undefined
                          }
                          alt="Current profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-400 text-center">
                          <Building className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-xs">No image</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload New Profile Picture */}
                  <div className="space-y-2">
                    <Label htmlFor="venue_profile_picture" className="text-sm font-medium">
                      Upload New Profile Picture
                    </Label>
                    <Input
                      id="venue_profile_picture"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "profile")}
                    />
                    {profilePreview &&
                      profilePreview.trim() !== "" &&
                      !isCropping && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-2">Preview:</p>
                          <img
                            src={profilePreview}
                            alt="Profile preview"
                            className="w-32 h-32 object-cover rounded"
                          />
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Image Cropping Modal */}
              {isCropping && selectedImageType === "profile" && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">
                        Crop Profile Picture
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsCropping(false);
                          setSelectedImageType(null);
                          setCrop(undefined);
                          setCompletedCrop(undefined);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="max-h-96 overflow-auto">
                        <ReactCrop
                          crop={crop}
                          onChange={(_, percentCrop) => setCrop(percentCrop)}
                          onComplete={(c) => setCompletedCrop(c)}
                          aspect={1}
                          circularCrop={true}
                        >
                          <img
                            ref={imgRef}
                            alt="Crop me"
                            src={profilePreview || undefined}
                            onLoad={(e) => onImageLoad(e.currentTarget)}
                            className="max-w-full h-auto"
                          />
                        </ReactCrop>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsCropping(false);
                            setSelectedImageType(null);
                            setCrop(undefined);
                            setCompletedCrop(undefined);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCropComplete}
                          disabled={!completedCrop}
                          className="bg-[#028A75] hover:bg-[#027a68] text-white"
                        >
                          <Crop className="h-4 w-4 mr-2" />
                          Apply Crop
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden canvas for cropping */}
              <canvas ref={canvasRef} style={{ display: "none" }} />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsProfilePictureModalOpen(false);
                    setProfilePreview("");
                  }}
                  className="border-gray-300 hover:bg-gray-50 px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-[#028A75] hover:bg-[#027a68] text-white px-6"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cover Photo Edit Modal */}
      <Dialog
        open={isCoverPhotoModalOpen}
        onOpenChange={setIsCoverPhotoModalOpen}
      >
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold">Edit Cover Photo</DialogTitle>
            <DialogDescription className="mt-2 text-gray-600">
              Upload a new cover photo for the venue. You can crop the image to
              fit properly.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Cover Photo</h3>
                  {venue?.venue_cover_photo && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteImage("cover")}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Current
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Cover Photo */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Current Cover Photo</Label>
                    <div className="w-full h-32 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      {venue?.venue_cover_photo ? (
                        <img
                          src={
                            getImageUrl(venue.venue_cover_photo) || undefined
                          }
                          alt="Current cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-400 text-center">
                          <Building className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-xs">No image</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload New Cover Photo */}
                  <div className="space-y-2">
                    <Label htmlFor="venue_cover_photo" className="text-sm font-medium">
                      Upload New Cover Photo
                    </Label>
                    <Input
                      id="venue_cover_photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "cover")}
                    />
                    {coverPreview &&
                      coverPreview.trim() !== "" &&
                      !isCropping && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-2">Preview:</p>
                          <img
                            src={coverPreview}
                            alt="Cover preview"
                            className="w-full h-32 object-cover rounded"
                          />
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Image Cropping Modal */}
              {isCropping && selectedImageType === "cover" && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Crop Cover Photo</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsCropping(false);
                          setSelectedImageType(null);
                          setCrop(undefined);
                          setCompletedCrop(undefined);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="max-h-96 overflow-auto">
                        <ReactCrop
                          crop={crop}
                          onChange={(_, percentCrop) => setCrop(percentCrop)}
                          onComplete={(c) => setCompletedCrop(c)}
                        >
                          <img
                            ref={imgRef}
                            alt="Crop me"
                            src={coverPreview || undefined}
                            onLoad={(e) => onImageLoad(e.currentTarget)}
                            className="max-w-full h-auto"
                          />
                        </ReactCrop>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsCropping(false);
                            setSelectedImageType(null);
                            setCrop(undefined);
                            setCompletedCrop(undefined);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCropComplete}
                          disabled={!completedCrop}
                          className="bg-[#028A75] hover:bg-[#027a68] text-white"
                        >
                          <Crop className="h-4 w-4 mr-2" />
                          Apply Crop
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden canvas for cropping */}
              <canvas ref={canvasRef} style={{ display: "none" }} />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCoverPhotoModalOpen(false);
                    setCoverPreview("");
                  }}
                  className="border-gray-300 hover:bg-gray-50 px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-[#028A75] hover:bg-[#027a68] text-white px-6"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Description Edit Modal */}
      <Dialog
        open={isDescriptionModalOpen}
        onOpenChange={setIsDescriptionModalOpen}
      >
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold">Edit Description</DialogTitle>
            <DialogDescription className="mt-2 text-gray-600">
              Update the venue description to provide more details about the
              venue.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="venue_details" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="venue_details"
                  value={editForm.venue_details}
                  onChange={(e) =>
                    setEditForm({ ...editForm, venue_details: e.target.value })
                  }
                  rows={6}
                  placeholder="Enter venue description..."
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsDescriptionModalOpen(false)}
                  className="border-gray-300 hover:bg-gray-50 px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-[#028A75] hover:bg-[#027a68] text-white px-6"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inclusions Edit Modal */}
      <Dialog
        open={isInclusionsModalOpen}
        onOpenChange={setIsInclusionsModalOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Inclusions</DialogTitle>
            <DialogDescription>
              Manage venue inclusions and their components. This feature will be
              available soon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Inclusions Management
              </h3>
              <p className="text-gray-600 mb-4">
                Inclusions management feature will be available soon.
              </p>
              <Button
                variant="outline"
                onClick={() => setIsInclusionsModalOpen(false)}
                className="border-gray-300 hover:bg-gray-50"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
