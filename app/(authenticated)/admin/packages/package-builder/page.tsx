"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Check, ArrowLeft } from "lucide-react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiStepWizard } from "@/app/components/admin/event-builder/multi-step-wizard";
import { secureStorage } from "@/app/utils/encryption";
import { BudgetBreakdown } from "./budget-breakdown";
import { VenueSelection } from "./venue-selection";
import { PackageInclusionsStep } from "./package-inclusions-step";
import { FreebiesStepFixed } from "./freebies-step-fixed";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { showConfetti } from "@/app/libs/confetti";

// Update interfaces to match between components
interface Component {
  name: string;
}

interface Inclusion {
  name: string;
  price: string | number;
  components: Component[];
}

interface EventType {
  event_type_id: number;
  event_name: string;
  event_description: string | null;
}

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_details: string;
  venue_location: string;
  venue_capacity: number;
  venue_profile_picture: string;
  total_price: number;
}

interface VenueInclusion {
  inclusion_id: number;
  inclusion_name: string;
  inclusion_price: number;
}

interface Freebie {
  freebie_name: string;
  freebie_description?: string;
  freebie_value?: number;
}

// Update FreebiesStep props
interface FreebiesStepProps {
  freebies: Freebie[];
  setFreebies: (freebies: Freebie[]) => void;
  onNext: () => void;
}

// Step interface to match event builder
interface Step {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

export default function PackageBuilderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [countdownInterval, setCountdownInterval] =
    useState<NodeJS.Timeout | null>(null);

  // Package details state
  const [packageTitle, setPackageTitle] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [packagePrice, setPackagePrice] = useState<number | string>("");
  const [guestCount, setGuestCount] = useState<number>(100);

  // Optimized handlers for package details to prevent unnecessary re-renders
  const handlePackageTitleChange = useCallback((value: string) => {
    setPackageTitle(value);
  }, []);

  const handlePackageDescriptionChange = useCallback((value: string) => {
    setPackageDescription(value);
  }, []);

  const handlePackagePriceChange = useCallback((value: string) => {
    setPackagePrice(value);
  }, []);

  const handleGuestCountChange = useCallback((value: number) => {
    setGuestCount(value);
  }, []);

  // Event types state - Initialize as empty array to prevent map errors
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<number[]>([]);

  // Add venue state - Initialize as empty array to prevent map errors
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<number[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venuesError, setVenuesError] = useState<string | null>(null);

  // Calculate total venue cost - memoized to prevent unnecessary re-renders
  const totalVenueCost = useMemo(() => {
    return selectedVenues.reduce((sum, venueId) => {
      const venue = venues.find((v) => v.venue_id === venueId);
      return sum + (venue?.total_price || 0);
    }, 0);
  }, [selectedVenues, venues]);

  // Cleanup countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  // Fetch event types when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching event types and venues...");

        // Fetch event types
        const eventTypesResponse = await axios.get(
          "http://localhost/events-api/admin.php",
          {
            params: { operation: "getEventTypes" },
          }
        );

        console.log("Event types response:", eventTypesResponse.data);
        if (eventTypesResponse.data.status === "success") {
          setEventTypes(eventTypesResponse.data.event_types);
          console.log("Event types set:", eventTypesResponse.data.event_types);
        } else {
          console.error("Event types error:", eventTypesResponse.data.message);
        }

        // Fetch venues
        setVenuesLoading(true);
        setVenuesError(null);

        const venuesResponse = await axios.get(
          "http://localhost/events-api/admin.php",
          {
            params: { operation: "getVenuesForPackage" },
          }
        );

        console.log("Venues response:", venuesResponse.data);
        if (venuesResponse.data.status === "success") {
          setVenues(venuesResponse.data.venues);
          console.log("Venues set:", venuesResponse.data.venues);
        } else {
          console.error("Venues error:", venuesResponse.data.message);
          setVenuesError(
            venuesResponse.data.message || "Failed to load venues"
          );
        }
      } catch (error) {
        console.error("API error:", error);
        setVenuesError("Failed to load venues. Please check your connection.");
        toast.error("Failed to load data. Please check your connection.");
      } finally {
        setVenuesLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle event type selection - Use useCallback to prevent re-renders
  const handleEventTypeChange = useCallback((eventTypeId: number) => {
    setSelectedEventTypes((prev) => {
      if (prev.includes(eventTypeId)) {
        return prev.filter((id) => id !== eventTypeId);
      } else {
        return [...prev, eventTypeId];
      }
    });
  }, []);

  // Inclusions state - Initialize with one empty inclusion
  const [inclusions, setInclusions] = useState<Inclusion[]>([
    {
      name: "",
      price: "",
      components: [
        {
          name: "",
        },
      ],
    },
  ]);

  // Freebies state - Initialize with one empty freebie
  const [freebies, setFreebies] = useState<Freebie[]>([{ freebie_name: "" }]);

  // Handle inclusion components - Use useCallback to prevent re-renders
  const addInclusion = useCallback(() => {
    setInclusions((prev) => [
      ...prev,
      {
        name: "",
        price: "",
        components: [
          {
            name: "",
          },
        ],
      },
    ]);
  }, []);

  const removeInclusion = useCallback((inclusionIndex: number) => {
    setInclusions((prev) =>
      prev.filter((_, index) => index !== inclusionIndex)
    );
  }, []);

  const updateInclusionName = useCallback(
    (inclusionIndex: number, name: string) => {
      setInclusions((prev) =>
        prev.map((inc, idx) =>
          idx === inclusionIndex ? { ...inc, name } : inc
        )
      );
    },
    []
  );

  const updateInclusionPrice = useCallback((index: number, value: string) => {
    setInclusions((prev) =>
      prev.map((inc, idx) => (idx === index ? { ...inc, price: value } : inc))
    );
  }, []);

  const addComponent = useCallback((inclusionIndex: number) => {
    setInclusions((prev) =>
      prev.map((inc, idx) =>
        idx === inclusionIndex
          ? { ...inc, components: [...inc.components, { name: "" }] }
          : inc
      )
    );
  }, []);

  const removeComponent = useCallback(
    (inclusionIndex: number, componentIndex: number) => {
      setInclusions((prev) =>
        prev.map((inc, idx) =>
          idx === inclusionIndex
            ? {
                ...inc,
                components: inc.components.filter(
                  (_, i) => i !== componentIndex
                ),
              }
            : inc
        )
      );
    },
    []
  );

  const updateComponentName = useCallback(
    (inclusionIndex: number, componentIndex: number, name: string) => {
      setInclusions((prev) =>
        prev.map((inc, idx) =>
          idx === inclusionIndex
            ? {
                ...inc,
                components: inc.components.map((comp, cidx) =>
                  cidx === componentIndex ? { ...comp, name } : comp
                ),
              }
            : inc
        )
      );
    },
    []
  );

  const handleAddFreebie = useCallback(() => {
    setFreebies((prev) => [...prev, { freebie_name: "" }]);
  }, []);

  const handleUpdateFreebie = useCallback((index: number, value: string) => {
    setFreebies((prev) =>
      prev.map((freebie, i) =>
        i === index ? { ...freebie, freebie_name: value } : freebie
      )
    );
  }, []);

  const handleRemoveFreebie = useCallback((index: number) => {
    setFreebies((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleVenueToggle = useCallback((venueId: number) => {
    setSelectedVenues((prev) => {
      if (prev.includes(venueId)) {
        return prev.filter((id) => id !== venueId);
      } else {
        return [...prev, venueId];
      }
    });
  }, []);

  const calculateRemainingBudget = () => {
    const packagePriceNum = Number(packagePrice) || 0;
    const inclusionsTotal = inclusions.reduce(
      (sum, inclusion) => sum + (Number(inclusion.price) || 0),
      0
    );
    // Don't subtract venue cost from package budget - venues are separate
    return packagePriceNum - inclusionsTotal;
  };

  const isBudgetValid = () => {
    // Allow negative budget for packages - venues are separate costs
    return true;
  };

  const createPackage = async () => {
    setLoading(true);

    try {
      const userData = JSON.parse(secureStorage.getItem("userData") || "{}");
      const adminId = userData.user_id;

      if (!adminId) {
        toast.error("Admin ID not found. Please log in again.");
        setLoading(false);
        return;
      }

      // Validate required fields
      if (!packageTitle.trim()) {
        toast.error("Package title is required");
        setLoading(false);
        return;
      }

      if (!packagePrice || Number(packagePrice) <= 0) {
        toast.error("Package price must be greater than 0");
        setLoading(false);
        return;
      }

      if (selectedEventTypes.length === 0) {
        toast.error("Please select at least one event type");
        setLoading(false);
        return;
      }

      if (selectedVenues.length === 0) {
        toast.error("Please select at least one venue");
        setLoading(false);
        return;
      }

      const packageData = {
        package_data: {
          package_title: packageTitle.trim(),
          package_description: packageDescription.trim(),
          package_price: Number(packagePrice),
          guest_capacity: guestCount,
          created_by: adminId,
        },
        components: inclusions
          .filter((inc) => inc.name.trim() !== "")
          .map((inc) => ({
            component_name: inc.name.trim(),
            component_description: inc.components
              .filter((comp) => comp.name.trim() !== "")
              .map((comp) => comp.name.trim())
              .join(", "),
            component_price: Number(inc.price) || 0,
          })),
        freebies: freebies
          .filter((f) => f.freebie_name.trim() !== "")
          .map((f) => ({
            freebie_name: f.freebie_name.trim(),
            freebie_description: f.freebie_description || "",
            freebie_value: f.freebie_value || 0,
          })),
        event_types: selectedEventTypes,
        venue_ids: selectedVenues,
      };

      console.log("Creating package with data:", packageData);

      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "createPackageWithVenues",
          ...packageData,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Package creation response:", response.data);

      if (response.data.status === "success") {
        console.log("Package created successfully, showing success modal");
        setShowSuccessModal(true);

        // Try to show confetti, but don't let it break the flow
        try {
          showConfetti();
        } catch (confettiError) {
          console.warn("Confetti failed to show:", confettiError);
        }

        toast.success("Package created successfully!");

        // Start countdown for auto-redirect
        setRedirectCountdown(3);
        const interval = setInterval(() => {
          setRedirectCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              router.push("/admin/packages");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setCountdownInterval(interval);
      } else {
        console.error("API Error:", response.data);
        toast.error(response.data.message || "Failed to create package");
      }
    } catch (error: any) {
      console.error("Create package error:", error);

      if (error.response) {
        // Server responded with error status
        console.error("Error response:", error.response.data);
        toast.error(error.response.data?.message || "Server error occurred");
      } else if (error.request) {
        // Request was made but no response received
        console.error("No response received:", error.request);
        toast.error("No response from server. Please check your connection.");
      } else {
        // Something else happened
        console.error("Error message:", error.message);
        toast.error("An error occurred while creating the package");
      }
    } finally {
      setLoading(false);
    }
  };

  const isPackageDetailsValid = () => {
    return (
      packageTitle.trim() !== "" &&
      packagePrice !== "" &&
      Number(packagePrice) > 0 &&
      guestCount > 0 &&
      selectedEventTypes.length > 0
    );
  };

  const isVenueSelectionValid = () => {
    return selectedVenues.length > 0;
  };

  const areInclusionsValid = () => {
    return (
      inclusions &&
      inclusions.some(
        (inclusion) =>
          inclusion.name.trim() !== "" && Number(inclusion.price) >= 0
      )
    );
  };

  const areFreebiesValid = () => {
    return freebies && freebies.some((f) => f.freebie_name.trim() !== "");
  };

  const calculateTotalPrice = (): number => {
    const packagePriceNum = Number(packagePrice) || 0;
    const inclusionsTotal = (inclusions || []).reduce(
      (sum, inclusion) => sum + (Number(inclusion.price) || 0),
      0
    );
    const totalVenueCost = selectedVenues.reduce((sum, venueId) => {
      const venue = venues?.find((v) => v.venue_id === venueId);
      return sum + (venue?.total_price || 0);
    }, 0);

    return packagePriceNum + inclusionsTotal + totalVenueCost;
  };

  // Package Details Step Component
  const PackageDetailsStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block mb-2 font-medium">Package Title</label>
          <input
            type="text"
            value={packageTitle}
            onChange={(e) => handlePackageTitleChange(e.target.value)}
            placeholder="E.g., Premium Wedding Package"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Package Description</label>
          <textarea
            value={packageDescription}
            onChange={(e) => handlePackageDescriptionChange(e.target.value)}
            placeholder="Describe what this package offers"
            className="w-full border rounded px-3 py-2 h-24"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Package Price (₱)</label>
          <input
            type="number"
            value={packagePrice}
            onChange={(e) => handlePackagePriceChange(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Guest Capacity</label>
          <input
            type="number"
            value={guestCount}
            onChange={(e) => handleGuestCountChange(Number(e.target.value))}
            placeholder="100"
            min="1"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Event Types</label>
          <p className="text-gray-500 text-sm mb-2">
            Select which event types this package is suitable for
          </p>
          <div className="space-y-2 grid grid-cols-2">
            {eventTypes &&
              eventTypes.map((type) => (
                <div key={type.event_type_id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`event-type-${type.event_type_id}`}
                    checked={selectedEventTypes.includes(type.event_type_id)}
                    onChange={() => handleEventTypeChange(type.event_type_id)}
                    className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500"
                  />
                  <label
                    htmlFor={`event-type-${type.event_type_id}`}
                    className="text-gray-700"
                  >
                    {type.event_name}
                  </label>
                </div>
              ))}
          </div>
          {selectedEventTypes.length === 0 && (
            <p className="text-red-500 text-sm mt-1">
              Please select at least one event type
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Venue Selection Step Component
  const VenueSelectionStep = () => (
    <VenueSelection
      venues={venues}
      selectedVenueIds={selectedVenues}
      onVenueToggle={handleVenueToggle}
      loading={venuesLoading}
      error={venuesError}
    />
  );

  // Package Inclusions Step Component - Memoized wrapper to prevent re-renders
  const PackageInclusionsStepWrapper = useMemo(() => {
    return () => (
      <PackageInclusionsStep
        inclusions={inclusions}
        selectedVenues={selectedVenues}
        venues={venues}
        updateInclusionName={updateInclusionName}
        updateInclusionPrice={updateInclusionPrice}
        updateComponentName={updateComponentName}
        addComponent={addComponent}
        removeComponent={removeComponent}
        removeInclusion={removeInclusion}
        addInclusion={addInclusion}
      />
    );
  }, [
    inclusions,
    selectedVenues,
    venues,
    updateInclusionName,
    updateInclusionPrice,
    updateComponentName,
    addComponent,
    removeComponent,
    removeInclusion,
    addInclusion,
  ]);

  // Enhanced Freebies Step Component - Using fixed component with memoization
  const FreebiesStepWrapper = useMemo(() => {
    return () => (
      <FreebiesStepFixed freebies={freebies} setFreebies={setFreebies} />
    );
  }, [freebies, setFreebies]);

  // Review Step Component
  const ReviewStep = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Review Package Details</h3>

        {/* Package Details */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">Package Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Title</p>
              <p className="font-medium">{packageTitle}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Price</p>
              <p className="font-medium">
                ₱{Number(packagePrice).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Guest Capacity</p>
              <p className="font-medium">{guestCount} guests</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Event Types</p>
              <p className="font-medium">
                {selectedEventTypes
                  .map(
                    (id) =>
                      eventTypes.find((et) => et.event_type_id === id)
                        ?.event_name
                  )
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </div>
        </div>

        {/* Venue Selection */}
        {selectedVenues.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-2">Selected Venues</h4>
            <div className="space-y-2">
              {selectedVenues.map((venueId) => {
                const venue = venues?.find((v) => v.venue_id === venueId);
                return venue ? (
                  <div
                    key={venue.venue_id}
                    className="flex items-center space-x-4"
                  >
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden">
                      <img
                        src={
                          venue.venue_profile_picture
                            ? `http://localhost/events-api/${venue.venue_profile_picture}`
                            : "/placeholder-venue.jpg"
                        }
                        alt={venue.venue_title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{venue.venue_title}</p>
                      <p className="text-sm text-gray-600">
                        ₱{(venue.total_price || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Venue cost is for illustration only. Venue price is not enforced
              at this stage and will be validated during event creation.
            </p>
          </div>
        )}

        {/* Components */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">Components</h4>
          <div className="space-y-2">
            {inclusions &&
              inclusions.map((inclusion, index) => (
                <div
                  key={`inclusion-review-${index}`}
                  className="flex flex-col items-start"
                >
                  <div className="flex justify-between items-center w-full">
                    <p className="font-medium">{inclusion.name}</p>
                    <p className="font-medium">
                      ₱{Number(inclusion.price).toLocaleString()}
                    </p>
                  </div>
                  {inclusion.components.some(
                    (comp: Component) => comp.name.trim() !== ""
                  ) && (
                    <ul className="text-sm text-gray-600 list-disc list-inside ml-4">
                      {inclusion.components
                        .filter((comp: Component) => comp.name.trim() !== "")
                        .map((comp, i) => (
                          <li key={`component-review-${index}-${i}`}>
                            {comp.name}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Freebies */}
        {freebies && freebies.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-2">Freebies</h4>
            <ul className="list-disc list-inside space-y-1">
              {freebies.map((f, index) => (
                <li key={`freebie-review-${index}`} className="text-gray-600">
                  {f.freebie_name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Budget Breakdown */}
        <BudgetBreakdown
          packagePrice={Number(packagePrice)}
          selectedVenue={null}
          components={(inclusions || [])
            .filter((inc) => inc.name.trim() !== "")
            .map((inc) => ({
              name: inc.name,
              price: Number(inc.price) || 0,
            }))}
          freebies={(freebies || []).map((f) => f.freebie_name)}
        />
      </div>
    </div>
  );

  // Define steps array for MultiStepWizard
  const steps: Step[] = [
    {
      id: "package-details",
      title: "Package Details",
      description: "Basic information about the package",
      component: PackageDetailsStep(),
    },
    {
      id: "venue-selection",
      title: "Venue Selection",
      description: "Choose venues for this package",
      component: <VenueSelectionStep />,
    },
    {
      id: "package-inclusions",
      title: "Package Inclusions",
      description: "Add components and subcomponents",
      component: PackageInclusionsStepWrapper(),
    },
    {
      id: "freebies",
      title: "Freebies",
      description: "Add package freebies",
      component: FreebiesStepWrapper(),
    },
    {
      id: "review",
      title: "Review & Create",
      description: "Review and finalize package",
      component: <ReviewStep />,
    },
  ];

  const handleComplete = () => {
    console.log("handleComplete called - starting package creation");
    console.log("Current form state:", {
      packageTitle,
      packageDescription,
      packagePrice,
      guestCount,
      selectedEventTypes,
      selectedVenues,
      inclusions: inclusions.filter((inc) => inc.name.trim() !== ""),
      freebies: freebies.filter((f) => f.freebie_name.trim() !== ""),
    });
    createPackage();
  };

  return (
    <div className="max-w-6xl mx-auto py-10">
      <button
        onClick={() => router.push("/admin/packages")}
        className="mb-6 flex items-center text-sm text-gray-600 hover:text-gray-900 hover:underline"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Packages
      </button>

      <h1 className="text-3xl font-bold mb-6">Package Builder</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <MultiStepWizard steps={steps} onComplete={handleComplete} />
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-6 sticky top-4">
            <Card className="p-4">
              <h3 className="text-lg font-medium mb-4">Package Summary</h3>
              <div className="space-y-3">
                {packageTitle && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Package Title
                    </p>
                    <p className="font-medium">{packageTitle}</p>
                  </div>
                )}
                {packagePrice && (
                  <div>
                    <p className="text-sm text-muted-foreground">Base Price</p>
                    <p className="font-medium">
                      ₱{Number(packagePrice).toLocaleString()}
                    </p>
                  </div>
                )}
                {guestCount > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Guest Capacity
                    </p>
                    <p className="font-medium">{guestCount} guests</p>
                  </div>
                )}
                {selectedEventTypes.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Event Types</p>
                    <p className="font-medium">
                      {selectedEventTypes.length} type
                      {selectedEventTypes.length !== 1 ? "s" : ""} selected
                    </p>
                  </div>
                )}
                {selectedVenues.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Venues</p>
                    <p className="font-medium">
                      {selectedVenues.length} venue
                      {selectedVenues.length !== 1 ? "s" : ""} selected
                    </p>
                  </div>
                )}
                {inclusions &&
                  inclusions.some((inc) => inc.name.trim() !== "") && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Inclusions
                      </p>
                      <p className="font-medium">
                        {
                          inclusions.filter((inc) => inc.name.trim() !== "")
                            .length
                        }{" "}
                        inclusion
                        {inclusions.filter((inc) => inc.name.trim() !== "")
                          .length !== 1
                          ? "s"
                          : ""}
                      </p>
                    </div>
                  )}
                {freebies &&
                  freebies.some((f) => f.freebie_name.trim() !== "") && (
                    <div>
                      <p className="text-sm text-muted-foreground">Freebies</p>
                      <p className="font-medium">
                        {
                          freebies.filter((f) => f.freebie_name.trim() !== "")
                            .length
                        }{" "}
                        freebie
                        {freebies.filter((f) => f.freebie_name.trim() !== "")
                          .length !== 1
                          ? "s"
                          : ""}
                      </p>
                    </div>
                  )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mb-3"></div>
            <p className="text-gray-700">Creating your package...</p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Package Created Successfully! 🎉
              </h3>
              <p className="text-gray-600 mb-2">
                Your package "{packageTitle}" has been created and is now
                available for clients to book.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Redirecting to packages page in {redirectCountdown} seconds...
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    if (countdownInterval) {
                      clearInterval(countdownInterval);
                    }
                    router.push("/admin/packages");
                  }}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  View All Packages Now
                </button>
                <button
                  onClick={() => {
                    if (countdownInterval) {
                      clearInterval(countdownInterval);
                    }
                    setShowSuccessModal(false);
                    // Reset form for creating another package
                    setPackageTitle("");
                    setPackageDescription("");
                    setPackagePrice("");
                    setGuestCount(100);
                    setSelectedEventTypes([]);
                    setSelectedVenues([]);
                    setInclusions([
                      {
                        name: "",
                        price: "",
                        components: [{ name: "" }],
                      },
                    ]);
                    setFreebies([{ freebie_name: "" }]);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Create Another Package
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
