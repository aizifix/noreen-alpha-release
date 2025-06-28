"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Eye,
  Plus,
  Clock,
  Users,
  MapPin,
  Package,
} from "lucide-react";
import axios from "axios";

const statusColors: { [key: string]: string } = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
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
    | "cancelled";
  created_at: string;
}

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState("All Bookings");
  const [search, setSearch] = useState("");
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

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
              const secureStorage =
                require("@/app/utils/encryption").secureStorage;
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

    // Check for bookings in localStorage first (for demo purposes)
    const localBookings = localStorage.getItem("newBookings");

    if (localBookings) {
      try {
        const parsedBookings = JSON.parse(localBookings);
        // Convert to expected DbBooking format
        const formattedBookings: DbBooking[] = parsedBookings.map((b: any) => ({
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
        }));

        setBookings(formattedBookings);
        setLoading(false);
      } catch (err) {
        console.error("Error parsing local bookings:", err);
      }
    }

    // If we have a userId, fetch from API
    if (uid) {
      fetchBookings(uid);
    } else {
      if (!localBookings) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch bookings from API using Axios
  const fetchBookings = async (uid: number) => {
    try {
      setLoading(true);
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: {
            operation: "getClientBookings",
            user_id: uid,
          },
        }
      );

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

          mergedBookings = [...mergedBookings, ...formattedLocalBookings];
        }

        setBookings(mergedBookings);
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

  // Filter by tab and search
  const filtered = bookings.filter((b) => {
    if (activeTab === "Upcoming") {
      if (!(b.booking_status === "confirmed" || b.booking_status === "pending"))
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
          <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg flex items-center gap-2">
            <Plus className="h-5 w-5" /> Book New Event
          </button>
        </Link>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <input
          type="text"
          placeholder="Search bookings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <div className="flex gap-2 mt-2 md:mt-0">
          {["All Bookings", "Upcoming", "Past"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                activeTab === tab
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-green-50"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
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
        /* Bookings Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((b) => (
            <div
              key={b.booking_reference}
              className={`bg-white rounded-lg border p-5 flex flex-col gap-3 shadow-sm ${
                b.booking_status === "converted"
                  ? "opacity-75 bg-gray-50 border-purple-200"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg capitalize">
                  {b.event_type_name}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[b.booking_status]}`}
                >
                  {b.booking_status.charAt(0).toUpperCase() +
                    b.booking_status.slice(1)}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-1">
                Booking Ref: {b.booking_reference}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  {formatDate(b.event_date)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="h-4 w-4 text-gray-500" />
                  {b.event_time}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Users className="h-4 w-4 text-gray-500" />
                  {b.guest_count} guests
                </div>
                {b.venue_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    {b.venue_name}
                  </div>
                )}
                {b.package_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Package className="h-4 w-4 text-gray-500" />
                    {b.package_name}
                  </div>
                )}
              </div>

              {b.event_name && (
                <div className="mt-1 text-sm text-gray-600">{b.event_name}</div>
              )}

              {b.booking_status === "converted" && (
                <div className="mt-2 p-2 bg-purple-100 rounded text-xs text-purple-800">
                  ✅ This booking has been converted to an event by the admin.
                </div>
              )}

              <div className="mt-2">
                <button
                  className={`flex items-center gap-2 px-3 py-1 border rounded-lg text-sm w-full justify-center ${
                    b.booking_status === "converted"
                      ? "text-gray-500 bg-gray-100 cursor-not-allowed"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  disabled={b.booking_status === "converted"}
                >
                  <Eye className="h-4 w-4" />
                  {b.booking_status === "converted"
                    ? "Event Created"
                    : "View Details"}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-10">
              No bookings found.
              <Link href="/client/bookings/create-booking">
                <span className="text-green-600 hover:underline ml-1">
                  Create your first booking
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
