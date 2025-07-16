"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  Package,
  Users,
  Plus,
  Eye,
  Heart,
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Gift,
  CheckCircle,
  ArrowRight,
  X,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Event {
  event_id: number;
  event_title: string;
  event_date: string;
  event_type_name: string;
  venue_name: string;
  package_name: string;
  total_budget: number;
  total_paid: number;
  remaining_balance: number;
  payment_percentage: number;
  payment_status: string;
  event_status: string;
}

interface PaymentSchedule {
  schedule_id: number;
  event_title: string;
  due_date: string;
  amount_due: number;
  urgency_status: "overdue" | "due_today" | "due_soon" | "upcoming";
  days_until_due: number;
}

interface Package {
  package_id: number;
  package_title: string;
  package_description: string;
  package_price: number;
  guest_capacity: number;
  created_by_name: string;
  is_active: number;
  component_count: number;
  venue_count: number;
  freebie_count: number;
  event_type_names: string[];
  components: {
    component_name: string;
    component_price: number;
  }[];
  freebies: {
    freebie_name: string;
    freebie_description: string;
    freebie_value: number;
  }[];
  venue_previews?: Array<{
    venue_id: number;
    venue_title: string;
    venue_location: string;
    venue_capacity: number;
    venue_price: number;
    venue_profile_picture: string | null;
    venue_cover_photo: string | null;
  }>;
  created_at: string;
}

interface PackageDetails {
  package_id: number;
  package_title: string;
  package_description: string;
  package_price: number;
  guest_capacity: number;
  event_type_names: string[];
  components: {
    component_name: string;
    component_price: number;
  }[];
  freebies: {
    freebie_name: string;
    freebie_description: string;
    freebie_value: number;
  }[];
  venue_previews?: Array<{
    venue_id: number;
    venue_title: string;
    venue_location: string;
    venue_capacity: number;
    venue_price: number;
    venue_profile_picture: string | null;
    venue_cover_photo: string | null;
  }>;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(
    null
  );
  const [upcomingPayments, setUpcomingPayments] = useState<PaymentSchedule[]>(
    []
  );
  const [selectedPackage, setSelectedPackage] = useState<PackageDetails | null>(
    null
  );
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPackageLoading, setIsPackageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [currentVenueIndex, setCurrentVenueIndex] = useState(0);

  // Get user data from secure storage
  const userData = secureStorage.getItem("user");

  const fetchDashboardData = async () => {
    try {
      protectRoute();
      const userData = secureStorage.getItem("user");

      if (
        !userData ||
        !userData.user_role ||
        userData.user_role.toLowerCase() !== "client"
      ) {
        router.push("/auth/login");
        return;
      }

      setIsLoading(true);

      // Fetch events, payments, and packages in parallel using client.php
      const [eventsResponse, paymentsResponse, packagesResponse] =
        await Promise.all([
          axios.get(
            `http://localhost/events-api/client.php?operation=getClientEvents&user_id=${userData.user_id}`
          ),
          axios.get(
            `http://localhost/events-api/client.php?operation=getClientNextPayments&user_id=${userData.user_id}`
          ),
          axios.get(
            `http://localhost/events-api/client.php?operation=getAllPackages`
          ),
        ]);

      if (eventsResponse.data.status === "success") {
        setEvents(eventsResponse.data.events || []);
      }

      if (paymentsResponse.data.status === "success") {
        setUpcomingPayments(paymentsResponse.data.next_payments || []);
      }

      if (packagesResponse.data.status === "success") {
        setPackages(packagesResponse.data.packages || []);
      }
    } catch (error: any) {
      console.error("Dashboard: Error fetching data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, [router]);

  useEffect(() => {
    if (selectedEventType) {
      const filtered = packages.filter((pkg) =>
        pkg.event_type_names.includes(selectedEventType)
      );
      setFilteredPackages(filtered);
    } else {
      setFilteredPackages(packages);
    }
  }, [selectedEventType, packages]);

  const fetchPackageDetails = async (packageId: number) => {
    try {
      setIsPackageLoading(true);
      const response = await axios.get(
        `http://localhost/events-api/client.php?operation=getPackageDetails&package_id=${packageId}`
      );

      if (response.data.status === "success") {
        // Transform the venues data to match our interface
        const packageData = response.data.package;
        const transformedPackage = {
          ...packageData,
          venue_previews: packageData.venues?.map((venue: any) => ({
            venue_id: venue.venue_id,
            venue_title: venue.venue_title,
            venue_location: venue.venue_location,
            venue_capacity: venue.venue_capacity,
            venue_price: venue.total_price,
            venue_profile_picture: venue.venue_profile_picture,
            venue_cover_photo: venue.venue_cover_photo,
          })),
        };
        setSelectedPackage(transformedPackage);
        setIsPackageModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching package details:", error);
    } finally {
      setIsPackageLoading(false);
    }
  };

  const getEventsForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;
    return events.filter((event) => event.event_date === dateString);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "draft":
      case "planning":
        return "bg-yellow-100 text-yellow-800";
      case "on_going":
        return "bg-blue-100 text-blue-800";
      case "done":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-blue-100 text-blue-800";
      case "unpaid":
        return "bg-yellow-100 text-yellow-800";
      case "refunded":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getUrgencyColor = (status: string) => {
    switch (status) {
      case "overdue":
        return "bg-red-100 text-red-800";
      case "due_today":
        return "bg-yellow-100 text-yellow-800";
      case "due_soon":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    return `http://localhost/events-api/${path}`;
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startingDayOfWeek = getDay(monthStart);
    const today = new Date();

    return (
      <div className="bg-white rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - 1,
                    1
                  )
                )
              }
              className="border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                    1
                  )
                )
              }
              className="border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs sm:text-sm font-medium text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startingDayOfWeek }, (_, i) => (
            <div key={`empty-${i}`} className="h-8 sm:h-10" />
          ))}
          {monthDays.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={day.toISOString()}
                className={`h-8 sm:h-10 flex items-center justify-center text-xs sm:text-sm cursor-pointer rounded-md transition-colors ${
                  isToday
                    ? "bg-[#028A75] text-white font-bold"
                    : isSelected
                      ? "bg-[#028A75]/10 text-[#028A75]"
                      : "hover:bg-gray-100"
                } ${dayEvents.length > 0 ? "border-2 border-[#028A75]" : ""}`}
                onClick={() => setSelectedDate(day)}
              >
                {day.getDate()}
              </div>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium mb-2">
              {format(selectedDate, "MMMM d, yyyy")}
            </p>
            {getEventsForDate(selectedDate).length > 0 ? (
              <div className="space-y-2">
                {getEventsForDate(selectedDate).map((event) => (
                  <div
                    key={event.event_id}
                    className="text-sm p-2 bg-white rounded border-l-4 border-[#028A75]"
                  >
                    <p className="font-medium">{event.event_title}</p>
                    <p className="text-gray-600">{event.event_type_name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No events scheduled</p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#028A75]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="animate-slide-up mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome, {userData?.user_firstName}!
              </h1>
              <p className="text-gray-600 mt-2">
                Discover amazing packages and plan your perfect event
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleRefresh}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-lg transition-all duration-200"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => router.push("/client/bookings/create-booking")}
                className="bg-[#028A75] hover:bg-[#028A75]/90 text-white px-4 sm:px-6 py-3 rounded-lg transition-all duration-200 w-full sm:w-auto"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Booking +
              </Button>
            </div>
          </div>
        </div>

        {/* Featured Packages - Now at the top */}
        <div className="animate-slide-up-delay-1 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-[#028A75] text-[#028A75] hover:bg-[#028A75]/10"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {selectedEventType || "Filter by Event Type"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem
                  onClick={() => setSelectedEventType(null)}
                  className="cursor-pointer"
                >
                  All Event Types
                </DropdownMenuItem>
                {Array.from(
                  new Set(packages.flatMap((pkg) => pkg.event_type_names))
                ).map((eventType) => (
                  <DropdownMenuItem
                    key={eventType}
                    onClick={() => setSelectedEventType(eventType)}
                    className="cursor-pointer"
                  >
                    {eventType}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredPackages.map((pkg, index) => (
              <div
                key={pkg.package_id}
                className="animate-slide-up-stagger"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card className="group bg-white transition-all duration-300 hover:-translate-y-1">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                          {pkg.package_title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {pkg.package_description}
                        </p>
                      </div>
                      <div className="ml-4 text-right flex-shrink-0">
                        <div className="flex items-center text-yellow-500 mb-1">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />
                        </div>
                        <p className="text-xs text-gray-500">Premium</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-1" />
                        <span>Up to {pkg.guest_capacity} guests</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Gift className="h-4 w-4 mr-1" />
                        <span>{pkg.freebie_count} freebies</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">
                        ₱{pkg.package_price.toLocaleString()}
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 self-start sm:self-auto"
                      >
                        {pkg.component_count} inclusions
                      </Badge>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => fetchPackageDetails(pkg.package_id)}
                        className="flex-1 border-[#028A75] hover:bg-[#028A75]/10 min-h-[10px] text-xm font-medium px-6 py-2 !text-[#028A75]"
                        disabled={isPackageLoading}
                      >
                        <Eye className="h-6 w-6 mr-3" />
                        View Details
                      </Button>
                      <Button
                        onClick={() =>
                          router.push(
                            `/client/bookings/create-booking?package=${pkg.package_id}`
                          )
                        }
                        className="flex-1 bg-[#028A75] hover:bg-[#028A75]/90 min-h-[10px] text-xm font-medium px-6 py-2 !text-white"
                      >
                        <Heart className="h-6 w-6 mr-3" />
                        Book Now
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events - Now at the bottom */}
        <div className="animate-slide-up-delay-2 mb-6 sm:mb-8">
          <Card className="bg-white">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-[#028A75]" />
                Your Upcoming Events
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {events
                  .filter((event) => new Date(event.event_date) > new Date())
                  .sort(
                    (a, b) =>
                      new Date(a.event_date).getTime() -
                      new Date(b.event_date).getTime()
                  )
                  .slice(0, 5)
                  .map((event) => (
                    <div
                      key={event.event_id}
                      className="p-3 sm:p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/client/events`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                        <h4 className="font-medium text-gray-900">
                          {event.event_title}
                        </h4>
                        <Badge className={getStatusColor(event.event_status)}>
                          {event.event_status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {format(new Date(event.event_date), "MMM d, yyyy")}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-sm text-gray-500">
                          {event.venue_name || "Venue TBD"}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full self-start sm:self-auto ${getPaymentStatusColor(event.payment_status)}`}
                        >
                          {event.payment_percentage}% Paid
                        </span>
                      </div>
                    </div>
                  ))}
                {events.filter(
                  (event) => new Date(event.event_date) > new Date()
                ).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No upcoming events</p>
                    <p className="text-sm">
                      Ready to plan your next celebration?
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Upcoming Payments */}
        {upcomingPayments.length > 0 && (
          <div className="animate-slide-up-delay-3">
            <Card className="bg-white">
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-orange-600" />
                  Upcoming Payments
                </h3>
                <div className="space-y-4">
                  {upcomingPayments.slice(0, 5).map((payment) => (
                    <div
                      key={payment.schedule_id}
                      className="p-3 sm:p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                        <h4 className="font-medium text-gray-900">
                          {payment.event_title}
                        </h4>
                        <Badge
                          className={getUrgencyColor(payment.urgency_status)}
                        >
                          {payment.urgency_status === "overdue"
                            ? "Overdue"
                            : payment.urgency_status === "due_today"
                              ? "Due Today"
                              : payment.urgency_status === "due_soon"
                                ? "Due Soon"
                                : "Upcoming"}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-sm text-gray-600">
                          Due:{" "}
                          {format(new Date(payment.due_date), "MMM d, yyyy")}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          ₱{payment.amount_due.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Package Details Modal */}
      <Dialog open={isPackageModalOpen} onOpenChange={setIsPackageModalOpen}>
        <DialogContent className="max-w-3xl h-[85vh] mx-auto fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col p-0 gap-0 bg-white rounded-lg">
          {/* Close Button - Top Right */}
          <button
            onClick={() => setIsPackageModalOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          ></button>

          {/* Main Content Container - This wraps both header and scrollable content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header Section */}
            <div className="px-6 pt-6 pb-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-2xl font-semibold text-gray-900">
                  {selectedPackage?.package_title}
                </DialogTitle>
                <DialogDescription className="text-base text-gray-600">
                  {selectedPackage?.package_description}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6">
              {selectedPackage && (
                <div className="space-y-8 pb-6">
                  {/* Package Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center p-6 bg-[#028A75]/10 rounded-xl">
                      <div className="text-2xl sm:text-3xl font-bold text-[#028A75]">
                        ₱
                        {Number(selectedPackage.package_price).toLocaleString(
                          "en-PH",
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Total Package Price
                      </div>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-xl">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600">
                        {selectedPackage.guest_capacity}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Maximum Guests
                      </div>
                    </div>
                    <div className="text-center p-6 bg-purple-50 rounded-xl">
                      <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                        {selectedPackage.freebies
                          ? selectedPackage.freebies.length
                          : 0}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Free Items
                      </div>
                    </div>
                  </div>

                  {/* Package Inclusions */}
                  <div>
                    <h4 className="text-xl font-semibold mb-4 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      What's Included
                    </h4>
                    <div className="space-y-3">
                      {selectedPackage?.components &&
                      selectedPackage.components.length > 0 ? (
                        selectedPackage.components.map((component, idx) => (
                          <div
                            key={idx}
                            className="flex items-center p-4 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                            <h5 className="font-medium text-gray-900">
                              {component.component_name}
                            </h5>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 text-center p-4">
                          No inclusions available
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Freebies */}
                  {selectedPackage.freebies &&
                    selectedPackage.freebies.length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold mb-4 flex items-center">
                          <Gift className="h-5 w-5 mr-2 text-orange-600" />
                          Free Bonuses
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedPackage.freebies.map((freebie, idx) => (
                            <div
                              key={idx}
                              className="flex items-start p-4 bg-orange-50 rounded-lg"
                            >
                              <Gift className="h-5 w-5 mr-3 text-orange-600 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900">
                                  {freebie.freebie_name}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {freebie.freebie_description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Event Types */}
                  {selectedPackage.event_type_names &&
                    Array.isArray(selectedPackage.event_type_names) &&
                    selectedPackage.event_type_names.length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold mb-4 flex items-center">
                          <CalendarIcon className="h-5 w-5 mr-2 text-[#028A75]" />
                          Perfect for These Events
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPackage.event_type_names.map(
                            (eventType, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="bg-[#028A75]/10 text-[#028A75] px-3 py-1 text-sm"
                              >
                                {eventType}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Venue Choices */}
                  {selectedPackage?.venue_previews &&
                    selectedPackage.venue_previews.length > 0 && (
                      <div className="mt-8">
                        <h4 className="text-xl font-semibold mb-4 flex items-center">
                          <MapPin className="h-5 w-5 mr-2 text-[#028A75]" />
                          Available Venues
                        </h4>
                        <div className="relative">
                          <div className="overflow-hidden rounded-xl">
                            {/* Carousel Container */}
                            <div
                              className="relative"
                              style={{
                                transform: `translateX(-${currentVenueIndex * 100}%)`,
                                transition: "transform 0.5s ease-in-out",
                                display: "flex",
                                width: `${selectedPackage?.venue_previews?.length * 100}%`,
                              }}
                            >
                              {selectedPackage?.venue_previews?.map(
                                (venue, idx) => (
                                  <div
                                    key={venue.venue_id}
                                    className="w-full flex-shrink-0"
                                  >
                                    {/* Cover Photo Container */}
                                    <div className="relative w-full h-[300px]">
                                      <img
                                        src={
                                          getImageUrl(
                                            venue.venue_cover_photo
                                          ) || "/placeholder.jpg"
                                        }
                                        alt={`${venue.venue_title} cover`}
                                        className="w-full h-full object-cover rounded-t-lg"
                                      />
                                      {/* Profile Picture Overlay */}
                                      <div className="absolute -bottom-5 left-4">
                                        <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden">
                                          <img
                                            src={
                                              getImageUrl(
                                                venue.venue_profile_picture
                                              ) || "/placeholder.jpg"
                                            }
                                            alt={venue.venue_title}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    {/* Venue Details */}
                                    <div className="pt-7 pb-4 px-4 bg-white rounded-b-lg">
                                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                                        {venue.venue_title}
                                      </h3>
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                        {venue.venue_location}
                                      </p>
                                      <div className="flex items-center justify-between mt-3">
                                        <span className="text-sm text-gray-600 flex items-center">
                                          <Users className="h-4 w-4 mr-1" />
                                          Up to {venue.venue_capacity} guests
                                        </span>
                                        <span className="font-medium text-[#028A75]">
                                          ₱
                                          {Number(
                                            venue.venue_price
                                          ).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                            {/* Navigation Arrows */}
                            {selectedPackage?.venue_previews &&
                              selectedPackage.venue_previews.length > 1 && (
                                <>
                                  <button
                                    onClick={() =>
                                      setCurrentVenueIndex((prev) =>
                                        Math.max(0, prev - 1)
                                      )
                                    }
                                    className={`absolute top-1/2 left-2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm transition-opacity ${
                                      currentVenueIndex === 0
                                        ? "opacity-50 cursor-not-allowed"
                                        : "opacity-100 hover:bg-white"
                                    }`}
                                    disabled={currentVenueIndex === 0}
                                  >
                                    <ChevronLeft className="h-5 w-5 text-gray-700" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setCurrentVenueIndex((prev) =>
                                        Math.min(
                                          (selectedPackage?.venue_previews
                                            ?.length ?? 1) - 1,
                                          prev + 1
                                        )
                                      )
                                    }
                                    className={`absolute top-1/2 right-2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm transition-opacity ${
                                      currentVenueIndex ===
                                      (selectedPackage?.venue_previews
                                        ?.length ?? 1) -
                                        1
                                        ? "opacity-50 cursor-not-allowed"
                                        : "opacity-100 hover:bg-white"
                                    }`}
                                    disabled={
                                      currentVenueIndex ===
                                      (selectedPackage?.venue_previews
                                        ?.length ?? 1) -
                                        1
                                    }
                                  >
                                    <ChevronRight className="h-5 w-5 text-gray-700" />
                                  </button>
                                </>
                              )}
                          </div>
                          {/* Dots Navigation */}
                          {selectedPackage?.venue_previews &&
                            selectedPackage.venue_previews.length > 1 && (
                              <div className="flex justify-center gap-2 mt-4">
                                {selectedPackage.venue_previews.map(
                                  (_, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setCurrentVenueIndex(idx)}
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        idx === currentVenueIndex
                                          ? "w-6 bg-[#028A75]"
                                          : "w-2 bg-gray-300 hover:bg-gray-400"
                                      }`}
                                      aria-label={`Go to venue ${idx + 1}`}
                                    />
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Footer - Now properly positioned at the bottom */}
          <div className="border-t bg-white p-4">
            <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setIsPackageModalOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1 border-[#028A75] text-[#028A75] hover:bg-[#028A75]/10"
              >
                Maybe Later
              </Button>
              <Button
                onClick={() => {
                  setIsPackageModalOpen(false);
                  router.push(
                    `/client/bookings/create-booking?package=${selectedPackage?.package_id}`
                  );
                }}
                className="w-full sm:w-auto bg-[#028A75] hover:bg-[#028A75]/90 text-white order-1 sm:order-2"
              >
                <Heart className="h-4 w-4 mr-2" />
                Book This Package Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }

        .animate-slide-up-delay-1 {
          animation: slide-up 0.6s ease-out 0.1s both;
        }

        .animate-slide-up-delay-2 {
          animation: slide-up 0.6s ease-out 0.2s both;
        }

        .animate-slide-up-delay-3 {
          animation: slide-up 0.6s ease-out 0.3s both;
        }

        .animate-slide-up-stagger {
          animation: slide-up 0.6s ease-out both;
        }
      `}</style>
    </div>
  );
}
