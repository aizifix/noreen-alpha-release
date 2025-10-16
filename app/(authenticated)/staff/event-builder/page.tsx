"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateStableId } from "@/app/utils/stableIds";
import { secureStorage } from "@/app/utils/encryption";
import axios from "axios";
import { endpoints, api } from "@/app/config/api";
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
import { toast } from "sonner";
import {
  eventPackages,
  ComponentCategory,
  type PackageComponent as DataPackageComponent,
} from "@/data/packages";
// import { showConfetti } from "@/lib/confetti"; // TEMPORARILY DISABLED TO PREVENT LAG
import { SuccessModal } from "@/app/components/admin/event-builder/success-modal";
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
} from "@/app/types/event-builder";
import WeddingFormStep from "@/app/components/admin/event-builder/wedding-form-step";
import AttachmentsStep from "@/app/components/admin/event-builder/attachments-step";
import { DraftHandler } from "@/app/components/admin/event-builder/draft-handler";
import { ClearFormModal } from "@/app/components/admin/event-builder/clear-form-modal";
import { LocalStorageRecoveryModal } from "@/app/components/admin/event-builder/localstorage-recovery-modal";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
} from "@/app/utils/localStorage";
import {
  getEventTypeIdFromName,
  mapEventType,
} from "@/app/utils/eventTypeUtils";
import { parseTime } from "@/app/utils/timeUtils"; // Utility to parse time strings

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
  const bookingRefFromUrl =
    searchParams.get("booking_ref") ||
    searchParams.get("bookingReference") ||
    searchParams.get("reference") ||
    searchParams.get("ref") ||
    searchParams.get("booking");
  const skipRecovery =
    searchParams.get("skip_recovery") === "1" ||
    searchParams.get("fresh") === "1";

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

    // Ensure all required fields are present with defaults
    if (draft.currentStep) setCurrentStep(draft.currentStep);

    if (draft.clientData) {
      // Ensure clientData has all required fields
      const completeClientData = {
        id: "",
        name: "",
        email: "",
        phone: "",
        profilePicture: "",
        ...draft.clientData,
      };
      setClientData(completeClientData);
    }

    if (draft.eventDetails) {
      // Ensure eventDetails has all required fields
      const completeEventDetails = {
        title: "",
        date: "",
        type: "",
        theme: "",
        description: "",
        capacity: 100,
        churchLocation: "",
        churchStartTime: "",
        notes: "",
        ...draft.eventDetails,
      };
      setEventDetails(completeEventDetails);
    }

    if (draft.selectedPackageId) setSelectedPackageId(draft.selectedPackageId);
    if (draft.selectedVenueId) setSelectedVenueId(draft.selectedVenueId);
    if (draft.selectedVenue) setSelectedVenue(draft.selectedVenue);
    if (draft.components) setComponents(draft.components);
    if (draft.originalPackagePrice)
      setOriginalPackagePrice(draft.originalPackagePrice);
    if (draft.venueBufferFee) setVenueBufferFee(draft.venueBufferFee);
    if (draft.selectedOrganizers)
      setSelectedOrganizers(draft.selectedOrganizers);

    if (draft.paymentData) {
      // Ensure paymentData has all required fields
      const completePaymentData = {
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
        ...draft.paymentData,
      };
      setPaymentData(completePaymentData);
    }

    if (draft.weddingFormData) setWeddingFormData(draft.weddingFormData);
    if (draft.attachments) setAttachments(draft.attachments);
    if (draft.clientSignature) setClientSignature(draft.clientSignature);
    if (draft.externalOrganizer) setExternalOrganizer(draft.externalOrganizer);
    if (draft.bookingReference) setBookingReference(draft.bookingReference);

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

  // Function to manually clear old localStorage data
  const handleClearOldLocalStorage = () => {
    clearLocalStorage();
    toast.success("Local storage cleared successfully");
    // Reset form to ensure clean state
    clearForm();
    setCurrentStep(1);
  };

  // Add current step state
  const [currentStep, setCurrentStep] = useState(1);

  // Use refs to track initialization state
  const initializedRef = useRef(false);
  const packageVenuesInitializedRef = useRef<string | null>(null);
  const submitLockRef = useRef(false);

  // State for LocalStorage recovery modal and unsaved data indicator
  const [showLocalStorageRecoveryModal, setShowLocalStorageRecoveryModal] =
    useState(false);
  const [hasUnsavedData, setHasUnsavedData] = useState(false);
  const [isLoadingBookingData, setIsLoadingBookingData] = useState(false);

  // Determine if a draft or current state has meaningful data (not just defaults)
  const hasMeaningfulFormData = useCallback((data: any): boolean => {
    if (!data || typeof data !== "object") return false;
    const cd = data.clientData || {};
    const ed = data.eventDetails || {};
    const componentsArr = Array.isArray(data.components) ? data.components : [];
    const wedding = data.weddingFormData || {};
    const attachmentsArr = Array.isArray(data.attachments)
      ? data.attachments
      : [];

    return Boolean(
      (cd.name && cd.name.trim()) ||
        (cd.email && cd.email.trim()) ||
        (cd.phone && cd.phone.trim()) ||
        (ed.title && ed.title.trim()) ||
        (ed.theme && ed.theme.trim()) ||
        ed.date ||
        ed.capacity > 0 ||
        data.selectedPackageId ||
        data.selectedVenueId ||
        componentsArr.length > 0 ||
        attachmentsArr.length > 0 ||
        (wedding.bride_name && wedding.bride_name.trim()) ||
        (wedding.groom_name && wedding.groom_name.trim())
    );
  }, []);

  // Check for localStorage recovery on mount
  useEffect(() => {
    if (skipRecovery || bookingRefFromUrl) {
      // Explicitly skip recovery when coming from booking or when forced
      clearLocalStorage();
      setShowLocalStorageRecoveryModal(false);
      setHasUnsavedData(false);
      return;
    }
    const savedData = loadFromLocalStorage();
    if (
      savedData &&
      Object.keys(savedData).length > 0 &&
      hasMeaningfulFormData(savedData)
    ) {
      // Only show recovery modal if the data is relatively recent (within last 24 hours)
      const savedTimestamp = savedData.timestamp || savedData.created_at;
      if (
        !savedTimestamp ||
        Date.now() - new Date(savedTimestamp).getTime() < 24 * 60 * 60 * 1000
      ) {
        setHasUnsavedData(true);
        setShowLocalStorageRecoveryModal(true);
      } else {
        // Clear old data
        clearLocalStorage();
      }
    } else {
      // Ensure no stale/empty drafts trigger modal on a fresh start
      clearLocalStorage();
    }
  }, [hasMeaningfulFormData, skipRecovery, bookingRefFromUrl]);

  // Load data from localStorage after recovery modal
  useEffect(() => {
    if (!showLocalStorageRecoveryModal && !hasUnsavedData) {
      const savedData = loadFromLocalStorage();
      if (savedData) {
        // Load saved data into state
        if (savedData.currentStep) setCurrentStep(savedData.currentStep);
        if (savedData.clientData) {
          const completeClientData = {
            id: "",
            name: "",
            email: "",
            phone: "",
            address: "",
            ...savedData.clientData,
          };
          setClientData(completeClientData);
        }
        if (savedData.eventDetails) {
          const completeEventDetails = {
            title: "",
            date: "",
            type: "",
            theme: "",
            description: "",
            capacity: 100,
            churchLocation: "",
            churchStartTime: "",
            notes: "",
            ...savedData.eventDetails,
          };
          setEventDetails(completeEventDetails);
        }
        if (savedData.selectedPackageId)
          setSelectedPackageId(savedData.selectedPackageId);
        if (savedData.selectedVenueId)
          setSelectedVenueId(savedData.selectedVenueId);
        if (savedData.selectedVenue) setSelectedVenue(savedData.selectedVenue);
        if (savedData.components) setComponents(savedData.components);
        if (savedData.originalPackagePrice)
          setOriginalPackagePrice(savedData.originalPackagePrice);
        if (savedData.venueBufferFee)
          setVenueBufferFee(savedData.venueBufferFee);
        if (savedData.selectedOrganizers)
          setSelectedOrganizers(savedData.selectedOrganizers);
        if (savedData.paymentData) {
          const completePaymentData = {
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
            ...savedData.paymentData,
          };
          setPaymentData(completePaymentData);
        }
        if (savedData.weddingFormData)
          setWeddingFormData(savedData.weddingFormData);
        if (savedData.attachments) setAttachments(savedData.attachments);
        if (savedData.clientSignature)
          setClientSignature(savedData.clientSignature);
        if (savedData.externalOrganizer)
          setExternalOrganizer(savedData.externalOrganizer);
        if (savedData.bookingReference)
          setBookingReference(savedData.bookingReference);
      }
    }
  }, [showLocalStorageRecoveryModal, hasUnsavedData]);

  // State for booking reference lookup
  const [bookingReference, setBookingReference] = useState<string>(
    bookingRefFromUrl || ""
  );
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);

  // State to track if wedding packages are available

  const [clientData, setClientData] = useState<ClientData>({
    id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // Enhanced event details with new fields
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    title: "",
    type: "wedding",
    date: "",
    capacity: 100,
    notes: "",
    venue: "",
    package: "",
    theme: "",
    description: "",
    startTime: "",
    endTime: "",
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
    null
  );
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [components, setComponents] = useState<DataPackageComponent[]>([]);
  const [originalPackagePrice, setOriginalPackagePrice] = useState<
    number | null
  >(null);
  const [venueBufferFee, setVenueBufferFee] = useState<number | null>(null);
  const [selectedOrganizers, setSelectedOrganizers] = useState<string[]>([]);
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
  >([]);
  const [paymentData, setPaymentData] = useState<PaymentData>({
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
  const [showMissingRefDialog, setShowMissingRefDialog] = useState(false);
  const [showBookingLookupModal, setShowBookingLookupModal] = useState(false);
  const [bookingSearchResults, setBookingSearchResults] = useState<any[]>([]);
  const [bookingSearchLoading, setBookingSearchLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showClearFormModal, setShowClearFormModal] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [weddingFormData, setWeddingFormData] = useState<WeddingFormData>({
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
  });
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
          toast.error(
            `${file.name} is larger than 10MB. Please choose a smaller file.`
          );
          continue;
        }

        // Create FormData for file upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("operation", "uploadFile");
        formData.append("fileType", "event_attachment");

        try {
          const response = await axios.post(endpoints.admin, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

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
            toast.error(
              `Failed to upload ${file.name}: ${response.data.message}`
            );
          }
        } catch (error) {
          console.error("File upload error:", error);
          toast.error(`Error uploading ${file.name}`);
        }
      }

      // Add uploaded files to attachments state
      setAttachments((prev) => [...prev, ...uploadedAttachments]);

      if (uploadedAttachments.length > 0) {
        toast.success(
          `Successfully uploaded ${uploadedAttachments.length} file(s)`
        );
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
      const response = await axios.post(endpoints.admin, {
        operation: "getAllAvailableVenues",
      });
      if (
        response.data?.status === "success" ||
        (response.data &&
          typeof response.data === "object" &&
          (response.data.event_id || response.data.eventId))
      ) {
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

  // Fetch event types
  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        const response = await axios.get(
          `${endpoints.admin}?operation=getEventTypes`
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

  // Reconcile selectedEventType with API-provided names once loaded
  useEffect(() => {
    if (!selectedEventType || eventTypes.length === 0) return;
    // If selectedEventType is a normalized/lowercase variant, map it to the API exact name
    const normalized = selectedEventType.toLowerCase().trim();
    const apiMatch = eventTypes.find(
      (t) => (t.event_name || "").toLowerCase().trim() === normalized
    );
    if (apiMatch && apiMatch.event_name !== selectedEventType) {
      setSelectedEventType(apiMatch.event_name);
      setEventDetails((prev) => ({ ...prev, type: apiMatch.event_name }));
    }
  }, [eventTypes, selectedEventType]);

  // Debug wedding form step condition
  useEffect(() => {
    const showWeddingForm =
      selectedEventType === "wedding" ||
      eventDetails.type === "wedding" ||
      getEventTypeIdFromName(selectedEventType || eventDetails.type) === 1;
    console.log("🎭 Wedding Form Step Condition Check:");
    console.log("  selectedEventType:", selectedEventType);
    console.log("  eventDetails.type:", eventDetails.type);
    console.log(
      "  getEventTypeIdFromName result:",
      getEventTypeIdFromName(selectedEventType || eventDetails.type)
    );
    console.log("  showWeddingForm:", showWeddingForm);
  }, [selectedEventType, eventDetails.type]);

  // Auto-load booking data when booking reference is present/changes in URL
  useEffect(() => {
    console.log("🔍 URL Parameter Effect:", {
      bookingRefFromUrl,
      initializedRef: initializedRef.current,
    });

    if (bookingRefFromUrl) {
      console.log(
        "🚀 Starting auto-load for booking reference:",
        bookingRefFromUrl
      );
      setBookingReference(bookingRefFromUrl);
      initializedRef.current = true;
      lookupBookingByReference(bookingRefFromUrl);
    }
  }, [bookingRefFromUrl]);

  // Load all confirmed bookings when modal opens
  useEffect(() => {
    if (showBookingLookupModal) {
      console.log("🚀 Modal opened, loading all confirmed bookings...");
      // Try to load all confirmed bookings first
      loadAllConfirmedBookings();
    }
  }, [showBookingLookupModal]);

  // Function to load all confirmed and not-converted bookings (previous working endpoint)
  const loadAllConfirmedBookings = async () => {
    console.log("🔍 Loading all confirmed bookings...");
    setBookingSearchLoading(true);
    try {
      const fullUrl = `${endpoints.admin}?operation=getAvailableBookings`;
      console.log("🌐 Making request to:", fullUrl);

      const response = await axios.get(fullUrl);
      console.log("📡 getAvailableBookings Response Status:", response.status);
      console.log("📡 getAvailableBookings Response Data:", response.data);

      if (response.data && response.data.status === "success") {
        const allResults = response.data.bookings || [];
        console.log(
          "📋 Available confirmed bookings from API:",
          allResults.length
        );
        console.log("📋 Sample booking:", allResults[0]);
        setBookingSearchResults(allResults);
      } else {
        console.log(
          "❌ getAvailableBookings API Error:",
          response.data?.message || "Unknown error"
        );
        console.log("❌ Full getAvailableBookings response:", response.data);
        setBookingSearchResults([]);
      }
    } catch (error: any) {
      console.error("💥 getAvailableBookings Network Error:", error);
      console.error("💥 getAvailableBookings Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      setBookingSearchResults([]);
    } finally {
      setBookingSearchLoading(false);
    }
  };

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
      venueBufferFee,
      selectedOrganizers,
      organizerData,
      paymentData,
      weddingFormData,
      attachments,
      clientSignature,
      externalOrganizer,
      bookingReference,
      timestamp: new Date().toISOString(),
    };

    if (hasMeaningfulFormData(dataToSave)) {
      saveToLocalStorage(dataToSave);
      setHasUnsavedData(true);
    } else {
      // Avoid persisting empty/default forms
      clearLocalStorage();
      setHasUnsavedData(false);
    }
  }, [
    currentStep,
    clientData,
    eventDetails,
    selectedPackageId,
    selectedVenueId,
    selectedVenue,
    components,
    originalPackagePrice,
    venueBufferFee,
    selectedOrganizers,
    organizerData,
    paymentData,
    weddingFormData,
    attachments,
    clientSignature,
    externalOrganizer,
    bookingReference,
    hasMeaningfulFormData,
  ]);

  // Track form dirty state separately - simplified to avoid infinite loops
  useEffect(() => {
    // Don't mark as dirty if we're currently loading booking data
    if (isLoadingBookingData) {
      return;
    }

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
        weddingFormData.nuptial ||
        weddingFormData.motif ||
        weddingFormData.bride_name ||
        weddingFormData.groom_name
    );

    setIsFormDirty(hasData);
  }, [
    isLoadingBookingData,
    clientData.name,
    clientData.email,
    eventDetails.title,
    eventDetails.theme,
    selectedPackageId,
    selectedVenueId,
    components.length,
    paymentData.downPayment,
    weddingFormData.nuptial,
    weddingFormData.motif,
    weddingFormData.bride_name,
    weddingFormData.groom_name,
  ]);

  // Note: Draft restoration notifications are now handled by DraftHandler component

  // Calculate total budget based on actual components and their prices
  const getTotalBudget = () => {
    console.log(`🔍 getTotalBudget Debug:
      - selectedPackageId: ${selectedPackageId}
      - originalPackagePrice: ${originalPackagePrice}
      - venueBufferFee: ${venueBufferFee}
      - selectedVenue: ${selectedVenue?.venue_title}
      - components.length: ${components.length}
    `);

    // If we have a package and base price, start there and apply deltas
    if (selectedPackageId && originalPackagePrice != null) {
      let total = Number(originalPackagePrice) || 0;
      let packageComponentTotal = 0;
      let venueNetCost = 0;
      let customComponentTotal = 0;

      console.log(`💰 Starting budget calculation:
        - Package ID: ${selectedPackageId}
        - Original package price: ₱${originalPackagePrice.toLocaleString()}
        - Venue buffer fee: ₱${venueBufferFee?.toLocaleString() || "N/A"}
        - Guest count: ${eventDetails.capacity || 100}
        - Selected venue: ${selectedVenue?.venue_title || "None"}
      `);

      // Apply component deltas
      components.forEach((component: any) => {
        const componentPrice =
          Number(component.supplierPrice ?? component.price ?? 0) || 0;

        // Package components: subtract if unchecked
        if (component.category === "package") {
          if (component.included === false) {
            total -= componentPrice;
            packageComponentTotal -= componentPrice;
            console.log(
              `📦 Removed package component: ${component.name} (-₱${componentPrice.toLocaleString()})`
            );
          } else {
            console.log(
              `📦 Package component included: ${component.name} (₱${componentPrice.toLocaleString()})`
            );
          }
          return;
        }

        // Venue components: handle venue buffer and overflow logic
        if (component.category === "venue" && component.isVenueInclusion) {
          // For package-based events, the venue component price should represent
          // only the overflow charge for guests exceeding the base package capacity
          // The venue buffer fee is already included in the package price

          console.log(`🏢 Processing venue component: ${component.name}`, {
            componentPrice: component.price,
            selectedVenue: selectedVenue?.venue_title,
            venueBufferFee,
            guestCount: eventDetails.capacity,
          });

          if (selectedVenue && venueBufferFee !== null) {
            // Use the venue's per-pax rate (extra_pax_rate) as the VenueRate
            const venueRate =
              parseFloat(selectedVenue.extra_pax_rate || 0) || 0;
            const clientPax = eventDetails.capacity || 100;

            // Calculate actual venue cost: VenueRate × ClientPax
            const actualVenueCost = venueRate * clientPax;

            // Calculate excess payment: MAX(0, ActualVenueCost - VenueBuffer)
            const excessPayment = Math.max(0, actualVenueCost - venueBufferFee);
            venueNetCost = excessPayment;

            console.log(`🏢 Venue pricing calculation (NEW FORMULA):
              - Venue: ${selectedVenue.venue_title}
              - Venue Rate: ₱${venueRate.toLocaleString()} per pax
              - Client Pax: ${clientPax}
              - Actual Venue Cost: ₱${venueRate.toLocaleString()} × ${clientPax} = ₱${actualVenueCost.toLocaleString()}
              - Venue Buffer: ₱${venueBufferFee.toLocaleString()} (included in package)
              - Excess Payment: MAX(0, ₱${actualVenueCost.toLocaleString()} - ₱${venueBufferFee.toLocaleString()}) = ₱${excessPayment.toLocaleString()}
              - Logic: ${excessPayment > 0 ? `Additional fee of ₱${excessPayment.toLocaleString()} added to package price` : "No additional fee, venue buffer covers actual cost"}
            `);

            total += excessPayment;
          }
          return;
        }

        // Custom/supplier/extras: add if included
        if (component.included !== false) {
          total += componentPrice;
          customComponentTotal += componentPrice;
          console.log(
            `➕ Added custom component: ${component.name} (₱${componentPrice.toLocaleString()})`
          );
        }
      });

      console.log(`💰 Final budget breakdown:
        - Base package price: ₱${originalPackagePrice.toLocaleString()}
        - Package component adjustments: ₱${packageComponentTotal.toLocaleString()}
        - Venue net cost: ₱${venueNetCost.toLocaleString()}
        - Custom components: ₱${customComponentTotal.toLocaleString()}
        - TOTAL: ₱${total.toLocaleString()}
      `);

      return total;
    }

    // Start-from-scratch mode: sum of included components plus venue
    console.log(`🚨 FALLING BACK TO START-FROM-SCRATCH MODE!`);
    console.log(`   - selectedPackageId: ${selectedPackageId}`);
    console.log(`   - originalPackagePrice: ${originalPackagePrice}`);

    let total = 0;
    components.forEach((component: any) => {
      if (component.included !== false) {
        const componentPrice = component.supplierPrice || component.price || 0;
        total += componentPrice;
        console.log(
          `   - Component: ${component.name} = ₱${componentPrice.toLocaleString()}`
        );
      }
    });

    console.log(`💰 Start-from-scratch total: ₱${total.toLocaleString()}`);
    return total;
  };

  // Calculate venue inclusions total
  const calculateVenueInclusionsTotal = () => {
    let venueTotal = 0;

    // For package-based events, venue inclusions are included in the package price
    if (selectedPackageId && originalPackagePrice != null) {
      // Add venue overflow charges for package-based events
      if (selectedVenue && venueBufferFee !== null) {
        // Use the venue's per-pax rate (extra_pax_rate) as the VenueRate
        const venueRate = parseFloat(selectedVenue.extra_pax_rate || 0) || 0;
        const clientPax = eventDetails.capacity || 100;

        // Calculate actual venue cost: VenueRate × ClientPax
        const actualVenueCost = venueRate * clientPax;

        // Calculate excess payment: MAX(0, ActualVenueCost - VenueBuffer)
        const excessPayment = Math.max(0, actualVenueCost - venueBufferFee);
        venueTotal = excessPayment;
      } else {
        // If no venue selected, venue inclusions = 0 (buffer fee included in package)
        venueTotal = 0;
      }
    } else {
      // For start-from-scratch events, sum venue components
      components.forEach((component: any) => {
        if (component.category === "venue" && component.isVenueInclusion) {
          const componentPrice =
            Number(component.supplierPrice ?? component.price ?? 0) || 0;
          if (component.included !== false) {
            venueTotal += componentPrice;
          }
        }
      });
    }

    return venueTotal;
  };

  // Calculate Noreen components total
  const calculateNoreenComponentsTotal = () => {
    let noreenTotal = 0;

    // For package-based events, Noreen components = package price (venue buffer is included)
    if (selectedPackageId && originalPackagePrice != null) {
      // Start with the full package price (which includes venue buffer)
      noreenTotal = originalPackagePrice;

      // Apply component deltas for package components
      components.forEach((component: any) => {
        const componentPrice =
          Number(component.supplierPrice ?? component.price ?? 0) || 0;

        // Package components: subtract if unchecked
        if (component.category === "package") {
          if (component.included === false) {
            noreenTotal -= componentPrice;
          }
          return;
        }

        // Custom/supplier/extras: add if included (but not venue inclusions)
        if (component.category !== "venue" && component.included !== false) {
          noreenTotal += componentPrice;
        }
      });
    } else {
      // For start-from-scratch events, sum non-venue components
      components.forEach((component: any) => {
        if (component.category !== "venue" || !component.isVenueInclusion) {
          const componentPrice =
            Number(component.supplierPrice ?? component.price ?? 0) || 0;
          if (component.included !== false) {
            noreenTotal += componentPrice;
          }
        }
      });
    }

    return noreenTotal;
  };

  // Calculate total budget with proper venue pricing logic
  const calculateEventSummaryTotal = () => {
    // If we have a package and base price, use package-based pricing
    if (selectedPackageId && originalPackagePrice != null) {
      // Start with Noreen components total (which includes package price + custom components)
      let total = calculateNoreenComponentsTotal();

      // Add venue excess payment for package-based events
      if (selectedVenue && venueBufferFee !== null) {
        // Use the venue's per-pax rate (extra_pax_rate) as the VenueRate
        const venueRate = parseFloat(selectedVenue.extra_pax_rate || 0) || 0;
        const clientPax = eventDetails.capacity || 100;

        // Calculate actual venue cost: VenueRate × ClientPax
        const actualVenueCost = venueRate * clientPax;

        // Calculate excess payment: MAX(0, ActualVenueCost - VenueBuffer)
        const excessPayment = Math.max(0, actualVenueCost - venueBufferFee);
        total += excessPayment;

        console.log(`🎯 Event Summary Package-Based Calculation (NEW FORMULA):
          - Noreen components: ₱${(total - excessPayment).toLocaleString()} (includes package price ₱${originalPackagePrice.toLocaleString()})
          - Venue Rate: ₱${venueRate.toLocaleString()} per pax
          - Client Pax: ${clientPax}
          - Actual Venue Cost: ₱${venueRate.toLocaleString()} × ${clientPax} = ₱${actualVenueCost.toLocaleString()}
          - Excess Payment: MAX(0, ₱${actualVenueCost.toLocaleString()} - ₱${venueBufferFee.toLocaleString()}) = ₱${excessPayment.toLocaleString()}
          - Final total: ₱${total.toLocaleString()}
        `);
      }

      console.log(`🎯 Final Event Summary Total:
        - Noreen components: ₱${(total - (selectedVenue && venueBufferFee !== null ? Math.max(0, parseFloat(selectedVenue.extra_pax_rate || 0) * (eventDetails.capacity || 100) - venueBufferFee) : 0)).toLocaleString()}
        - Venue excess: ₱${(selectedVenue && venueBufferFee !== null ? Math.max(0, parseFloat(selectedVenue.extra_pax_rate || 0) * (eventDetails.capacity || 100) - venueBufferFee) : 0).toLocaleString()}
        - Final total: ₱${total.toLocaleString()}
      `);

      return total;
    }

    // Fallback to getTotalBudget for start-from-scratch events
    return getTotalBudget();
  };

  // Calculate total budget - use consistent calculation across all steps
  const totalBudget = calculateEventSummaryTotal();

  const venueInclusionsTotal = calculateVenueInclusionsTotal();
  const noreenComponentsTotal = calculateNoreenComponentsTotal();

  // Debug: Log the total budget calculation result
  console.log(
    `🎯 Event Summary Total Budget: ₱${totalBudget.toLocaleString()}`
  );
  console.log(
    `🏢 Venue Inclusions Total: ₱${venueInclusionsTotal.toLocaleString()}`
  );
  console.log(
    `🎨 Noreen Components Total: ₱${noreenComponentsTotal.toLocaleString()}`
  );

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
    (details: Partial<EventDetails>) => {
      console.log("Updating event details:", details);
      setEventDetails((prev: EventDetails) => ({
        ...prev,
        ...details,
      }));
      setIsFormDirty(true);
    },
    []
  );

  // Handle package selection
  const handlePackageSelect = useCallback(
    async (packageId: string) => {
      setSelectedPackageId(packageId);
      try {
        toast.success(`Package selected: ${packageId}`);
      } catch {}

      try {
        // Fetch package details
        const response = await axios.get(
          `${endpoints.admin}?operation=getPackageById&package_id=${packageId}`
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
              // For package-based events, venue pricing is handled in getTotalBudget()
              const venueComponent: DataPackageComponent = {
                id: `venue-${matchingVenue.venue_id}`,
                name: matchingVenue.venue_title || matchingVenue.venue_name,
                description: `Venue: ${matchingVenue.venue_title || matchingVenue.venue_name} (auto-selected from booking)`,
                price: 0, // Pricing handled in getTotalBudget() for package-based events
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

          // Map all inclusions without collapsing; ensure unique, stable IDs even if API omits component_id
          const rawComponents = packageData.components || [];
          const packageComponents = rawComponents.map(
            (comp: any, idx: number) => ({
              id: String(
                comp.component_id ?? comp.id ?? `pkg-${packageId}-comp-${idx}`
              ),
              name: comp.component_name,
              price: parseFloat(comp.component_price) || 0,
              description: comp.component_description,
              category: "package",
              included: true,
              isCustom: false,
              originalId: comp.component_id ?? comp.id ?? null,
              isExpanded: false,
              subComponents:
                comp.subcomponents?.map((sub: any, sIdx: number) => ({
                  id: String(
                    sub.subcomponent_id ?? sub.id ?? `sub-${idx}-${sIdx}`
                  ),
                  name: sub.subcomponent_name,
                  quantity: 1,
                  unitPrice: parseFloat(sub.subcomponent_price) || 0,
                  description: sub.subcomponent_description,
                })) || [],
            })
          );

          // Don't add venue inclusions yet - wait for venue selection
          // Only set package components initially
          setComponents(packageComponents);

          // Set original package price
          setOriginalPackagePrice(parseFloat(packageData.package_price));

          // Set venue buffer fee from package
          const bufferFee = parseFloat(packageData.venue_fee_buffer || 0);
          setVenueBufferFee(bufferFee);
          console.log("🏢 Venue Buffer Fee fetched from package:", bufferFee);

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
        toast.error("Failed to load package details. Please try again.");
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
      try {
        toast.success(`Venue selected: ${venueId}`);
      } catch {}

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

        // For package-based events, create a venue component for display purposes only
        // The actual pricing is handled in getTotalBudget() function
        let venuePrice = 0;
        let description = `Venue: ${venue.venue_title || venue.venue_name}`;

        if (!isStartFromScratch && venueBufferFee !== null) {
          // For package-based events, show venue buffer fee in description
          const extraPaxRate = parseFloat(venue.extra_pax_rate || 0);
          const overflowCharge =
            guestCount > 100 ? Math.max(0, guestCount - 100) * extraPaxRate : 0;

          // Calculate net additional fee using the same logic as getTotalBudget()
          const netAdditionalFee = Math.max(0, overflowCharge - venueBufferFee);

          description += ` (includes ₱${venueBufferFee.toLocaleString()} buffer fee`;
          if (overflowCharge > 0) {
            description += `, ₱${overflowCharge.toLocaleString()} overflow charge for ${Math.max(0, guestCount - 100)} extra guests`;
            if (netAdditionalFee > 0) {
              description += `, ₱${netAdditionalFee.toLocaleString()} net additional fee`;
            } else {
              description += `, no additional fee (buffer covers overflow)`;
            }
          }
          description += `)`;

          console.log(
            "🏢 Package venue selected - pricing handled in budget calculation:",
            {
              venueBufferFee,
              overflowCharge,
              netAdditionalFee: netAdditionalFee,
              guestCount,
              extraPaxRate,
            }
          );
        } else {
          // For start-from-scratch events, use the actual venue price
          venuePrice = parseFloat(venue.venue_price) || 0;
          const extraPaxRate = parseFloat(venue.extra_pax_rate || 0);
          const overflowCharge =
            guestCount > 100 ? Math.max(0, guestCount - 100) * extraPaxRate : 0;
          venuePrice += overflowCharge;

          if (overflowCharge > 0) {
            description += ` (base: ₱${parseFloat(venue.venue_price || 0).toLocaleString()}, overflow: ₱${overflowCharge.toLocaleString()})`;
          }

          console.log("🏢 Start-from-scratch venue selected:", {
            basePrice: parseFloat(venue.venue_price || 0),
            overflowCharge,
            totalPrice: venuePrice,
          });
        }

        const venueComponent: DataPackageComponent = {
          id: `venue-${venue.venue_id}`,
          name: venue.venue_title || venue.venue_name,
          description: description,
          price: venuePrice, // Only used for start-from-scratch events
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

        // Note: We keep the originalPackagePrice for budget breakdown display
        // The getTotalBudget() function already handles component modifications
        // by applying deltas to the original package price
        console.log(
          "✅ Components updated - keeping original package price for budget tracking"
        );
      }
    },
    [components]
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

  // Debug helper to verify payload before submission
  const logPreSubmitDebug = useCallback(
    (payload: any) => {
      try {
        console.groupCollapsed("Pre-Submit Debug – Event Creation");
        console.log("Client Data:", clientData);
        console.log("Event Details:", eventDetails);
        console.log("Selected Package:", selectedPackageId);
        console.log("Selected Venue:", selectedVenueId, selectedVenue);
        console.log("Organizers:", selectedOrganizers, organizerData);
        console.log("Payment Data:", paymentData);
        console.table(
          (components || []).map((c) => ({
            id: c.id,
            name: c.name,
            category: (c as any).category,
            included: c.included !== false,
            price: Number((c.price as any) || 0),
          }))
        );

        // Check for suspicious empty/null strings for critical fields
        const suspectFields = [
          "event_title",
          "event_theme",
          "event_description",
          "church_location",
          "church_start_time",
          "event_date",
          "start_time",
          "end_time",
          "payment_method",
          "reference_number",
          "additional_notes",
          "client_signature",
        ];

        const empties = suspectFields.filter((k) => {
          const v = (payload as any)?.[k];
          return (
            v === null ||
            v === undefined ||
            (typeof v === "string" && v.trim() === "")
          );
        });

        if (empties.length > 0) {
          console.warn("Empty/Null critical fields before submit:", empties);
        } else {
          console.log("All critical fields populated.");
        }

        // Quick numeric sanity
        console.log(
          "Total Budget:",
          payload.total_budget,
          "Down Payment:",
          payload.down_payment
        );

        console.log("Final Event Payload:", payload);
        console.groupEnd();
      } catch (e) {
        console.error("Pre-Submit Debug logging failed:", e);
      }
    },
    [
      clientData,
      eventDetails,
      selectedPackageId,
      selectedVenueId,
      selectedVenue,
      selectedOrganizers,
      organizerData,
      paymentData,
      components,
    ]
  );

  const handleComplete = async () => {
    if (submitLockRef.current) {
      return;
    }
    submitLockRef.current = true;
    // Add loading state
    setLoading(true);
    console.log("🚀 Starting event creation process...");

    // Get admin user data from secure storage first
    const userData = secureStorage.getItem("user");
    console.log("Admin user data:", userData);
    if (!userData || !userData.user_id) {
      console.log("❌ Admin user validation failed");
      toast.error("Admin user information not found. Please log in again.");
      setLoading(false);
      submitLockRef.current = false;
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
        "❌ Reference number required but missing for method:",
        paymentData.downPaymentMethod
      );
      setShowMissingRefDialog(true);
      setLoading(false);
      submitLockRef.current = false;
      return;
    }

    // Validate payment amount
    if (paymentData.downPayment && paymentData.downPayment < 0) {
      console.log("❌ Invalid down payment amount:", paymentData.downPayment);
      toast.error("Down payment amount cannot be negative.");
      setLoading(false);
      submitLockRef.current = false;
      return;
    }

    // Validate total budget
    const totalBudget = calculateEventSummaryTotal();
    if (totalBudget <= 0) {
      console.log("❌ Invalid total budget:", totalBudget);
      toast.error("Total budget must be greater than 0.");
      setLoading(false);
      submitLockRef.current = false;
      return;
    }

    // Validate down payment doesn't exceed total budget
    if (paymentData.downPayment > totalBudget) {
      console.log(
        "❌ Down payment exceeds total budget:",
        paymentData.downPayment,
        ">",
        totalBudget
      );
      toast.error("Down payment cannot exceed the total budget.");
      setLoading(false);
      submitLockRef.current = false;
      return;
    }

    console.log("✅ Payment validation passed");

    console.log("🔍 Starting additional validations...");

    // Validate client data
    console.log("Client data:", clientData);
    if (!clientData.id) {
      console.log("❌ Client validation failed - no client ID");
      toast.error("Please select a client before creating an event.");
      setLoading(false);
      submitLockRef.current = false;
      return;
    }
    console.log("✅ Client validation passed");

    // Validate event details
    console.log("Event details:", eventDetails);
    console.log("Event details keys:", Object.keys(eventDetails));
    console.log("Event title:", eventDetails.title);
    console.log("Event date:", eventDetails.date);
    console.log("Event capacity:", eventDetails.capacity);
    console.log("Event theme:", eventDetails.theme);
    console.log("Event type:", eventDetails.type);

    // Set default title if empty
    if (!eventDetails.title || eventDetails.title.trim() === "") {
      const eventTypeName = eventDetails.type || "Event";
      const defaultTitle = `${eventTypeName.charAt(0).toUpperCase() + eventTypeName.slice(1)} Event`;
      setEventDetails((prev) => ({ ...prev, title: defaultTitle }));
      console.log("✅ Set default event title:", defaultTitle);
    }

    if (!eventDetails.date) {
      console.log(
        "❌ Event date validation failed - date is:",
        eventDetails.date
      );
      toast.error("Event date is required");
      setLoading(false);
      submitLockRef.current = false;
      return;
    }
    console.log("✅ Event date validation passed");

    if (!eventDetails.capacity || eventDetails.capacity <= 0) {
      console.log(
        "❌ Event capacity validation failed - capacity is:",
        eventDetails.capacity
      );
      toast.error("Guest count must be greater than 0");
      setLoading(false);
      submitLockRef.current = false;
      return;
    }
    console.log("✅ Event capacity validation passed");

    if (!eventDetails.theme || eventDetails.theme.trim() === "") {
      console.log(
        "❌ Event theme validation failed - theme is:",
        eventDetails.theme
      );
      toast.error("Event theme is required");
      setLoading(false);
      submitLockRef.current = false;
      return;
    }
    console.log("✅ Event theme validation passed");

    // Check for scheduling conflicts
    console.log(
      "Checking for scheduling conflicts - hasConflicts:",
      eventDetails.hasConflicts
    );
    if (eventDetails.hasConflicts) {
      console.log("❌ Scheduling conflicts detected");

      // Enhanced conflict messaging based on business rules
      if (eventDetails.type === "wedding") {
        toast.error(
          "Weddings have special scheduling rules. Only one wedding is allowed per day, and weddings cannot be scheduled alongside other events."
        );
      } else {
        toast.error(
          "There are scheduling conflicts with your selected date. Please resolve them before proceeding."
        );
      }
      setLoading(false);
      submitLockRef.current = false;
      return;
    }
    console.log("✅ No scheduling conflicts detected");

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

      // Get current event details with any updates
      const currentEventDetails = {
        ...eventDetails,
        title:
          eventDetails.title ||
          `${eventDetails.type?.charAt(0).toUpperCase() + eventDetails.type?.slice(1)} Event`,
      };

      // Prepare event data for API with proper field mapping to match backend expectations
      const eventData = {
        operation: "createEvent",
        original_booking_reference: bookingReference || null,
        user_id: parseInt(clientData.id) || 0,
        admin_id: parseInt(userData.user_id) || 0,
        // Set organizer_id; default to admin if none selected
        organizer_id:
          selectedOrganizers.length > 0
            ? parseInt(selectedOrganizers[0])
            : parseInt(userData.user_id),
        external_organizer:
          (externalOrganizer && externalOrganizer.trim()) || "N/A",
        event_title: currentEventDetails.title.trim(),
        event_theme: currentEventDetails.theme?.trim() || "N/A",
        event_description:
          (currentEventDetails.description &&
            currentEventDetails.description.trim()) ||
          "N/A",
        church_location:
          (currentEventDetails.churchLocation &&
            currentEventDetails.churchLocation.trim()) ||
          "N/A",
        church_start_time:
          (currentEventDetails.churchStartTime &&
            currentEventDetails.churchStartTime.trim()) ||
          "00:00:00",
        event_type_id: getEventTypeIdFromName(currentEventDetails.type) || 1, // Default to wedding if not found
        guest_count: parseInt(currentEventDetails.capacity?.toString()) || 100,
        event_date: currentEventDetails.date,
        start_time: "00:00:00", // Ensure proper time format
        end_time: "23:59:59", // All events are whole day events
        package_id: selectedPackageId ? parseInt(selectedPackageId) : null, // No package for start from scratch events
        venue_id: selectedVenueId ? parseInt(selectedVenueId) : null,
        total_budget: Number(
          (parseFloat(calculateEventSummaryTotal()?.toString()) || 0).toFixed(2)
        ),
        down_payment: Number(
          (parseFloat(paymentData?.downPayment?.toString()) || 0).toFixed(2)
        ),
        payment_method: (paymentData?.downPaymentMethod || "cash").toString(),
        payment_schedule_type_id: paymentData?.scheduleTypeId || 2,
        reference_number: (() => {
          const method = (paymentData?.downPaymentMethod || "cash").toString();
          if (method === "cash") {
            return ""; // No reference required for cash payments
          }
          const ref = (paymentData?.referenceNumber || "").toString().trim();
          return ref.length > 0 ? ref : "";
        })(),
        additional_notes:
          (currentEventDetails.notes && currentEventDetails.notes.trim()) ||
          "N/A",
        // Must match DB enum: 'done' | 'confirmed' | 'on_going' | 'cancelled'
        event_status: "confirmed",
        // Enhanced fields
        client_signature: (clientSignature && clientSignature.trim()) || "N/A",
        finalized_at: null,
        // Event attachments - include uploaded files and organizer invites metadata (if any)
        event_attachments: (() => {
          const eventAttachments = (attachments || []).map((attachment) => ({
            original_name: attachment.fileName,
            file_name:
              attachment.uploadedPath?.split("/").pop() || attachment.fileName,
            file_path: attachment.uploadedPath || "",
            file_size: attachment.fileSize,
            file_type: attachment.fileType,
            description: "",
            attachment_type: "event_attachment",
            uploaded_at: attachment.uploadedAt || new Date().toISOString(),
          }));

          // Persist organizer invites metadata without changing backend endpoints
          const hasOrganizerMeta =
            (selectedOrganizers && selectedOrganizers.length > 0) ||
            !!externalOrganizer;
          if (hasOrganizerMeta) {
            try {
              eventAttachments.push({
                original_name: "organizer_invites.json",
                file_name: "organizer_invites",
                file_path: "",
                file_size: 0,
                file_type: "application/json",
                description: JSON.stringify({
                  pending: selectedOrganizers || [],
                  accepted: [],
                  rejected: [],
                  externalOrganizer: externalOrganizer || null,
                  created_at: new Date().toISOString(),
                }),
                attachment_type: "organizer_invites",
                uploaded_at: new Date().toISOString(),
              });
            } catch (e) {
              console.warn("Failed to serialize organizer invites metadata", e);
            }
          }

          return eventAttachments.length > 0 ? eventAttachments : [];
        })(),
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
      });
      console.log("Components being sent:", eventData.components);
      console.log("Venue ID being sent:", eventData.venue_id);
      console.log("Package ID being sent:", eventData.package_id);
      console.log("Event type ID being sent:", eventData.event_type_id);
      console.log("Client ID being sent:", eventData.user_id);
      console.log("Admin ID being sent:", eventData.admin_id);

      // Validate critical fields before sending
      const validationErrors = [];

      // Check required fields with better error messages
      if (!clientData?.id) {
        validationErrors.push("Please select a client");
      }
      if (!currentEventDetails?.title?.trim()) {
        validationErrors.push("Event title is required");
      }
      if (!currentEventDetails?.date) {
        validationErrors.push("Event date is required");
      }
      if (!currentEventDetails?.type) {
        validationErrors.push("Event type is required");
      }
      if (!currentEventDetails?.capacity || currentEventDetails.capacity <= 0) {
        validationErrors.push("Guest count must be greater than 0");
      }
      if (!paymentData?.downPaymentMethod) {
        validationErrors.push("Payment method is required");
      }

      // Log current state for debugging
      console.log("🔍 Validation Debug - Current State:");
      console.log("clientData:", clientData);
      console.log("currentEventDetails:", currentEventDetails);
      console.log("paymentData:", paymentData);
      console.log("selectedPackageId:", selectedPackageId);
      console.log("selectedVenueId:", selectedVenueId);

      if (validationErrors.length > 0) {
        console.error(
          "❌ Validation errors before API call:",
          validationErrors
        );
        toast.error(
          `Please fix the following issues:\n${validationErrors.join("\n")}`
        );
        setLoading(false);
        submitLockRef.current = false;
        return;
      }

      // Enforce required selections based on event type
      if (!isStartFromScratch) {
        // For package-based events, require package and venue selection
        if (!selectedPackageId) {
          toast.error("Please select a package before creating the event.");
          setLoading(false);
          submitLockRef.current = false;
          return;
        }
        if (!selectedVenueId) {
          toast.error("Please select a venue before creating the event.");
          setLoading(false);
          submitLockRef.current = false;
          return;
        }
      } else {
        // For start-from-scratch events, package and venue are optional
        console.log(
          "Start from scratch event - package and venue selection is optional"
        );
      }
      if ((parseFloat(calculateEventSummaryTotal().toString()) || 0) <= 0) {
        toast.error("Total budget must be greater than 0.");
        setLoading(false);
        submitLockRef.current = false;
        return;
      }

      console.log("✅ All validations passed, proceeding with API call");

      // Final debug log before calling API
      logPreSubmitDebug(eventData);

      // Call API to create event using the configured API wrapper
      console.log("🚀 Making API call to create event...");
      console.log("📤 Sending event data to API...");

      // Use axios directly to ensure proper error handling
      const response = await axios.post(endpoints.admin, eventData, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000, // 30 second timeout
      });

      console.log("📡 API response received:", response);
      console.log("Response status:", response.status);
      console.log("Response status text:", response.statusText);
      console.log("Response headers:", response.headers);
      console.log("✅ API call completed successfully");

      console.log("API Response:", response.data);
      console.log("API Response type:", typeof response.data);
      console.log("API Response stringified:", JSON.stringify(response.data));
      console.log("API Response keys:", Object.keys(response.data || {}));
      console.log("Response data status:", response.data?.status);
      console.log("Response data message:", response.data?.message);
      console.log("Response data event_id:", response.data?.event_id);

      // Additional debugging for response structure
      console.log("Full response object:", response);
      console.log("Response status code:", response.status);
      console.log("Response headers:", response.headers);

      // Enhanced debugging for error responses
      if (response.data?.debug) {
        console.log("🔍 Debug information:", response.data.debug);
        console.log("Error details:", {
          error: response.data.debug.error,
          file: response.data.debug.file,
          line: response.data.debug.line,
        });
      }

      // Check if response is HTML (common PHP error output)
      if (
        typeof response.data === "string" &&
        (response.data.includes("<!DOCTYPE") || response.data.includes("<html"))
      ) {
        console.error("API returned HTML instead of JSON - likely a PHP error");
        console.error("HTML Response:", response.data);
        throw new Error(
          "Server returned HTML instead of JSON. Check PHP error logs."
        );
      }

      // Enhanced response validation and tolerant success handling
      const isHttpSuccess = response.status >= 200 && response.status < 300;
      const isEmptyObject =
        response &&
        typeof response.data === "object" &&
        response.data !== null &&
        Object.keys(response.data).length === 0;
      const apiReportsSuccess = response?.data?.status === "success";
      const shouldAssumeSuccess =
        isHttpSuccess &&
        (apiReportsSuccess || isEmptyObject || response.data == null);

      if (shouldAssumeSuccess) {
        console.log("✅ Event created successfully!");
        console.log("Response data:", response.data ?? {});
        console.log("Response status check passed");
        console.log("Event ID from response:", response.data?.event_id);

        // Show success UI and confetti - TEMPORARILY DISABLED TO PREVENT LAG
        // try {
        //   showConfetti();
        // } catch (confettiError) {
        //   console.warn("Confetti failed to show:", confettiError);
        // }

        // Show appropriate success message
        const isStartFromScratch = !selectedPackageId;
        if (bookingReference) {
          toast.success(
            `Event created successfully from booking ${bookingReference}. The booking status has been updated to converted.`
          );
        } else {
          toast.success(
            isStartFromScratch
              ? `Custom event "${eventDetails.title}" has been created with ${components.length} components.`
              : "Event created successfully!"
          );
        }

        // Update event data with returned event ID
        const newEventId =
          response?.data?.event_id || response?.data?.eventId || null;
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

        // Initial payment recorded with event creation - no separate attachments needed
        console.log("✅ Initial payment created successfully with event");

        // Save wedding details if this is a wedding event and we have wedding form data
        console.log("🔍 Wedding Details Save Check:");
        console.log("Event type:", eventDetails.type);
        console.log(
          "Event type ID:",
          getEventTypeIdFromName(eventDetails.type)
        );
        console.log("Wedding form data:", weddingFormData);
        console.log("New event ID:", newEventId);
        console.log(
          "Has meaningful wedding data:",
          weddingFormData?.bride_name ||
            weddingFormData?.groom_name ||
            weddingFormData?.nuptial ||
            weddingFormData?.motif
        );

        // Check if this is a wedding event (either by type name or type ID)
        const isWeddingEvent =
          eventDetails.type === "wedding" ||
          eventDetails.type === "Wedding" ||
          getEventTypeIdFromName(eventDetails.type) === 1;

        console.log("🎯 Is wedding event:", isWeddingEvent);
        console.log("🎯 Has wedding form data:", !!weddingFormData);
        console.log("🎯 Has new event ID:", !!newEventId);

        if (isWeddingEvent && weddingFormData && newEventId) {
          try {
            console.log("📤 Saving wedding details for event:", newEventId);
            const weddingResponse = await axios.post(endpoints.admin, {
              operation: "saveWeddingDetails",
              event_id: newEventId,
              ...weddingFormData,
            });

            if (weddingResponse.data.status === "success") {
              console.log("✅ Wedding details saved successfully");
            } else {
              console.warn(
                "❌ Failed to save wedding details:",
                weddingResponse.data.message
              );
            }
          } catch (weddingError) {
            console.error("❌ Error saving wedding details:", weddingError);
          }
        } else {
          console.log("⏭️ Skipping wedding details save - conditions not met");
        }

        // Note: Organizer is now assigned directly during event creation
        // The organizer_id is set in the event data above

        // Show completion confirmation modal
        console.log("✅ Event created successfully, showing completion modal");
        console.log("Current showCompletionModal state:", showCompletionModal);
        setShowCompletionModal(true);
        console.log("Set showCompletionModal to true");
        console.log("Modal should now be visible");

        // Force a re-render to ensure modal state is updated
        setTimeout(() => {
          console.log("Modal state after timeout:", showCompletionModal);
        }, 100);

        // If the event came from a booking, proactively remove it from the lookup list
        if (bookingReference) {
          setBookingSearchResults((prev) =>
            Array.isArray(prev)
              ? prev.filter(
                  (b: any) => b.booking_reference !== bookingReference
                )
              : prev
          );
        }

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
        let errorMessage = "Failed to create event. Please try again.";

        if (response.data?.message) {
          errorMessage = response.data.message;
        } else if (typeof response.data === "string") {
          errorMessage = response.data;
        }

        toast.error(errorMessage);
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

          // Enhanced error display with debug information
          const debugInfo = error.response.data.debug;
          const fullErrorMessage = debugInfo
            ? `${errorMessage}\n\nDebug: ${debugInfo.error || "No debug info"}\nFile: ${debugInfo.file || "Unknown"}\nLine: ${debugInfo.line || "Unknown"}`
            : errorMessage;

          console.error("🔍 Full error details:", {
            message: errorMessage,
            debug: debugInfo,
            fullResponse: error.response.data,
          });

          toast.error(fullErrorMessage);
        } else if (error.request) {
          // Request was made but no response received
          toast.error(
            "No response from server. Please check your connection and ensure the backend server is running."
          );
        } else {
          // Something else happened
          toast.error("Failed to send request to server. Please try again.");
        }
      } else if (
        error.code === "ECONNREFUSED" ||
        error.message?.includes("Network Error")
      ) {
        toast.error(
          "Cannot connect to the backend server. Please check your internet connection and try again."
        );
      } else {
        toast.error(`An unexpected error occurred: ${error.message || error}`);
      }
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  // Helper function to convert event type name to ID
  const getEventTypeIdFromName = (typeName: string): number => {
    if (!typeName || typeof typeName !== "string") {
      console.warn("Invalid event type provided:", typeName);
      return 5; // Default to "Others"
    }

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

    const normalizedType = typeName.toLowerCase().trim();
    const eventTypeId = eventTypeMap[normalizedType] || 5; // Default to "Others" (5) if not found
    console.log(
      `Event type "${typeName}" (normalized: "${normalizedType}") mapped to ID: ${eventTypeId}`
    );
    return eventTypeId;
  };

  // Function to look up a booking by reference
  const lookupBookingByReference = async (refOverride?: string) => {
    const refToUse = refOverride ?? bookingReference;
    console.log("🔍 lookupBookingByReference called with:", refToUse);

    if (!refToUse) {
      console.log("❌ No booking reference provided");
      toast.error("Please enter a booking reference.");
      return;
    }

    try {
      console.log("🚀 Making API call to get booking by reference:", refToUse);
      setLookupLoading(true);
      setIsLoadingBookingData(true);

      const apiUrl = `${endpoints.admin}?operation=getBookingByReference&reference=${encodeURIComponent(refToUse)}`;
      console.log("🌐 API URL:", apiUrl);

      const response = await axios.get(endpoints.admin, {
        params: {
          operation: "getBookingByReference",
          reference: refToUse,
        },
      });

      console.log("📡 API Response:", response.data);

      if (response.data.status === "success" && response.data.booking) {
        const booking = response.data.booking;
        console.log("✅ Booking found:", booking);

        // Check if booking is confirmed
        const status = (booking.booking_status || "").toString().toLowerCase();
        console.log("📊 Booking status:", status);

        if (status !== "confirmed") {
          console.log("❌ Booking not confirmed:", booking.booking_status);
          toast.error(
            `This booking is ${booking.booking_status}. Only confirmed bookings can be converted to events.`
          );
          return;
        }

        // Check if booking has already been converted
        if (
          (booking.is_converted && booking.converted_event_id) ||
          booking.booking_status === "converted"
        ) {
          toast.error(
            `This booking has already been converted to an event (ID: ${booking.converted_event_id}). A booking can only be converted once.`
          );
          return;
        }

        // Set client data - use correct field names from API response
        setClientData({
          id: String(booking.user_id),
          name:
            `${booking.user_firstName || ""} ${booking.user_lastName || ""}`.trim() ||
            booking.client_name ||
            "",
          email: booking.user_email || booking.client_email || "",
          phone: booking.user_contact || booking.client_phone || "",
          address: booking.user_address || booking.client_address || "",
        });

        // Set event details with proper time parsing and event type mapping
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
            christening: "christening",
            debut: "debut",
            funeral: "funeral",
          };

          const normalizedType = eventTypeName.toLowerCase().trim();
          return typeMap[normalizedType] || "other";
        };

        // Use the actual event type from booking, not hardcoded "birthday"
        const mappedEventType = mapEventType(
          booking.event_type_name || booking.event_type
        );

        setEventDetails({
          type: mappedEventType,
          title: booking.event_name || "",
          date: booking.event_date || "",
          capacity: parseInt(booking.guest_count) || 100,
          notes: booking.notes || "",
          venue: booking.venue_name || "",
          package: booking.package_id ? String(booking.package_id) : "", // Use package ID, not name
          venueId: booking.venue_id ? String(booking.venue_id) : "", // Add venue ID for auto-selection
          bookingReference: bookingReference, // Store booking reference
        });

        // Set the selected event type for proper step navigation (prefer API name)
        setSelectedEventType(
          booking.event_type_name || booking.event_type || mappedEventType
        );

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

        // Debug logging
        console.log("Booking data loaded:", {
          clientData: {
            id: String(booking.user_id),
            name:
              `${booking.user_firstName || ""} ${booking.user_lastName || ""}`.trim() ||
              booking.client_name ||
              "",
            email: booking.user_email || booking.client_email || "",
            phone: booking.user_contact || booking.client_phone || "",
            address: booking.user_address || booking.client_address || "",
          },
          eventDetails: {
            type: mappedEventType,
            title: booking.event_name || "",
            date: booking.event_date || "",
            capacity: parseInt(booking.guest_count) || 100,
            package: booking.package_id ? String(booking.package_id) : "",
            venueId: booking.venue_id ? String(booking.venue_id) : "",
          },
          packageId: booking.package_id,
          venueId: booking.venue_id,
        });

        // Apply client modifications (custom/removed inclusions, supplier services) if available
        try {
          const changesRaw = booking.component_changes || booking.notes || "";
          let parsed: any = null;
          if (typeof changesRaw === "string") {
            // Try direct JSON first
            try {
              parsed = JSON.parse(changesRaw);
            } catch (_) {
              // Fallback: extract after marker in notes
              const marker = "Component changes:";
              const idx = changesRaw.indexOf(marker);
              if (idx >= 0) {
                const jsonPart = changesRaw
                  .substring(idx + marker.length)
                  .trim();
                try {
                  parsed = JSON.parse(jsonPart);
                } catch (_) {}
              }
            }
          } else if (typeof changesRaw === "object") {
            parsed = changesRaw;
          }

          // Merge parsed changes into current components list
          if (parsed) {
            const removedIds = new Set(
              Array.isArray(parsed.removed_components)
                ? parsed.removed_components.map((x: any) => String(x))
                : []
            );
            const customList = Array.isArray(parsed.custom_components)
              ? parsed.custom_components
              : [];

            setComponents((prev) => {
              // Mark removed components as not included based on id/name
              const updated = prev.map((comp) => {
                const compKey = String(comp.id ?? comp.name ?? "");
                if (
                  removedIds.has(compKey) ||
                  removedIds.has(String((comp as any).originalId ?? ""))
                ) {
                  return { ...comp, included: false };
                }
                return comp;
              });

              // Add custom components
              const customComponents = customList.map((c: any) => ({
                id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: c.name || c.component_name || "Custom Item",
                description: c.description || c.component_description || "",
                price: Number(c.price || c.component_price || 0),
                category: c.category || "extras",
                included: true,
                isCustom: true,
                isRemovable: true,
                isExpanded: false,
              }));

              return [...updated, ...customComponents];
            });
          }
        } catch (e) {
          // Ignore parsing errors; proceed with base data
        }

        toast.success(
          `Booking ${refToUse} found and form fields populated! Step 1 (Package) and Step 2 (Client Details) have been pre-filled. You can now create an event from this booking.`
        );

        // Show a brief info message about unsaved changes
        setTimeout(() => {
          toast.info(
            "Form has been populated with booking data. Any changes you make will be tracked as unsaved changes."
          );
        }, 1000);
      } else {
        console.log("❌ API returned error or no booking:", response.data);

        // Check if booking was found but has wrong status
        if (response.data.booking_status) {
          toast.error(
            `Booking found but status is '${response.data.booking_status}'. Only confirmed bookings can be converted to events. Please confirm the booking first.`
          );
        } else {
          toast.error(response.data.message || "Booking not found.");
        }
      }
    } catch (error: any) {
      console.error("💥 Error looking up booking:", error);
      console.error("Error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      toast.error("Failed to lookup booking. Please try again.");
    } finally {
      setLookupLoading(false);
      // Add a small delay to ensure all state updates are complete before allowing dirty detection
      setTimeout(() => {
        setIsLoadingBookingData(false);
      }, 500);
    }
  };

  const searchBookings = async (searchTerm: string) => {
    // Remove the early return to allow empty search terms to show all confirmed bookings
    console.log("🔍 Searching bookings with term:", searchTerm);
    setBookingSearchLoading(true);
    try {
      const fullUrl = `${endpoints.admin}?operation=searchBookings&search=${encodeURIComponent(
        searchTerm.trim()
      )}`;

      console.log("🌐 Making request to:", fullUrl);

      const response = await axios.get(fullUrl);

      console.log("📡 API Response Status:", response.status);
      console.log("📡 API Response Data:", response.data);
      console.log("📡 API Response Headers:", response.headers);

      if (response.data && response.data.status === "success") {
        // Filter to only accepted (confirmed) and not-converted bookings per new flow
        const allResults = response.data.bookings || [];
        console.log("📋 All results from API:", allResults.length);
        console.log("📋 Sample booking:", allResults[0]);

        const filtered = allResults.filter((b: any) => {
          const status = (b.booking_status || b.status || "")
            .toString()
            .toLowerCase();
          const isConfirmed = status === "confirmed";
          const isConverted =
            Boolean(b.is_converted) ||
            status === "converted" ||
            Boolean(b.converted_event_id);

          console.log(
            `🔍 Booking ${b.booking_id}: status=${status}, isConfirmed=${isConfirmed}, isConverted=${isConverted}`
          );

          return isConfirmed && !isConverted;
        });

        console.log(
          "✅ Found accepted, not-converted bookings:",
          filtered.length
        );
        console.log("✅ Filtered bookings:", filtered);
        setBookingSearchResults(filtered);
      } else {
        console.log("❌ API Error:", response.data?.message || "Unknown error");
        console.log("❌ Full response:", response.data);
        setBookingSearchResults([]);
      }
    } catch (error: any) {
      console.error("💥 Network Error:", error);
      console.error("💥 Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      setBookingSearchResults([]);
    } finally {
      setBookingSearchLoading(false);
    }
  };

  const loadBookingData = (booking: any) => {
    // Set loading flag to prevent dirty detection during data loading
    setIsLoadingBookingData(true);

    // Parse the booking data and populate the form
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

    // Use the actual event type from booking, not hardcoded "birthday"
    const mappedEventType = mapEventType(
      booking.event_type_name || booking.event_type
    );

    // Populate client data - use correct field names from API response
    setClientData({
      id: booking.user_id?.toString() || "",
      name:
        `${booking.user_firstName || ""} ${booking.user_lastName || ""}`.trim() ||
        booking.client_name ||
        "",
      email: booking.user_email || booking.client_email || "",
      phone: booking.user_contact || booking.client_phone || "",
      address: booking.user_address || booking.client_address || "",
    });

    // Populate event details - use correct field names from API
    setEventDetails({
      type: mappedEventType,
      title: booking.event_name || "",
      date: booking.event_date || "",
      capacity: booking.guest_count || 100,
      notes: booking.notes || "",
      venue: booking.venue_name || "",
      package: booking.package_id?.toString() || "", // Use package ID, not name
      venueId: booking.venue_id?.toString() || "", // Add venue ID for auto-selection
      bookingReference: booking.booking_reference || "",
      theme: "", // Theme not available in booking data
    });

    // Set the selected event type for proper step navigation (prefer API name)
    setSelectedEventType(
      booking.event_type_name || booking.event_type || mappedEventType
    );

    // Ensure booking reference state is set so event creation marks it converted
    if (booking.booking_reference) {
      setBookingReference(String(booking.booking_reference));
    }

    // Set package and venue IDs if available
    if (booking.package_id) {
      console.log(
        "loadBookingData: Setting package ID from booking:",
        booking.package_id
      );
      setSelectedPackageId(booking.package_id.toString());
      // Trigger package selection to load venues and components
      setTimeout(() => {
        handlePackageSelect(booking.package_id.toString());
      }, 100);
    }
    if (booking.venue_id) {
      console.log(
        "loadBookingData: Setting venue ID from booking:",
        booking.venue_id
      );
      setSelectedVenueId(booking.venue_id.toString());
    }

    // Debug logging
    console.log("loadBookingData: Booking data loaded:", {
      clientData: {
        id: booking.user_id?.toString() || "",
        name:
          `${booking.user_firstName || ""} ${booking.user_lastName || ""}`.trim() ||
          booking.client_name ||
          "",
        email: booking.user_email || booking.client_email || "",
        phone: booking.user_contact || booking.client_phone || "",
        address: booking.user_address || booking.client_address || "",
      },
      eventDetails: {
        type: mappedEventType,
        title: booking.event_name || "",
        date: booking.event_date || "",
        capacity: booking.guest_count || 100,
        package: booking.package_id?.toString() || "",
        venueId: booking.venue_id?.toString() || "",
      },
      packageId: booking.package_id,
      venueId: booking.venue_id,
    });

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

    toast.success(
      `Successfully loaded booking: ${booking.event_name}. All fields have been populated.`
    );

    setShowBookingLookupModal(false);
    setCurrentStep(2); // Go to Client Details step - NEVER skip step 2

    // Add a small delay to ensure all state updates are complete before allowing dirty detection
    setTimeout(() => {
      setIsLoadingBookingData(false);
      // Show a brief info message about unsaved changes
      toast.info(
        "Form has been populated with booking data. Any changes you make will be tracked as unsaved changes."
      );
    }, 500);
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
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => {
                // Show booking lookup modal
                setShowBookingLookupModal(true);
              }}
              variant="outline"
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
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
              <div className="flex gap-3">
                <div className="flex-grow">
                  <Select
                    value={selectedEventType}
                    onValueChange={(value: string) => {
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
                <Button
                  onClick={() => {
                    if (selectedEventType) {
                      // Proceed with the selected event type
                      toast.success(`You've selected: ${selectedEventType}`);
                    } else {
                      toast.error(
                        "You need to select an event type to continue"
                      );
                    }
                  }}
                  className="bg-[#028A75] hover:bg-[#027A65] text-white"
                >
                  Select Event Type
                </Button>
              </div>
            </div>
          </div>

          <PackageSelection
            eventType={selectedEventType || eventDetails.type}
            onSelect={handlePackageSelect}
            initialPackageId={selectedPackageId}
          />
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
                onUpdate={(data) => {
                  console.log(
                    "📥 Event Builder received wedding form data:",
                    data
                  );
                  console.log("📥 Wedding form data keys:", Object.keys(data));
                  console.log("📥 Has bride name:", !!data.bride_name);
                  console.log("📥 Has groom name:", !!data.groom_name);
                  setWeddingFormData(data);
                }}
                onNext={() => {
                  // Validate wedding form data before proceeding
                  if (
                    !weddingFormData.bride_name ||
                    !weddingFormData.groom_name
                  ) {
                    toast.error("Bride and groom names are required");
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
              toast.error("Event title is required");
              return;
            }

            if (!eventDetails.date) {
              toast.error("Event date is required");
              return;
            }

            if (!eventDetails.capacity || eventDetails.capacity <= 0) {
              toast.error("Guest count must be greater than 0");
              return;
            }

            if (!eventDetails.theme) {
              toast.error("Event theme is required");
              return;
            }

            // Check for scheduling conflicts
            if (eventDetails.hasConflicts) {
              console.log("Scheduling conflicts detected");

              // Enhanced conflict messaging based on business rules
              if (eventDetails.type === "wedding") {
                toast.error(
                  "Weddings have special scheduling rules. Only one wedding is allowed per day, and weddings cannot be scheduled alongside other events."
                );
              } else {
                toast.error(
                  "There are scheduling conflicts with your selected date. Please resolve them before proceeding."
                );
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
          venueBufferFee={venueBufferFee}
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
          selectedPackageId={selectedPackageId}
          venueBufferFee={venueBufferFee}
          originalPackagePrice={originalPackagePrice}
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
                          {formatCurrency(calculateEventSummaryTotal())}
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
                    <span>Venue Inclusions Total</span>
                    <span className="font-medium">
                      {formatCurrency(calculateVenueInclusionsTotal())}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Components Price</span>
                    <span className="font-medium">
                      {formatCurrency(calculateNoreenComponentsTotal())}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Budget</span>
                      <span className="text-brand-600">
                        {formatCurrency(totalBudget)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    * Venue inclusions and Noreen components are calculated
                    separately
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
          totalBudget={calculateEventSummaryTotal()}
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
      capacity: 50,
      theme: "",
      notes: "",
      description: "",
      startTime: "",
      endTime: "",
      venue: "",
      package: "",
    });

    setComponents([]);
    setSelectedPackageId(null);
    setSelectedVenueId(null);
    setSelectedVenue(null);
    setOriginalPackagePrice(null);
    setVenueBufferFee(null);
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
      eventId: `EV-${generateStableId("event").slice(-4).padStart(4, "0")}`,
    });

    // Reset step to first step
    setCurrentStep(1);
  };

  return (
    <div className="container mx-auto py-6 lg:py-8 space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Event Builder
          </h1>
          {isFormDirty && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Auto-saving...
            </div>
          )}
        </div>
        {bookingId && (
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm font-medium">
            Booking: {bookingId}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
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
            disableNext={false}
            isValid={(stepId: string) => {
              try {
                switch (stepId) {
                  case "package-selection":
                    return !!selectedPackageId || true; // Allow start from scratch
                  case "client-details":
                    return !!clientData.id;
                  case "event-details":
                    return (
                      !!eventDetails.title &&
                      !!eventDetails.date &&
                      !!eventDetails.type &&
                      !!eventDetails.theme &&
                      (eventDetails.capacity || 0) > 0
                    );
                  case "venue-selection":
                    return !!selectedVenueId || !selectedPackageId; // Allow no venue for start from scratch
                  case "payment": {
                    const total =
                      parseFloat(calculateEventSummaryTotal().toString()) || 0;
                    const method = paymentData.downPaymentMethod;
                    // Simplified validation - no file attachments required
                    const refOk =
                      method === "cash" ||
                      (paymentData.referenceNumber || "").trim().length > 0;
                    return total > 0 && refOk && !!method;
                  }
                  default:
                    return true;
                }
              } catch {
                return true;
              }
            }}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-6 sticky top-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold tracking-tight mb-4 pb-3 border-b">
                Event Summary
              </h3>
              <div className="space-y-4">
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

                {/* Detailed Budget Breakdown */}
                {selectedPackageId && originalPackagePrice && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">
                      Budget Breakdown
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Package Price:
                        </span>
                        <span className="font-medium">
                          {formatCurrency(originalPackagePrice)}
                        </span>
                      </div>
                      {venueBufferFee && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Venue Buffer (included):
                          </span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(venueBufferFee)}
                          </span>
                        </div>
                      )}
                      {selectedVenue &&
                        venueBufferFee &&
                        (() => {
                          const venueRate =
                            parseFloat(selectedVenue.extra_pax_rate || 0) || 0;
                          const clientPax = eventDetails.capacity || 100;
                          const actualVenueCost = venueRate * clientPax;
                          const excessPayment = Math.max(
                            0,
                            actualVenueCost - venueBufferFee
                          );

                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Actual Venue Cost:
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(actualVenueCost)}
                                </span>
                              </div>
                              {excessPayment > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Excess Payment:
                                  </span>
                                  <span className="font-medium text-orange-600">
                                    +{formatCurrency(excessPayment)}
                                  </span>
                                </div>
                              )}
                              {excessPayment === 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Excess Payment:
                                  </span>
                                  <span className="font-medium text-green-600">
                                    ₱0 (covered by buffer)
                                  </span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      {/* Show custom components if any */}
                      {(() => {
                        let customComponentsTotal = 0;
                        components.forEach((component: any) => {
                          if (
                            component.category !== "venue" &&
                            component.category !== "package" &&
                            component.included !== false
                          ) {
                            const componentPrice =
                              Number(
                                component.supplierPrice ?? component.price ?? 0
                              ) || 0;
                            customComponentsTotal += componentPrice;
                          }
                        });
                        return customComponentsTotal > 0 ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Custom Components:
                            </span>
                            <span className="font-medium">
                              +{formatCurrency(customComponentsTotal)}
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
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

            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/admin/events")}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleClearForm}
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
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
                      loadAllConfirmedBookings();
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
            <Button onClick={() => setShowBookingLookupModal(false)}>
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
              className="w-full"
            >
              View Event Calendar
            </Button>
            <Button
              onClick={() => {
                setShowCompletionModal(false);
              }}
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
          venueBufferFee,
          selectedOrganizers,
          paymentData,
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
