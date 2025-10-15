"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Check, ArrowLeft, Package, Users, MapPin, Gift, Heart, Cake, Music, Camera, Calendar, Star } from "lucide-react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiStepWizard } from "@/app/components/admin/event-builder/multi-step-wizard";
import { secureStorage } from "@/app/utils/encryption";
import { BudgetBreakdown } from "./budget-breakdown";
import { VenueSelection } from "./venue-selection";
import { PackageInclusionsStep } from "./package-inclusions-step";
import { FreebiesStepFixed } from "./freebies-step-fixed";
import { toast } from "sonner";
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
  category?: string;
  supplier_id?: number;
  offer_id?: number;
  is_manual?: boolean;
  tier_description?: string;
  tier_level?: number;
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
  venue_price: number;
  extra_pax_rate: number;
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
  const [currentStep, setCurrentStep] = useState(0);

  // Package details state
  const [packageTitle, setPackageTitle] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [guestCount, setGuestCount] = useState<number>(100);
  const [totalPackagePrice, setTotalPackagePrice] = useState<number | null>(null); // Admin's total package price
  
  // Venue fee buffer state - follows venue enhancement plan
  const [venueFeeBuffer, setVenueFeeBuffer] = useState<number | null>(null); // Default null - admin can freely adjust

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

  const handleVenueFeeBufferChange = useCallback((value: number | null) => {
    setVenueFeeBuffer(value);
  }, []);

  const handleTotalPackagePriceChange = useCallback((value: number | null) => {
    setTotalPackagePrice(value);
  }, []);

  // Event types state - Initialize as empty array to prevent map errors
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<number | null>(null);

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
        const eventTypesResponse = await axios.get(
          `${endpoints.admin}?operation=getEventTypes`
        );
        const eventTypesData = eventTypesResponse.data;
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

        const venuesResponse = await axios.get(
          `${endpoints.admin}?operation=getVenuesForPackage`
        );
        const venuesData = venuesResponse.data;
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
    setSelectedEventType(eventTypeId);
  }, []);

  // Inclusions state - Initialize with venue_fee component and one empty inclusion
  const [inclusions, setInclusions] = useState<Inclusion[]>([
    {
      name: "Venue Fee",
      price: venueFeeBuffer || 0, // Use venue fee buffer from state, default to 0 for display
      category: "venue_fee",
      components: [],
    },
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

  // Update venue fee buffer in inclusions when it changes
  useEffect(() => {
    setInclusions((prev) =>
      prev.map((inc) =>
        inc.category === "venue_fee" ? { ...inc, price: venueFeeBuffer || 0 } : inc
      )
    );
  }, [venueFeeBuffer]);

  // Recalculate venue costs when guest count changes
  useEffect(() => {
    // This effect will trigger re-renders of components that depend on guestCount
    // The actual calculation happens in the PackageInclusionsStep component
  }, [guestCount]);

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
                supplier_id: supplierId || undefined,
                offer_id: offerId || undefined,
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

    // Check venue_fee components have valid venue options
    const venueFeeComponents = inclusions.filter(
      (inc) => inc.category === "venue_fee"
    );
    for (const venueFee of venueFeeComponents) {
      if (venueFee.price === 0) {
        return {
          isValid: false,
          overage: 0,
          message: "Please set a venue budget for the Venue Fee component.",
        };
      }
    }

    // Since package price is now based on inclusions, we just need to ensure there are inclusions
    if (inclusionsTotal <= 0) {
      return {
        isValid: false,
        overage: 0,
        message:
          "No inclusions with valid prices found. Please add at least one inclusion with a price.",
      };
    }

    // Check if venue cost exceeds venue fee buffer (warning, not error)
    const clientAdditionalPayment = calculateClientAdditionalPayment();
    if (clientAdditionalPayment > 0) {
      return {
        isValid: true,
        overage: clientAdditionalPayment,
        message: `Venue cost exceeds venue fee buffer by ₱${clientAdditionalPayment.toLocaleString()}. Client will need to pay this additional amount.`,
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

      if (totalPackagePrice === null || totalPackagePrice <= 0) {
        toast.error("Please set a total package price");
        setLoading(false);
        return;
      }

      if (selectedEventType === null) {
        toast.error("Please select an event type");
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
      } else if (pricingValidation.overage > 0) {
        // Show information about client additional payment
        const userConfirmed = window.confirm(
          `Information: ${pricingValidation.message}\n\nThis is normal and expected. The client will pay this additional amount when booking.\n\nDo you want to proceed with package creation?`
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
          venue_fee_buffer: venueFeeBuffer || 0, // Add venue fee buffer, default to 0 if null
          created_by: adminId,
        },
        components: inclusions
          .filter(
            (inc) => inc.name.trim() !== "" || inc.category === "venue_fee"
          )
          .map((inc) => ({
            component_name: inc.name.trim(),
            component_description:
              inc.components
                    .filter((comp) => comp.name.trim() !== "")
                    .map((comp) => comp.name.trim())
                    .join(", "),
            component_price: Number(inc.price) || 0,
            component_category: inc.category || "services",
          })),
        freebies: freebies
          .filter((f) => f.freebie_name.trim() !== "")
          .map((f) => ({
            freebie_name: f.freebie_name.trim(),
            freebie_description: f.freebie_description || "",
            freebie_value: f.freebie_value || 0,
          })),
        event_types: [selectedEventType],
        venue_ids: selectedVenues,
      };

      // Use the total package price set by admin
      packageData.package_data.package_price = totalPackagePrice || 0;

      console.log("Creating package with data:", packageData);

      const response = await axios.post(endpoints.admin, packageData, {
        headers: { "Content-Type": "application/json" },
      });
      const responseData = response.data;
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
      packageDescription.trim() !== "" &&
      selectedEventType !== null &&
      totalPackagePrice !== null &&
      totalPackagePrice > 0
    );
  };

  const isVenueSelectionValid = () => {
    return selectedVenues.length > 0;
  };

  const areInclusionsValid = () => {
    return (
      inclusions &&
      inclusions.some((inclusion) => {
        if (inclusion.category === "venue_fee") {
          // Venue fee must have a valid price
          return Number(inclusion.price) > 0;
        }
        return inclusion.name.trim() !== "" && Number(inclusion.price) >= 0;
      })
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
    // Note: Venue costs from selectedVenues are now handled within inclusions as venue_fee components
    // The selectedVenues array is still used for backward compatibility but venue pricing is in inclusions

    return inclusionsTotal;
  };

  // Calculate venue cost based on pax count (same logic as in PackageInclusionsStep)
  const calculateVenueCost = (venue: Venue): number => {
    const basePrice = venue.venue_price || 0;
    const extraPaxRate = venue.extra_pax_rate || 0;
    const baseCapacity = 100; // Base capacity for pax rate calculation
    
    if (guestCount <= baseCapacity) {
      return basePrice;
    } else {
      const extraPax = guestCount - baseCapacity;
      return basePrice + (extraPax * extraPaxRate);
    }
  };

  // Calculate total venue cost for all selected venues
  const calculateTotalVenueCost = (): number => {
    return selectedVenues.reduce((sum, venueId) => {
      const venue = venues.find((v) => v.venue_id === venueId);
      return sum + (venue ? calculateVenueCost(venue) : 0);
    }, 0);
  };

  // Calculate remaining venue budget (venue fee buffer - actual venue cost)
  const calculateRemainingVenueBudget = (): number => {
    if (venueFeeBuffer === null || venueFeeBuffer === undefined) return 0;
    const totalVenueCost = calculateTotalVenueCost();
    return Math.max(0, venueFeeBuffer - totalVenueCost);
  };

  // Calculate client additional payment (when venue cost exceeds buffer)
  const calculateClientAdditionalPayment = (): number => {
    if (venueFeeBuffer === null || venueFeeBuffer === undefined) return 0;
    const totalVenueCost = calculateTotalVenueCost();
    return Math.max(0, totalVenueCost - venueFeeBuffer);
  };

  // Check if any selected venue exceeds the venue fee buffer
  const getVenueOverageInfo = () => {
    const overages: Array<{venue: Venue, cost: number, overage: number}> = [];
    
    // Only check overages if venue fee buffer is set
    if (venueFeeBuffer === null || venueFeeBuffer === undefined || venueFeeBuffer === 0) {
      return overages;
    }
    
    selectedVenues.forEach(venueId => {
      const venue = venues.find(v => v.venue_id === venueId);
      if (venue) {
        const cost = calculateVenueCost(venue);
        if (cost > venueFeeBuffer) {
          overages.push({
            venue,
            cost,
            overage: cost - venueFeeBuffer
          });
        }
      }
    });
    
    return overages;
  };

  // Package Details Step Element (memoized to avoid remount/focus loss)
  const PackageDetailsStepElement = useMemo(
    () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="packageTitle" className="text-sm font-medium text-gray-700">
                Package Title *
              </Label>
              <Input
                id="packageTitle"
                value={packageTitle}
                onChange={(e) => handlePackageTitleChange(e.target.value)}
                placeholder="E.g., Premium Wedding Package"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="guestCapacity" className="text-sm font-medium text-gray-700">
                Guest Capacity
              </Label>
              <Input
                id="guestCapacity"
                type="number"
                value={guestCount}
                onChange={(e) => handleGuestCountChange(Number(e.target.value))}
                placeholder="100"
                min="1"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default capacity for this package
              </p>
            </div>
            <div>
              <Label htmlFor="totalPackagePrice" className="text-sm font-medium text-gray-700">
                Total Package Price
              </Label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-lg">₱</span>
                </div>
                <Input
                  id="totalPackagePrice"
                  type="text"
                  value={totalPackagePrice === null ? '' : totalPackagePrice.toLocaleString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Remove commas and parse as number
                    const cleanValue = value.replace(/,/g, '');
                    if (cleanValue === '') {
                      handleTotalPackagePriceChange(null);
                    } else {
                      const numValue = parseFloat(cleanValue);
                      if (!isNaN(numValue) && numValue >= 0) {
                        handleTotalPackagePriceChange(numValue);
                      }
                    }
                  }}
                  placeholder="Enter total package price (e.g., 120,000)"
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total budget for this package (used for calculations)
              </p>
              {totalPackagePrice !== null && totalPackagePrice > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  Formatted: ₱{totalPackagePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="packageDescription" className="text-sm font-medium text-gray-700">
                Package Description *
              </Label>
              <Textarea
                id="packageDescription"
                value={packageDescription}
                onChange={(e) => handlePackageDescriptionChange(e.target.value)}
                placeholder="Describe what this package offers"
                className="mt-1 min-h-[100px]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="venueFeeBuffer" className="text-sm font-medium text-gray-700">
              Venue Fee Buffer
            </Label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-lg">₱</span>
              </div>
              <Input
                id="venueFeeBuffer"
                type="text"
                value={venueFeeBuffer === null ? '' : venueFeeBuffer.toLocaleString()}
                onChange={(e) => {
                  const value = e.target.value;
                  // Remove commas and parse as number
                  const cleanValue = value.replace(/,/g, '');
                  if (cleanValue === '') {
                    handleVenueFeeBufferChange(null);
                  } else {
                    const numValue = parseFloat(cleanValue);
                    if (!isNaN(numValue) && numValue >= 0) {
                      handleVenueFeeBufferChange(numValue);
                    }
                  }
                }}
                placeholder="Enter amount (e.g., 100,000)"
                className="pl-8"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum amount allocated for venue costs. If selected venue exceeds this, client pays the difference.
            </p>
            {venueFeeBuffer !== null && venueFeeBuffer > 0 && (
              <p className="text-xs text-green-600 mt-1">
                Formatted: ₱{venueFeeBuffer.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">
              Event Type *
            </Label>
            <p className="text-gray-500 text-sm mb-3 mt-1">
              Select the event type this package is designed for
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eventTypes &&
                eventTypes.map((type) => {
                  const getEventIcon = (eventName: string) => {
                    const name = eventName.toLowerCase();
                    if (name.includes('wedding')) return <Heart className="w-5 h-5" />;
                    if (name.includes('birthday')) return <Cake className="w-5 h-5" />;
                    if (name.includes('corporate') || name.includes('business')) return <Calendar className="w-5 h-5" />;
                    if (name.includes('party') || name.includes('celebration')) return <Music className="w-5 h-5" />;
                    if (name.includes('photo') || name.includes('shoot')) return <Camera className="w-5 h-5" />;
                    return <Star className="w-5 h-5" />;
                  };

                  return (
                    <div
                      key={type.event_type_id}
                      className={`relative flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedEventType === type.event_type_id
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => handleEventTypeChange(type.event_type_id)}
                    >
                      <div className={`flex-shrink-0 ${
                        selectedEventType === type.event_type_id ? "text-green-600" : "text-gray-400"
                      }`}>
                        {getEventIcon(type.event_name)}
                      </div>
                      <div className="flex-1">
                        <Label
                          htmlFor={`event-type-${type.event_type_id}`}
                          className="text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          {type.event_name}
                        </Label>
                        {type.event_description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {type.event_description}
                          </p>
                        )}
                      </div>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedEventType === type.event_type_id
                          ? "border-green-500 bg-green-500"
                          : "border-gray-300"
                      }`}>
                        {selectedEventType === type.event_type_id && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            {selectedEventType === null && (
              <p className="text-red-500 text-sm mt-2">
                Please select an event type
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
      totalPackagePrice,
      venueFeeBuffer,
      selectedEventType,
      eventTypes,
      handlePackageTitleChange,
      handlePackageDescriptionChange,
      handleGuestCountChange,
      handleTotalPackagePriceChange,
      handleVenueFeeBufferChange,
      handleEventTypeChange,
    ]
  );

  // Venue Selection Step Element (memoized)
  const VenueSelectionStepElement = useMemo(() => {
    const venueOverages = getVenueOverageInfo();
    
    return (
      <div className="space-y-6">
        {venueOverages.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-amber-800 mb-2">
              ⚠️ Venue Cost Exceeds Buffer
            </h4>
            <p className="text-sm text-amber-700 mb-3">
              The following venues exceed your venue fee buffer of ₱{venueFeeBuffer?.toLocaleString()}:
            </p>
            <div className="space-y-2">
              {venueOverages.map(({venue, cost, overage}) => (
                <div key={venue.venue_id} className="bg-white rounded p-3 border border-amber-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{venue.venue_title}</p>
                      <p className="text-sm text-gray-600">
                        Cost for {guestCount} guests: ₱{cost.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        Client pays extra: ₱{overage.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-2">
              Clients will need to pay the excess amount when booking these venues.
            </p>
          </div>
        )}
        <VenueSelection
          venues={venues}
          selectedVenueIds={selectedVenues}
          onVenueToggle={handleVenueToggle}
          loading={venuesLoading}
          error={venuesError}
          guestCount={guestCount}
        />
      </div>
    );
  }, [venues, selectedVenues, handleVenueToggle, venuesLoading, venuesError, guestCount, venueFeeBuffer]);

  // Package Inclusions Step Element (memoized)
  const PackageInclusionsStepElement = useMemo(
    () => (
      <PackageInclusionsStep
        inclusions={inclusions}
        selectedVenues={selectedVenues}
        venues={venues}
        guestCount={guestCount}
        venueFeeBuffer={venueFeeBuffer}
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
      guestCount,
      venueFeeBuffer,
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
    () => {
      const selectedEventTypeName = selectedEventType === null 
        ? "Not selected" 
        : eventTypes.find((et) => et.event_type_id === selectedEventType)?.event_name || "Unknown";

      return (
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
                <p className="text-sm text-gray-600">Total Package Price</p>
                <p className="font-medium">
                  {totalPackagePrice !== null ? `₱${totalPackagePrice.toLocaleString()}` : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Guest Capacity</p>
                <p className="font-medium">{guestCount} guests</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Venue Fee Buffer</p>
                <p className="font-medium">
                  {venueFeeBuffer !== null ? `₱${venueFeeBuffer.toLocaleString()}` : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Event Type</p>
                <p className="font-medium">
                  {selectedEventTypeName}
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
                              ? `${endpoints.serveImage}?path=${encodeURIComponent(venue.venue_profile_picture)}`
                              : "/default_pfp.png"
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
                    className={`flex flex-col items-start ${inclusion.category === "venue_fee" ? "bg-blue-50 p-3 rounded-lg" : ""}`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div>
                        <p className="font-medium">{inclusion.name}</p>
                        {inclusion.category === "venue_fee" && (
                          <div className="text-sm text-blue-600">
                            <p>
                              Venue Budget: ₱
                              {Number(inclusion.price).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
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
                {totalPackagePrice !== null ? `₱${totalPackagePrice.toLocaleString()}` : 'Not set'}
              </span>
            </div>
          </div>
        </div>
      </div>
      );
    },
    [
      packageTitle,
      guestCount,
      totalPackagePrice,
      selectedEventType,
      eventTypes,
      selectedVenues,
      venues,
      inclusions,
      freebies,
    ]
  );

  // Right-side summary with pie chart
  const PackageSummary: React.FC = () => {
    const inclusionSubtotal = useMemo(
      () =>
        (inclusions || [])
          .filter((inc) => inc.name.trim() !== "")
          .reduce((sum, inc) => sum + (Number(inc.price) || 0), 0),
      [inclusions]
    );

    const selectedEventTypeName = useMemo(
      () => {
        if (selectedEventType === null) return "Not selected";
        const eventType = eventTypes.find((et) => et.event_type_id === selectedEventType);
        return eventType?.event_name || "Unknown";
      },
      [selectedEventType, eventTypes]
    );

    // Calculate components for pie chart
    const componentsForSummaryChart = useMemo(
      () =>
        (inclusions || [])
          .filter((inc) => inc.name.trim() !== "")
          .map((inc) => ({ name: inc.name, price: Number(inc.price) || 0 })),
      [inclusions]
    );

    const freebiesNamesForSummaryChart = useMemo(
      () => (freebies || []).map((f) => f.freebie_name).filter(Boolean),
      [freebies]
    );

    return (
      <div className="space-y-4 lg:sticky lg:top-4">
        {/* Package Summary Card */}
        <div className="bg-white border rounded-lg p-4">
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
                <div className="text-gray-500">Total Price</div>
                <div className="font-medium">
                  {totalPackagePrice !== null ? `₱${totalPackagePrice.toLocaleString()}` : 'Not set'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-gray-500">Venue Buffer</div>
                <div className="font-medium">
                  {venueFeeBuffer !== null ? `₱${venueFeeBuffer.toLocaleString()}` : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Event Type</div>
                <div className="font-medium min-h-[20px]">
                  {selectedEventTypeName}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="text-gray-500 mb-2">Inclusions</div>
              <div className="space-y-2 max-h-32 overflow-auto pr-1">
                {(inclusions || [])
                  .filter((inc) => inc.name.trim() !== "")
                  .map((inc, i) => (
                    <div key={`sum-inc-${i}`} className="flex justify-between">
                      <div className="truncate mr-2">
                        <span>{inc.name}</span>
                        {inc.category === "venue_fee" && (
                          <div className="text-xs text-blue-600">
                            Venue Budget
                          </div>
                        )}
                      </div>
                      <span
                        className={`font-medium ${
                          inc.category === "venue_fee" ? "text-blue-600" : ""
                        }`}
                      >
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
                Includes venue budget allocation.
              </div>
            </div>
          </div>
        </div>

        {/* Pie Chart Card */}
        {totalPackagePrice !== null && totalPackagePrice > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-base font-semibold mb-3 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Budget Breakdown
            </h3>
            <BudgetBreakdown
              packagePrice={totalPackagePrice}
              selectedVenue={null}
              components={componentsForSummaryChart}
              freebies={freebiesNamesForSummaryChart}
              venueFeeBuffer={venueFeeBuffer}
              actualVenueCost={calculateTotalVenueCost()}
              remainingVenueBudget={calculateRemainingVenueBudget()}
              clientAdditionalPayment={calculateClientAdditionalPayment()}
              onVenueFeeBufferChange={handleVenueFeeBufferChange}
            />
          </div>
        )}
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
      title: "Package Information",
      description: "Set up basic package details and configuration",
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
      description: "Choose venues to include in this package",
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
      title: "Package Components",
      description: "Add services, suppliers, and pricing details",
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
      title: "Bonus Items",
      description: "Add complimentary items and special offers",
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
      title: "Final Review",
      description: "Review and confirm all package details",
      component: (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {ReviewStepElement}
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Package Builder
                </h1>
                <p className="text-sm text-gray-500">
                  Create and customize event packages
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MultiStepWizard
          steps={steps}
          onComplete={createPackage}
          loading={loading}
          completionText="Create Package"
          currentStepIndex={currentStep}
          onStepChange={setCurrentStep}
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
