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
    if (!booking) return 0;
    const totalPrice = recalculateTotalPrice(booking);
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

      let allPayments: PaymentHistoryItem[] = [];

      // First, get booking payments
      if (booking.payments && Array.isArray(booking.payments)) {
        console.log(
          "Using existing payment data from booking:",
          booking.payments
        );
        allPayments = booking.payments.map((payment: any) => ({
          ...payment,
          from_booking: true,
        }));
      } else {
        // Fetch booking payment data
        try {
          const bookingResponse = await axios.get("/admin.php", {
            params: {
              operation: "getBookingById",
              booking_id: booking.booking_id,
            },
          });

          if (bookingResponse.data.status === "success") {
            const bookingPayments =
              bookingResponse.data.booking?.payments || [];
            allPayments = bookingPayments.map((payment: any) => ({
              ...payment,
              from_booking: true,
            }));
          }
        } catch (error) {
          console.error("Error fetching booking payments:", error);
        }
      }

      // If booking has been converted to an event, also fetch event payment history
      if (booking.converted_event_id) {
        try {
          console.log(
            "Fetching event payment history for event:",
            booking.converted_event_id
          );
          const eventResponse = await axios.get("/admin.php", {
            params: {
              operation: "getEventById",
              event_id: booking.converted_event_id,
            },
          });

          if (eventResponse.data.status === "success") {
            const eventData = eventResponse.data.event;
            const eventPayments = eventData?.payments || [];
            console.log("Event payments found:", eventPayments);

            // Store event total budget for later use
            if (eventData?.total_budget) {
              (booking as any).event_total_budget = eventData.total_budget;
            }

            // Merge event payments with booking payments
            allPayments = [...allPayments, ...eventPayments];
          }
        } catch (error) {
          console.error("Error fetching event payments:", error);
        }
      }

      // Remove duplicates based on payment_id and sort by date
      const uniquePayments = allPayments
        .filter(
          (payment, index, self) =>
            index === self.findIndex((p) => p.payment_id === payment.payment_id)
        )
        .sort(
          (a, b) =>
            new Date(b.payment_date).getTime() -
            new Date(a.payment_date).getTime()
        );

      console.log("Final payment history:", uniquePayments);
      setPaymentHistory(uniquePayments);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      setPaymentHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    // Handle NaN and invalid numbers
    const validAmount = isNaN(amount) || !isFinite(amount) ? 0 : amount;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(validAmount);
  };

  const calculatePaidAmount = (): number => {
    if (paymentHistory && paymentHistory.length > 0) {
      console.log(
        "Calculating paid amount from payment history:",
        paymentHistory
      );
      const result = paymentHistory.reduce((sum, p) => {
        const isPaid =
          p.payment_status === "completed" ||
          p.payment_status === "paid" ||
          p.payment_status === "confirmed" ||
          p.payment_status === "processed" ||
          p.payment_status === "successful";

        // Ensure payment_amount is a valid number
        const amount = Number(p.payment_amount) || 0;
        console.log(
          `Payment: ${p.payment_id}, Status: ${p.payment_status}, Amount: ${p.payment_amount}, Parsed: ${amount}, IsPaid: ${isPaid}`
        );
        return isPaid ? sum + amount : sum;
      }, 0);
      console.log("Total paid amount calculated:", result);
      return result;
    }
    console.log("No payment history available");
    return 0;
  };

  const getRemainingBalance = (): number => {
    // Use event total budget if booking has been converted to event, otherwise use booking total
    const totalPrice = booking?.converted_event_id
      ? (booking as any).event_total_budget || booking?.total_price || 0
      : booking?.total_price || 0;
    const paidAmount = calculatePaidAmount();

    console.log("Calculating remaining balance:");
    console.log("Total Price:", totalPrice);
    console.log("Paid Amount:", paidAmount);
    console.log("Booking converted_event_id:", booking?.converted_event_id);
    console.log("Event total budget:", (booking as any).event_total_budget);

    // Ensure both values are valid numbers
    const validTotalPrice = parseFloat(totalPrice.toString()) || 0;
    const validPaidAmount = parseFloat(paidAmount.toString()) || 0;

    const remaining = Math.max(0, validTotalPrice - validPaidAmount);
    console.log("Remaining balance:", remaining);
    return remaining;
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

  // Card view pagination
  const [cardsPerPage, setCardsPerPage] = useState<number>(6);
  const [showAllCards, setShowAllCards] = useState<boolean>(false);
  const [detailsTab, setDetailsTab] = useState<string>("summary");
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
    // Reset card view pagination when filters change
    setShowAllCards(false);
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

  // Function to fetch client profile pictures for bookings
  const fetchClientProfilePictures = async (bookings: Booking[]) => {
    try {
      const userIds = bookings
        .map((booking) => booking.user_id)
        .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

      if (userIds.length === 0) return;

      const profilePromises = userIds.map(async (userId) => {
        try {
          const response = await axios.get("/admin.php", {
            params: {
              operation: "getUserProfile",
              user_id: userId,
            },
          });

          if (response.data.status === "success" && response.data.profile) {
            return {
              userId,
              profilePicture: response.data.profile.user_pfp,
            };
          }
        } catch (error) {
          console.error(`Error fetching profile for user ${userId}:`, error);
        }
        return { userId, profilePicture: null };
      });

      const profiles = await Promise.all(profilePromises);

      // Update bookings with profile pictures
      setBookings((prevBookings) =>
        prevBookings.map((booking) => {
          const profile = profiles.find((p) => p.userId === booking.user_id);
          return {
            ...booking,
            client_profile_picture: profile?.profilePicture || null,
          };
        })
      );
    } catch (error) {
      console.error("Error fetching client profile pictures:", error);
    }
  };

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Fetching bookings from API...");

      const response = await axios.post("/admin.php", {
        operation: "getAllBookings",
        include_client_profile: true,
      });

      console.log("📡 API Response:", response.data);

      if (response.data.status === "success") {
        console.log("✅ Success! Fetched bookings:", response.data.bookings);
        console.log(
          "📊 Total bookings count:",
          response.data.count || response.data.bookings?.length || 0
        );

        // Debug: Check if client profile pictures are included
        if (response.data.bookings && response.data.bookings.length > 0) {
          const firstBooking = response.data.bookings[0];
          console.log("🔍 First booking data:", firstBooking);
          console.log(
            "🖼️ Client profile picture:",
            firstBooking.client_profile_picture
          );
        }

        const bookingsData = response.data.bookings || [];
        setBookings(bookingsData);

        // Fetch client profile pictures if not included in the response
        if (bookingsData.length > 0) {
          const hasProfilePictures = bookingsData.some(
            (booking: Booking) => booking.client_profile_picture
          );
          if (!hasProfilePictures) {
            console.log(
              "🖼️ No profile pictures in response, fetching separately..."
            );
            fetchClientProfilePictures(bookingsData);
          }
        }

        if (bookingsData.length === 0) {
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

  // Function to fetch client statistics
  const fetchClientStats = async (userId: number) => {
    try {
      const [profileResponse, statsResponse] = await Promise.all([
        axios.get("/admin.php", {
          params: { operation: "getUserProfile", user_id: userId },
        }),
        axios.get("/admin.php", {
          params: { operation: "getClientStats", user_id: userId },
        }),
      ]);

      const profile =
        profileResponse.data.status === "success"
          ? profileResponse.data.profile
          : null;
      const stats =
        statsResponse.data.status === "success"
          ? statsResponse.data
          : { totalRevenue: 0, totalEvents: 0 };

      setClientStats({
        totalRevenue: stats.totalRevenue || 0,
        totalEvents: stats.totalEvents || 0,
        clientProfile: profile,
      });
    } catch (error) {
      console.error("Error fetching client stats:", error);
      setClientStats({
        totalRevenue: 0,
        totalEvents: 0,
        clientProfile: null,
      });
    }
  };

  // Function to fetch client event history
  const fetchClientEventHistory = async (userId: number) => {
    try {
      console.log("Fetching event history for user ID:", userId);

      // First, let's check the event count
      const countResponse = await axios.get("/admin.php", {
        params: { operation: "getClientEventCount", user_id: userId },
      });
      console.log("Event count response:", countResponse.data);

      // Test simple query
      const testResponse = await axios.get("/admin.php", {
        params: { operation: "testClientEvents", user_id: userId },
      });
      console.log("Test events response:", testResponse.data);

      // Test ultra-simple query
      const simpleResponse = await axios.get("/admin.php", {
        params: { operation: "simpleClientEvents", user_id: userId },
      });
      console.log("Simple events response:", simpleResponse.data);

      const response = await axios.get("/admin.php", {
        params: { operation: "getClientEventHistory", user_id: userId },
      });

      console.log("Event history response:", response.data);

      if (response.data.status === "success") {
        const events = response.data.events || [];
        console.log("Events found:", events.length);
        console.log("Debug info:", response.data.debug_info);
        setClientEventHistory(events);
      } else {
        console.log("API returned error:", response.data.message);
        setClientEventHistory([]);
      }
    } catch (error) {
      console.error("Error fetching client event history:", error);
      setClientEventHistory([]);
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
          axios.get("/admin.php", {
            params: { operation: "getBookingByReference", reference: ref },
          })
        );

        // Fetch client statistics and event history
        fetchClientStats(selectedBooking.user_id);
        fetchClientEventHistory(selectedBooking.user_id);
        if (pkgId) {
          // Package details (inclusions list)
          requests.push(
            axios.get("/admin.php", {
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
      // Use recalculated total instead of stored total_price for consistency
      result.submittedTotal = selectedBooking
        ? recalculateTotalPrice(selectedBooking)
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
      const response = await axios.post(`${endpoints.admin}`, {
        operation: "acceptBooking",
        booking_id: booking.booking_id,
        user_id: userData?.user_id,
        user_role: "admin",
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
      const response = await axios.post("/admin.php", {
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
      const response = await axios.post("/admin.php", {
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

      const response = await axios.post(endpoints.admin, paymentData);

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

  // Recalculate total price based on current booking data
  const recalculateTotalPrice = (booking: Booking): number => {
    if (!bookingDetails || !packageDetails) {
      return bookingDetails?.total_price || booking.total_price || 0;
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

  const getRemainingBalance = (booking: Booking): number => {
    const totalPrice = recalculateTotalPrice(booking);
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
    const hasReservationFee =
      booking.payments &&
      booking.payments.length > 0 &&
      calculatePaidAmount(booking) > 0;

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
                {/* Card View Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="text-sm text-gray-600">
                    {filteredBookings.length > 0 && (
                      <>
                        {showAllCards
                          ? `Showing all ${filteredBookings.length} bookings`
                          : `Showing ${Math.min(cardsPerPage, filteredBookings.length)} of ${filteredBookings.length} bookings`}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">
                      Cards per page:
                    </label>
                    <select
                      value={cardsPerPage}
                      onChange={(e) => {
                        setCardsPerPage(Number(e.target.value));
                        setShowAllCards(false);
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value={6}>6</option>
                      <option value={12}>12</option>
                      <option value={18}>18</option>
                      <option value={24}>24</option>
                    </select>
                  </div>
                </div>
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
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      {(showAllCards
                        ? filteredBookings
                        : filteredBookings.slice(0, cardsPerPage)
                      ).map((booking) => (
                        <BookingCard
                          key={booking.booking_id}
                          booking={booking}
                        />
                      ))}
                    </div>

                    {/* Show More/Less Controls */}
                    {filteredBookings.length > cardsPerPage && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowAllCards(!showAllCards)}
                          className="flex items-center gap-2"
                        >
                          {showAllCards ? (
                            <>
                              <span>Show Less</span>
                              <span className="text-lg">↑</span>
                            </>
                          ) : (
                            <>
                              <span>Show More</span>
                              <span className="text-lg">↓</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Table View */}
            <TabsContent value="table">
              <Card className="border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Bookings ({filteredBookings.length})</CardTitle>
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="bookingsPageSize"
                      className="text-sm text-gray-600"
                    >
                      Rows per page
                    </label>
                    <select
                      id="bookingsPageSize"
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
                </CardHeader>
                <CardContent>
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
                    <>
                      <div
                        className="overflow-x-auto overflow-y-visible"
                        style={{
                          scrollbarWidth: "thin",
                          scrollbarColor: "#d1d5db #f3f4f6",
                        }}
                      >
                        <style jsx>{`
                          div::-webkit-scrollbar {
                            height: 8px;
                          }
                          div::-webkit-scrollbar-track {
                            background: #f3f4f6;
                            border-radius: 4px;
                          }
                          div::-webkit-scrollbar-thumb {
                            background: #d1d5db;
                            border-radius: 4px;
                          }
                          div::-webkit-scrollbar-thumb:hover {
                            background: #9ca3af;
                          }
                        `}</style>
                        <table
                          className="w-full text-sm"
                          style={{ minWidth: "1400px" }}
                        >
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 w-16 min-w-[64px]">
                                Profile
                              </th>
                              <th className="text-left py-3 px-4 w-32 min-w-[128px]">
                                Reference
                              </th>
                              <th className="text-left py-3 px-4 w-48 min-w-[192px]">
                                Client
                              </th>
                              <th className="text-left py-3 px-4 w-64 min-w-[256px]">
                                Event
                              </th>
                              <th className="text-left py-3 px-4 w-32 min-w-[128px]">
                                Date & Time
                              </th>
                              <th className="text-left py-3 px-4 w-24 min-w-[96px]">
                                Guests
                              </th>
                              <th className="text-left py-3 px-4 w-48 min-w-[192px]">
                                Venue
                              </th>
                              <th className="text-left py-3 px-4 w-48 min-w-[192px]">
                                Package
                              </th>
                              <th className="text-left py-3 px-4 w-32 min-w-[128px]">
                                Status
                              </th>
                              <th className="text-left py-3 px-4 w-40 min-w-[160px]">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {tablePageBookings.map((booking, index) => (
                              <tr
                                key={`booking-row-${booking.booking_id}-${index}`}
                                className="border-b hover:bg-gray-50"
                              >
                                <td className="py-3 px-4">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage
                                      src={
                                        booking.client_profile_picture
                                          ? `${endpoints.serveImage}?path=${booking.client_profile_picture}`
                                          : undefined
                                      }
                                      alt={booking.client_name}
                                    />
                                    <AvatarFallback>
                                      <Users className="h-5 w-5 text-gray-400" />
                                    </AvatarFallback>
                                  </Avatar>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-medium whitespace-nowrap">
                                    {booking.booking_reference}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-medium whitespace-nowrap">
                                    {booking.client_name}
                                  </div>
                                  <div
                                    className="truncate max-w-[180px] text-gray-600 text-xs"
                                    title={booking.client_email}
                                  >
                                    {booking.client_email}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div
                                    className="font-medium truncate max-w-[240px]"
                                    title={booking.event_name}
                                  >
                                    {booking.event_name}
                                  </div>
                                  <div className="text-gray-600 text-xs">
                                    {booking.event_type_name}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="whitespace-nowrap">
                                    {new Date(
                                      booking.event_date
                                    ).toLocaleDateString()}
                                  </div>
                                  <div className="text-gray-600 text-xs">
                                    {booking.event_time}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-center whitespace-nowrap">
                                    {booking.guest_count}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div
                                    className="truncate max-w-[180px]"
                                    title={booking.venue_name || ""}
                                  >
                                    {booking.venue_name || "-"}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div
                                    className="truncate max-w-[180px]"
                                    title={booking.package_name || ""}
                                  >
                                    {booking.package_name || "-"}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs whitespace-nowrap flex items-center gap-1 w-fit ${getStatusColor(booking.booking_status)}`}
                                  >
                                    {getStatusIcon(booking.booking_status)}
                                    {booking.booking_status}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedBooking(booking);
                                          setShowDetailsModal(true);
                                        }}
                                      >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Details
                                      </DropdownMenuItem>

                                      {(booking.booking_status === "pending" ||
                                        booking.booking_status ===
                                          "reserved") && (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleAcceptBooking(booking)
                                            }
                                            className="text-green-600"
                                          >
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Accept Booking
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleRejectBooking(booking)
                                            }
                                            disabled={
                                              booking.booking_status ===
                                              "reserved"
                                            }
                                            className="text-red-600"
                                          >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Reject Booking
                                          </DropdownMenuItem>
                                        </>
                                      )}

                                      {booking.booking_status ===
                                        "confirmed" && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleConvertToEvent(booking)
                                          }
                                          disabled={
                                            convertingBookingId ===
                                            booking.booking_id
                                          }
                                        >
                                          {convertingBookingId ===
                                          booking.booking_id ? (
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                            <ArrowRight className="mr-2 h-4 w-4" />
                                          )}
                                          Create Event
                                        </DropdownMenuItem>
                                      )}

                                      {booking.booking_status ===
                                        "converted" && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            router.push(
                                              `/admin/events?booking_ref=${booking.booking_reference}`
                                            );
                                          }}
                                        >
                                          <Eye className="mr-2 h-4 w-4" />
                                          View Event
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {tableTotalPages > 1 && (
                        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between pt-2">
                          <div className="text-xs text-gray-600">
                            Page {safeTableCurrentPage} of {tableTotalPages}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setTableCurrentPage(1)}
                              disabled={safeTableCurrentPage <= 1}
                              className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                              aria-label="First page"
                            >
                              «
                            </button>
                            <button
                              onClick={() =>
                                setTableCurrentPage((p) => Math.max(1, p - 1))
                              }
                              disabled={safeTableCurrentPage <= 1}
                              className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                              aria-label="Previous page"
                            >
                              ‹
                            </button>
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
                                  <button
                                    key={`bookings-page-${p}-${i}`}
                                    onClick={() => setTableCurrentPage(p)}
                                    className={`px-3 py-1 border rounded hover:bg-gray-50 ${
                                      p === current
                                        ? "bg-gray-100 font-semibold"
                                        : ""
                                    }`}
                                  >
                                    {p}
                                  </button>
                                ) : (
                                  <span
                                    key={`bookings-gap-${i}`}
                                    className="px-2 text-gray-500"
                                  >
                                    {p}
                                  </span>
                                )
                              );
                            })()}
                            <button
                              onClick={() =>
                                setTableCurrentPage((p) =>
                                  Math.min(tableTotalPages, p + 1)
                                )
                              }
                              disabled={safeTableCurrentPage >= tableTotalPages}
                              className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                              aria-label="Next page"
                            >
                              ›
                            </button>
                            <button
                              onClick={() =>
                                setTableCurrentPage(tableTotalPages)
                              }
                              disabled={safeTableCurrentPage >= tableTotalPages}
                              className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                              aria-label="Last page"
                            >
                              »
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Booking Details Modal */}
          <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
            <DialogContent className="sm:max-w-[900px] w-[95vw] max-w-[900px] h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
              <DialogHeader className="px-4 sm:px-6 py-4 shrink-0 border-b bg-white">
                <DialogTitle className="text-lg sm:text-xl">
                  Booking Details
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {selectedBooking?.booking_reference}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 text-sm">
                {detailsLoading && (
                  <div className="text-sm text-gray-500 px-4 sm:px-6 py-4">
                    Loading detailed summary…
                  </div>
                )}
                <Tabs
                  value={detailsTab}
                  onValueChange={setDetailsTab}
                  className="h-full flex flex-col"
                >
                  {/* Sticky Tab Navigation */}
                  <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
                    <div className="px-2 sm:px-4 py-2">
                      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 h-auto bg-gray-100 p-1">
                        <TabsTrigger
                          value="summary"
                          className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                          <span className="hidden sm:inline">Summary</span>
                          <span className="sm:hidden">Summary</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="client"
                          className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                          <span className="hidden sm:inline">Client</span>
                          <span className="sm:hidden">Client</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="event"
                          className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                          <span className="hidden sm:inline">Event</span>
                          <span className="sm:hidden">Event</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="booking"
                          className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                          <span className="hidden sm:inline">Booking</span>
                          <span className="sm:hidden">Booking</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="package"
                          className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                          <span className="hidden lg:inline">
                            Package & Inclusions
                          </span>
                          <span className="lg:hidden">Package</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="payments"
                          className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                          <span className="hidden lg:inline">
                            Payment History
                          </span>
                          <span className="lg:hidden">Payments</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto">
                    <TabsContent value="summary" className="pt-4 px-4 sm:px-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                              {
                                minimumFractionDigits: 2,
                              }
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
                                      +{packageDetails.freebies.length - 6} more
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
                            <>
                              <div className="text-gray-900 text-lg font-semibold">
                                Booking Total: ₱
                                {Number(
                                  detailsSummary.submittedTotal
                                ).toLocaleString("en-PH", {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                              {selectedBooking &&
                                calculatePaidAmount(selectedBooking) > 0 &&
                                (selectedBooking.booking_status === "pending" ||
                                  selectedBooking.booking_status ===
                                    "reserved" ||
                                  selectedBooking.booking_status ===
                                    "confirmed") && (
                                  <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                                    <div className="text-xs text-green-700 font-medium">
                                      Reservation Fee Paid: ₱
                                      {calculatePaidAmount(
                                        selectedBooking
                                      ).toLocaleString("en-PH", {
                                        minimumFractionDigits: 2,
                                      })}
                                    </div>
                                    <div className="text-xs text-green-600 mt-1">
                                      Will be deducted from package price when
                                      creating event
                                    </div>
                                  </div>
                                )}
                            </>
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

                    <TabsContent value="client" className="pt-4 px-4 sm:px-6">
                      <div className="space-y-4">
                        {/* Client Profile Card */}
                        <div className="bg-white border rounded-lg p-6">
                          <div className="flex items-start gap-4">
                            {/* Profile Picture */}
                            <div className="flex-shrink-0">
                              {clientStats?.clientProfile?.user_pfp ? (
                                <img
                                  src={`${endpoints.serveImage}?path=${clientStats.clientProfile.user_pfp}`}
                                  alt="Profile"
                                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                  <Users className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>

                            {/* Client Information */}
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {clientStats?.clientProfile?.user_firstName}{" "}
                                {clientStats?.clientProfile?.user_lastName}
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-500">Email:</span>
                                  <div className="font-medium">
                                    {selectedBooking?.client_email}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Phone:</span>
                                  <div className="font-medium">
                                    {selectedBooking?.client_phone}
                                  </div>
                                </div>
                                {clientStats?.clientProfile?.user_contact && (
                                  <div>
                                    <span className="text-gray-500">
                                      Contact:
                                    </span>
                                    <div className="font-medium">
                                      {clientStats.clientProfile.user_contact}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-500">
                                    Member Since:
                                  </span>
                                  <div className="font-medium">
                                    {clientStats?.clientProfile?.created_at
                                      ? new Date(
                                          clientStats.clientProfile.created_at
                                        ).toLocaleDateString()
                                      : "N/A"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Client Statistics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <div className="text-sm text-green-600 font-medium">
                                  Total Revenue
                                </div>
                                <div className="text-xl font-bold text-green-800">
                                  ₱
                                  {clientStats?.totalRevenue?.toLocaleString(
                                    "en-PH",
                                    { minimumFractionDigits: 2 }
                                  ) || "0.00"}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm text-blue-600 font-medium">
                                  Total Events
                                </div>
                                <div className="text-xl font-bold text-blue-800">
                                  {clientStats?.totalEvents || 0}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Client Information */}
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Client Details
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Full Name:</span>
                              <div className="font-medium">
                                {clientStats?.clientProfile?.user_firstName}{" "}
                                {clientStats?.clientProfile?.user_lastName}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">User ID:</span>
                              <div className="font-medium">
                                {selectedBooking?.user_id}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Email:</span>
                              <div className="font-medium">
                                {selectedBooking?.client_email}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Phone:</span>
                              <div className="font-medium">
                                {selectedBooking?.client_phone}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Event History */}
                        <div className="bg-white border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Event History
                          </h4>
                          {clientEventHistory.length > 0 ? (
                            <div className="space-y-3">
                              {clientEventHistory.map((event, index) => (
                                <div
                                  key={event.event_id || index}
                                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h5 className="font-semibold text-gray-900">
                                          {event.event_title ||
                                            event.event_name ||
                                            "Untitled Event"}
                                        </h5>
                                        <Badge
                                          className={`text-xs ${
                                            event.event_status === "completed"
                                              ? "bg-green-100 text-green-800"
                                              : event.event_status ===
                                                  "in_progress"
                                                ? "bg-blue-100 text-blue-800"
                                                : event.event_status ===
                                                    "confirmed"
                                                  ? "bg-yellow-100 text-yellow-800"
                                                  : "bg-gray-100 text-gray-800"
                                          }`}
                                        >
                                          {event.event_status || "Unknown"}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        <div>
                                          <span className="text-gray-500">
                                            Date:
                                          </span>
                                          <div className="font-medium">
                                            {event.event_date
                                              ? new Date(
                                                  event.event_date
                                                ).toLocaleDateString()
                                              : "N/A"}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">
                                            Type:
                                          </span>
                                          <div className="font-medium">
                                            {event.event_type_name || "N/A"}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">
                                            Venue:
                                          </span>
                                          <div className="font-medium">
                                            {event.venue_name || "N/A"}
                                          </div>
                                        </div>
                                        {event.total_budget && (
                                          <div>
                                            <span className="text-gray-500">
                                              Budget:
                                            </span>
                                            <div className="font-medium">
                                              ₱
                                              {Number(
                                                event.total_budget
                                              ).toLocaleString("en-PH", {
                                                minimumFractionDigits: 2,
                                              })}
                                            </div>
                                          </div>
                                        )}
                                        {event.total_paid && (
                                          <div>
                                            <span className="text-gray-500">
                                              Paid:
                                            </span>
                                            <div className="font-medium">
                                              ₱
                                              {Number(
                                                event.total_paid
                                              ).toLocaleString("en-PH", {
                                                minimumFractionDigits: 2,
                                              })}
                                            </div>
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-gray-500">
                                            Created:
                                          </span>
                                          <div className="font-medium">
                                            {event.created_at
                                              ? new Date(
                                                  event.created_at
                                                ).toLocaleDateString()
                                              : "N/A"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0 ml-4">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          // Navigate to event details
                                          window.open(
                                            `/admin/events/${event.event_id}`,
                                            "_blank"
                                          );
                                        }}
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                              <p className="text-sm">
                                No events found for this client
                              </p>
                              <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left max-w-md mx-auto">
                                <p>
                                  <strong>Debug Info:</strong>
                                </p>
                                <p>User ID: {selectedBooking?.user_id}</p>
                                <p>
                                  Events Array Length:{" "}
                                  {clientEventHistory.length}
                                </p>
                                <p>Check browser console for detailed logs</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="event" className="pt-4 px-4 sm:px-6">
                      <div className="bg-white border rounded-lg p-4 space-y-3">
                        <div>
                          <strong>Event Name:</strong>{" "}
                          {selectedBooking?.event_name}
                        </div>
                        <div>
                          <strong>Event Type:</strong>{" "}
                          {selectedBooking?.event_type_name}
                        </div>
                        <div>
                          <strong>Date:</strong>{" "}
                          {selectedBooking?.event_date
                            ? new Date(
                                selectedBooking.event_date
                              ).toLocaleDateString()
                            : "-"}
                        </div>
                        <div>
                          <strong>Time:</strong> {selectedBooking?.event_time}
                        </div>
                        <div>
                          <strong>Guest Count:</strong>{" "}
                          {selectedBooking?.guest_count}
                        </div>
                        {selectedBooking?.venue_name && (
                          <div>
                            <strong>Venue:</strong>{" "}
                            {selectedBooking?.venue_name}
                          </div>
                        )}
                        {selectedBooking?.package_name && (
                          <div>
                            <strong>Package:</strong>{" "}
                            {selectedBooking?.package_name}
                          </div>
                        )}
                        {selectedBooking?.notes && (
                          <div>
                            <strong>Notes:</strong> {selectedBooking?.notes}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="booking" className="pt-4 px-4 sm:px-6">
                      <div className="bg-white border rounded-lg p-4 space-y-3">
                        <div>
                          <strong>Reference:</strong>{" "}
                          {selectedBooking?.booking_reference}
                        </div>
                        <div>
                          <strong>Created:</strong>{" "}
                          {selectedBooking?.created_at
                            ? new Date(
                                selectedBooking.created_at
                              ).toLocaleDateString()
                            : "-"}
                        </div>
                        <div className="flex items-center gap-2">
                          <strong>Status:</strong>
                          <Badge
                            className={`${getStatusColor(selectedBooking?.booking_status || "pending")} flex items-center gap-1`}
                          >
                            {getStatusIcon(
                              selectedBooking?.booking_status || "pending"
                            )}
                            {selectedBooking?.booking_status || "pending"}
                          </Badge>
                        </div>
                        {selectedBooking?.converted_event_id && (
                          <div>
                            <strong>Event ID:</strong>{" "}
                            {selectedBooking?.converted_event_id}
                          </div>
                        )}
                        {selectedBooking && (
                          <div>
                            <strong>Booking Total Price:</strong> ₱
                            {Number(recalculateTotalPrice(selectedBooking)).toLocaleString(
                              "en-PH",
                              {
                                minimumFractionDigits: 2,
                              }
                            )}
                          </div>
                        )}
                        {!selectedBooking && venuePricingInfo && (
                          <div>
                            <strong>Estimated Venue Total:</strong> ₱
                            {venuePricingInfo.estimatedTotal.toLocaleString(
                              "en-PH",
                              { minimumFractionDigits: 2 }
                            )}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="package" className="pt-4 px-4 sm:px-6">
                      {packageDetails || bookingDetails ? (
                        <div className="bg-white border rounded-lg p-4 space-y-4">
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
                              {selectedBooking?.venue_name && (
                                <div className="mt-1">
                                  <strong>Venue:</strong>{" "}
                                  {selectedBooking?.venue_name}
                                  {venuePricingInfo && (
                                    <span className="text-gray-600">
                                      {" "}
                                      — Base ₱
                                      {venuePricingInfo.basePrice.toLocaleString()}{" "}
                                      {venuePricingInfo.extraPaxRate > 0 &&
                                      selectedBooking?.guest_count &&
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

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <div className="font-medium mb-1">Included</div>
                              <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-gray-50 p-3 rounded border">
                                {detailsSummary.includedNames
                                  .slice(0, 100)
                                  .map((n, i) => (
                                    <li key={`inc-${i}`}>{n}</li>
                                  ))}
                                {detailsSummary.includedNames.length === 0 && (
                                  <li className="text-gray-500">No data</li>
                                )}
                              </ul>
                            </div>
                            <div>
                              <div className="font-medium mb-1">
                                Removed / Unchecked
                              </div>
                              <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-gray-50 p-3 rounded border">
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
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {detailsSummary.supplierServices.length > 0 && (
                                <div>
                                  <div className="font-medium mb-1">
                                    Supplier Services
                                  </div>
                                  <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-gray-50 p-3 rounded border">
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
                                  <ul className="text-sm list-disc pl-5 space-y-1 max-h-48 overflow-auto bg-gray-50 p-3 rounded border">
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

                    <TabsContent
                      value="payments"
                      className="pt-4 px-4 sm:px-6 min-h-[400px]"
                    >
                      <PaymentHistoryTab
                        booking={selectedBooking}
                        bookingDetails={bookingDetails}
                        packageDetails={packageDetails}
                        venuePricingInfo={venuePricingInfo}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <DialogFooter className="px-4 sm:px-6 py-4 border-t bg-white shrink-0 mt-0">
                <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <Badge
                    className={`${getStatusColor(selectedBooking?.booking_status || "pending")} flex items-center gap-1`}
                  >
                    {getStatusIcon(
                      selectedBooking?.booking_status || "pending"
                    )}
                    {selectedBooking?.booking_status || "pending"}
                  </Badge>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
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
                        onClick={() =>
                          selectedBooking &&
                          handleConvertToEvent(selectedBooking)
                        }
                      >
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
                <DialogTitle className="text-xl">
                  {selectedBooking?.booking_status === "pending" ||
                  selectedBooking?.booking_status === "reserved"
                    ? "Record Reservation Fee"
                    : "Record Payment"}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {selectedBooking?.booking_status === "pending" ||
                  selectedBooking?.booking_status === "reserved" ? (
                    <>
                      Record a reservation fee for booking{" "}
                      {selectedBooking?.booking_reference}. This amount will be
                      subtracted from the package price when you create an
                      event.
                    </>
                  ) : (
                    <>
                      Record a new payment for booking{" "}
                      {selectedBooking?.booking_reference}. You can make partial
                      payments, full payment, or any custom amount.
                    </>
                  )}
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
                        {formatCurrency(recalculateTotalPrice(selectedBooking))}
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
                        placeholder={
                          selectedBooking?.booking_status === "pending" ||
                          selectedBooking?.booking_status === "reserved"
                            ? "Reservation fee - will be deducted from package price"
                            : "Additional notes about this payment"
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-blue-500"
                      />
                      {(selectedBooking?.booking_status === "pending" ||
                        selectedBooking?.booking_status === "reserved") && (
                        <p className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                          💡 This payment will be recorded as a reservation fee
                          and will be subtracted from the package price when
                          converting to an event.
                        </p>
                      )}
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
