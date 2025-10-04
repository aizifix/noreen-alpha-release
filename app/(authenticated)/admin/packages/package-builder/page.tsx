"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Check, ArrowLeft } from "lucide-react";
import { apiClient } from "@/utils/apiClient";
import { endpoints } from "@/app/config/api";
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

  // Package details state
  const [packageTitle, setPackageTitle] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  // Package price is now calculated based on inclusions, so no state needed
  const [guestCount, setGuestCount] = useState<number>(100);

  // Package price lock state
  const [isPackageLocked, setIsPackageLocked] = useState(false);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);
  const [showOverageWarning, setShowOverageWarning] = useState(false);
  const [overageAmount, setOverageAmount] = useState(0);

  // Optimized handlers for package details to prevent unnecessary re-renders
  const handlePackageTitleChange = useCallback((value: string) => {
    setPackageTitle(value);
  }, []);

  const handlePackageDescriptionChange = useCallback((value: string) => {
    setPackageDescription(value);
  }, []);

  // Package price change handler removed since pricing is now based on inclusions

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

  // Fetch event types when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching event types and venues...");

        // Fetch event types
        const eventTypesResponse = await fetch(
          `${endpoints.admin}?operation=getEventTypes`
        );

        if (!eventTypesResponse.ok) {
          throw new Error(`HTTP error! status: ${eventTypesResponse.status}`);
        }

        const eventTypesData = await eventTypesResponse.json();
        console.log("Event types response:", eventTypesData);
        if (eventTypesData.status === "success") {
          setEventTypes(eventTypesData.event_types);
          console.log("Event types set:", eventTypesData.event_types);
        } else {
          console.error("Event types error:", eventTypesData.message);
        }

        // Fetch venues
        setVenuesLoading(true);
        setVenuesError(null);

        const venuesResponse = await fetch(
          `${endpoints.admin}?operation=getVenuesForPackage`
        );

        if (!venuesResponse.ok) {
          throw new Error(`HTTP error! status: ${venuesResponse.status}`);
        }

        const venuesData = await venuesResponse.json();
        console.log("Venues response:", venuesData);
        if (venuesData.status === "success") {
          setVenues(venuesData.venues);
          console.log("Venues set:", venuesData.venues);
        } else {
          console.error("Venues error:", venuesData.message);
          setVenuesError(venuesData.message || "Failed to load venues");
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

  const updateInclusionSupplier = useCallback(
    (
      inclusionIndex: number,
      supplierId: number | null,
      offerId: number | null,
      isManual: boolean
    ) => {
      setInclusions((prev) =>
        prev.map((inclusion, index) =>
          index === inclusionIndex
            ? {
                ...inclusion,
                supplier_id: supplierId,
                offer_id: offerId,
                is_manual: isManual,
              }
            : inclusion
        )
      );
    },
    []
  );

  const updateInclusionTier = useCallback(
    (inclusionIndex: number, tierLevel: number) => {
      setInclusions((prev) =>
        prev.map((inclusion, index) =>
          index === inclusionIndex
            ? {
                ...inclusion,
                tier_level: tierLevel,
              }
            : inclusion
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
    const inclusionsTotal = inclusions.reduce(
      (sum, inclusion) => sum + (Number(inclusion.price) || 0),
      0
    );
    // Return total inclusions cost since package price is now based on inclusions
    return inclusionsTotal;
  };

  const isBudgetValid = () => {
    const remainingBudget = calculateRemainingBudget();
    // Allow negative budget but warn about overage
    return true;
  };

  const handleOverageWarning = (overage: number) => {
    // Since we removed fixed pricing, this function is no longer needed
    // but kept for compatibility with BudgetBreakdown component
  };

  const validatePackagePricing = () => {
    const inclusionsTotal = inclusions.reduce(
      (sum, inclusion) => sum + (Number(inclusion.price) || 0),
      0
    );

    // Since package price is now based on inclusions, we just need to ensure there are inclusions
    if (inclusionsTotal <= 0) {
      return {
        isValid: false,
        overage: 0,
        message:
          "No inclusions with valid prices found. Please add at least one inclusion with a price.",
      };
    }

    return { isValid: true, overage: 0, message: "" };
  };

  const createPackage = async () => {
    setLoading(true);

    try {
      const userData = secureStorage.getItem("user");
      const adminId = userData?.user_id;

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

      // Package price is now calculated based on inclusions, so no validation needed here

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

      // Check for budget validation
      const pricingValidation = validatePackagePricing();
      if (!pricingValidation.isValid) {
        const userConfirmed = window.confirm(
          `Warning: ${pricingValidation.message}\n\nDo you want to proceed anyway? This means you'll have a budget overage that needs to be managed.`
        );

        if (!userConfirmed) {
          setLoading(false);
          return;
        }
      }

      const packageData = {
        operation: "createPackageWithVenues",
        package_data: {
          package_title: packageTitle.trim(),
          package_description: packageDescription.trim(),
          package_price: 0, // Will be calculated based on inclusions
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

      // Calculate total package price based on inclusions
      const totalInclusionsPrice = inclusions
        .filter((inc) => inc.name.trim() !== "")
        .reduce((sum, inc) => sum + (Number(inc.price) || 0), 0);

      // Update package price to be the sum of inclusions
      packageData.package_data.package_price = totalInclusionsPrice;

      console.log("Creating package with data:", packageData);

      const response = await fetch(`${endpoints.admin}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(packageData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Package creation response:", responseData);

      if (responseData.status === "success") {
        console.log("Package created successfully, showing success modal");
        setShowSuccessModal(true);

        // Try to show confetti, but don't let it break the flow
        try {
          showConfetti();
        } catch (confettiError) {
          console.warn("Confetti failed to show:", confettiError);
        }

        toast.success("Package created successfully!");
        router.push("/admin/packages");
      } else {
        console.error("API Error:", responseData);
        toast.error(responseData.message || "Failed to create package");
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
    const inclusionsTotal = (inclusions || []).reduce(
      (sum, inclusion) => sum + (Number(inclusion.price) || 0),
      0
    );
    const totalVenueCost = selectedVenues.reduce((sum, venueId) => {
      const venue = venues?.find((v) => v.venue_id === venueId);
      return sum + (venue?.total_price || 0);
    }, 0);

    return inclusionsTotal + totalVenueCost;
  };

  // Package Details Step Element (memoized to avoid remount/focus loss)
  const PackageDetailsStepElement = useMemo(
    () => (
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
            <label className="block mb-2 font-medium">
              Package Description
            </label>
            <textarea
              value={packageDescription}
              onChange={(e) => handlePackageDescriptionChange(e.target.value)}
              placeholder="Describe what this package offers"
              className="w-full border rounded px-3 py-2 h-24"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Package Price</label>
            <div className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600">
              <span className="text-lg font-semibold">
                ₱{calculateTotalPrice().toLocaleString()}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Automatically calculated based on inclusions and venues
              </p>
            </div>
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
    ),
    [
      packageTitle,
      packageDescription,
      guestCount,
      selectedEventTypes,
      eventTypes,
    ]
  );

  // Venue Selection Step Element (memoized)
  const VenueSelectionStepElement = useMemo(
    () => (
      <VenueSelection
        venues={venues}
        selectedVenueIds={selectedVenues}
        onVenueToggle={handleVenueToggle}
        loading={venuesLoading}
        error={venuesError}
      />
    ),
    [venues, selectedVenues, handleVenueToggle, venuesLoading, venuesError]
  );

  // Package Inclusions Step Element (memoized)
  const PackageInclusionsStepElement = useMemo(
    () => (
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
        updateInclusionSupplier={updateInclusionSupplier}
        updateInclusionTier={updateInclusionTier}
      />
    ),
    [
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
      updateInclusionSupplier,
      updateInclusionTier,
    ]
  );

  // Freebies Step Element (memoized)
  const FreebiesStepElement = useMemo(
    () => <FreebiesStepFixed freebies={freebies} setFreebies={setFreebies} />,
    [freebies, setFreebies]
  );

  // Review Step Element (memoized)
  const ReviewStepElement = useMemo(
    () => (
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
                <p className="text-sm text-gray-600">Calculated Price</p>
                <p className="font-medium">
                  ₱{calculateTotalPrice().toLocaleString()}
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
                              ? `${venue.venue_profile_picture}`
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
                * Venue cost is for illustration only. Venue price is not
                enforced at this stage and will be validated during event
                creation.
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
                            <li key={`component-${index}-${i}`}>{comp.name}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Freebies */}
          <div className="mb-6">
            <h4 className="font-medium mb-2">Freebies</h4>
            <div className="space-y-2">
              {freebies &&
                freebies.map((freebie, index) => (
                  <div
                    key={`freebie-review-${index}`}
                    className="flex items-center"
                  >
                    <p className="text-sm text-gray-700">
                      {freebie.freebie_name}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Package Price:</span>
              <span className="text-green-600">
                ₱{calculateTotalPrice().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    [
      packageTitle,
      guestCount,
      selectedEventTypes,
      eventTypes,
      selectedVenues,
      venues,
      inclusions,
      freebies,
    ]
  );

  // Right-side summary (excludes venue totals for now)
  const PackageSummary: React.FC = () => {
    const inclusionSubtotal = useMemo(
      () =>
        (inclusions || [])
          .filter((inc) => inc.name.trim() !== "")
          .reduce((sum, inc) => sum + (Number(inc.price) || 0), 0),
      [inclusions]
    );

    const selectedEventTypeNames = useMemo(
      () =>
        selectedEventTypes
          .map(
            (id) => eventTypes.find((et) => et.event_type_id === id)?.event_name
          )
          .filter(Boolean)
          .join(", "),
      [selectedEventTypes, eventTypes]
    );

    return (
      <div className="bg-white border rounded-lg p-4 lg:sticky lg:top-4">
        <h3 className="text-base font-semibold mb-3">Package Summary</h3>

        <div className="space-y-3 text-sm">
          <div>
            <div className="text-gray-500">Title</div>
            <div className="font-medium break-words">{packageTitle || "—"}</div>
          </div>
          <div>
            <div className="text-gray-500">Description</div>
            <div className="break-words">
              {packageDescription ? packageDescription : "—"}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-gray-500">Guests</div>
              <div className="font-medium">{guestCount || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">Event Types</div>
              <div className="font-medium min-h-[20px]">
                {selectedEventTypeNames || "—"}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t">
            <div className="text-gray-500 mb-2">Inclusions</div>
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {(inclusions || [])
                .filter((inc) => inc.name.trim() !== "")
                .map((inc, i) => (
                  <div key={`sum-inc-${i}`} className="flex justify-between">
                    <span className="truncate mr-2">{inc.name}</span>
                    <span className="font-medium">
                      {formatCurrency(Number(inc.price) || 0)}
                    </span>
                  </div>
                ))}
              {(!inclusions || inclusions.every((inc) => !inc.name.trim())) && (
                <div className="text-gray-500">No inclusions yet</div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal (Inclusions)</span>
              <span className="font-semibold">
                {formatCurrency(inclusionSubtotal)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Venue costs are excluded for now and will be calculated later.
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Derived data for charts (venues excluded for now)
  const inclusionSubtotalForChart = useMemo(
    () =>
      (inclusions || [])
        .filter((inc) => inc.name.trim() !== "")
        .reduce((sum, inc) => sum + (Number(inc.price) || 0), 0),
    [inclusions]
  );

  const componentsForChart = useMemo(
    () =>
      (inclusions || [])
        .filter((inc) => inc.name.trim() !== "")
        .map((inc) => ({ name: inc.name, price: Number(inc.price) || 0 })),
    [inclusions]
  );

  const freebiesNamesForChart = useMemo(
    () => (freebies || []).map((f) => f.freebie_name).filter(Boolean),
    [freebies]
  );

  const steps: Step[] = [
    {
      id: "details",
      title: "Package Details",
      description: "Basic package information",
      component: (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{PackageDetailsStepElement}</div>
          <div>
            <PackageSummary />
          </div>
        </div>
      ),
    },
    {
      id: "venues",
      title: "Venue Selection",
      description: "Choose venues for this package",
      component: (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{VenueSelectionStepElement}</div>
          <div>
            <PackageSummary />
          </div>
        </div>
      ),
    },
    {
      id: "inclusions",
      title: "Package Inclusions",
      description: "Add components and pricing",
      component: (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{PackageInclusionsStepElement}</div>
          <div>
            <PackageSummary />
          </div>
        </div>
      ),
    },
    {
      id: "freebies",
      title: "Freebies",
      description: "Add freebies for the package",
      component: (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{FreebiesStepElement}</div>
          <div>
            <PackageSummary />
          </div>
        </div>
      ),
    },
    {
      id: "review",
      title: "Review",
      description: "Review all package details",
      component: (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {ReviewStepElement}
            {/* Pie chart for inclusions vs buffer (venue excluded) */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-base font-semibold mb-3">Budget Breakdown</h3>
              <BudgetBreakdown
                packagePrice={inclusionSubtotalForChart}
                selectedVenue={null}
                components={componentsForChart}
                freebies={freebiesNamesForChart}
              />
            </div>
          </div>
          <div>
            <PackageSummary />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <MultiStepWizard
          steps={steps}
          onComplete={createPackage}
          loading={loading}
          completionText="Create Package"
          isValid={(stepId) => {
            switch (stepId) {
              case "details":
                return isPackageDetailsValid();
              case "venues":
                return isVenueSelectionValid();
              case "inclusions":
                return areInclusionsValid();
              case "freebies":
                return areFreebiesValid();
              case "review":
                return true;
              default:
                return false;
            }
          }}
        />
      </div>
    </div>
  );
}
