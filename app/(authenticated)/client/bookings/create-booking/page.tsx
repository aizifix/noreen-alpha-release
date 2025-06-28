"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Info,
  Clock,
  Users,
  MapPin,
  Check,
  Package,
} from "lucide-react";
import axios from "axios";

interface EventType {
  event_type_id: number;
  event_name: string;
  event_description: string | null;
}

interface PackageComponent {
  component_id: number;
  package_id: number;
  component_name: string;
  component_description: string | null;
  component_price: number;
  display_order: number;
}

interface PackageFreebie {
  freebie_id: number;
  package_id: number;
  freebie_name: string;
  freebie_description: string | null;
  freebie_value: number;
  display_order: number;
}

interface VenuePreview {
  venue_id: number;
  venue_title: string;
  venue_location: string;
  venue_capacity: number;
  venue_price: number;
  venue_profile_picture: string | null;
}

interface Package {
  package_id: number;
  package_title: string;
  package_description: string | null;
  package_price: number;
  guest_capacity: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_active: number;
  event_type_ids: number[];
  event_type_names: string[];
  components: PackageComponent[];
  freebies: PackageFreebie[];
  venue_previews: VenuePreview[];
  venue_count: number;
}

interface VenueInclusion {
  inclusion_name: string;
  inclusion_price: number;
  inclusion_description: string | null;
}

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_details: string | null;
  venue_location: string;
  venue_contact: string;
  venue_capacity: number;
  venue_price: number;
  venue_type: string;
  venue_profile_picture: string | null;
  venue_cover_photo: string | null;
  inclusions: VenueInclusion[];
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getTomorrowMinTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

export default function CreateBookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Form state - using individual state variables to fix input issues
  const [eventTypeId, setEventTypeId] = useState<number | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(getTomorrowMinTime());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [guestCount, setGuestCount] = useState(50);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [venueId, setVenueId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Data state
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  // Initialize client info and fetch event types
  useEffect(() => {
    initializeClientInfo();
    fetchEventTypes();
  }, []);

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

  // Fetch event types from API
  const fetchEventTypes = async () => {
    try {
      setApiLoading(true);
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: { operation: "getEventTypes" },
        }
      );

      if (response.data.status === "success") {
        setEventTypes(response.data.event_types);
        if (response.data.event_types.length > 0) {
          setEventTypeId(response.data.event_types[0].event_type_id);
        }
      } else {
        setError(response.data.message || "Failed to fetch event types");
      }
    } catch (err) {
      console.error("Error fetching event types:", err);
      setError("Failed to fetch event types. Please try again later.");
    } finally {
      setApiLoading(false);
    }
  };

  // Fetch packages when event type changes (not guest count)
  useEffect(() => {
    if (eventTypeId) {
      fetchPackages();
    }
  }, [eventTypeId]);

  // Fetch packages by event type - NEW API ENDPOINT
  const fetchPackages = async () => {
    if (!eventTypeId) return;

    // Store current scroll position to prevent unwanted scrolling
    const scrollY = window.scrollY;

    try {
      // Only show loading spinner on initial load, not on guest count changes
      if (initialLoad) {
        setApiLoading(true);
      }

      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: {
            operation: "getPackagesByEventType",
            event_type_id: eventTypeId,
            guest_count: guestCount,
          },
        }
      );

      if (response.data.status === "success") {
        setPackages(response.data.packages || []);
        // Reset package and venue selection if packages change
        if (
          packageId &&
          response.data.packages &&
          !response.data.packages.some(
            (p: Package) => p.package_id === packageId
          )
        ) {
          setPackageId(null);
          setVenueId(null);
        }

        // Restore scroll position after DOM updates
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      } else {
        setError(response.data.message || "Failed to fetch packages");
      }
    } catch (err) {
      console.error("Error fetching packages:", err);
      setError("Failed to fetch packages. Please try again later.");
    } finally {
      if (initialLoad) {
        setApiLoading(false);
        setInitialLoad(false);
      }
    }
  };

  // Fetch venues when package, date or guest count changes
  useEffect(() => {
    if (packageId && eventDate && guestCount) {
      fetchVenues();
    }
  }, [packageId, eventDate, guestCount]);

  // Fetch venues by package - NEW API ENDPOINT
  const fetchVenues = async () => {
    if (!packageId) return;

    try {
      setApiLoading(true);
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: {
            operation: "getVenuesByPackage",
            package_id: packageId,
            event_date: eventDate,
            guest_count: guestCount,
          },
        }
      );

      if (response.data.status === "success") {
        setVenues(response.data.venues || []);
        // Reset venue selection if venues change
        if (
          venueId &&
          response.data.venues &&
          !response.data.venues.some((v: Venue) => v.venue_id === venueId)
        ) {
          setVenueId(null);
        }
      } else {
        setError(response.data.message || "Failed to fetch venues");
      }
    } catch (err) {
      console.error("Error fetching venues:", err);
      setError("Failed to fetch venues. Please try again later.");
    } finally {
      setApiLoading(false);
    }
  };

  // Step navigation functions
  const handleNextDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSelectPackage = (id: number) => {
    setPackageId(id);
    setVenueId(null); // Reset venue selection
  };

  const handleNextPackage = () => {
    if (packageId) setStep(3);
  };

  const handleSelectVenue = (id: number) => {
    setVenueId(id);
  };

  const handleNextVenue = () => {
    if (venueId) setStep(4);
  };

  // Get selected items
  const selectedPackage = packages.find((p) => p.package_id === packageId);
  const selectedVenue = venues.find((v) => v.venue_id === venueId);

  // Handle booking submission
  const handleSubmit = async () => {
    if (!userId || !eventTypeId) {
      setError("Missing required user information");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null); // Clear any previous errors

    try {
      console.log("🔄 Creating booking with data:", {
        user_id: userId,
        event_type_id: eventTypeId,
        event_name: eventName,
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        guest_count: guestCount,
        venue_id: venueId,
        package_id: packageId,
      });

      const bookingData = {
        operation: "createBooking",
        user_id: userId,
        event_type_id: eventTypeId,
        event_name: eventName,
        event_date: eventDate,
        event_time: startTime,
        start_time: startTime,
        end_time: endTime,
        guest_count: guestCount,
        venue_id: venueId,
        package_id: packageId,
        notes: notes || eventName,
        booking_status: "pending", // Explicitly set as pending
      };

      console.log("📡 Sending booking request to API...");

      const response = await axios.post(
        "http://localhost/events-api/client.php",
        bookingData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        }
      );

      console.log("📡 API Response:", response.data);

      if (response.data && response.data.status === "success") {
        console.log("✅ Booking created successfully!");
        setSuccessRef(response.data.booking_reference);
        setStep(5);

        // Show success notification
        setTimeout(() => {
          alert(
            `Booking created successfully!\n\nReference: ${response.data.booking_reference}\n\nStatus: Pending Admin Approval\n\nYou will be notified once your booking is reviewed by our team.`
          );
        }, 100);
      } else {
        const errorMessage =
          response.data?.message ||
          "Failed to create booking - no response from server";
        console.error("❌ API Error:", errorMessage);
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error("💥 Network Error:", err);
      console.error("Error details:", {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
      });

      let errorMessage = "Failed to create booking";

      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.status === 404) {
        errorMessage =
          "API endpoint not found. Please check server configuration.";
      } else if (err?.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err?.code === "ECONNABORTED") {
        errorMessage =
          "Request timeout. Please check your connection and try again.";
      }

      setError(errorMessage);

      // Only fall back to local booking if it's a network issue
      if (!err?.response || err?.code === "ECONNABORTED") {
        console.log("🔄 Falling back to local booking due to network issue...");
        createLocalBooking();
      }
    } finally {
      setLoading(false);
    }
  };

  // Create local booking for demo mode
  const createLocalBooking = () => {
    const ref = `BK-${eventDate.replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;
    setSuccessRef(ref);

    const newBooking: any = {
      id: ref,
      clientId: clientInfo?.user_id || "demo-client",
      clientName: `${clientInfo?.user_firstName || "Demo"} ${clientInfo?.user_lastName || "User"}`,
      clientEmail: clientInfo?.user_email || "demo@example.com",
      clientPhone: clientInfo?.user_contact || "",
      clientAddress: "",
      eventType:
        eventTypes.find((et) => et.event_type_id === eventTypeId)?.event_name ||
        "",
      eventDate: eventDate,
      eventTime: startTime,
      guestCount: guestCount,
      notes: eventName,
      venue: selectedVenue?.venue_title || "",
      package: selectedPackage?.package_title || "",
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
    };

    const prev = JSON.parse(localStorage.getItem("newBookings") || "[]");
    localStorage.setItem("newBookings", JSON.stringify([...prev, newBooking]));
    setLoading(false);
    setStep(5);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (apiLoading && step === 1) {
    return (
      <div className="max-w-2xl mx-auto py-10 flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <button
        className="mb-6 text-sm text-gray-600 hover:underline"
        onClick={() => router.push("/client/bookings")}
      >
        {"< Back to Bookings"}
      </button>
      <h1 className="text-3xl font-bold mb-6">Book New Event</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Step 1: Event Details */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-xl font-semibold mb-1">Event Details</h2>
          <p className="text-gray-500 text-sm mb-6">Tell us about your event</p>

          <form onSubmit={handleNextDetails} className="space-y-6">
            <div>
              <label className="block mb-2 font-medium">Event Type</label>
              <select
                value={eventTypeId || ""}
                onChange={(e) => setEventTypeId(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select Event Type</option>
                {eventTypes.map((type) => (
                  <option key={type.event_type_id} value={type.event_type_id}>
                    {type.event_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">Event Name</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
                placeholder="e.g., John & Jane's Wedding"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Event Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                min={getTomorrowMinTime()}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 font-medium">Number of Guests</label>
              <input
                type="number"
                min={1}
                max={1000}
                defaultValue={guestCount}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= 1000) {
                    setGuestCount(value);
                  } else {
                    e.target.value = guestCount.toString();
                  }
                }}
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Next →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Package Selection */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-xl font-semibold mb-1">Package Selection</h2>
          <p className="text-gray-500 text-sm mb-6">
            Choose a package for your{" "}
            {eventTypes
              .find((et) => et.event_type_id === eventTypeId)
              ?.event_name?.toLowerCase()}{" "}
            event
          </p>

          {apiLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : packages.length === 0 ? (
            <div className="bg-yellow-50 p-4 rounded-lg text-yellow-700 flex items-start gap-3">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">No packages available</p>
                <p className="text-sm">
                  Try adjusting your guest count or selecting a different event
                  type.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.package_id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    packageId === pkg.package_id
                      ? "bg-green-50 border-green-400 ring-2 ring-green-200"
                      : "hover:bg-gray-50 hover:border-gray-300"
                  }`}
                  onClick={() => handleSelectPackage(pkg.package_id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-lg">
                          {pkg.package_title}
                        </h3>
                      </div>

                      <div className="text-sm text-gray-600 mb-3">
                        <p>Max Guests: {pkg.guest_capacity}</p>
                        <p>Available Venues: {pkg.venue_count}</p>
                      </div>

                      {pkg.package_description && (
                        <p className="text-sm text-gray-700 mb-3">
                          {pkg.package_description}
                        </p>
                      )}

                      {pkg.components.length > 0 && (
                        <div className="mb-3">
                          <span className="font-medium text-sm">Includes:</span>
                          <ul className="list-disc ml-5 text-sm text-gray-700 mt-1">
                            {pkg.components.slice(0, 5).map((comp) => (
                              <li key={comp.component_id}>
                                {comp.component_name}
                                {comp.component_price > 0 && (
                                  <span className="text-gray-500 ml-1">
                                    ({formatCurrency(comp.component_price)})
                                  </span>
                                )}
                              </li>
                            ))}
                            {pkg.components.length > 5 && (
                              <li className="text-gray-500">
                                +{pkg.components.length - 5} more components...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {pkg.freebies.length > 0 && (
                        <div>
                          <span className="font-medium text-sm">Freebies:</span>
                          <ul className="list-disc ml-5 text-sm text-gray-700 mt-1">
                            {pkg.freebies.slice(0, 3).map((freebie) => (
                              <li key={freebie.freebie_id}>
                                {freebie.freebie_name}
                              </li>
                            ))}
                            {pkg.freebies.length > 3 && (
                              <li className="text-gray-500">
                                +{pkg.freebies.length - 3} more freebies...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-green-700">
                        {formatCurrency(pkg.package_price)}
                      </div>
                      <div className="text-sm text-gray-500">package price</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-6 border-t">
            <button
              className="text-sm text-gray-600 hover:underline"
              onClick={() => setStep(1)}
            >
              ← Back to Details
            </button>
            <button
              disabled={!packageId}
              onClick={handleNextPackage}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Venue Selection */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-xl font-semibold mb-1">Venue Selection</h2>
          <p className="text-gray-500 text-sm mb-6">
            Choose a venue from your selected package
          </p>

          {apiLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
            </div>
          ) : venues.length === 0 ? (
            <div className="bg-yellow-50 p-4 rounded-lg text-yellow-700 flex items-start gap-3">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">No venues available</p>
                <p className="text-sm">
                  Try selecting a different date or adjusting your guest count.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {venues.map((venue) => (
                <div
                  key={venue.venue_id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    venueId === venue.venue_id
                      ? "bg-green-50 border-green-400 ring-2 ring-green-200"
                      : "hover:bg-gray-50 hover:border-gray-300"
                  }`}
                  onClick={() => handleSelectVenue(venue.venue_id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-lg">
                          {venue.venue_title}
                        </h3>
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        <p className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {venue.venue_location}
                        </p>
                        <p className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Up to {venue.venue_capacity} guests
                        </p>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Available on{" "}
                          {new Date(eventDate).toLocaleDateString()}
                        </p>
                      </div>

                      {venue.venue_details && (
                        <p className="text-sm text-gray-700 mb-3">
                          {venue.venue_details}
                        </p>
                      )}

                      {venue.inclusions.length > 0 && (
                        <div>
                          <span className="font-medium text-sm">
                            Inclusions:
                          </span>
                          <ul className="list-disc ml-5 text-sm text-gray-700 mt-1">
                            {venue.inclusions.map((inclusion, idx) => (
                              <li key={idx}>
                                {inclusion.inclusion_name}
                                {inclusion.inclusion_price > 0 && (
                                  <span className="text-gray-500 ml-1">
                                    ({formatCurrency(inclusion.inclusion_price)}
                                    )
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="text-right ml-4">
                      <div className="text-xl font-bold text-green-700">
                        {formatCurrency(venue.venue_price)}
                      </div>
                      <div className="text-sm text-gray-500">venue fee</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-6 border-t">
            <button
              className="text-sm text-gray-600 hover:underline"
              onClick={() => setStep(2)}
            >
              ← Back to Package
            </button>
            <button
              disabled={!venueId}
              onClick={handleNextVenue}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-xl font-semibold mb-1">Booking Confirmation</h2>
          <p className="text-gray-500 text-sm mb-6">
            Review and confirm your booking details
          </p>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">Event Type</p>
                <p className="text-lg">
                  {
                    eventTypes.find((et) => et.event_type_id === eventTypeId)
                      ?.event_name
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Event Name</p>
                <p className="text-lg">{eventName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Date</p>
                <p className="text-lg">
                  {new Date(eventDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Time</p>
                <p className="text-lg">
                  {startTime} - {endTime}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Guest Count</p>
                <p className="text-lg">{guestCount} guests</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Package</p>
                <p className="text-lg">{selectedPackage?.package_title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Venue</p>
                <p className="text-lg">{selectedVenue?.venue_title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Price</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(
                    (selectedPackage?.package_price || 0) +
                      (selectedVenue?.venue_price || 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-2 font-medium">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requirements or notes for your event..."
              className="w-full border rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {!userId && (
            <div className="bg-yellow-50 p-4 rounded-lg text-yellow-700 flex items-start gap-3 mb-6">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Demo Mode</p>
                <p className="text-sm">
                  You're using the system in demo mode. This booking will be
                  saved locally in your browser.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-6 border-t">
            <button
              className="text-sm text-gray-600 hover:underline"
              onClick={() => setStep(3)}
              disabled={loading}
            >
              ← Back to Venue Selection
            </button>
            <button
              disabled={loading}
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>Confirm Booking</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Success */}
      {step === 5 && successRef && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="bg-green-100 rounded-full p-3 mb-4 mx-auto w-fit">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Booking Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your event has been booked successfully.
          </p>
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-500">Booking Reference:</div>
            <div className="font-mono text-xl font-bold">{successRef}</div>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/client/bookings")}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              View My Bookings
            </button>
            <button
              onClick={() => router.push("/client/dashboard")}
              className="w-full border border-green-600 text-green-700 hover:bg-green-50 px-6 py-3 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mb-4"></div>
            <p>Creating your booking...</p>
          </div>
        </div>
      )}
    </div>
  );
}
