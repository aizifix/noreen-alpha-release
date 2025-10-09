"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { endpoints } from "@/app/config/api";
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
  Gift,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { EventTypeSelector } from "@/components/ui/event-type-selector";

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
  event_type_ids?: number[];
  event_type_names?: string[];
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

// Use centralized endpoints from config

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
    currentTypes: number[];
  }>({
    isOpen: false,
    currentTypes: [],
  });

  // New state for comprehensive editing
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<number[]>([]);
  const [editedFreebies, setEditedFreebies] = useState<string[]>([]);
  const [showAddInclusion, setShowAddInclusion] = useState(false);
  const [newInclusion, setNewInclusion] = useState<{
    name: string;
    price: number;
    components: Component[];
  }>({
    name: "",
    price: 0,
    components: [{ name: "", price: 0, subComponents: [] }],
  });
  const [availableEventTypes, setAvailableEventTypes] = useState<EventType[]>(
    []
  );
  const [editedEventTypes, setEditedEventTypes] = useState<number[]>([]);

  useEffect(() => {
    if (params.id) {
      fetchPackageDetails();
      fetchAvailableVenues();
      fetchAvailableEventTypes();
    }
  }, [params.id]);

  const fetchPackageDetails = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        endpoints.admin,
        {
          operation: "getPackageDetails",
          package_id: params.id,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Package details response:", response.data);

      if (response.data && response.data.status === "success") {
        const pkg = response.data.package;

        // Ensure all required fields have default values
        const safePackage = {
          ...pkg,
          package_price: pkg.package_price || 0,
          guest_capacity: pkg.guest_capacity || 0,
          inclusions: pkg.inclusions || [],
          venues: pkg.venues || [],
          freebies: pkg.freebies || [],
          event_types: pkg.event_types || [],
          event_type_ids: pkg.event_type_ids || [],
        };

        setPackageDetails(safePackage);
        setEditedInclusions(safePackage.inclusions);
        setEditedPackage({
          package_title: safePackage.package_title || "",
          package_description: safePackage.package_description || "",
          package_price: safePackage.package_price.toString(),
          guest_capacity: safePackage.guest_capacity,
        });
        // Initialize selected venues, freebies, and event types
        setSelectedVenues(safePackage.venues.map((v: Venue) => v.venue_id));
        setEditedFreebies(safePackage.freebies);
        setEditedEventTypes(safePackage.event_type_ids);

        console.log("Package loaded successfully:", {
          title: safePackage.package_title,
          inclusions: safePackage.inclusions.length,
          venues: safePackage.venues.length,
          eventTypes: safePackage.event_type_ids.length,
          freebies: safePackage.freebies.length,
        });
      } else {
        console.error(
          "Failed to fetch package details:",
          response.data?.message
        );
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

  const fetchAvailableVenues = async () => {
    try {
      const response = await axios.post(
        endpoints.admin,
        {
          operation: "getVenuesForPackage",
        },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Venues response:", response.data);

      if (response.data && response.data.status === "success") {
        setAvailableVenues(response.data.venues || []);
        console.log("Available venues:", response.data.venues?.length || 0);
      } else {
        console.error("Error fetching venues:", response.data?.message);
        toast.error("Failed to load venues");
      }
    } catch (error) {
      console.error("Error fetching venues:", error);
      toast.error("Failed to load venues");
    }
  };

  const fetchAvailableEventTypes = async () => {
    try {
      const response = await axios.post(
        endpoints.admin,
        {
          operation: "getEventTypes",
        },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Event types response:", response.data);

      if (response.data && response.data.status === "success") {
        setAvailableEventTypes(response.data.event_types || []);
        console.log("Available event types:", response.data.event_types);
      } else {
        console.error(
          "Error fetching event types:",
          response.data?.message || "Unknown error"
        );
        toast.error("Failed to load event types");
      }
    } catch (error) {
      console.error("Error fetching event types:", error);
      toast.error("Failed to load event types");
    }
  };

  const handleDeletePackage = async () => {
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
              package_id: params.id,
            },
            { headers: { "Content-Type": "application/json" } }
          );

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
        setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
      },
      variant: "destructive",
    });
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    // Fix the image URL construction - ensure proper path for image serving
    const cleanPath = imagePath.startsWith("uploads/")
      ? imagePath
      : `uploads/${imagePath}`;
    // Use centralized serve-image endpoint
    return `${endpoints.serveImage}?path=${encodeURIComponent(cleanPath)}`;
  };

  const handleEditPackage = () => {
    setIsEditing(true);
    setEditedInclusions([...(packageDetails!.inclusions || [])]);
    setEditedFreebies([...(packageDetails!.freebies || [])]);
    setEditedEventTypes(packageDetails!.event_type_ids || []);
    setSelectedVenues(
      packageDetails!.venues
        ? packageDetails!.venues.map((v: Venue) => v.venue_id)
        : []
    );
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedInclusions([...(packageDetails!.inclusions || [])]);
    setEditedFreebies([...(packageDetails!.freebies || [])]);
    setEditedEventTypes(packageDetails!.event_type_ids || []);
    setSelectedVenues(
      packageDetails!.venues
        ? packageDetails!.venues.map((v: Venue) => v.venue_id)
        : []
    );
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
      // Validate required fields
      if (!editedPackage.package_title.trim()) {
        toast.error("Package title is required");
        return;
      }

      if (
        !editedPackage.package_price ||
        parseFloat(editedPackage.package_price) <= 0
      ) {
        toast.error("Package price must be greater than 0");
        return;
      }

      if (!editedPackage.guest_capacity || editedPackage.guest_capacity <= 0) {
        toast.error("Guest capacity must be greater than 0");
        return;
      }

      // Prepare the update data
      const updateData: any = {
        operation: "updatePackage",
        package_id: packageDetails!.package_id,
        package_title: editedPackage.package_title.trim(),
        package_description: editedPackage.package_description.trim(),
        package_price: parseFloat(editedPackage.package_price),
        guest_capacity: editedPackage.guest_capacity,
        components: editedInclusions.map((inc, index) => ({
          component_name: inc.name.trim(),
          component_description:
            inc.components?.map((comp) => comp.name.trim()).join(", ") || "",
          component_price: inc.price || 0,
          display_order: index,
        })),
        freebies: editedFreebies.map((freebie, index) => ({
          freebie_name: freebie.trim(),
          freebie_description: "",
          freebie_value: 0,
          display_order: index,
        })),
        venues: selectedVenues,
        event_types: editedEventTypes,
        // Add activity logging
        log_activity: true,
        user_id: 1, // TODO: Get from session/auth context
        activity_type: "package_edited",
        activity_description: `Package "${editedPackage.package_title}" was edited`,
      };

      console.log("Sending update data:", updateData);
      console.log("Event types being sent:", editedEventTypes);

      // Make the API call with proper error handling
      const response = await axios.post(endpoints.admin, updateData, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        },
      });

      console.log("API response:", response.data);
      console.log("Response status:", response.status);

      // Handle empty response
      if (
        !response.data ||
        (typeof response.data === "object" &&
          Object.keys(response.data).length === 0)
      ) {
        console.error("Empty response detected");
        throw new Error(
          "Empty response from server - API may not be processing the request correctly"
        );
      }

      // Handle string responses that need parsing
      if (typeof response.data === "string") {
        try {
          const parsedData = JSON.parse(response.data);
          response.data = parsedData;
        } catch (parseError) {
          console.error("Failed to parse response:", parseError);
          throw new Error("Invalid JSON response from server");
        }
      }

      // Handle successful response
      if (response.data.status === "success") {
        // Update the package details in state
        setPackageDetails((prev) =>
          prev
            ? {
                ...prev,
                package_title: editedPackage.package_title,
                package_description: editedPackage.package_description,
                package_price: parseFloat(editedPackage.package_price),
                guest_capacity: editedPackage.guest_capacity,
                inclusions: editedInclusions,
                freebies: editedFreebies,
                venues: availableVenues.filter((v) =>
                  selectedVenues.includes(v.venue_id)
                ),
                event_types: availableEventTypes.filter((et) =>
                  editedEventTypes.includes(et.event_type_id)
                ),
                event_type_ids: editedEventTypes,
                event_type_names: availableEventTypes
                  .filter((et) => editedEventTypes.includes(et.event_type_id))
                  .map((et) => et.event_name),
              }
            : null
        );
        setIsEditing(false);
        toast.success("✅ Package updated successfully!", {
          description: "All changes have been saved.",
          duration: 5000,
        });
      } else if (
        response.data.status === "warning" &&
        response.data.requires_confirmation
      ) {
        // Handle budget overage warning
        setConfirmationModal({
          isOpen: true,
          title: "Budget Overage Warning",
          description: `Budget overage detected: ₱${response.data.overage_amount?.toLocaleString() || "0"} over budget. Continue anyway?`,
          onConfirm: async () => {
            updateData.confirm_overage = true;
            const retryResponse = await axios.post(
              endpoints.admin,
              updateData,
              {
                headers: { "Content-Type": "application/json" },
              }
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
                      freebies: editedFreebies,
                      venues: availableVenues.filter((v) =>
                        selectedVenues.includes(v.venue_id)
                      ),
                      event_types: availableEventTypes.filter((et) =>
                        editedEventTypes.includes(et.event_type_id)
                      ),
                      event_type_ids: editedEventTypes,
                      event_type_names: availableEventTypes
                        .filter((et) =>
                          editedEventTypes.includes(et.event_type_id)
                        )
                        .map((et) => et.event_name),
                    }
                  : null
              );
              setIsEditing(false);
              toast.success("✅ Package updated successfully!");
            } else {
              toast.error(
                retryResponse.data.message || "Failed to update package"
              );
            }
            setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
          },
          variant: "warning",
        });
      } else {
        // Handle error response
        console.error("API Error Response:", response.data);
        let errorMessage = "Failed to update package";

        if (response.data && response.data.message) {
          errorMessage = response.data.message;
        } else if (typeof response.data === "string") {
          errorMessage = response.data;
        }

        // Log debug information if available
        if (response.data && response.data.debug) {
          console.error("API Debug Information:", response.data.debug);
        }

        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error updating package:", error);
      console.error("Error details:", error.response?.data);
      console.error("Error status:", error.response?.status);

      let errorMessage = "Failed to update package";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
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

  // New handlers for comprehensive editing
  const handleVenueToggle = (venueId: number) => {
    setSelectedVenues((prev) =>
      prev.includes(venueId)
        ? prev.filter((id) => id !== venueId)
        : [...prev, venueId]
    );
  };

  const handleEventTypeToggle = (eventTypeId: number) => {
    setEditedEventTypes((prev) =>
      prev.includes(eventTypeId)
        ? prev.filter((id) => id !== eventTypeId)
        : [...prev, eventTypeId]
    );
  };

  const handleAddInclusion = () => {
    if (newInclusion.name.trim() && newInclusion.price > 0) {
      setEditedInclusions((prev) => [
        ...prev,
        {
          name: newInclusion.name,
          price: newInclusion.price,
          components: newInclusion.components.filter((comp) =>
            comp.name.trim()
          ),
        },
      ]);
      setNewInclusion({
        name: "",
        price: 0,
        components: [{ name: "", price: 0, subComponents: [] }],
      });
      setShowAddInclusion(false);
    }
  };

  const handleAddFreebie = (freebie: string) => {
    if (freebie.trim()) {
      setEditedFreebies((prev) => [...prev, freebie.trim()]);
    }
  };

  const handleRemoveFreebie = (index: number) => {
    setEditedFreebies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddComponent = (inclusionIndex: number) => {
    setEditedInclusions((prev) =>
      prev.map((inc, idx) =>
        idx === inclusionIndex
          ? {
              ...inc,
              components: [
                ...inc.components,
                { name: "", price: 0, subComponents: [] },
              ],
            }
          : inc
      )
    );
  };

  const handleUpdateComponent = (
    inclusionIndex: number,
    componentIndex: number,
    name: string,
    price: number
  ) => {
    setEditedInclusions((prev) =>
      prev.map((inc, idx) =>
        idx === inclusionIndex
          ? {
              ...inc,
              components: inc.components.map((comp, cidx) =>
                cidx === componentIndex ? { ...comp, name, price } : comp
              ),
            }
          : inc
      )
    );
  };

  const handleRemoveComponent = (
    inclusionIndex: number,
    componentIndex: number
  ) => {
    setEditedInclusions((prev) =>
      prev.map((inc, idx) =>
        idx === inclusionIndex
          ? {
              ...inc,
              components: inc.components.filter(
                (_, cidx) => cidx !== componentIndex
              ),
            }
          : inc
      )
    );
  };

  const handleEventTypeEdit = () => {
    setEventTypeModal({
      isOpen: true,
      currentTypes: packageDetails?.event_type_ids || [],
    });
  };

  const handleEventTypeSave = async (selectedTypes: number[]) => {
    if (!packageDetails) return;

    try {
      const response = await axios.post(
        endpoints.admin,
        {
          operation: "updatePackageEventTypes",
          package_id: packageDetails.package_id,
          event_type_ids: selectedTypes,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data.status === "success") {
        toast.success("Event types updated successfully");
        fetchPackageDetails();
      } else {
        toast.error("Failed to update event types");
      }
    } catch (error) {
      console.error("Error updating event types:", error);
      toast.error("Failed to update event types");
    }
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
      <div className="bg-white border-b border-gray-200">
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
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-gray-400" />
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
                  </div>
                  <div className="flex items-start gap-2">
                    <Edit className="h-4 w-4 text-gray-400 mt-2" />
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
                    <Edit className="h-4 w-4 text-gray-400" />
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
                  <div className="flex items-center space-x-2">
                    <Edit className="h-4 w-4 text-gray-400" />
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
                </div>
              ) : (
                <div>
                  <div className="text-3xl font-bold text-green-600">
                    ₱{packageDetails.package_price?.toLocaleString() || "0"}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Capacity: {packageDetails.guest_capacity} guests
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    packageDetails.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {packageDetails.is_active ? "Active" : "Inactive"}
                </span>
                {packageDetails.event_type_names &&
                  packageDetails.event_type_names.length > 0 && (
                    <button
                      onClick={handleEventTypeEdit}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      {packageDetails.event_type_names.slice(0, 2).join(", ")}
                      {packageDetails.event_type_names.length > 2 &&
                        " +" + (packageDetails.event_type_names.length - 2)}
                    </button>
                  )}
              </div>
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
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Package Inclusions
                </h2>
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      Edit mode - changes will be saved with the package
                    </span>
                    <button
                      onClick={() => setShowAddInclusion(true)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add Inclusion
                    </button>
                  </div>
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
                                <input
                                  type="text"
                                  value={component.name}
                                  onChange={(e) =>
                                    handleUpdateComponent(
                                      index,
                                      compIndex,
                                      e.target.value,
                                      component.price
                                    )
                                  }
                                  className="text-gray-700 bg-white border border-gray-300 rounded px-2 py-1 flex-1 mr-2"
                                  placeholder="Component name"
                                />
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500">
                                    ₱
                                  </span>
                                  <input
                                    type="number"
                                    value={component.price}
                                    onChange={(e) =>
                                      handleUpdateComponent(
                                        index,
                                        compIndex,
                                        component.name,
                                        Number(e.target.value)
                                      )
                                    }
                                    className="text-sm bg-white border border-gray-300 rounded px-2 py-1 w-20 text-right"
                                    placeholder="0"
                                  />
                                  <button
                                    onClick={() =>
                                      handleRemoveComponent(index, compIndex)
                                    }
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => handleAddComponent(index)}
                            className="ml-4 text-green-600 hover:text-green-800 text-sm flex items-center gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Add Component
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {(packageDetails.inclusions || []).map(
                      (inclusion, index) => (
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
                                ₱{inclusion.price?.toLocaleString() || "0"}
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
                      )
                    )}
                  </Accordion>
                )}

                {isEditing && (
                  <button
                    onClick={() => setShowAddInclusion(true)}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add New Inclusion
                  </button>
                )}
              </div>
            </div>

            {/* Venues */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {isEditing ? "Select Venues" : "Available Venues"}
                </h2>
                {isEditing && (
                  <span className="text-sm text-gray-500">
                    Choose venues for this package
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isEditing
                  ? availableVenues.map((venue) => (
                      <div
                        key={venue.venue_id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedVenues.includes(venue.venue_id)}
                              onChange={() => handleVenueToggle(venue.venue_id)}
                              className="h-4 w-4 text-green-600 focus:ring-green-500"
                            />
                          </div>
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
                                ₱{venue.total_price?.toLocaleString() || "0"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  : (packageDetails.venues || []).map((venue) => (
                      <div
                        key={venue.venue_id}
                        className="border rounded-lg p-4"
                      >
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
                                ₱{venue.total_price?.toLocaleString() || "0"}
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
                                    ₱
                                    {inclusion.inclusion_price?.toLocaleString() ||
                                      "0"}
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

            {/* Event Types */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {isEditing ? "Edit Event Types" : "Event Types"}
                  </h2>
                  {isEditing && (
                    <p className="text-sm text-gray-500 mt-1">
                      Manage which event types this package is suitable for.
                      Current types are shown as tags below.
                    </p>
                  )}
                </div>
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {editedEventTypes.length} selected
                    </span>
                    <button
                      onClick={() => setEditedEventTypes([])}
                      className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() =>
                        setEditedEventTypes(
                          availableEventTypes.map((et) => et.event_type_id)
                        )
                      }
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                    >
                      Select All
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-6">
                  {/* Current Event Types as Tags */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      Current Event Types
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {editedEventTypes.map((typeId) => {
                        const eventType = availableEventTypes.find(
                          (et) => et.event_type_id === typeId
                        );
                        return eventType ? (
                          <div
                            key={typeId}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-full border border-blue-200"
                          >
                            <span className="text-sm font-medium">
                              {eventType.event_name}
                            </span>
                            <button
                              onClick={() => handleEventTypeToggle(typeId)}
                              className="text-blue-600 hover:text-blue-800 p-0.5 rounded-full hover:bg-blue-200 transition-colors"
                              title="Remove event type"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : null;
                      })}
                      {editedEventTypes.length === 0 && (
                        <p className="text-sm text-gray-500 italic">
                          No event types selected
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Add New Event Types */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="event-type-select"
                      className="text-base font-medium"
                    >
                      Add Event Type
                    </Label>
                    <div className="flex gap-3">
                      <div className="flex-grow">
                        <Select
                          value=""
                          onValueChange={(value) => {
                            const eventTypeId = parseInt(value);
                            if (!editedEventTypes.includes(eventTypeId)) {
                              setEditedEventTypes((prev) => [
                                ...prev,
                                eventTypeId,
                              ]);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an event type to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableEventTypes
                              .filter(
                                (et) =>
                                  !editedEventTypes.includes(et.event_type_id)
                              )
                              .map((type) => (
                                <SelectItem
                                  key={type.event_type_id}
                                  value={type.event_type_id.toString()}
                                >
                                  {type.event_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {availableEventTypes.filter(
                      (et) => !editedEventTypes.includes(et.event_type_id)
                    ).length === 0 && (
                      <p className="text-sm text-gray-500 italic">
                        All available event types have been added
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(packageDetails.event_types || []).length > 0 ? (
                    (packageDetails.event_types || []).map((eventType) => (
                      <div
                        key={eventType.event_type_id}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-full border border-blue-200"
                      >
                        <span className="text-sm font-medium">
                          {eventType.event_name}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">
                      No event types assigned
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Freebies */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Package Freebies
                </h2>
                {isEditing && (
                  <span className="text-sm text-gray-500">
                    Edit freebies for this package
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  {editedFreebies.map((freebie, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={freebie}
                        onChange={(e) => {
                          const updated = [...editedFreebies];
                          updated[index] = e.target.value;
                          setEditedFreebies(updated);
                        }}
                        className="flex-1 border border-gray-300 rounded px-3 py-2"
                        placeholder="Freebie name"
                      />
                      <button
                        onClick={() => handleRemoveFreebie(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add new freebie"
                      className="flex-1 border border-gray-300 rounded px-3 py-2"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddFreebie(e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget
                          .previousElementSibling as HTMLInputElement;
                        if (input.value.trim()) {
                          handleAddFreebie(input.value);
                          input.value = "";
                        }
                      }}
                      className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {(packageDetails.freebies || []).length > 0 ? (
                    (packageDetails.freebies || []).map((freebie, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-blue-600" />
                        <span className="text-gray-700">{freebie}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No freebies specified</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Budget Breakdown */}
          <div className="lg:col-span-1">
            <BudgetBreakdown
              packagePrice={
                isEditing
                  ? parseFloat(editedPackage.package_price) || 0
                  : packageDetails?.package_price || 0
              }
              selectedVenue={packageDetails.venues[0] || null}
              components={(isEditing
                ? editedInclusions || []
                : packageDetails?.inclusions || []
              ).map((inc) => ({
                name: inc?.name || "Unknown",
                price: inc?.price || 0,
              }))}
              freebies={
                isEditing
                  ? editedFreebies || []
                  : packageDetails?.freebies || []
              }
            />
          </div>
        </div>
      </div>

      {/* Add New Inclusion Modal */}
      {showAddInclusion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Inclusion</h3>
              <button
                onClick={() => setShowAddInclusion(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inclusion Name
                </label>
                <input
                  type="text"
                  value={newInclusion.name}
                  onChange={(e) =>
                    setNewInclusion((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., Photography"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">₱</span>
                  <input
                    type="number"
                    value={newInclusion.price}
                    onChange={(e) =>
                      setNewInclusion((prev) => ({
                        ...prev,
                        price: Number(e.target.value),
                      }))
                    }
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Components
                </label>
                <div className="space-y-2">
                  {newInclusion.components.map((component, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={component.name}
                        onChange={(e) => {
                          const updated = [...newInclusion.components];
                          updated[index] = {
                            ...component,
                            name: e.target.value,
                          };
                          setNewInclusion((prev) => ({
                            ...prev,
                            components: updated,
                          }));
                        }}
                        className="flex-1 border border-gray-300 rounded px-3 py-2"
                        placeholder="Component name"
                      />
                      <input
                        type="number"
                        value={component.price}
                        onChange={(e) => {
                          const updated = [...newInclusion.components];
                          updated[index] = {
                            ...component,
                            price: Number(e.target.value),
                          };
                          setNewInclusion((prev) => ({
                            ...prev,
                            components: updated,
                          }));
                        }}
                        className="w-20 border border-gray-300 rounded px-2 py-2"
                        placeholder="0"
                      />
                      <button
                        onClick={() => {
                          const updated = newInclusion.components.filter(
                            (_, i) => i !== index
                          );
                          setNewInclusion((prev) => ({
                            ...prev,
                            components: updated,
                          }));
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setNewInclusion((prev) => ({
                        ...prev,
                        components: [
                          ...prev.components,
                          { name: "", price: 0, subComponents: [] },
                        ],
                      }))
                    }
                    className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Component
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddInclusion(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddInclusion}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Inclusion
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
