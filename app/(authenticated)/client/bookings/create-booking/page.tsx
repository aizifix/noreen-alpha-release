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
import {
  Calendar as CalendarIcon,
  Clock,
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
}

interface BookingFormData {
  eventType: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  packageId: number | null;
  venueId: number | null;
  notes: string;
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
    startTime: "10:00",
    endTime: "18:00",
    guestCount: 50,
    packageId: preselectedPackageId ? parseInt(preselectedPackageId) : null,
    venueId: null,
    notes: "",
  });

  // Data fetching state
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [decideLater, setDecideLater] = useState(false);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);

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

  // Steps configuration
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

  // Check for event conflicts
  const checkForConflicts = useCallback(async () => {
    if (!formData.eventDate || !formData.startTime || !formData.endTime) return;

    setIsCheckingConflicts(true);
    try {
      const response = await axios.post(
        "http://localhost/events-api/client.php",
        {
          operation: "checkEventConflicts",
          event_date: formData.eventDate,
          start_time: formData.startTime,
          end_time: formData.endTime,
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
  }, [formData.eventDate, formData.startTime, formData.endTime]);

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
        event_time: formData.startTime,
        guest_count: formData.guestCount,
        package_id: formData.packageId,
        venue_id: formData.venueId,
        notes: formData.notes,
        booking_status: "pending",
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
      setCurrentStep(currentStep + 1);
      // Fetch venues when moving to step 3
      if (currentStep + 1 === 3) {
        fetchVenues(formData.packageId);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
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
    }));
    // Also fetch venues for this package
    fetchVenues(pkg.package_id);
    console.log("Selected package and auto-populated:", {
      packageId: pkg.package_id,
      eventType: pkg.event_type_names[0],
    });
  };

  const handleDecideLater = () => {
    setDecideLater(true);
    setSelectedPackage(null);
    setFormData((prev) => ({
      ...prev,
      packageId: null,
      eventType: "", // Reset event type so user can choose manually
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
        const isTimeValid = Boolean(formData.startTime && formData.endTime);

        // Validate time range
        let isTimeRangeValid = true;
        if (isTimeValid) {
          const start = new Date(`2000-01-01T${formData.startTime}`);
          const end = new Date(`2000-01-01T${formData.endTime}`);
          isTimeRangeValid = start < end;
        }

        // Log validation state for debugging
        console.log("Step 2 Validation:", {
          isEventTypeValid,
          isEventNameValid,
          isEventDateValid,
          isTimeValid,
          isTimeRangeValid,
          hasConflicts,
          eventType: formData.eventType,
          eventName: formData.eventName,
          eventDate: formData.eventDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
        });

        return (
          isEventTypeValid &&
          isEventNameValid &&
          isEventDateValid &&
          isTimeValid &&
          isTimeRangeValid &&
          !hasConflicts
        );
      case 3:
        return formData.venueId !== null && formData.guestCount > 0;
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
                                      ₱{pkg.package_price.toLocaleString()}
                                    </span>
                                    <div className="flex items-center text-sm text-gray-600">
                                      <Users className="h-4 w-4 mr-1" />
                                      {pkg.guest_capacity} guests
                                    </div>
                                  </div>
                                  <div className="flex justify-between text-sm text-gray-600">
                                    <span>
                                      {pkg.components?.length || 0} components
                                    </span>
                                    <span>
                                      {pkg.freebies?.length || 0} freebies
                                    </span>
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
                                ₱
                                {selectedPackage.package_price.toLocaleString()}
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

                      {/* Time Selection */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2 animate-fadeSlideIn animation-delay-600">
                          <Label>Start Time *</Label>
                          <Input
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => {
                              const newStartTime = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                startTime: newStartTime,
                              }));
                              // Check for conflicts immediately when time changes
                              if (formData.eventDate) {
                                checkForConflicts();
                              }
                            }}
                            className={cn(
                              !formData.startTime &&
                                "border-red-200 focus:ring-red-500"
                            )}
                          />
                          {!formData.startTime && (
                            <p className="text-xs text-red-600 mt-1">
                              Please select a start time
                            </p>
                          )}
                        </div>
                        <div className="space-y-2 animate-fadeSlideIn animation-delay-750">
                          <Label>End Time *</Label>
                          <Input
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => {
                              const newEndTime = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                endTime: newEndTime,
                              }));
                              // Check for conflicts immediately when time changes
                              if (formData.eventDate) {
                                checkForConflicts();
                              }
                            }}
                            className={cn(
                              !formData.endTime &&
                                "border-red-200 focus:ring-red-500"
                            )}
                          />
                          {!formData.endTime && (
                            <p className="text-xs text-red-600 mt-1">
                              Please select an end time
                            </p>
                          )}
                        </div>
                        {formData.startTime &&
                          formData.endTime &&
                          new Date(`2000-01-01T${formData.startTime}`) >=
                            new Date(`2000-01-01T${formData.endTime}`) && (
                            <div className="sm:col-span-2">
                              <p className="text-xs text-red-600">
                                End time must be after start time
                              </p>
                            </div>
                          )}
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
                                <div key={index} className="text-sm">
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
                      {/* Guest Count */}
                      <div className="space-y-2 animate-fadeSlideIn animation-delay-150">
                        <Label>Expected Guest Count *</Label>
                        <Input
                          type="number"
                          value={formData.guestCount}
                          onChange={(e) => {
                            const newGuestCount = parseInt(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              guestCount: newGuestCount,
                            }));
                            // Refetch venues when guest count changes
                            setTimeout(() => {
                              fetchVenues(formData.packageId);
                            }, 500);
                          }}
                          min="1"
                          max="1000"
                          placeholder="Enter number of guests"
                        />
                        <p className="text-sm text-gray-600">
                          Venues will be filtered based on your guest count
                        </p>
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
                              <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                                <img
                                  src={
                                    venue.venue_cover_photo ||
                                    "/placeholder.jpg"
                                  }
                                  alt={venue.venue_title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
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
                                <div className="flex justify-between items-center">
                                  <span className="text-lg font-bold text-[#028A75]">
                                    ₱{venue.venue_price.toLocaleString()}
                                  </span>
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Users className="h-4 w-4 mr-1" />
                                    {venue.venue_capacity} capacity
                                  </div>
                                </div>
                                {formData.guestCount > venue.venue_capacity && (
                                  <div className="mt-2 text-xs text-red-600 flex items-center">
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

                  {/* Step 4: Review & Confirm */}
                  {currentStep === 4 && (
                    <div className="space-y-6 animate-fadeSlideIn">
                      <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
                        <h3 className="text-base sm:text-lg font-semibold mb-4 animate-fadeSlideIn animation-delay-150">
                          Booking Summary
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div className="animate-fadeSlideIn animation-delay-300">
                            <h4 className="font-medium mb-2">Event Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Event Type:</span>
                                <span className="font-medium">
                                  {formData.eventType}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Event Name:</span>
                                <span className="font-medium">
                                  {formData.eventName}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Date:</span>
                                <span className="font-medium">
                                  {selectedDate
                                    ? format(selectedDate, "PPP")
                                    : "Not selected"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Time:</span>
                                <span className="font-medium">
                                  {formData.startTime} - {formData.endTime}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Guest Count:</span>
                                <span className="font-medium">
                                  {formData.guestCount}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="animate-fadeSlideIn animation-delay-450">
                            <h4 className="font-medium mb-2">
                              Package & Venue
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Package:</span>
                                <span className="font-medium">
                                  {selectedPackage?.package_title}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Package Price:</span>
                                <span className="font-medium">
                                  ₱
                                  {selectedPackage?.package_price.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Venue:</span>
                                <span className="font-medium">
                                  {selectedVenue?.venue_title}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Venue Price:</span>
                                <span className="font-medium">
                                  ₱{selectedVenue?.venue_price.toLocaleString()}
                                </span>
                              </div>
                              <div className="border-t pt-2 mt-2">
                                <div className="flex justify-between font-bold">
                                  <span>Total Estimate:</span>
                                  <span className="text-[#028A75]">
                                    ₱
                                    {(
                                      (selectedPackage?.package_price || 0) +
                                      (selectedVenue?.venue_price || 0)
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 animate-fadeSlideIn animation-delay-600">
                          <Label>Additional Notes</Label>
                          <Textarea
                            value={formData.notes}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                            placeholder="Any special requests or notes..."
                            rows={3}
                          />
                        </div>
                      </div>

                      <Alert className="animate-fadeSlideIn animation-delay-750">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
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
                  {formData.startTime && formData.endTime && (
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-medium">
                        {formData.startTime} - {formData.endTime}
                      </p>
                    </div>
                  )}
                  {selectedPackage && (
                    <div>
                      <p className="text-sm text-gray-600">Package</p>
                      <p className="font-medium">
                        {selectedPackage.package_title}
                      </p>
                      <p className="text-sm text-[#028A75]">
                        ₱{selectedPackage.package_price.toLocaleString()}
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
                        ₱{selectedVenue.venue_price.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {(selectedPackage || decideLater) && selectedVenue && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-600">Estimated Total</p>
                      <p className="text-xl font-bold text-[#028A75]">
                        ₱
                        {(
                          (selectedPackage?.package_price || 0) +
                          (selectedVenue?.venue_price || 0)
                        ).toLocaleString()}
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
    </div>
  );
}
