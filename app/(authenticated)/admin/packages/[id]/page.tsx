"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Package,
  MapPin,
  Users,
  Clock,
  Star,
  Edit,
  Trash2,
  Eye,
  Save,
  X,
  GripVertical,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { BudgetBreakdown } from "../package-builder/budget-breakdown";
import Image from "next/image";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface PackageDetails {
  package_id: number;
  package_title: string;
  package_description: string;
  package_price: number;
  guest_capacity: number;
  created_at: string;
  user_firstName: string;
  user_lastName: string;
  is_active: number;
  inclusions: Inclusion[];
  freebies: string[];
  venues: Venue[];
  event_types: EventType[];
}

interface Inclusion {
  name: string;
  price: number;
  components: Component[];
}

interface Component {
  name: string;
  price: number;
  subComponents: SubComponent[];
}

interface SubComponent {
  name: string;
  price: number;
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

interface EventType {
  event_type_id: number;
  event_name: string;
  event_description: string | null;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost/events-api";

export default function PackageDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [packageDetails, setPackageDetails] = useState<PackageDetails | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedInclusions, setEditedInclusions] = useState<Inclusion[]>([]);
  const [editedPackage, setEditedPackage] = useState<{
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
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPackageDetails();
    }
  }, [params.id]);

  const fetchPackageDetails = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/admin.php`, {
        params: {
          operation: "getPackageDetails",
          package_id: params.id,
        },
      });

      if (response.data.status === "success") {
        const pkg = response.data.package;
        setPackageDetails(pkg);
        setEditedInclusions(pkg.inclusions);
        setEditedPackage({
          package_title: pkg.package_title,
          package_description: pkg.package_description || "",
          package_price: pkg.package_price.toString(),
          guest_capacity: pkg.guest_capacity,
        });
      } else {
        toast.error("Failed to fetch package details");
        router.push("/admin/packages");
      }
    } catch (error) {
      console.error("Error fetching package details:", error);
      toast.error("Failed to load package details");
      router.push("/admin/packages");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePackage = async () => {
    if (confirm("Are you sure you want to delete this package?")) {
      try {
        const response = await axios.post(`${API_URL}/admin.php`, {
          operation: "deletePackage",
          package_id: params.id,
        });

        if (response.data.status === "success") {
          toast.success("Package deleted successfully");
          router.push("/admin/packages");
        } else {
          toast.error("Failed to delete package");
        }
      } catch (error) {
        console.error("Error deleting package:", error);
        toast.error("Failed to delete package");
      }
    }
  };

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

  const handleEditPackage = () => {
    setIsEditing(true);
    setEditedInclusions([...packageDetails!.inclusions]);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedInclusions([...packageDetails!.inclusions]);
    setEditedPackage({
      package_title: packageDetails!.package_title,
      package_description: packageDetails!.package_description || "",
      package_price: packageDetails!.package_price.toString(),
      guest_capacity: packageDetails!.guest_capacity,
    });
  };

  const handleSavePackage = async () => {
    setIsSaving(true);
    try {
      const updateData: any = {
        operation: "updatePackage",
        package_id: packageDetails!.package_id,
        package_title: editedPackage.package_title,
        package_description: editedPackage.package_description,
        package_price: parseFloat(editedPackage.package_price),
        guest_capacity: editedPackage.guest_capacity,
        components: editedInclusions.map((inc, index) => ({
          component_name: inc.name,
          component_price: inc.price,
          display_order: index,
        })),
      };

      const response = await axios.post(`${API_URL}/admin.php`, updateData);

      if (response.data.status === "success") {
        setPackageDetails((prev) =>
          prev
            ? {
                ...prev,
                package_title: editedPackage.package_title,
                package_description: editedPackage.package_description,
                package_price: parseFloat(editedPackage.package_price),
                guest_capacity: editedPackage.guest_capacity,
                inclusions: editedInclusions,
              }
            : null
        );
        setIsEditing(false);
        toast.success("Package updated successfully");
      } else if (
        response.data.status === "warning" &&
        response.data.requires_confirmation
      ) {
        // Handle budget overage warning
        if (
          confirm(
            `Budget overage detected: ₱${response.data.overage_amount?.toLocaleString()} over budget. Continue anyway?`
          )
        ) {
          updateData.confirm_overage = true;
          const retryResponse = await axios.post(
            `${API_URL}/admin.php`,
            updateData
          );

          if (retryResponse.data.status === "success") {
            setPackageDetails((prev) =>
              prev
                ? {
                    ...prev,
                    package_title: editedPackage.package_title,
                    package_description: editedPackage.package_description,
                    package_price: parseFloat(editedPackage.package_price),
                    guest_capacity: editedPackage.guest_capacity,
                    inclusions: editedInclusions,
                  }
                : null
            );
            setIsEditing(false);
            toast.success("Package updated successfully");
          } else {
            toast.error(
              retryResponse.data.message || "Failed to update package"
            );
          }
        }
      } else {
        toast.error(response.data.message || "Failed to update package");
      }
    } catch (error) {
      console.error("Error updating package:", error);
      toast.error("Failed to update package");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInclusionNameChange = (index: number, newName: string) => {
    const updated = [...editedInclusions];
    updated[index] = { ...updated[index], name: newName };
    setEditedInclusions(updated);
  };

  const handleInclusionPriceChange = (index: number, newPrice: number) => {
    const updated = [...editedInclusions];
    updated[index] = { ...updated[index], price: newPrice };
    setEditedInclusions(updated);
  };

  const handleAddInclusion = () => {
    setEditedInclusions([
      ...editedInclusions,
      { name: "New Inclusion", price: 0, components: [] },
    ]);
  };

  const handleRemoveInclusion = (index: number) => {
    const updated = editedInclusions.filter((_, i) => i !== index);
    setEditedInclusions(updated);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedItem === null) return;

    const updated = [...editedInclusions];
    const draggedInclusion = updated[draggedItem];

    // Remove the dragged item
    updated.splice(draggedItem, 1);

    // Insert it at the new position
    updated.splice(dropIndex, 0, draggedInclusion);

    setEditedInclusions(updated);
    setDraggedItem(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading package details...</p>
        </div>
      </div>
    );
  }

  if (!packageDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Package not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/admin/packages")}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Packages
              </button>
            </div>
            <div className="flex items-center space-x-4">
              {!isEditing ? (
                <button
                  onClick={handleEditPackage}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Package
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSavePackage}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </div>
              )}
              <button
                onClick={handleDeletePackage}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Package
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Package Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editedPackage.package_title}
                    onChange={(e) =>
                      setEditedPackage((prev) => ({
                        ...prev,
                        package_title: e.target.value,
                      }))
                    }
                    className="text-3xl font-bold text-gray-900 bg-white border border-gray-300 rounded px-3 py-2 w-full"
                    placeholder="Package Title"
                  />
                  <textarea
                    value={editedPackage.package_description}
                    onChange={(e) =>
                      setEditedPackage((prev) => ({
                        ...prev,
                        package_description: e.target.value,
                      }))
                    }
                    className="text-gray-600 bg-white border border-gray-300 rounded px-3 py-2 w-full resize-none"
                    placeholder="Package Description"
                    rows={3}
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {packageDetails.package_title}
                  </h1>
                  <p className="text-gray-600 mt-2">
                    {packageDetails.package_description}
                  </p>
                </div>
              )}
            </div>
            <div className="text-right ml-6">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">₱</span>
                    <input
                      type="number"
                      value={editedPackage.package_price}
                      onChange={(e) =>
                        setEditedPackage((prev) => ({
                          ...prev,
                          package_price: e.target.value,
                        }))
                      }
                      className="text-3xl font-bold text-green-600 bg-white border border-gray-300 rounded px-3 py-2 w-32 text-right"
                      placeholder="0"
                    />
                  </div>
                  <input
                    type="number"
                    value={editedPackage.guest_capacity}
                    onChange={(e) =>
                      setEditedPackage((prev) => ({
                        ...prev,
                        guest_capacity: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="text-sm bg-white border border-gray-300 rounded px-2 py-1 w-20 text-right"
                    placeholder="Capacity"
                  />
                </div>
              ) : (
                <div>
                  <div className="text-3xl font-bold text-green-600">
                    ₱{packageDetails.package_price.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Capacity: {packageDetails.guest_capacity} guests
                  </div>
                </div>
              )}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                  packageDetails.is_active
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {packageDetails.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          {/* Package Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">
                    Guest Capacity
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {isEditing
                      ? editedPackage.guest_capacity
                      : packageDetails.guest_capacity}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">
                    Inclusions
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {isEditing
                      ? editedInclusions.length
                      : packageDetails.inclusions.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <MapPin className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-600">Venues</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {packageDetails.venues.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-600">Created</p>
                  <p className="text-sm font-bold text-yellow-900">
                    {new Date(packageDetails.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Inclusions and Venues */}
          <div className="lg:col-span-2 space-y-8">
            {/* Editable Inclusions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Package Inclusions
                </h2>
                {isEditing && (
                  <span className="text-sm text-gray-500">
                    Edit mode - changes will be saved with the package
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {isEditing ? (
                  editedInclusions.map((inclusion, index) => (
                    <div
                      key={index}
                      className={`border-l-4 border-green-500 pl-4 bg-gray-50 p-4 rounded-r-lg`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                          <input
                            type="text"
                            value={inclusion.name}
                            onChange={(e) =>
                              handleInclusionNameChange(index, e.target.value)
                            }
                            className="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 flex-1"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">₱</span>
                            <input
                              type="number"
                              value={inclusion.price}
                              onChange={(e) =>
                                handleInclusionPriceChange(
                                  index,
                                  Number(e.target.value)
                                )
                              }
                              className="text-lg font-bold text-green-600 bg-white border border-gray-300 rounded px-2 py-1 w-24 text-right"
                            />
                            <button
                              onClick={() => handleRemoveInclusion(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {inclusion.components.length > 0 && (
                        <div className="space-y-2">
                          {inclusion.components.map((component, compIndex) => (
                            <div key={compIndex} className="ml-4">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700">
                                  {component.name}
                                </span>
                                {/* price removed as requested */}
                              </div>
                              {component.subComponents.length > 0 && (
                                <div className="ml-4 mt-1 space-y-1">
                                  {component.subComponents.map(
                                    (subComp, subIndex) => (
                                      <div
                                        key={subIndex}
                                        className="flex items-center justify-between text-sm text-gray-600"
                                      >
                                        <span>• {subComp.name}</span>
                                        {/* price removed as requested */}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {packageDetails.inclusions.map((inclusion, index) => (
                      <AccordionItem
                        key={index}
                        value={`inc-${index}`}
                        className="border-l-4 border-green-500 pl-4"
                      >
                        <AccordionTrigger className="py-2">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900">
                                {inclusion.name}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-green-600">
                              ₱{inclusion.price.toLocaleString()}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {inclusion.components.length > 0 ? (
                            <div className="space-y-2 ml-4">
                              {inclusion.components.map(
                                (component, compIndex) => (
                                  <div key={compIndex}>
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-700">
                                        {component.name}
                                      </span>
                                      {/* price removed as requested */}
                                    </div>
                                    {component.subComponents.length > 0 && (
                                      <div className="ml-4 mt-1 space-y-1">
                                        {component.subComponents.map(
                                          (subComp, subIndex) => (
                                            <div
                                              key={subIndex}
                                              className="flex items-center justify-between text-sm text-gray-600"
                                            >
                                              <span>• {subComp.name}</span>
                                              {/* price removed as requested */}
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 ml-4">
                              No components
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}

                {isEditing && (
                  <button
                    onClick={handleAddInclusion}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add New Inclusion
                  </button>
                )}
              </div>
            </div>

            {/* Venues */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Available Venues
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {packageDetails.venues.map((venue) => (
                  <div key={venue.venue_id} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      {venue.venue_profile_picture && (
                        <div className="flex-shrink-0">
                          <img
                            src={
                              getImageUrl(venue.venue_profile_picture) ||
                              "/placeholder.jpg"
                            }
                            alt={venue.venue_title}
                            className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-75"
                            onClick={() =>
                              setSelectedImageModal(
                                getImageUrl(venue.venue_profile_picture)
                              )
                            }
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {venue.venue_title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {venue.venue_location}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            <Users className="inline h-4 w-4 mr-1" />
                            {venue.venue_capacity} guests
                          </span>
                          <span className="font-bold text-green-600">
                            ₱{venue.total_price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Venue Cover Photo */}
                    {venue.venue_cover_photo && (
                      <div className="mt-4">
                        <img
                          src={
                            getImageUrl(venue.venue_cover_photo) ||
                            "/placeholder.jpg"
                          }
                          alt={`${venue.venue_title} cover`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-75"
                          onClick={() =>
                            setSelectedImageModal(
                              getImageUrl(venue.venue_cover_photo)
                            )
                          }
                        />
                      </div>
                    )}

                    {/* Venue Inclusions */}
                    {venue.inclusions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Venue Inclusions:
                        </h4>
                        <div className="space-y-1">
                          {venue.inclusions.map((inclusion, idx) => (
                            <div
                              key={`venue-inc-${inclusion.inclusion_id ?? 0}-${idx}`}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-700">
                                {inclusion.inclusion_name}
                              </span>
                              <span className="text-gray-600">
                                ₱{inclusion.inclusion_price.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Budget Breakdown */}
          <div className="lg:col-span-1">
            <BudgetBreakdown
              packagePrice={
                isEditing
                  ? parseFloat(editedPackage.package_price) || 0
                  : packageDetails.package_price
              }
              selectedVenue={packageDetails.venues[0] || null}
              components={(isEditing
                ? editedInclusions
                : packageDetails.inclusions
              ).map((inc) => ({
                name: inc.name,
                price: inc.price,
              }))}
              freebies={packageDetails.freebies}
            />
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="max-w-4xl max-h-full p-4">
            <div className="relative">
              <button
                onClick={() => setSelectedImageModal(null)}
                className="absolute top-2 right-2 text-white hover:text-gray-300 z-10"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <img
                src={selectedImageModal}
                alt="Full size"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
