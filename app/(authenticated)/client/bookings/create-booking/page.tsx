"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ResponsiveCalendar from "./ResponsiveCalendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import { endpoints, api } from "@/app/config/api";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import ComponentsStep from "./ComponentsStep";
import InclusionsStep from "./InclusionsStep";
import {
  Calendar as CalendarIcon,
  Users,
  MapPin,
  Package,
  Heart,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Eye,
  RefreshCw,
  DollarSign,
  Gift,
  Star,
  Info,
  X,
  Check,
  ListPlus,
  Layers,
  CreditCard,
} from "lucide-react";

// Types for the booking process
interface BookingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

interface EventType {
  event_type_id: number;
  event_name: string;
  event_description: string | null;
}

interface Component {
  component_id: number;
  component_name: string;
  component_description: string | null;
  component_price: number;
  display_order: number;
}

interface Inclusion {
  inclusion_id: number | string;
  inclusion_name: string;
  inclusion_description: string | null;
  inclusion_price: number;
  display_order: number;
  is_supplier_service?: boolean;
  supplier_id?: number;
  supplier_name?: string;
  is_venue_inclusion?: boolean;
  included?: boolean;
  category?: string;
  isRemovable?: boolean;
}

interface CustomInclusion {
  name: string;
  description: string;
  price: number;
  is_external: boolean;
}

interface Package {
  package_id: number;
  package_title: string;
  package_description: string;
  package_price: number;
  guest_capacity: number;
  event_type_names: string[];
  components: Array<{
    component_name: string;
    component_price: number;
  }>;
  freebies: Array<{
    freebie_name: string;
    freebie_description: string;
    freebie_value: number;
  }>;
  venue_previews?: Array<{
    venue_id: number;
    venue_title: string;
    venue_location: string;
    venue_capacity: number;
    venue_price: number;
    venue_profile_picture: string | null;
    venue_cover_photo: string | null;
    extra_pax_rate?: number;
  }>;
  inclusions?: Inclusion[];
}

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_details: string | null;
  venue_location: string;
  venue_capacity: number;
  venue_price: number;
  venue_profile_picture: string | null;
  venue_cover_photo: string | null;
  extra_pax_rate?: number;
  venue_name?: string;
  inclusions?: Array<{
    inclusion_id: number;
    inclusion_name: string;
    inclusion_description?: string;
  }>;
}

interface BookingFormData {
  eventType: string;
  eventName: string;
  eventDate: string;
  guestCount: number;
  packageId: number | null;
  venueId: number | null;
  notes: string;
  startTime: string;
  endTime: string;
  // Inclusions
  inclusions: Inclusion[];
  customInclusions: Inclusion[];
  removedInclusions: Inclusion[];
  supplierServices: Inclusion[];
  externalCustomizations: CustomInclusion[];
}

interface CalendarConflictData {
  [date: string]: {
    hasWedding: boolean;
    hasOtherEvents: boolean;
    eventCount: number;
    events: Array<{
      event_type_id: number;
      event_type_name: string;
      count: number;
    }>;
  };
}

interface ConflictingEvent {
  event_id: number;
  event_title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type_name: string;
  client_name: string;
  venue_name: string;
}

// Add proper type for the Day component props
interface DayProps {
  date: Date;
  [key: string]: any;
}

export default function EnhancedCreateBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPackageId = searchParams.get("package");
  const preselectedEventType = searchParams.get("eventType");
  const isEditMode = searchParams.get("edit") === "true";
  const isPrefilledPackage = Boolean(preselectedPackageId);

  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data state
  const [formData, setFormData] = useState<BookingFormData>({
    eventType: "",
    eventName: "",
    eventDate: "",
    guestCount: 100,
    packageId: preselectedPackageId ? parseInt(preselectedPackageId) : null,
    venueId: null,
    notes: "",
    startTime: "12:00",
    endTime: "17:00",
    // Inclusions
    inclusions: [],
    customInclusions: [],
    removedInclusions: [],
    supplierServices: [],
    externalCustomizations: [],
  });

  // Data fetching state
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [packageEventTypeFilter, setPackageEventTypeFilter] =
    useState<string>("all");
  const venueCarouselRef = useRef<HTMLDivElement | null>(null);
  const [currentVenueIndex, setCurrentVenueIndex] = useState(0);

  const scrollVenueCarousel = (direction: number) => {
    const container = venueCarouselRef.current;
    if (!container) return;
    const card = container.querySelector<HTMLDivElement>(".venue-card-width");
    const scrollBy = card
      ? card.offsetWidth
      : Math.floor(container.clientWidth * 0.8);
    container.scrollBy({ left: direction * scrollBy, behavior: "smooth" });
  };

  // Handle scroll to update current venue index
  const handleCarouselScroll = () => {
    const container = venueCarouselRef.current;
    if (!container || !modalPackage?.venue_previews) return;

    const scrollLeft = container.scrollLeft;
    const cardWidth = container.clientWidth;
    const newIndex = Math.round(scrollLeft / cardWidth);

    if (
      newIndex !== currentVenueIndex &&
      newIndex >= 0 &&
      newIndex < modalPackage.venue_previews.length
    ) {
      setCurrentVenueIndex(newIndex);
    }
  };
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [decideLater, setDecideLater] = useState(false);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);

  // Payment state
  const [paymentSettings, setPaymentSettings] = useState({
    gcash_name: "",
    gcash_number: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
    payment_instructions: "",
  });

  // Components and inclusions state
  const [availableComponents, setAvailableComponents] = useState<Component[]>(
    []
  );
  const [availableInclusions, setAvailableInclusions] = useState<Inclusion[]>(
    []
  );
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [loadingInclusions, setLoadingInclusions] = useState(false);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  // Local state for guest count input to allow free typing
  const [guestCountInput, setGuestCountInput] = useState<string>(
    formData.guestCount.toString()
  );

  // Edit mode state
  const [editBookingData, setEditBookingData] = useState<any>(null);
  const [isEditModeLoaded, setIsEditModeLoaded] = useState(false);

  // Calendar and conflict checking state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarConflictData, setCalendarConflictData] =
    useState<CalendarConflictData>({});
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [conflictingEvents, setConflictingEvents] = useState<
    ConflictingEvent[]
  >([]);

  // Sync guestCountInput when formData.guestCount changes
  useEffect(() => {
    setGuestCountInput(formData.guestCount.toString());
  }, [formData.guestCount]);

  // Load edit data if in edit mode
  useEffect(() => {
    if (isEditMode && !isEditModeLoaded) {
      const editData = localStorage.getItem("editBookingData");
      if (editData) {
        try {
          const parsedData = JSON.parse(editData);
          setEditBookingData(parsedData);

          // Pre-fill form data
          setFormData((prev) => ({
            ...prev,
            eventType: parsedData.eventType || "",
            eventName: parsedData.eventName || "",
            eventDate: parsedData.eventDate || "",
            guestCount: parsedData.guestCount || 100,
            packageId: parsedData.packageId || null,
            venueId: parsedData.venueId || null,
            notes: parsedData.notes || "",
            startTime: parsedData.eventTime
              ? parsedData.eventTime.split(":")[0] +
                ":" +
                parsedData.eventTime.split(":")[1]
              : "12:00",
          }));

          setIsEditModeLoaded(true);
        } catch (error) {
          console.error("Error parsing edit data:", error);
        }
      }
    }
  }, [isEditMode, isEditModeLoaded]);

  // Helper function to get proper image URL - matches admin implementation
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath || imagePath.trim() === "")
      return `${endpoints.client.replace("/client.php", "/serve-image.php")}?path=${encodeURIComponent("uploads/user_profile/default_pfp.png")}`;

    // If already a full URL, return as is
    if (imagePath.startsWith("http")) return imagePath;

    // Handle case where imagePath might be a JSON object instead of just a file path
    let actualPath = imagePath;
    try {
      const parsed = JSON.parse(imagePath);
      if (parsed && typeof parsed === "object") {
        if (parsed.filename) {
          actualPath = parsed.filename;
        } else if (parsed.filePath) {
          actualPath = parsed.filePath;
        } else if (parsed.path) {
          actualPath = parsed.path;
        }
      }
    } catch (e) {
      // If parsing fails, it's not JSON, so use the original path
      actualPath = imagePath;
    }

    // Ensure the path starts with uploads/ if it doesn't already
    if (!actualPath.startsWith("uploads/") && !actualPath.startsWith("http")) {
      actualPath = `uploads/${actualPath}`;
    }

    // Use the PHP serve-image endpoint
    return `${endpoints.client.replace("/client.php", "/serve-image.php")}?path=${encodeURIComponent(actualPath)}`;
  };

  // Client info state
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [userId, setUserId] = useState<number | null>(null);

  // Booking success state
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState<string | null>(null);

  // Modal states for venue and package details
  const [venueDetailsModalOpen, setVenueDetailsModalOpen] = useState(false);
  const [venueDetailsLoading, setVenueDetailsLoading] = useState(false);
  const [modalVenue, setModalVenue] = useState<Venue | null>(null);
  const [packageDetailsModalOpen, setPackageDetailsModalOpen] = useState(false);
  const [modalPackage, setModalPackage] = useState<Package | null>(null);

  // Helper function to format price with proper formatting (handles string or number)
  const formatPrice = (amount: number | string): string => {
    const numericValue =
      typeof amount === "number"
        ? amount
        : Number(String(amount).replace(/[^0-9.-]/g, ""));
    if (!isFinite(numericValue)) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  };

  // Extra pax rate helpers and calculations
  const getExtraPaxRate = (
    venue?: { extra_pax_rate?: number | string } | null
  ): number => {
    const raw = venue?.extra_pax_rate ?? selectedVenue?.extra_pax_rate;
    const parsed = typeof raw === "string" ? Number(raw) : raw;
    return Number.isFinite(parsed as number) && (parsed as number) > 0
      ? (parsed as number)
      : 350; // fallback default
  };

  // Calculate total with venue-specific extra pax rate when guests > 100
  const calculateTotalPackagePrice = (
    packagePrice?: number,
    guestCount?: number,
    venueForRate?: Venue | null
  ): number => {
    const baseRaw = packagePrice ?? selectedPackage?.package_price ?? 0;
    const basePrice = typeof baseRaw === "string" ? Number(baseRaw) : baseRaw;
    const guests = Number.isFinite(guestCount as number)
      ? (guestCount as number)
      : formData.guestCount;
    const rate = getExtraPaxRate(venueForRate ?? selectedVenue ?? null);
    const extras = guests > 100 ? (guests - 100) * rate : 0;
    const totalPrice = (Number(basePrice) || 0) + (Number(extras) || 0);
    return Number.isFinite(totalPrice) && totalPrice > 0 ? totalPrice : 0;
  };

  // Estimate venue-specific price with extra pax
  const computeVenueEstimatedPrice = (
    venue: { venue_price: number | string; extra_pax_rate?: number | string },
    guests: number
  ): number => {
    const base =
      typeof venue.venue_price === "string"
        ? Number(venue.venue_price)
        : venue.venue_price;
    const safeBase = Number.isFinite(base) ? (base as number) : 0;
    const rate = getExtraPaxRate(venue);
    const extras = guests > 100 ? (guests - 100) * rate : 0;
    const total = safeBase + extras;
    return Number.isFinite(total) ? total : 0;
  };

  // Overall estimate: package total (with extra pax) + venue total (with extra pax)
  const computeOverallEstimate = (): number => {
    const packageTotal = calculateTotalPackagePrice(
      selectedPackage?.package_price,
      formData.guestCount,
      selectedVenue
    );
    const venueTotal = selectedVenue
      ? computeVenueEstimatedPrice(selectedVenue, formData.guestCount)
      : 0;
    return packageTotal + venueTotal;
  };

  // Steps configuration - with venue selection before inclusions
  const steps: BookingStep[] = [
    {
      id: 1,
      title: "Package Selection",
      description: "Choose your package",
      completed: false,
    },
    {
      id: 2,
      title: "Event Details",
      description: "Basic event information",
      completed: false,
    },
    {
      id: 3,
      title: "Venue Selection",
      description: "Select your venue",
      completed: false,
    },
    {
      id: 4,
      title: "Inclusions",
      description: "Customize inclusions",
      completed: false,
    },
    {
      id: 5,
      title: "Review & Confirm",
      description: "Review your booking",
      completed: false,
    },
    {
      id: 6,
      title: "Payment Information",
      description: "View payment options",
      completed: false,
    },
  ];

  // Initialize client info and load data
  useEffect(() => {
    initializeClientInfo();
    fetchEventTypes();
    fetchPackages();
  }, []);

  // Load package details if preselected from URL
  useEffect(() => {
    if (preselectedPackageId && packages.length > 0) {
      const preId = Number(preselectedPackageId);
      const packageData = packages.find((p) => Number(p.package_id) === preId);
      if (packageData) {
        setSelectedPackage(packageData);
        // Auto-populate packageId and eventType (fallback to details if missing)
        const firstEventType =
          Array.isArray(packageData.event_type_names) &&
          packageData.event_type_names.length > 0
            ? packageData.event_type_names[0]
            : "";
        setFormData((prev) => ({
          ...prev,
          packageId: Number(packageData.package_id),
          eventType: preselectedEventType || firstEventType,
        }));
        // Also set the Step 1 event type filter to match the selected package
        if (preselectedEventType || firstEventType) {
          setPackageEventTypeFilter(preselectedEventType || firstEventType);
        }
        // If event types are missing on the list payload, fetch details to fill them
        if (!firstEventType) {
          axios
            .get(`${endpoints.client}`, {
              params: {
                operation: "getPackageDetails",
                package_id: Number(packageData.package_id),
              },
            })
            .then((res) => {
              const detailPkg = res?.data?.package;
              const eventNames = Array.isArray(detailPkg?.event_type_names)
                ? detailPkg.event_type_names
                : [];
              if (eventNames.length > 0) {
                setSelectedPackage((prevSel) =>
                  prevSel
                    ? { ...prevSel, event_type_names: eventNames }
                    : prevSel
                );
                setFormData((prev) => ({
                  ...prev,
                  eventType: preselectedEventType || eventNames[0],
                }));
                setPackageEventTypeFilter(
                  preselectedEventType || eventNames[0]
                );
              }
            })
            .catch(() => {});
        }
        // Load dependent data (venues, inclusions) without auto-advancing the step
        try {
          fetchVenues(Number(packageData.package_id));
          fetchPackageInclusions(Number(packageData.package_id));
        } catch (e) {
          console.warn("Preselect: failed to prefetch venues/inclusions", e);
        }
      }
    }
  }, [preselectedPackageId, preselectedEventType, packages]);

  // Load package details if selected from dashboard (localStorage)
  useEffect(() => {
    const storedPackage =
      typeof window !== "undefined"
        ? localStorage.getItem("selectedPackage")
        : null;
    if (storedPackage && packages.length > 0 && !preselectedPackageId) {
      try {
        const pkg = JSON.parse(storedPackage);
        const packageData = packages.find(
          (p) => Number(p.package_id) === Number(pkg.package_id)
        );
        if (packageData) {
          setSelectedPackage(packageData);
          // Auto-populate packageId and eventType
          const firstEventType =
            Array.isArray(packageData.event_type_names) &&
            packageData.event_type_names.length > 0
              ? packageData.event_type_names[0]
              : "";
          setFormData((prev) => ({
            ...prev,
            packageId: Number(packageData.package_id),
            eventType: firstEventType,
          }));
          // Set the Step 1 event type filter
          if (firstEventType) {
            setPackageEventTypeFilter(firstEventType);
          }
          // Load dependent data
          fetchVenues(Number(packageData.package_id));
          fetchPackageInclusions(Number(packageData.package_id));
        }
        // Clear the localStorage after loading
        if (typeof window !== "undefined") {
          localStorage.removeItem("selectedPackage");
        }
      } catch (e) {
        console.error("Error parsing stored package", e);
        if (typeof window !== "undefined") {
          localStorage.removeItem("selectedPackage");
        }
      }
    }
  }, [packages, preselectedPackageId]);

  // No longer needed - we're focusing on inclusions

  // Reset modal only when leaving step 3
  useEffect(() => {
    if (currentStep !== 3) {
      setVenueDetailsModalOpen(false);
      setModalVenue(null);
    }
  }, [currentStep]);

  // Ensure inclusions are loaded whenever Step 4 is shown
  useEffect(() => {
    if (
      currentStep === 4 &&
      formData.packageId !== null &&
      formData.inclusions.length === 0
    ) {
      fetchPackageInclusions(formData.packageId);
    }
  }, [currentStep, formData.packageId]);

  // Initialize client information
  const initializeClientInfo = () => {
    let userData = null;
    try {
      if (typeof window !== "undefined") {
        userData = window.localStorage.getItem("user");

        if (userData && userData.startsWith("U2FsdGVkX1")) {
          try {
            const secureStorage =
              require("@/app/utils/encryption").secureStorage;
            userData = secureStorage.getItem("user");
          } catch (decryptErr) {
            console.error("Error decrypting user data:", decryptErr);
            userData = null;
          }
        } else if (userData) {
          userData = JSON.parse(userData);
        }
      }
    } catch (err) {
      console.error("Error accessing localStorage:", err);
      userData = null;
    }

    if (!userData) {
      try {
        const secureStorage = require("@/app/utils/encryption").secureStorage;
        userData = secureStorage.getItem("user");
      } catch (err) {
        console.error("Error accessing secureStorage:", err);
      }
    }

    if (userData?.user_id) {
      setUserId(Number(userData.user_id));
      setClientInfo(userData);
    } else {
      setClientInfo(null);
    }
  };

  // Fetch event types
  const fetchEventTypes = async () => {
    setLoadingEventTypes(true);
    try {
      const response = await axios.get(`${endpoints.client}`, {
        params: { operation: "getEventTypes" },
      });

      if (response.data.status === "success") {
        setEventTypes(response.data.event_types || []);
        console.log("Event types loaded:", response.data.event_types);
      } else {
        console.error("Failed to fetch event types:", response.data.message);
        setError("Failed to load event types");
      }
    } catch (err) {
      console.error("Error fetching event types:", err);
      setError("Failed to load event types");
    } finally {
      setLoadingEventTypes(false);
    }
  };

  // Fetch packages
  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${endpoints.client}`, {
        params: { operation: "getAllPackages" },
      });

      if (response.data.status === "success") {
        setPackages(response.data.packages || []);
      }
    } catch (err) {
      console.error("Error fetching packages:", err);
      setError("Failed to load packages");
    }
  };

  // Fetch venues based on package selection
  const fetchVenues = async (packageId: number | null = null) => {
    try {
      let response;
      if (packageId) {
        response = await axios.get(`${endpoints.client}`, {
          params: {
            operation: "getVenuesByPackage",
            package_id: packageId,
            event_date: formData.eventDate,
            guest_count: formData.guestCount,
          },
        });
      } else {
        response = await axios.get(`${endpoints.client}`, {
          params: {
            operation: "getAvailableVenues",
            event_type_id: getEventTypeId(formData.eventType),
            event_date: formData.eventDate,
            guest_count: formData.guestCount,
          },
        });
      }

      if (response.data.status === "success") {
        const baseVenues: Venue[] = response.data.venues || [];
        // Enrich with extra_pax_rate if missing by fetching details in parallel
        let enrichedVenues: Venue[] = await Promise.all(
          baseVenues.map(async (v) => {
            if (typeof v.extra_pax_rate === "number") return v;
            try {
              const detailsRes = await fetch(
                `${endpoints.admin}?operation=getVenueById&venue_id=${encodeURIComponent(
                  v.venue_id
                )}`
              );
              const detailsData = await detailsRes.json();
              const rate = detailsData?.venue?.extra_pax_rate;
              if (typeof rate === "number") {
                return { ...v, extra_pax_rate: rate } as Venue;
              }
            } catch {}
            return v;
          })
        );

        // Ensure all package-linked venues are present (some APIs may filter by date/guest_count)
        if (
          packageId &&
          selectedPackage &&
          selectedPackage.package_id === packageId &&
          Array.isArray(selectedPackage.venue_previews)
        ) {
          const currentIds = new Set(enrichedVenues.map((v) => v.venue_id));
          const missingPreviews = selectedPackage.venue_previews.filter(
            (vp) => !currentIds.has(vp.venue_id)
          );

          if (missingPreviews.length > 0) {
            const fetchedMissing = await Promise.all(
              missingPreviews.map(async (vp) => {
                try {
                  const res = await fetch(
                    `${endpoints.admin}?operation=getVenueById&venue_id=${encodeURIComponent(
                      vp.venue_id
                    )}`
                  );
                  const data = await res.json();
                  const venue = data?.venue;
                  if (venue) {
                    return {
                      venue_id: venue.venue_id,
                      venue_title: venue.venue_title,
                      venue_details: venue.venue_details ?? null,
                      venue_location: venue.venue_location,
                      venue_capacity: Number(venue.venue_capacity) || 0,
                      venue_price: Number(venue.venue_price) || 0,
                      venue_profile_picture:
                        venue.venue_profile_picture ?? null,
                      venue_cover_photo: venue.venue_cover_photo ?? null,
                      extra_pax_rate:
                        typeof venue.extra_pax_rate === "number"
                          ? venue.extra_pax_rate
                          : undefined,
                      inclusions: Array.isArray(venue.inclusions)
                        ? venue.inclusions
                        : [],
                    } as Venue;
                  }
                } catch {}
                // Fallback to the preview data shape
                return {
                  venue_id: vp.venue_id,
                  venue_title: vp.venue_title,
                  venue_details: null,
                  venue_location: vp.venue_location,
                  venue_capacity: vp.venue_capacity,
                  venue_price: vp.venue_price,
                  venue_profile_picture: vp.venue_profile_picture ?? null,
                  venue_cover_photo: vp.venue_cover_photo ?? null,
                } as Venue;
              })
            );
            enrichedVenues = [...enrichedVenues, ...fetchedMissing];
          }
        }

        setVenues(enrichedVenues);
        // Auto-select the only venue when a package is preselected and exactly one venue is available
        if (
          isPrefilledPackage &&
          enrichedVenues.length === 1 &&
          !formData.venueId
        ) {
          const onlyVenue = enrichedVenues[0];
          setFormData((prev) => ({ ...prev, venueId: onlyVenue.venue_id }));
          setSelectedVenue(onlyVenue);
        }
      }
    } catch (err) {
      console.error("Error fetching venues:", err);
      setError("Failed to load venues");
    }
  };

  // Load calendar conflict data
  const loadCalendarConflictData = useCallback(async (targetDate: Date) => {
    try {
      const startDate = format(startOfMonth(targetDate), "yyyy-MM-dd");
      const endDate = format(endOfMonth(targetDate), "yyyy-MM-dd");

      const response = await axios.post(`${endpoints.client}`, {
        operation: "getCalendarConflictData",
        start_date: startDate,
        end_date: endDate,
      });

      if (response.data.status === "success") {
        setCalendarConflictData(response.data.calendarData || {});
      }
    } catch (error) {
      console.error("Error loading calendar data:", error);
    }
  }, []);

  // Check for event conflicts - updated to only check date, not time
  const checkForConflicts = useCallback(async () => {
    if (!formData.eventDate) return;

    setIsCheckingConflicts(true);
    try {
      const response = await axios.post(`${endpoints.client}`, {
        operation: "checkEventDateConflicts",
        event_date: formData.eventDate,
      });

      if (response.data.status === "success") {
        setHasConflicts(response.data.hasConflicts || false);
        setConflictingEvents(response.data.conflicts || []);
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
    } finally {
      setIsCheckingConflicts(false);
    }
  }, [formData.eventDate]);

  // Recalculate total price when relevant factors change
  useEffect(() => {
    // Calculate base package price
    let calculatedPrice = calculateTotalPackagePrice();

    // Subtract removed inclusions
    const removedInclusionsTotal = formData.removedInclusions.reduce(
      (sum, inc) => sum + parseFloat(inc.inclusion_price as any),
      0
    );

    // Add custom inclusion prices
    const customInclusionsTotal = formData.customInclusions.reduce(
      (sum, inc) => sum + parseFloat(inc.inclusion_price as any),
      0
    );

    // Add supplier service prices
    const supplierServicesTotal = formData.supplierServices.reduce(
      (sum, service) => sum + parseFloat(service.inclusion_price as any),
      0
    );

    // Add external customization prices
    const externalCustomizationsTotal = formData.externalCustomizations.reduce(
      (sum, custom) => sum + parseFloat(custom.price as any),
      0
    );

    // Calculate final price
    calculatedPrice =
      calculatedPrice -
      removedInclusionsTotal +
      customInclusionsTotal +
      supplierServicesTotal +
      externalCustomizationsTotal;

    setTotalPrice(calculatedPrice);
  }, [
    formData.guestCount,
    formData.customInclusions,
    formData.removedInclusions,
    formData.supplierServices,
    formData.externalCustomizations,
    selectedPackage,
  ]);

  // Handle date selection
  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;

    // Prevent selection of past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      toast({
        title: "Invalid Date",
        description: "Please select a future date for your event.",
        variant: "destructive",
      });
      return;
    }

    setSelectedDate(date);
    const formattedDate = format(date, "yyyy-MM-dd");
    setFormData((prev) => ({ ...prev, eventDate: formattedDate }));

    // Load calendar data for the selected month immediately
    await loadCalendarConflictData(date);

    // Check for conflicts immediately
    await checkForConflicts();

    // Fetch venues if needed
    if (currentStep === 3) {
      await fetchVenues(formData.packageId);
    }

    setCalendarOpen(false);
  };

  // Get event type ID from name
  const getEventTypeId = (eventTypeName: string) => {
    const eventType = eventTypes.find(
      (et) => et.event_name.toLowerCase() === eventTypeName.toLowerCase()
    );
    return eventType ? eventType.event_type_id : 1;
  };

  // Get heat map color based on conflicts
  const getHeatMapColor = (eventCount: number, hasWedding: boolean) => {
    if (hasWedding) return "bg-red-500 text-white";
    if (eventCount === 0)
      return "bg-transparent text-gray-900 hover:bg-gray-50";
    if (eventCount === 1) return "bg-yellow-200 text-gray-900";
    if (eventCount === 2) return "bg-orange-300 text-gray-900";
    if (eventCount >= 3) return "bg-red-300 text-gray-900";
    return "bg-transparent text-gray-900 hover:bg-gray-50";
  };

  // Update inclusions when venue changes - following admin implementation
  useEffect(() => {
    // When a venue is selected, check if it has inclusions
    if (selectedVenue) {
      console.log(
        "Updating inclusions with venue-specific data:",
        selectedVenue.venue_title
      );

      // Add the venue itself as a component
      const venuePrice = parseFloat(String(selectedVenue.venue_price)) || 0;
      const extraPaxRate = parseFloat(
        String(selectedVenue.extra_pax_rate || 0)
      );
      const guestCount = formData.guestCount || 100;

      // Calculate venue price including overflow charges (matching admin implementation)
      let calculatedVenuePrice = venuePrice;
      if (extraPaxRate > 0 && guestCount > 100) {
        const extraGuests = guestCount - 100;
        const overflowCharge = extraGuests * extraPaxRate;
        calculatedVenuePrice += overflowCharge;
        console.log(
          `Venue overflow calculation: ${extraGuests} extra guests × ${extraPaxRate} = ${overflowCharge}`
        );
      }

      // Add venue as a main component
      const venueComponent = {
        inclusion_id: `venue-${selectedVenue.venue_id}`,
        inclusion_name:
          selectedVenue.venue_title ||
          selectedVenue.venue_name ||
          "Selected Venue",
        inclusion_description: `Venue: ${selectedVenue.venue_title || selectedVenue.venue_name}${extraPaxRate > 0 && guestCount > 100 ? " (includes overflow for " + (guestCount - 100) + " extra guests)" : ""}`,
        inclusion_price: calculatedVenuePrice,
        display_order: 0,
        category: "venue",
        is_venue_inclusion: true,
        included: true,
        isRemovable: false,
      };

      // Add venue component to custom inclusions
      let hasVenueComponent = false;
      setFormData((prev) => {
        // Check if venue already exists
        const existingVenue = prev.customInclusions.find(
          (inc) =>
            inc.inclusion_id.toString().startsWith("venue-") &&
            inc.is_venue_inclusion === true
        );

        if (existingVenue) {
          hasVenueComponent = true;
          // Update existing venue component
          const updatedCustomInclusions = prev.customInclusions.map((inc) =>
            inc.inclusion_id === existingVenue.inclusion_id
              ? venueComponent
              : inc
          );
          return {
            ...prev,
            customInclusions: updatedCustomInclusions,
          };
        } else {
          // Add new venue component
          return {
            ...prev,
            customInclusions: [...prev.customInclusions, venueComponent],
          };
        }
      });

      // Do not import venue inclusions into event inclusions
    }
    // Only depend on selectedVenue and guestCount, not on the data we're updating
  }, [selectedVenue, formData.guestCount]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!clientInfo || !userId) {
      toast({
        title: "Authentication Error",
        description: "Please log in to create a booking",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const bookingData = {
        operation: isEditMode ? "updateBooking" : "createBooking",
        ...(isEditMode &&
          editBookingData && { booking_id: editBookingData.bookingId }),
        user_id: userId,
        event_type_id: getEventTypeId(formData.eventType),
        event_name: formData.eventName,
        event_date: formData.eventDate,
        start_time: formData.startTime,
        end_time: formData.endTime,
        guest_count: formData.guestCount,
        package_id: formData.packageId,
        venue_id: formData.venueId,
        notes: formData.notes,
        booking_status: "pending",
        // Inclusions data - keep track of all inclusions but mark their status
        custom_inclusions: formData.customInclusions.map((inc) => ({
          inclusion_id: inc.inclusion_id,
          is_included: !formData.removedInclusions.some(
            (removed) => removed.inclusion_id === inc.inclusion_id
          ),
        })),
        package_inclusions: formData.inclusions.map((inc) => ({
          inclusion_id: inc.inclusion_id,
          is_included: !formData.removedInclusions.some(
            (removed) => removed.inclusion_id === inc.inclusion_id
          ),
        })),
        // We still need to track which were explicitly removed
        removed_inclusions: formData.removedInclusions.map(
          (inc) => inc.inclusion_id
        ),
        supplier_services: formData.supplierServices.map((service) => ({
          service_id: service.inclusion_id,
          supplier_id: service.supplier_id,
          is_included: !formData.removedInclusions.some(
            (removed) => removed.inclusion_id === service.inclusion_id
          ),
        })),
        external_customizations: formData.externalCustomizations,
        total_price: totalPrice,
      };

      const response = await axios.post(`${endpoints.client}`, bookingData);

      if (response.data.status === "success") {
        const bookingId = response.data.booking_id;
        const bookingReference = response.data.booking_reference;

        toast({
          title: isEditMode
            ? "Booking Updated Successfully!"
            : "Booking Created Successfully!",
          description: isEditMode
            ? `Your booking has been updated successfully.`
            : `Your booking reference is: ${bookingReference}. You can now make a payment using the methods shown to reserve your slot.`,
        });

        // Clean up edit data if in edit mode
        if (isEditMode) {
          localStorage.removeItem("editBookingData");
          router.push("/client/bookings");
        } else {
          setBookingSuccess(true);
          setBookingReference(bookingReference);
        }
      } else {
        throw new Error(
          response.data.message ||
            `Failed to ${isEditMode ? "update" : "create"} booking`
        );
      }
    } catch (error: any) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} booking:`,
        error
      );
      toast({
        title: isEditMode ? "Update Failed" : "Booking Failed",
        description:
          error.message ||
          `Failed to ${isEditMode ? "update" : "create"} booking. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < steps.length) {
      // Reset modal state when changing steps
      setVenueDetailsModalOpen(false);
      setModalVenue(null);

      setCurrentStep(currentStep + 1);

      // Handle specific step transitions
      if (currentStep + 1 === 3) {
        // When moving to venue selection step, fetch venues
        fetchVenues(formData.packageId);
      } else if (currentStep + 1 === 4) {
        // When moving to inclusions step, make sure we have package inclusions if a package is selected
        if (formData.packageId && formData.inclusions.length === 0) {
          fetchPackageInclusions(formData.packageId);
        }
        // Do NOT merge venue inclusions into package inclusions per requirements
      } else if (currentStep + 1 === 6) {
        // When moving to payment step, fetch payment settings
        fetchPaymentSettings();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      // Reset modal state when changing steps
      setVenueDetailsModalOpen(false);
      setModalVenue(null);

      setCurrentStep(currentStep - 1);
    }
  };

  // Package selection handlers
  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    setDecideLater(false);
    setFormData((prev) => ({
      ...prev,
      packageId: pkg.package_id,
      eventType: pkg.event_type_names[0] || "", // Auto-populate event type
      // Reset inclusions when changing packages
      inclusions: [],
      customInclusions: [],
      removedInclusions: [],
      supplierServices: [],
      externalCustomizations: [],
    }));
    // Sync Step 1 filter with the selected package's event type
    if (pkg.event_type_names && pkg.event_type_names[0]) {
      setPackageEventTypeFilter(pkg.event_type_names[0]);
    }
    // Also fetch venues for this package
    fetchVenues(pkg.package_id);
    // Fetch package inclusions
    fetchPackageInclusions(pkg.package_id);
    console.log("Selected package and auto-populated:", {
      packageId: pkg.package_id,
      eventType: pkg.event_type_names[0],
    });
  };

  // Convert component to inclusion format
  const componentToInclusion = (component: any): Inclusion => {
    return {
      inclusion_id:
        component.component_id || Math.floor(Math.random() * 1000000),
      inclusion_name: component.component_name,
      inclusion_description: component.component_description || null,
      inclusion_price: Number(component.component_price || 0),
      display_order: component.display_order || 0,
      included: true,
    };
  };

  // Fetch payment settings
  const fetchPaymentSettings = async () => {
    try {
      const response = await axios.get(`${endpoints.client}`, {
        params: { operation: "getPaymentSettings" },
      });

      if (response.data.status === "success") {
        setPaymentSettings(
          response.data.payment_settings || {
            gcash_name: "",
            gcash_number: "",
            bank_name: "",
            bank_account_name: "",
            bank_account_number: "",
            payment_instructions: "",
          }
        );
      }
    } catch (err) {
      console.error("Error fetching payment settings:", err);
    }
  };

  // Fetch package inclusions
  const fetchPackageInclusions = async (packageId: number) => {
    setLoadingInclusions(true);
    try {
      // Primary: getPackageComponents (exists in API)
      const response = await axios.get(`${endpoints.client}`, {
        params: {
          operation: "getPackageComponents",
          package_id: packageId,
        },
      });

      if (response.data.status === "success") {
        const components =
          response.data.components || response.data.inclusions || [];
        if (Array.isArray(components) && components.length > 0) {
          const convertedInclusions = components.map(componentToInclusion);
          setFormData((prev) => ({
            ...prev,
            inclusions: convertedInclusions,
          }));
          return;
        }
      }

      // Fallback 1: getPackageDetails.components
      try {
        const detailsRes = await axios.get(`${endpoints.client}`, {
          params: { operation: "getPackageDetails", package_id: packageId },
        });
        const comps = detailsRes?.data?.package?.components;
        if (Array.isArray(comps) && comps.length > 0) {
          const convertedInclusions = comps.map(componentToInclusion);
          setFormData((prev) => ({
            ...prev,
            inclusions: convertedInclusions,
          }));
          return;
        }
      } catch {}

      // Fallback 2: selectedPackage.components already loaded in client
      if (selectedPackage?.components) {
        const convertedInclusions =
          selectedPackage.components.map(componentToInclusion);
        setFormData((prev) => ({
          ...prev,
          inclusions: convertedInclusions,
        }));
      }
    } catch (err) {
      console.error("Error fetching package inclusions:", err);
      // Fallback to using package components if available
      if (selectedPackage?.components) {
        const convertedInclusions =
          selectedPackage.components.map(componentToInclusion);
        setFormData((prev) => ({
          ...prev,
          inclusions: convertedInclusions,
        }));
      }
    } finally {
      setLoadingInclusions(false);
    }
  };

  // Package details modal handler
  const showPackageDetails = async (pkg: Package) => {
    setModalPackage(pkg);
    setPackageDetailsModalOpen(true);

    try {
      // Fetch venues for this package to show in the package details
      const response = await axios.get(`${endpoints.client}`, {
        params: {
          operation: "getVenuesByPackage",
          package_id: pkg.package_id,
        },
      });

      if (response.data.status === "success" && response.data.venues) {
        // Update the modal package with venue previews
        setModalPackage((prev) =>
          prev
            ? {
                ...prev,
                venue_previews: response.data.venues,
              }
            : pkg
        );
      }
    } catch (err) {
      console.error("Error fetching venue previews for package:", err);
    }
  };

  // Venue details modal handler - fetch details and inclusions using Axios
  const showVenueDetails = async (venue: Venue) => {
    try {
      setVenueDetailsModalOpen(true);
      setVenueDetailsLoading(true);
      // Fetch details and inclusions in parallel using Axios
      const [detailsRes, inclusionsRes] = await Promise.all([
        axios.get(endpoints.admin, {
          params: {
            operation: "getVenueById",
            venue_id: venue.venue_id,
          },
        }),
        axios.get(endpoints.client, {
          params: {
            operation: "getVenueInclusions",
            venue_id: venue.venue_id,
          },
        }),
      ]);

      const fetchedVenue = detailsRes.data?.venue || {};
      const inclusions = Array.isArray(inclusionsRes.data?.inclusions)
        ? inclusionsRes.data.inclusions
        : [];

      setModalVenue({
        ...venue,
        venue_details:
          fetchedVenue.venue_details ?? venue.venue_details ?? null,
        inclusions,
        extra_pax_rate:
          typeof fetchedVenue.extra_pax_rate === "number"
            ? fetchedVenue.extra_pax_rate
            : (venue.extra_pax_rate ?? undefined),
        venue_profile_picture:
          fetchedVenue.venue_profile_picture ??
          venue.venue_profile_picture ??
          null,
        venue_cover_photo:
          fetchedVenue.venue_cover_photo ?? venue.venue_cover_photo ?? null,
      });
    } catch (err) {
      console.error("Failed to load venue details", err);
      setModalVenue(venue);
    } finally {
      setVenueDetailsLoading(false);
    }
  };

  const handleDecideLater = () => {
    setDecideLater(true);
    setSelectedPackage(null);
    setFormData((prev) => ({
      ...prev,
      packageId: null,
      eventType: "", // Reset event type so user can choose manually
      // Reset all inclusions
      inclusions: [],
      customInclusions: [],
      removedInclusions: [],
      supplierServices: [],
      externalCustomizations: [],
    }));
    // Fetch all venues since no package is selected
    fetchVenues(null);
  };

  // Validation for each step
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return selectedPackage !== null || decideLater;
      case 2:
        // Check if all required fields are filled
        const isEventTypeValid = selectedPackage
          ? true // If package is selected, event type is auto-populated
          : Boolean(formData.eventType && formData.eventType.trim());
        const isEventNameValid = Boolean(
          formData.eventName && formData.eventName.trim()
        );
        const isEventDateValid = Boolean(formData.eventDate);
        const isGuestCountValid = formData.guestCount > 0;

        // Log validation state for debugging
        console.log("Step 2 Validation:", {
          isEventTypeValid,
          isEventNameValid,
          isEventDateValid,
          isGuestCountValid,
          hasConflicts,
          eventType: formData.eventType,
          eventName: formData.eventName,
          eventDate: formData.eventDate,
          guestCount: formData.guestCount,
        });

        return (
          isEventTypeValid &&
          isEventNameValid &&
          isEventDateValid &&
          isGuestCountValid &&
          !hasConflicts
        );
      case 3:
        // Venue selection step
        return formData.venueId !== null;
      case 4:
        // Inclusions step - always allow proceeding
        return true;
      default:
        return true;
    }
  };

  // If booking is successful, show success screen
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#028A75]/10 to-[#028A75]/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-[#028A75]/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-[#028A75]" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Booking Created Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                Your booking reference:
              </p>
              <p className="text-2xl font-bold text-[#028A75]">
                {bookingReference}
              </p>
            </div>
            <p className="text-gray-600">
              Your booking has been submitted and is pending confirmation. You
              will receive an email notification once it's confirmed.
            </p>
            <div className="flex flex-col gap-2 mt-6">
              <Button
                onClick={() => router.push("/client/bookings")}
                className="bg-[#028A75] hover:bg-[#028A75]/90"
              >
                View My Bookings
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/client/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-left mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create Your Event Booking
            </h1>
            <p className="text-gray-600">
              Follow the steps below to create your perfect event booking
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            {/* Mobile Progress Steps */}
            <div className="flex items-center px-4 md:px-6 md:hidden">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#028A75] text-white font-semibold">
                  {currentStep}
                </div>
                <div className="ml-4">
                  <div className="text-lg font-semibold text-gray-900">
                    Step {currentStep} - {steps[currentStep - 1].title}
                  </div>
                  <div className="text-sm text-gray-600">
                    {steps[currentStep - 1].description}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Progress Steps */}
            <div className="hidden md:flex items-center justify-between px-4 md:px-6">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center">
                    <div className="relative">
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-full font-semibold shrink-0",
                          currentStep === step.id
                            ? "bg-[#028A75] text-white"
                            : currentStep > step.id
                              ? "bg-[#028A75]/20 text-[#028A75]"
                              : "bg-gray-100 text-gray-400"
                        )}
                      >
                        {currentStep > step.id ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          step.id
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div
                        className={cn(
                          "text-base font-semibold",
                          currentStep === step.id
                            ? "text-gray-900"
                            : currentStep > step.id
                              ? "text-[#028A75]"
                              : "text-gray-400"
                        )}
                      >
                        {step.title}
                      </div>
                      <div
                        className={cn(
                          "text-sm",
                          currentStep === step.id
                            ? "text-gray-600"
                            : currentStep > step.id
                              ? "text-[#028A75]/60"
                              : "text-gray-400"
                        )}
                      >
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "w-24 mx-4 h-[2px]",
                        currentStep > step.id ? "bg-[#028A75]" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
            {/* Form Steps */}
            <div className="lg:col-span-3">
              <Card className="shadow-lg overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl animate-fadeIn">
                    {steps[currentStep - 1].title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-6">
                  {/* Step 1: Package Selection */}
                  {currentStep === 1 && (
                    <div className="space-y-6 animate-fadeSlideIn">
                      <div className="space-y-6">
                        <div className="text-center">
                          <h3 className="text-base sm:text-lg font-semibold mb-2 animate-fadeSlideIn animation-delay-150">
                            Choose Your Package
                          </h3>
                          <p className="text-sm sm:text-base text-gray-600 mb-6 animate-fadeSlideIn animation-delay-300">
                            Select from our curated event packages or decide
                            later
                          </p>
                        </div>

                        {/* Event type filter */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-2">
                          <div className="w-full sm:w-64">
                            <Label>Filter by Event Type</Label>
                            <Select
                              value={packageEventTypeFilter}
                              onValueChange={(value) =>
                                setPackageEventTypeFilter(value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="All event types">
                                  {packageEventTypeFilter === "all"
                                    ? "All event types"
                                    : packageEventTypeFilter}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  All event types
                                </SelectItem>
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(packageEventTypeFilter !== "all"
                            ? packages.filter((p) =>
                                Array.isArray(p.event_type_names)
                                  ? p.event_type_names.some(
                                      (n) =>
                                        n.toLowerCase() ===
                                        packageEventTypeFilter.toLowerCase()
                                    )
                                  : false
                              )
                            : packages
                          ).map((pkg, index) => (
                            <Card
                              key={pkg.package_id}
                              className={cn(
                                "cursor-pointer transition-all duration-200 hover:shadow-md animate-fadeSlideIn",
                                `animation-delay-${(index + 2) * 150}`,
                                selectedPackage?.package_id ===
                                  pkg.package_id &&
                                  "ring-2 ring-[#028A75] border-[#028A75]"
                              )}
                              onClick={() => handlePackageSelect(pkg)}
                            >
                              {/* Package Venue Preview Images */}
                              {pkg.venue_previews &&
                                pkg.venue_previews.length > 0 && (
                                  <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                                    <img
                                      src={getImageUrl(
                                        pkg.venue_previews[0]
                                          .venue_cover_photo ||
                                          pkg.venue_previews[0]
                                            .venue_profile_picture
                                      )}
                                      alt={
                                        pkg.venue_previews[0].venue_title ||
                                        "Venue preview"
                                      }
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <CardTitle className="text-lg">
                                    {pkg.package_title}
                                  </CardTitle>
                                  {selectedPackage?.package_id ===
                                    pkg.package_id && (
                                    <CheckCircle className="h-5 w-5 text-[#028A75]" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {pkg.package_description}
                                </p>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-2xl font-bold text-[#028A75]">
                                      {formatPrice(pkg.package_price)}
                                    </span>
                                    <div className="flex items-center text-sm text-gray-600">
                                      <Users className="h-4 w-4 mr-1" />
                                      {pkg.guest_capacity} guests
                                    </div>
                                  </div>
                                  {/* No extra pax breakdown in Step 1 package cards */}
                                  <div className="flex justify-between text-sm text-gray-600">
                                    <span className="flex items-center">
                                      <Package className="h-3 w-3 mr-1" />
                                      {pkg.components?.length || 0} inclusions
                                    </span>
                                    <span className="flex items-center">
                                      <Gift className="h-3 w-3 mr-1" />
                                      {pkg.freebies?.length || 0} freebies
                                    </span>
                                  </div>
                                  <div className="pt-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showPackageDetails(pkg);
                                      }}
                                      className="w-full text-center text-sm py-1.5 px-3 bg-[#028A75]/10 text-[#028A75] rounded hover:bg-[#028A75]/20 transition-colors"
                                    >
                                      <Eye className="h-3 w-3 inline mr-1" />{" "}
                                      View Details
                                    </button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        <div className="flex items-center justify-center">
                          <button
                            onClick={handleDecideLater}
                            className={cn(
                              "px-6 py-3 rounded-lg transition-colors border-2 border-dashed",
                              decideLater
                                ? "bg-[#028A75]/10 border-[#028A75] text-[#028A75]"
                                : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                            )}
                          >
                            {decideLater
                              ? "✓ Decide Later Selected"
                              : "Skip - Decide Later"}
                          </button>
                        </div>
                      </div>

                      {selectedPackage && (
                        <div className="mt-6 p-4 bg-[#028A75]/5 rounded-lg border border-[#028A75]/20">
                          <h3 className="font-medium text-[#028A75] mb-2">
                            Selected Package
                          </h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-[#028A75]">
                                {selectedPackage.package_title}
                              </p>
                              <p className="text-sm text-[#028A75]/70">
                                {formatPrice(selectedPackage.package_price)}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedPackage(null);
                                setFormData((prev) => ({
                                  ...prev,
                                  packageId: null,
                                }));
                              }}
                              className="text-[#028A75] hover:text-[#028A75]/80"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      )}

                      {decideLater && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h3 className="font-medium text-gray-900 mb-2">
                            Decide Later Selected
                          </h3>
                          <p className="text-sm text-gray-600">
                            You can customize your event details in the next
                            step
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Event Details */}
                  {currentStep === 2 && (
                    <div className="space-y-6 animate-fadeSlideIn">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2 animate-fadeSlideIn animation-delay-150">
                          <Label>Event Type *</Label>
                          <Select
                            value={formData.eventType}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                eventType: value,
                              }))
                            }
                            disabled={
                              (selectedPackage !== null && !decideLater) ||
                              isPrefilledPackage
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                !formData.eventType &&
                                  !selectedPackage &&
                                  "border-red-200 focus:ring-red-500"
                              )}
                            >
                              <SelectValue placeholder="Select event type">
                                {formData.eventType || "Select event type"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {loadingEventTypes ? (
                                <SelectItem value="loading" disabled>
                                  Loading event types...
                                </SelectItem>
                              ) : eventTypes.length > 0 ? (
                                eventTypes.map((type) => (
                                  <SelectItem
                                    key={type.event_type_id}
                                    value={type.event_name}
                                  >
                                    {type.event_name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-types" disabled>
                                  No event types available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {(selectedPackage && !decideLater) ||
                          isPrefilledPackage ? (
                            <p className="text-xs text-[#028A75] mt-1">
                              Auto-populated from selected package
                            </p>
                          ) : null}
                          {!loadingEventTypes && eventTypes.length === 0 && (
                            <p className="text-xs text-red-600 mt-1">
                              Unable to load event types. Please refresh the
                              page.
                            </p>
                          )}
                          {!formData.eventType && !selectedPackage && (
                            <p className="text-xs text-red-600 mt-1">
                              Please select an event type
                            </p>
                          )}
                        </div>

                        <div className="space-y-2 animate-fadeSlideIn animation-delay-300">
                          <Label>Event Name *</Label>
                          <Input
                            value={formData.eventName}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                eventName: e.target.value,
                              }))
                            }
                            placeholder="Enter event name"
                            className={cn(
                              !formData.eventName &&
                                "border-red-200 focus:ring-red-500"
                            )}
                          />
                          {!formData.eventName && (
                            <p className="text-xs text-red-600 mt-1">
                              Please enter an event name
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Date Selection with Calendar Modal */}
                      <div className="space-y-2 animate-fadeSlideIn animation-delay-450">
                        <Label>Event Date *</Label>
                        <Dialog
                          open={calendarOpen}
                          onOpenChange={(open) => {
                            setCalendarOpen(open);
                            // Load calendar data when opening the modal
                            if (open) {
                              const targetDate = selectedDate || new Date();
                              loadCalendarConflictData(targetDate);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-12",
                                !selectedDate &&
                                  "text-muted-foreground border-red-200",
                                hasConflicts && "border-red-500 border-2",
                                selectedDate &&
                                  "border-[#028A75] text-[#028A75]"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-5 w-5" />
                              {selectedDate
                                ? format(selectedDate, "PPP")
                                : "Select event date"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl p-0">
                            <div className="p-6">
                              <DialogHeader className="mb-6">
                                <DialogTitle className="text-xl font-semibold">
                                  Select Event Date
                                </DialogTitle>
                              </DialogHeader>

                              {/* Heat Map Guide */}
                              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-sm font-medium mb-3 text-gray-800">
                                  Availability Guide:
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-white border-2 border-gray-200 rounded"></div>
                                    <span className="text-gray-700">
                                      Available
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-yellow-200 border-2 border-gray-200 rounded"></div>
                                    <span className="text-gray-700">
                                      1 Event
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-orange-300 border-2 border-gray-200 rounded"></div>
                                    <span className="text-gray-700">
                                      2 Events
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-red-300 border-2 border-gray-200 rounded"></div>
                                    <span className="text-gray-700">
                                      3+ Events
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-red-500 border-2 border-gray-200 rounded"></div>
                                    <span className="text-gray-700">
                                      Wedding (Blocked)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-gray-100 border-2 border-gray-200 rounded opacity-50"></div>
                                    <span className="text-gray-700">
                                      Past Date
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="w-full">
                                <ResponsiveCalendar
                                  selectedDate={selectedDate}
                                  onDateSelect={handleDateSelect}
                                  calendarConflictData={calendarConflictData}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Guest count input removed from Step 2; handled in Step 3 */}

                      {/* Conflict checking indicator */}
                      {isCheckingConflicts && (
                        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Checking date availability...
                        </div>
                      )}

                      {/* Conflict warning */}
                      {hasConflicts && conflictingEvents.length > 0 && (
                        <Alert className="border-red-500 bg-red-50">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <p className="font-medium">
                                Scheduling conflicts detected:
                              </p>
                              {conflictingEvents.map((event, index) => (
                                <div
                                  key={`conflict-${event.event_id || index}`}
                                  className="text-sm"
                                >
                                  • {event.event_title} ({event.start_time} -{" "}
                                  {event.end_time})
                                </div>
                              ))}
                              <p className="text-sm">
                                Please select a different date or time.
                              </p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Success message when no conflicts */}
                      {!hasConflicts &&
                        !isCheckingConflicts &&
                        formData.eventDate && (
                          <Alert className="border-green-500 bg-green-50">
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              Your selected date and time is available!
                            </AlertDescription>
                          </Alert>
                        )}
                    </div>
                  )}

                  {/* Step 3: Venue Selection */}
                  {currentStep === 3 && (
                    <div className="space-y-6 animate-fadeSlideIn">
                      <div className="space-y-2 animate-fadeSlideIn animation-delay-150">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="venue-guest-count">
                            Selected Guest Count
                          </Label>
                          <div className="flex items-center gap-3">
                            <Input
                              id="venue-guest-count"
                              type="number"
                              min={1}
                              max={1000}
                              value={guestCountInput}
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /[^0-9]/g,
                                  ""
                                );
                                setGuestCountInput(value);
                              }}
                              onBlur={() => {
                                const parsed = parseInt(guestCountInput, 10);
                                const val =
                                  isNaN(parsed) || parsed < 1
                                    ? 1
                                    : Math.min(1000, parsed);
                                setFormData((prev) => ({
                                  ...prev,
                                  guestCount: val,
                                }));
                                setGuestCountInput(val.toString());
                              }}
                              className="w-28"
                            />
                            <span className="text-[#028A75] font-medium">
                              {formData.guestCount} guests
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600">
                            Venues will be filtered based on your guest count of{" "}
                            {formData.guestCount} guests.
                            {formData.guestCount > 100 && (
                              <span className="block mt-2 text-amber-600">
                                Note: Additional cost of{" "}
                                {formatPrice(getExtraPaxRate(selectedVenue))}{" "}
                                per guest over 100 applies (
                                {formData.guestCount - 100} extra guests ={" "}
                                {formatPrice(
                                  (formData.guestCount - 100) *
                                    getExtraPaxRate(selectedVenue)
                                )}
                                )
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {venues.length === 0 ? (
                        <div className="text-center py-8">
                          <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-600">
                            No venues available for your selected package, date,
                            and guest count.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => fetchVenues(formData.packageId)}
                            className="mt-4"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Venues
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-stretch">
                          {venues.map((venue, index) => (
                            <Card
                              key={venue.venue_id}
                              className={cn(
                                "cursor-pointer transition-all duration-200 hover:shadow-md animate-fadeSlideIn h-full flex flex-col",
                                `animation-delay-${(index + 2) * 150}`,
                                formData.venueId === venue.venue_id &&
                                  "ring-2 ring-[#028A75] border-[#028A75]"
                              )}
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  venueId: venue.venue_id,
                                }));
                                setSelectedVenue(venue);
                              }}
                            >
                              {/* Venue Image */}
                              {venue.venue_cover_photo && (
                                <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                                  <img
                                    src={getImageUrl(venue.venue_cover_photo)}
                                    alt={venue.venue_title || "Venue"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                </div>
                              )}
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                    {/* Venue Profile Picture with Fallback */}
                                    <div className="w-12 h-12 rounded-full border-2 border-gray-200 overflow-hidden bg-gradient-to-br from-[#028A75] to-[#027a68] flex items-center justify-center flex-shrink-0">
                                      {venue.venue_profile_picture ? (
                                        <img
                                          src={getImageUrl(
                                            venue.venue_profile_picture
                                          )}
                                          alt={`${venue.venue_title || "Venue"} profile`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display =
                                              "none";
                                            const parent =
                                              e.currentTarget.parentElement;
                                            if (parent) {
                                              parent.innerHTML = `<span class="text-white font-bold text-lg">${venue.venue_title?.[0] || "V"}</span>`;
                                            }
                                          }}
                                        />
                                      ) : (
                                        <span className="text-white font-bold text-lg">
                                          {venue.venue_title?.[0] || "V"}
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <CardTitle className="text-lg">
                                        {venue.venue_title}
                                      </CardTitle>
                                      <p className="text-sm text-gray-600 flex items-center">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        {venue.venue_location}
                                      </p>
                                    </div>
                                  </div>
                                  {formData.venueId === venue.venue_id && (
                                    <CheckCircle className="h-5 w-5 text-[#028A75]" />
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="flex-1 flex flex-col">
                                <div className="mb-2">
                                  <span className="text-lg font-bold text-[#028A75]">
                                    {formatPrice(
                                      computeVenueEstimatedPrice(
                                        venue,
                                        formData.guestCount
                                      )
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Users className="h-4 w-4 mr-1" />
                                    {venue.venue_capacity} capacity
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setModalVenue(venue);
                                      setVenueDetailsModalOpen(true);
                                    }}
                                    className="h-8 px-3 text-xs"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Details
                                  </Button>
                                </div>
                                {typeof venue.extra_pax_rate === "number" && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    Extra pax rate:{" "}
                                    {formatPrice(venue.extra_pax_rate)} per
                                    guest
                                  </div>
                                )}
                                {formData.guestCount > venue.venue_capacity && (
                                  <div className="text-xs text-red-600 flex items-center">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Capacity exceeded by{" "}
                                    {formData.guestCount -
                                      venue.venue_capacity}{" "}
                                    guests
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4: Inclusions */}
                  {currentStep === 4 && (
                    <div className="space-y-6 animate-fadeSlideIn">
                      {selectedVenue && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center text-blue-700 mb-2">
                            <MapPin className="h-4 w-4 mr-2" />
                            <h3 className="font-medium">
                              Selected Venue: {selectedVenue.venue_title}
                            </h3>
                          </div>
                          {selectedVenue.inclusions &&
                            selectedVenue.inclusions.length > 0 && (
                              <p className="text-sm text-blue-600">
                                This venue includes{" "}
                                {selectedVenue.inclusions.length} special
                                inclusions. View them in the Venue Inclusions
                                tab.
                              </p>
                            )}
                        </div>
                      )}
                      <InclusionsStep
                        packageId={formData.packageId}
                        venueId={formData.venueId}
                        packageInclusions={formData.inclusions}
                        customInclusions={formData.customInclusions}
                        removedInclusions={formData.removedInclusions}
                        supplierServices={formData.supplierServices}
                        externalCustomizations={formData.externalCustomizations}
                        guestCount={formData.guestCount}
                        venueTitle={selectedVenue?.venue_title || null}
                        venuePriceEstimate={
                          selectedVenue
                            ? computeVenueEstimatedPrice(
                                selectedVenue,
                                formData.guestCount
                              )
                            : 0
                        }
                        onAddInclusion={(inclusion) => {
                          setFormData((prev) => ({
                            ...prev,
                            customInclusions: [
                              ...prev.customInclusions,
                              inclusion,
                            ],
                          }));
                        }}
                        onRemoveInclusion={(inclusionId) => {
                          const allInclusions = [
                            ...formData.inclusions,
                            ...formData.customInclusions,
                            ...formData.supplierServices,
                          ];
                          const inclusionToRemove = allInclusions.find(
                            (inc) => inc.inclusion_id === inclusionId
                          );

                          if (inclusionToRemove) {
                            setFormData((prev) => ({
                              ...prev,
                              removedInclusions: [
                                ...prev.removedInclusions,
                                inclusionToRemove,
                              ],
                            }));
                          }
                        }}
                        onRestoreInclusion={(inclusionId) => {
                          setFormData((prev) => ({
                            ...prev,
                            removedInclusions: prev.removedInclusions.filter(
                              (inc) => inc.inclusion_id !== inclusionId
                            ),
                          }));
                        }}
                        onAddSupplierService={(service) => {
                          setFormData((prev) => ({
                            ...prev,
                            supplierServices: [
                              ...prev.supplierServices,
                              service,
                            ],
                          }));
                        }}
                        onRemoveSupplierService={(serviceId) => {
                          setFormData((prev) => ({
                            ...prev,
                            supplierServices: prev.supplierServices.filter(
                              (service) => service.inclusion_id !== serviceId
                            ),
                          }));
                        }}
                        onAddExternalCustomization={(customization) => {
                          setFormData((prev) => ({
                            ...prev,
                            externalCustomizations: [
                              ...prev.externalCustomizations,
                              customization,
                            ],
                          }));
                        }}
                        onRemoveExternalCustomization={(index) => {
                          setFormData((prev) => ({
                            ...prev,
                            externalCustomizations:
                              prev.externalCustomizations.filter(
                                (_, i) => i !== index
                              ),
                          }));
                        }}
                        totalPrice={totalPrice}
                      />
                    </div>
                  )}

                  {/* Step 5: Review & Confirm */}
                  {currentStep === 5 && (
                    <div className="space-y-6 animate-fadeSlideIn">
                      {/* Main Summary Card */}
                      <Card className="border shadow-sm rounded-xl">
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Event Details Section */}
                            <div className="space-y-4">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Event Details
                              </h3>
                              <div className="space-y-3">
                                <div className="flex flex-col space-y-1">
                                  <span className="text-sm text-gray-500">
                                    Event Type
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {formData.eventType}
                                  </span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <span className="text-sm text-gray-500">
                                    Event Name
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {formData.eventName}
                                  </span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <span className="text-sm text-gray-500">
                                    Event Date
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {selectedDate
                                      ? format(selectedDate, "MMMM dd, yyyy")
                                      : "Not selected"}
                                  </span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <span className="text-sm text-gray-500">
                                    Time
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {formData.startTime} – {formData.endTime}
                                  </span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <span className="text-sm text-gray-500">
                                    Guest Count
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {formData.guestCount}
                                  </span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <span className="text-sm text-gray-500">
                                    Booking Date
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {format(new Date(), "MMMM dd, yyyy")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Package & Venue Section */}
                            <div className="space-y-4">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Package & Venue
                              </h3>
                              <div className="space-y-3">
                                <div className="flex flex-col space-y-1">
                                  <span className="text-sm text-gray-500">
                                    Package Name
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {selectedPackage?.package_title}
                                  </span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <span className="text-sm text-gray-500">
                                    Package Price
                                  </span>
                                  <span className="font-bold text-emerald-600">
                                    {formatPrice(
                                      calculateTotalPackagePrice(
                                        selectedPackage?.package_price,
                                        formData.guestCount,
                                        selectedVenue
                                      )
                                    )}
                                  </span>
                                  {formData.guestCount > 100 && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      Base:{" "}
                                      {formatPrice(
                                        selectedPackage?.package_price || 0
                                      )}{" "}
                                      + {formData.guestCount - 100} extra guests
                                      @{" "}
                                      {formatPrice(
                                        getExtraPaxRate(selectedVenue)
                                      )}{" "}
                                      each
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <span className="text-sm text-gray-500">
                                    Venue Name
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {selectedVenue?.venue_title}
                                  </span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <span className="text-sm text-gray-500">
                                    Venue Buffer
                                  </span>
                                  <span className="font-bold text-emerald-600">
                                    {formatPrice(
                                      selectedVenue
                                        ? computeVenueEstimatedPrice(
                                            selectedVenue,
                                            formData.guestCount
                                          )
                                        : 0
                                    )}
                                  </span>
                                </div>
                                <div className="border-t pt-3 mt-4">
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-sm text-gray-500">
                                      Total Estimate
                                    </span>
                                    <span className="text-xl font-bold text-emerald-600">
                                      {formatPrice(
                                        (selectedPackage ? totalPrice : 0) +
                                          (selectedVenue
                                            ? computeVenueEstimatedPrice(
                                                selectedVenue,
                                                formData.guestCount
                                              )
                                            : 0) || 0
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Inclusions Section - Show all inclusions including unchecked ones */}
                          <div className="mt-8 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              Event Inclusions
                            </h3>
                            <div className="space-y-4">
                              {/* Package Inclusions */}
                              {formData.inclusions.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">
                                    Package Inclusions
                                  </h4>
                                  <div className="bg-white rounded-lg border border-gray-200 divide-y">
                                    {formData.inclusions.map(
                                      (inclusion, index) => {
                                        const isRemoved =
                                          formData.removedInclusions.some(
                                            (inc) =>
                                              inc.inclusion_id ===
                                              inclusion.inclusion_id
                                          );
                                        return (
                                          <div
                                            key={`review-inc-${String(inclusion.inclusion_id)}-${index}`}
                                            className="p-3 flex items-center justify-between"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div
                                                className={`w-4 h-4 rounded-sm flex items-center justify-center border ${isRemoved ? "border-gray-300" : "border-[#028A75] bg-[#028A75]"}`}
                                              >
                                                {!isRemoved && (
                                                  <Check className="h-3 w-3 text-white" />
                                                )}
                                              </div>
                                              <div>
                                                <div
                                                  className={`font-medium ${isRemoved ? "text-gray-500" : "text-gray-900"}`}
                                                >
                                                  {inclusion.inclusion_name}
                                                </div>
                                                {inclusion.inclusion_description && (
                                                  <div className="text-xs text-gray-500">
                                                    {
                                                      inclusion.inclusion_description
                                                    }
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <div
                                              className={`text-sm font-medium ${isRemoved ? "text-gray-400" : "text-[#028A75]"}`}
                                            >
                                              {/* Hide individual inclusion prices as per requirements */}
                                              <span className="text-gray-400 text-xs">
                                                Included
                                              </span>
                                              {isRemoved && (
                                                <span className="text-xs ml-2">
                                                  (Not included)
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Custom Inclusions */}
                              {formData.customInclusions.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">
                                    Custom Inclusions
                                  </h4>
                                  <div className="bg-white rounded-lg border border-gray-200 divide-y">
                                    {formData.customInclusions.map(
                                      (inclusion, index) => {
                                        const isRemoved =
                                          formData.removedInclusions.some(
                                            (inc) =>
                                              inc.inclusion_id ===
                                              inclusion.inclusion_id
                                          );
                                        const isVenueInclusion =
                                          inclusion.is_venue_inclusion;
                                        return (
                                          <div
                                            key={`review-custom-${String(inclusion.inclusion_id)}-${index}`}
                                            className={`p-3 flex items-center justify-between ${isVenueInclusion ? "bg-blue-50" : ""}`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div
                                                className={`w-4 h-4 rounded-sm flex items-center justify-center border ${isRemoved ? "border-gray-300" : "border-[#028A75] bg-[#028A75]"}`}
                                              >
                                                {!isRemoved && (
                                                  <Check className="h-3 w-3 text-white" />
                                                )}
                                              </div>
                                              <div>
                                                <div
                                                  className={`font-medium ${isRemoved ? "text-gray-500" : "text-gray-900"}`}
                                                >
                                                  {inclusion.inclusion_name}
                                                  {isVenueInclusion && (
                                                    <span className="ml-2 text-xs text-blue-600">
                                                      (Venue Inclusion)
                                                    </span>
                                                  )}
                                                </div>
                                                {inclusion.inclusion_description && (
                                                  <div className="text-xs text-gray-500">
                                                    {
                                                      inclusion.inclusion_description
                                                    }
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <div
                                              className={`text-sm font-medium ${isRemoved ? "text-gray-400" : isVenueInclusion ? "text-blue-600" : "text-[#028A75]"}`}
                                            >
                                              {/* Hide individual inclusion prices as per requirements */}
                                              <span className="text-gray-400 text-xs">
                                                Included
                                              </span>
                                              {isRemoved && (
                                                <span className="text-xs ml-2">
                                                  (Not included)
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Supplier Services */}
                              {formData.supplierServices.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">
                                    Supplier Services
                                  </h4>
                                  <div className="bg-white rounded-lg border border-gray-200 divide-y">
                                    {formData.supplierServices.map(
                                      (service, index) => {
                                        const isRemoved =
                                          formData.removedInclusions.some(
                                            (inc) =>
                                              inc.inclusion_id ===
                                              service.inclusion_id
                                          );
                                        return (
                                          <div
                                            key={`review-service-${String(service.inclusion_id)}-${index}`}
                                            className="p-3 flex items-center justify-between"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div
                                                className={`w-4 h-4 rounded-sm flex items-center justify-center border ${isRemoved ? "border-gray-300" : "border-[#028A75] bg-[#028A75]"}`}
                                              >
                                                {!isRemoved && (
                                                  <Check className="h-3 w-3 text-white" />
                                                )}
                                              </div>
                                              <div>
                                                <div
                                                  className={`font-medium ${isRemoved ? "text-gray-500" : "text-gray-900"}`}
                                                >
                                                  {service.inclusion_name}
                                                  {service.supplier_name && (
                                                    <span className="ml-2 text-xs text-purple-600">
                                                      (by{" "}
                                                      {service.supplier_name})
                                                    </span>
                                                  )}
                                                </div>
                                                {service.inclusion_description && (
                                                  <div className="text-xs text-gray-500">
                                                    {
                                                      service.inclusion_description
                                                    }
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <div
                                              className={`text-sm font-medium ${isRemoved ? "text-gray-400" : "text-purple-600"}`}
                                            >
                                              {/* Hide individual service prices as per requirements */}
                                              <span className="text-gray-400 text-xs">
                                                Service
                                              </span>
                                              {isRemoved && (
                                                <span className="text-xs ml-2">
                                                  (Not included)
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* External Customizations */}
                              {formData.externalCustomizations.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">
                                    External Customizations
                                  </h4>
                                  <div className="bg-white rounded-lg border border-gray-200 divide-y">
                                    {formData.externalCustomizations.map(
                                      (custom, index) => (
                                        <div
                                          key={`review-custom-ext-${index}`}
                                          className="p-3 flex items-center justify-between"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-sm flex items-center justify-center border border-[#028A75] bg-[#028A75]">
                                              <Check className="h-3 w-3 text-white" />
                                            </div>
                                            <div>
                                              <div className="font-medium text-gray-900">
                                                {custom.name}
                                                <span className="ml-2 text-xs text-orange-600">
                                                  (External)
                                                </span>
                                              </div>
                                              {custom.description && (
                                                <div className="text-xs text-gray-500">
                                                  {custom.description}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-sm font-medium text-orange-600">
                                            {/* Hide individual customization prices as per requirements */}
                                            <span className="text-gray-400 text-xs">
                                              Custom
                                            </span>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Show message if no inclusions */}
                              {formData.inclusions.length === 0 &&
                                formData.customInclusions.length === 0 &&
                                formData.supplierServices.length === 0 &&
                                formData.externalCustomizations.length ===
                                  0 && (
                                  <div className="text-center py-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <p className="text-gray-500">
                                      No inclusions have been selected for this
                                      event.
                                    </p>
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Additional Notes */}
                          <div className="mt-8 pt-6 border-t">
                            <Label className="text-sm font-medium text-gray-700">
                              Additional Notes
                            </Label>
                            <Textarea
                              value={formData.notes}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  notes: e.target.value,
                                }))
                              }
                              placeholder="Any special requests or instructions..."
                              rows={3}
                              className="mt-2"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Footer Note */}
                      <Alert className="bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          Your booking will be submitted for review. You will
                          receive an email confirmation once it's approved.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4 animate-fadeIn">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">
                    Quick Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  {formData.eventName && (
                    <div>
                      <p className="text-sm text-gray-600">Event</p>
                      <p className="font-medium">{formData.eventName}</p>
                    </div>
                  )}
                  {selectedDate && (
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">
                        {format(selectedDate, "PPP")}
                      </p>
                    </div>
                  )}

                  {/* Inclusions summary */}
                  <div>
                    <p className="text-sm text-gray-600">Inclusions</p>
                    <p className="font-medium">
                      {formData.inclusions.length -
                        formData.removedInclusions.length +
                        formData.customInclusions.length +
                        formData.supplierServices.length +
                        formData.externalCustomizations.length}{" "}
                      total inclusions
                    </p>
                    {formData.customInclusions.length > 0 && (
                      <p className="text-xs text-[#028A75]">
                        {formData.customInclusions.length} custom inclusion
                        {formData.customInclusions.length !== 1 ? "s" : ""}
                      </p>
                    )}
                    {formData.supplierServices.length > 0 && (
                      <p className="text-xs text-blue-600">
                        {formData.supplierServices.length} supplier service
                        {formData.supplierServices.length !== 1 ? "s" : ""}
                      </p>
                    )}
                    {formData.externalCustomizations.length > 0 && (
                      <p className="text-xs text-purple-600">
                        {formData.externalCustomizations.length} external
                        customization
                        {formData.externalCustomizations.length !== 1
                          ? "s"
                          : ""}
                      </p>
                    )}
                  </div>
                  {selectedPackage && (
                    <div>
                      <p className="text-sm text-gray-600">Package</p>
                      <p className="font-medium">
                        {selectedPackage.package_title}
                      </p>
                      <p className="text-sm text-[#028A75]">
                        {formatPrice(selectedPackage.package_price)}
                      </p>
                    </div>
                  )}
                  {decideLater && (
                    <div>
                      <p className="text-sm text-gray-600">Package</p>
                      <p className="font-medium text-gray-500">To be decided</p>
                    </div>
                  )}
                  {formData.guestCount > 0 && currentStep >= 3 && (
                    <div>
                      <p className="text-sm text-gray-600">Guest Count</p>
                      <p className="font-medium">
                        {formData.guestCount} guests
                      </p>
                    </div>
                  )}
                  {selectedVenue && (
                    <div>
                      <p className="text-sm text-gray-600">Venue</p>
                      <p className="font-medium">{selectedVenue.venue_title}</p>
                      <p className="text-sm text-[#028A75]">
                        {formatPrice(
                          computeVenueEstimatedPrice(
                            selectedVenue,
                            formData.guestCount
                          )
                        )}
                      </p>
                    </div>
                  )}
                  {(selectedPackage || decideLater) && selectedVenue && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-600">Estimated Total</p>
                      <p className="text-xl font-bold text-[#028A75]">
                        {formatPrice(
                          (selectedPackage ? totalPrice : 0) +
                            (selectedVenue
                              ? computeVenueEstimatedPrice(
                                  selectedVenue,
                                  formData.guestCount
                                )
                              : 0) || 0
                        )}
                      </p>
                      {decideLater && (
                        <p className="text-xs text-gray-500 mt-1">
                          Package cost not included
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Step 6: Payment Step */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-fadeSlideIn">
              <Card className="border shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    View available payment methods. You can make a payment to
                    reserve your slot, or pay later. Staff will record your
                    payment when received.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payment Information Display */}
                  {(paymentSettings.gcash_name ||
                    paymentSettings.bank_name) && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        Payment Information
                      </h3>

                      {paymentSettings.gcash_name && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-semibold text-green-800 mb-2">
                            GCash
                          </h4>
                          <p className="text-sm text-green-700">
                            <strong>Name:</strong> {paymentSettings.gcash_name}
                          </p>
                          {paymentSettings.gcash_number && (
                            <p className="text-sm text-green-700">
                              <strong>Number:</strong>{" "}
                              {paymentSettings.gcash_number}
                            </p>
                          )}
                        </div>
                      )}

                      {paymentSettings.bank_name && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold text-blue-800 mb-2">
                            Bank Transfer
                          </h4>
                          <p className="text-sm text-blue-700">
                            <strong>Bank:</strong> {paymentSettings.bank_name}
                          </p>
                          {paymentSettings.bank_account_name && (
                            <p className="text-sm text-blue-700">
                              <strong>Account Name:</strong>{" "}
                              {paymentSettings.bank_account_name}
                            </p>
                          )}
                          {paymentSettings.bank_account_number && (
                            <p className="text-sm text-blue-700">
                              <strong>Account Number:</strong>{" "}
                              {paymentSettings.bank_account_number}
                            </p>
                          )}
                        </div>
                      )}

                      {paymentSettings.payment_instructions && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-2">
                            Instructions
                          </h4>
                          <p className="text-sm text-gray-700">
                            {paymentSettings.payment_instructions}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Options */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      Available Payment Methods
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* GCash Option */}
                      <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              G
                            </span>
                          </div>
                          <h4 className="font-semibold text-green-800">
                            GCash
                          </h4>
                        </div>
                        <p className="text-sm text-green-700">
                          Send payment via GCash to the number provided above
                        </p>
                      </div>

                      {/* Bank Transfer Option */}
                      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              B
                            </span>
                          </div>
                          <h4 className="font-semibold text-blue-800">
                            Bank Transfer
                          </h4>
                        </div>
                        <p className="text-sm text-blue-700">
                          Transfer to the bank account details provided above
                        </p>
                      </div>

                      {/* Cash on Site Option */}
                      <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              ₱
                            </span>
                          </div>
                          <h4 className="font-semibold text-orange-800">
                            Cash on Site
                          </h4>
                        </div>
                        <p className="text-sm text-orange-700">
                          Pay in cash when you visit our office
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Process Note */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>How it works:</strong> After creating your
                      booking, you can make a payment using any of the methods
                      above. Once you make a payment, contact our staff to
                      record the transaction. This helps secure your booking
                      slot and speeds up the confirmation process.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mt-8 animate-fadeIn">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="w-full sm:w-auto flex items-center justify-center gap-2 min-h-[44px] px-6 py-3"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="w-full sm:w-auto">
              {currentStep < steps.length ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceedToNextStep()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#028A75] hover:bg-[#028A75]/90 min-h-[44px] px-6 py-3"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !canProceedToNextStep()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#028A75] hover:bg-[#028A75]/90 min-h-[44px] px-6 py-3"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {isEditMode
                        ? "Updating Booking..."
                        : "Creating Booking..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {isEditMode ? "Update Booking" : "Create Booking"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Always-rendered venue detail modal */}
      <Dialog
        open={venueDetailsModalOpen}
        onOpenChange={(open) => {
          setVenueDetailsModalOpen(open);
          if (!open) {
            setModalVenue(null);
          }
        }}
      >
        <DialogContent className="max-w-md mx-auto max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Venue Details</DialogTitle>
          </DialogHeader>
          {venueDetailsLoading && (
            <div className="py-8 text-center text-sm text-gray-500">
              Loading...
            </div>
          )}
          {modalVenue && !venueDetailsLoading && (
            <div className="space-y-4">
              {/* Venue Images */}
              <div className="space-y-3">
                {modalVenue.venue_cover_photo && (
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={getImageUrl(modalVenue.venue_cover_photo)}
                      alt={modalVenue.venue_title || "Venue"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {/* Venue Profile Picture with Fallback */}
                  <div className="w-16 h-16 rounded-full border-2 border-gray-200 overflow-hidden bg-gradient-to-br from-[#028A75] to-[#027a68] flex items-center justify-center flex-shrink-0">
                    {modalVenue.venue_profile_picture ? (
                      <img
                        src={getImageUrl(modalVenue.venue_profile_picture)}
                        alt={`${modalVenue.venue_title || "Venue"} profile`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = `<span class="text-white font-bold text-xl">${modalVenue.venue_title?.[0] || "V"}</span>`;
                          }
                        }}
                      />
                    ) : (
                      <span className="text-white font-bold text-xl">
                        {modalVenue.venue_title?.[0] || "V"}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {modalVenue.venue_title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {modalVenue.venue_location}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Capacity</span>
                  <p className="font-medium">
                    {modalVenue.venue_capacity} guests
                  </p>
                </div>

                {modalVenue.venue_details && (
                  <div>
                    <span className="text-sm text-gray-500">Details</span>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {modalVenue.venue_details}
                    </p>
                  </div>
                )}

                {/* Venue Inclusions */}
                {modalVenue.inclusions && modalVenue.inclusions.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500">Inclusions</span>
                    <div className="space-y-2 mt-2">
                      {modalVenue.inclusions.map((inclusion, index) => (
                        <div
                          key={`inclusion-${inclusion.inclusion_id || index}`}
                          className="flex items-center p-2 bg-gray-50 rounded-md"
                        >
                          <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3 flex-shrink-0"></div>
                          <span className="text-sm font-medium">
                            {inclusion.inclusion_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-sm text-gray-500">Venue Buffer</span>
                  <p className="font-bold text-emerald-600">
                    {formatPrice(modalVenue.venue_price)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Package Details Modal */}
      <Dialog
        open={packageDetailsModalOpen}
        onOpenChange={setPackageDetailsModalOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] sm:max-h-[95vh] w-full overflow-hidden p-0 flex flex-col">
          <DialogHeader className="p-4 sm:p-6 md:p-8 border-b">
            <DialogTitle className="text-2xl font-bold flex items-center">
              <Package className="h-6 w-6 mr-2 text-[#028A75]" />
              {modalPackage?.package_title || "Package Details"}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable content area */}
          <div className="overflow-y-auto flex-grow">
            {modalPackage && (
              <div className="p-4 sm:p-6 md:p-8 space-y-8">
                <div className="animate-fadeSlideIn animation-delay-150">
                  <h3 className="font-medium text-lg text-gray-900 mb-3 flex items-center">
                    <Info className="h-5 w-5 mr-2 text-gray-500" />
                    Description
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-gray-700 leading-relaxed">
                      {modalPackage.package_description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 animate-fadeSlideIn animation-delay-300 w-full">
                  <div className="bg-gradient-to-br from-[#028A75]/10 to-[#028A75]/5 p-5 rounded-xl shadow-sm flex-grow transition-transform duration-300 hover:shadow-md hover:-translate-y-1">
                    <div className="flex items-center text-[#028A75] mb-3">
                      <DollarSign className="h-5 w-5 mr-2" />
                      <h3 className="font-medium text-lg">Price</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(modalPackage.package_price)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Base price for up to {modalPackage.guest_capacity} guests
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-5 rounded-xl shadow-sm flex-grow transition-transform duration-300 hover:shadow-md hover:-translate-y-1">
                    <div className="flex items-center text-blue-600 mb-3">
                      <Users className="h-5 w-5 mr-2" />
                      <h3 className="font-medium text-lg">Capacity</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {modalPackage.guest_capacity} guests
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatPrice(getExtraPaxRate(selectedVenue))} per
                      additional guest
                    </p>
                  </div>
                </div>

                {/* Inclusions */}
                {modalPackage.components &&
                  modalPackage.components.length > 0 && (
                    <div className="animate-fadeSlideIn animation-delay-450">
                      <h3 className="font-medium text-lg text-gray-900 flex items-center mb-3">
                        <Package className="h-5 w-5 mr-2 text-[#028A75]" />
                        Inclusions
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                        {modalPackage.components.map((component, index) => (
                          <div
                            key={`component-${index}`}
                            className="flex items-start gap-3 bg-[#028A75]/5 p-4 rounded-xl border border-[#028A75]/10 shadow-sm transform transition-all duration-300 hover:shadow hover:-translate-y-0.5 hover:bg-[#028A75]/10"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <Check className="h-5 w-5 text-[#028A75] mt-0.5" />
                            <div>
                              <p className="text-gray-800 font-medium">
                                {component.component_name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Freebies */}
                {modalPackage.freebies && modalPackage.freebies.length > 0 && (
                  <div className="animate-fadeSlideIn animation-delay-600">
                    <h3 className="font-medium text-lg text-gray-900 flex items-center mb-3">
                      <Gift className="h-5 w-5 mr-2 text-purple-600" />
                      Freebies
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                      {modalPackage.freebies.map((freebie, index) => (
                        <div
                          key={`freebie-${index}`}
                          className="flex items-start gap-3 bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm transform transition-all duration-300 hover:shadow hover:-translate-y-0.5 hover:bg-purple-100/50"
                          style={{ animationDelay: `${(index + 5) * 50}ms` }}
                        >
                          <Gift className="h-5 w-5 text-purple-600 mt-0.5" />
                          <div>
                            <p className="text-gray-800 font-medium">
                              {freebie.freebie_name}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {freebie.freebie_description}
                            </p>
                            {freebie.freebie_value > 0 && (
                              <p className="text-sm text-purple-600 mt-2 font-medium">
                                Value: {formatPrice(freebie.freebie_value)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Venue Choices as Carousel */}
                {modalPackage.venue_previews &&
                  modalPackage.venue_previews.length > 0 && (
                    <div className="animate-fadeIn">
                      <h3 className="font-medium text-lg text-gray-900 flex items-center mb-4">
                        <MapPin className="h-5 w-5 mr-2 text-red-500" />
                        Venue Options
                      </h3>

                      <div className="relative overflow-hidden rounded-xl">
                        {/* Carousel Arrows (always visible) */}
                        <button
                          type="button"
                          aria-label="Previous venues"
                          onClick={() => scrollVenueCarousel(-1)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-700 border rounded-full p-2 shadow"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Next venues"
                          onClick={() => scrollVenueCarousel(1)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-700 border rounded-full p-2 shadow"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        {/* Venue Carousel */}
                        <div className="venue-carousel relative">
                          {/* Main Carousel */}
                          <div className="overflow-hidden rounded-xl">
                            <div
                              className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide pb-4 mx-0"
                              ref={venueCarouselRef}
                              onScroll={handleCarouselScroll}
                            >
                              {modalPackage.venue_previews.map(
                                (venue, index) => (
                                  <div
                                    key={`venue-${venue.venue_id || index}`}
                                    className="snap-start shrink-0 w-[85%] sm:w-[48%] md:w-[45%] px-2 transition-transform duration-300 hover:scale-[1.02] venue-card-width"
                                  >
                                    <div className="border rounded-xl overflow-hidden bg-white shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                                      <div className="h-48 sm:h-56 bg-gray-100 relative overflow-hidden">
                                        {venue.venue_cover_photo ? (
                                          <img
                                            src={getImageUrl(
                                              venue.venue_cover_photo
                                            )}
                                            alt={venue.venue_title}
                                            className="w-full h-full object-cover transform transition-transform duration-500 hover:scale-110"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                            <MapPin className="h-10 w-10 text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="p-4 flex-1 flex flex-col">
                                        {/* Venue Title with Profile Picture */}
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-10 h-10 rounded-full border-2 border-gray-200 overflow-hidden bg-gradient-to-br from-[#028A75] to-[#027a68] flex items-center justify-center flex-shrink-0">
                                            {venue.venue_profile_picture ? (
                                              <img
                                                src={getImageUrl(
                                                  venue.venue_profile_picture
                                                )}
                                                alt={`${venue.venue_title} profile`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                  e.currentTarget.style.display =
                                                    "none";
                                                  const parent =
                                                    e.currentTarget
                                                      .parentElement;
                                                  if (parent) {
                                                    parent.innerHTML = `<span class="text-white font-bold text-sm">${venue.venue_title?.[0] || "V"}</span>`;
                                                  }
                                                }}
                                              />
                                            ) : (
                                              <span className="text-white font-bold text-sm">
                                                {venue.venue_title?.[0] || "V"}
                                              </span>
                                            )}
                                          </div>
                                          <h4 className="font-medium text-gray-900 text-lg">
                                            {venue.venue_title}
                                          </h4>
                                        </div>
                                        <div className="mt-1">
                                          {venue.extra_pax_rate ? (
                                            <div className="space-y-1">
                                              <span className="text-base font-semibold text-[#028A75]">
                                                {formatPrice(
                                                  venue.extra_pax_rate
                                                )}
                                                /pax
                                              </span>
                                              <p className="text-sm text-gray-600">
                                                Total for {formData.guestCount}{" "}
                                                guests:{" "}
                                                {formatPrice(
                                                  computeVenueEstimatedPrice(
                                                    venue,
                                                    formData.guestCount
                                                  )
                                                )}
                                              </p>
                                            </div>
                                          ) : (
                                            <span className="text-base font-semibold text-[#028A75]">
                                              {formatPrice(venue.venue_price)}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600 flex items-center mt-1">
                                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                          {venue.venue_location}
                                        </p>
                                        <div className="flex items-center justify-between mt-3">
                                          <span className="text-sm font-medium text-gray-700 flex items-center">
                                            <Users className="h-3 w-3 mr-1" />
                                            Up to {venue.venue_capacity} guests
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              showVenueDetails({
                                                ...venue,
                                                venue_details: null, // Add required property that was missing
                                              });
                                            }}
                                            className="text-xs text-[#028A75] hover:text-[#028A75]/80 underline"
                                          >
                                            Details
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          {/* Indicator Dots */}
                          <div className="flex justify-center mt-4 space-x-2">
                            {modalPackage.venue_previews.map((_, index) => (
                              <div
                                key={`venue-dot-${index}`}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                  index === currentVenueIndex
                                    ? "bg-[#028A75] w-6"
                                    : "bg-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Horizontal divider and fixed button area */}
          {modalPackage && (
            <div className="border-t border-gray-200 p-4 sm:p-6 bg-white mt-auto sticky bottom-0 z-10">
              <div className="flex justify-center sm:justify-end">
                <Button
                  onClick={() => {
                    handlePackageSelect(modalPackage);
                    setPackageDetailsModalOpen(false);
                  }}
                  className="bg-[#028A75] hover:bg-[#028A75]/90 w-full sm:w-auto px-6 py-4 text-base font-medium transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span>Select This Package</span>
                  <CheckCircle className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
