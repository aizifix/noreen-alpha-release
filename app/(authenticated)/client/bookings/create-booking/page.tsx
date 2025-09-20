"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Calendar } from "@/components/ui/calendar";
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
  inclusion_id: number;
  inclusion_name: string;
  inclusion_description: string | null;
  inclusion_price: number;
  display_order: number;
  is_supplier_service?: boolean;
  supplier_id?: number;
  supplier_name?: string;
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
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [decideLater, setDecideLater] = useState(false);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);

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

  // Calendar and conflict checking state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarConflictData, setCalendarConflictData] =
    useState<CalendarConflictData>({});
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [conflictingEvents, setConflictingEvents] = useState<
    ConflictingEvent[]
  >([]);

  // Client info state
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [userId, setUserId] = useState<number | null>(null);

  // Booking success state
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState<string | null>(null);

  // Modal states for venue and package details
  const [venueDetailsModalOpen, setVenueDetailsModalOpen] = useState(false);
  const [modalVenue, setModalVenue] = useState<Venue | null>(null);
  const [packageDetailsModalOpen, setPackageDetailsModalOpen] = useState(false);
  const [modalPackage, setModalPackage] = useState<Package | null>(null);

  // Helper function to format price with proper formatting
  const formatPrice = (amount: number): string => {
    return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to calculate total package price with guest count adjustments
  const calculateTotalPackagePrice = (
    packagePrice?: number,
    guestCount?: number
  ): number => {
    // Base package price
    const basePrice = packagePrice ?? selectedPackage?.package_price ?? 0;
    const guests = guestCount ?? formData.guestCount;

    let totalPrice = basePrice;

    // If guest count exceeds 100, charge ₱350 per additional person
    if (guests > 100) {
      const extraGuests = guests - 100;
      const extraCost = extraGuests * 350;
      totalPrice += extraCost;
    }

    return totalPrice > 0 ? totalPrice : 0; // Ensure we don't have negative price
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
  ];

  // Initialize client info and load data
  useEffect(() => {
    initializeClientInfo();
    fetchEventTypes();
    fetchPackages();
  }, []);

  // Load package details if preselected
  useEffect(() => {
    if (preselectedPackageId && packages.length > 0) {
      const packageData = packages.find(
        (p) => p.package_id === parseInt(preselectedPackageId)
      );
      if (packageData) {
        setSelectedPackage(packageData);
        // Auto-populate both packageId and eventType
        setFormData((prev) => ({
          ...prev,
          packageId: packageData.package_id,
          eventType: packageData.event_type_names[0] || "", // Auto-populate event type
        }));
        console.log("Auto-populated from package:", {
          packageId: packageData.package_id,
          eventType: packageData.event_type_names[0],
        });
      }
    }
  }, [preselectedPackageId, packages]);

  // No longer needed - we're focusing on inclusions

  // Reset modal only when leaving step 3
  useEffect(() => {
    if (currentStep !== 3) {
      setVenueDetailsModalOpen(false);
      setModalVenue(null);
    }
  }, [currentStep]);

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
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: { operation: "getEventTypes" },
        }
      );

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
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: { operation: "getAllPackages" },
        }
      );

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
        response = await axios.get("http://localhost/events-api/client.php", {
          params: {
            operation: "getVenuesByPackage",
            package_id: packageId,
            event_date: formData.eventDate,
            guest_count: formData.guestCount,
          },
        });
      } else {
        response = await axios.get("http://localhost/events-api/client.php", {
          params: {
            operation: "getAvailableVenues",
            event_type_id: getEventTypeId(formData.eventType),
            event_date: formData.eventDate,
            guest_count: formData.guestCount,
          },
        });
      }

      if (response.data.status === "success") {
        setVenues(response.data.venues || []);
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

      const response = await axios.post(
        "http://localhost/events-api/client.php",
        {
          operation: "getCalendarConflictData",
          start_date: startDate,
          end_date: endDate,
        }
      );

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
      const response = await axios.post(
        "http://localhost/events-api/client.php",
        {
          operation: "checkEventDateConflicts",
          event_date: formData.eventDate,
        }
      );

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

  // Render calendar day with heat map
  const renderCalendarDay = (day: Date) => {
    const dateString = format(day, "yyyy-MM-dd");
    const dayData = calendarConflictData[dateString];
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0));

    const eventCount = dayData?.eventCount || 0;
    const hasWedding = dayData?.hasWedding || false;
    const heatMapColor = getHeatMapColor(eventCount, hasWedding);

    return (
      <button
        className={cn(
          "relative w-16 h-16 text-sm font-medium rounded-md transition-all duration-200",
          "flex items-center justify-center",
          heatMapColor,
          isSelected && "ring-2 ring-[#028A75] ring-offset-1 border-[#028A75]",
          isPastDate && "opacity-50 cursor-not-allowed text-gray-400",
          !isPastDate && !hasWedding && "hover:bg-gray-100 focus:bg-gray-100"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isPastDate) {
            handleDateSelect(day);
          }
        }}
        disabled={isPastDate}
      >
        <span>{format(day, "d")}</span>
        {eventCount > 1 && !isPastDate && (
          <div className="absolute -top-1 -right-1 z-10">
            <div className="text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold bg-[#028A75] text-white border border-white">
              {eventCount}
            </div>
          </div>
        )}
      </button>
    );
  };

  // Update the Day component with proper typing
  const CalendarDay: React.FC<DayProps> = ({ date: dayDate, ...props }) => {
    const day = new Date(dayDate);
    return (
      <div className="flex items-center justify-center p-0 w-full aspect-square">
        {renderCalendarDay(day)}
      </div>
    );
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
      const venuePrice = parseFloat(selectedVenue.venue_price) || 0;
      const extraPaxRate = parseFloat(selectedVenue.extra_pax_rate || 0);
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
        inclusion_description: `Venue: ${selectedVenue.venue_title || selectedVenue.venue_name}${extraPaxRate > 0 && guestCount > 100 ? ` (includes overflow for ${guestCount - 100} extra guests)` : ""}`,
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

      // Now handle additional venue inclusions if available
      if (selectedVenue.inclusions && selectedVenue.inclusions.length > 0) {
        // Add venue inclusions to custom inclusions if they don't exist already
        const venueInclusions = selectedVenue.inclusions.map((inclusion) => ({
          inclusion_id:
            inclusion.inclusion_id || Math.floor(Math.random() * 1000000),
          inclusion_name: inclusion.inclusion_name,
          inclusion_description:
            inclusion.inclusion_description ||
            `Included with venue: ${selectedVenue.venue_title}`,
          inclusion_price: 0, // Included with venue
          display_order: 0,
          is_venue_inclusion: true,
          included: true, // Mark as included by default but allow unchecking
        }));

        // Only add new inclusions that don't already exist
        setFormData((prev) => {
          const existingIds = new Set(
            [...prev.customInclusions, ...prev.inclusions].map(
              (inc) => inc.inclusion_id
            )
          );

          const newInclusions = venueInclusions.filter(
            (inc) => !existingIds.has(inc.inclusion_id)
          );

          if (newInclusions.length > 0) {
            return {
              ...prev,
              customInclusions: [...prev.customInclusions, ...newInclusions],
            };
          }
          return prev;
        });
      }
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
        operation: "createBooking",
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

      const response = await axios.post(
        "http://localhost/events-api/client.php",
        bookingData
      );

      if (response.data.status === "success") {
        setBookingSuccess(true);
        setBookingReference(response.data.booking_reference);
        toast({
          title: "Booking Created Successfully!",
          description: `Your booking reference is: ${response.data.booking_reference}`,
        });
      } else {
        throw new Error(response.data.message || "Failed to create booking");
      }
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Booking Failed",
        description:
          error.message || "Failed to create booking. Please try again.",
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
        // Also, use the selected venue to filter inclusions
        if (selectedVenue && selectedVenue.inclusions) {
          // Update inclusions with venue-specific data
          console.log("Selected venue inclusions:", selectedVenue.inclusions);
        }
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
      inclusion_price: component.component_price || 0,
      display_order: component.display_order || 0,
      included: true,
    };
  };

  // Fetch package inclusions
  const fetchPackageInclusions = async (packageId: number) => {
    setLoadingInclusions(true);
    try {
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: {
            operation: "getPackageInclusions",
            package_id: packageId,
          },
        }
      );

      if (response.data.status === "success") {
        if (response.data.inclusions) {
          // If the API returns inclusions directly
          setFormData((prev) => ({
            ...prev,
            inclusions: response.data.inclusions,
          }));
        } else if (response.data.components) {
          // If the API returns components instead, convert them to inclusions
          const convertedInclusions =
            response.data.components.map(componentToInclusion);
          setFormData((prev) => ({
            ...prev,
            inclusions: convertedInclusions,
          }));
        } else if (selectedPackage?.components) {
          // If no direct API data but we have components from the package
          const convertedInclusions =
            selectedPackage.components.map(componentToInclusion);
          setFormData((prev) => ({
            ...prev,
            inclusions: convertedInclusions,
          }));
        }
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
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: {
            operation: "getVenuesByPackage",
            package_id: pkg.package_id,
          },
        }
      );

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

  // Venue details modal handler
  const showVenueDetails = (venue: Venue) => {
    setModalVenue(venue);
    setVenueDetailsModalOpen(true);
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
    <div className="min-h-screen">
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {packages.map((pkg, index) => (
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
                                      {formatPrice(
                                        calculateTotalPackagePrice(
                                          pkg.package_price,
                                          formData.guestCount
                                        )
                                      )}
                                    </span>
                                    <div className="flex items-center text-sm text-gray-600">
                                      <Users className="h-4 w-4 mr-1" />
                                      {pkg.guest_capacity} guests
                                    </div>
                                  </div>
                                  {formData.guestCount > 100 && (
                                    <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2">
                                      Base: {formatPrice(pkg.package_price)} +{" "}
                                      {formData.guestCount - 100} extra guests @
                                      ₱350 each
                                    </div>
                                  )}
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
                            disabled={selectedPackage !== null && !decideLater}
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
                          {selectedPackage && !decideLater && (
                            <p className="text-xs text-[#028A75] mt-1">
                              Auto-populated from selected package
                            </p>
                          )}
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

                              <div className="flex justify-center">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={handleDateSelect}
                                  onMonthChange={loadCalendarConflictData}
                                  disabled={(date) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return date < today;
                                  }}
                                  initialFocus
                                  className="rounded-lg border-2 border-gray-200 p-4 bg-white shadow-sm w-full max-w-[700px]"
                                  classNames={{
                                    months:
                                      "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                                    month: "space-y-4 w-full",
                                    caption:
                                      "flex justify-center pt-1 relative items-center px-6",
                                    caption_label: "text-lg font-semibold",
                                    nav: "space-x-1 flex items-center",
                                    nav_button:
                                      "h-8 w-8 bg-transparent hover:bg-gray-100 p-0 opacity-75 hover:opacity-100 transition-opacity",
                                    nav_button_previous: "absolute left-1",
                                    nav_button_next: "absolute right-1",
                                    table: "w-full border-collapse space-y-1",
                                    head_row: "flex w-full",
                                    head_cell:
                                      "text-gray-500 rounded-md w-full font-normal text-[0.85rem] py-2",
                                    row: "flex w-full mt-2",
                                    cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-full",
                                    day: "h-11 w-11 p-0 font-normal aria-selected:opacity-100",
                                    day_selected:
                                      "bg-[#028A75] text-white hover:bg-[#028A75] hover:text-white focus:bg-[#028A75] focus:text-white",
                                    day_today:
                                      "bg-gray-100 text-gray-900 font-semibold",
                                    day_outside: "text-gray-400",
                                    day_disabled: "text-gray-400 opacity-50",
                                    day_range_middle:
                                      "aria-selected:bg-gray-100 aria-selected:text-gray-900",
                                    day_hidden: "invisible",
                                  }}
                                  components={{
                                    Day: CalendarDay,
                                  }}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Guest Count Field - Moved from Venue step */}
                      <div className="space-y-2 animate-fadeSlideIn animation-delay-600">
                        <Label>Expected Guest Count *</Label>
                        <Input
                          type="number"
                          value={formData.guestCount}
                          onChange={(e) => {
                            const newGuestCount = parseInt(e.target.value);
                            if (isNaN(newGuestCount) || newGuestCount < 1)
                              return;

                            setFormData((prev) => ({
                              ...prev,
                              guestCount: newGuestCount,
                            }));
                          }}
                          min="1"
                          max="1000"
                          placeholder="Enter number of guests"
                          className="w-full"
                        />
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            This will help us determine suitable venues
                          </p>
                          {formData.guestCount > 100 && (
                            <p className="text-sm text-amber-600 font-medium">
                              Additional cost: ₱350 per guest over 100 (
                              {formData.guestCount - 100} extra guests ={" "}
                              {formatPrice((formData.guestCount - 100) * 350)})
                            </p>
                          )}
                        </div>
                      </div>

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
                                  key={`conflict-${index}-${Date.now()}`}
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
                          <Label>Selected Guest Count</Label>
                          <span className="text-[#028A75] font-medium">
                            {formData.guestCount} guests
                          </span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600">
                            Venues will be filtered based on your guest count of{" "}
                            {formData.guestCount} guests.
                            {formData.guestCount > 100 && (
                              <span className="block mt-2 text-amber-600">
                                Note: Additional cost of ₱350 per guest over 100
                                applies ({formData.guestCount - 100} extra
                                guests ={" "}
                                {formatPrice((formData.guestCount - 100) * 350)}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          {venues.map((venue, index) => (
                            <Card
                              key={venue.venue_id}
                              className={cn(
                                "cursor-pointer transition-all duration-200 hover:shadow-md animate-fadeSlideIn",
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
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <CardTitle className="text-lg">
                                    {venue.venue_title}
                                  </CardTitle>
                                  {formData.venueId === venue.venue_id && (
                                    <CheckCircle className="h-5 w-5 text-[#028A75]" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {venue.venue_location}
                                </p>
                              </CardHeader>
                              <CardContent>
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
                                inclusions that have been added below.
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
                                    {formatPrice(calculateTotalPackagePrice())}
                                  </span>
                                  {formData.guestCount > 100 && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      Base:{" "}
                                      {formatPrice(
                                        selectedPackage?.package_price || 0
                                      )}{" "}
                                      + {formData.guestCount - 100} extra guests
                                      @ ₱350 each
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
                                      selectedVenue?.venue_price || 0
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
                                        calculateTotalPackagePrice()
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
                                    {formData.inclusions.map((inclusion) => {
                                      const isRemoved =
                                        formData.removedInclusions.some(
                                          (inc) =>
                                            inc.inclusion_id ===
                                            inclusion.inclusion_id
                                        );
                                      return (
                                        <div
                                          key={`review-inc-${inclusion.inclusion_id}`}
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
                                            {formatPrice(
                                              inclusion.inclusion_price
                                            )}
                                            {isRemoved && (
                                              <span className="text-xs ml-2">
                                                (Not included)
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
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
                                      (inclusion) => {
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
                                            key={`review-custom-${inclusion.inclusion_id}`}
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
                                              {formatPrice(
                                                inclusion.inclusion_price
                                              )}
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
                                      (service) => {
                                        const isRemoved =
                                          formData.removedInclusions.some(
                                            (inc) =>
                                              inc.inclusion_id ===
                                              service.inclusion_id
                                          );
                                        return (
                                          <div
                                            key={`review-service-${service.inclusion_id}`}
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
                                              {formatPrice(
                                                service.inclusion_price
                                              )}
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
                                            {formatPrice(custom.price)}
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
                        {formatPrice(calculateTotalPackagePrice())}
                      </p>
                      {formData.guestCount > 100 && (
                        <p className="text-xs text-gray-600">
                          Base: {formatPrice(selectedPackage.package_price)} +{" "}
                          {formData.guestCount - 100} extra guests
                        </p>
                      )}
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
                        {formatPrice(selectedVenue.venue_price)}
                      </p>
                    </div>
                  )}
                  {(selectedPackage || decideLater) && selectedVenue && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-600">Estimated Total</p>
                      <p className="text-xl font-bold text-[#028A75]">
                        {formatPrice(calculateTotalPackagePrice())}
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

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 animate-fadeIn">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="w-full sm:w-auto">
              {currentStep < steps.length ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceedToNextStep()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#028A75] hover:bg-[#028A75]/90"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !canProceedToNextStep()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#028A75] hover:bg-[#028A75]/90"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Creating Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Create Booking
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
        <DialogContent className="max-w-md mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Venue Details</DialogTitle>
          </DialogHeader>
          {modalVenue && (
            <div className="space-y-4">
              {/* Venue Images */}
              <div className="space-y-3">
                {modalVenue.venue_cover_photo && (
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={`http://localhost/events-api/${modalVenue.venue_cover_photo}`}
                      alt={modalVenue.venue_title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {modalVenue.venue_profile_picture && (
                    <img
                      src={`http://localhost/events-api/${modalVenue.venue_profile_picture}`}
                      alt={`${modalVenue.venue_title} profile`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  )}
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
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold flex items-center">
              <Package className="h-6 w-6 mr-2 text-[#028A75]" />
              {modalPackage?.package_title || "Package Details"}
            </DialogTitle>
          </DialogHeader>

          {modalPackage && (
            <div className="mt-4 space-y-8">
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
                    ₱350 per additional guest
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
                          key={index}
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
                        key={index}
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
                      {/* Venue Carousel */}
                      <div className="venue-carousel relative">
                        {/* Main Carousel */}
                        <div className="overflow-hidden rounded-xl">
                          <div className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide pb-4 mx-0">
                            {modalPackage.venue_previews.map((venue, index) => (
                              <div
                                key={index}
                                className="snap-start shrink-0 w-[85%] sm:w-[48%] md:w-[45%] px-2 transition-transform duration-300 hover:scale-[1.02]"
                              >
                                <div className="border rounded-xl overflow-hidden bg-white shadow-md hover:shadow-lg transition-all duration-300">
                                  <div className="h-48 sm:h-56 bg-gray-100 relative overflow-hidden">
                                    {venue.venue_cover_photo ? (
                                      <img
                                        src={`http://localhost/events-api/serve-image.php?path=${encodeURIComponent(venue.venue_cover_photo)}`}
                                        alt={venue.venue_title}
                                        className="w-full h-full object-cover transform transition-transform duration-500 hover:scale-110"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                        <MapPin className="h-10 w-10 text-gray-400" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="p-4">
                                    <h4 className="font-medium text-gray-900 text-lg">
                                      {venue.venue_title}
                                    </h4>
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
                                          showVenueDetails(venue);
                                        }}
                                        className="text-xs text-[#028A75] hover:text-[#028A75]/80 underline"
                                      >
                                        Details
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Indicator Dots */}
                        <div className="flex justify-center mt-4 space-x-2">
                          {modalPackage.venue_previews.map((_, index) => (
                            <div
                              key={index}
                              className={`w-2 h-2 rounded-full ${
                                index === 0 ? "bg-[#028A75]" : "bg-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              <div className="pt-6 mt-4 flex justify-center sm:justify-end">
                <Button
                  onClick={() => {
                    handlePackageSelect(modalPackage);
                    setPackageDetailsModalOpen(false);
                  }}
                  className="bg-[#028A75] hover:bg-[#028A75]/90 w-full sm:w-auto px-6 py-5 text-base font-medium transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg animate-fadeIn animation-delay-750 flex items-center justify-center gap-2"
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
