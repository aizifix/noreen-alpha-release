"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Eye,
  Plus,
  Clock,
  Users,
  MapPin,
  Package,
  X,
  CreditCard,
  Wallet,
} from "lucide-react";
// import { apiClient } from "@/utils/apiClient";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { toast } from "@/hooks/use-toast";
import { secureStorage } from "@/app/utils/encryption";

const statusColors: { [key: string]: string } = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  reserved: "bg-orange-100 text-orange-700",
  completed: "bg-blue-100 text-blue-700",
  converted: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-700",
};

interface DbBooking {
  booking_id: number;
  booking_reference: string;
  user_id: number;
  event_type_id: number;
  event_type_name: string;
  event_name: string;
  event_date: string;
  event_time: string;
  guest_count: number;
  venue_id: number | null;
  venue_name: string | null;
  package_id: number | null;
  package_name: string | null;
  notes: string | null;
  booking_status:
    | "pending"
    | "confirmed"
    | "completed"
    | "converted"
    | "cancelled"
    | "reserved";
  converted_event_id: number | null;
  accepted_by_user_id: number | null;
  accepted_by_role: string | null;
  accepted_at: string | null;
  created_at: string;
  total_price?: number;
  payments?: PaymentHistoryItem[];
  rejection_reason?: string | null;
}

interface PaymentHistoryItem {
  payment_id: number;
  payment_amount: number;
  payment_method: string;
  payment_date: string;
  payment_status: string;
  payment_reference: string | null;
  payment_notes: string | null;
  created_at: string;
}

export default function BookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If a package is specified in query, redirect to create-booking with that package
  useEffect(() => {
    const pkg = searchParams.get("package");
    if (pkg) {
      router.replace(`/client/bookings/create-booking?package=${pkg}`);
    }
  }, [router, searchParams]);

  const [activeTab, setActiveTab] = useState("All Bookings");
  const [search, setSearch] = useState("");
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<DbBooking | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [showEventSelector, setShowEventSelector] = useState(false);
  interface EventData {
    event_id: number;
    event_title: string;
    event_date: string;
    guest_count: number;
    venue_id?: string | number;
    venue_name?: string;
    original_booking_reference?: string;
  }

  const [availableEvents, setAvailableEvents] = useState<EventData[]>([]);
  const [paymentSettings, setPaymentSettings] = useState({
    gcash_name: "",
    gcash_number: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
    payment_instructions: "",
  });

  // Payment form state - removed payment processing functionality
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<DbBooking | null>(
    null
  );

  // Get user data from localStorage
  useEffect(() => {
    const getUserData = () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          // Check if the data is encrypted (starts with U2FsdGVkX1)
          if (userData.startsWith("U2FsdGVkX1")) {
            try {
              // Use the secureStorage utility to decrypt the data
              const decryptedUser = secureStorage.getItem("user");

              if (
                decryptedUser &&
                typeof decryptedUser === "object" &&
                decryptedUser.user_id
              ) {
                setUserId(Number(decryptedUser.user_id));
                return Number(decryptedUser.user_id);
              }
            } catch (decryptErr) {
              console.error("Error decrypting user data:", decryptErr);
            }
          } else {
            // Try parsing as regular JSON
            const user = JSON.parse(userData);
            if (user.user_id) {
              setUserId(Number(user.user_id));
              return Number(user.user_id);
            }
          }
        }
        return null;
      } catch (err) {
        console.error("Error getting user data:", err);
        return null;
      }
    };

    const uid = getUserData();

    // If we have a userId, fetch from API (which will handle local storage merging)
    if (uid) {
      fetchBookings(uid);
      fetchPaymentSettings(); // Fetch payment settings for display in cards
    } else {
      // Check for bookings in localStorage only if no user ID (demo mode)
      const localBookings = localStorage.getItem("newBookings");
      if (localBookings) {
        try {
          const parsedBookings = JSON.parse(localBookings);
          // Convert to expected DbBooking format
          const formattedBookings: DbBooking[] = parsedBookings.map(
            (b: any) => ({
              booking_id: parseInt(b.id.replace("BK-", "")) || 0,
              booking_reference: b.id,
              user_id: 0,
              event_type_id: 0,
              event_type_name: b.eventType,
              event_name: b.notes,
              event_date: b.eventDate,
              event_time: b.eventTime || "12:00:00",
              guest_count: b.guestCount,
              venue_id: null,
              venue_name: b.venue,
              package_id: null,
              package_name: b.package,
              notes: "",
              booking_status: b.status as
                | "pending"
                | "confirmed"
                | "completed"
                | "cancelled",
              created_at: b.createdAt,
            })
          );

          setBookings(formattedBookings);
        } catch (err) {
          console.error("Error parsing local bookings:", err);
        }
      }
      setLoading(false);
    }
  }, []);

  // Fetch bookings from API using Axios
  const fetchBookings = async (uid: number) => {
    try {
      setLoading(true);
      const response = await axios.get(`${endpoints.client}`, {
        params: {
          operation: "getClientBookings",
          user_id: uid,
        },
      });

      if (response.data && response.data.status === "success") {
        // Merge API bookings with local bookings if any
        const localBookings = localStorage.getItem("newBookings");
        let mergedBookings = [...response.data.bookings];

        if (localBookings) {
          const parsedLocalBookings = JSON.parse(localBookings);
          const formattedLocalBookings: DbBooking[] = parsedLocalBookings.map(
            (b: any) => ({
              booking_id: parseInt(b.id.replace("BK-", "")) || 0,
              booking_reference: b.id,
              user_id: uid,
              event_type_id: 0,
              event_type_name: b.eventType,
              event_name: b.notes,
              event_date: b.eventDate,
              event_time: b.eventTime || "12:00:00",
              guest_count: b.guestCount,
              venue_id: null,
              venue_name: b.venue,
              package_id: null,
              package_name: b.package,
              notes: "",
              booking_status: b.status as
                | "pending"
                | "confirmed"
                | "completed"
                | "cancelled",
              created_at: b.createdAt,
            })
          );

          // Filter out local bookings that already exist in the database
          const existingReferences = new Set(
            response.data.bookings.map((b: DbBooking) => b.booking_reference)
          );
          const uniqueLocalBookings = formattedLocalBookings.filter(
            (localBooking) =>
              !existingReferences.has(localBooking.booking_reference)
          );

          console.log("Deduplication:", {
            totalLocalBookings: formattedLocalBookings.length,
            uniqueLocalBookings: uniqueLocalBookings.length,
            filteredOut:
              formattedLocalBookings.length - uniqueLocalBookings.length,
            existingReferences: Array.from(existingReferences),
          });

          mergedBookings = [...mergedBookings, ...uniqueLocalBookings];
        }

        // Additional deduplication at the final level to ensure no duplicates
        const finalBookings = mergedBookings.reduce(
          (acc: DbBooking[], current: DbBooking) => {
            const existingIndex = acc.findIndex(
              (booking) =>
                booking.booking_reference === current.booking_reference
            );

            if (existingIndex === -1) {
              // Booking doesn't exist, add it
              acc.push(current);
            } else {
              // Booking exists, keep the one with higher booking_id (more recent)
              if (current.booking_id > acc[existingIndex].booking_id) {
                acc[existingIndex] = current;
              }
            }

            return acc;
          },
          []
        );

        console.log("Final deduplication:", {
          before: mergedBookings.length,
          after: finalBookings.length,
          removed: mergedBookings.length - finalBookings.length,
        });

        setBookings(finalBookings);
      } else {
        setError(response.data.message || "Failed to fetch bookings");
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to fetch bookings. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const response = await axios.get(`${endpoints.client}`, {
        params: { operation: "getPaymentSettings" },
      });

      if (response.data.status === "success") {
        const settings = response.data.payment_settings || {
          gcash_name: "",
          gcash_number: "",
          bank_name: "",
          bank_account_name: "",
          bank_account_number: "",
          payment_instructions: "",
        };
        setPaymentSettings(settings);
      }
    } catch (error) {
      console.error("Error fetching payment settings:", error);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = (booking: DbBooking) => {
    setBookingToCancel(booking);
    setShowCancelDialog(true);
  };

  // Confirm cancel booking
  const confirmCancelBooking = async () => {
    if (!bookingToCancel || !userId) return;

    try {
      const response = await axios.post(`${endpoints.client}`, {
        operation: "cancelBooking",
        booking_id: bookingToCancel.booking_id,
        user_id: userId,
      });

      if (response.data.status === "success") {
        toast({
          title: "Booking Cancelled",
          description: "Your booking has been cancelled successfully.",
        });

        // Refresh bookings list
        fetchBookings(userId);
      } else {
        throw new Error(response.data.message || "Failed to cancel booking");
      }
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Cancellation Failed",
        description:
          error.message || "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowCancelDialog(false);
      setBookingToCancel(null);
    }
  };

  // Handle edit booking
  const handleEditBooking = (booking: DbBooking) => {
    // Store booking data in localStorage for the create-booking page to use
    const editData = {
      bookingId: booking.booking_id,
      bookingReference: booking.booking_reference,
      eventType: booking.event_type_name,
      eventName: booking.event_name,
      eventDate: booking.event_date,
      eventTime: booking.event_time,
      guestCount: booking.guest_count,
      venueId: booking.venue_id,
      venueName: booking.venue_name,
      packageId: booking.package_id,
      packageName: booking.package_name,
      notes: booking.notes,
      isEdit: true,
    };

    localStorage.setItem("editBookingData", JSON.stringify(editData));

    // Navigate to create-booking page
    router.push("/client/bookings/create-booking?edit=true");
  };

  // Payment processing functionality removed - clients can only view payment information

  // Filter by tab and search
  const filtered = bookings.filter((b) => {
    if (activeTab === "Upcoming") {
      if (
        !(
          b.booking_status === "confirmed" ||
          b.booking_status === "pending" ||
          b.booking_status === "reserved"
        )
      )
        return false;
    } else if (activeTab === "Past") {
      if (b.booking_status !== "completed") return false;
    }

    if (
      search &&
      !b.event_type_name.toLowerCase().includes(search.toLowerCase()) &&
      !b.venue_name?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <Link href="/client/bookings/create-booking">
          <button className="bg-[#028A75] hover:bg-[#028A75]/90 text-white px-5 py-2 rounded-lg flex items-center gap-2">
            <Plus className="h-5 w-5" /> Book New Event
          </button>
        </Link>
      </div>

      {/* Search and Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search bookings by event type, venue, or booking reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75]"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {["All Bookings", "Upcoming", "Past"].map((tab) => (
              <button
                key={tab}
                className={`px-6 py-3 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-[#028A75] text-white border-[#028A75] shadow-lg"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-[#028A75]/10 hover:border-[#028A75]/30"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-4 text-sm text-gray-600">
          <span>Total: {bookings.length}</span>
          <span>
            Pending:{" "}
            {bookings.filter((b) => b.booking_status === "pending").length}
          </span>
          <span>
            Reserved:{" "}
            {bookings.filter((b) => b.booking_status === "reserved").length}
          </span>
          <span>
            Confirmed:{" "}
            {bookings.filter((b) => b.booking_status === "confirmed").length}
          </span>
          <span>
            Completed:{" "}
            {bookings.filter((b) => b.booking_status === "completed").length}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg text-center">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((b) => (
            <div
              key={`${b.booking_id}-${b.booking_reference}`}
              className={`bg-white rounded-xl border-2 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-200 ${
                b.booking_status === "converted"
                  ? "opacity-75 bg-gray-50 border-purple-200"
                  : b.booking_status === "confirmed"
                    ? "border-green-200 bg-green-50"
                    : b.booking_status === "reserved"
                      ? "border-orange-200 bg-orange-50"
                      : b.booking_status === "pending"
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-gray-200"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      b.booking_status === "confirmed"
                        ? "bg-green-100"
                        : b.booking_status === "reserved"
                          ? "bg-orange-100"
                          : b.booking_status === "pending"
                            ? "bg-yellow-100"
                            : b.booking_status === "completed"
                              ? "bg-blue-100"
                              : b.booking_status === "converted"
                                ? "bg-purple-100"
                                : "bg-red-100"
                    }`}
                  >
                    <Calendar
                      className={`h-5 w-5 ${
                        b.booking_status === "confirmed"
                          ? "text-green-600"
                          : b.booking_status === "reserved"
                            ? "text-orange-600"
                            : b.booking_status === "pending"
                              ? "text-yellow-600"
                              : b.booking_status === "completed"
                                ? "text-blue-600"
                                : b.booking_status === "converted"
                                  ? "text-purple-600"
                                  : "text-red-600"
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 capitalize">
                      {b.event_type_name}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      {b.booking_reference}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[b.booking_status]}`}
                >
                  {b.booking_status.charAt(0).toUpperCase() +
                    b.booking_status.slice(1)}
                </span>
              </div>

              {/* Payment Status and Acceptance Info */}
              {b.booking_status === "reserved" && (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-orange-700">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="font-medium">Payment Made</span>
                  </div>
                  <p className="text-xs text-orange-600 mt-1">
                    Your reservation payment has been received. Waiting for
                    confirmation.
                  </p>
                </div>
              )}

              {/* Payment Status for Pending Bookings */}
              {b.booking_status === "pending" &&
                b.payments &&
                b.payments.length > 0 && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Payment Submitted</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Payment of ₱{b.payments[0].payment_amount} submitted.
                      Waiting for verification.
                    </p>
                  </div>
                )}

              {b.accepted_by_user_id && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">
                      Accepted by{" "}
                      {b.accepted_by_role === "admin" ? "Admin" : "Staff"}
                    </span>
                  </div>
                  {b.accepted_at && (
                    <p className="text-xs text-green-600 mt-1">
                      Accepted on {new Date(b.accepted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Event Name */}
              {b.event_name && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">
                    {b.event_name}
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg border">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">
                      {formatDate(b.event_date)}
                    </div>
                    {b.event_time && (
                      <div className="text-xs text-gray-500">
                        at {b.event_time}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg border">
                  <Users className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium">{b.guest_count} guests</div>
                  </div>
                </div>
                {b.venue_name && (
                  <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg border">
                    <MapPin className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="font-medium">{b.venue_name}</div>
                    </div>
                  </div>
                )}
                {b.package_name && (
                  <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg border">
                    <Package className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="font-medium">{b.package_name}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Messages */}
              {b.booking_status === "converted" && (
                <div className="p-3 bg-purple-100 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 text-purple-800 text-sm">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span className="font-medium">Converted to Event</span>
                  </div>
                  <p className="text-xs text-purple-700 mt-1">
                    Your booking has been successfully converted to an event by
                    the admin.
                  </p>
                </div>
              )}

              {b.booking_status === "pending" && (
                <div className="p-3 bg-yellow-100 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></div>
                    <span className="font-medium">Awaiting Confirmation</span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Your booking is being reviewed and will be confirmed soon.
                  </p>
                </div>
              )}

              {b.booking_status === "confirmed" && (
                <div className="p-3 bg-green-100 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-800 text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="font-medium">Confirmed</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Your booking is confirmed and ready for the event date.
                  </p>
                </div>
              )}

              {b.booking_status === "cancelled" && b.rejection_reason && (
                <div className="p-4 bg-red-50 rounded-lg border-2 border-red-300 shadow-sm">
                  <div className="flex items-center gap-2 text-red-900 text-sm mb-3">
                    <X className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-base">Booking Rejected</span>
                  </div>
                  <div className="text-sm text-red-800">
                    <p className="font-semibold mb-2 text-red-900">Rejection Reason:</p>
                    <div className="bg-white p-3 rounded border border-red-200">
                      <p className="whitespace-pre-wrap leading-relaxed">{b.rejection_reason}</p>
                    </div>
                  </div>
                </div>
              )}

              {b.booking_status === "cancelled" && !b.rejection_reason && (
                <div className="p-3 bg-red-100 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 text-red-800 text-sm">
                    <X className="h-4 w-4" />
                    <span className="font-medium">Booking Cancelled</span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    This booking has been cancelled.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-auto">
                {b.booking_status === "converted" ? (
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors flex-1 justify-center"
                    onClick={async () => {
                      if (b.converted_event_id) {
                        router.push(`/client/events/${b.converted_event_id}`);
                        return;
                      }

                      if (!userId) {
                        toast({
                          title: "Error",
                          description:
                            "User session expired. Please refresh the page.",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Fallback: Try to find event by booking details
                      try {
                        console.log("Searching for event with userId:", userId);
                        console.log("Booking details:", {
                          date: b.event_date,
                          venue: b.venue_id,
                          guests: b.guest_count,
                          reference: b.booking_reference,
                        });

                        const response = await axios.get(
                          `${endpoints.client}?operation=getClientEvents&user_id=${userId}`
                        );
                        if (response.data.status === "success") {
                          const events = response.data.events || [];
                          console.log("Found events:", events.length);

                          // Find event that matches booking details (more flexible matching)
                          const matchingEvent = events.find(
                            (event: EventData) => {
                              // First priority: match by original booking reference
                              if (
                                event.original_booking_reference ===
                                b.booking_reference
                              ) {
                                console.log(
                                  `Event ${event.event_id} matches by booking reference: ${b.booking_reference}`
                                );
                                return true;
                              }

                              // Normalize data types for comparison
                              const eventDate = event.event_date?.split(" ")[0]; // Remove time part if present
                              const bookingDate = b.event_date?.split(" ")[0];
                              const eventVenueId = event.venue_id
                                ? parseInt(String(event.venue_id))
                                : null;
                              const bookingVenueId = b.venue_id
                                ? parseInt(String(b.venue_id))
                                : null;
                              const eventGuestCount = parseInt(
                                String(event.guest_count)
                              );
                              const bookingGuestCount = parseInt(
                                String(b.guest_count)
                              );

                              // Primary match: exact date, venue, and guest count
                              const exactMatch =
                                eventDate === bookingDate &&
                                eventVenueId === bookingVenueId &&
                                eventGuestCount === bookingGuestCount;

                              // Secondary match: date and guest count (ignore venue if null)
                              const looseMatch =
                                eventDate === bookingDate &&
                                eventGuestCount === bookingGuestCount &&
                                (!bookingVenueId ||
                                  eventVenueId === bookingVenueId);

                              // Tertiary match: just date and guest count (most lenient)
                              const lenientMatch =
                                eventDate === bookingDate &&
                                eventGuestCount === bookingGuestCount;

                              const matches =
                                exactMatch || looseMatch || lenientMatch;
                              console.log(
                                `Event ${event.event_id} (${event.event_title}) matches:`,
                                matches,
                                {
                                  booking_ref: b.booking_reference,
                                  original_ref:
                                    event.original_booking_reference,
                                  exact: exactMatch,
                                  loose: looseMatch,
                                  lenient: lenientMatch,
                                  event_date: eventDate,
                                  booking_date: bookingDate,
                                  event_venue: eventVenueId,
                                  booking_venue: bookingVenueId,
                                  event_guests: eventGuestCount,
                                  booking_guests: bookingGuestCount,
                                }
                              );
                              return matches;
                            }
                          );

                          if (matchingEvent) {
                            console.log(
                              "Found matching event:",
                              matchingEvent.event_id
                            );
                            router.push(
                              `/client/events/${matchingEvent.event_id}`
                            );
                          } else {
                            console.log(
                              "No matching event found, showing event selector"
                            );
                            // Show event selector modal
                            if (events.length > 0) {
                              setSelectedBooking(b); // Set the booking for the modal
                              setAvailableEvents(events as EventData[]);
                              setShowEventSelector(true);
                            } else {
                              toast({
                                title: "Event Not Found",
                                description:
                                  "No events found for your account. Please contact support.",
                                variant: "destructive",
                              });
                            }
                          }
                        }
                      } catch (error) {
                        console.error("Error finding event:", error);
                        toast({
                          title: "Error",
                          description:
                            "Failed to find the event. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    View Event
                  </button>
                ) : (
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 flex-1 justify-center"
                    onClick={() => {
                      setSelectedBooking(b);
                      setShowModal(true);
                      fetchPaymentSettings();
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                )}
                {b.booking_status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditBooking(b)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleCancelBooking(b)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-12 w-12 text-gray-400" />
                </div>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No bookings found
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {search
                  ? "No bookings match your search criteria. Try adjusting your search terms."
                  : activeTab === "All Bookings"
                    ? "You haven't made any bookings yet. Start planning your perfect event!"
                    : `No ${activeTab.toLowerCase()} bookings found.`}
              </p>
              <Link href="/client/bookings/create-booking">
                <button className="bg-[#028A75] hover:bg-[#028A75]/90 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Create Your First Booking
                </button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Booking Details Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                Booking Details
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Header Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 capitalize">
                      {selectedBooking.event_type_name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[selectedBooking.booking_status]}`}
                    >
                      {selectedBooking.booking_status.charAt(0).toUpperCase() +
                        selectedBooking.booking_status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Booking Reference: {selectedBooking.booking_reference}
                  </p>
                  <p className="text-sm text-gray-600">
                    Created:{" "}
                    {new Date(selectedBooking.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Event Name */}
                {selectedBooking.event_name && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Event Name
                    </h4>
                    <p className="text-gray-700">
                      {selectedBooking.event_name}
                    </p>
                  </div>
                )}

                {/* Event Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-900">
                        Date & Time
                      </span>
                    </div>
                    <div className="text-gray-700">
                      <div>{formatDate(selectedBooking.event_date)}</div>
                      {selectedBooking.event_time && (
                        <div className="text-sm text-gray-600">
                          at {selectedBooking.event_time}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-gray-900">Guests</span>
                    </div>
                    <div className="text-gray-700">
                      {selectedBooking.guest_count} guests
                    </div>
                  </div>

                  {selectedBooking.venue_name && (
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-3 mb-2">
                        <MapPin className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-gray-900">Venue</span>
                      </div>
                      <div className="text-gray-700">
                        {selectedBooking.venue_name}
                      </div>
                    </div>
                  )}

                  {selectedBooking.package_name && (
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-3 mb-2">
                        <Package className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-gray-900">
                          Package
                        </span>
                      </div>
                      <div className="text-gray-700">
                        {selectedBooking.package_name}
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Information */}
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-gray-900">
                      Payment Information
                    </h4>
                  </div>

                  {/* Payment History */}
                  {selectedBooking.payments &&
                    selectedBooking.payments.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-3">
                          Payment History
                        </h5>
                        <div className="space-y-2">
                          {selectedBooking.payments.map((payment, index) => (
                            <div
                              key={index}
                              className="p-3 bg-green-50 border border-green-200 rounded-lg"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-green-800">
                                    ₱{payment.payment_amount} -{" "}
                                    {payment.payment_method}
                                  </div>
                                  <div className="text-sm text-green-700">
                                    {new Date(
                                      payment.payment_date
                                    ).toLocaleDateString()}
                                    {payment.payment_reference &&
                                      ` • Ref: ${payment.payment_reference}`}
                                  </div>
                                </div>
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    payment.payment_status === "completed"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {payment.payment_status}
                                </span>
                              </div>
                              {payment.payment_notes && (
                                <div className="text-sm text-green-600 mt-1">
                                  {payment.payment_notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Payment Methods */}
                  <div className="space-y-4">
                    <h5 className="font-medium text-gray-900">
                      Available Payment Methods
                    </h5>

                    {/* GCash Information */}
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">
                          GCash
                        </span>
                      </div>
                      <div className="text-sm text-green-700">
                        {paymentSettings.gcash_name ? (
                          <>
                            <div>Name: {paymentSettings.gcash_name}</div>
                            {paymentSettings.gcash_number && (
                              <div>Number: {paymentSettings.gcash_number}</div>
                            )}
                          </>
                        ) : (
                          <div>GCash details not configured</div>
                        )}
                      </div>
                    </div>

                    {/* Bank Transfer Information */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">
                          Bank Transfer
                        </span>
                      </div>
                      <div className="text-sm text-blue-700">
                        {paymentSettings.bank_name ? (
                          <>
                            <div>Bank: {paymentSettings.bank_name}</div>
                            {paymentSettings.bank_account_name && (
                              <div>
                                Account Name:{" "}
                                {paymentSettings.bank_account_name}
                              </div>
                            )}
                            {paymentSettings.bank_account_number && (
                              <div>
                                Account Number:{" "}
                                {paymentSettings.bank_account_number}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>Bank transfer details not configured</div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-800">
                          Cash on Site
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        You can also pay in cash when you arrive at the venue.
                      </div>
                    </div>

                    {paymentSettings.payment_instructions && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-sm text-yellow-800">
                          <strong>Instructions:</strong>{" "}
                          {paymentSettings.payment_instructions}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {selectedBooking.notes && (
                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-gray-700">{selectedBooking.notes}</p>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedBooking.booking_status === "cancelled" &&
                  selectedBooking.rejection_reason && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <X className="h-5 w-5 text-red-600" />
                        <h4 className="font-medium text-red-900">
                          Rejection Reason
                        </h4>
                      </div>
                      <p className="text-sm text-red-800 whitespace-pre-wrap">
                        {selectedBooking.rejection_reason}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Selector Modal */}
      {showEventSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                Select Event for Booking {selectedBooking?.booking_reference}
              </h2>
              <button
                onClick={() => setShowEventSelector(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">
                  Booking Details:
                </h3>
                <p className="text-blue-800">
                  {selectedBooking?.event_date?.split(" ")[0]},{" "}
                  {selectedBooking?.guest_count} guests
                  {selectedBooking?.venue_name
                    ? `, ${selectedBooking.venue_name}`
                    : ""}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Available Events:</h3>
                {availableEvents
                  .sort(
                    (a: EventData, b: EventData) =>
                      new Date(b.event_date).getTime() -
                      new Date(a.event_date).getTime()
                  )
                  .map((event: EventData) => (
                    <div
                      key={event.event_id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        router.push(`/client/events/${event.event_id}`);
                        setShowEventSelector(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {event.event_title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {event.event_date?.split(" ")[0]},{" "}
                            {event.guest_count} guests
                            {event.venue_name ? `, ${event.venue_name}` : ""}
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-[#028A75] text-white rounded-lg hover:bg-[#028A75]/90">
                          View Event
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Confirmation Dialog */}
      {showCancelDialog && bookingToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden flex flex-col">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                Cancel Booking
              </h2>
              <button
                onClick={() => setShowCancelDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to cancel this booking?
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">
                    {bookingToCancel.event_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDate(bookingToCancel.event_date)} •{" "}
                    {bookingToCancel.guest_count} guests
                  </p>
                  <p className="text-sm text-gray-600">
                    Reference: {bookingToCancel.booking_reference}
                  </p>
                </div>
                <p className="text-sm text-red-600 mt-3">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Keep Booking
                </button>
                <button
                  onClick={confirmCancelBooking}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cancel Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
