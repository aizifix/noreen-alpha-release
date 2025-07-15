"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Package,
  Eye,
  Settings,
  CheckCircle,
  XCircle,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Booking {
  booking_id: number;
  booking_reference: string;
  user_id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
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
    | "converted"
    | "cancelled"
    | "completed";
  created_at: string;
  converted_event_id?: number | null;
}

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [convertingBookingId, setConvertingBookingId] = useState<number | null>(
    null
  );

  useEffect(() => {
    try {
      protectRoute();
      const userData = secureStorage.getItem("user");
      if (
        !userData ||
        (userData.user_role !== "Admin" && userData.user_role !== "admin")
      ) {
        router.push("/auth/login");
        return;
      }
      fetchBookings();
    } catch (error) {
      router.push("/auth/login");
    }
  }, [router]);

  // Filter bookings based on search and status
  useEffect(() => {
    let filtered = bookings;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.booking_reference
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.client_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.event_type_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (booking) => booking.booking_status === statusFilter
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Fetching bookings from API...");

      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "getAllBookings",
        }
      );

      console.log("📡 API Response:", response.data);

      if (response.data.status === "success") {
        console.log("✅ Success! Fetched bookings:", response.data.bookings);
        console.log(
          "📊 Total bookings count:",
          response.data.count || response.data.bookings?.length || 0
        );
        setBookings(response.data.bookings || []);

        if (!response.data.bookings || response.data.bookings.length === 0) {
          console.log("ℹ️ No bookings found in the database");
        }
      } else {
        console.error("❌ API Error:", response.data.message);
        toast({
          title: "Error",
          description: response.data.message || "Failed to fetch bookings",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("💥 Network Error:", error);
      console.error("Error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });

      toast({
        title: "Error",
        description:
          error?.response?.data?.message || "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToEvent = async (booking: Booking) => {
    try {
      setConvertingBookingId(booking.booking_id);

      // Navigate to event builder with pre-filled booking data
      const eventBuilderUrl = `/admin/event-builder?booking_ref=${booking.booking_reference}`;
      router.push(eventBuilderUrl);
    } catch (error) {
      console.error("Error converting booking:", error);
      toast({
        title: "Error",
        description: "Failed to convert booking to event",
        variant: "destructive",
      });
    } finally {
      setConvertingBookingId(null);
    }
  };

  const handleAcceptBooking = async (booking: Booking) => {
    try {
      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "updateBookingStatus",
          booking_id: booking.booking_id,
          status: "confirmed",
        }
      );

      if (response.data.status === "success") {
        toast({
          title: "Booking Accepted",
          description: `Booking ${booking.booking_reference} has been confirmed and is now available for event creation.`,
        });
        fetchBookings(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to accept booking",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error accepting booking:", error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    }
  };

  const handleRejectBooking = async (booking: Booking) => {
    if (
      !confirm(
        `Are you sure you want to reject booking ${booking.booking_reference}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "updateBookingStatus",
          booking_id: booking.booking_id,
          status: "cancelled",
        }
      );

      if (response.data.status === "success") {
        toast({
          title: "Booking Rejected",
          description: `Booking ${booking.booking_reference} has been cancelled.`,
        });
        fetchBookings(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to reject booking",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    }
  };

  const handleUpdateBookingStatus = async (
    bookingId: number,
    newStatus: string
  ) => {
    try {
      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "updateBookingStatus",
          booking_id: bookingId,
          status: newStatus,
        }
      );

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: `Booking status updated to ${newStatus}`,
        });
        fetchBookings(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description:
            response.data.message || "Failed to update booking status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "converted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />;
      case "converted":
        return <CheckCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const isPending = booking.booking_status === "pending";
    const isConfirmed = booking.booking_status === "confirmed";
    const isConverted = booking.booking_status === "converted";
    const isCancelled = booking.booking_status === "cancelled";
    const canConvert = booking.booking_status === "confirmed"; // Only confirmed bookings can be converted

    return (
      <div
        className={`bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow ${
          isConfirmed ? "border-green-200 bg-green-50" : ""
        } ${isConverted ? "border-blue-200 bg-blue-50" : ""}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {booking.booking_reference}
            </h3>
            <p className="text-sm text-gray-600">{booking.event_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={`${getStatusColor(booking.booking_status)} flex items-center gap-1`}
            >
              {getStatusIcon(booking.booking_status)}
              {booking.booking_status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div
            key="client"
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            <Users className="h-4 w-4" />
            <span>{booking.client_name}</span>
          </div>
          <div
            key="date"
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            <Calendar className="h-4 w-4" />
            <span>{new Date(booking.event_date).toLocaleDateString()}</span>
          </div>
          <div
            key="time"
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            <Clock className="h-4 w-4" />
            <span>{booking.event_time}</span>
          </div>
          <div
            key="guests"
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            <Users className="h-4 w-4" />
            <span>{booking.guest_count} guests</span>
          </div>
          {booking.venue_name && (
            <div
              key="venue"
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <MapPin className="h-4 w-4" />
              <span>{booking.venue_name}</span>
            </div>
          )}
          {booking.package_name && (
            <div
              key="package"
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <Package className="h-4 w-4" />
              <span>{booking.package_name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Created: {new Date(booking.created_at).toLocaleDateString()}
          </span>
          <div className="flex gap-2">
            <Button
              key="view-button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedBooking(booking);
                setShowDetailsModal(true);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>

            {/* Show Accept/Reject buttons for pending bookings */}
            {isPending && (
              <>
                <Button
                  key="accept-button"
                  size="sm"
                  onClick={() => handleAcceptBooking(booking)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  key="reject-button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRejectBooking(booking)}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {/* Show Convert to Event button for confirmed bookings */}
            {canConvert && (
              <Button
                key="convert-button"
                size="sm"
                onClick={() => handleConvertToEvent(booking)}
                disabled={convertingBookingId === booking.booking_id}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {convertingBookingId === booking.booking_id ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-1" />
                )}
                Convert to Event
              </Button>
            )}

            {(isConfirmed || isConverted) && (
              <Button
                key="view-event-button"
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push(
                    `/admin/events?booking_ref=${booking.booking_reference}`
                  );
                }}
                className={
                  isConverted
                    ? "border-blue-200 text-blue-700 hover:bg-blue-50"
                    : "border-green-200 text-green-700 hover:bg-green-50"
                }
              >
                View Event
              </Button>
            )}
          </div>
        </div>

        {isConfirmed && (
          <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-800">
            ✅ This booking has been confirmed and an event has been created.
          </div>
        )}

        {isConverted && (
          <div className="mt-3 p-2 bg-blue-100 rounded text-sm text-blue-800">
            🔄 This booking has been converted to an event and is no longer
            available for editing.
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
        <Button onClick={fetchBookings} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by reference, client name, or event..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option key="all" value="all">
              All Status
            </option>
            <option key="pending" value="pending">
              Pending
            </option>
            <option key="confirmed" value="confirmed">
              Confirmed
            </option>
            <option key="converted" value="converted">
              Converted
            </option>
            <option key="completed" value="completed">
              Completed
            </option>
            <option key="cancelled" value="cancelled">
              Cancelled
            </option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">
            {bookings.filter((b) => b.booking_status === "pending").length}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">
            {bookings.filter((b) => b.booking_status === "confirmed").length}
          </div>
          <div className="text-sm text-gray-600">Confirmed</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">
            {bookings.filter((b) => b.booking_status === "converted").length}
          </div>
          <div className="text-sm text-gray-600">Converted</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">
            {bookings.filter((b) => b.booking_status === "cancelled").length}
          </div>
          <div className="text-sm text-gray-600">Cancelled</div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-12 bg-white rounded-lg border">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading bookings...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            {bookings.length === 0 ? (
              <div className="space-y-4">
                <div className="text-6xl">📋</div>
                <h3 className="text-xl font-semibold text-gray-700">
                  No Bookings Yet
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  No client bookings have been submitted yet. When clients
                  create bookings, they will appear here for you to review and
                  approve.
                </p>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Tip:</strong> Clients can create bookings from
                    the client portal. Once submitted, you can accept or reject
                    them here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-4xl">🔍</div>
                <h3 className="text-lg font-semibold text-gray-700">
                  No Results Found
                </h3>
                <p className="text-gray-500">
                  No bookings match your current search criteria or filters.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Try adjusting your search term or filter settings.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredBookings.map((booking) => (
              <BookingCard key={booking.booking_reference} booking={booking} />
            ))}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              {selectedBooking?.booking_reference}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              {/* Status and Actions */}
              <div className="flex items-center justify-between">
                <Badge
                  className={`${getStatusColor(selectedBooking.booking_status)} flex items-center gap-1`}
                >
                  {getStatusIcon(selectedBooking.booking_status)}
                  {selectedBooking.booking_status}
                </Badge>
                <div className="flex gap-2">
                  {selectedBooking.booking_status === "pending" && (
                    <>
                      <Button
                        key="modal-confirm-btn"
                        size="sm"
                        onClick={() =>
                          handleUpdateBookingStatus(
                            selectedBooking.booking_id,
                            "confirmed"
                          )
                        }
                      >
                        Confirm
                      </Button>
                      <Button
                        key="modal-cancel-btn"
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          handleUpdateBookingStatus(
                            selectedBooking.booking_id,
                            "cancelled"
                          )
                        }
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {selectedBooking.booking_status === "pending" && (
                    <Button
                      key="modal-convert-btn"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleConvertToEvent(selectedBooking)}
                    >
                      Convert to Event
                    </Button>
                  )}
                </div>
              </div>

              {/* Client Information */}
              <div>
                <h4 className="font-semibold mb-2">Client Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div>
                    <strong>Name:</strong> {selectedBooking.client_name}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedBooking.client_email}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedBooking.client_phone}
                  </div>
                </div>
              </div>

              {/* Event Information */}
              <div>
                <h4 className="font-semibold mb-2">Event Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div>
                    <strong>Event Name:</strong> {selectedBooking.event_name}
                  </div>
                  <div>
                    <strong>Event Type:</strong>{" "}
                    {selectedBooking.event_type_name}
                  </div>
                  <div>
                    <strong>Date:</strong>{" "}
                    {new Date(selectedBooking.event_date).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Time:</strong> {selectedBooking.event_time}
                  </div>
                  <div>
                    <strong>Guest Count:</strong> {selectedBooking.guest_count}
                  </div>
                  {selectedBooking.venue_name && (
                    <div>
                      <strong>Venue:</strong> {selectedBooking.venue_name}
                    </div>
                  )}
                  {selectedBooking.package_name && (
                    <div>
                      <strong>Package:</strong> {selectedBooking.package_name}
                    </div>
                  )}
                  {selectedBooking.notes && (
                    <div>
                      <strong>Notes:</strong> {selectedBooking.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Information */}
              <div>
                <h4 className="font-semibold mb-2">Booking Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div>
                    <strong>Reference:</strong>{" "}
                    {selectedBooking.booking_reference}
                  </div>
                  <div>
                    <strong>Created:</strong>{" "}
                    {new Date(selectedBooking.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Status:</strong> {selectedBooking.booking_status}
                  </div>
                  {selectedBooking.converted_event_id && (
                    <div>
                      <strong>Event ID:</strong>{" "}
                      {selectedBooking.converted_event_id}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
