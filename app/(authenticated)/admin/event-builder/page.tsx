"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { secureStorage } from "@/app/utils/encryption";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiStepWizard } from "@/app/components/admin/event-builder/multi-step-wizard";
import { ClientDetailsStep } from "@/app/components/admin/event-builder/client-details-step";
import { EventDetailsStep } from "@/app/components/admin/event-builder/event-details-step";
import { PackageSelection } from "@/app/components/admin/event-builder/package-selection";
import { PackageSelectionFallback } from "@/app/components/admin/event-builder/package-selection-fallback";
import { PackageDetails } from "@/app/components/admin/event-builder/package-details";
import { VenueSelection } from "@/app/components/admin/event-builder/venue-selection";
import { ComponentCustomization } from "@/app/components/admin/event-builder/components-customization";
import { BudgetTracking } from "@/app/components/admin/event-builder/budget-tracking";
import { PaymentStep } from "@/app/components/admin/event-builder/payment-step";
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

// Function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

// Define types for our data structures
interface EventData {
  eventTitle: string;
  eventDate: string;
  eventId: string;
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

  // Add current step state
  const [currentStep, setCurrentStep] = useState(1);

  // Use refs to track initialization state
  const initializedRef = useRef(false);
  const packageVenuesInitializedRef = useRef<string | null>(null);

  // State for booking reference lookup
  const [bookingReference, setBookingReference] = useState<string>(
    bookingRefFromUrl || ""
  );
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);

  // State to track if wedding packages are available
  const [packagesAvailable, setPackagesAvailable] = useState(true);

  const [clientData, setClientData] = useState<ClientData>({
    id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [eventDetails, setEventDetails] = useState<EventDetails>({
    title: "",
    type: "wedding",
    date: "",
    startTime: "",
    endTime: "",
    capacity: 100,
    notes: "",
    venue: "",
    package: "",
  });

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [components, setComponents] = useState<DataPackageComponent[]>([]);
  const [originalPackagePrice, setOriginalPackagePrice] = useState<
    number | null
  >(null);
  const [selectedOrganizers, setSelectedOrganizers] = useState<string[]>([]);
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
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [showMissingRefDialog, setShowMissingRefDialog] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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

  // Load all venues as fallback
  const loadAllVenues = async () => {
    try {
      const response = await axios.get(
        "http://localhost/events-api/admin.php?operation=getAllVenues"
      );
      if (response.data.status === "success") {
        console.log("Loaded all venues:", response.data.venues);
        setAllVenues(response.data.venues);
      }
    } catch (error) {
      console.error("Error loading all venues:", error);
    }
  };

  // Load all venues on component mount
  useEffect(() => {
    loadAllVenues();
  }, []);

  // Check if wedding packages are available
  useEffect(() => {
    if (!weddingPackages || weddingPackages.length === 0) {
      setPackagesAvailable(false);
      console.error("Wedding packages data is not available");
    }
  }, []);

  // Auto-load booking data if booking_ref is provided in URL
  useEffect(() => {
    if (bookingRefFromUrl && !initializedRef.current) {
      initializedRef.current = true;
      lookupBookingByReference();
    }
  }, [bookingRefFromUrl]);

  // Calculate total budget based on package, venue, guest count, and extras
  const getTotalBudget = () => {
    let baseBudget = 0;
    let venueCost = 0;
    let extraComponentCost = 0;

    // Use original package price if available from API
    if (originalPackagePrice !== null && originalPackagePrice > 0) {
      baseBudget = originalPackagePrice;
    } else {
      // Fallback to static package data
      let selectedPackage = weddingPackages.find(
        (pkg) => pkg.id === selectedPackageId
      );
      if (!selectedPackage) {
        selectedPackage = eventPackages.find(
          (pkg) => pkg.id === selectedPackageId
        ) as (typeof weddingPackages)[number] | undefined;
      }
      if (selectedPackage) {
        baseBudget = selectedPackage.allocatedBudget || selectedPackage.price;
      }
    }

    // Calculate venue cost including inclusions
    if (selectedVenue) {
      // Use calculated total_venue_price if available from API
      if (selectedVenue.total_venue_price) {
        venueCost = parseFloat(selectedVenue.total_venue_price);
      } else {
        // Fallback calculation
        venueCost = parseFloat(selectedVenue.venue_price) || 0;
        if (
          selectedVenue.inclusions &&
          Array.isArray(selectedVenue.inclusions)
        ) {
          venueCost += selectedVenue.inclusions.reduce(
            (sum: number, inclusion: any) => {
              return sum + (parseFloat(inclusion.inclusion_price) || 0);
            },
            0
          );
        }
      }
    } else if (selectedVenueId && packageVenues.length > 0) {
      // If venue ID is selected but selectedVenue object isn't set yet
      const venue = packageVenues.find(
        (v) => String(v.venue_id) === String(selectedVenueId)
      );
      if (venue) {
        venueCost = parseFloat(venue.venue_price) || 0;
        if (venue.inclusions && Array.isArray(venue.inclusions)) {
          venueCost += venue.inclusions.reduce(
            (sum: number, inclusion: any) => {
              return sum + (parseFloat(inclusion.inclusion_price) || 0);
            },
            0
          );
        }
      }
    }

    // Add price of any custom components (isCustom)
    extraComponentCost = components
      .filter((comp) => comp.isCustom && comp.included !== false)
      .reduce((sum, comp) => sum + comp.price, 0);

    return baseBudget + venueCost + extraComponentCost;
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
  const handleClientDataUpdate = (data: ClientData) => {
    setClientData(data);
  };

  // Handle event details update
  const handleEventDetailsUpdate = (details: Partial<EventDetails>) => {
    console.log("Updating event details:", details);
    setEventDetails((prev: EventDetails) => ({
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
  };

  // Handle package selection
  const handlePackageSelect = async (packageId: string) => {
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
          setPackageVenues(packageData.venues);
          packageVenuesInitializedRef.current = packageId;

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

              // Add venue inclusions if they exist
              if (matchingVenue.inclusions) {
                const venueInclusions = (matchingVenue.inclusions || []).map(
                  (inclusion: any, idx: number) => ({
                    id: `venue-inclusion-${inclusion.inclusion_id || idx}`,
                    name: inclusion.inclusion_name,
                    price: parseFloat(inclusion.inclusion_price) || 0,
                    category: "venue",
                    included: true,
                    isVenueInclusion: true,
                    isRemovable: false,
                    isExpanded: false,
                  })
                );

                // Add venue inclusions to existing package components
                setComponents((prev) => [
                  ...prev.filter(
                    (comp) =>
                      !(comp.category === "venue" && comp.isVenueInclusion)
                  ),
                  ...venueInclusions,
                ]);
              }

              // Update event details with venue name
              setEventDetails((prev: EventDetails) => ({
                ...prev,
                venue: matchingVenue.venue_title || "",
              }));

              // Skip venue selection step and go to components
              console.log("Auto-selected venue, skipping to components step");
              setCurrentStep(5);
              return;
            } else {
              console.log("No matching venue found in package venues");
            }
          }
        } else {
          console.log("No venues in package or already initialized");
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

        // Move to venue selection step
        setCurrentStep(4);
      }
    } catch (error) {
      console.error("Error fetching package details:", error);
      toast({
        title: "Error",
        description: "Failed to load package details. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  // Handle venue selection
  const handleVenueSelect = (venueId: string) => {
    setSelectedVenueId(venueId);
  };

  // Handle component updates
  const handleComponentsUpdate = (
    updatedComponents: DataPackageComponent[]
  ) => {
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
  };

  // Handle payment data update
  const handlePaymentDataUpdate = (data: Partial<PaymentData>) => {
    setPaymentData((prev: PaymentData) => ({ ...prev, ...data }));
  };

  // Handle timeline updates
  const handleTimelineUpdate = (timeline: TimelineItem[]) => {
    setTimelineData(timeline);
  };

  const handleWeddingFormUpdate = (data: any) => {
    setWeddingFormData(data);
  };

  // Get organizer names from IDs
  const getOrganizerNames = () => {
    if (selectedOrganizers.length === 0) {
      return ["Noreen Lagdamin (Default)"];
    }

    return selectedOrganizers.map((id) => {
      const organizer = organizers.find((org) => org.id === id);
      return organizer ? organizer.name : "Unknown Organizer";
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
    return eventPkg ? eventPkg.name : "Custom Package";
  };

  const handleComplete = async () => {
    // Check if reference number is required but missing
    if (
      (paymentData.downPaymentMethod === "gcash" ||
        paymentData.downPaymentMethod === "bank-transfer") &&
      !paymentData.referenceNumber
    ) {
      setShowMissingRefDialog(true);
      return;
    }

    // Validate client data
    if (!clientData.id) {
      toast({
        title: "Error",
        description: "Please select a client before creating an event.",
        variant: "destructive",
      });
      return;
    }

    // Validate event details
    if (!eventDetails.title || !eventDetails.date) {
      toast({
        title: "Error",
        description: "Please fill in event title and date.",
        variant: "destructive",
      });
      return;
    }

    // Validate package selection
    if (!selectedPackageId) {
      toast({
        title: "Error",
        description: "Please select a package for the event.",
        variant: "destructive",
      });
      return;
    }

    // Get admin user data from secure storage
    const userData = secureStorage.getItem("user");
    if (!userData || !userData.user_id) {
      toast({
        title: "Error",
        description: "Admin user information not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare event data for API
      const eventData = {
        operation: "createEvent",
        original_booking_reference: bookingReference || null, // Include booking reference if present
        user_id: parseInt(clientData.id), // Client ID
        admin_id: parseInt(userData.user_id), // Admin ID
        organizer_id:
          selectedOrganizers.length > 0 && selectedOrganizers[0]
            ? isNaN(parseInt(selectedOrganizers[0]))
              ? null
              : parseInt(selectedOrganizers[0])
            : null,
        event_title: eventDetails.title || "New Event",
        event_type_id: getEventTypeIdFromName(eventDetails.type),
        guest_count: parseInt(eventDetails.capacity.toString()) || 100,
        event_date: eventDetails.date,
        start_time: eventDetails.startTime || "10:00",
        end_time: eventDetails.endTime || "18:00",
        package_id: selectedPackageId ? parseInt(selectedPackageId) : null,
        venue_id: selectedVenueId ? parseInt(selectedVenueId) : null,
        total_budget: parseFloat(getTotalBudget().toString()) || 0,
        down_payment: parseFloat(paymentData.downPayment.toString()) || 0,
        payment_method: paymentData.downPaymentMethod || "cash",
        payment_schedule_type_id: paymentData.scheduleTypeId || 2,
        reference_number: paymentData.referenceNumber || null,
        additional_notes: eventDetails.notes || null,
        event_status: "draft",
        components: components.map((comp, index) => ({
          component_name: comp.name || "",
          component_price: parseFloat(comp.price?.toString() || "0") || 0,
          component_description: (comp as any).description || "",
          is_custom: comp.isCustom || false,
          is_included: comp.included !== false,
          original_package_component_id: (comp as any).originalId || null,
          display_order: index,
        })),
        timeline: timelineData.map((item, index) => ({
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
        })),
      };

      console.log("Creating event with data:", eventData);

      // Call API to create event
      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        eventData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("API Response:", response.data);

      if (response.data.status === "success") {
        // Show success UI and confetti
        showConfetti();

        // If this was created from a booking, show additional success message
        if (bookingReference) {
          toast({
            title: "Event Created & Booking Confirmed",
            description: `Event created successfully from booking ${bookingReference}. The booking status has been updated to converted.`,
          });
        } else {
          toast({
            title: "Event Created",
            description: "Event created successfully!",
          });
        }

        // Update event data with returned event ID or generated one
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

        setShowSuccessModal(true);

        // Log transaction
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
        // Show error toast
        console.error("API Error Response:", response.data);
        toast({
          title: "Error",
          description:
            response.data.message ||
            "Failed to create event. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("API error:", error);
      // Log more details about the error
      if (axios.isAxiosError(error)) {
        console.error("Response data:", error.response?.data);
        console.error("Response status:", error.response?.status);
        console.error("Response headers:", error.response?.headers);

        // Show more specific error message
        const errorMessage =
          error.response?.data?.message ||
          (error.response?.status === 500
            ? "Server error occurred. Please check server logs."
            : error.response?.status === 404
              ? "API endpoint not found."
              : error.response?.status === 403
                ? "Access forbidden."
                : "Failed to connect to server.");

        toast({
          title: "API Error",
          description: `${errorMessage} (Status: ${error.response?.status || "Unknown"})`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Network Error",
          description:
            "Failed to connect to server. Please check your internet connection and try again.",
          variant: "destructive",
        });
      }
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

  // Add logic for venue selection step to enforce venue budget
  // Calculate total inclusion/component cost
  const totalInclusionCost = components
    .filter((comp) => comp.category !== "venue")
    .reduce((sum, comp) => sum + (comp.price || 0), 0);
  const packagePrice = originalPackagePrice || 0;
  const remainingBudget = packagePrice - totalInclusionCost;

  // Update the steps array with proper typing
  const steps: Step[] = [
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

              // If coming from a booking with a package, skip event details step and go to package selection
              if (eventDetails.package) {
                console.log(
                  "Booking has package, skipping to package selection"
                );
                setCurrentStep(3);
              } else {
                setCurrentStep(2);
              }
            } else {
              setCurrentStep(2);
            }
          }}
        />
      ),
    },
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

            // Check if there are conflicts
            if (eventDetails.hasConflicts) {
              toast({
                title: "Scheduling Conflict",
                description:
                  "Please choose a different date or time to avoid conflicts",
                variant: "destructive",
              });
              return;
            }

            // Check if this is a wedding event and insert wedding form step
            if (eventDetails.type === "wedding") {
              setCurrentStep(3); // Go to wedding form step
            } else {
              setCurrentStep(4); // Skip wedding form for non-wedding events
            }
          }}
        />
      ),
    },
    // Wedding Form Step (only for wedding events)
    ...(eventDetails.type === "wedding"
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
                onNext={() => setCurrentStep(4)}
              />
            ),
          },
        ]
      : []),
    {
      id: "package-selection",
      title: "Package Selection",
      description: "Choose a package",
      component: packagesAvailable ? (
        <PackageSelection
          eventType={eventDetails.type}
          onSelect={handlePackageSelect}
          initialPackageId={selectedPackageId}
        />
      ) : (
        <PackageSelectionFallback
          onSelect={handlePackageSelect}
          initialPackageId={selectedPackageId}
        />
      ),
    },
    {
      id: "venue-selection",
      title: "Venue Selection",
      description: "Choose a venue",
      component: (
        <VenueSelection
          eventType={eventDetails.type}
          venues={packageVenues.length > 0 ? packageVenues : allVenues}
          initialVenueId={selectedVenueId || undefined}
          onSelect={(venueId, packageId, guestCount) => {
            setSelectedVenueId(venueId);
            // Look for venue in the appropriate list
            const venueList =
              packageVenues.length > 0 ? packageVenues : allVenues;
            const venue = venueList.find(
              (v) => String(v.venue_id) === String(venueId)
            );
            setSelectedVenue(venue || null);

            // Update event details with venue name and guest count
            setEventDetails((prev: EventDetails) => ({
              ...prev,
              venue: venue?.venue_title || "",
              capacity: guestCount,
            }));

            console.log(
              "Venue selected:",
              venue?.venue_title,
              "Guest count:",
              guestCount
            );

            // Move to next step after selection
            const nextStep = eventDetails.type === "wedding" ? 6 : 5;
            setCurrentStep(nextStep);
          }}
        />
      ),
    },
    {
      id: "components",
      title: "Components",
      description: "Customize components",
      component: (
        <ComponentCustomization
          components={components}
          selectedVenue={selectedVenue}
          onUpdate={handleComponentsUpdate}
          onNext={() => {
            const nextStep = eventDetails.type === "wedding" ? 7 : 6;
            setCurrentStep(nextStep);
          }}
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
          components={components}
          suppliers={{}}
          updateData={handleTimelineUpdate}
          onNext={() => {
            const nextStep = eventDetails.type === "wedding" ? 8 : 7;
            setCurrentStep(nextStep);
          }}
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
          onNext={() => {
            const nextStep = eventDetails.type === "wedding" ? 9 : 8;
            setCurrentStep(nextStep);
          }}
        />
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Event Builder</h1>
        {bookingId && (
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm">
            Booking: {bookingId}
          </div>
        )}
      </div>

      {/* Add booking reference lookup */}
      {/* <div className="p-4 bg-muted rounded-lg">
        <h2 className="text-lg font-semibold mb-2">
          Look up booking by reference
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter booking reference (e.g., BK-20250521-6340)"
            value={bookingReference}
            onChange={(e) => setBookingReference(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <Button onClick={lookupBookingByReference} disabled={lookupLoading}>
            {lookupLoading ? "Searching..." : "Look up"}
          </Button>
                    </div>
      </div> */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <MultiStepWizard steps={steps} onComplete={handleComplete} />
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-6 sticky top-4">
            <Card className="p-4">
              <h3 className="text-lg font-medium mb-4">Event Summary</h3>
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
                {eventDetails.date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {new Date(eventDetails.date).toLocaleDateString()}
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
                    {getOrganizerNames().map((name, index) => (
                      <div key={index} className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
                {selectedPackageId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Package</p>
                    <p className="font-medium">{getSelectedPackageName()}</p>
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
                    <p className="font-medium capitalize">
                      {paymentData.cashBondStatus}
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
                onClick={() => {
                  toast({
                    title: "Draft Saved",
                    description: "The event draft has been saved.",
                  });
                }}
              >
                Save as Draft
              </Button>
            </div>
          </div>
        </div>
      </div>

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

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onDashboard={() => router.push("/admin/dashboard")}
        eventDetails={eventData}
      />
    </div>
  );
}
