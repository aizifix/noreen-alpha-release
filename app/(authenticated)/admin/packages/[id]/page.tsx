"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { endpoints, api } from "@/app/config/api";
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
  Copy,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { BudgetBreakdown } from "../package-builder/budget-breakdown";
import Image from "next/image";
import { parsePrice, formatPrice } from "@/app/libs/utils";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  venue_fee_buffer?: number | null;
  profit_margin?: number | null;
}

interface Inclusion {
  name: string;
  price: number;
  components: Component[];
  // Supplier metadata (optional)
  supplier_id?: number;
  supplier_name?: string;
  offer_id?: number;
  offer_title?: string;
  tier_level?: number;
  is_customizable?: boolean;
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
  venue_details: string;
  venue_location: string;
  venue_capacity: number;
  venue_profile_picture: string;
  venue_cover_photo?: string;
  total_price: number;
  venue_price: number;
  extra_pax_rate: number;
  has_pax_rate?: boolean;
  base_capacity?: number;
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

interface Supplier {
  supplier_id: number;
  supplier_name: string;
  supplier_category: string;
  supplier_email: string;
  supplier_phone: string;
  supplier_status: string;
  is_verified: boolean;
  created_at: string;
  offers: SupplierOffer[];
  services?: Service[]; // Add services as fallback (like client booking)
}

interface SupplierOffer {
  offer_id: number;
  offer_title: string;
  offer_description: string;
  price_min: number | string; // Can be string from API
  price_max: number | string; // Can be string from API
  tier_level: number;
  is_customizable?: boolean; // Optional since it's not in the database
  offer_attachments: any[];
}

interface Service {
  service_id: number;
  service_name: string;
  service_description: string | null;
  service_price: number | string; // Can be string from API
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
  const [venueDetailsModal, setVenueDetailsModal] = useState<Venue | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedInclusions, setEditedInclusions] = useState<Inclusion[]>([]);
  const [editedInHouseInclusions, setEditedInHouseInclusions] = useState<
    Inclusion[]
  >([]);
  const [editedSupplierInclusions, setEditedSupplierInclusions] = useState<
    Inclusion[]
  >([]);

  // Computed value that combines all inclusions for real-time updates
  const allEditedInclusions = useMemo(() => {
    if (!isEditing) return packageDetails?.inclusions || [];
    return [...editedInHouseInclusions, ...editedSupplierInclusions];
  }, [
    isEditing,
    editedInHouseInclusions,
    editedSupplierInclusions,
    packageDetails?.inclusions,
  ]);
  const [editedPackage, setEditedPackage] = useState<{
    package_title: string;
    package_description: string;
    package_price: string;
    guest_capacity: number;
    venue_fee_buffer: string;
    profit_margin: string;
  }>({
    package_title: "",
    package_description: "",
    package_price: "",
    guest_capacity: 0,
    venue_fee_buffer: "",
    profit_margin: "",
  });
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);

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
  const [overageModal, setOverageModal] = useState<{
    isOpen: boolean;
    overageAmount: number;
    packagePrice: number;
    totalInclusionsCost: number;
    onConfirm: () => void;
  }>({
    isOpen: false,
    overageAmount: 0,
    packagePrice: 0,
    totalInclusionsCost: 0,
    onConfirm: () => {},
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

  // Supplier-related state
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [selectedTiers, setSelectedTiers] = useState<{
    [supplierId: number]: number;
  }>({}); // supplierId -> offerId
  const [selectedSuppliers, setSelectedSuppliers] = useState<{
    [key: string]: {
      supplier: Supplier;
      offer: SupplierOffer | Service;
      type: "offer" | "service";
    };
  }>({}); // Track selected suppliers for adding to package

  // Supplier details modal state
  const [showSupplierDetailsModal, setShowSupplierDetailsModal] =
    useState(false);
  const [selectedSupplierDetails, setSelectedSupplierDetails] = useState<{
    supplier: Supplier;
    inclusion: Inclusion;
  } | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchPackageDetails();
      fetchAvailableVenues();
      fetchAvailableEventTypes();
      fetchAvailableSuppliers();
    }
  }, [params.id]);

  // Navigation guard for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && isEditing) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    const handleRouteChange = () => {
      if (hasUnsavedChanges && isEditing) {
        setShowNavigationModal(true);
        return false;
      }
      return true;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, isEditing]);

  const fetchPackageDetails = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching package details for ID:", params.id);
      console.log("Using endpoint:", endpoints.admin);

      const response = await axios.post(
        endpoints.admin,
        {
          operation: "getPackageDetails",
          package_id: params.id,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000, // 10 second timeout
        }
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
          profit_margin: pkg.profit_margin ?? null,
        };

        setPackageDetails(safePackage);
        setEditedInclusions(
          safePackage.inclusions.filter(
            (inc: Inclusion) => inc.name !== "Venue Fee"
          )
        );

        // Separate in-house and supplier inclusions (excluding Venue Fee)
        const inHouseInclusions = safePackage.inclusions.filter(
          (inc: Inclusion) => !inc.supplier_id && inc.name !== "Venue Fee"
        );
        const supplierInclusions = safePackage.inclusions.filter(
          (inc: Inclusion) => inc.supplier_id
        );
        setEditedInHouseInclusions(inHouseInclusions);
        setEditedSupplierInclusions(supplierInclusions);
        setEditedPackage({
          package_title: safePackage.package_title || "",
          package_description: safePackage.package_description || "",
          package_price: safePackage.package_price.toString(),
          guest_capacity: safePackage.guest_capacity,
          venue_fee_buffer: (safePackage.venue_fee_buffer ?? 0).toString(),
          profit_margin: (safePackage.profit_margin ?? 0).toString(),
        });
        // Initialize selected venues, freebies, and event types
        setSelectedVenues(safePackage.venues.map((v: Venue) => v.venue_id));
        setEditedFreebies(safePackage.freebies);
        setEditedEventTypes(safePackage.event_type_ids);

        // Initialize supplier selections from existing inclusions
        const existingSelections: { [key: number]: number } = {};
        safePackage.inclusions?.forEach((inclusion: Inclusion) => {
          if (inclusion.supplier_id && inclusion.offer_id) {
            existingSelections[inclusion.supplier_id] = inclusion.offer_id;
          }
        });
        setSelectedTiers(existingSelections);

        console.log("Package loaded successfully:", {
          title: safePackage.package_title,
          inclusions: safePackage.inclusions.length,
          venues: safePackage.venues.length,
          eventTypes: safePackage.event_type_ids.length,
          freebies: safePackage.freebies.length,
          supplierSelections: Object.keys(existingSelections).length,
        });
      } else {
        console.error(
          "Failed to fetch package details:",
          response.data?.message
        );
        toast.error("Failed to fetch package details");
        router.push("/admin/packages");
      }
    } catch (error: any) {
      console.error("Error fetching package details:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error message:", error.message);

      let errorMessage = "Failed to load package details";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      router.push("/admin/packages");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableVenues = async () => {
    try {
      const response = await axios.get(
        `${endpoints.admin}?operation=getVenuesForPackage`
      );

      console.log("Venues response:", response.data);

      if (response.data && response.data.status === "success") {
        setAvailableVenues(response.data.venues || []);
        console.log("Available venues:", response.data.venues?.length || 0);
        console.log("First venue data:", response.data.venues?.[0]);
        console.log(
          "First venue extra_pax_rate:",
          response.data.venues?.[0]?.extra_pax_rate
        );
        console.log(
          "First venue venue_price:",
          response.data.venues?.[0]?.venue_price
        );
        console.log(
          "All venues extra_pax_rates:",
          response.data.venues?.map((v: Venue) => ({
            id: v.venue_id,
            title: v.venue_title,
            extra_pax_rate: v.extra_pax_rate,
            venue_price: v.venue_price,
          }))
        );
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

  const fetchAvailableSuppliers = async () => {
    try {
      console.log("=== fetchAvailableSuppliers called ===");
      const response = await axios.post(
        endpoints.admin,
        {
          operation: "getSuppliersForPackage",
        },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Suppliers response:", response.data);

      if (response.data && response.data.status === "success") {
        const suppliers = response.data.suppliers || [];
        setAvailableSuppliers(suppliers);
        console.log("Available suppliers loaded:", suppliers.length);
        console.log("Sample supplier:", suppliers[0]);
      } else {
        console.error("Error fetching suppliers:", response.data?.message);
        toast.error("Failed to load suppliers");
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Failed to load suppliers");
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

  const handleDuplicatePackage = async () => {
    if (!packageDetails) return;

    setConfirmationModal({
      isOpen: true,
      title: "Duplicate Package",
      description: `Are you sure you want to create a copy of "${packageDetails.package_title}"? This will create a new package with the same details.`,
      onConfirm: async () => {
        try {
          const response = await axios.post(
            endpoints.admin,
            {
              operation: "duplicatePackage",
              package_id: params.id,
            },
            { headers: { "Content-Type": "application/json" } }
          );

          if (response.data.status === "success") {
            toast.success("Package duplicated successfully");
            router.push("/admin/packages");
          } else {
            toast.error("Failed to duplicate package");
          }
        } catch (error) {
          console.error("Error duplicating package:", error);
          toast.error("Failed to duplicate package");
        }
        setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
      },
      variant: "default",
    });
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    // Use the API helper that handles JSON parsing
    return api.getServeImageUrl(imagePath);
  };

  const markAsChanged = () => {
    if (isEditing) {
      setHasUnsavedChanges(true);
    }
  };

  const handleEditPackage = () => {
    setIsEditing(true);
    setEditedInclusions([...(packageDetails!.inclusions || [])]);

    // Separate inclusions
    const inHouseInclusions = packageDetails!.inclusions.filter(
      (inc) => !inc.supplier_id
    );
    const supplierInclusions = packageDetails!.inclusions.filter(
      (inc) => inc.supplier_id
    );
    setEditedInHouseInclusions(inHouseInclusions);
    setEditedSupplierInclusions(supplierInclusions);

    setEditedFreebies([...(packageDetails!.freebies || [])]);
    setEditedEventTypes(packageDetails!.event_type_ids || []);
    setSelectedVenues(
      packageDetails!.venues
        ? packageDetails!.venues.map((v: Venue) => v.venue_id)
        : []
    );

    toast.success("Edit mode activated", {
      description: "You can now modify package details",
      duration: 3000,
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setHasUnsavedChanges(false);
    setEditedInclusions([...(packageDetails!.inclusions || [])]);

    // Reset separated inclusions
    const inHouseInclusions = packageDetails!.inclusions.filter(
      (inc) => !inc.supplier_id
    );
    const supplierInclusions = packageDetails!.inclusions.filter(
      (inc) => inc.supplier_id
    );
    setEditedInHouseInclusions(inHouseInclusions);
    setEditedSupplierInclusions(supplierInclusions);

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
      venue_fee_buffer: (packageDetails!.venue_fee_buffer ?? 0).toString(),
      profit_margin: (packageDetails!.profit_margin ?? 0).toString(),
    });

    // Preserve supplier selections from existing inclusions
    const existingSelections: { [key: number]: number } = {};
    packageDetails!.inclusions?.forEach((inclusion) => {
      if (inclusion.supplier_id && inclusion.offer_id) {
        existingSelections[inclusion.supplier_id] = inclusion.offer_id;
      }
    });
    setSelectedTiers(existingSelections);

    toast.info("Changes discarded", {
      description: "All unsaved changes have been reverted",
      duration: 3000,
    });
  };

  const handleSavePackage = async () => {
    setIsSaving(true);
    try {
      // Validate required fields
      if (!editedPackage.package_title.trim()) {
        toast.error("Package title is required");
        setIsSaving(false);
        return;
      }

      if (!packageDetails) {
        toast.error("Package details not loaded. Please refresh the page.");
        setIsSaving(false);
        return;
      }

      // Validate package price using utility function
      // Remove commas before parsing
      const cleanPrice = editedPackage.package_price.replace(/,/g, "");
      const packagePriceValue = parsePrice(cleanPrice);

      if (!packagePriceValue || packagePriceValue <= 0) {
        toast.error("Package price must be a valid number greater than 0");
        setIsSaving(false);
        return;
      }

      if (!editedPackage.guest_capacity || editedPackage.guest_capacity <= 0) {
        toast.error("Guest capacity must be greater than 0");
        setIsSaving(false);
        return;
      }

      // Prepare the update data
      const updateData: any = {
        operation: "updatePackage",
        package_id: packageDetails!.package_id,
        package_title: editedPackage.package_title.trim(),
        package_description: editedPackage.package_description.trim(),
        package_price: packagePriceValue,
        guest_capacity: editedPackage.guest_capacity,
        venue_fee_buffer:
          parsePrice(editedPackage.venue_fee_buffer.replace(/,/g, "")) || 0,
        profit_margin:
          parsePrice(editedPackage.profit_margin.replace(/,/g, "")) || 0,
        components: [
          ...editedInHouseInclusions,
          ...editedSupplierInclusions,
        ].map((inc, index) => ({
          component_name: inc.name.trim(),
          component_description:
            inc.components?.map((comp) => comp.name.trim()).join(", ") || "",
          component_price: inc.price || 0,
          display_order: index,
          // Include supplier information if available
          supplier_id: inc.supplier_id || null,
          offer_id: inc.offer_id || null,
          tier_level: inc.tier_level || null,
          is_customizable: inc.is_customizable || false,
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
                package_price: packagePriceValue,
                guest_capacity: editedPackage.guest_capacity,
                venue_fee_buffer:
                  parsePrice(
                    editedPackage.venue_fee_buffer.replace(/,/g, "")
                  ) || 0,
                profit_margin:
                  parsePrice(editedPackage.profit_margin.replace(/,/g, "")) ||
                  0,
                inclusions: [
                  ...editedInHouseInclusions,
                  ...editedSupplierInclusions,
                ],
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
        setHasUnsavedChanges(false);
        toast.success("✅ Package updated successfully!", {
          description: "All changes have been saved.",
          duration: 5000,
        });
      } else if (
        response.data.status === "warning" &&
        response.data.requires_confirmation
      ) {
        // Handle budget overage warning with detailed breakdown
        const overageAmount = response.data.overage_amount || 0;
        const packagePrice = parsePrice(
          editedPackage.package_price.replace(/,/g, "")
        );
        const totalInclusionsCost = [
          ...editedInHouseInclusions,
          ...editedSupplierInclusions,
        ].reduce((sum, inc) => sum + (inc.price || 0), 0);

        setOverageModal({
          isOpen: true,
          overageAmount,
          packagePrice,
          totalInclusionsCost,
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
                      package_price: packagePriceValue,
                      guest_capacity: editedPackage.guest_capacity,
                      venue_fee_buffer:
                        parsePrice(
                          editedPackage.venue_fee_buffer.replace(/,/g, "")
                        ) || 0,
                      profit_margin:
                        parsePrice(
                          editedPackage.profit_margin.replace(/,/g, "")
                        ) || 0,
                      inclusions: [
                        ...editedInHouseInclusions,
                        ...editedSupplierInclusions,
                      ],
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
              setHasUnsavedChanges(false);
              toast.success("✅ Package updated successfully!");
            } else {
              toast.error(
                retryResponse.data.message || "Failed to update package"
              );
            }
            setOverageModal((prev) => ({ ...prev, isOpen: false }));
          },
        });
      } else {
        // Handle error response
        console.error("API Error Response:", response.data);
        console.error("Response status:", response.status);
        console.error("Response headers:", response.headers);

        let errorMessage = "Failed to update package";

        // Handle empty response object
        if (
          !response.data ||
          (typeof response.data === "object" &&
            Object.keys(response.data).length === 0)
        ) {
          errorMessage =
            "Server returned empty response. Please check your connection and try again.";
          console.error("Empty response object detected");
        } else if (response.data && response.data.message) {
          errorMessage = response.data.message;
        } else if (typeof response.data === "string") {
          errorMessage = response.data;
        } else if (response.data && response.data.error) {
          errorMessage = response.data.error;
        }

        // Log debug information if available
        if (response.data && response.data.debug) {
          console.error("API Debug Information:", response.data.debug);
        }

        // Log the full response for debugging
        console.error("Full API response:", {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          headers: response.headers,
        });

        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error updating package:", error);
      console.error("Error details:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error code:", error.code);
      console.error("Error config:", error.config);

      let errorMessage = "Failed to update package";

      // Handle different types of errors
      if (error.code === "NETWORK_ERROR" || error.code === "ECONNABORTED") {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.response?.status === 404) {
        errorMessage = "API endpoint not found. Please contact support.";
      } else if (error.response?.status === 403) {
        errorMessage = "Access denied. Please check your permissions.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Log full error for debugging
      console.error("Full error object:", {
        message: error.message,
        code: error.code,
        response: error.response,
        config: error.config,
      });

      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInclusionNameChange = (
    index: number,
    newName: string,
    isSupplier: boolean = false
  ) => {
    if (isSupplier) {
      const updated = [...editedSupplierInclusions];
      updated[index] = { ...updated[index], name: newName };
      setEditedSupplierInclusions(updated);
    } else {
      const updated = [...editedInHouseInclusions];
      updated[index] = { ...updated[index], name: newName };
      setEditedInHouseInclusions(updated);
    }
    markAsChanged();
    toast.info("Inclusion updated", {
      description: `Name changed to "${newName}"`,
      duration: 2000,
    });
  };

  const handleInclusionPriceChange = (
    index: number,
    newPrice: number,
    isSupplier: boolean = false
  ) => {
    if (isSupplier) {
      const updated = [...editedSupplierInclusions];
      updated[index] = { ...updated[index], price: newPrice };
      setEditedSupplierInclusions(updated);
    } else {
      const updated = [...editedInHouseInclusions];
      updated[index] = { ...updated[index], price: newPrice };
      setEditedInHouseInclusions(updated);
    }
    markAsChanged();
    toast.info("Price updated", {
      description: `New price: ₱${newPrice.toLocaleString()}`,
      duration: 2000,
    });
  };

  const handleRemoveInclusion = (
    index: number,
    isSupplier: boolean = false
  ) => {
    const inclusionName = isSupplier
      ? editedSupplierInclusions[index]?.name
      : editedInHouseInclusions[index]?.name;

    if (isSupplier) {
      const updated = editedSupplierInclusions.filter((_, i) => i !== index);
      setEditedSupplierInclusions(updated);
    } else {
      const updated = editedInHouseInclusions.filter((_, i) => i !== index);
      setEditedInHouseInclusions(updated);
    }
    markAsChanged();
    toast.warning("Inclusion removed", {
      description: `"${inclusionName}" has been removed`,
      duration: 3000,
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    e: React.DragEvent,
    dropIndex: number,
    isSupplier: boolean = false
  ) => {
    e.preventDefault();

    if (draggedItem === null) return;

    if (isSupplier) {
      const updated = [...editedSupplierInclusions];
      const draggedInclusion = updated[draggedItem];
      updated.splice(draggedItem, 1);
      updated.splice(dropIndex, 0, draggedInclusion);
      setEditedSupplierInclusions(updated);
    } else {
      const updated = [...editedInHouseInclusions];
      const draggedInclusion = updated[draggedItem];
      updated.splice(draggedItem, 1);
      updated.splice(dropIndex, 0, draggedInclusion);
      setEditedInHouseInclusions(updated);
    }
    setDraggedItem(null);
  };

  // New handlers for comprehensive editing
  const handleVenueToggle = (venueId: number) => {
    const venue = availableVenues.find((v) => v.venue_id === venueId);
    const isSelected = selectedVenues.includes(venueId);

    setSelectedVenues((prev) =>
      prev.includes(venueId)
        ? prev.filter((id) => id !== venueId)
        : [...prev, venueId]
    );

    markAsChanged();
    toast.info(isSelected ? "Venue removed" : "Venue added", {
      description: isSelected
        ? `"${venue?.venue_title}" removed from package`
        : `"${venue?.venue_title}" added to package`,
      duration: 3000,
    });
  };

  const handleEventTypeToggle = (eventTypeId: number) => {
    const eventType = availableEventTypes.find(
      (et) => et.event_type_id === eventTypeId
    );
    const isSelected = editedEventTypes.includes(eventTypeId);

    setEditedEventTypes((prev) =>
      prev.includes(eventTypeId)
        ? prev.filter((id) => id !== eventTypeId)
        : [...prev, eventTypeId]
    );

    markAsChanged();
    toast.info(isSelected ? "Event type removed" : "Event type added", {
      description: isSelected
        ? `"${eventType?.event_name}" removed from package`
        : `"${eventType?.event_name}" added to package`,
      duration: 3000,
    });
  };

  const handleAddInclusion = () => {
    if (newInclusion.name.trim() && newInclusion.price > 0) {
      setEditedInHouseInclusions((prev) => [
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

      markAsChanged();
      toast.success("Inclusion added", {
        description: `"${newInclusion.name}" has been added to the package`,
        duration: 3000,
      });
    }
  };

  const handleAddFreebie = (freebie: string) => {
    if (freebie.trim()) {
      setEditedFreebies((prev) => [...prev, freebie.trim()]);
      markAsChanged();
      toast.success("Freebie added", {
        description: `"${freebie.trim()}" has been added to the package`,
        duration: 3000,
      });
    }
  };

  const handleRemoveFreebie = (index: number) => {
    const freebieName = editedFreebies[index];
    setEditedFreebies((prev) => prev.filter((_, i) => i !== index));
    markAsChanged();
    toast.warning("Freebie removed", {
      description: `"${freebieName}" has been removed from the package`,
      duration: 3000,
    });
  };

  const handleAddComponent = (
    inclusionIndex: number,
    isSupplier: boolean = false
  ) => {
    if (isSupplier) {
      setEditedSupplierInclusions((prev) =>
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
    } else {
      setEditedInHouseInclusions((prev) =>
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
    }
  };

  const handleUpdateComponent = (
    inclusionIndex: number,
    componentIndex: number,
    name: string,
    price: number,
    isSupplier: boolean = false
  ) => {
    if (isSupplier) {
      setEditedSupplierInclusions((prev) =>
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
    } else {
      setEditedInHouseInclusions((prev) =>
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
    }
  };

  const handleRemoveComponent = (
    inclusionIndex: number,
    componentIndex: number,
    isSupplier: boolean = false
  ) => {
    if (isSupplier) {
      setEditedSupplierInclusions((prev) =>
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
    } else {
      setEditedInHouseInclusions((prev) =>
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
    }
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

  // Supplier-related handlers
  const handleAddSupplier = () => {
    console.log("=== handleAddSupplier called ===");
    console.log("Available suppliers:", availableSuppliers.length);
    console.log("Current selected tiers:", selectedTiers);

    // Preserve existing supplier selections from supplier inclusions
    const existingSelections: { [key: number]: number } = {};
    editedSupplierInclusions.forEach((inclusion) => {
      if (inclusion.supplier_id && inclusion.offer_id) {
        existingSelections[inclusion.supplier_id] = inclusion.offer_id;
      }
    });

    // Merge with current selected tiers, but prioritize existing inclusions
    const validSelections: { [key: number]: number } = {
      ...existingSelections,
    };
    Object.entries(selectedTiers).forEach(([supplierIdStr, offerId]) => {
      const supplierId = parseInt(supplierIdStr);
      const supplier = availableSuppliers.find(
        (s) => s.supplier_id === supplierId
      );
      if (supplier && !existingSelections[supplierId]) {
        validSelections[supplierId] = offerId;
      }
    });

    setSelectedTiers(validSelections);
    setShowSupplierModal(true);
    console.log(
      "Modal should be opening now with preserved selections:",
      validSelections
    );
  };

  const handleRefreshSuppliers = async () => {
    try {
      await fetchAvailableSuppliers();
      setSelectedTiers({});
      toast.success("Supplier data refreshed");
    } catch (error) {
      console.error("Error refreshing suppliers:", error);
      toast.error("Failed to refresh supplier data");
    }
  };

  const handleSupplierSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
  };

  const handleTierSelect = (supplierId: number, offerId: number) => {
    console.log(`Selecting tier: supplier ${supplierId}, offer ${offerId}`);

    // Check if this supplier+tier combination already exists in supplier inclusions
    const existingInclusion = editedSupplierInclusions.find(
      (inc) => inc.supplier_id === supplierId && inc.offer_id === offerId
    );

    if (existingInclusion) {
      toast.error(
        "This supplier and tier combination is already added to the package"
      );
      return;
    }

    // Check if this supplier already has a different tier in supplier inclusions
    const existingSupplierInclusion = editedSupplierInclusions.find(
      (inc) => inc.supplier_id === supplierId && inc.offer_id !== offerId
    );

    if (existingSupplierInclusion) {
      // Remove the existing tier and add the new one
      setEditedSupplierInclusions((prev) =>
        prev.filter(
          (inc) => !(inc.supplier_id === supplierId && inc.offer_id !== offerId)
        )
      );
      toast.success("Previous tier removed, new tier selected");
    }

    setSelectedTiers((prev) => {
      const updated = {
        ...prev,
        [supplierId]: offerId,
      };
      console.log("Updated selected tiers:", updated);
      return updated;
    });
  };

  const getSelectedOffer = (supplier: Supplier): SupplierOffer | null => {
    const selectedOfferId = selectedTiers[supplier.supplier_id];
    console.log(
      `Getting selected offer for supplier ${supplier.supplier_id}:`,
      selectedOfferId
    );
    console.log(
      `Available offers:`,
      supplier.offers.map((o) => ({ id: o.offer_id, title: o.offer_title }))
    );

    if (!selectedOfferId) {
      console.log(`No offer selected for supplier ${supplier.supplier_id}`);
      return null;
    }

    const foundOffer = supplier.offers.find(
      (offer) => offer.offer_id === selectedOfferId
    );
    console.log(`Found offer:`, foundOffer);
    return foundOffer || null;
  };

  // Check if a supplier+offer combination is already in the package
  const isSupplierOfferInPackage = (
    supplierId: number,
    offerId: number
  ): boolean => {
    return editedSupplierInclusions.some(
      (inc) => inc.supplier_id === supplierId && inc.offer_id === offerId
    );
  };

  // Check if a supplier has any tier in the package
  const isSupplierInPackage = (supplierId: number): boolean => {
    return editedSupplierInclusions.some(
      (inc) => inc.supplier_id === supplierId
    );
  };

  // Handle clicking on supplier badge to show details
  const handleSupplierBadgeClick = (inclusion: Inclusion) => {
    if (!inclusion.supplier_id) return;

    // Find the supplier from available suppliers
    const supplier = availableSuppliers.find(
      (s) => s.supplier_id === inclusion.supplier_id
    );
    if (supplier) {
      setSelectedSupplierDetails({
        supplier,
        inclusion,
      });
      setShowSupplierDetailsModal(true);
    } else {
      toast.error("Supplier details not found");
    }
  };

  // Navigation guard handlers
  const handleNavigationAttempt = (navigationFn: () => void) => {
    if (hasUnsavedChanges && isEditing) {
      setPendingNavigation(() => navigationFn);
      setShowNavigationModal(true);
    } else {
      navigationFn();
    }
  };

  const handleConfirmNavigation = () => {
    if (pendingNavigation) {
      setHasUnsavedChanges(false);
      setIsEditing(false);
      pendingNavigation();
      setPendingNavigation(null);
    }
    setShowNavigationModal(false);
  };

  const handleCancelNavigation = () => {
    setPendingNavigation(null);
    setShowNavigationModal(false);
  };

  // Handle adding supplier service (using client booking logic as reference)
  const handleAddSupplierService = (service: any, supplier: Supplier) => {
    console.log("=== handleAddSupplierService called ===");
    console.log("Service:", service);
    console.log("Supplier:", supplier);

    try {
      // Create inclusion object similar to client booking logic
      const newInclusion: Inclusion = {
        name:
          service.service_name ||
          service.offer_title ||
          `${supplier.supplier_name} Service`,
        price: parsePrice(service.service_price || service.price_min || 0),
        components: [
          {
            name:
              service.service_description ||
              service.offer_description ||
              "Supplier Service",
            price: parsePrice(service.service_price || service.price_min || 0),
            subComponents: [],
          },
        ],
        // Add supplier metadata for tracking (similar to client)
        supplier_id: supplier.supplier_id,
        supplier_name: supplier.supplier_name,
        offer_id: service.offer_id || service.service_id,
        offer_title: service.offer_title || service.service_name,
        tier_level: service.tier_level || 1,
        is_customizable: service.is_customizable || false,
      };

      console.log("Created new inclusion:", newInclusion);

      // Add to edited supplier inclusions
      setEditedSupplierInclusions((prev) => {
        const updated = [...prev, newInclusion];
        console.log("Updated supplier inclusions:", updated);

        // Calculate total cost of new supplier inclusion
        const supplierCost = newInclusion.price || 0;
        console.log("Supplier cost to add:", supplierCost);

        // Update package price to include supplier cost
        if (supplierCost > 0) {
          const cleanCurrentPrice = editedPackage.package_price.replace(
            /,/g,
            ""
          );
          const currentPrice = parsePrice(cleanCurrentPrice);
          const newPrice = currentPrice + supplierCost;
          setEditedPackage((prev) => ({
            ...prev,
            package_price: newPrice.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            }),
          }));
          console.log(
            `Package price updated from ${formatPrice(currentPrice)} to ${formatPrice(newPrice)}`
          );
        }

        return updated;
      });

      // Close modal and show success
      setShowSupplierModal(false);
      setSelectedSupplier(null);
      setSelectedTiers({});

      toast.success(
        `Supplier service "${newInclusion.name}" added successfully`
      );
    } catch (error) {
      console.error("Error in handleAddSupplierService:", error);
      toast.error(
        "An error occurred while adding supplier service. Please try again."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#028A75] mx-auto mb-4"></div>
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
                onClick={() =>
                  handleNavigationAttempt(() => router.push("/admin/packages"))
                }
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Packages
              </button>
              {hasUnsavedChanges && isEditing && (
                <div className="ml-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-yellow-600 font-medium">
                    Unsaved changes
                  </span>
                </div>
              )}
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
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#028A75] hover:bg-[#027A6B] disabled:opacity-50"
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
                onClick={handleDuplicatePackage}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Package
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
                      onChange={(e) => {
                        setEditedPackage((prev) => ({
                          ...prev,
                          package_title: e.target.value,
                        }));
                        markAsChanged();
                        toast.info("Package title updated", {
                          description: `Title changed to "${e.target.value}"`,
                          duration: 2000,
                        });
                      }}
                      className="text-3xl font-bold text-gray-900 bg-white border border-gray-300 rounded px-3 py-2 w-full"
                      placeholder="Package Title"
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <Edit className="h-4 w-4 text-gray-400 mt-2" />
                    <textarea
                      value={editedPackage.package_description}
                      onChange={(e) => {
                        setEditedPackage((prev) => ({
                          ...prev,
                          package_description: e.target.value,
                        }));
                        markAsChanged();
                        toast.info("Package description updated", {
                          description: "Description has been modified",
                          duration: 2000,
                        });
                      }}
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
                      type="text"
                      value={editedPackage.package_price}
                      onChange={(e) => {
                        // Remove non-numeric characters except decimal point
                        let value = e.target.value.replace(/[^\d.]/g, "");

                        // Ensure only one decimal point
                        const parts = value.split(".");
                        if (parts.length > 2) {
                          value = parts[0] + "." + parts.slice(1).join("");
                        }

                        // Format with commas automatically as user types
                        if (value && value !== ".") {
                          const numericValue = parseFloat(value);
                          if (!isNaN(numericValue)) {
                            const formattedValue = numericValue.toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              }
                            );
                            setEditedPackage((prev) => ({
                              ...prev,
                              package_price: formattedValue,
                            }));
                            markAsChanged();
                            toast.info("Package price updated", {
                              description: `New price: ₱${formattedValue}`,
                              duration: 2000,
                            });
                            return;
                          }
                        }

                        setEditedPackage((prev) => ({
                          ...prev,
                          package_price: value,
                        }));
                        markAsChanged();
                      }}
                      onFocus={(e) => {
                        // Remove commas on focus for easier editing
                        const numericValue =
                          parseFloat(e.target.value.replace(/,/g, "")) || 0;
                        setEditedPackage((prev) => ({
                          ...prev,
                          package_price: numericValue.toString(),
                        }));
                      }}
                      className="text-3xl font-bold text-[#028A75] bg-white border border-gray-300 rounded px-3 py-2 w-48 text-right"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Edit className="h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={editedPackage.guest_capacity}
                      onChange={(e) => {
                        const newCapacity = parseInt(e.target.value) || 0;
                        setEditedPackage((prev) => ({
                          ...prev,
                          guest_capacity: newCapacity,
                        }));
                        markAsChanged();
                        toast.info("Guest capacity updated", {
                          description: `New capacity: ${newCapacity} guests`,
                          duration: 2000,
                        });
                      }}
                      className="text-sm bg-white border border-gray-300 rounded px-2 py-1 w-20 text-right"
                      placeholder="Capacity"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-3xl font-bold text-[#028A75]">
                    {formatPrice(packageDetails.package_price || 0)}
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
                      ? "bg-[#028A75]/20 text-[#028A75]"
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
            <div className="bg-[#028A75]/10 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-[#028A75]" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-[#028A75]">
                    Guest Capacity
                  </p>
                  <p className="text-2xl font-bold text-[#028A75]">
                    {isEditing
                      ? editedPackage.guest_capacity
                      : packageDetails.guest_capacity}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[#028A75]/10 rounded-lg p-4">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-[#028A75]" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-[#028A75]">
                    Inclusions
                  </p>
                  <p className="text-2xl font-bold text-[#028A75]">
                    {isEditing
                      ? editedInHouseInclusions.length +
                        editedSupplierInclusions.length
                      : packageDetails.inclusions.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[#028A75]/10 rounded-lg p-4">
              <div className="flex items-center">
                <MapPin className="h-8 w-8 text-[#028A75]" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-[#028A75]">Venues</p>
                  <p className="text-2xl font-bold text-[#028A75]">
                    {packageDetails.venues.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[#028A75]/10 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-[#028A75]" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-[#028A75]">Created</p>
                  <p className="text-sm font-bold text-[#028A75]">
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
            {/* Budget Management Section */}
            <div className="space-y-6">
              {/* Venue Fee Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                    <MapPin className="h-6 w-6" />
                    Venue Fee Management
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Venue Fee Buffer Display */}
                  <div className="bg-white rounded-lg p-6 border border-blue-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Venue Fee Buffer
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Maximum amount allocated for venue costs
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          This amount is separate from the main package price
                          and covers venue-related expenses only.
                        </p>
                      </div>
                      <div className="text-right">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <Edit className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">₱</span>
                            <input
                              type="text"
                              value={editedPackage.venue_fee_buffer}
                              onChange={(e) => {
                                // Remove non-numeric characters except decimal point
                                let value = e.target.value.replace(
                                  /[^\d.]/g,
                                  ""
                                );

                                // Ensure only one decimal point
                                const parts = value.split(".");
                                if (parts.length > 2) {
                                  value =
                                    parts[0] + "." + parts.slice(1).join("");
                                }

                                // Format with commas automatically as user types
                                if (value && value !== ".") {
                                  const numericValue = parseFloat(value);
                                  if (!isNaN(numericValue)) {
                                    const formattedValue =
                                      numericValue.toLocaleString("en-US", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 2,
                                      });
                                    setEditedPackage((prev) => ({
                                      ...prev,
                                      venue_fee_buffer: formattedValue,
                                    }));
                                    markAsChanged();
                                    toast.info("Venue fee buffer updated", {
                                      description: `New buffer: ₱${formattedValue}`,
                                      duration: 2000,
                                    });
                                    return;
                                  }
                                }

                                setEditedPackage((prev) => ({
                                  ...prev,
                                  venue_fee_buffer: value,
                                }));
                                markAsChanged();
                              }}
                              onFocus={(e) => {
                                // Remove commas on focus for easier editing
                                const numericValue =
                                  parseFloat(
                                    e.target.value.replace(/,/g, "")
                                  ) || 0;
                                setEditedPackage((prev) => ({
                                  ...prev,
                                  venue_fee_buffer: numericValue.toString(),
                                }));
                              }}
                              className="text-3xl font-bold text-blue-600 bg-white border border-gray-300 rounded px-3 py-2 w-48 text-right"
                              placeholder="0"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-3xl font-bold text-blue-600">
                              ₱
                              {(
                                packageDetails.venue_fee_buffer || 0
                              ).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Client pays additional if venue costs exceed this
                              buffer
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit Margin Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-green-900 flex items-center gap-2">
                    <DollarSign className="h-6 w-6" />
                    Profit Margin Management
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Profit Margin Display */}
                  <div className="bg-white rounded-lg p-6 border border-green-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Admin Profit Margin
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Reserved profit buffer for the head organizer
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          This amount is allocated as profit margin and will be
                          included in the budget breakdown. Visible to admins
                          only.
                        </p>
                      </div>
                      <div className="text-right">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <Edit className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">₱</span>
                            <input
                              type="text"
                              value={editedPackage.profit_margin}
                              onChange={(e) => {
                                // Remove non-numeric characters except decimal point
                                let value = e.target.value.replace(
                                  /[^\d.]/g,
                                  ""
                                );

                                // Ensure only one decimal point
                                const parts = value.split(".");
                                if (parts.length > 2) {
                                  value =
                                    parts[0] + "." + parts.slice(1).join("");
                                }

                                // Format with commas automatically as user types
                                if (value && value !== ".") {
                                  const numericValue = parseFloat(value);
                                  if (!isNaN(numericValue)) {
                                    const formattedValue =
                                      numericValue.toLocaleString("en-US", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 2,
                                      });
                                    setEditedPackage((prev) => ({
                                      ...prev,
                                      profit_margin: formattedValue,
                                    }));
                                    markAsChanged();
                                    toast.info("Profit margin updated", {
                                      description: `New margin: ₱${formattedValue}`,
                                      duration: 2000,
                                    });
                                    return;
                                  }
                                }

                                setEditedPackage((prev) => ({
                                  ...prev,
                                  profit_margin: value,
                                }));
                                markAsChanged();
                              }}
                              onFocus={(e) => {
                                // Remove commas on focus for easier editing
                                const numericValue =
                                  parseFloat(
                                    e.target.value.replace(/,/g, "")
                                  ) || 0;
                                setEditedPackage((prev) => ({
                                  ...prev,
                                  profit_margin: numericValue.toString(),
                                }));
                              }}
                              className="text-3xl font-bold text-green-600 bg-white border border-gray-300 rounded px-3 py-2 w-48 text-right"
                              placeholder="0"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-3xl font-bold text-green-600">
                              ₱
                              {(
                                packageDetails.profit_margin || 0
                              ).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Reserved profit for head organizer
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* In-House Inclusions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  In-House Inclusions
                </h2>
                {isEditing && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm text-gray-500">
                      Edit mode - changes will be saved with the package
                    </span>
                    <Button
                      onClick={() => setShowAddInclusion(true)}
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add Inclusion
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {isEditing ? (
                  editedInHouseInclusions.map((inclusion, index) => (
                    <div
                      key={`inhouse-${index}`}
                      className={`border-l-4 border-[#028A75] pl-4 bg-gray-50 p-4 rounded-r-lg`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index, false)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                          <input
                            type="text"
                            value={inclusion.name}
                            onChange={(e) =>
                              handleInclusionNameChange(
                                index,
                                e.target.value,
                                false
                              )
                            }
                            className="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 flex-1"
                          />
                          {inclusion.supplier_id && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSupplierBadgeClick(inclusion);
                              }}
                              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 hover:text-blue-900 transition-colors cursor-pointer"
                              title="Click to view supplier details"
                            >
                              {inclusion.supplier_name} (Tier{" "}
                              {inclusion.tier_level})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">₱</span>
                            <input
                              type="text"
                              value={inclusion.price.toLocaleString()}
                              onChange={(e) => {
                                // Remove non-numeric characters except decimal point
                                let value = e.target.value.replace(
                                  /[^\d.]/g,
                                  ""
                                );

                                // Ensure only one decimal point
                                const parts = value.split(".");
                                if (parts.length > 2) {
                                  value =
                                    parts[0] + "." + parts.slice(1).join("");
                                }

                                // Convert to number and update
                                const numericValue = parseFloat(value) || 0;
                                handleInclusionPriceChange(
                                  index,
                                  numericValue,
                                  false
                                );
                              }}
                              onFocus={(e) => {
                                // Remove commas on focus for easier editing
                                const numericValue =
                                  parseFloat(
                                    e.target.value.replace(/,/g, "")
                                  ) || 0;
                                handleInclusionPriceChange(
                                  index,
                                  numericValue,
                                  false
                                );
                              }}
                              className="text-lg font-bold text-[#028A75] bg-white border border-gray-300 rounded px-2 py-1 w-24 text-right"
                            />
                            <button
                              onClick={() =>
                                handleRemoveInclusion(index, false)
                              }
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
                            <div
                              key={`inhouse-comp-${index}-${compIndex}`}
                              className="ml-4"
                            >
                              <div className="flex items-center justify-between">
                                <input
                                  type="text"
                                  value={component.name}
                                  onChange={(e) =>
                                    handleUpdateComponent(
                                      index,
                                      compIndex,
                                      e.target.value,
                                      component.price,
                                      false
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
                                    type="text"
                                    value={component.price.toLocaleString()}
                                    onChange={(e) => {
                                      // Remove non-numeric characters except decimal point
                                      let value = e.target.value.replace(
                                        /[^\d.]/g,
                                        ""
                                      );

                                      // Ensure only one decimal point
                                      const parts = value.split(".");
                                      if (parts.length > 2) {
                                        value =
                                          parts[0] +
                                          "." +
                                          parts.slice(1).join("");
                                      }

                                      // Convert to number and update
                                      const numericValue =
                                        parseFloat(value) || 0;
                                      handleUpdateComponent(
                                        index,
                                        compIndex,
                                        component.name,
                                        numericValue,
                                        false
                                      );
                                    }}
                                    onFocus={(e) => {
                                      // Remove commas on focus for easier editing
                                      const numericValue =
                                        parseFloat(
                                          e.target.value.replace(/,/g, "")
                                        ) || 0;
                                      handleUpdateComponent(
                                        index,
                                        compIndex,
                                        component.name,
                                        numericValue,
                                        false
                                      );
                                    }}
                                    className="text-sm bg-white border border-gray-300 rounded px-2 py-1 w-20 text-right"
                                    placeholder="0"
                                  />
                                  <button
                                    onClick={() =>
                                      handleRemoveComponent(
                                        index,
                                        compIndex,
                                        false
                                      )
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
                            onClick={() => handleAddComponent(index, false)}
                            className="ml-4 text-[#028A75] hover:text-[#027A6B] text-sm flex items-center gap-1"
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
                    {(packageDetails.inclusions || [])
                      .filter((inc) => !inc.supplier_id)
                      .map((inclusion, index) => (
                        <AccordionItem
                          key={`inhouse-view-${index}`}
                          value={`inc-${index}`}
                          className="border-l-4 border-[#028A75] pl-4"
                        >
                          <AccordionTrigger className="py-2">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-gray-900">
                                  {inclusion.name}
                                </span>
                                {inclusion.supplier_id && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSupplierBadgeClick(inclusion);
                                    }}
                                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 hover:text-blue-900 transition-colors cursor-pointer"
                                    title="Click to view supplier details"
                                  >
                                    {inclusion.supplier_name} (Tier{" "}
                                    {inclusion.tier_level})
                                  </span>
                                )}
                              </div>
                              <span className="text-lg font-bold text-[#028A75]">
                                {formatPrice(inclusion.price || 0)}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {inclusion.components.length > 0 ? (
                              <div className="space-y-2 ml-4">
                                {inclusion.components.map(
                                  (component, compIndex) => (
                                    <div
                                      key={`inhouse-view-comp-${index}-${compIndex}`}
                                    >
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
                                                key={`inhouse-view-subcomp-${index}-${compIndex}-${subIndex}`}
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
                  <Button
                    onClick={() => setShowAddInclusion(true)}
                    variant="outline"
                    className="w-full border-2 border-dashed border-gray-300 p-4 text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add New Inclusion
                  </Button>
                )}
              </div>
            </div>

            {/* Supplier Inclusions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Supplier Inclusions
                </h2>
                {isEditing && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm text-gray-500">
                      Supplier services with tier selection
                    </span>
                    <button
                      onClick={() => {
                        console.log("Add Supplier button clicked");
                        console.log(
                          "Available suppliers:",
                          availableSuppliers.length
                        );
                        handleAddSupplier();
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={availableSuppliers.length === 0}
                    >
                      <Plus className="h-4 w-4" />
                      Add Supplier ({availableSuppliers.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {isEditing ? (
                  editedSupplierInclusions.map((inclusion, index) => (
                    <div
                      key={`supplier-${index}`}
                      className={`border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r-lg`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index, true)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                          <input
                            type="text"
                            value={inclusion.name}
                            onChange={(e) =>
                              handleInclusionNameChange(
                                index,
                                e.target.value,
                                true
                              )
                            }
                            className="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 flex-1"
                          />
                          {inclusion.supplier_id && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSupplierBadgeClick(inclusion);
                              }}
                              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 hover:text-blue-900 transition-colors cursor-pointer"
                              title="Click to view supplier details"
                            >
                              {inclusion.supplier_name} (Tier{" "}
                              {inclusion.tier_level})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">₱</span>
                            <input
                              type="text"
                              value={inclusion.price.toLocaleString()}
                              onChange={(e) => {
                                // Remove non-numeric characters except decimal point
                                let value = e.target.value.replace(
                                  /[^\d.]/g,
                                  ""
                                );

                                // Ensure only one decimal point
                                const parts = value.split(".");
                                if (parts.length > 2) {
                                  value =
                                    parts[0] + "." + parts.slice(1).join("");
                                }

                                // Convert to number and update
                                const numericValue = parseFloat(value) || 0;
                                handleInclusionPriceChange(
                                  index,
                                  numericValue,
                                  true
                                );
                              }}
                              onFocus={(e) => {
                                // Remove commas on focus for easier editing
                                const numericValue =
                                  parseFloat(
                                    e.target.value.replace(/,/g, "")
                                  ) || 0;
                                handleInclusionPriceChange(
                                  index,
                                  numericValue,
                                  true
                                );
                              }}
                              className="text-lg font-bold text-[#028A75] bg-white border border-gray-300 rounded px-2 py-1 w-24 text-right"
                            />
                            <button
                              onClick={() => handleRemoveInclusion(index, true)}
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
                            <div
                              key={`supplier-comp-${index}-${compIndex}`}
                              className="ml-4"
                            >
                              <div className="flex items-center justify-between">
                                <input
                                  type="text"
                                  value={component.name}
                                  onChange={(e) =>
                                    handleUpdateComponent(
                                      index,
                                      compIndex,
                                      e.target.value,
                                      component.price,
                                      true
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
                                    type="text"
                                    value={component.price.toLocaleString()}
                                    onChange={(e) => {
                                      // Remove non-numeric characters except decimal point
                                      let value = e.target.value.replace(
                                        /[^\d.]/g,
                                        ""
                                      );

                                      // Ensure only one decimal point
                                      const parts = value.split(".");
                                      if (parts.length > 2) {
                                        value =
                                          parts[0] +
                                          "." +
                                          parts.slice(1).join("");
                                      }

                                      // Convert to number and update
                                      const numericValue =
                                        parseFloat(value) || 0;
                                      handleUpdateComponent(
                                        index,
                                        compIndex,
                                        component.name,
                                        numericValue,
                                        true
                                      );
                                    }}
                                    onFocus={(e) => {
                                      // Remove commas on focus for easier editing
                                      const numericValue =
                                        parseFloat(
                                          e.target.value.replace(/,/g, "")
                                        ) || 0;
                                      handleUpdateComponent(
                                        index,
                                        compIndex,
                                        component.name,
                                        numericValue,
                                        true
                                      );
                                    }}
                                    className="text-sm bg-white border border-gray-300 rounded px-2 py-1 w-20 text-right"
                                    placeholder="0"
                                  />
                                  <button
                                    onClick={() =>
                                      handleRemoveComponent(
                                        index,
                                        compIndex,
                                        true
                                      )
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
                            onClick={() => handleAddComponent(index, true)}
                            className="ml-4 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
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
                    {(packageDetails.inclusions || [])
                      .filter((inc) => inc.supplier_id)
                      .map((inclusion, index) => (
                        <AccordionItem
                          key={`supplier-view-${index}`}
                          value={`supplier-inc-${index}`}
                          className="border-l-4 border-blue-500 pl-4"
                        >
                          <AccordionTrigger className="py-2">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-gray-900">
                                  {inclusion.name}
                                </span>
                                {inclusion.supplier_id && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSupplierBadgeClick(inclusion);
                                    }}
                                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 hover:text-blue-900 transition-colors cursor-pointer"
                                    title="Click to view supplier details"
                                  >
                                    {inclusion.supplier_name} (Tier{" "}
                                    {inclusion.tier_level})
                                  </span>
                                )}
                              </div>
                              <span className="text-lg font-bold text-[#028A75]">
                                {formatPrice(inclusion.price || 0)}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {inclusion.components.length > 0 ? (
                              <div className="space-y-2 ml-4">
                                {inclusion.components.map(
                                  (component, compIndex) => (
                                    <div
                                      key={`supplier-view-comp-${index}-${compIndex}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-700">
                                          {component.name}
                                        </span>
                                      </div>
                                      {component.subComponents.length > 0 && (
                                        <div className="ml-4 mt-1 space-y-1">
                                          {component.subComponents.map(
                                            (subComp, subIndex) => (
                                              <div
                                                key={`supplier-view-subcomp-${index}-${compIndex}-${subIndex}`}
                                                className="flex items-center justify-between text-sm text-gray-600"
                                              >
                                                <span>• {subComp.name}</span>
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

                {isEditing && editedSupplierInclusions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No supplier inclusions added yet</p>
                    <p className="text-sm">
                      Click "Add Supplier" to add supplier services
                    </p>
                  </div>
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
                  ? availableVenues.map((venue) => {
                      const paxRate = Number(venue.extra_pax_rate) || 0;
                      const hasPaxRate = paxRate > 0;
                      return (
                        <div
                          key={venue.venue_id}
                          className="border rounded-lg p-4 flex flex-col h-full"
                        >
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedVenues.includes(
                                  venue.venue_id
                                )}
                                onChange={() =>
                                  handleVenueToggle(venue.venue_id)
                                }
                                className="h-4 w-4 text-[#028A75] focus:ring-[#028A75]"
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
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-gray-900">
                                  {venue.venue_title}
                                </h3>
                                <div
                                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    hasPaxRate
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {hasPaxRate
                                    ? `₱${paxRate.toLocaleString()}/pax`
                                    : "No pax rate"}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {venue.venue_location}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                  <Users className="inline h-4 w-4 mr-1" />
                                  {venue.venue_capacity} guests
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="mt-4 w-full"
                            onClick={() => setVenueDetailsModal(venue)}
                          >
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </Button>
                        </div>
                      );
                    })
                  : (packageDetails.venues || []).map((venue) => {
                      const paxRate = Number(venue.extra_pax_rate) || 0;
                      const hasPaxRate = paxRate > 0;
                      return (
                        <div
                          key={venue.venue_id}
                          className="border rounded-lg p-4 flex flex-col h-full"
                        >
                          <div className="flex items-start space-x-4 flex-1">
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
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-gray-900">
                                  {venue.venue_title}
                                </h3>
                                <div
                                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    hasPaxRate
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {hasPaxRate
                                    ? `₱${paxRate.toLocaleString()}/pax`
                                    : "No pax rate"}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {venue.venue_location}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                  <Users className="inline h-4 w-4 mr-1" />
                                  {venue.venue_capacity} guests
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
                                    getImageUrl(venue.venue_cover_photo || null)
                                  )
                                }
                              />
                            </div>
                          )}

                          <Button
                            variant="outline"
                            className="mt-4 w-full"
                            onClick={() => setVenueDetailsModal(venue)}
                          >
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </Button>
                        </div>
                      );
                    })}
              </div>
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
                    <div
                      key={`edited-freebie-${index}`}
                      className="flex items-center gap-2"
                    >
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
                      className="bg-[#028A75] text-white px-3 py-2 rounded hover:bg-[#027A6B]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {(packageDetails.freebies || []).length > 0 ? (
                    (packageDetails.freebies || []).map((freebie, index) => (
                      <div
                        key={`package-freebie-${index}`}
                        className="flex items-center gap-2"
                      >
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
                  ? parsePrice(editedPackage.package_price.replace(/,/g, ""))
                  : packageDetails?.package_price || 0
              }
              selectedVenue={packageDetails.venues[0] || null}
              components={allEditedInclusions
                .filter((inc) => inc?.name !== "Venue Fee") // Filter out Venue Fee inclusions
                .map((inc) => {
                  const component = {
                    name: inc?.supplier_id
                      ? `[Supplier] ${inc?.name || "Unknown"}`
                      : inc?.name || "Unknown",
                    price: inc?.price || 0,
                  };
                  // Debug logging for supplier inclusions
                  if (inc?.supplier_id) {
                    console.log(
                      `Budget breakdown - Supplier inclusion: ${component.name}, Price: ₱${component.price}`
                    );
                  }
                  return component;
                })}
              freebies={
                isEditing
                  ? editedFreebies || []
                  : packageDetails?.freebies || []
              }
              venueFeeBuffer={
                isEditing
                  ? parsePrice(
                      editedPackage.venue_fee_buffer.replace(/,/g, "")
                    ) || 0
                  : (packageDetails?.venue_fee_buffer ?? 0)
              }
              profitMargin={
                isEditing
                  ? parsePrice(editedPackage.profit_margin.replace(/,/g, "")) ||
                    0
                  : (packageDetails?.profit_margin ?? 0)
              }
            />
          </div>
        </div>
      </div>

      {/* Venue Details Modal */}
      <Dialog
        open={!!venueDetailsModal}
        onOpenChange={() => setVenueDetailsModal(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{venueDetailsModal?.venue_title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {venueDetailsModal?.venue_cover_photo && (
              <img
                src={
                  getImageUrl(venueDetailsModal.venue_cover_photo) ||
                  "/placeholder.jpg"
                }
                alt={`${venueDetailsModal.venue_title} cover`}
                className="w-full h-48 object-cover rounded"
              />
            )}
            <div>
              <div className="text-sm text-gray-600">
                {venueDetailsModal?.venue_location}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Capacity: {venueDetailsModal?.venue_capacity?.toLocaleString()}{" "}
                guests
              </div>
              <div className="mt-1 text-sm font-semibold text-[#028A75]">
                {venueDetailsModal?.extra_pax_rate &&
                venueDetailsModal.extra_pax_rate > 0
                  ? `₱${venueDetailsModal.extra_pax_rate.toLocaleString()}/pax`
                  : "No per-pax rate"}
              </div>
            </div>
            {venueDetailsModal?.inclusions?.length ? (
              <div>
                <div className="grid grid-cols-1 gap-2">
                  {venueDetailsModal.inclusions.map((inc, idx) => (
                    <div
                      key={`venue-detail-inc-${inc.inclusion_id ?? 0}-${idx}`}
                      className="flex items-center text-sm"
                    >
                      <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                      <span className="text-gray-700">
                        {inc.inclusion_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setVenueDetailsModal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Inclusion Modal */}
      <Dialog open={showAddInclusion} onOpenChange={setShowAddInclusion}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Add New Inclusion</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex gap-6 min-h-0 px-6 overflow-hidden">
            {/* Left Side - Form */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="space-y-4 overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="grid gap-2">
                  <Label htmlFor="inclusion-name">Inclusion Name</Label>
                  <Input
                    id="inclusion-name"
                    type="text"
                    value={newInclusion.name}
                    onChange={(e) =>
                      setNewInclusion((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g., Photography"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="inclusion-price">Price</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">₱</span>
                    <Input
                      id="inclusion-price"
                      type="text"
                      value={newInclusion.price.toLocaleString()}
                      onChange={(e) => {
                        // Remove non-numeric characters except decimal point
                        let value = e.target.value.replace(/[^\d.]/g, "");

                        // Ensure only one decimal point
                        const parts = value.split(".");
                        if (parts.length > 2) {
                          value = parts[0] + "." + parts.slice(1).join("");
                        }

                        // Convert to number and update state
                        const numericValue = parseFloat(value) || 0;
                        setNewInclusion((prev) => ({
                          ...prev,
                          price: numericValue,
                        }));
                      }}
                      onFocus={(e) => {
                        // Remove commas on focus for easier editing
                        const numericValue =
                          parseFloat(e.target.value.replace(/,/g, "")) || 0;
                        setNewInclusion((prev) => ({
                          ...prev,
                          price: numericValue,
                        }));
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Components</Label>
                  <div className="space-y-3">
                    {newInclusion.components.map((component, index) => (
                      <div
                        key={`new-inclusion-component-${index}`}
                        className="flex items-center gap-2"
                      >
                        <Input
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
                          placeholder="Component name"
                          className="flex-1"
                        />
                        <Input
                          type="text"
                          value={component.price.toLocaleString()}
                          onChange={(e) => {
                            // Remove non-numeric characters except decimal point
                            let value = e.target.value.replace(/[^\d.]/g, "");

                            // Ensure only one decimal point
                            const parts = value.split(".");
                            if (parts.length > 2) {
                              value = parts[0] + "." + parts.slice(1).join("");
                            }

                            // Convert to number and update state
                            const numericValue = parseFloat(value) || 0;
                            const updated = [...newInclusion.components];
                            updated[index] = {
                              ...component,
                              price: numericValue,
                            };
                            setNewInclusion((prev) => ({
                              ...prev,
                              components: updated,
                            }));
                          }}
                          onFocus={(e) => {
                            // Remove commas on focus for easier editing
                            const numericValue =
                              parseFloat(e.target.value.replace(/,/g, "")) || 0;
                            const updated = [...newInclusion.components];
                            updated[index] = {
                              ...component,
                              price: numericValue,
                            };
                            setNewInclusion((prev) => ({
                              ...prev,
                              components: updated,
                            }));
                          }}
                          placeholder="0"
                          className="w-24"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = newInclusion.components.filter(
                              (_, i) => i !== index
                            );
                            setNewInclusion((prev) => ({
                              ...prev,
                              components: updated,
                            }));
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNewInclusion((prev) => ({
                          ...prev,
                          components: [
                            ...prev.components,
                            { name: "", price: 0, subComponents: [] },
                          ],
                        }))
                      }
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Component
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Budget Breakdown */}
            <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col min-h-0 -mr-6">
              {/* Scrollable Budget Section */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <h4 className="text-base font-semibold text-gray-900 mb-3">
                    Budget Preview
                  </h4>
                  <BudgetBreakdown
                    packagePrice={
                      isEditing
                        ? parsePrice(
                            editedPackage.package_price.replace(/,/g, "")
                          )
                        : packageDetails?.package_price || 0
                    }
                    selectedVenue={packageDetails?.venues?.[0] || null}
                    components={[
                      // Current inclusions
                      ...allEditedInclusions
                        .filter((inc) => inc?.name !== "Venue Fee")
                        .map((inc) => ({
                          name: inc?.supplier_id
                            ? `[Supplier] ${inc?.name || "Unknown"}`
                            : inc?.name || "Unknown",
                          price: inc?.price || 0,
                        })),
                      // Preview new inclusion if it has a name and price
                      ...(newInclusion.name.trim() && newInclusion.price > 0
                        ? [
                            {
                              name: `[New] ${newInclusion.name}`,
                              price: newInclusion.price,
                            },
                          ]
                        : []),
                    ]}
                    freebies={
                      isEditing
                        ? editedFreebies || []
                        : packageDetails?.freebies || []
                    }
                    venueFeeBuffer={
                      isEditing
                        ? parsePrice(
                            editedPackage.venue_fee_buffer.replace(/,/g, "")
                          ) || 0
                        : (packageDetails?.venue_fee_buffer ?? 0)
                    }
                    profitMargin={
                      isEditing
                        ? parsePrice(
                            editedPackage.profit_margin.replace(/,/g, "")
                          ) || 0
                        : (packageDetails?.profit_margin ?? 0)
                    }
                  />
                </div>

                {/* Additional Info */}
                <div className="p-4 pb-6">
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <h5 className="font-medium text-blue-900 mb-2 text-xs">
                        Current Package
                      </h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Package Price:</span>
                          <span className="font-semibold text-blue-900">
                            ₱
                            {(isEditing
                              ? parsePrice(
                                  editedPackage.package_price.replace(/,/g, "")
                                )
                              : packageDetails?.package_price || 0
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Inclusions:</span>
                          <span className="font-semibold text-blue-900">
                            {allEditedInclusions.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Venue Buffer:</span>
                          <span className="font-semibold text-blue-900">
                            ₱
                            {(
                              packageDetails?.venue_fee_buffer || 0
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {newInclusion.name.trim() && newInclusion.price > 0 && (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <h5 className="font-medium text-green-900 mb-2 text-xs">
                          New Inclusion
                        </h5>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-green-700">Name:</span>
                            <span className="font-semibold text-green-900 truncate ml-2">
                              {newInclusion.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">Price:</span>
                            <span className="font-semibold text-green-900">
                              ₱{newInclusion.price.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">Components:</span>
                            <span className="font-semibold text-green-900">
                              {
                                newInclusion.components.filter((c) =>
                                  c.name.trim()
                                ).length
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowAddInclusion(false)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddInclusion}
              disabled={!newInclusion.name.trim() || newInclusion.price <= 0}
              className="bg-[#028A75] hover:bg-[#027A6B] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Inclusion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Overage Warning Modal */}
      {overageModal.isOpen && (
        <Dialog
          open={overageModal.isOpen}
          onOpenChange={() =>
            setOverageModal((prev) => ({ ...prev, isOpen: false }))
          }
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-50">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-red-800">
                    Budget Overage Warning
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 mt-1">
                    The total cost of inclusions exceeds the package price
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 mb-4">
                  The total cost of inclusions exceeds the package price by ₱
                  {overageModal.overageAmount.toLocaleString()}.
                </p>

                {/* Detailed Breakdown */}
                <div className="bg-white rounded-lg border border-red-200 p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">
                    Budget Breakdown
                  </h4>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Package Price:</span>
                      <span className="font-semibold text-gray-900">
                        ₱{overageModal.packagePrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        Total Inclusions Cost:
                      </span>
                      <span className="font-semibold text-red-600">
                        ₱{overageModal.totalInclusionsCost.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-gray-600 font-medium">
                        Overage Amount:
                      </span>
                      <span className="font-bold text-lg text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />₱
                        {overageModal.overageAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Inclusions Summary */}
                  <div className="mt-4 pt-3 border-t">
                    <h5 className="font-medium text-gray-900 mb-2">
                      Inclusions Summary:
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          In-House Inclusions:
                        </span>
                        <span className="font-medium">
                          {editedInHouseInclusions.length} items (₱
                          {editedInHouseInclusions
                            .reduce((sum, inc) => sum + (inc.price || 0), 0)
                            .toLocaleString()}
                          )
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Supplier Inclusions:
                        </span>
                        <span className="font-medium">
                          {editedSupplierInclusions.length} items (₱
                          {editedSupplierInclusions
                            .reduce((sum, inc) => sum + (inc.price || 0), 0)
                            .toLocaleString()}
                          )
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-gray-600 font-medium">
                          Total Inclusions:
                        </span>
                        <span className="font-semibold text-red-600">
                          {editedInHouseInclusions.length +
                            editedSupplierInclusions.length}{" "}
                          items
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Percentage Over */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-center">
                      <span className="text-sm text-gray-500">
                        {(
                          (overageModal.overageAmount /
                            overageModal.packagePrice) *
                          100
                        ).toFixed(1)}
                        % over budget
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Continuing will save the package with
                    the overage. You may want to consider reducing inclusion
                    costs or increasing the package price.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setOverageModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={overageModal.onConfirm}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Continue with Overage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Event Type Selector Modal */}
      <EventTypeSelector
        isOpen={eventTypeModal.isOpen}
        onClose={() =>
          setEventTypeModal((prev) => ({ ...prev, isOpen: false }))
        }
        onSave={handleEventTypeSave}
        currentTypes={eventTypeModal.currentTypes}
      />

      {/* Supplier Selection Modal */}
      {showSupplierModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              console.log("Modal backdrop clicked, closing modal");
              setShowSupplierModal(false);
              setSelectedSupplier(null);
              setSelectedTiers({});
            }
          }}
        >
          <div
            className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white rounded-t-lg">
              <h3 className="text-xl font-semibold">Add Supplier to Package</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshSuppliers}
                  className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-200 rounded hover:bg-blue-50"
                >
                  Refresh Suppliers
                </button>
                <button
                  onClick={() => {
                    setShowSupplierModal(false);
                    setSelectedSupplier(null);
                    setSelectedTiers({});
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex">
                {/* Main Content - Left Side */}
                <div
                  className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                  style={{ maxHeight: "calc(90vh - 140px)" }}
                >
                  {/* Selection Summary - Simplified */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      Instructions
                    </h4>
                    <p className="text-sm text-blue-800">
                      Click "Add to Package" on any service below to add it to
                      your package. Each service will be added as a separate
                      inclusion with its own pricing.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      💡 Scroll down to see all available suppliers and their
                      tiers
                    </p>
                  </div>

                  <div className="space-y-6 pb-6">
                    {availableSuppliers.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">
                          No suppliers available
                        </p>
                        <button
                          onClick={handleRefreshSuppliers}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          Refresh Suppliers
                        </button>
                      </div>
                    ) : (
                      availableSuppliers.map((supplier) => (
                        <div
                          key={supplier.supplier_id}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">
                                {supplier.supplier_name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {supplier.supplier_category}
                              </p>
                              <p className="text-xs text-gray-500">
                                {supplier.supplier_email}
                              </p>
                            </div>
                            <div className="text-right">
                              {supplier.is_verified && (
                                <div className="text-xs text-[#028A75] font-medium mb-1">
                                  ✓ Verified
                                </div>
                              )}
                              <span className="text-sm text-gray-600">
                                {supplier.offers.length} tiers available
                              </span>
                            </div>
                          </div>

                          {/* Tier Selection */}
                          {supplier.offers && supplier.offers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {supplier.offers.map((offer) => {
                                const isSelected =
                                  selectedTiers[supplier.supplier_id] ===
                                  offer.offer_id;
                                const isInPackage = isSupplierOfferInPackage(
                                  supplier.supplier_id,
                                  offer.offer_id
                                );
                                const supplierHasOtherTier =
                                  isSupplierInPackage(supplier.supplier_id) &&
                                  !isInPackage;

                                return (
                                  <div
                                    key={offer.offer_id}
                                    className={`border rounded-lg p-4 cursor-pointer transition-colors flex flex-col h-full min-h-[180px] ${
                                      isInPackage
                                        ? "border-green-500 bg-green-50"
                                        : isSelected
                                          ? "border-[#028A75] bg-[#028A75]/10"
                                          : supplierHasOtherTier
                                            ? "border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();

                                      // Don't allow selection if already in package
                                      if (isInPackage) {
                                        toast.info(
                                          "This supplier tier is already in the package"
                                        );
                                        return;
                                      }

                                      // Don't allow selection if supplier has another tier in package
                                      if (supplierHasOtherTier) {
                                        toast.info(
                                          "This supplier already has a different tier in the package"
                                        );
                                        return;
                                      }

                                      const key = `${supplier.supplier_id}-${offer.offer_id}`;
                                      const isSelected = selectedSuppliers[key];
                                      const hasOtherSelection = Object.keys(
                                        selectedSuppliers
                                      ).some(
                                        (existingKey) =>
                                          existingKey.startsWith(
                                            `${supplier.supplier_id}-`
                                          ) && existingKey !== key
                                      );

                                      if (isSelected) {
                                        // Remove from selection
                                        const newSelected = {
                                          ...selectedSuppliers,
                                        };
                                        delete newSelected[key];
                                        setSelectedSuppliers(newSelected);
                                      } else if (!hasOtherSelection) {
                                        // Remove any existing selection for this supplier first
                                        const newSelected = {
                                          ...selectedSuppliers,
                                        };
                                        Object.keys(newSelected).forEach(
                                          (existingKey) => {
                                            if (
                                              existingKey.startsWith(
                                                `${supplier.supplier_id}-`
                                              )
                                            ) {
                                              delete newSelected[existingKey];
                                            }
                                          }
                                        );

                                        // Add new selection
                                        setSelectedSuppliers({
                                          ...newSelected,
                                          [key]: {
                                            supplier,
                                            offer,
                                            type: "offer",
                                          },
                                        });
                                      }
                                    }}
                                  >
                                    <div className="flex-1 flex flex-col">
                                      <div className="flex items-start justify-between mb-3">
                                        <h5 className="font-medium text-gray-900 text-sm flex-1 pr-2">
                                          {offer.offer_title}
                                        </h5>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-center whitespace-nowrap">
                                            Tier {offer.tier_level}
                                          </span>
                                          {isInPackage && (
                                            <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full text-center whitespace-nowrap">
                                              ✓ In Package
                                            </span>
                                          )}
                                          {offer.is_customizable && (
                                            <span className="text-xs bg-[#028A75]/20 text-[#028A75] px-3 py-1 rounded-full text-center whitespace-nowrap">
                                              Custom
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-xs text-gray-600 mb-4 line-clamp-3 flex-1">
                                        {offer.offer_description}
                                      </p>
                                      <div className="mt-auto">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="text-sm font-bold text-[#028A75]">
                                            {formatPrice(
                                              parsePrice(offer.price_min)
                                            )}
                                          </div>
                                        </div>
                                        <div
                                          className={`w-full px-3 py-2 text-xs rounded text-center font-medium ${
                                            selectedSuppliers[
                                              `${supplier.supplier_id}-${offer.offer_id}`
                                            ]
                                              ? "bg-[#028A75] text-white"
                                              : "bg-blue-600 text-white"
                                          }`}
                                        >
                                          {selectedSuppliers[
                                            `${supplier.supplier_id}-${offer.offer_id}`
                                          ]
                                            ? "Selected"
                                            : "Select"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : supplier.services &&
                            supplier.services.length > 0 ? (
                            /* Fallback to service-based selection (like client booking) */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {supplier.services.map((service) => (
                                <div
                                  key={service.service_id}
                                  className={`border rounded-lg p-4 cursor-pointer transition-colors flex flex-col h-full min-h-[180px] ${
                                    selectedSuppliers[
                                      `${supplier.supplier_id}-service-${service.service_id}`
                                    ]
                                      ? "border-[#028A75] bg-[#028A75]/10"
                                      : Object.keys(selectedSuppliers).some(
                                            (key) =>
                                              key.startsWith(
                                                `${supplier.supplier_id}-`
                                              ) &&
                                              key !==
                                                `${supplier.supplier_id}-service-${service.service_id}`
                                          )
                                        ? "border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed"
                                        : "border-gray-200 hover:border-gray-300"
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const key = `${supplier.supplier_id}-service-${service.service_id}`;
                                    const isSelected = selectedSuppliers[key];
                                    const hasOtherSelection = Object.keys(
                                      selectedSuppliers
                                    ).some(
                                      (existingKey) =>
                                        existingKey.startsWith(
                                          `${supplier.supplier_id}-`
                                        ) && existingKey !== key
                                    );

                                    if (isSelected) {
                                      // Remove from selection
                                      const newSelected = {
                                        ...selectedSuppliers,
                                      };
                                      delete newSelected[key];
                                      setSelectedSuppliers(newSelected);
                                    } else if (!hasOtherSelection) {
                                      // Remove any existing selection for this supplier first
                                      const newSelected = {
                                        ...selectedSuppliers,
                                      };
                                      Object.keys(newSelected).forEach(
                                        (existingKey) => {
                                          if (
                                            existingKey.startsWith(
                                              `${supplier.supplier_id}-`
                                            )
                                          ) {
                                            delete newSelected[existingKey];
                                          }
                                        }
                                      );

                                      // Add new selection
                                      setSelectedSuppliers({
                                        ...newSelected,
                                        [key]: {
                                          supplier,
                                          offer: service,
                                          type: "service",
                                        },
                                      });
                                    }
                                  }}
                                >
                                  <div className="flex-1 flex flex-col">
                                    <div className="flex items-start justify-between mb-3">
                                      <h5 className="font-medium text-gray-900 text-sm flex-1 pr-2">
                                        {service.service_name}
                                      </h5>
                                      <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-center whitespace-nowrap">
                                        Service
                                      </span>
                                    </div>
                                    {service.service_description && (
                                      <p className="text-xs text-gray-600 mb-4 line-clamp-3 flex-1">
                                        {service.service_description}
                                      </p>
                                    )}
                                    <div className="mt-auto">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="text-sm font-bold text-[#028A75]">
                                          {formatPrice(
                                            parsePrice(service.service_price)
                                          )}
                                        </div>
                                      </div>
                                      <div
                                        className={`w-full px-3 py-2 text-xs rounded text-center font-medium ${
                                          selectedSuppliers[
                                            `${supplier.supplier_id}-service-${service.service_id}`
                                          ]
                                            ? "bg-[#028A75] text-white"
                                            : "bg-blue-600 text-white"
                                        }`}
                                      >
                                        {selectedSuppliers[
                                          `${supplier.supplier_id}-service-${service.service_id}`
                                        ]
                                          ? "Selected"
                                          : "Select"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              No services available from this supplier
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bento Sidebar - Right Side */}
                <div className="w-96 border-l border-gray-200 bg-gray-50 flex flex-col">
                  {/* Fixed Pie Chart Section */}
                  <div className="p-6 border-b border-gray-200 bg-white">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Current Package Budget
                    </h4>
                    <BudgetBreakdown
                      packagePrice={
                        isEditing
                          ? parsePrice(
                              editedPackage.package_price.replace(/,/g, "")
                            )
                          : packageDetails?.package_price || 0
                      }
                      selectedVenue={null}
                      components={[
                        // Current inclusions
                        ...allEditedInclusions
                          .filter((inc) => inc?.name !== "Venue Fee")
                          .map((inc) => ({
                            name: inc?.supplier_id
                              ? `[Supplier] ${inc?.name || "Unknown"}`
                              : inc?.name || "Unknown",
                            price: inc?.price || 0,
                          })),
                        // Preview selected suppliers
                        ...Object.values(selectedSuppliers).map(
                          ({ supplier, offer }) => ({
                            name: `[Preview] ${("offer_title" in offer ? offer.offer_title : offer.service_name) || "Supplier Service"}`,
                            price: parsePrice(
                              ("price_min" in offer
                                ? offer.price_min
                                : offer.service_price) || 0
                            ),
                          })
                        ),
                      ]}
                      freebies={
                        isEditing
                          ? editedFreebies || []
                          : packageDetails?.freebies || []
                      }
                      venueFeeBuffer={
                        isEditing
                          ? parsePrice(
                              editedPackage.venue_fee_buffer.replace(/,/g, "")
                            ) || 0
                          : (packageDetails?.venue_fee_buffer ?? 0)
                      }
                      profitMargin={
                        isEditing
                          ? parsePrice(
                              editedPackage.profit_margin.replace(/,/g, "")
                            ) || 0
                          : (packageDetails?.profit_margin ?? 0)
                      }
                    />
                  </div>

                  {/* Scrollable Content Below Pie Chart */}
                  <div
                    className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                    style={{ maxHeight: "calc(90vh - 300px)" }}
                  >
                    <div className="space-y-6">
                      {/* Package Stats Card */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Package Overview
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Total Price:
                            </span>
                            <span className="font-semibold text-[#028A75]">
                              {formatPrice(
                                isEditing
                                  ? parsePrice(
                                      editedPackage.package_price.replace(
                                        /,/g,
                                        ""
                                      )
                                    )
                                  : packageDetails?.package_price || 0
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Guest Capacity:
                            </span>
                            <span className="font-semibold text-[#028A75]">
                              {isEditing
                                ? editedPackage.guest_capacity
                                : packageDetails?.guest_capacity || 0}{" "}
                              guests
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Inclusions:
                            </span>
                            <span className="font-semibold text-[#028A75]">
                              {allEditedInclusions.length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Venues:
                            </span>
                            <span className="font-semibold text-[#028A75]">
                              {packageDetails?.venues?.length || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions Card */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Quick Actions
                        </h4>
                        <div className="space-y-2">
                          <button
                            onClick={() => setShowAddInclusion(true)}
                            className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                          >
                            <Plus className="h-4 w-4 inline mr-2" />
                            Add Custom Inclusion
                          </button>
                          <button
                            onClick={handleRefreshSuppliers}
                            className="w-full text-left px-3 py-2 text-sm text-[#028A75] hover:bg-[#028A75]/10 rounded border border-[#028A75]/20 hover:border-[#028A75]/30 transition-colors"
                          >
                            <Package className="h-4 w-4 inline mr-2" />
                            Refresh Suppliers
                          </button>
                          <button
                            onClick={() => {
                              setEditedInclusions([]);
                              setEditedFreebies([]);
                              setSelectedSuppliers({});
                              toast.success("Package cleared");
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200 hover:border-red-300 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 inline mr-2" />
                            Clear All Inclusions
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-white rounded-b-lg">
              <div className="text-sm text-gray-600">
                {Object.keys(selectedSuppliers).length > 0 && (
                  <span className="font-medium">
                    {Object.keys(selectedSuppliers).length} supplier
                    {Object.keys(selectedSuppliers).length !== 1
                      ? "s"
                      : ""}{" "}
                    selected
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {Object.keys(selectedSuppliers).length > 0 && (
                  <button
                    onClick={() => {
                      // Add all selected suppliers to package
                      Object.values(selectedSuppliers).forEach(
                        ({ supplier, offer }) => {
                          handleAddSupplierService(offer, supplier);
                        }
                      );
                      // Clear selections
                      setSelectedSuppliers({});
                      toast.success(
                        `${Object.keys(selectedSuppliers).length} supplier(s) added to package`
                      );
                    }}
                    className="px-4 py-2 bg-[#028A75] text-white rounded hover:bg-[#027A6B] transition-colors"
                  >
                    Add Selected to Package (
                    {Object.keys(selectedSuppliers).length})
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowSupplierModal(false);
                    setSelectedSupplier(null);
                    setSelectedTiers({});
                    setSelectedSuppliers({});
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Details Modal */}
      {showSupplierDetailsModal && selectedSupplierDetails && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSupplierDetailsModal(false);
              setSelectedSupplierDetails(null);
            }
          }}
        >
          <div
            className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white rounded-t-lg">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Supplier Service Details
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedSupplierDetails.supplier.supplier_name} -{" "}
                  {selectedSupplierDetails.inclusion.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSupplierDetailsModal(false);
                  setSelectedSupplierDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Supplier Information */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Supplier Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Name:
                        </span>
                        <p className="text-gray-900">
                          {selectedSupplierDetails.supplier.supplier_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Category:
                        </span>
                        <p className="text-gray-900">
                          {selectedSupplierDetails.supplier.supplier_category}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Email:
                        </span>
                        <p className="text-gray-900">
                          {selectedSupplierDetails.supplier.supplier_email}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Phone:
                        </span>
                        <p className="text-gray-900">
                          {selectedSupplierDetails.supplier.supplier_phone}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Status:
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedSupplierDetails.supplier.supplier_status ===
                            "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedSupplierDetails.supplier.supplier_status}
                        </span>
                      </div>
                      {selectedSupplierDetails.supplier.is_verified && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">
                            Verification:
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#028A75]/20 text-[#028A75] ml-2">
                            ✓ Verified
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Service Details
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Service Name:
                        </span>
                        <p className="text-gray-900">
                          {selectedSupplierDetails.inclusion.name}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">
                          Price:
                        </span>
                        <p className="text-lg font-bold text-[#028A75]">
                          {formatPrice(
                            selectedSupplierDetails.inclusion.price || 0
                          )}
                        </p>
                      </div>
                      {selectedSupplierDetails.inclusion.tier_level && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">
                            Tier Level:
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                            Tier {selectedSupplierDetails.inclusion.tier_level}
                          </span>
                        </div>
                      )}
                      {selectedSupplierDetails.inclusion.is_customizable && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">
                            Customizable:
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#028A75]/20 text-[#028A75] ml-2">
                            ✓ Yes
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service Components */}
                  {selectedSupplierDetails.inclusion.components &&
                    selectedSupplierDetails.inclusion.components.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Service Components
                        </h4>
                        <div className="space-y-3">
                          {selectedSupplierDetails.inclusion.components.map(
                            (component, index) => (
                              <div
                                key={`supplier-component-${index}`}
                                className="border rounded-lg p-3"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-gray-900">
                                    {component.name}
                                  </h5>
                                  <span className="text-sm font-bold text-[#028A75]">
                                    {formatPrice(component.price || 0)}
                                  </span>
                                </div>
                                {component.subComponents &&
                                  component.subComponents.length > 0 && (
                                    <div className="ml-4 mt-2 space-y-1">
                                      {component.subComponents.map(
                                        (subComp, subIndex) => (
                                          <div
                                            key={subIndex}
                                            className="flex items-center justify-between text-sm text-gray-600"
                                          >
                                            <span>• {subComp.name}</span>
                                            <span className="text-[#028A75]">
                                              {formatPrice(subComp.price || 0)}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>

                {/* Available Offers/Services */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Available Offers
                    </h4>
                    {selectedSupplierDetails.supplier.offers &&
                    selectedSupplierDetails.supplier.offers.length > 0 ? (
                      <div className="space-y-3">
                        {selectedSupplierDetails.supplier.offers.map(
                          (offer) => (
                            <div
                              key={offer.offer_id}
                              className="border rounded-lg p-3"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="font-medium text-gray-900">
                                  {offer.offer_title}
                                </h5>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  Tier {offer.tier_level}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {offer.offer_description}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[#028A75]">
                                  {formatPrice(parsePrice(offer.price_min))}
                                  {offer.price_max &&
                                    offer.price_max !== offer.price_min &&
                                    ` - ${formatPrice(parsePrice(offer.price_max))}`}
                                </span>
                                {offer.is_customizable && (
                                  <span className="text-xs bg-[#028A75]/20 text-[#028A75] px-2 py-1 rounded-full">
                                    Customizable
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : selectedSupplierDetails.supplier.services &&
                      selectedSupplierDetails.supplier.services.length > 0 ? (
                      <div className="space-y-3">
                        {selectedSupplierDetails.supplier.services.map(
                          (service) => (
                            <div
                              key={service.service_id}
                              className="border rounded-lg p-3"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="font-medium text-gray-900">
                                  {service.service_name}
                                </h5>
                                <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                  Service
                                </span>
                              </div>
                              {service.service_description && (
                                <p className="text-sm text-gray-600 mb-2">
                                  {service.service_description}
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[#028A75]">
                                  {formatPrice(
                                    parsePrice(service.service_price)
                                  )}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No offers or services available
                      </p>
                    )}
                  </div>

                  {/* Service Components */}
                  {selectedSupplierDetails.inclusion.components &&
                    selectedSupplierDetails.inclusion.components.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Service Components
                        </h4>
                        <div className="space-y-2">
                          {selectedSupplierDetails.inclusion.components.map(
                            (component, index) => (
                              <div
                                key={`supplier-component-list-${index}`}
                                className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0"
                              >
                                <span className="text-gray-900">
                                  {component.name}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {formatPrice(component.price)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200 bg-white rounded-b-lg">
              <button
                onClick={() => {
                  setShowSupplierDetailsModal(false);
                  setSelectedSupplierDetails(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Guard Modal */}
      <Dialog open={showNavigationModal} onOpenChange={setShowNavigationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              You have unsaved changes to this package. What would you like to
              do?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> If you leave now, all your unsaved
                changes will be lost.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-6">
            <Button
              variant="outline"
              onClick={handleCancelNavigation}
              className="border-gray-300 hover:bg-gray-50"
            >
              Stay and Continue Editing
            </Button>
            <Button
              onClick={handleConfirmNavigation}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Leave Without Saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
