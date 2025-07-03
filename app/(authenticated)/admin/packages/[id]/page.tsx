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
  const [isEditingInclusions, setIsEditingInclusions] = useState(false);
  const [editedInclusions, setEditedInclusions] = useState<Inclusion[]>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

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
        setPackageDetails(response.data.package);
        setEditedInclusions(response.data.package.inclusions);
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

  const handleEditInclusions = () => {
    setIsEditingInclusions(true);
    setEditedInclusions([...packageDetails!.inclusions]);
  };

  const handleCancelEdit = () => {
    setIsEditingInclusions(false);
    setEditedInclusions([...packageDetails!.inclusions]);
  };

  const handleSaveInclusions = async () => {
    try {
      const response = await axios.post(`${API_URL}/admin.php`, {
        operation: "updatePackage",
        package_id: packageDetails!.package_id,
        package_title: packageDetails!.package_title,
        package_description: packageDetails!.package_description,
        package_price: packageDetails!.package_price,
        guest_capacity: packageDetails!.guest_capacity,
        components: editedInclusions.map((inc, index) => ({
          component_name: inc.name,
          component_price: inc.price,
          display_order: index,
        })),
      });

      if (response.data.status === "success") {
        setPackageDetails((prev) =>
          prev ? { ...prev, inclusions: editedInclusions } : null
        );
        setIsEditingInclusions(false);
        toast.success("Inclusions updated successfully");
      } else {
        toast.error("Failed to update inclusions");
      }
    } catch (error) {
      console.error("Error updating inclusions:", error);
      toast.error("Failed to update inclusions");
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
              <button
                onClick={() =>
                  router.push(
                    `/admin/packages/package-builder/edit/${packageDetails.package_id}`
                  )
                }
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Package
              </button>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {packageDetails.package_title}
              </h1>
              <p className="text-gray-600 mt-2">
                {packageDetails.package_description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                ₱{packageDetails.package_price.toLocaleString()}
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                    {packageDetails.guest_capacity}
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
                    {packageDetails.inclusions.length}
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
                {!isEditingInclusions ? (
                  <button
                    onClick={handleEditInclusions}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSaveInclusions}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {(isEditingInclusions
                  ? editedInclusions
                  : packageDetails.inclusions
                ).map((inclusion, index) => (
                  <div
                    key={index}
                    className={`border-l-4 border-green-500 pl-4 ${
                      isEditingInclusions ? "bg-gray-50 p-4 rounded-r-lg" : ""
                    }`}
                    draggable={isEditingInclusions}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 flex-1">
                        {isEditingInclusions && (
                          <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                        )}
                        {isEditingInclusions ? (
                          <input
                            type="text"
                            value={inclusion.name}
                            onChange={(e) =>
                              handleInclusionNameChange(index, e.target.value)
                            }
                            className="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 flex-1"
                          />
                        ) : (
                          <h3 className="font-semibold text-gray-900">
                            {inclusion.name}
                          </h3>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {isEditingInclusions ? (
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
                        ) : (
                          <span className="text-lg font-bold text-green-600">
                            ₱{inclusion.price.toLocaleString()}
                          </span>
                        )}
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
                              <span className="text-gray-600">
                                ₱{component.price.toLocaleString()}
                              </span>
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
                                      <span>
                                        ₱{subComp.price.toLocaleString()}
                                      </span>
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
                ))}

                {isEditingInclusions && (
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
                          {venue.inclusions.map((inclusion) => (
                            <div
                              key={inclusion.inclusion_id}
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
              packagePrice={packageDetails.package_price}
              selectedVenue={packageDetails.venues[0] || null}
              components={(isEditingInclusions
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
