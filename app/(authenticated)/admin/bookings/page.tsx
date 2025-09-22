"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

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
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any | null>(null);
  const [packageDetails, setPackageDetails] = useState<any | null>(null);
  const [venuePricingInfo, setVenuePricingInfo] = useState<{
    basePrice: number;
    extraPaxRate: number;
    overflowCharge: number;
    estimatedTotal: number;
  } | null>(null);
  const [convertingBookingId, setConvertingBookingId] = useState<number | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<string>("cards");
  const [tableCurrentPage, setTableCurrentPage] = useState<number>(1);
  const [tableItemsPerPage, setTableItemsPerPage] = useState<number>(10);
  const [detailsTab, setDetailsTab] = useState<string>("summary");

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
    // Reset table page when filters/search change
    setTableCurrentPage(1);
  }, [bookings, searchTerm, statusFilter]);

  // Derived pagination data for table view
  const tableTotalItems = filteredBookings.length;
  const tableTotalPages = Math.max(
    1,
    Math.ceil(tableTotalItems / tableItemsPerPage)
  );
  const safeTableCurrentPage = Math.min(tableCurrentPage, tableTotalPages);
  const tableStartIndex = (safeTableCurrentPage - 1) * tableItemsPerPage;
  const tablePageBookings = filteredBookings.slice(
    tableStartIndex,
    tableStartIndex + tableItemsPerPage
  );

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

  // Parse component changes json either from explicit field or from notes suffix
  const parseComponentChanges = (
    booking: any
  ): {
    custom_components?: any[];
    removed_components?: (string | number)[];
  } => {
    try {
      if (!booking) return {};
      if (booking.component_changes) {
        if (typeof booking.component_changes === "string") {
          try {
            return JSON.parse(booking.component_changes);
          } catch (_) {
            // fallthrough to notes parsing
          }
        } else if (typeof booking.component_changes === "object") {
          return booking.component_changes;
        }
      }
      // Fallback: parse from notes if present as "Component changes: {json}"
      const notes: string = booking.notes || "";
      const marker = "Component changes:";
      const idx = notes.indexOf(marker);
      if (idx >= 0) {
        const jsonPart = notes.substring(idx + marker.length).trim();
        try {
          return JSON.parse(jsonPart);
        } catch (_) {
          return {};
        }
      }
      return {};
    } catch (e) {
      return {};
    }
  };

  // When opening modal, fetch deeper booking + package/venue info
  useEffect(() => {
    const loadDetails = async () => {
      if (!showDetailsModal || !selectedBooking) return;
      setDetailsLoading(true);
      setBookingDetails(null);
      setPackageDetails(null);
      setVenuePricingInfo(null);
      try {
        const ref = selectedBooking.booking_reference;
        const pkgId = selectedBooking.package_id;
        const venueId = selectedBooking.venue_id;
        const guestCount = selectedBooking.guest_count;

        const requests: Promise<any>[] = [];
        // Detailed booking (includes b.* like total_price, component_changes)
        requests.push(
          axios.get("http://localhost/events-api/admin.php", {
            params: { operation: "getBookingByReference", reference: ref },
          })
        );
        if (pkgId) {
          // Package details (inclusions list)
          requests.push(
            axios.get("http://localhost/events-api/admin.php", {
              params: { operation: "getPackageDetails", package_id: pkgId },
            })
          );
          // Venue pricing with extra pax rate via client endpoint
          if (venueId) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, "0");
            const dd = String(today.getDate()).padStart(2, "0");
            const dateStr = `${yyyy}-${mm}-${dd}`;
            requests.push(
              axios.get("http://localhost/events-api/client.php", {
                params: {
                  operation: "getVenuesByPackage",
                  package_id: pkgId,
                  event_date: dateStr,
                  guest_count: guestCount,
                },
              })
            );
          }
        }
        const [bookingRes, pkgRes, venuesRes] = (await Promise.allSettled(
          requests
        )) as any;

        if (
          bookingRes?.status === "fulfilled" &&
          bookingRes.value?.data?.status === "success"
        ) {
          setBookingDetails(bookingRes.value.data.booking);
        }
        if (
          pkgRes?.status === "fulfilled" &&
          pkgRes.value?.data?.status === "success"
        ) {
          setPackageDetails(pkgRes.value.data.package);
        }

        if (
          venuesRes?.status === "fulfilled" &&
          venuesRes.value?.data?.status === "success" &&
          Array.isArray(venuesRes.value.data.venues)
        ) {
          const venues = venuesRes.value.data.venues as any[];
          const v = venues.find(
            (x) => Number(x.venue_id) === Number(selectedBooking.venue_id)
          );
          if (v) {
            const base = parseFloat(String(v.venue_price)) || 0;
            const rate =
              v.extra_pax_rate !== undefined && v.extra_pax_rate !== null
                ? parseFloat(String(v.extra_pax_rate))
                : 0;
            const extras =
              guestCount > 100 && rate > 0 ? (guestCount - 100) * rate : 0;
            setVenuePricingInfo({
              basePrice: base,
              extraPaxRate: Number.isFinite(rate) ? rate : 0,
              overflowCharge: extras,
              estimatedTotal: base + extras,
            });
          }
        }
      } catch (e) {
        // silent; modal still shows base info
      } finally {
        setDetailsLoading(false);
      }
    };
    loadDetails();
  }, [showDetailsModal, selectedBooking]);

  // Derived details for modal summary and breakdown
  const detailsSummary = useMemo(() => {
    const result: {
      includedNames: string[];
      removedNames: string[];
      customItems: any[];
      supplierServices: any[];
      customAddOns: any[];
      packagePrice: number;
      supplierServicesTotal: number;
      customAddOnsTotal: number;
      submittedTotal: number | null;
      estimatedVenueBase: number;
      estimatedVenueExtras: number;
      estimatedVenueTotal: number;
      computedSubtotal: number;
      computedGrandTotal: number;
    } = {
      includedNames: [],
      removedNames: [],
      customItems: [],
      supplierServices: [],
      customAddOns: [],
      packagePrice: 0,
      supplierServicesTotal: 0,
      customAddOnsTotal: 0,
      submittedTotal: null,
      estimatedVenueBase: 0,
      estimatedVenueExtras: 0,
      estimatedVenueTotal: 0,
      computedSubtotal: 0,
      computedGrandTotal: 0,
    };

    try {
      const changes = parseComponentChanges(bookingDetails);
      const removed: (string | number)[] = Array.isArray(
        changes?.removed_components
      )
        ? changes.removed_components
        : [];
      const custom = Array.isArray(changes?.custom_components)
        ? changes.custom_components
        : [];
      result.customItems = custom;

      // Split custom into supplier vs non-supplier
      result.supplierServices = custom.filter(
        (c: any) => c?.is_supplier_service || c?.supplier_id || c?.supplier_name
      );
      result.customAddOns = custom.filter(
        (c: any) =>
          !(c?.is_supplier_service || c?.supplier_id || c?.supplier_name)
      );

      // Build inclusion names from packageDetails.inclusions
      const pkgInclusions: any[] = packageDetails?.inclusions || [];
      const removedNames: string[] = [];
      const includedNames: string[] = [];
      if (Array.isArray(pkgInclusions) && pkgInclusions.length > 0) {
        pkgInclusions.forEach((inc: any) => {
          const id = inc.id || inc.component_id || inc.inclusion_id || inc.name;
          const name = inc.name || inc.component_name || inc.inclusion_name;
          if (removed.includes(id)) removedNames.push(String(name));
          else includedNames.push(String(name));
        });
      }
      result.removedNames = removedNames;
      result.includedNames = includedNames;

      // Prices
      result.packagePrice = Number(packageDetails?.package_price || 0) || 0;
      result.supplierServicesTotal = result.supplierServices.reduce(
        (sum: number, c: any) =>
          sum +
          (Number(c.price || c.component_price || c.inclusion_price || 0) || 0),
        0
      );
      result.customAddOnsTotal = result.customAddOns.reduce(
        (sum: number, c: any) =>
          sum +
          (Number(c.price || c.component_price || c.inclusion_price || 0) || 0),
        0
      );
      result.submittedTotal = bookingDetails?.total_price
        ? Number(bookingDetails.total_price)
        : null;

      // Venue estimates
      if (venuePricingInfo) {
        result.estimatedVenueBase =
          Number(venuePricingInfo.basePrice || 0) || 0;
        result.estimatedVenueExtras =
          Number(venuePricingInfo.overflowCharge || 0) || 0;
        result.estimatedVenueTotal =
          Number(venuePricingInfo.estimatedTotal || 0) || 0;
      }

      // Computed totals (best-effort, may differ from submitted)
      result.computedSubtotal =
        result.packagePrice +
        result.supplierServicesTotal +
        result.customAddOnsTotal;
      result.computedGrandTotal =
        result.computedSubtotal + (result.estimatedVenueTotal || 0);
    } catch (_) {
      // ignore
    }

    return result;
  }, [bookingDetails, packageDetails, venuePricingInfo]);

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
        return "bg-[#E6F5F2] text-[#065f54] border-[#BFE8E0]";
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
          isConfirmed ? "border-[#BFE8E0] bg-[#F0FBF9]" : ""
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
                  className="bg-[#028A75] hover:bg-[#027563]"
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
            {isConfirmed && (
              <Button
                key="create-event-button"
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
                Create an Event
              </Button>
            )}

            {/* Show View Event button for converted bookings only */}
            {isConverted && (
              <Button
                key="view-event-button"
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push(
                    `/admin/events?booking_ref=${booking.booking_reference}`
                  );
                }}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
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
    <div className="min-h-screen p-6 animate-fadeSlideIn">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Booking Management
            </h1>
            <Button onClick={fetchBookings} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Search and Filters Section */}
          <div className="animate-slide-up-delay-2 mb-8">
            <Card className="bg-white border-0">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  {/* Search Bar */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      placeholder="Search by reference, client name, or event..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-3 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#028A75] focus:border-transparent"
                    />
                  </div>

                  {/* Filter Toggle */}
                  <div className="flex items-center gap-3">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#028A75] focus:border-transparent text-sm"
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
              </CardContent>
            </Card>
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
                {
                  bookings.filter((b) => b.booking_status === "confirmed")
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Confirmed</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">
                {
                  bookings.filter((b) => b.booking_status === "converted")
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Converted</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">
                {
                  bookings.filter((b) => b.booking_status === "cancelled")
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </div>
          </div>

          {/* Tabs for Card/Table views */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="cards">Card View</TabsTrigger>
                <TabsTrigger value="table">Table View</TabsTrigger>
              </TabsList>
            </div>

            {/* Card View */}
            <TabsContent value="cards">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12 bg-white rounded-lg border">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">
                      Loading bookings...
                    </span>
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
                          No client bookings have been submitted yet. When
                          clients create bookings, they will appear here for you
                          to review and approve.
                        </p>
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-700">
                            💡 <strong>Tip:</strong> Clients can create bookings
                            from the client portal. Once submitted, you can
                            accept or reject them here.
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
                          No bookings match your current search criteria or
                          filters.
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
                      <BookingCard
                        key={booking.booking_reference}
                        booking={booking}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Table View */}
            <TabsContent value="table">
              <Card className="bg-white border-0">
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">
                        Loading bookings...
                      </span>
                    </div>
                  ) : filteredBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl">🔍</div>
                      <h3 className="text-lg font-semibold text-gray-700 mt-2">
                        No bookings found
                      </h3>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="text-sm text-gray-600">
                          Showing{" "}
                          {Math.min(tableStartIndex + 1, tableTotalItems)}-
                          {Math.min(
                            tableStartIndex + tableItemsPerPage,
                            tableTotalItems
                          )}{" "}
                          of {tableTotalItems}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Rows per page
                          </span>
                          <select
                            value={tableItemsPerPage}
                            onChange={(e) => {
                              setTableItemsPerPage(Number(e.target.value));
                              setTableCurrentPage(1);
                            }}
                            className="w-28 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {[10, 20, 50, 100].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[140px]">
                              Reference
                            </TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead className="w-[120px]">Date</TableHead>
                            <TableHead className="w-[80px]">Time</TableHead>
                            <TableHead className="w-[90px]">Guests</TableHead>
                            <TableHead>Venue</TableHead>
                            <TableHead>Package</TableHead>
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead className="w-[260px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tablePageBookings.map((booking, index) => (
                            <TableRow
                              key={`booking-row-${booking.booking_id}-${index}`}
                            >
                              <TableCell className="font-medium">
                                {booking.booking_reference}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-900">
                                  {booking.client_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {booking.client_email}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-900 truncate max-w-[220px]">
                                  {booking.event_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {booking.event_type_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                {new Date(
                                  booking.event_date
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{booking.event_time}</TableCell>
                              <TableCell>{booking.guest_count}</TableCell>
                              <TableCell className="truncate max-w-[180px]">
                                {booking.venue_name || "-"}
                              </TableCell>
                              <TableCell className="truncate max-w-[180px]">
                                {booking.package_name || "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${getStatusColor(booking.booking_status)} flex items-center gap-1`}
                                >
                                  {getStatusIcon(booking.booking_status)}
                                  {booking.booking_status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    key="view"
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
                                  {booking.booking_status === "pending" && (
                                    <>
                                      <Button
                                        key="accept"
                                        size="sm"
                                        onClick={() =>
                                          handleAcceptBooking(booking)
                                        }
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Accept
                                      </Button>
                                      <Button
                                        key="reject"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleRejectBooking(booking)
                                        }
                                        className="border-red-200 text-red-700 hover:bg-red-50"
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {booking.booking_status === "confirmed" && (
                                    <Button
                                      key="convert"
                                      size="sm"
                                      onClick={() =>
                                        handleConvertToEvent(booking)
                                      }
                                      disabled={
                                        convertingBookingId ===
                                        booking.booking_id
                                      }
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      {convertingBookingId ===
                                      booking.booking_id ? (
                                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                      ) : (
                                        <ArrowRight className="h-4 w-4 mr-1" />
                                      )}
                                      Create an Event
                                    </Button>
                                  )}
                                  {booking.booking_status === "converted" && (
                                    <Button
                                      key="view-event"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        router.push(
                                          `/admin/events?booking_ref=${booking.booking_reference}`
                                        );
                                      }}
                                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                                    >
                                      View Event
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {tableTotalPages > 1 && (
                        <Pagination className="pt-2">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setTableCurrentPage((p) =>
                                    Math.max(1, p - 1)
                                  );
                                }}
                                className={
                                  safeTableCurrentPage === 1
                                    ? "pointer-events-none opacity-50"
                                    : ""
                                }
                              />
                            </PaginationItem>
                            {(() => {
                              const pages: number[] = [];
                              const total = tableTotalPages;
                              const current = safeTableCurrentPage;
                              const add = (n: number) => {
                                if (!pages.includes(n) && n >= 1 && n <= total)
                                  pages.push(n);
                              };
                              add(1);
                              add(current - 1);
                              add(current);
                              add(current + 1);
                              add(total);
                              const uniqueSorted = [...new Set(pages)].sort(
                                (a, b) => a - b
                              );
                              const items: (number | string)[] = [];
                              uniqueSorted.forEach((n, i) => {
                                if (
                                  i > 0 &&
                                  n - (uniqueSorted[i - 1] as number) > 1
                                )
                                  items.push("...");
                                items.push(n);
                              });
                              return items.map((p, i) =>
                                typeof p === "number" ? (
                                  <PaginationItem key={`page-${p}-${i}`}>
                                    <PaginationLink
                                      href="#"
                                      isActive={p === current}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setTableCurrentPage(p);
                                      }}
                                    >
                                      {p}
                                    </PaginationLink>
                                  </PaginationItem>
                                ) : (
                                  <PaginationItem key={`gap-${i}`}>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )
                              );
                            })()}
                            <PaginationItem>
                              <PaginationNext
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setTableCurrentPage((p) =>
                                    Math.min(tableTotalPages, p + 1)
                                  );
                                }}
                                className={
                                  safeTableCurrentPage === tableTotalPages
                                    ? "pointer-events-none opacity-50"
                                    : ""
                                }
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Booking Details Modal */}
          <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
            <DialogContent className="sm:max-w-[720px] p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Booking Details</DialogTitle>
                <DialogDescription>
                  {selectedBooking?.booking_reference}
                </DialogDescription>
              </DialogHeader>
              <Separator />

              {selectedBooking && (
                <div className="flex flex-col h-[80vh]">
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {detailsLoading && (
                      <div className="text-sm text-gray-500">
                        Loading detailed summary…
                      </div>
                    )}
                    <Tabs value={detailsTab} onValueChange={setDetailsTab}>
                      <div className="flex items-center justify-between">
                        <TabsList>
                          <TabsTrigger value="summary">Summary</TabsTrigger>
                          <TabsTrigger value="client">Client</TabsTrigger>
                          <TabsTrigger value="event">Event</TabsTrigger>
                          <TabsTrigger value="booking">Booking</TabsTrigger>
                          <TabsTrigger value="package">
                            Package & Inclusions
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="summary">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white border rounded-lg p-4">
                            <div className="text-sm text-gray-500 mb-1">
                              Package Used
                            </div>
                            <div className="text-base font-medium text-gray-900">
                              {packageDetails?.package_title ||
                                selectedBooking?.package_name ||
                                "-"}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Price: ₱
                              {detailsSummary.packagePrice.toLocaleString(
                                "en-PH",
                                { minimumFractionDigits: 2 }
                              )}
                            </div>
                            {Array.isArray(packageDetails?.freebies) &&
                              packageDetails.freebies.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-sm text-gray-500 mb-1">
                                    Freebies
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {packageDetails.freebies
                                      .slice(0, 6)
                                      .map((f: any, i: number) => (
                                        <span
                                          key={`freebie-pill-${i}`}
                                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border"
                                        >
                                          {typeof f === "string"
                                            ? f
                                            : f.freebie_name}
                                        </span>
                                      ))}
                                    {packageDetails.freebies.length > 6 && (
                                      <span className="text-xs text-gray-500">
                                        +{packageDetails.freebies.length - 6}{" "}
                                        more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>

                          <div className="bg-white border rounded-lg p-4">
                            <div className="text-sm text-gray-500 mb-1">
                              Venue Chosen
                            </div>
                            <div className="text-base font-medium text-gray-900">
                              {selectedBooking?.venue_name || "-"}
                            </div>
                            {venuePricingInfo ? (
                              <div className="text-sm text-gray-600 mt-1 space-y-1">
                                <div>
                                  Base: ₱
                                  {detailsSummary.estimatedVenueBase.toLocaleString(
                                    "en-PH"
                                  )}
                                </div>
                                {detailsSummary.estimatedVenueExtras > 0 && (
                                  <div>
                                    Overflow: ₱
                                    {detailsSummary.estimatedVenueExtras.toLocaleString(
                                      "en-PH"
                                    )}
                                  </div>
                                )}
                                <div className="font-medium">
                                  Estimated Venue Total: ₱
                                  {detailsSummary.estimatedVenueTotal.toLocaleString(
                                    "en-PH",
                                    { minimumFractionDigits: 2 }
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 mt-1">
                                No venue pricing available
                              </div>
                            )}
                          </div>

                          <div className="bg-white border rounded-lg p-4">
                            <div className="text-sm text-gray-500 mb-2">
                              Inclusions Overview
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-gray-500">Included</div>
                                <div className="text-gray-900 font-semibold">
                                  {detailsSummary.includedNames.length}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Removed</div>
                                <div className="text-gray-900 font-semibold">
                                  {detailsSummary.removedNames.length}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">
                                  Custom Add-ons
                                </div>
                                <div className="text-gray-900 font-semibold">
                                  {detailsSummary.customAddOns.length}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">
                                  Supplier Services
                                </div>
                                <div className="text-gray-900 font-semibold">
                                  {detailsSummary.supplierServices.length}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white border rounded-lg p-4">
                            <div className="text-sm text-gray-500 mb-2">
                              Total Price
                            </div>
                            {detailsSummary.submittedTotal !== null ? (
                              <div className="text-gray-900 text-lg font-semibold">
                                Submitted Total: ₱
                                {Number(
                                  detailsSummary.submittedTotal
                                ).toLocaleString("en-PH", {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-700 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span>Package</span>
                                  <span>
                                    ₱
                                    {detailsSummary.packagePrice.toLocaleString(
                                      "en-PH",
                                      { minimumFractionDigits: 2 }
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Supplier Services</span>
                                  <span>
                                    ₱
                                    {detailsSummary.supplierServicesTotal.toLocaleString(
                                      "en-PH",
                                      { minimumFractionDigits: 2 }
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Custom Add-ons</span>
                                  <span>
                                    ₱
                                    {detailsSummary.customAddOnsTotal.toLocaleString(
                                      "en-PH",
                                      { minimumFractionDigits: 2 }
                                    )}
                                  </span>
                                </div>
                                {detailsSummary.estimatedVenueTotal > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span>Venue (est.)</span>
                                    <span>
                                      ₱
                                      {detailsSummary.estimatedVenueTotal.toLocaleString(
                                        "en-PH",
                                        { minimumFractionDigits: 2 }
                                      )}
                                    </span>
                                  </div>
                                )}
                                <Separator className="my-2" />
                                <div className="flex items-center justify-between text-base font-semibold">
                                  <span>Estimated Total</span>
                                  <span>
                                    ₱
                                    {detailsSummary.computedGrandTotal.toLocaleString(
                                      "en-PH",
                                      { minimumFractionDigits: 2 }
                                    )}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Note: Estimated based on available data.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="client">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <div>
                            <strong>Name:</strong> {selectedBooking.client_name}
                          </div>
                          <div>
                            <strong>Email:</strong>{" "}
                            {selectedBooking.client_email}
                          </div>
                          <div>
                            <strong>Phone:</strong>{" "}
                            {selectedBooking.client_phone}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="event">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <div>
                            <strong>Event Name:</strong>{" "}
                            {selectedBooking.event_name}
                          </div>
                          <div>
                            <strong>Event Type:</strong>{" "}
                            {selectedBooking.event_type_name}
                          </div>
                          <div>
                            <strong>Date:</strong>{" "}
                            {new Date(
                              selectedBooking.event_date
                            ).toLocaleDateString()}
                          </div>
                          <div>
                            <strong>Time:</strong> {selectedBooking.event_time}
                          </div>
                          <div>
                            <strong>Guest Count:</strong>{" "}
                            {selectedBooking.guest_count}
                          </div>
                          {selectedBooking.venue_name && (
                            <div>
                              <strong>Venue:</strong>{" "}
                              {selectedBooking.venue_name}
                            </div>
                          )}
                          {selectedBooking.package_name && (
                            <div>
                              <strong>Package:</strong>{" "}
                              {selectedBooking.package_name}
                            </div>
                          )}
                          {selectedBooking.notes && (
                            <div>
                              <strong>Notes:</strong> {selectedBooking.notes}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="booking">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <div>
                            <strong>Reference:</strong>{" "}
                            {selectedBooking.booking_reference}
                          </div>
                          <div>
                            <strong>Created:</strong>{" "}
                            {new Date(
                              selectedBooking.created_at
                            ).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <strong>Status:</strong>
                            <Badge
                              className={`${getStatusColor(selectedBooking.booking_status)} flex items-center gap-1`}
                            >
                              {getStatusIcon(selectedBooking.booking_status)}
                              {selectedBooking.booking_status}
                            </Badge>
                          </div>
                          {selectedBooking.converted_event_id && (
                            <div>
                              <strong>Event ID:</strong>{" "}
                              {selectedBooking.converted_event_id}
                            </div>
                          )}
                          {bookingDetails?.total_price ? (
                            <div>
                              <strong>Total Price (submitted):</strong> ₱
                              {Number(
                                bookingDetails.total_price
                              ).toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                          ) : venuePricingInfo ? (
                            <div>
                              <strong>Estimated Venue Total:</strong> ₱
                              {venuePricingInfo.estimatedTotal.toLocaleString(
                                "en-PH",
                                { minimumFractionDigits: 2 }
                              )}
                            </div>
                          ) : null}
                        </div>
                      </TabsContent>

                      <TabsContent value="package">
                        {packageDetails || bookingDetails ? (
                          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                            {packageDetails && (
                              <div className="text-sm">
                                <div>
                                  <strong>Package:</strong>{" "}
                                  {packageDetails.package_title} (₱
                                  {Number(
                                    packageDetails.package_price
                                  ).toLocaleString("en-PH", {
                                    minimumFractionDigits: 2,
                                  })}
                                  )
                                </div>
                                {selectedBooking.venue_name && (
                                  <div className="mt-1">
                                    <strong>Venue:</strong>{" "}
                                    {selectedBooking.venue_name}
                                    {venuePricingInfo && (
                                      <span className="text-gray-600">
                                        {" "}
                                        — Base ₱
                                        {venuePricingInfo.basePrice.toLocaleString()}{" "}
                                        {venuePricingInfo.extraPaxRate > 0 &&
                                        selectedBooking.guest_count > 100
                                          ? `+ Overflow ₱${venuePricingInfo.overflowCharge.toLocaleString()}`
                                          : ""}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {Array.isArray(packageDetails.freebies) &&
                                  packageDetails.freebies.length > 0 && (
                                    <div className="mt-3">
                                      <strong>Freebies:</strong>
                                      <div className="mt-1 flex flex-wrap gap-2">
                                        {packageDetails.freebies.map(
                                          (f: any, i: number) => (
                                            <span
                                              key={`freebie-chip-${i}`}
                                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border"
                                            >
                                              {typeof f === "string"
                                                ? f
                                                : f.freebie_name}
                                            </span>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="font-medium mb-1">Included</div>
                                <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-white p-3 rounded border">
                                  {detailsSummary.includedNames
                                    .slice(0, 100)
                                    .map((n, i) => (
                                      <li key={`inc-${i}`}>{n}</li>
                                    ))}
                                  {detailsSummary.includedNames.length ===
                                    0 && (
                                    <li className="text-gray-500">No data</li>
                                  )}
                                </ul>
                              </div>
                              <div>
                                <div className="font-medium mb-1">
                                  Removed / Unchecked
                                </div>
                                <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-white p-3 rounded border">
                                  {detailsSummary.removedNames
                                    .slice(0, 100)
                                    .map((n, i) => (
                                      <li key={`rem-${i}`}>{n}</li>
                                    ))}
                                  {detailsSummary.removedNames.length === 0 && (
                                    <li className="text-gray-500">
                                      None indicated
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>

                            {(detailsSummary.supplierServices.length > 0 ||
                              detailsSummary.customAddOns.length > 0) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {detailsSummary.supplierServices.length > 0 && (
                                  <div>
                                    <div className="font-medium mb-1">
                                      Supplier Services
                                    </div>
                                    <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-white p-3 rounded border">
                                      {detailsSummary.supplierServices.map(
                                        (c: any, i: number) => (
                                          <li key={`supp-${i}`}>
                                            {(c.supplier_name
                                              ? `${c.supplier_name} — `
                                              : "") +
                                              (c.name ||
                                                c.component_name ||
                                                c.inclusion_name ||
                                                "Service")}{" "}
                                            — ₱
                                            {Number(
                                              c.price ||
                                                c.component_price ||
                                                c.inclusion_price ||
                                                0
                                            ).toLocaleString()}
                                          </li>
                                        )
                                      )}
                                    </ul>
                                    <div className="text-sm text-gray-700 mt-1">
                                      <strong>Total:</strong> ₱
                                      {detailsSummary.supplierServicesTotal.toLocaleString(
                                        "en-PH",
                                        { minimumFractionDigits: 2 }
                                      )}
                                    </div>
                                  </div>
                                )}
                                {detailsSummary.customAddOns.length > 0 && (
                                  <div>
                                    <div className="font-medium mb-1">
                                      Custom Add-ons
                                    </div>
                                    <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-white p-3 rounded border">
                                      {detailsSummary.customAddOns.map(
                                        (c: any, i: number) => (
                                          <li key={`cust-${i}`}>
                                            {c.name ||
                                              c.component_name ||
                                              c.inclusion_name ||
                                              "Item"}{" "}
                                            — ₱
                                            {Number(
                                              c.price ||
                                                c.component_price ||
                                                c.inclusion_price ||
                                                0
                                            ).toLocaleString()}
                                          </li>
                                        )
                                      )}
                                    </ul>
                                    <div className="text-sm text-gray-700 mt-1">
                                      <strong>Total:</strong> ₱
                                      {detailsSummary.customAddOnsTotal.toLocaleString(
                                        "en-PH",
                                        { minimumFractionDigits: 2 }
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            No package data.
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>

                  <DialogFooter className="sticky bottom-0 border-t bg-background px-6 py-4">
                    <div className="w-full flex items-center justify-between gap-4">
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
                        {selectedBooking.booking_status === "confirmed" && (
                          <Button
                            key="modal-create-event-btn"
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() =>
                              handleConvertToEvent(selectedBooking)
                            }
                          >
                            Create an Event
                          </Button>
                        )}
                        {selectedBooking.booking_status === "converted" && (
                          <Button
                            key="modal-view-event-btn"
                            size="sm"
                            variant="outline"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              router.push(
                                `/admin/events?booking_ref=${selectedBooking.booking_reference}`
                              );
                            }}
                          >
                            View Event
                          </Button>
                        )}
                      </div>
                    </div>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
