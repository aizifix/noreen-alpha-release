"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { secureStorage } from "@/app/utils/encryption";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiStepWizard } from "@/app/components/admin/event-builder/multi-step-wizard";
import { ClientDetailsStep } from "@/app/components/admin/event-builder/client-details-step";
import { EventDetailsStep } from "@/app/components/admin/event-builder/event-details-step";
import { PackageSelection } from "@/app/components/admin/event-builder/package-selection";

import { PackageDetails } from "@/app/components/admin/event-builder/package-details";
import { VenueSelection } from "@/app/components/admin/event-builder/venue-selection";
import { ComponentCustomization } from "@/app/components/admin/event-builder/components-customization";
import { BudgetTracking } from "@/app/components/admin/event-builder/budget-tracking";
import PaymentStep from "@/app/components/admin/event-builder/payment-step";
import { OrganizerSelection } from "@/app/components/admin/event-builder/organizer-selection";
import { toast } from "@/hooks/use-toast";
import {
  eventPackages,
  ComponentCategory,
  type PackageComponent as DataPackageComponent,
} from "@/data/packages";
import { showConfetti } from "@/lib/confetti";
import { SuccessModal } from "@/app/components/admin/event-builder/success-modal";
import { TimelineStep } from "@/app/components/admin/event-builder/timeline-selection";
import { organizers } from "@/data/organizers";
import {
  convertPackageToComponents,
  weddingPackages,
} from "@/data/wedding-packages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  Step,
  ClientData,
  EventDetails,
  PaymentData,
  TimelineItem,
} from "@/app/types/event-builder";
import WeddingFormStep from "@/app/components/admin/event-builder/wedding-form-step";
import AttachmentsStep from "@/app/components/admin/event-builder/attachments-step";
import { DraftHandler } from "@/app/components/admin/event-builder/draft-handler";
import { ClearFormModal } from "@/app/components/admin/event-builder/clear-form-modal";
import { LocalStorageRecoveryModal } from "@/app/components/admin/event-builder/localstorage-recovery-modal";

// Function to format currency
const formatCurrency = (amount: number) => {
  // Ensure amount is a valid number and handle edge cases
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₱0.00";
  }

  // Convert to number and round to 2 decimal places to avoid floating point issues
  const cleanAmount = Math.round(parseFloat(amount.toString()) * 100) / 100;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cleanAmount);
};

// Define types for our data structures
interface EventData {
  eventTitle: string;
  eventDate: string;
  eventId: string;
}

// File attachment interface
interface FileAttachment {
  file: File;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedPath?: string;
  uploadedAt?: string;
}

// Enhanced event details interface
interface EnhancedEventDetails extends EventDetails {
  theme?: string;
  description?: string;
  bookingReference?: string;
  isRecurring?: boolean;
  recurrenceRule?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    endDate?: string;
    endAfter?: number;
  };
  churchLocation?: string;
  churchStartTime?: string;
}

interface WeddingFormData {
  // Basic Information
  nuptial: string;
  motif: string;

  // Bride & Groom
  bride_name: string;
  bride_size: string;
  groom_name: string;
  groom_size: string;

  // Parents
  mother_bride_name: string;
  mother_bride_size: string;
  father_bride_name: string;
  father_bride_size: string;
  mother_groom_name: string;
  mother_groom_size: string;
  father_groom_name: string;
  father_groom_size: string;

  // Principal Sponsors
  maid_of_honor_name: string;
  maid_of_honor_size: string;
  best_man_name: string;
  best_man_size: string;

  // Little Bride & Groom
  little_bride_name: string;
  little_bride_size: string;
  little_groom_name: string;
  little_groom_size: string;

  // Wedding Party Quantities and Names
  bridesmaids_qty: number;
  bridesmaids_names: string[];
  groomsmen_qty: number;
  groomsmen_names: string[];
  junior_groomsmen_qty: number;
  junior_groomsmen_names: string[];
  flower_girls_qty: number;
  flower_girls_names: string[];
  ring_bearer_qty: number;
  ring_bearer_names: string[];
  bible_bearer_qty: number;
  bible_bearer_names: string[];
  coin_bearer_qty: number;
  coin_bearer_names: string[];

  // Wedding Items Quantities
  cushions_qty: number;
  headdress_qty: number;
  shawls_qty: number;
  veil_cord_qty: number;
  basket_qty: number;
  petticoat_qty: number;
  neck_bowtie_qty: number;
  garter_leg_qty: number;
  fitting_form_qty: number;
  robe_qty: number;

  // Processing Information
  prepared_by: string;
  received_by: string;
  pickup_date: string;
  return_date: string;
  customer_signature: string;
}

export default function EventBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking");
  const bookingRefFromUrl = searchParams.get("booking_ref");

  // Local storage key for event builder data
  const STORAGE_KEY = "event_builder_data";

  // Function to save data to local storage
  const saveToLocalStorage = (data: any) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Error saving to local storage:", error);
    }
  };

  // Function to load data from local storage
  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error("Error loading from local storage:", error);
      return null;
    }
  };

  // Function to clear local storage
  const clearLocalStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing local storage:", error);
    }
  };

  // Draft handling functions
  const handleLoadDraft = (draft: any) => {
    console.log("📂 Loading draft data:", draft);

    if (draft.currentStep) setCurrentStep(draft.currentStep);
    if (draft.clientData) setClientData(draft.clientData);
    if (draft.eventDetails) setEventDetails(draft.eventDetails);
    if (draft.selectedPackageId) setSelectedPackageId(draft.selectedPackageId);
    if (draft.selectedVenueId) setSelectedVenueId(draft.selectedVenueId);
    if (draft.selectedVenue) setSelectedVenue(draft.selectedVenue);
    if (draft.components) setComponents(draft.components);
    if (draft.originalPackagePrice)
      setOriginalPackagePrice(draft.originalPackagePrice);
    if (draft.selectedOrganizers)
      setSelectedOrganizers(draft.selectedOrganizers);
    if (draft.paymentData) setPaymentData(draft.paymentData);
    if (draft.timelineData) setTimelineData(draft.timelineData);
    if (draft.weddingFormData) setWeddingFormData(draft.weddingFormData);

    setIsFormDirty(false);
  };

  const handleClearDraft = () => {
    console.log("🗑️ Clearing draft data");
    clearLocalStorage();
    clearForm();
    setIsFormDirty(false);
  };

  const handleClearForm = () => {
    setShowClearFormModal(true);
  };

  // LocalStorage recovery handlers
  const handleLocalStorageSave = () => {
    const savedData = loadFromLocalStorage();
    if (savedData) {
      handleLoadDraft(savedData);
    }
    setShowLocalStorageRecoveryModal(false);
    setHasUnsavedData(false);
  };

  const handleLocalStorageDiscard = () => {
    clearLocalStorage();
    clearForm();
    setShowLocalStorageRecoveryModal(false);
    setHasUnsavedData(false);
    // Reset to step 1 after discarding
    setCurrentStep(1);
  };

  const handleLocalStorageCancel = () => {
    setShowLocalStorageRecoveryModal(false);
  };

  // Add current step state
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = loadFromLocalStorage();
    return Math.max(1, saved?.currentStep || 1);
  });

  // Use refs to track initialization state
  const initializedRef = useRef(false);
  const packageVenuesInitializedRef = useRef<string | null>(null);

  // Check for localStorage recovery on mount
  useEffect(() => {
    const savedData = loadFromLocalStorage();
    if (savedData && Object.keys(savedData).length > 0) {
      setHasUnsavedData(true);
      setShowLocalStorageRecoveryModal(true);
    }
  }, []);

  // State for booking reference lookup
  const [bookingReference, setBookingReference] = useState<string>(
    bookingRefFromUrl || ""
  );
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);

  // State to track if wedding packages are available

  const [clientData, setClientData] = useState<ClientData>(() => {
    const saved = loadFromLocalStorage();
    return (
      saved?.clientData || {
        id: "",
        name: "",
        email: "",
        phone: "",
        address: "",
      }
    );
  });

  // Enhanced event details with new fields
  const [eventDetails, setEventDetails] = useState<EnhancedEventDetails>(() => {
    const saved = loadFromLocalStorage();
    if (saved?.eventDetails) {
      return saved.eventDetails;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD format

    return {
      title: "",
      type: "wedding",
      date: defaultDate,
      startTime: "10:00",
      endTime: "18:00",
      capacity: 100,
      notes: "",
      venue: "",
      package: "",
      theme: "",
      description: "",
      bookingReference: "",
      isRecurring: false,
      recurrenceRule: {
        frequency: "monthly",
        interval: 1,
      },
    };
  });

  // File attachments state
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);

  // Event creation loading state
  const [loading, setLoading] = useState<boolean>(false);

  // Client signature state
  const [clientSignature, setClientSignature] = useState<string>("");

  // External organizer state
  const [externalOrganizer, setExternalOrganizer] = useState<string>("");

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    () => {
      const saved = loadFromLocalStorage();
      return saved?.selectedPackageId || null;
    }
  );
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(() => {
    const saved = loadFromLocalStorage();
    return saved?.selectedVenueId || null;
  });
  const [selectedVenue, setSelectedVenue] = useState<any | null>(() => {
    const saved = loadFromLocalStorage();
    return saved?.selectedVenue || null;
  });
  const [components, setComponents] = useState<DataPackageComponent[]>(() => {
    const saved = loadFromLocalStorage();
    return saved?.components || [];
  });
  const [originalPackagePrice, setOriginalPackagePrice] = useState<
    number | null
  >(() => {
    const saved = loadFromLocalStorage();
    return saved?.originalPackagePrice || null;
  });
  const [selectedOrganizers, setSelectedOrganizers] = useState<string[]>(() => {
    const saved = loadFromLocalStorage();
    return saved?.selectedOrganizers || [];
  });
  const [organizerData, setOrganizerData] = useState<
    Array<{
      organizer_id: string;
      organizer_name: string;
      organizer_role: string;
      organizer_email: string;
      organizer_phone: string;
      organizer_specialties: string;
      organizer_status: string;
      organizer_profile_picture?: string;
    }>
  >(() => {
    const saved = loadFromLocalStorage();
    return saved?.organizerData || [];
  });
  const [paymentData, setPaymentData] = useState<PaymentData>(() => {
    const saved = loadFromLocalStorage();
    return (
      saved?.paymentData || {
        total: 0,
        paymentType: "half",
        downPayment: 0,
        balance: 0,
        customPercentage: 50,
        downPaymentMethod: "gcash",
        referenceNumber: "",
        notes: "",
        cashBondRequired: false,
        cashBondStatus: "pending",
        scheduleTypeId: 2,
      }
    );
  });
  const [timelineData, setTimelineData] = useState<TimelineItem[]>(() => {
    const saved = loadFromLocalStorage();
    return saved?.timelineData || [];
  });
  const [showMissingRefDialog, setShowMissingRefDialog] = useState(false);
  const [showBookingLookupModal, setShowBookingLookupModal] = useState(false);
  const [bookingSearchResults, setBookingSearchResults] = useState<any[]>([]);
  const [bookingSearchLoading, setBookingSearchLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showClearFormModal, setShowClearFormModal] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showLocalStorageRecoveryModal, setShowLocalStorageRecoveryModal] =
    useState(false);
  const [hasUnsavedData, setHasUnsavedData] = useState(false);
  const [weddingFormData, setWeddingFormData] = useState<WeddingFormData>(
    () => {
      const saved = loadFromLocalStorage();
      return (
        saved?.weddingFormData || {
          // Basic Information
          nuptial: "",
          motif: "",

          // Bride & Groom
          bride_name: "",
          bride_size: "",
          groom_name: "",
          groom_size: "",

          // Parents
          mother_bride_name: "",
          mother_bride_size: "",
          father_bride_name: "",
          father_bride_size: "",
          mother_groom_name: "",
          mother_groom_size: "",
          father_groom_name: "",
          father_groom_size: "",

          // Principal Sponsors
          maid_of_honor_name: "",
          maid_of_honor_size: "",
          best_man_name: "",
          best_man_size: "",

          // Little Bride & Groom
          little_bride_name: "",
          little_bride_size: "",
          little_groom_name: "",
          little_groom_size: "",

          // Wedding Party Quantities and Names
          bridesmaids_qty: 0,
          bridesmaids_names: [],
          groomsmen_qty: 0,
          groomsmen_names: [],
          junior_groomsmen_qty: 0,
          junior_groomsmen_names: [],
          flower_girls_qty: 0,
          flower_girls_names: [],
          ring_bearer_qty: 0,
          ring_bearer_names: [],
          bible_bearer_qty: 0,
          bible_bearer_names: [],
          coin_bearer_qty: 0,
          coin_bearer_names: [],

          // Wedding Items Quantities
          cushions_qty: 0,
          headdress_qty: 0,
          shawls_qty: 0,
          veil_cord_qty: 0,
          basket_qty: 0,
          petticoat_qty: 0,
          neck_bowtie_qty: 0,
          garter_leg_qty: 0,
          fitting_form_qty: 0,
          robe_qty: 0,

          // Processing Information
          prepared_by: "",
          received_by: "",
          pickup_date: "",
          return_date: "",
          customer_signature: "",
        }
      );
    }
  );
  const [currentEventId, setCurrentEventId] = useState<number | null>(null);
  const [eventTypes, setEventTypes] = useState<
    Array<{ event_type_id: number; event_name: string }>
  >([]);
  const [selectedEventType, setSelectedEventType] = useState<string>("");
  const [eventData, setEventData] = useState<EventData>({
    eventTitle: "",
    eventDate: "",
    eventId: `EV-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`,
  });

  // Add packageVenues state
  const [packageVenues, setPackageVenues] = useState<any[]>([]);
  const [allVenues, setAllVenues] = useState<any[]>([]);

  // File upload handling functions
  const handleFileUpload = async (files: File[]) => {
    if (!files.length) return;

    setUploadingFiles(true);
    const uploadedAttachments: FileAttachment[] = [];

    try {
      for (const file of files) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than 10MB. Please choose a smaller file.`,
            variant: "destructive",
          });
          continue;
        }

        // Create FormData for file upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("operation", "uploadFile");
        formData.append("fileType", "event_attachment");

        try {
          const response = await axios.post(
            "http://localhost/events-api/admin.php",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          if (response.data.status === "success") {
            uploadedAttachments.push({
              file,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadedPath: response.data.filePath,
              uploadedAt: new Date().toISOString(),
            });
          } else {
            toast({
              title: "Upload Failed",
              description: `Failed to upload ${file.name}: ${response.data.message}`,
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("File upload error:", error);
          toast({
            title: "Upload Error",
            description: `Error uploading ${file.name}`,
            variant: "destructive",
          });
        }
      }

      // Add uploaded files to attachments state
      setAttachments((prev) => [...prev, ...uploadedAttachments]);

      if (uploadedAttachments.length > 0) {
        toast({
          title: "Files Uploaded",
          description: `Successfully uploaded ${uploadedAttachments.length} file(s)`,
        });
      }
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Load all venues as fallback
  const loadAllVenues = async () => {
    try {
      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "getAllAvailableVenues",
        }
      );
      if (response.data.status === "success") {
        const venues = response.data.venues || [];
        console.log(`Loaded ${venues.length} venues from API`);

        // Debug: Check each venue's pax rate
        venues.forEach((venue: any) => {
          console.log(
            `Venue: ${venue.venue_title} - ID: ${venue.venue_id} - Price: ${venue.venue_price} - Pax Rate: ${venue.extra_pax_rate}`
          );
        });

        setAllVenues(venues);
      }
    } catch (error) {
      console.error("Error loading all venues:", error);
      setAllVenues([]);
    }
  };

  // Load all venues on component mount
  useEffect(() => {
    loadAllVenues();
  }, []);

  // Packages are now fetched dynamically from API, so we don't need to check static data
  // The PackageSelection component will handle its own loading and error states

  // Fetch s
  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        const response = await axios.get(
          "http://localhost/events-api/admin.php?operation=getEventTypes"
        );
        if (response.data.status === "success") {
          setEventTypes(response.data.event_types || []);
        }
      } catch (error) {
        console.error("Error fetching event types:", error);
      }
    };
    fetchEventTypes();
  }, []);

  // Auto-load booking data if booking_ref is provided in URL
  useEffect(() => {
    if (bookingRefFromUrl && !initializedRef.current) {
      initializedRef.current = true;
      setBookingReference(bookingRefFromUrl);
      lookupBookingByReference();
    }
  }, [bookingRefFromUrl]);

  // Load all confirmed bookings when modal opens
  useEffect(() => {
    if (showBookingLookupModal) {
      console.log("🚀 Modal opened, loading all confirmed bookings...");
      searchBookings("");
    }
  }, [showBookingLookupModal]);

  // Save data to local storage whenever important state changes
  useEffect(() => {
    const dataToSave = {
      currentStep,
      clientData,
      eventDetails,
      selectedPackageId,
      selectedVenueId,
      selectedVenue,
      components,
      originalPackagePrice,
      selectedOrganizers,
      organizerData,
      paymentData,
      timelineData,
      weddingFormData,
    };
    saveToLocalStorage(dataToSave);
  }, [
    currentStep,
    clientData,
    eventDetails,
    selectedPackageId,
    selectedVenueId,
    selectedVenue,
    components,
    originalPackagePrice,
    selectedOrganizers,
    organizerData,
    paymentData,
    timelineData,
    weddingFormData,
  ]);

  // Track form dirty state separately - simplified to avoid infinite loops
  useEffect(() => {
    // Check if any form data has meaningful values - simplified check
    const hasData = Boolean(
      clientData.name ||
        clientData.email ||
        eventDetails.title ||
        eventDetails.theme ||
        selectedPackageId ||
        selectedVenueId ||
        components.length > 0 ||
        paymentData.downPayment > 0 ||
        timelineData.length > 0 ||
        weddingFormData.nuptial ||
        weddingFormData.motif ||
        weddingFormData.bride_name ||
        weddingFormData.groom_name
    );

    setIsFormDirty(hasData);
  }, [
    clientData.name,
    clientData.email,
    eventDetails.title,
    eventDetails.theme,
    selectedPackageId,
    selectedVenueId,
    components.length,
    paymentData.downPayment,
    timelineData.length,
    weddingFormData.nuptial,
    weddingFormData.motif,
    weddingFormData.bride_name,
    weddingFormData.groom_name,
  ]);

  // Note: Draft restoration notifications are now handled by DraftHandler component

  // Calculate total budget based on actual components and their prices
  const getTotalBudget = () => {
    let total = 0;

    console.log("Calculating total budget...");
    console.log("Components:", components);
    console.log("Selected venue:", selectedVenue);

    // Calculate from all components (package components, venue inclusions, custom components)
    components.forEach((component: any) => {
      if (component.included !== false) {
        // Use supplier price if assigned, otherwise use component price
        const componentPrice = component.supplierPrice || component.price || 0;
        total += componentPrice;
        console.log(
          `Component ${component.name}: ${componentPrice} (total: ${total})`
        );
      }
    });

    // Add venue price if selected (including overflow charges)
    if (selectedVenue && selectedVenue.venue_price) {
      const baseVenuePrice = parseFloat(selectedVenue.venue_price) || 0;
      const extraPaxRate = parseFloat(selectedVenue.extra_pax_rate || 0) || 0;
      const guestCount = eventDetails.capacity || 100;
      const overflowCharge =
        guestCount > 100 ? Math.max(0, guestCount - 100) * extraPaxRate : 0;
      const totalVenuePrice = baseVenuePrice + overflowCharge;

      console.log("Venue pricing:", {
        basePrice: baseVenuePrice,
        extraPaxRate: extraPaxRate,
        guestCount: guestCount,
        overflowCharge: overflowCharge,
        totalVenuePrice: totalVenuePrice,
      });

      // Only add venue price if it's not already included in components
      const venueComponent = components.find(
        (comp) => comp.category === "venue" && comp.isVenueInclusion
      );

      if (!venueComponent) {
        total += totalVenuePrice;
        console.log(
          `Adding venue price directly: ${totalVenuePrice} (total: ${total})`
        );
      } else {
        // Update the venue component price to include overflow charges
        venueComponent.price = totalVenuePrice;
        console.log(`Updated venue component price: ${totalVenuePrice}`);
      }
    }

    console.log("Final total budget:", total);
    return total;
  };

  const totalBudget = getTotalBudget();

  // Watch for changes in the components to update budgets when they change after initialization
  useEffect(() => {
    if (selectedPackageId && !originalPackagePrice) {
      // Get the original price from the selected package
      const weddingPkg = weddingPackages?.find(
        (pkg) => pkg.id === selectedPackageId
      );
      const eventPkg = eventPackages?.find(
        (pkg) => pkg.id === selectedPackageId
      );

      if (weddingPkg) {
        // Use basePrice instead of price for wedding packages
        setOriginalPackagePrice(weddingPkg.basePrice || weddingPkg.price);
      } else if (eventPkg) {
        // Use basePrice for event packages
        setOriginalPackagePrice(eventPkg.basePrice);
      }
    }
  }, [selectedPackageId]);

  // Handle client data update
  const handleClientDataUpdate = useCallback((data: ClientData) => {
    setClientData(data);
  }, []);

  // Handle event details update
  const handleEventDetailsUpdate = useCallback(
    (details: Partial<EnhancedEventDetails>) => {
      console.log("Updating event details:", details);
      setEventDetails((prev: EnhancedEventDetails) => ({
        ...prev,
        ...details,
      }));

      // If a package is specified in the details (from booking selection), auto-select it
      if (details.package && details.package !== selectedPackageId) {
        console.log(
          "Auto-selecting package from booking:",
          details.package,
          "current:",
          selectedPackageId
        );
        setTimeout(() => {
          handlePackageSelect(details.package!); // Non-null assertion since we checked above
        }, 100); // Small delay to ensure state is updated
      }

      // If venue ID is specified from booking, store it for later selection
      if (details.venueId) {
        console.log("Venue ID from booking:", details.venueId);
        // Store the venue ID to be used when package venues are loaded
        setSelectedVenueId(details.venueId);
      }

      // Store booking reference for event creation
      if (details.bookingReference) {
        console.log("Booking reference:", details.bookingReference);
        setBookingReference(details.bookingReference);
      }
    },
    [selectedPackageId]
  );

  // Handle package selection
  const handlePackageSelect = useCallback(
    async (packageId: string) => {
      setSelectedPackageId(packageId);

      try {
        // Fetch package details
        const response = await axios.get(
          `http://localhost/events-api/admin.php?operation=getPackageById&package_id=${packageId}`
        );

        if (response.data.status === "success") {
          const packageData = response.data.package;

          // Set venues from package
          if (
            packageData.venues &&
            packageVenuesInitializedRef.current !== packageId
          ) {
            console.log("Loading venues from package:", packageData.venues);

            // Debug: Check if package venues have pax rates
            packageData.venues.forEach((venue: any) => {
              console.log(
                `Package Venue: ${venue.venue_title} - ID: ${venue.venue_id} - Price: ${venue.venue_price} - Pax Rate: ${venue.extra_pax_rate || "MISSING"}`
              );
            });

            setPackageVenues(packageData.venues);
            packageVenuesInitializedRef.current = packageId;
          }

          // If we have a venue ID from booking, try to auto-select it
          if (selectedVenueId) {
            console.log(
              "Looking for venue with ID:",
              selectedVenueId,
              "in venues:",
              packageData.venues
            );
            const matchingVenue = packageData.venues.find(
              (venue: any) => String(venue.venue_id) === String(selectedVenueId)
            );

            console.log("Matching venue found:", matchingVenue);

            if (matchingVenue) {
              console.log(
                "Auto-selecting venue from booking:",
                matchingVenue.venue_title
              );
              setSelectedVenue(matchingVenue);

              // Add venue as a single component (not broken down into inclusions)
              const venueComponent: DataPackageComponent = {
                id: `venue-${matchingVenue.venue_id}`,
                name: matchingVenue.venue_title || matchingVenue.venue_name,
                description: `Venue: ${matchingVenue.venue_title || matchingVenue.venue_name}`,
                price: parseFloat(matchingVenue.venue_price) || 0,
                category: "venue",
                included: true,
                isVenueInclusion: true,
                isRemovable: false,
                isExpanded: false,
              };

              console.log(
                "Adding venue component:",
                venueComponent.name,
                "with ID:",
                venueComponent.id
              );

              // Replace all previous venue components with the new one
              setComponents((prev) => {
                // Check if this venue is already in the components array
                const existingVenue = prev.find(
                  (comp) =>
                    comp.category === "venue" &&
                    comp.isVenueInclusion &&
                    comp.id === venueComponent.id
                );

                if (existingVenue) {
                  console.log(
                    "Venue already exists in components, skipping duplicate"
                  );
                  return prev; // Don't add duplicate
                }

                // Remove all existing venue components and add the new one
                const nonVenue = prev.filter(
                  (comp) =>
                    !(comp.category === "venue" && comp.isVenueInclusion)
                );

                console.log(
                  "Adding venue component:",
                  venueComponent.name,
                  "with ID:",
                  venueComponent.id
                );
                console.log("Previous components count:", prev.length);
                console.log("Non-venue components count:", nonVenue.length);
                console.log("Final components count:", nonVenue.length + 1);

                return [...nonVenue, venueComponent];
              });

              // Update event details with venue name
              setEventDetails((prev: EventDetails) => ({
                ...prev,
                venue: matchingVenue.venue_title || "",
              }));

              // Don't auto-skip - let user manually proceed
              console.log("Auto-selected venue, ready for manual progression");
              return;
            } else {
              console.log("No matching venue found in package venues");
            }
          }

          // Merge all inclusions (package and venue) as generic components
          // Add deduplication logic to handle duplicate components from database
          const rawComponents = packageData.components || [];
          const uniqueComponentsMap = new Map();

          rawComponents.forEach((comp: any) => {
            const key = `${comp.component_name.toLowerCase().trim()}_${parseFloat(comp.component_price)}`;

            // Only keep the first occurrence of each unique component
            if (!uniqueComponentsMap.has(key)) {
              uniqueComponentsMap.set(key, {
                id: comp.component_id,
                name: comp.component_name,
                price: parseFloat(comp.component_price),
                description: comp.component_description,
                category: "package",
                included: true,
                isCustom: false,
                originalId: comp.component_id,
                subComponents:
                  comp.subcomponents?.map((sub: any) => ({
                    id: sub.subcomponent_id,
                    name: sub.subcomponent_name,
                    price: parseFloat(sub.subcomponent_price),
                    description: sub.subcomponent_description,
                  })) || [],
              });
            }
          });

          const packageComponents = Array.from(uniqueComponentsMap.values());

          // Don't add venue inclusions yet - wait for venue selection
          // Only set package components initially
          setComponents(packageComponents);

          // Set original package price
          setOriginalPackagePrice(parseFloat(packageData.package_price));

          // Update event details with package capacity
          setEventDetails((prev: EventDetails) => ({
            ...prev,
            capacity: packageData.guest_capacity,
          }));

          // Don't automatically move to next step - user must click Next button
          console.log("Package selected, ready to proceed to next step");
        } else {
          console.log("No venues in package or already initialized");
        }
      } catch (error) {
        console.error("Error fetching package details:", error);
        toast({
          title: "Error",
          description: "Failed to load package details. Please try again.",
          variant: "destructive",
        });
      }
    },
    [selectedVenueId]
  );

  // Helper function to load static package data
  const loadStaticPackageData = (packageId: string) => {
    // Get the original price from the selected package
    const weddingPkg = weddingPackages?.find((pkg) => pkg.id === packageId);
    const eventPkg = eventPackages?.find((pkg) => pkg.id === packageId);

    if (weddingPkg) {
      // Use basePrice or price for wedding packages
      setOriginalPackagePrice(weddingPkg.basePrice || weddingPkg.price);
    } else if (eventPkg) {
      // Use basePrice for event packages
      setOriginalPackagePrice(eventPkg.basePrice);
    }

    // Try to load from wedding packages first
    const weddingComponents = convertPackageToComponents(packageId).map(
      (comp) => ({
        ...comp,
        isRemovable: true,
      })
    );

    if (weddingComponents && weddingComponents.length > 0) {
      console.log("Loaded wedding components:", weddingComponents.length);
      setComponents(weddingComponents);

      // Update guest capacity based on package
      const selectedPackage = weddingPackages?.find(
        (pkg) => pkg.id === packageId
      );
      if (selectedPackage) {
        setEventDetails((prev: EventDetails) => ({
          ...prev,
          capacity: selectedPackage.maxGuests,
        }));
      }
    } else {
      // Fallback to event packages
      const selectedPackage = eventPackages?.find(
        (pkg) => pkg.id === packageId
      );
      if (selectedPackage) {
        console.log(
          "Loaded event package components:",
          selectedPackage.components.length
        );
        // Add empty subComponents array to each component if not present
        const componentsWithSubComponents = selectedPackage.components.map(
          (component) => ({
            ...component,
            isExpanded: false,
          })
        );
        setComponents(componentsWithSubComponents);

        // Update guest capacity based on package
        setEventDetails((prev: EventDetails) => ({
          ...prev,
          capacity: selectedPackage.maxGuests,
        }));
      } else {
        console.log("No package found with ID:", packageId);
      }
    }
  };

  // Handle venue selection with stable reference
  const handleVenueSelection = useCallback(
    async (venueId: string, packageId: string, guestCount: number) => {
      // Add a small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSelectedVenueId(venueId);

      // Determine which venue list to use based on whether we have a package selected
      const isStartFromScratch = !selectedPackageId;
      const venueList = isStartFromScratch
        ? allVenues
        : packageVenues.length > 0
          ? packageVenues
          : allVenues;

      console.log("🔍 Venue Selection Debug - Start from Scratch Mode:");
      console.log("Is start from scratch:", isStartFromScratch);
      console.log("Selected package ID:", selectedPackageId);
      console.log("All venues count:", allVenues.length);
      console.log("Package venues count:", packageVenues.length);
      console.log(
        "Venue list being used:",
        isStartFromScratch ? "allVenues" : "packageVenues"
      );
      console.log("Venue list length:", venueList.length);

      console.log("🔍 Venue Selection Debug:");
      console.log("Selected venue ID:", venueId);
      console.log("Is start from scratch:", isStartFromScratch);
      console.log("Selected package ID:", selectedPackageId);
      console.log(
        "Using venue list:",
        isStartFromScratch
          ? "allVenues (start from scratch)"
          : packageVenues.length > 0
            ? "packageVenues"
            : "allVenues"
      );
      console.log("Package venues count:", packageVenues.length);
      console.log("All venues count:", allVenues.length);

      const venue = venueList.find(
        (v) => String(v.venue_id) === String(venueId)
      );

      console.log("Found venue:", venue);
      setSelectedVenue(venue || null);

      // Update event details with venue name and guest count
      setEventDetails((prev: EventDetails) => ({
        ...prev,
        venue: venue?.venue_title || "",
        capacity: guestCount,
      }));

      // Add venue as a component to ensure it's included in the budget
      if (venue) {
        console.log("Adding venue to components:", {
          venue_id: venue.venue_id,
          venue_title: venue.venue_title,
          venue_price: venue.venue_price,
          extra_pax_rate: venue.extra_pax_rate,
          guest_count: guestCount,
          is_start_from_scratch: isStartFromScratch,
        });

        // Debug: Check if this is the Demiren Hotel
        if (venue.venue_title && venue.venue_title.includes("Demiren")) {
          console.log(
            "🚨 DEMIREN HOTEL DETECTED - Current pax rate:",
            venue.extra_pax_rate
          );
          console.log("Expected pax rate should be 200.00");
        }

        // Calculate venue price including overflow charges
        let venuePrice = parseFloat(venue.venue_price) || 0;
        const extraPaxRate = parseFloat(venue.extra_pax_rate || 0);

        if (extraPaxRate > 0 && guestCount > 100) {
          const extraGuests = guestCount - 100;
          const overflowCharge = extraGuests * extraPaxRate;
          venuePrice += overflowCharge;
          console.log(
            `Venue overflow calculation: ${extraGuests} extra guests × ${extraPaxRate} = ${overflowCharge}`
          );
        }

        const venueComponent: DataPackageComponent = {
          id: `venue-${venue.venue_id}`,
          name: venue.venue_title || venue.venue_name,
          description: `Venue: ${venue.venue_title || venue.venue_name}${extraPaxRate > 0 && guestCount > 100 ? ` (includes overflow for ${guestCount} guests)` : ""}`,
          price: venuePrice,
          category: "venue",
          included: true,
          isVenueInclusion: true,
          isRemovable: false,
          isExpanded: false,
          isCustom: isStartFromScratch, // Mark as custom if it's from start from scratch
        };

        console.log("Created venue component:", venueComponent);

        // Replace all previous venue components with the new one
        setComponents((prev) => {
          // Check if this venue is already in the components array
          const existingVenue = prev.find(
            (comp) =>
              comp.category === "venue" &&
              comp.isVenueInclusion &&
              comp.id === venueComponent.id
          );

          if (existingVenue) {
            console.log(
              "Venue already exists in components, skipping duplicate"
            );
            return prev; // Don't add duplicate
          }

          // Remove all existing venue components and add the new one
          const nonVenue = prev.filter(
            (comp) => !(comp.category === "venue" && comp.isVenueInclusion)
          );

          console.log("Adding venue component to budget calculation");
          return [...nonVenue, venueComponent];
        });

        // If this is a start from scratch event, clear the original package price
        // since we're now building the event piece by piece
        if (isStartFromScratch && originalPackagePrice) {
          console.log(
            "Clearing original package price for start from scratch event"
          );
          setOriginalPackagePrice(null);
        }
      } else {
        console.log("No venue found for ID:", venueId);
      }

      console.log(
        "Venue selected:",
        venue?.venue_title,
        "Guest count:",
        guestCount,
        "Start from scratch:",
        isStartFromScratch
      );

      // Don't auto-skip - let user manually proceed
      console.log("Venue selected, ready for manual progression");
    },
    [packageVenues, allVenues, selectedPackageId, originalPackagePrice]
  );

  // Handle component updates
  const handleComponentsUpdate = useCallback(
    (updatedComponents: DataPackageComponent[]) => {
      // Only update if the components have actually changed
      if (JSON.stringify(updatedComponents) !== JSON.stringify(components)) {
        setComponents(updatedComponents);

        // If we're making manual changes to components, we'll recalculate the price
        // based on the components rather than using the original package price
        if (originalPackagePrice) {
          // Check if any components have been modified
          const hasModifiedComponents = updatedComponents.some(
            (comp) =>
              comp.isCustom ||
              comp.included === false ||
              (comp.subComponents && comp.subComponents.length > 0)
          );

          if (hasModifiedComponents) {
            setOriginalPackagePrice(null);
          }
        }
      }
    },
    [components, originalPackagePrice]
  );

  // Handle payment data update
  const handlePaymentDataUpdate = useCallback((data: Partial<PaymentData>) => {
    console.log("Updating payment data:", data);
    setPaymentData((prev) => {
      const updated = { ...prev, ...data };
      console.log("Updated payment data:", updated);
      return updated;
    });
  }, []);

  // Handle timeline updates
  const handleTimelineUpdate = useCallback((timeline: TimelineItem[]) => {
    setTimelineData(timeline);
  }, []);

  const handleWeddingFormUpdate = useCallback((data: any) => {
    setWeddingFormData(data);
  }, []);

  // Get organizer names from IDs
  const getOrganizerNames = () => {
    if (!selectedOrganizers || selectedOrganizers.length === 0) {
      return [];
    }

    // Map organizer IDs to names using the organizer data or static organizers
    return selectedOrganizers.map((organizerId) => {
      // First try to find in the fetched organizer data
      const apiOrganizer = organizerData.find(
        (org) => org.organizer_id === organizerId
      );
      if (apiOrganizer) {
        return apiOrganizer.organizer_name;
      }

      // Then try to find in static organizers
      const staticOrganizer = organizers.find((org) => org.id === organizerId);
      if (staticOrganizer) {
        return staticOrganizer.name;
      }

      // If not found in either, return a fallback
      return `Organizer ${organizerId}`;
    });
  };

  // Get selected package name
  const getSelectedPackageName = () => {
    if (!selectedPackageId) return "";

    // Check wedding packages first
    const weddingPkg = weddingPackages?.find((p) => p.id === selectedPackageId);
    if (weddingPkg) return weddingPkg.name;

    // Then check event packages
    const eventPkg = eventPackages?.find((p) => p.id === selectedPackageId);
    if (eventPkg) return eventPkg.name;

    // If not found in static packages, it might be an API package
    // We'll return a generic name since we don't have access to the API packages here
    return "Selected Package";
  };

  const getSelectedVenueName = () => {
    if (!selectedVenueId) return "";

    // Check package venues first (if a package is selected)
    if (packageVenues && packageVenues.length > 0) {
      const packageVenue = packageVenues.find(
        (v: any) => String(v.venue_id) === String(selectedVenueId)
      );
      if (packageVenue)
        return packageVenue.venue_title || packageVenue.venue_name;
    }

    // Then check all venues (with safety check)
    if (allVenues && Array.isArray(allVenues)) {
      const venue = allVenues.find(
        (v: any) => String(v.venue_id) === String(selectedVenueId)
      );
      return venue ? venue.venue_title || venue.venue_name : "Selected Venue";
    }

    return "Selected Venue";
  };

  const handleComplete = async () => {
    // Add loading state
    setLoading(true);

    // Get admin user data from secure storage first
    const userData = secureStorage.getItem("user");
    console.log("Admin user data:", userData);
    if (!userData || !userData.user_id) {
      console.log("❌ Admin user validation failed");
      toast({
        title: "Error",
        description: "Admin user information not found. Please log in again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    console.log("✅ Admin user validation passed");

    // Debug: Log payment data
    console.log("Payment data before validation:", paymentData);
    console.log("Down payment method:", paymentData.downPaymentMethod);
    console.log("Reference number:", paymentData.referenceNumber);
    console.log("Down payment amount:", paymentData.downPayment);

    // Check if reference number is required but missing
    if (
      (paymentData.downPaymentMethod === "gcash" ||
        paymentData.downPaymentMethod === "bank-transfer") &&
      (!paymentData.referenceNumber ||
        paymentData.referenceNumber.trim() === "")
    ) {
      console.log(
        "Reference number required but missing for method:",
        paymentData.downPaymentMethod
      );
      setShowMissingRefDialog(true);
      setLoading(false);
      return;
    }

    console.log("🔍 Starting additional validations...");

    // Validate client data
    console.log("Client data:", clientData);
    if (!clientData.id) {
      console.log("❌ Client validation failed - no client ID");
      toast({
        title: "Error",
        description: "Please select a client before creating an event.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    console.log("✅ Client validation passed");

    // Validate event details
    console.log("Event details:", eventDetails);

    // Set default title if empty
    if (!eventDetails.title || eventDetails.title.trim() === "") {
      const eventTypeName = eventDetails.type || "Event";
      const defaultTitle = `${eventTypeName.charAt(0).toUpperCase() + eventTypeName.slice(1)} Event`;
      eventDetails.title = defaultTitle;
      console.log("✅ Set default event title:", defaultTitle);
    }

    if (!eventDetails.date) {
      console.log("❌ Event date validation failed");
      toast({
        title: "Validation Error",
        description: "Event date is required",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!eventDetails.startTime) {
      console.log("❌ Event time validation failed");
      console.log("Start time:", `"${eventDetails.startTime}"`);
      toast({
        title: "Validation Error",
        description: "Start time is required",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Validate church start time for wedding events
    if (eventDetails.type === "wedding" && !eventDetails.churchStartTime) {
      console.log("❌ Church start time validation failed for wedding");
      toast({
        title: "Validation Error",
        description: "Church start time is required for wedding events",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!eventDetails.capacity || eventDetails.capacity <= 0) {
      console.log("❌ Event capacity validation failed");
      toast({
        title: "Validation Error",
        description: "Guest count must be greater than 0",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Set default theme if empty
    if (!eventDetails.theme || eventDetails.theme.trim() === "") {
      const eventTypeName = eventDetails.type || "Event";
      const defaultTheme = `${eventTypeName.charAt(0).toUpperCase() + eventTypeName.slice(1)} Celebration`;
      eventDetails.theme = defaultTheme;
      console.log("✅ Set default event theme:", defaultTheme);
    }

    // Check for scheduling conflicts (only start time matters since events are whole day)
    if (eventDetails.hasConflicts) {
      console.log("Scheduling conflicts detected");

      // Enhanced conflict messaging based on business rules
      if (eventDetails.type === "wedding") {
        toast({
          title: "Wedding Scheduling Conflict",
          description:
            "Weddings have special scheduling rules. Only one wedding is allowed per day, and weddings cannot be scheduled alongside other events.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Scheduling Conflict",
          description:
            "There are scheduling conflicts with your selected date and time. Please resolve them before proceeding.",
          variant: "destructive",
        });
      }
      setLoading(false);
      return;
    }

    // For start from scratch events, NO package is created
    // All components are stored directly in tbl_event_components
    console.log("Start from scratch event - no package will be created");

    console.log("✅ Event details validation passed");

    // Validate package selection (only required for package-based events)
    console.log("Selected package ID:", selectedPackageId);
    const isStartFromScratch = !selectedPackageId;

    if (!isStartFromScratch) {
      // Only validate package if we're not in start from scratch mode
      console.log("✅ Package-based event - package validation passed");
    } else {
      console.log("✅ Start from scratch event - no package required");
    }

    console.log("🚀 All validations passed! Starting event creation...");

    try {
      console.log("📝 Preparing event data for API...");
      // Prepare event data for API with proper field mapping to match backend expectations
      const eventData = {
        operation: "createEvent",
        original_booking_reference: bookingReference || null,
        user_id: parseInt(clientData.id),
        admin_id: parseInt(userData.user_id),
        organizer_id:
          selectedOrganizers?.length > 0 && selectedOrganizers[0]
            ? !isNaN(parseInt(selectedOrganizers[0]))
              ? parseInt(selectedOrganizers[0])
              : null
            : null,
        external_organizer: externalOrganizer || null,
        event_title: eventDetails.title || "New Event",
        event_theme: eventDetails.theme || null,
        event_description: eventDetails.description || null,
        church_location: eventDetails.churchLocation || null,
        church_start_time: eventDetails.churchStartTime || null,
        event_type_id: getEventTypeIdFromName(eventDetails.type),
        guest_count: parseInt(eventDetails.capacity.toString()) || 100,
        event_date: eventDetails.date,
        start_time: eventDetails.startTime
          ? eventDetails.startTime + ":00"
          : "10:00:00", // Ensure proper time format
        end_time: "23:59:00", // All events are whole day events
        package_id: selectedPackageId ? parseInt(selectedPackageId) : null, // No package for start from scratch events
        venue_id: selectedVenueId ? parseInt(selectedVenueId) : null,
        total_budget: parseFloat(getTotalBudget().toString()) || 0,
        down_payment: parseFloat(paymentData.downPayment.toString()) || 0,
        payment_method: paymentData.downPaymentMethod || "cash",
        payment_schedule_type_id: paymentData.scheduleTypeId || 2,
        reference_number: paymentData.referenceNumber || null,
        additional_notes: eventDetails.notes || null,
        event_status: "draft",
        // Enhanced fields
        is_recurring: eventDetails.isRecurring || false,
        recurrence_rule:
          eventDetails.isRecurring && eventDetails.recurrenceRule
            ? JSON.stringify(eventDetails.recurrenceRule)
            : null,
        client_signature: clientSignature || null,
        finalized_at: new Date().toISOString(),
        // Event attachments - simplified structure
        event_attachments:
          attachments?.length > 0
            ? (() => {
                const eventAttachments = attachments.map((attachment) => ({
                  original_name: attachment.fileName,
                  file_name:
                    attachment.uploadedPath?.split("/").pop() ||
                    attachment.fileName,
                  file_path: attachment.uploadedPath || "",
                  file_size: attachment.fileSize,
                  file_type: attachment.fileType,
                  description: "",
                  attachment_type: "event_attachment",
                  uploaded_at:
                    attachment.uploadedAt || new Date().toISOString(),
                }));
                return JSON.stringify(eventAttachments);
              })()
            : null,
        // Payment attachments - simplified structure
        payment_attachments:
          paymentData?.paymentAttachments?.length &&
          paymentData.paymentAttachments.length > 0
            ? paymentData.paymentAttachments
            : null,
        // Components data
        components:
          components?.map((comp, index) => ({
            component_name: comp.name || "",
            component_price: parseFloat(comp.price?.toString() || "0") || 0,
            component_description: (comp as any).description || "",
            is_custom: comp.isCustom || false,
            is_included: comp.included !== false,
            original_package_component_id: (comp as any).originalId || null,
            supplier_id: (comp as any).supplier_id || null,
            offer_id: (comp as any).offer_id || null,
            display_order: index,
          })) || [],
        // Timeline data
        timeline:
          timelineData?.map((item, index) => ({
            activity_title: item.componentName || "",
            activity_date:
              item.date instanceof Date
                ? item.date.toISOString().split("T")[0]
                : item.date,
            start_time: item.startTime || "10:00",
            end_time: item.endTime || "18:00",
            location: item.location || "",
            notes: item.notes || "",
            assigned_to: item.assignedTo || null,
            status: item.status || "pending",
            display_order: index,
          })) || [],
      };

      console.log("Creating event with data:", eventData);
      console.log(
        "Event creation mode:",
        isStartFromScratch ? "Start from Scratch" : "Package-based"
      );
      console.log("Payment data being sent:", {
        total_budget: eventData.total_budget,
        down_payment: eventData.down_payment,
        payment_method: eventData.payment_method,
        reference_number: eventData.reference_number,
        payment_attachments: eventData.payment_attachments,
      });
      console.log("Components being sent:", eventData.components);
      console.log("Venue ID being sent:", eventData.venue_id);
      console.log("Package ID being sent:", eventData.package_id);
      console.log("Event type ID being sent:", eventData.event_type_id);
      console.log("Client ID being sent:", eventData.user_id);
      console.log("Admin ID being sent:", eventData.admin_id);

      // Call API to create event - using the same approach as package-builder
      console.log("🚀 Making API call to create event...");
      console.log("API URL:", "http://localhost/events-api/admin.php");
      console.log("Request method: POST");
      console.log("Request headers:", { "Content-Type": "application/json" });
      console.log("📤 Sending event data to API...");

      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        eventData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("📡 API response received:", response);
      console.log("Response status:", response.status);
      console.log("Response status text:", response.statusText);
      console.log("✅ API call completed successfully");

      console.log("API Response:", response.data);
      console.log("API Response type:", typeof response.data);
      console.log("API Response keys:", Object.keys(response.data || {}));
      console.log("Response data status:", response.data?.status);
      console.log("Response data message:", response.data?.message);
      console.log("Response data event_id:", response.data?.event_id);

      // Enhanced response validation
      if (!response.data) {
        console.error("API returned no response");
        throw new Error("No response from server");
      }

      if (
        typeof response.data === "object" &&
        Object.keys(response.data).length === 0
      ) {
        console.error("API returned empty response object");
        throw new Error("Server returned empty response");
      }

      if (response.data.status === "success") {
        console.log("✅ Event created successfully!");
        console.log("Response data:", response.data);
        console.log("Response status check passed");

        // Show success UI and confetti
        try {
          showConfetti();
        } catch (confettiError) {
          console.warn("Confetti failed to show:", confettiError);
        }

        // Show appropriate success message
        const isStartFromScratch = !selectedPackageId;
        if (bookingReference) {
          toast({
            title: "Event Created & Booking Confirmed",
            description: `Event created successfully from booking ${bookingReference}. The booking status has been updated to converted.`,
          });
        } else {
          toast({
            title: "Event Created",
            description: isStartFromScratch
              ? `Custom event "${eventDetails.title}" has been created with ${components.length} components.`
              : "Event created successfully!",
          });
        }

        // Update event data with returned event ID
        const newEventId = response.data.event_id;
        setCurrentEventId(newEventId);

        setEventData({
          eventTitle: eventDetails?.title || "New Event",
          eventDate: eventDetails?.date || new Date().toLocaleDateString(),
          eventId:
            newEventId ||
            `EV-${Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, "0")}`,
        });

        // Save wedding details if this is a wedding event and we have wedding form data
        if (eventDetails.type === "wedding" && weddingFormData && newEventId) {
          try {
            const weddingResponse = await axios.post(
              "http://localhost/events-api/admin.php",
              {
                operation: "saveWeddingDetails",
                event_id: newEventId,
                ...weddingFormData,
              }
            );

            if (weddingResponse.data.status === "success") {
              console.log("Wedding details saved successfully");
            } else {
              console.warn(
                "Failed to save wedding details:",
                weddingResponse.data.message
              );
            }
          } catch (weddingError) {
            console.error("Error saving wedding details:", weddingError);
          }
        }

        // Show completion confirmation modal instead of success modal
        console.log("✅ Event created successfully, showing completion modal");
        console.log("Current showCompletionModal state:", showCompletionModal);
        setShowCompletionModal(true);
        console.log("Set showCompletionModal to true");
        console.log("Modal should now be visible");

        // Show success modal
        setShowSuccessModal(true);

        // Clear local storage and draft after successful event creation
        clearLocalStorage();
        handleClearDraft();

        // Log successful transaction
        console.log("Event created successfully:", {
          eventId: response.data.event_id,
          clientName: clientData.name,
          paymentMethod: paymentData.downPaymentMethod,
          amount: paymentData.downPayment,
          referenceNumber: paymentData.referenceNumber,
          status: "created",
          timestamp: new Date().toISOString(),
          organizers: getOrganizerNames(),
        });
      } else {
        // Handle API error response
        console.error("API Error Response:", response.data);
        const errorMessage =
          response.data.message || "Failed to create event. Please try again.";

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("❌ Event creation error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      // Enhanced error handling similar to package-builder
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });

        if (error.response?.data) {
          // Server responded with error
          const errorMessage =
            error.response.data.message || "Server error occurred";
          toast({
            title: "Server Error",
            description: errorMessage,
            variant: "destructive",
          });
        } else if (error.request) {
          // Request was made but no response received
          toast({
            title: "Connection Error",
            description:
              "No response from server. Please check your connection and ensure the backend server is running.",
            variant: "destructive",
          });
        } else {
          // Something else happened
          toast({
            title: "Request Error",
            description: "Failed to send request to server. Please try again.",
            variant: "destructive",
          });
        }
      } else if (
        error.code === "ECONNREFUSED" ||
        error.message?.includes("Network Error")
      ) {
        toast({
          title: "Connection Error",
          description:
            "Cannot connect to the backend server. Please ensure the PHP server is running on localhost.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Unexpected Error",
          description: `An unexpected error occurred: ${error.message || error}`,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert event type name to ID
  const getEventTypeIdFromName = (typeName: string): number => {
    const eventTypeMap: Record<string, number> = {
      wedding: 1,
      anniversary: 2,
      birthday: 3,
      corporate: 4,
      other: 5,
      others: 5,
      baptism: 10,
      "baby-shower": 11,
      reunion: 12,
      festival: 13,
      engagement: 14,
      christmas: 15,
      "new-year": 16,
    };

    const eventTypeId = eventTypeMap[typeName.toLowerCase()] || 5; // Default to "Others" (5) if not found
    console.log(`Event type "${typeName}" mapped to ID: ${eventTypeId}`);
    return eventTypeId;
  };

  // Function to look up a booking by reference
  const lookupBookingByReference = async () => {
    if (!bookingReference) {
      toast({
        title: "Error",
        description: "Please enter a booking reference.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLookupLoading(true);
      const response = await axios.get(
        "http://localhost/events-api/admin.php",
        {
          params: {
            operation: "getBookingByReference",
            reference: bookingReference,
          },
        }
      );

      if (response.data.status === "success" && response.data.booking) {
        const booking = response.data.booking;

        // Check if booking is confirmed
        if (booking.booking_status !== "confirmed") {
          toast({
            title: "Booking Not Available",
            description: `This booking is ${booking.booking_status}. Only confirmed bookings can be converted to events.`,
            variant: "destructive",
          });
          return;
        }

        // Check if booking has already been converted
        if (booking.is_converted && booking.converted_event_id) {
          toast({
            title: "Booking Already Converted",
            description: `This booking has already been converted to an event (ID: ${booking.converted_event_id}). A booking can only be converted once.`,
            variant: "destructive",
          });
          return;
        }

        // Set client data
        setClientData({
          id: String(booking.user_id),
          name: `${booking.user_firstName} ${booking.user_lastName}`,
          email: booking.user_email,
          phone: booking.user_contact,
          address: booking.user_address || "",
        });

        // Set event details with proper time parsing and event type mapping
        const parseTime = (timeStr: string) => {
          if (!timeStr) return "";
          // Handle both "HH:mm:ss" and "HH:mm" formats
          const parts = timeStr.split(":");
          return `${parts[0]}:${parts[1]}`;
        };

        // Map event type name to expected values
        const mapEventType = (eventTypeName: string): string => {
          if (!eventTypeName) return "other";

          const typeMap: Record<string, string> = {
            wedding: "wedding",
            anniversary: "anniversary",
            birthday: "birthday",
            "corporate event": "corporate",
            others: "other",
            baptism: "baptism",
            "baby shower": "baby-shower",
            reunion: "reunion",
            festival: "festival",
            "engagement party": "engagement",
            "christmas party": "christmas",
            "new year's party": "new-year",
          };

          const normalizedType = eventTypeName.toLowerCase().trim();
          return typeMap[normalizedType] || "other";
        };

        setEventDetails({
          title: booking.event_name || "",
          type: mapEventType(booking.event_type_name),
          date: booking.event_date || "",
          startTime: parseTime(booking.event_time) || "10:00",
          endTime: "18:00", // Default end time
          capacity: parseInt(booking.guest_count) || 100,
          notes: booking.notes || "",
          venue: booking.venue_name || "",
          package: booking.package_id ? String(booking.package_id) : "", // Use package ID, not name
          venueId: booking.venue_id ? String(booking.venue_id) : "", // Add venue ID for auto-selection
          bookingReference: bookingReference, // Store booking reference
        });

        // Set venue and package if available
        if (booking.venue_id) {
          console.log("Setting venue ID from booking:", booking.venue_id);
          setSelectedVenueId(String(booking.venue_id));
        }

        if (booking.package_id) {
          console.log("Setting package ID from booking:", booking.package_id);
          setSelectedPackageId(String(booking.package_id));
          // This will trigger venue loading
          await handlePackageSelect(String(booking.package_id));
        }

        toast({
          title: "Success",
          description:
            "Booking found and form fields populated. You can now create an event from this booking.",
        });
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Booking not found.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error looking up booking:", error);
      toast({
        title: "Error",
        description: "Failed to lookup booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLookupLoading(false);
    }
  };

  const searchBookings = async (searchTerm: string) => {
    // Remove the early return to allow empty search terms to show all confirmed bookings
    console.log("🔍 Searching bookings with term:", searchTerm);
    setBookingSearchLoading(true);
    try {
      const response = await axios.get(
        `http://localhost/events-api/admin.php?operation=searchBookings&search=${encodeURIComponent(
          searchTerm.trim()
        )}`
      );

      console.log("📡 API Response:", response.data);

      if (response.data.status === "success") {
        console.log("✅ Found bookings:", response.data.bookings?.length || 0);
        setBookingSearchResults(response.data.bookings || []);
      } else {
        console.log("❌ API Error:", response.data.message);
        setBookingSearchResults([]);
      }
    } catch (error) {
      console.error("💥 Network Error:", error);
      setBookingSearchResults([]);
    } finally {
      setBookingSearchLoading(false);
    }
  };

  const loadBookingData = (booking: any) => {
    // Parse the booking data and populate the form
    const parseTime = (timeStr: string) => {
      if (!timeStr) return "10:00";
      const time = new Date(`2000-01-01T${timeStr}`);
      return time.toTimeString().slice(0, 5);
    };

    const mapEventType = (eventTypeName: string): string => {
      const typeMap: { [key: string]: string } = {
        wedding: "wedding",
        birthday: "birthday",
        corporate: "corporate",
        christening: "christening",
        debut: "debut",
        funeral: "funeral",
        other: "other",
        anniversary: "anniversary",
        baptism: "baptism",
        "baby shower": "baby-shower",
        reunion: "reunion",
        festival: "festival",
        "engagement party": "engagement",
        "christmas party": "christmas",
        "new year's party": "new-year",
      };
      return typeMap[eventTypeName.toLowerCase()] || "other";
    };

    // Populate client data - use correct field names from API
    setClientData({
      id: booking.user_id?.toString() || "",
      name: booking.client_name || "",
      email: booking.client_email || "",
      phone: booking.client_phone || "",
      address: booking.client_address || "",
    });

    // Populate event details - use correct field names from API
    setEventDetails({
      title: booking.event_name || "",
      type: mapEventType(booking.event_type_name || ""),
      date: booking.event_date || "",
      startTime: parseTime(booking.event_time || booking.start_time),
      endTime: parseTime(booking.end_time) || "18:00", // Default end time
      capacity: booking.guest_count || 100,
      notes: booking.notes || "",
      venue: booking.venue_name || "",
      package: booking.package_id?.toString() || "", // Use package ID, not name
      venueId: booking.venue_id?.toString() || "", // Add venue ID for auto-selection
      bookingReference: booking.booking_reference || "",
      theme: "", // Theme not available in booking data
      description: booking.description || "", // Description not available in booking data
      isRecurring: false,
      recurrenceRule: {
        frequency: "monthly",
        interval: 1,
      },
    });

    // Set package and venue IDs if available
    if (booking.package_id) {
      setSelectedPackageId(booking.package_id.toString());
      // Trigger package selection to load venues and components
      setTimeout(() => {
        handlePackageSelect(booking.package_id.toString());
      }, 100);
    }
    if (booking.venue_id) {
      setSelectedVenueId(booking.venue_id.toString());
    }

    // Set payment data with defaults since booking doesn't have payment info
    setPaymentData({
      total: 0, // Will be calculated from package
      paymentType: "half",
      downPayment: 0,
      balance: 0,
      customPercentage: 50,
      downPaymentMethod: "gcash",
      referenceNumber: "",
      notes: booking.payment_notes || "",
      cashBondRequired: false,
      cashBondStatus: "pending",
      scheduleTypeId: 2,
    });

    toast({
      title: "Booking Loaded!",
      description: `Successfully loaded booking: ${booking.event_name}. All fields have been populated.`,
    });

    setShowBookingLookupModal(false);
    setCurrentStep(2); // Go to Client Details step - NEVER skip step 2
  };

  // Add logic for venue selection step to enforce venue budget
  // Calculate total inclusion/component cost
  const totalInclusionCost = components
    .filter((comp) => comp.category !== "venue")
    .reduce((sum, comp) => sum + (comp.price || 0), 0);
  const packagePrice = originalPackagePrice || 0;
  const remainingBudget = packagePrice - totalInclusionCost;

  // Update the steps array with proper typing
  const baseSteps: Step[] = [
    {
      id: "package-selection",
      title: "Package Selection",
      description: "Choose a package for your event",
      component: (
        <div className="space-y-6">
          {/* Header with booking lookup */}
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              onClick={() => {
                // Show booking lookup modal
                setShowBookingLookupModal(true);
              }}
            >
              Look Up Existing Booking
            </Button>
          </div>

          {/* Event Type Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-type" className="text-base font-medium">
                Event Type *
              </Label>
              <Select
                value={selectedEventType}
                onValueChange={(value) => {
                  setSelectedEventType(value);
                  setEventDetails((prev) => ({ ...prev, type: value }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem
                      key={type.event_type_id}
                      value={type.event_name}
                    >
                      {type.event_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <PackageSelection
            eventType={selectedEventType || eventDetails.type}
            onSelect={handlePackageSelect}
            initialPackageId={selectedPackageId}
          />

          {/* Action buttons */}
          <div className="flex items-center justify-center pt-6">
            <Button
              variant="outline"
              className="px-6 py-3 border-2 border-dashed hover:bg-gray-50"
              onClick={() => {
                // Handle "Start from Scratch" option
                console.log(
                  "Starting from scratch - clearing package selection"
                );
                setSelectedPackageId(null);
                setComponents([]);
                setOriginalPackagePrice(null);
                setPackageVenues([]); // Clear package venues since we'll use all venues

                // Show confirmation toast
                toast({
                  title: "Starting from Scratch",
                  description:
                    "You can now select any venue and customize your event components individually.",
                });

                setCurrentStep(2); // Go to Client Details
              }}
            >
              Skip - Start from Scratch
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "client-details",
      title: "Client Details",
      description: "Select or add client",
      component: (
        <ClientDetailsStep
          initialData={clientData}
          onUpdate={handleClientDataUpdate}
          onNext={(eventDetails?: EventDetails) => {
            if (eventDetails) {
              console.log("Received event details from booking:", eventDetails);
              handleEventDetailsUpdate(eventDetails);
            }
            // Don't auto-skip - let user manually proceed
            console.log(
              "Client details completed, ready for manual progression"
            );
          }}
        />
      ),
    },
    // Wedding Form Step (only for wedding events) - Inserted as Step 3
    ...(selectedEventType === "wedding" ||
    eventDetails.type === "wedding" ||
    getEventTypeIdFromName(selectedEventType || eventDetails.type) === 1
      ? [
          {
            id: "wedding-form",
            title: "Wedding Details",
            description: "Wedding-specific information",
            component: (
              <WeddingFormStep
                eventId={currentEventId || undefined}
                initialData={weddingFormData}
                onUpdate={(data) =>
                  setWeddingFormData((prev) => ({ ...prev, ...data }))
                }
                onNext={() => {
                  // Validate wedding form data before proceeding
                  if (
                    !weddingFormData.bride_name ||
                    !weddingFormData.groom_name
                  ) {
                    toast({
                      title: "Validation Error",
                      description: "Bride and groom names are required",
                      variant: "destructive",
                    });
                    return;
                  }

                  console.log(
                    "Wedding form completed, ready for manual progression"
                  );
                }}
              />
            ),
          },
        ]
      : []),
    {
      id: "event-details",
      title: "Event Details",
      description: "Basic event information",
      component: (
        <EventDetailsStep
          initialData={eventDetails}
          onUpdate={handleEventDetailsUpdate}
          onNext={() => {
            // Validate event details before proceeding
            if (!eventDetails.title) {
              toast({
                title: "Validation Error",
                description: "Event title is required",
                variant: "destructive",
              });
              return;
            }

            if (!eventDetails.date) {
              toast({
                title: "Validation Error",
                description: "Event date is required",
                variant: "destructive",
              });
              return;
            }

            if (!eventDetails.startTime || !eventDetails.endTime) {
              toast({
                title: "Validation Error",
                description: "Start time and end time are required",
                variant: "destructive",
              });
              return;
            }

            if (!eventDetails.capacity || eventDetails.capacity <= 0) {
              toast({
                title: "Validation Error",
                description: "Guest count must be greater than 0",
                variant: "destructive",
              });
              return;
            }

            if (!eventDetails.theme) {
              toast({
                title: "Validation Error",
                description: "Event theme is required",
                variant: "destructive",
              });
              return;
            }

            // Check for scheduling conflicts
            if (eventDetails.hasConflicts) {
              console.log("Scheduling conflicts detected");

              // Enhanced conflict messaging based on business rules
              if (eventDetails.type === "wedding") {
                toast({
                  title: "Wedding Scheduling Conflict",
                  description:
                    "Weddings have special scheduling rules. Only one wedding is allowed per day, and weddings cannot be scheduled alongside other events.",
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "Scheduling Conflict",
                  description:
                    "There are scheduling conflicts with your selected date and time. Please resolve them before proceeding.",
                  variant: "destructive",
                });
              }
              return;
            }

            // Don't auto-skip - let user manually proceed
            console.log(
              "Event details completed, ready for manual progression"
            );
          }}
        />
      ),
    },
    {
      id: "venue-selection",
      title: "Venue Selection",
      description: selectedPackageId
        ? "Choose a venue from your selected package"
        : "Choose any available venue",
      component: (
        <VenueSelection
          eventType={eventDetails.type}
          venues={packageVenues.length > 0 ? packageVenues : allVenues}
          initialVenueId={selectedVenueId || undefined}
          currentGuestCount={eventDetails.capacity}
          onSelect={handleVenueSelection}
          isStartFromScratch={!selectedPackageId}
          onVenuesLoaded={(venues) => {
            if (!selectedPackageId) {
              setAllVenues(venues);
            }
          }}
        />
      ),
    },
    {
      id: "components",
      title: "Components",
      description: selectedPackageId
        ? "Customize package components"
        : "Add and customize event components",
      component: (
        <ComponentCustomization
          components={components.filter(
            (component, index, self) =>
              index ===
              self.findIndex(
                (c) =>
                  c.id === component.id && c.category === component.category
              )
          )}
          selectedVenue={selectedVenue}
          onUpdate={handleComponentsUpdate}
          eventDetails={eventDetails}
          isStartFromScratch={!selectedPackageId}
        />
      ),
    },
    {
      id: "timeline",
      title: "Timeline",
      description: "Plan the schedule",
      component: (
        <TimelineStep
          data={timelineData}
          eventDate={eventDetails.date}
          components={components.filter(
            (component, index, self) =>
              index ===
              self.findIndex(
                (c) =>
                  c.id === component.id && c.category === component.category
              )
          )}
          suppliers={{}}
          updateData={handleTimelineUpdate}
        />
      ),
    },
    {
      id: "organizer",
      title: "Organizer",
      description: "Assign organizer",
      component: (
        <OrganizerSelection
          selectedIds={selectedOrganizers}
          onSelect={setSelectedOrganizers}
          onOrganizerDataUpdate={setOrganizerData}
          externalOrganizer={externalOrganizer}
          onExternalOrganizerChange={setExternalOrganizer}
        />
      ),
    },
    {
      id: "attachments",
      title: "Attachments & Details",
      description: "Upload files and finalize details",
      component: (
        <AttachmentsStep
          eventDetails={eventDetails}
          attachments={attachments}
          uploadingFiles={uploadingFiles}
          clientSignature={clientSignature}
          onEventDetailsUpdate={handleEventDetailsUpdate}
          onFileUpload={handleFileUpload}
          onRemoveAttachment={removeAttachment}
          onSignatureUpdate={(signature) => setClientSignature(signature)}
          formatFileSize={formatFileSize}
        />
      ),
    },
    {
      id: "review-invoice",
      title: "Review & Invoice",
      description: "Final review of event details and costs",
      component: (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Event Invoice Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-brand-600">
                  Client Information
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{clientData.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{clientData.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{clientData.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">{clientData.address || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-brand-600">
                  Event Details
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Event Title</p>
                    <p className="font-medium">{eventDetails.title || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Event Type</p>
                    <p className="font-medium capitalize">
                      {eventDetails.type || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Theme</p>
                    <p className="font-medium">{eventDetails.theme || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium">
                      {eventDetails.date
                        ? new Date(eventDetails.date).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Start Time</p>
                    <p className="font-medium">
                      {eventDetails.startTime || "Not set"}
                    </p>
                  </div>
                  {eventDetails.type === "wedding" &&
                    eventDetails.churchStartTime && (
                      <div>
                        <p className="text-sm text-gray-600">Church Time</p>
                        <p className="font-medium">
                          {eventDetails.churchStartTime}
                        </p>
                      </div>
                    )}
                  <div>
                    <p className="text-sm text-gray-600">Guest Count</p>
                    <p className="font-medium">
                      {eventDetails.capacity || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Package */}
              {selectedPackageId && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-brand-600">
                    Selected Package
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {getSelectedPackageName()}
                        </p>
                        <p className="text-sm text-gray-600">
                          All-inclusive event package
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-brand-600">
                          {formatCurrency(getTotalBudget())}
                        </p>
                        <p className="text-sm text-gray-600">
                          Fixed Bundle Price
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Venue */}
              {selectedVenueId && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-brand-600">
                    Selected Venue
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium">{getSelectedVenueName()}</p>
                    <p className="text-sm text-gray-600">
                      Included in package bundle
                    </p>
                  </div>
                </div>
              )}

              {/* Organizers */}
              {selectedOrganizers.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-brand-600">
                    Assigned Organizers
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    {selectedOrganizers.length === 0 ? (
                      <div
                        key="default-organizer"
                        className="flex items-center mb-2"
                      >
                        <span className="w-2 h-2 bg-brand-500 rounded-full mr-2"></span>
                        <span className="font-medium">
                          Noreen Lagdamin (Default)
                        </span>
                      </div>
                    ) : (
                      selectedOrganizers.map((organizerId) => {
                        // First try to find in the fetched organizer data
                        const apiOrganizer = organizerData.find(
                          (org) => org.organizer_id === organizerId
                        );
                        if (apiOrganizer) {
                          return (
                            <div
                              key={`organizer-${organizerId}`}
                              className="flex items-center mb-2"
                            >
                              <span className="w-2 h-2 bg-brand-500 rounded-full mr-2"></span>
                              <span className="font-medium">
                                {apiOrganizer.organizer_name}
                              </span>
                            </div>
                          );
                        }

                        // Then try to find in static organizers
                        const organizer = organizers.find(
                          (org) => org.id === organizerId
                        );
                        const name = organizer
                          ? organizer.name
                          : `Organizer ${organizerId}`;
                        return (
                          <div
                            key={`organizer-${organizerId}`}
                            className="flex items-center mb-2"
                          >
                            <span className="w-2 h-2 bg-brand-500 rounded-full mr-2"></span>
                            <span className="font-medium">{name}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Cost Breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-brand-600">
                  Cost Summary
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Package Total</span>
                    <span className="font-medium">
                      {formatCurrency(getTotalBudget())}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Amount</span>
                      <span className="text-brand-600">
                        {formatCurrency(getTotalBudget())}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    * All venue costs, inclusions, and services are bundled in
                    the package price
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              {eventDetails.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-brand-600">
                    Additional Notes
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700">{eventDetails.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "payment",
      title: "Payment",
      description: "Process payment",
      component: (
        <PaymentStep
          totalBudget={getTotalBudget()}
          onUpdate={handlePaymentDataUpdate}
          onComplete={handleComplete}
        />
      ),
    },
  ];

  // Defensive filtering: ensure all steps are valid and have proper IDs
  const steps: Step[] = baseSteps.filter(
    (step) => step && step.id && step.title && step.component
  );

  // Ensure currentStep is always valid when steps change
  useEffect(() => {
    if (steps.length > 0 && currentStep > steps.length) {
      setCurrentStep(steps.length);
    }
  }, [steps.length, currentStep]);

  const clearForm = () => {
    // Clear local storage
    clearLocalStorage();

    // Reset all form state
    setClientData({
      id: "",
      name: "",
      email: "",
      phone: "",
      address: "",
    });

    // Reset dirty state
    setIsFormDirty(false);

    setEventDetails({
      type: "birthday",
      title: "",
      date: "",
      startTime: "",
      endTime: "",
      capacity: 0,
      notes: "",
      venue: "",
      package: "",
      theme: "",
      description: "",
      bookingReference: "",
      isRecurring: false,
      recurrenceRule: {
        frequency: "monthly",
        interval: 1,
      },
      churchLocation: "",
      churchStartTime: "",
    });

    setSelectedPackageId(null);
    setSelectedVenueId(null);
    setSelectedVenue(null);
    setComponents([]);
    setOriginalPackagePrice(null);
    setSelectedOrganizers([]);
    setOrganizerData([]);

    setPaymentData({
      total: 0,
      paymentType: "half",
      downPayment: 0,
      balance: 0,
      customPercentage: 50,
      downPaymentMethod: "gcash",
      referenceNumber: "",
      notes: "",
      cashBondRequired: false,
      cashBondStatus: "pending",
      scheduleTypeId: 2,
    });

    setTimelineData([]);
    setAttachments([]);
    setClientSignature("");
    setExternalOrganizer("");
    setWeddingFormData({
      nuptial: "",
      motif: "",
      bride_name: "",
      bride_size: "",
      groom_name: "",
      groom_size: "",
      mother_bride_name: "",
      mother_bride_size: "",
      father_bride_name: "",
      father_bride_size: "",
      mother_groom_name: "",
      mother_groom_size: "",
      father_groom_name: "",
      father_groom_size: "",
      maid_of_honor_name: "",
      maid_of_honor_size: "",
      best_man_name: "",
      best_man_size: "",
      little_bride_name: "",
      little_bride_size: "",
      little_groom_name: "",
      little_groom_size: "",
      bridesmaids_qty: 0,
      bridesmaids_names: [],
      groomsmen_qty: 0,
      groomsmen_names: [],
      junior_groomsmen_qty: 0,
      junior_groomsmen_names: [],
      flower_girls_qty: 0,
      flower_girls_names: [],
      ring_bearer_qty: 0,
      ring_bearer_names: [],
      bible_bearer_qty: 0,
      bible_bearer_names: [],
      coin_bearer_qty: 0,
      coin_bearer_names: [],
      cushions_qty: 0,
      headdress_qty: 0,
      shawls_qty: 0,
      veil_cord_qty: 0,
      basket_qty: 0,
      petticoat_qty: 0,
      neck_bowtie_qty: 0,
      garter_leg_qty: 0,
      fitting_form_qty: 0,
      robe_qty: 0,
      prepared_by: "",
      received_by: "",
      pickup_date: "",
      return_date: "",
      customer_signature: "",
    });

    setCurrentEventId(null);
    setEventData({
      eventTitle: "",
      eventDate: "",
      eventId: `EV-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`,
    });

    // Reset step to first step
    setCurrentStep(1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Event Builder</h1>
          {isFormDirty && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Auto-saving...
            </div>
          )}
        </div>
        {bookingId && (
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm">
            Booking: {bookingId}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <MultiStepWizard
            steps={steps}
            onComplete={handleComplete}
            currentStepIndex={Math.max(
              0,
              Math.min(currentStep - 1, steps.length - 1)
            )}
            onStepChange={(index) =>
              setCurrentStep(Math.max(1, Math.min(index + 1, steps.length)))
            }
            disableNext={currentStep === 1 && !selectedPackageId}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-6 sticky top-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4 border-b pb-2">
                Event Summary
              </h3>
              <div className="space-y-3">
                {clientData.name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{clientData.name}</p>
                  </div>
                )}
                {eventDetails.title && (
                  <div>
                    <p className="text-sm text-muted-foreground">Event</p>
                    <p className="font-medium">{eventDetails.title}</p>
                  </div>
                )}
                {eventDetails.type && (
                  <div>
                    <p className="text-sm text-muted-foreground">Event Type</p>
                    <p className="font-medium capitalize">
                      {eventDetails.type}
                    </p>
                  </div>
                )}
                {eventDetails.theme && (
                  <div>
                    <p className="text-sm text-muted-foreground">Theme</p>
                    <p className="font-medium">{eventDetails.theme}</p>
                  </div>
                )}
                {eventDetails.type === "wedding" &&
                  eventDetails.churchStartTime && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Church Time
                      </p>
                      <p className="font-medium">
                        {eventDetails.churchStartTime}
                      </p>
                    </div>
                  )}
                {eventDetails.date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {new Date(eventDetails.date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {(eventDetails.startTime || eventDetails.endTime) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">
                      {eventDetails.startTime && eventDetails.endTime
                        ? `${eventDetails.startTime} - ${eventDetails.endTime}`
                        : eventDetails.startTime || eventDetails.endTime}
                    </p>
                  </div>
                )}
                {eventDetails.capacity > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Guests</p>
                    <p className="font-medium">{eventDetails.capacity}</p>
                  </div>
                )}
                {/* Display organizers */}
                <div>
                  <p className="text-sm text-muted-foreground">Organizers</p>
                  <div className="font-medium">
                    {selectedOrganizers.length === 0 ? (
                      <div
                        key="default-organizer-summary"
                        className="flex items-center"
                      >
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Noreen Lagdamin (Default)
                      </div>
                    ) : (
                      getOrganizerNames().map((organizerName, index) => (
                        <div
                          key={`summary-organizer-${index}`}
                          className="flex items-center"
                        >
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          {organizerName}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {selectedPackageId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Package</p>
                    <p className="font-medium">{getSelectedPackageName()}</p>
                  </div>
                )}
                {selectedVenueId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Venue</p>
                    <p className="font-medium">{getSelectedVenueName()}</p>
                  </div>
                )}
                {totalBudget > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Budget
                    </p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(totalBudget)}
                    </p>
                  </div>
                )}
                {paymentData.downPayment > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Down Payment
                    </p>
                    <p className="font-medium">
                      {formatCurrency(paymentData.downPayment)}
                    </p>
                  </div>
                )}
                {paymentData.downPaymentMethod && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Payment Method
                    </p>
                    <p className="font-medium capitalize">
                      {paymentData.downPaymentMethod.replace("-", " ")}
                    </p>
                  </div>
                )}
                {paymentData.cashBondStatus && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Payment Status
                    </p>
                    <p className="text-md font-medium capitalize">
                      {paymentData.cashBondStatus}
                    </p>
                  </div>
                )}
                {eventDetails.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium text-sm text-gray-600 max-w-[240px] break-words">
                      {eventDetails.notes}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/admin/events")}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleClearForm}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear All Fields
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Lookup Modal */}
      <Dialog
        open={showBookingLookupModal}
        onOpenChange={setShowBookingLookupModal}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Look Up Existing Booking</DialogTitle>
            <DialogDescription>
              Search for an existing booking to load its data into the event
              builder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="booking-search">
                Search by client name, event title, or booking reference
              </Label>
              <div className="flex gap-2">
                <Input
                  id="booking-search"
                  placeholder="Enter search term..."
                  onChange={(e) => {
                    const searchTerm = e.target.value;
                    if (searchTerm.length >= 2) {
                      searchBookings(searchTerm);
                    } else if (searchTerm.length === 0) {
                      // Show all confirmed bookings when search is cleared
                      searchBookings("");
                    } else {
                      setBookingSearchResults([]);
                    }
                  }}
                />
                {bookingSearchLoading && (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {bookingSearchResults.length > 0 ? (
                <div className="space-y-3">
                  {bookingSearchResults.map((booking) => (
                    <Card
                      key={booking.booking_id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">
                            {booking.event_title || booking.event_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Client: {booking.client_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Date: {booking.event_date} | Type:{" "}
                            {booking.event_type_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Reference: {booking.booking_reference}
                          </p>
                          <p className="text-sm text-gray-600">
                            Status:{" "}
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                booking.booking_status === "confirmed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {booking.booking_status}
                            </span>
                          </p>
                        </div>
                        <Button
                          onClick={() => loadBookingData(booking)}
                          disabled={booking.booking_status !== "confirmed"}
                          size="sm"
                          className="bg-[#028A75] hover:bg-[#028A75]/80"
                        >
                          Create an Event
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  {bookingSearchLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span>Searching...</span>
                    </div>
                  ) : (
                    <p>
                      No confirmed bookings found. Try a different search term
                      or accept some bookings first.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBookingLookupModal(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing Reference Number Dialog */}
      <Dialog
        open={showMissingRefDialog}
        onOpenChange={setShowMissingRefDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reference Number Required</DialogTitle>
            <DialogDescription>
              A reference number is required for{" "}
              {paymentData.downPaymentMethod === "gcash"
                ? "GCash"
                : "bank transfer"}{" "}
              payments. Please add a reference number before proceeding.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowMissingRefDialog(false)}>
              Go Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Confirmation Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>🎉</span>
              Event Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Your event has been created and saved successfully! What would you
              like to do next?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col space-y-2 sm:flex-col sm:space-x-0">
            <Button
              onClick={() => {
                setShowCompletionModal(false);
                clearForm();
                router.push("/admin/dashboard");
              }}
              className="w-full bg-brand-600 hover:bg-brand-700"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => {
                setShowCompletionModal(false);
                clearForm();
                router.push("/admin/events");
              }}
              variant="outline"
              className="w-full"
            >
              View All Events
            </Button>
            <Button
              onClick={() => {
                setShowCompletionModal(false);
                clearForm();
                router.push(`/admin/events/${currentEventId || "calendar"}`);
              }}
              variant="outline"
              className="w-full"
            >
              View Event Calendar
            </Button>
            <Button
              onClick={() => {
                setShowCompletionModal(false);
              }}
              variant="ghost"
              className="w-full"
            >
              Make Changes (Stay Here)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onDashboard={() => router.push("/admin/dashboard")}
        eventDetails={eventData}
      />

      {/* Draft Handler */}
      <DraftHandler
        formData={{
          currentStep,
          clientData,
          eventDetails,
          selectedPackageId,
          selectedVenueId,
          selectedVenue,
          components,
          originalPackagePrice,
          selectedOrganizers,
          paymentData,
          timelineData,
          weddingFormData,
        }}
        onLoadDraft={handleLoadDraft}
        onClearDraft={handleClearDraft}
        isDirty={isFormDirty}
      />

      {/* Clear Form Confirmation Modal */}
      <ClearFormModal
        open={showClearFormModal}
        onOpenChange={setShowClearFormModal}
        onConfirm={handleClearDraft}
      />

      {/* LocalStorage Recovery Modal */}
      <LocalStorageRecoveryModal
        isOpen={showLocalStorageRecoveryModal}
        onSave={handleLocalStorageSave}
        onDiscard={handleLocalStorageDiscard}
        onCancel={handleLocalStorageCancel}
        currentStep={currentStep}
      />
    </div>
  );
}
