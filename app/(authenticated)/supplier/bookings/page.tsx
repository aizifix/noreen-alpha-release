"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  DollarSign,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Eye,
  Edit,
  Filter,
  Search,
} from "lucide-react";

interface Booking {
  event_component_id: number;
  event_id: number;
  event_title: string;
  event_date: string;
  event_startTime: string;
  event_endTime: string;
  user_firstName: string;
  user_lastName: string;
  user_email: string;
  user_contact: string;
  offer_title: string;
  tier_name: string;
  component_title: string;
  component_description: string;
  component_price: number;
  actual_cost?: number;
  supplier_status: "pending" | "confirmed" | "delivered" | "cancelled";
  supplier_notes?: string;
  admin_notes?: string;
  delivery_date?: string;
  created_at: string;
  updated_at: string;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusIcons = {
  pending: AlertCircle,
  confirmed: Clock,
  delivered: CheckCircle,
  cancelled: XCircle,
};

export default function SupplierBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  // Status update form
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, statusFilter, searchTerm, dateFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const userId = 1; // This should come from authentication

      const response = await fetch(
        `http://localhost/events-api/supplier.php?operation=getBookings&user_id=${userId}`
      );
      const data = await response.json();

      if (data.status === "success") {
        setBookings(data.bookings);
      } else {
        console.error("Failed to fetch bookings:", data.message);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = bookings;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (booking) => booking.supplier_status === statusFilter
      );
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (booking) =>
          booking.event_title.toLowerCase().includes(term) ||
          booking.offer_title.toLowerCase().includes(term) ||
          booking.user_firstName.toLowerCase().includes(term) ||
          booking.user_lastName.toLowerCase().includes(term) ||
          booking.component_title.toLowerCase().includes(term)
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "upcoming":
          filtered = filtered.filter(
            (booking) => new Date(booking.event_date) >= now
          );
          break;
        case "past":
          filtered = filtered.filter(
            (booking) => new Date(booking.event_date) < now
          );
          break;
        case "this_week":
          filterDate.setDate(now.getDate() + 7);
          filtered = filtered.filter(
            (booking) =>
              new Date(booking.event_date) >= now &&
              new Date(booking.event_date) <= filterDate
          );
          break;
        case "this_month":
          filterDate.setMonth(now.getMonth() + 1);
          filtered = filtered.filter(
            (booking) =>
              new Date(booking.event_date) >= now &&
              new Date(booking.event_date) <= filterDate
          );
          break;
      }
    }

    setFilteredBookings(filtered);
  };

  const updateBookingStatus = async () => {
    if (!selectedBooking || !newStatus) return;

    try {
      setUpdating(true);

      const response = await fetch(
        `http://localhost/events-api/supplier.php?operation=updateBookingStatus&event_component_id=${selectedBooking.event_component_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
            notes: statusNotes,
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        // Update local state
        setBookings((prev) =>
          prev.map((booking) =>
            booking.event_component_id === selectedBooking.event_component_id
              ? {
                  ...booking,
                  supplier_status: newStatus as any,
                  supplier_notes: statusNotes,
                  updated_at: new Date().toISOString(),
                }
              : booking
          )
        );

        setShowStatusModal(false);
        setSelectedBooking(null);
        setNewStatus("");
        setStatusNotes("");
      } else {
        console.error("Failed to update booking status:", data.message);
        alert("Failed to update booking status: " + data.message);
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      alert("Error updating booking status");
    } finally {
      setUpdating(false);
    }
  };

  const openStatusModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setNewStatus(booking.supplier_status);
    setStatusNotes(booking.supplier_notes || "");
    setShowStatusModal(true);
  };

  const openDetailsModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusCounts = () => {
    return {
      all: bookings.length,
      pending: bookings.filter((b) => b.supplier_status === "pending").length,
      confirmed: bookings.filter((b) => b.supplier_status === "confirmed")
        .length,
      delivered: bookings.filter((b) => b.supplier_status === "delivered")
        .length,
      cancelled: bookings.filter((b) => b.supplier_status === "cancelled")
        .length,
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-600">
          Manage your event bookings and update delivery status
        </p>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            statusFilter === "all"
              ? "border-brand-500 bg-brand-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => setStatusFilter("all")}
        >
          <div className="text-2xl font-bold text-gray-900">
            {statusCounts.all}
          </div>
          <div className="text-sm text-gray-600">All Bookings</div>
        </div>

        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            statusFilter === "pending"
              ? "border-yellow-500 bg-yellow-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => setStatusFilter("pending")}
        >
          <div className="text-2xl font-bold text-yellow-600">
            {statusCounts.pending}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>

        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            statusFilter === "confirmed"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => setStatusFilter("confirmed")}
        >
          <div className="text-2xl font-bold text-blue-600">
            {statusCounts.confirmed}
          </div>
          <div className="text-sm text-gray-600">Confirmed</div>
        </div>

        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            statusFilter === "delivered"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => setStatusFilter("delivered")}
        >
          <div className="text-2xl font-bold text-green-600">
            {statusCounts.delivered}
          </div>
          <div className="text-sm text-gray-600">Delivered</div>
        </div>

        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            statusFilter === "cancelled"
              ? "border-red-500 bg-red-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => setStatusFilter("cancelled")}
        >
          <div className="text-2xl font-bold text-red-600">
            {statusCounts.cancelled}
          </div>
          <div className="text-sm text-gray-600">Cancelled</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search bookings, events, or clients..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past Events</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No bookings found
            </h3>
            <p className="text-gray-600">
              {statusFilter !== "all" || searchTerm || dateFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "You don't have any bookings yet."}
            </p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const StatusIcon = statusIcons[booking.supplier_status];
            return (
              <div
                key={booking.event_component_id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.event_title}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                          statusColors[booking.supplier_status]
                        }`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {booking.supplier_status.charAt(0).toUpperCase() +
                          booking.supplier_status.slice(1)}
                      </span>
                      {booking.tier_name && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          {booking.tier_name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(booking.event_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTime(booking.event_startTime)} -{" "}
                          {formatTime(booking.event_endTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>
                          {booking.user_firstName} {booking.user_lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">
                          {formatCurrency(
                            booking.actual_cost || booking.component_price
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {booking.component_title}
                        </span>
                      </div>
                      {booking.component_description && (
                        <p className="text-sm text-gray-600 ml-6">
                          {booking.component_description}
                        </p>
                      )}
                    </div>

                    {booking.supplier_notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Notes:</span>{" "}
                          {booking.supplier_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:w-40">
                    <button
                      onClick={() => openDetailsModal(booking)}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={() => openStatusModal(booking)}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Update Status</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Booking Details
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Event Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Event Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {selectedBooking.event_title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(selectedBooking.event_date)} at{" "}
                        {formatTime(selectedBooking.event_startTime)} -{" "}
                        {formatTime(selectedBooking.event_endTime)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Client Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {selectedBooking.user_firstName}{" "}
                        {selectedBooking.user_lastName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div className="text-gray-600">
                      {selectedBooking.user_email}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div className="text-gray-600">
                      {selectedBooking.user_contact}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Service Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {selectedBooking.component_title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedBooking.offer_title}
                      </div>
                      {selectedBooking.tier_name && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          {selectedBooking.tier_name}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedBooking.component_description && (
                    <div className="text-sm text-gray-700 mt-2">
                      {selectedBooking.component_description}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(
                          selectedBooking.actual_cost ||
                            selectedBooking.component_price
                        )}
                      </div>
                      {selectedBooking.actual_cost &&
                        selectedBooking.actual_cost !==
                          selectedBooking.component_price && (
                          <div className="text-sm text-gray-600">
                            Original:{" "}
                            {formatCurrency(selectedBooking.component_price)}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Notes */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Status & Notes
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${statusColors[selectedBooking.supplier_status]}`}
                    >
                      {React.createElement(
                        statusIcons[selectedBooking.supplier_status],
                        { className: "h-4 w-4" }
                      )}
                      {selectedBooking.supplier_status.charAt(0).toUpperCase() +
                        selectedBooking.supplier_status.slice(1)}
                    </div>
                  </div>
                  {selectedBooking.supplier_notes && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Supplier Notes:
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedBooking.supplier_notes}
                      </div>
                    </div>
                  )}
                  {selectedBooking.admin_notes && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Admin Notes:
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedBooking.admin_notes}
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Last updated:{" "}
                    {new Date(selectedBooking.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Update Booking Status
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedBooking.event_title} -{" "}
                {selectedBooking.component_title}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add any notes about this status update..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={updateBookingStatus}
                className="flex-1 px-4 py-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={updating || !newStatus}
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Status"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
