"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Check, ArrowLeft } from "lucide-react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiStepWizard } from "@/app/components/admin/event-builder/multi-step-wizard";
import { secureStorage } from "@/app/utils/encryption";
import { FreebiesStep } from "./freebies-step";
import { BudgetBreakdown } from "./budget-breakdown";
import { VenueSelection } from "./venue-selection";
import { toast } from "react-hot-toast";
import Image from "next/image";

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

  // Package details state
  const [packageTitle, setPackageTitle] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [packagePrice, setPackagePrice] = useState<number | string>("");
  const [guestCount, setGuestCount] = useState<number>(100);

  // Event types state
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<number[]>([]);

  // Add venue state
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<number[]>([]);

  // Calculate total venue cost
  const totalVenueCost = selectedVenues.reduce((sum, venueId) => {
    const venue = venues.find((v) => v.venue_id === venueId);
    return sum + (venue?.total_price || 0);
  }, 0);

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
        }
      } catch (error) {
        console.error("API error:", error);
        toast.error("Failed to load data. Please check your connection.");
      }
    };

    fetchData();
  }, []);

  // Handle event type selection
  const handleEventTypeChange = (eventTypeId: number) => {
    if (selectedEventTypes.includes(eventTypeId)) {
      setSelectedEventTypes(
        selectedEventTypes.filter((id) => id !== eventTypeId)
      );
    } else {
      setSelectedEventTypes([...selectedEventTypes, eventTypeId]);
    }
  };

  // Inclusions state
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

  // Freebies state
  const [freebies, setFreebies] = useState<Freebie[]>([{ freebie_name: "" }]);

  // Handle inclusion components
  const addInclusion = () => {
    setInclusions([
      ...inclusions,
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
  };

  const removeInclusion = (inclusionIndex: number) => {
    setInclusions(inclusions.filter((_, index) => index !== inclusionIndex));
  };

  const updateInclusionName = (inclusionIndex: number, name: string) => {
    const newInclusions = [...inclusions];
    newInclusions[inclusionIndex].name = name;
    setInclusions(newInclusions);
  };

  const updateInclusionPrice = (index: number, value: string) => {
    const newInclusions = [...inclusions];
    newInclusions[index].price = value;
    setInclusions(newInclusions);
  };

  const addComponent = (inclusionIndex: number) => {
    const newInclusions = [...inclusions];
    newInclusions[inclusionIndex].components.push({
      name: "",
    });
    setInclusions(newInclusions);
  };

  const removeComponent = (inclusionIndex: number, componentIndex: number) => {
    const newInclusions = [...inclusions];
    newInclusions[inclusionIndex].components = newInclusions[
      inclusionIndex
    ].components.filter((_, index) => index !== componentIndex);
    setInclusions(newInclusions);
  };

  const updateComponentName = (
    inclusionIndex: number,
    componentIndex: number,
    name: string
  ) => {
    const newInclusions = [...inclusions];
    newInclusions[inclusionIndex].components[componentIndex].name = name;
    setInclusions(newInclusions);
  };

  const handleAddFreebie = () => {
    setFreebies([...freebies, { freebie_name: "" }]);
  };

  const handleUpdateFreebie = (index: number, value: string) => {
    const newFreebies = [...freebies];
    newFreebies[index].freebie_name = value;
    setFreebies(newFreebies);
  };

  const handleRemoveFreebie = (index: number) => {
    setFreebies(freebies.filter((_, i) => i !== index));
  };

  const handleVenueToggle = (venueId: number) => {
    if (selectedVenues.includes(venueId)) {
      setSelectedVenues(selectedVenues.filter((id) => id !== venueId));
    } else {
      setSelectedVenues([...selectedVenues, venueId]);
    }
  };

  const calculateRemainingBudget = () => {
    const packagePriceNum = Number(packagePrice) || 0;
    const inclusionsTotal = inclusions.reduce(
      (sum, inclusion) => sum + (Number(inclusion.price) || 0),
      0
    );
    const totalVenueCost = selectedVenues.reduce((sum, venueId) => {
      const venue = venues.find((v) => v.venue_id === venueId);
      return sum + (venue?.total_price || 0);
    }, 0);

    return packagePriceNum - inclusionsTotal - totalVenueCost;
  };

  const isBudgetValid = () => {
    return calculateRemainingBudget() >= 0;
  };

  const createPackage = async () => {
    setLoading(true);

    try {
      const userData = JSON.parse(secureStorage.getItem("userData") || "{}");
      const adminId = userData.user_id;

      if (!adminId) {
        toast.error("Admin ID not found. Please log in again.");
        return;
      }

      const packageData = {
        package_data: {
          package_title: packageTitle,
          package_description: packageDescription,
          package_price: Number(packagePrice),
          guest_capacity: guestCount,
          created_by: adminId,
        },
        components: inclusions
          .filter((inc) => inc.name.trim() !== "")
          .map((inc) => ({
            component_name: inc.name,
            component_description: inc.components
              .filter((comp) => comp.name.trim() !== "")
              .map((comp) => comp.name)
              .join(", "),
            component_price: Number(inc.price) || 0,
          })),
        freebies: freebies
          .filter((f) => f.freebie_name.trim() !== "")
          .map((f) => ({
            freebie_name: f.freebie_name,
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
        toast.success("Package created successfully!");
        router.push("/admin/packages");
      } else {
        toast.error(response.data.message || "Failed to create package");
      }
    } catch (error) {
      console.error("Create package error:", error);
      toast.error("An error occurred while creating the package");
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
    return inclusions.some(
      (inclusion) =>
        inclusion.name.trim() !== "" && Number(inclusion.price) >= 0
    );
  };

  const areFreebiesValid = () => {
    return freebies.some((f) => f.freebie_name.trim() !== "");
  };

  const calculateTotalPrice = (): number => {
    const packagePriceNum = Number(packagePrice) || 0;
    const inclusionsTotal = inclusions.reduce(
      (sum, inclusion) => sum + (Number(inclusion.price) || 0),
      0
    );
    const totalVenueCost = selectedVenues.reduce((sum, venueId) => {
      const venue = venues.find((v) => v.venue_id === venueId);
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
            onChange={(e) => setPackageTitle(e.target.value)}
            placeholder="E.g., Premium Wedding Package"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Package Description</label>
          <textarea
            value={packageDescription}
            onChange={(e) => setPackageDescription(e.target.value)}
            placeholder="Describe what this package offers"
            className="w-full border rounded px-3 py-2 h-24"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Package Price (₱)</label>
          <input
            type="number"
            value={packagePrice}
            onChange={(e) => setPackagePrice(e.target.value)}
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
            onChange={(e) => setGuestCount(Number(e.target.value))}
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
            {eventTypes.map((type) => (
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
    />
  );

  // Package Inclusions Step Component
  const PackageInclusionsStep = () => (
    <div className="space-y-6">
      {/* Show selected venues as fixed inclusions */}
      {selectedVenues.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-2">Selected Venues:</h3>
          <div className="space-y-2">
            {selectedVenues.map((venueId) => {
              const venue = venues.find((v) => v.venue_id === venueId);
              return venue ? (
                <div key={venue.venue_id} className="bg-gray-50 rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{venue.venue_title}</p>
                      <p className="text-sm text-gray-600">
                        {venue.venue_location}
                      </p>
                    </div>
                    <p className="font-medium text-green-600">
                      ₱{(venue.total_price || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Existing inclusions form */}
      {inclusions.map((inclusion, inclusionIndex) => (
        <div key={inclusionIndex} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1">
              <label className="block mb-2 font-medium">Inclusion Name</label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={inclusion.name}
                    onChange={(e) =>
                      updateInclusionName(inclusionIndex, e.target.value)
                    }
                    placeholder="E.g., Venue Decoration"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="w-1/3">
                  <label className="block mb-1 text-sm font-medium">
                    Price (₱)
                  </label>
                  <input
                    type="number"
                    value={inclusion.price}
                    onChange={(e) =>
                      updateInclusionPrice(inclusionIndex, e.target.value)
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => removeInclusion(inclusionIndex)}
              className="ml-2 p-1 text-gray-500 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="pl-4 border-l-2 border-gray-300 space-y-4">
            {inclusion.components.map(
              (component: Component, componentIndex: number) => (
                <div
                  key={componentIndex}
                  className="border rounded-lg p-3 bg-white"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex-1">
                      <label className="block mb-1 text-sm font-medium">
                        Component
                      </label>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={component.name}
                            onChange={(e) =>
                              updateComponentName(
                                inclusionIndex,
                                componentIndex,
                                e.target.value
                              )
                            }
                            placeholder="E.g., Flowers"
                            className="w-full border rounded px-3 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        removeComponent(inclusionIndex, componentIndex)
                      }
                      className="ml-2 p-1 text-gray-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            )}
            <button
              onClick={() => addComponent(inclusionIndex)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Component
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addInclusion}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:bg-gray-50 flex items-center justify-center"
      >
        <Plus className="h-5 w-5 mr-2" /> Add Inclusion
      </button>
    </div>
  );

  // Enhanced Freebies Step Component
  const FreebiesStepWrapper = () => (
    <FreebiesStep
      freebies={freebies}
      setFreebies={setFreebies}
      onNext={() => {}} // Will be handled by MultiStepWizard
    />
  );

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
                const venue = venues.find((v) => v.venue_id === venueId);
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
            {inclusions.map((inclusion, index) => (
              <div key={index} className="flex flex-col items-start">
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
                        <li key={i}>{comp.name}</li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Freebies */}
        {freebies.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-2">Freebies</h4>
            <ul className="list-disc list-inside space-y-1">
              {freebies.map((f, index) => (
                <li key={index} className="text-gray-600">
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
          components={inclusions
            .filter((inc) => inc.name.trim() !== "")
            .map((inc) => ({
              name: inc.name,
              price: Number(inc.price) || 0,
            }))}
          freebies={freebies.map((f) => f.freebie_name)}
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
      component: <PackageDetailsStep />,
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
      component: <PackageInclusionsStep />,
    },
    {
      id: "freebies",
      title: "Freebies",
      description: "Add package freebies",
      component: <FreebiesStepWrapper />,
    },
    {
      id: "review",
      title: "Review & Create",
      description: "Review and finalize package",
      component: <ReviewStep />,
    },
  ];

  const handleComplete = () => {
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
                {inclusions.some((inc) => inc.name.trim() !== "") && (
                  <div>
                    <p className="text-sm text-muted-foreground">Inclusions</p>
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
                {freebies.some((f) => f.freebie_name.trim() !== "") && (
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
    </div>
  );
}
