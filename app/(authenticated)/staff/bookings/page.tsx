"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import { endpoints } from "@/app/config/api";
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
  Wallet,
  DollarSign,
  Percent,
  CreditCard,
  Banknote,
  Building,
  Phone,
  MoreVertical,
} from "lucide-react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Booking {
  booking_id: number;
  booking_reference: string;
  user_id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_profile_picture?: string | null;
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
    | "reserved"
    | "converted"
    | "cancelled"
    | "completed";
  created_at: string;
  converted_event_id?: number | null;
  total_price?: number;
  payments?: PaymentHistoryItem[];
}

interface PaymentHistoryItem {
  payment_id: number;
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  payment_status: string;
  payment_reference?: string;
  description?: string;
  from_booking?: boolean;
}

// Payment History Component for Booking Modal
function PaymentHistoryTab({
  booking,
  bookingDetails,
  packageDetails,
  venuePricingInfo,
}: {
  booking: Booking | null;
  bookingDetails: any | null;
  packageDetails: any | null;
  venuePricingInfo: any | null;
}) {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Recalculate total price based on current booking data
  const recalculateTotalPrice = (booking: Booking | null): number => {
    if (!booking || !bookingDetails || !packageDetails) {
      return bookingDetails?.total_price || booking?.total_price || 0;
    }

    try {
      // Get base package price
      const basePackagePrice = packageDetails.package_price || 0;

      // Calculate venue excess if applicable
      let venueExcess = 0;
      if (booking.venue_id && venuePricingInfo) {
        const { basePrice, extraPaxRate, overflowCharge } = venuePricingInfo;
        const guestCount = booking.guest_count || 0;

        // Calculate venue cost based on guest count
        if (guestCount > 100) {
          const extraGuests = guestCount - 100;
          venueExcess = extraGuests * extraPaxRate;
        }
      }

      // Add any custom inclusions or modifications from bookingDetails
      let customTotal = 0;
      if (bookingDetails.custom_inclusions) {
        const customInclusions = Array.isArray(bookingDetails.custom_inclusions)
          ? bookingDetails.custom_inclusions
          : JSON.parse(bookingDetails.custom_inclusions || "[]");
        customTotal = customInclusions.reduce(
          (sum: number, item: any) => sum + (Number(item.price) || 0),
          0
        );
      }

      const recalculatedTotal = basePackagePrice + venueExcess + customTotal;

      console.log("🔄 Recalculated Total Price:", {
        basePackagePrice,
        venueExcess,
        customTotal,
        recalculatedTotal,
        originalTotal: bookingDetails?.total_price || booking.total_price,
      });

      return recalculatedTotal;
    } catch (error) {
      console.error("Error recalculating total price:", error);
      return bookingDetails?.total_price || booking.total_price || 0;
    }
  };

  const calculatePaidAmountLocal = (): number => {
    if (!paymentHistory || paymentHistory.length === 0) return 0;

    return paymentHistory
      .filter(
        (payment) =>
          payment.payment_status === "completed" ||
          payment.payment_status === "paid"
      )
      .reduce(
        (total, payment) => total + (Number(payment.payment_amount) || 0),
        0
      );
  };

  const getRemainingBalanceLocal = (): number => {
    const totalPrice = booking?.converted_event_id
      ? (booking as any).event_total_budget ||
        (booking ? recalculateTotalPrice(booking) : 0) ||
        0
      : (booking ? recalculateTotalPrice(booking) : 0) || 0;
    const paidAmount = calculatePaidAmountLocal();
    return Math.max(0, totalPrice - paidAmount);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (booking && isMounted) {
      fetchPaymentHistory();
    }
  }, [booking, isMounted]);

  const fetchPaymentHistory = async () => {
    if (!booking) return;

    try {
      setIsLoading(true);
      console.log("Fetching payment history for booking:", booking.booking_id);

      // Use the existing booking data that already includes payments
      if (booking.payments && Array.isArray(booking.payments)) {
        console.log(
          "Using existing payment data from booking:",
          booking.payments
        );
        setPaymentHistory(booking.payments);
      } else {
        // Fallback: try to fetch detailed booking data
        const response = await axios.get("/staff.php", {
          params: {
            operation: "getBookingById",
            booking_id: booking.booking_id,
          },
        });

        console.log("Payment history API response:", response.data);

        if (response.data.status === "success") {
          const payments = response.data.booking?.payments || [];
          console.log(
            "Setting payment history with",
            payments.length,
            "payments"
          );
          setPaymentHistory(payments);
        } else {
          console.error("API returned error:", response.data.message);
          setPaymentHistory([]);
        }
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      setPaymentHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculatePaidAmount = (): number => {
    if (paymentHistory && paymentHistory.length > 0) {
      return paymentHistory.reduce((sum, p) => {
        const isPaid =
          p.payment_status === "completed" ||
          p.payment_status === "paid" ||
          p.payment_status === "confirmed" ||
          p.payment_status === "processed" ||
          p.payment_status === "successful";
        return isPaid ? sum + p.payment_amount : sum;
      }, 0);
    }
    return 0;
  };

  const getRemainingBalance = (): number => {
    const totalPrice = booking?.total_price || 0;
    const paidAmount = calculatePaidAmount();
    return Math.max(0, totalPrice - paidAmount);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "paid":
      case "confirmed":
      case "processed":
      case "successful":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading payment history...</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading payment history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payment Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payment Summary
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-blue-700 font-medium mb-1">Total Price</div>
            <div className="font-bold text-lg text-blue-900">
              {formatCurrency(
                booking?.converted_event_id
                  ? (booking as any).event_total_budget ||
                      (booking ? recalculateTotalPrice(booking) : 0) ||
                      0
                  : (booking ? recalculateTotalPrice(booking) : 0) || 0
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-green-700 font-medium mb-1">Amount Paid</div>
            <div className="font-bold text-lg text-green-600">
              {formatCurrency(calculatePaidAmountLocal())}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-orange-700 font-medium mb-1">Balance Due</div>
            <div className="font-bold text-lg text-orange-600">
              {formatCurrency(getRemainingBalanceLocal())}
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {paymentHistory && paymentHistory.length > 0 ? (
        <div className="space-y-4">
          <h5 className="font-semibold text-gray-900 mb-3">Payment History</h5>
          {paymentHistory.map((payment: any, index: number) => (
            <div
              key={
                payment?.payment_id && payment.payment_id !== 0
                  ? `payment-${payment.payment_id}`
                  : `temp-${index}-${payment?.payment_reference || payment?.payment_date || "placeholder"}`
              }
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all duration-200 hover:border-blue-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                    {payment.payment_method === "cash" ? (
                      <Banknote className="h-6 w-6 text-blue-600" />
                    ) : payment.payment_method === "gcash" ? (
                      <CreditCard className="h-6 w-6 text-green-600" />
                    ) : (
                      <Building className="h-6 w-6 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-lg text-gray-900">
                      {formatCurrency(Number(payment.payment_amount || 0))}
                    </h5>
                    <p className="text-sm text-gray-600 capitalize font-medium flex items-center gap-1">
                      {payment.payment_method === "cash" ? (
                        <>
                          <Banknote className="h-4 w-4" />
                          Cash
                        </>
                      ) : payment.payment_method === "gcash" ? (
                        <>
                          <CreditCard className="h-4 w-4" />
                          GCash
                        </>
                      ) : payment.payment_method === "bank-transfer" ? (
                        <>
                          <Building className="h-4 w-4" />
                          Bank Transfer
                        </>
                      ) : (
                        payment.payment_method || "N/A"
                      )}
                      {payment.from_booking && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          From Booking
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isMounted
                        ? new Date(payment.payment_date).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : payment.payment_date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getPaymentStatusColor(payment.payment_status)}`}
                  >
                    {payment.payment_status === "completed" ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </>
                    ) : payment.payment_status === "pending" ? (
                      <>
                        <Clock className="h-3 w-3" />
                        Pending
                      </>
                    ) : payment.payment_status === "paid" ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Paid
                      </>
                    ) : (
                      payment.payment_status
                    )}
                  </span>
                </div>
              </div>

              {payment.payment_reference && (
                <div className="bg-gray-50 rounded-lg px-4 py-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Reference Number:
                    </span>
                    <span className="text-sm font-mono bg-white px-2 py-1 rounded border text-gray-800">
                      {payment.payment_reference}
                    </span>
                  </div>
                </div>
              )}

              {payment.payment_notes && (
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Notes:</span>{" "}
                    {payment.payment_notes}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="text-4xl mb-4">💳</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Payment History
          </h3>
          <p className="text-gray-500">
            No payments have been recorded for this booking yet.
          </p>
        </div>
      )}
    </div>
  );
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

  // Card view pagination
  const [cardsPerPage, setCardsPerPage] = useState<number>(6);
  const [showAllCards, setShowAllCards] = useState<boolean>(false);
  const [clientStats, setClientStats] = useState<{
    totalRevenue: number;
    totalEvents: number;
    clientProfile: any;
  } | null>(null);
  const [clientEventHistory, setClientEventHistory] = useState<any[]>([]);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    payment_type: "custom" as "custom" | "percentage" | "full",
    percentage: 0 as number,
    payment_amount: 0,
    payment_method: "cash" as "gcash" | "bank-transfer" | "cash",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_status: "completed" as "completed" | "pending",
    payment_reference: "",
    payment_notes: "",
  });
  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState("");

  useEffect(() => {
    try {
      protectRoute();
      const userData = secureStorage.getItem("user");
      if (!userData || userData.user_role.toLowerCase() !== "staff") {
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

  const fetchClientProfilePictures = async (bookings: Booking[]) => {
    try {
      const uniqueUserIds = [...new Set(bookings.map((b) => b.user_id))];
      const profilePicturePromises = uniqueUserIds.map(async (userId) => {
        try {
          const response = await axios.get("/staff.php", {
            params: {
              operation: "getUserProfilePicture",
              user_id: userId,
            },
          });
          return {
            userId,
            profilePicture: response.data.profile_picture || null,
          };
        } catch (error) {
          console.error(
            `Error fetching profile picture for user ${userId}:`,
            error
          );
          return { userId, profilePicture: null };
        }
      });

      const profilePictures = await Promise.all(profilePicturePromises);
      const profilePictureMap = profilePictures.reduce(
        (acc, curr) => {
          acc[curr.userId] = curr.profilePicture;
          return acc;
        },
        {} as Record<number, string | null>
      );

      // Update bookings with profile pictures
      const updatedBookings = bookings.map((booking) => ({
        ...booking,
        client_profile_picture: profilePictureMap[booking.user_id] || null,
      }));

      setBookings(updatedBookings);
    } catch (error) {
      console.error("Error fetching client profile pictures:", error);
      // Continue with bookings without profile pictures
    }
  };

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Fetching bookings from API...");

      const response = await axios.post("/staff.php", {
        operation: "getAllBookings",
      });

      console.log("📡 API Response:", response.data);

      if (response.data.status === "success") {
        console.log("✅ Success! Fetched bookings:", response.data.bookings);
        console.log(
          "📊 Total bookings count:",
          response.data.count || response.data.bookings?.length || 0
        );

        const bookings = response.data.bookings || [];
        setBookings(bookings);

        // Fetch client profile pictures
        if (bookings.length > 0) {
          await fetchClientProfilePictures(bookings);
        }

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

  const fetchClientStats = async (userId: number) => {
    try {
      const response = await axios.get("/staff.php", {
        params: {
          operation: "getClientStats",
          user_id: userId,
        },
      });

      if (response.data.status === "success") {
        setClientStats({
          totalRevenue: response.data.total_revenue || 0,
          totalEvents: response.data.total_events || 0,
          clientProfile: response.data.client_profile || null,
        });
      }
    } catch (error) {
      console.error("Error fetching client stats:", error);
    }
  };

  const fetchClientEventHistory = async (userId: number) => {
    try {
      const response = await axios.get("/staff.php", {
        params: {
          operation: "getClientEventHistory",
          user_id: userId,
        },
      });

      if (response.data.status === "success") {
        setClientEventHistory(response.data.events || []);
      }
    } catch (error) {
      console.error("Error fetching client event history:", error);
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
      setClientStats(null);
      setClientEventHistory([]);
      try {
        const ref = selectedBooking.booking_reference;
        const pkgId = selectedBooking.package_id;
        const venueId = selectedBooking.venue_id;
        const guestCount = selectedBooking.guest_count;

        const requests: Promise<any>[] = [];
        // Detailed booking (includes b.* like total_price, component_changes)
        requests.push(
          axios.get("/staff.php", {
            params: { operation: "getBookingByReference", reference: ref },
          })
        );
        if (pkgId) {
          // Package details (inclusions list)
          requests.push(
            axios.get("/staff.php", {
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
              axios.get("/client.php", {
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

        // Fetch client stats and event history
        const clientStatsPromise = fetchClientStats(selectedBooking.user_id);
        const clientEventHistoryPromise = fetchClientEventHistory(
          selectedBooking.user_id
        );
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
      const userData = secureStorage.getItem("user");
      const response = await axios.post(`${endpoints.staff}`, {
        operation: "acceptBooking",
        booking_id: booking.booking_id,
        user_id: userData?.user_id,
        user_role: "staff",
      });

      if (response.data.status === "success") {
        toast({
          title: "Booking Accepted",
          description: `Booking ${booking.booking_reference} has been accepted successfully`,
        });
        fetchBookings(); // Refresh the list
      } else {
        throw new Error(response.data.message || "Failed to accept booking");
      }
    } catch (error: any) {
      console.error("Error accepting booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept booking",
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
      const response = await axios.post("/staff.php", {
        operation: "updateBookingStatus",
        booking_id: booking.booking_id,
        status: "cancelled",
      });

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
      const response = await axios.post("/staff.php", {
        operation: "updateBookingStatus",
        booking_id: bookingId,
        status: newStatus,
      });

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

  // Payment handling functions
  const handlePaymentAmountChange = (value: string) => {
    const cleanValue = value.replace(/,/g, "");

    if (cleanValue === "" || cleanValue === "0") {
      setNewPayment((p) => ({ ...p, payment_amount: 0 }));
      setPaymentAmountDisplay("");
      return;
    }

    if (
      cleanValue === "." ||
      cleanValue.endsWith(".") ||
      /^\d+\.$/.test(cleanValue) ||
      /^\d+\.\d*$/.test(cleanValue)
    ) {
      setPaymentAmountDisplay(value);
      const numericPart = cleanValue.replace(/\.$/, "");
      const numericValue = parseFloat(numericPart);
      if (!isNaN(numericValue) && numericValue >= 0) {
        setNewPayment((p) => ({ ...p, payment_amount: numericValue }));
      }
      return;
    }

    const numericValue = parseFloat(cleanValue);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setNewPayment((p) => ({ ...p, payment_amount: numericValue }));
      setPaymentAmountDisplay(formatNumberWithCommas(numericValue));
    }
  };

  const handlePaymentAmountBlur = () => {
    if (newPayment.payment_amount > 0) {
      setPaymentAmountDisplay(
        formatNumberWithCommas(newPayment.payment_amount)
      );
    } else {
      setPaymentAmountDisplay("");
    }
  };

  const handleCreatePayment = async () => {
    if (!selectedBooking) return;

    try {
      setIsCreatingPayment(true);

      const paymentAmount = Number(newPayment.payment_amount) || 0;

      if (paymentAmount <= 0) {
        toast({
          title: "Payment Validation Error",
          description: "Payment amount must be greater than zero",
          variant: "destructive",
        });
        return;
      }

      const remainingBalance = getRemainingBalance(selectedBooking);
      if (paymentAmount > remainingBalance) {
        toast({
          title: "Payment Validation Error",
          description: `Payment amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`,
          variant: "destructive",
        });
        return;
      }

      const paymentData = {
        operation: "createReservationPayment",
        booking_id: selectedBooking.booking_id,
        payment_method: newPayment.payment_method,
        payment_amount: paymentAmount,
        payment_notes: newPayment.payment_notes || "",
        payment_status: newPayment.payment_status,
        payment_date: newPayment.payment_date,
        payment_reference: newPayment.payment_reference || "",
      };

      const response = await axios.post(endpoints.staff, paymentData);

      if (response.data.status !== "success") {
        toast({
          title: "Error",
          description: response.data.message || "Failed to create payment",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      // Reset form & close modal
      setNewPayment({
        payment_type: "custom",
        percentage: 0,
        payment_amount: 0,
        payment_method: "cash",
        payment_date: new Date().toISOString().slice(0, 10),
        payment_status: "completed",
        payment_reference: "",
        payment_notes: "",
      });
      setPaymentAmountDisplay("");
      setIsPaymentModalOpen(false);

      // Refresh bookings
      await fetchBookings();
    } catch (error) {
      console.error("Error creating payment:", error);
      toast({
        title: "Error",
        description: "Failed to create payment",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPayment(false);
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

  // Payment utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumberWithCommas = (value: string | number): string => {
    if (!value || value === 0) return "";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "";
    return numValue.toLocaleString("en-US", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 20,
    });
  };

  const parseFormattedNumber = (formattedValue: string): number => {
    if (!formattedValue) return 0;
    const cleanValue = formattedValue.replace(/,/g, "");
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculatePaidAmount = (booking: Booking): number => {
    if (booking.payments && booking.payments.length > 0) {
      return booking.payments.reduce((sum, p) => {
        const isPaid =
          p.payment_status === "completed" || p.payment_status === "paid";
        return isPaid ? sum + p.payment_amount : sum;
      }, 0);
    }
    return 0;
  };

  const getRemainingBalance = (booking: Booking): number => {
    const totalPrice = bookingDetails?.total_price || booking.total_price || 0;
    const paidAmount = calculatePaidAmount(booking);
    return Math.max(0, totalPrice - paidAmount);
  };

  const isBookingFullyPaid = (booking: Booking): boolean => {
    return getRemainingBalance(booking) <= 0;
  };

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const isPending = booking.booking_status === "pending";
    const isConfirmed = booking.booking_status === "confirmed";
    const isConverted = booking.booking_status === "converted";
    const isCancelled = booking.booking_status === "cancelled";
    const canConvert = booking.booking_status === "confirmed"; // Only confirmed bookings can be converted
    const hasReservationFee = calculatePaidAmount(booking) > 0;

    return (
      <div
        className={`bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow ${
          isConfirmed ? "border-[#BFE8E0] bg-[#F0FBF9]" : ""
        } ${isConverted ? "border-blue-200 bg-blue-50" : ""}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            {/* Client Profile Picture */}
            <div className="flex-shrink-0">
              {booking.client_profile_picture ? (
                <img
                  src={`${endpoints.serveImage}?path=${booking.client_profile_picture}`}
                  alt={booking.client_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  onError={(e) => {
                    // Fallback to default avatar if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={`w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300 ${booking.client_profile_picture ? "hidden" : "flex"}`}
              >
                <Users className="h-6 w-6 text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {booking.booking_reference}
              </h3>
              <p className="text-sm text-gray-600">{booking.event_name}</p>
              <p className="text-sm text-gray-500 font-medium">
                {booking.client_name}
              </p>
              {hasReservationFee &&
                (isPending || booking.booking_status === "reserved") && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-green-700">
                    <Wallet className="h-3 w-3" />
                    <span className="font-medium">
                      Reservation Fee:{" "}
                      {formatCurrency(calculatePaidAmount(booking))}
                    </span>
                  </div>
                )}
            </div>
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
            key={`${booking.booking_id}-date`}
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            <Calendar className="h-4 w-4" />
            <span>{new Date(booking.event_date).toLocaleDateString()}</span>
          </div>
          <div
            key={`${booking.booking_id}-contact`}
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            <Phone className="h-4 w-4" />
            <span>{booking.client_phone}</span>
          </div>
          <div
            key={`${booking.booking_id}-guests`}
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            <Users className="h-4 w-4" />
            <span>{booking.guest_count} guests</span>
          </div>
          {booking.venue_name && (
            <div
              key={`${booking.booking_id}-venue`}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <MapPin className="h-4 w-4" />
              <span>{booking.venue_name}</span>
            </div>
          )}
          {booking.package_name && (
            <div
              key={`${booking.booking_id}-package`}
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
              key={`${booking.booking_id}-view-button`}
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

            {/* Show Accept/Reject buttons for pending and reserved bookings */}
            {(isPending || booking.booking_status === "reserved") && (
              <>
                <Button
                  key={`${booking.booking_id}-accept-button`}
                  size="sm"
                  onClick={() => handleAcceptBooking(booking)}
                  className="bg-[#028A75] hover:bg-[#027563]"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  key={`${booking.booking_id}-reject-button`}
                  variant="outline"
                  size="sm"
                  onClick={() => handleRejectBooking(booking)}
                  disabled={booking.booking_status === "reserved"}
                  className={`border-red-200 text-red-700 hover:bg-red-50 ${
                    booking.booking_status === "reserved"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {/* Show Convert to Event button for confirmed bookings */}
            {isConfirmed && (
              <Button
                key={`${booking.booking_id}-create-event-button`}
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
                key={`${booking.booking_id}-view-event-button`}
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
                      <BookingCard key={booking.booking_id} booking={booking} />
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
                                    key={`table-${booking.booking_id}-view`}
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
                                        key={`table-${booking.booking_id}-accept`}
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
                                        key={`table-${booking.booking_id}-reject`}
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
                                      key={`table-${booking.booking_id}-convert`}
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
                                      key={`table-${booking.booking_id}-view-event`}
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
                                  <PaginationItem
                                    key={`pagination-page-${p}-${i}`}
                                  >
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
                                  <PaginationItem key={`pagination-gap-${i}`}>
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
            <DialogContent className="sm:max-w-[750px] w-[750px] h-[650px] flex flex-col gap-0 p-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 shrink-0 border-b bg-white">
                <DialogTitle>Booking Details</DialogTitle>
                <DialogDescription>
                  {selectedBooking?.booking_reference}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 bg-gray-50 text-sm">
                {selectedBooking && (
                  <>
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
                          <TabsTrigger value="payments">
                            Payment History
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="summary" className="min-h-[400px]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white border rounded-lg p-4">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                              Package Used
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {packageDetails?.package_title ||
                                selectedBooking?.package_name ||
                                "-"}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              ₱
                              {detailsSummary.packagePrice.toLocaleString(
                                "en-PH",
                                { minimumFractionDigits: 2 }
                              )}
                            </div>
                            {Array.isArray(packageDetails?.freebies) &&
                              packageDetails.freebies.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-xs font-medium text-gray-500 mb-2">
                                    Freebies
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {packageDetails.freebies
                                      .slice(0, 6)
                                      .map((f: any, i: number) => (
                                        <span
                                          key={`summary-freebie-pill-${i}`}
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
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                              Venue Chosen
                            </div>
                            <div className="text-sm font-medium text-gray-900">
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
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                              Inclusions Overview
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">
                                  Included
                                </div>
                                <div className="text-sm text-gray-900 font-semibold">
                                  {detailsSummary.includedNames.length}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">
                                  Removed
                                </div>
                                <div className="text-sm text-gray-900 font-semibold">
                                  {detailsSummary.removedNames.length}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">
                                  Custom Add-ons
                                </div>
                                <div className="text-sm text-gray-900 font-semibold">
                                  {detailsSummary.customAddOns.length}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">
                                  Supplier Services
                                </div>
                                <div className="text-sm text-gray-900 font-semibold">
                                  {detailsSummary.supplierServices.length}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white border rounded-lg p-4">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                              Total Price
                            </div>
                            {detailsSummary.submittedTotal !== null ? (
                              <div className="text-gray-900 text-base font-semibold">
                                ₱
                                {Number(
                                  detailsSummary.submittedTotal
                                ).toLocaleString("en-PH", {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-900 space-y-1">
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

                      <TabsContent value="client" className="min-h-[400px]">
                        <div className="bg-white border rounded-lg p-4 space-y-3">
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                              Name
                            </div>
                            <div className="text-sm text-gray-900">
                              {selectedBooking.client_name}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                              Email
                            </div>
                            <div className="text-sm text-gray-900">
                              {selectedBooking.client_email}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                              Phone
                            </div>
                            <div className="text-sm text-gray-900">
                              {selectedBooking.client_phone}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="event" className="min-h-[400px]">
                        <div className="bg-white border rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Event Name
                              </div>
                              <div className="text-sm text-gray-900">
                                {selectedBooking.event_name}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Event Type
                              </div>
                              <div className="text-sm text-gray-900">
                                {selectedBooking.event_type_name}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Date
                              </div>
                              <div className="text-sm text-gray-900">
                                {new Date(
                                  selectedBooking.event_date
                                ).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Time
                              </div>
                              <div className="text-sm text-gray-900">
                                {selectedBooking.event_time}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Guest Count
                              </div>
                              <div className="text-sm text-gray-900">
                                {selectedBooking.guest_count}
                              </div>
                            </div>
                            {selectedBooking.venue_name && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                  Venue
                                </div>
                                <div className="text-sm text-gray-900">
                                  {selectedBooking.venue_name}
                                </div>
                              </div>
                            )}
                            {selectedBooking.package_name && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                  Package
                                </div>
                                <div className="text-sm text-gray-900">
                                  {selectedBooking.package_name}
                                </div>
                              </div>
                            )}
                          </div>
                          {selectedBooking.notes && (
                            <div className="col-span-2">
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Notes
                              </div>
                              <div className="text-sm text-gray-900">
                                {selectedBooking.notes}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="booking" className="min-h-[400px]">
                        <div className="bg-white border rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Reference
                              </div>
                              <div className="text-sm text-gray-900">
                                {selectedBooking.booking_reference}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Created
                              </div>
                              <div className="text-sm text-gray-900">
                                {new Date(
                                  selectedBooking.created_at
                                ).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Status
                              </div>
                              <Badge
                                className={`${getStatusColor(selectedBooking.booking_status)} flex items-center gap-1 w-fit`}
                              >
                                {getStatusIcon(selectedBooking.booking_status)}
                                {selectedBooking.booking_status}
                              </Badge>
                            </div>
                            {selectedBooking.converted_event_id && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                  Event ID
                                </div>
                                <div className="text-sm text-gray-900">
                                  {selectedBooking.converted_event_id}
                                </div>
                              </div>
                            )}
                            {bookingDetails?.total_price ? (
                              <div className="col-span-2">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                  Total Price (submitted)
                                </div>
                                <div className="text-sm text-gray-900 font-semibold">
                                  ₱
                                  {Number(
                                    bookingDetails.total_price
                                  ).toLocaleString("en-PH", {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                              </div>
                            ) : venuePricingInfo ? (
                              <div className="col-span-2">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                  Estimated Venue Total
                                </div>
                                <div className="text-sm text-gray-900 font-semibold">
                                  ₱
                                  {venuePricingInfo.estimatedTotal.toLocaleString(
                                    "en-PH",
                                    { minimumFractionDigits: 2 }
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="package" className="min-h-[400px]">
                        {packageDetails || bookingDetails ? (
                          <div className="space-y-4">
                            {packageDetails && (
                              <div className="bg-white border rounded-lg p-4 space-y-3">
                                <div>
                                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                    Package
                                  </div>
                                  <div className="text-sm text-gray-900 font-medium">
                                    {packageDetails.package_title}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    ₱
                                    {Number(
                                      packageDetails.package_price
                                    ).toLocaleString("en-PH", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                                {selectedBooking.venue_name && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                      Venue
                                    </div>
                                    <div className="text-sm text-gray-900">
                                      {selectedBooking.venue_name}
                                    </div>
                                    {venuePricingInfo && (
                                      <div className="text-sm text-gray-600 mt-1">
                                        Base: ₱
                                        {venuePricingInfo.basePrice.toLocaleString()}{" "}
                                        {venuePricingInfo.extraPaxRate > 0 &&
                                        selectedBooking.guest_count > 100
                                          ? `+ Overflow: ₱${venuePricingInfo.overflowCharge.toLocaleString()}`
                                          : ""}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {Array.isArray(packageDetails.freebies) &&
                                  packageDetails.freebies.length > 0 && (
                                    <div>
                                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                        Freebies
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {packageDetails.freebies.map(
                                          (f: any, i: number) => (
                                            <span
                                              key={`package-freebie-chip-${i}`}
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
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                  Included
                                </div>
                                <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-white p-3 rounded border">
                                  {detailsSummary.includedNames
                                    .slice(0, 100)
                                    .map((n, i) => (
                                      <li
                                        key={`inc-${i}`}
                                        className="text-gray-900"
                                      >
                                        {n}
                                      </li>
                                    ))}
                                  {detailsSummary.includedNames.length ===
                                    0 && (
                                    <li className="text-gray-500">No data</li>
                                  )}
                                </ul>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                  Removed / Unchecked
                                </div>
                                <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-white p-3 rounded border">
                                  {detailsSummary.removedNames
                                    .slice(0, 100)
                                    .map((n, i) => (
                                      <li
                                        key={`rem-${i}`}
                                        className="text-gray-900"
                                      >
                                        {n}
                                      </li>
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
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                      Supplier Services
                                    </div>
                                    <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-white p-3 rounded border">
                                      {detailsSummary.supplierServices.map(
                                        (c: any, i: number) => (
                                          <li
                                            key={`supp-${i}`}
                                            className="text-gray-900"
                                          >
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
                                    <div className="text-sm text-gray-900 mt-2 font-medium">
                                      Total: ₱
                                      {detailsSummary.supplierServicesTotal.toLocaleString(
                                        "en-PH",
                                        { minimumFractionDigits: 2 }
                                      )}
                                    </div>
                                  </div>
                                )}
                                {detailsSummary.customAddOns.length > 0 && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                      Custom Add-ons
                                    </div>
                                    <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-white p-3 rounded border">
                                      {detailsSummary.customAddOns.map(
                                        (c: any, i: number) => (
                                          <li
                                            key={`cust-${i}`}
                                            className="text-gray-900"
                                          >
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
                                    <div className="text-sm text-gray-900 mt-2 font-medium">
                                      Total: ₱
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

                      <TabsContent value="payments" className="min-h-[400px]">
                        <PaymentHistoryTab
                          booking={selectedBooking}
                          bookingDetails={bookingDetails}
                          packageDetails={packageDetails}
                          venuePricingInfo={venuePricingInfo}
                        />
                      </TabsContent>
                    </Tabs>
                  </>
                )}
              </div>

              <DialogFooter className="px-6 py-4 border-t bg-white shrink-0 mt-0">
                <div className="w-full flex flex-row items-center justify-between gap-4">
                  <Badge
                    className={`${getStatusColor(selectedBooking?.booking_status || "pending")} flex items-center gap-1`}
                  >
                    {getStatusIcon(
                      selectedBooking?.booking_status || "pending"
                    )}
                    {selectedBooking?.booking_status || "pending"}
                  </Badge>
                  <div className="flex gap-2">
                    {/* Make Payment Button - Show for pending and reserved bookings */}
                    {(selectedBooking?.booking_status === "pending" ||
                      selectedBooking?.booking_status === "reserved") && (
                      <Button
                        key={`modal-${selectedBooking?.booking_id}-make-payment-btn`}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setIsPaymentModalOpen(true)}
                      >
                        <Wallet className="h-4 w-4 mr-1" />
                        Make Payment
                      </Button>
                    )}

                    {selectedBooking?.booking_status === "pending" && (
                      <>
                        <Button
                          key={`modal-${selectedBooking?.booking_id}-confirm-btn`}
                          size="sm"
                          onClick={() =>
                            handleUpdateBookingStatus(
                              selectedBooking?.booking_id || 0,
                              "confirmed"
                            )
                          }
                        >
                          Confirm
                        </Button>
                        <Button
                          key={`modal-${selectedBooking?.booking_id}-cancel-btn`}
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleUpdateBookingStatus(
                              selectedBooking?.booking_id || 0,
                              "cancelled"
                            )
                          }
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {selectedBooking?.booking_status === "confirmed" && (
                      <Button
                        key={`modal-${selectedBooking?.booking_id}-create-event-btn`}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleConvertToEvent(selectedBooking)}
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Create an Event
                      </Button>
                    )}
                    {selectedBooking?.booking_status === "converted" && (
                      <Button
                        key={`modal-${selectedBooking?.booking_id}-view-event-btn`}
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          router.push(
                            `/admin/events?booking_ref=${selectedBooking?.booking_reference}`
                          );
                        }}
                      >
                        View Event
                      </Button>
                    )}
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Make Payment Modal */}
          <Dialog
            open={isPaymentModalOpen}
            onOpenChange={setIsPaymentModalOpen}
          >
            <DialogContent className="max-w-2xl lg:max-w-xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 shrink-0 border-b bg-white">
                <DialogTitle className="text-xl">Record Payment</DialogTitle>
                <DialogDescription className="text-sm">
                  Record a new payment for booking{" "}
                  {selectedBooking?.booking_reference}. You can make partial
                  payments, full payment, or any custom amount.
                </DialogDescription>
              </DialogHeader>

              {/* Payment Summary */}
              {selectedBooking && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shrink-0 mx-6 mt-4 mb-2 rounded-lg">
                  <h4 className="font-semibold mb-4 flex items-center gap-2 text-blue-900">
                    <Wallet className="h-5 w-5" />
                    Payment Summary
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-blue-700 font-medium mb-1">
                        Total Price
                      </div>
                      <div className="font-bold text-lg text-blue-900">
                        {formatCurrency(
                          bookingDetails?.total_price ||
                            selectedBooking.total_price ||
                            0
                        )}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-green-700 font-medium mb-1">
                        Amount Paid
                      </div>
                      <div className="font-bold text-lg text-green-600">
                        {formatCurrency(calculatePaidAmount(selectedBooking))}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-orange-700 font-medium mb-1">
                        Balance Due
                      </div>
                      <div className="font-bold text-lg text-orange-600">
                        {formatCurrency(getRemainingBalance(selectedBooking))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 bg-gray-50">
                <div className="grid grid-cols-1 gap-6">
                  {/* Payment Type Selection */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      Quick Payment Options
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button
                        type="button"
                        variant={
                          newPayment.payment_type === "custom"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setNewPayment((p) => ({
                            ...p,
                            payment_type: "custom",
                          }))
                        }
                        className="h-12"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="font-medium">Custom Amount</div>
                          <div className="text-xs opacity-75">
                            Enter any amount
                          </div>
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant={
                          newPayment.payment_type === "percentage"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setNewPayment((p) => ({
                            ...p,
                            payment_type: "percentage",
                          }))
                        }
                        className="h-12"
                      >
                        <Percent className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="font-medium">Percentage</div>
                          <div className="text-xs opacity-75">Pay by %</div>
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant={
                          newPayment.payment_type === "full"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          if (selectedBooking) {
                            const remainingBalance =
                              getRemainingBalance(selectedBooking);
                            setNewPayment((p) => ({
                              ...p,
                              payment_type: "full",
                              percentage: 100,
                              payment_amount: remainingBalance,
                            }));
                            setPaymentAmountDisplay(
                              formatNumberWithCommas(remainingBalance)
                            );
                          }
                        }}
                        className="h-12"
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="font-medium">Full Balance</div>
                          <div className="text-xs opacity-75">
                            Pay remaining
                          </div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  {/* Payment Details Form */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Amount *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            ₱
                          </span>
                          <input
                            type="text"
                            value={paymentAmountDisplay}
                            onChange={(e) =>
                              handlePaymentAmountChange(e.target.value)
                            }
                            onBlur={handlePaymentAmountBlur}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-blue-500"
                            placeholder="0.00"
                            disabled={newPayment.payment_type === "full"}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method *
                        </label>
                        <select
                          value={newPayment.payment_method}
                          onChange={(e) =>
                            setNewPayment((p) => ({
                              ...p,
                              payment_method: e.target.value as
                                | "gcash"
                                | "bank-transfer"
                                | "cash",
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-blue-500"
                        >
                          <option value="cash">Cash</option>
                          <option value="gcash">GCash</option>
                          <option value="bank-transfer">Bank Transfer</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Date *
                        </label>
                        <input
                          type="date"
                          value={newPayment.payment_date}
                          onChange={(e) =>
                            setNewPayment((p) => ({
                              ...p,
                              payment_date: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Status *
                        </label>
                        <select
                          value={newPayment.payment_status}
                          onChange={(e) =>
                            setNewPayment((p) => ({
                              ...p,
                              payment_status: e.target.value as
                                | "completed"
                                | "pending",
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-blue-500"
                        >
                          <option value="completed">Completed</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={newPayment.payment_reference}
                        onChange={(e) =>
                          setNewPayment((p) => ({
                            ...p,
                            payment_reference: e.target.value,
                          }))
                        }
                        placeholder="Transaction reference or receipt number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Notes
                      </label>
                      <textarea
                        value={newPayment.payment_notes}
                        onChange={(e) =>
                          setNewPayment((p) => ({
                            ...p,
                            payment_notes: e.target.value,
                          }))
                        }
                        placeholder="Additional notes about this payment"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t bg-white shrink-0 mt-0">
                <div className="flex flex-row justify-end gap-3 w-full">
                  <Button
                    variant="outline"
                    onClick={() => setIsPaymentModalOpen(false)}
                    disabled={isCreatingPayment}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePayment}
                    disabled={
                      isCreatingPayment || newPayment.payment_amount <= 0
                    }
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreatingPayment ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Recording...
                      </>
                    ) : (
                      <>
                        <Wallet className="h-4 w-4 mr-2" />
                        Record Payment
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
