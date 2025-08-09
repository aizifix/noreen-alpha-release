"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  CalendarDays,
  List,
} from "lucide-react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

// Enhanced interface to match updated tbl_events structure
interface Event {
  event_id: number;
  original_booking_reference?: string;
  user_id: number;
  admin_id: number;
  organizer_id?: number;
  event_title: string;
  event_theme?: string;
  event_description?: string;
  event_type_id: number;
  guest_count: number;
  event_date: string;
  start_time?: string;
  end_time?: string;
  payment_status: "unpaid" | "partial" | "paid" | "refunded";
  package_id?: number;
  venue_id?: number;
  total_budget: number;
  down_payment: number;
  payment_method?: string;
  payment_schedule_type_id?: number;
  reference_number?: string;
  additional_notes?: string;
  event_status: "draft" | "confirmed" | "on_going" | "done" | "cancelled";
  booking_date?: string;
  booking_time?: string;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
  event_attachments?: any[];
  event_feedback_id?: number;
  event_wedding_form_id?: number;
  is_recurring?: boolean;
  recurrence_rule?: any;
  cancellation_reason?: string;
  finalized_at?: string;
  client_signature?: string;
  // Joined data from related tables
  venue_name?: string;
  venue_location?: string;
  venue_contact?: string;
  venue_capacity?: number;
  venue_price?: number;
  client_name?: string;
  client_first_name?: string;
  client_last_name?: string;
  client_suffix?: string;
  client_email?: string;
  client_contact?: string;
  client_pfp?: string;
  client_birthdate?: string;
  client_joined_date?: string;
  client_username?: string;
  event_type_name?: string;
  event_type_description?: string;
  package_title?: string;
  package_description?: string;
  admin_name?: string;
  organizer_name?: string;
  created_by_name?: string;
  updated_by_name?: string;
  payment_schedule_name?: string;
  payment_schedule_description?: string;
  installment_count?: number;
  wedding_details?: any;
  feedback?: any;
  components?: any[];
  timeline?: any[];
  payment_schedule?: any[];
  payments?: any[];
}

export default function EventsPage() {
  const router = useRouter();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<number>(0);

  useEffect(() => {
    try {
      // Protect route from unauthorized access and back navigation
      protectRoute();
      const userData = secureStorage.getItem("user");
      if (
        !userData ||
        !userData.user_role ||
        !["admin", "superadmin"].includes(userData.user_role.toLowerCase())
      ) {
        router.push("/auth/login");
        return;
      }
      setUserRole(userData.user_role);
      setUserId(userData.user_id);
      fetchEvents();
    } catch (error) {
      router.push("/auth/login");
    }
  }, [router]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const userData = secureStorage.getItem("user");

      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "getEvents",
          admin_id: userData.user_id,
        }
      );

      if (response.data.status === "success") {
        setEvents(response.data.events || []);
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to fetch events",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (eventId: number) => {
    console.log("🎯 Navigating to event details for event:", eventId);
    router.push(`/admin/events/${eventId}`);
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    // Format date as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;
    return events.filter((event) => event.event_date === dateString);
  };

  // Get events for the selected month
  const getEventsForMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return events.filter((event) => {
      // Parse the date string directly to avoid timezone issues
      const eventDateParts = event.event_date.split("-");
      const eventYear = parseInt(eventDateParts[0]);
      const eventMonth = parseInt(eventDateParts[1]) - 1; // Month is 0-indexed
      return eventYear === year && eventMonth === month;
    });
  };

  // Calendar navigation
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      // confirmed = green
      case "confirmed":
        return {
          border: "border-green-600",
          bg: "bg-green-100",
          text: "text-green-700",
        };
      // draft = yellow
      case "draft":
        return {
          border: "border-yellow-500",
          bg: "bg-yellow-100",
          text: "text-yellow-700",
        };
      // on going = blue
      case "on_going":
        return {
          border: "border-blue-500",
          bg: "bg-blue-100",
          text: "text-blue-700",
        };
      // done = purple
      case "done":
        return {
          border: "border-purple-500",
          bg: "bg-purple-100",
          text: "text-purple-700",
        };
      // cancelled = red
      case "cancelled":
        return {
          border: "border-red-500",
          bg: "bg-red-100",
          text: "text-red-700",
        };
      // conflict = orange (explicit status if used)
      case "conflict":
        return {
          border: "border-orange-500",
          bg: "bg-orange-100",
          text: "text-orange-700",
        };
      default:
        return {
          border: "border-gray-400",
          bg: "bg-gray-50",
          text: "text-gray-700",
        };
    }
  };

  // Calendar Component
  const EventCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Get previous month's last few days
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();

    const monthEvents = getEventsForMonth(currentDate);

    // Create calendar grid
    const calendarDays = [];

    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      calendarDays.push(
        <div
          key={`prev-${day}`}
          className="min-h-[120px] p-2 text-gray-400 bg-gray-50 border border-gray-100"
        >
          <div className="text-sm">{day}</div>
        </div>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected =
        selectedDate && date.toDateString() === selectedDate.toDateString();

      // Display events with their actual status colors per legend; no auto overrides

      calendarDays.push(
        <div
          key={day}
          className={`min-h-[120px] p-2 border cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
            isToday ? "bg-blue-50 border-blue-200" : "border-gray-200"
          } ${isSelected ? "ring-2 ring-[#028A75]" : ""}`}
          onClick={() => setSelectedDate(date)}
        >
          <div
            className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-900"}`}
          >
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event, index) => {
              const colors = getStatusColor(event.event_status);
              return (
                <div
                  key={event.event_id}
                  className={`text-xs p-1 rounded truncate ${colors.bg} ${colors.text} cursor-pointer hover:opacity-80 transition-opacity duration-200`}
                  title={`${event.event_title} - ${event.client_name || "Unknown Client"}${event.start_time && event.end_time ? ` (${format(new Date(`2000-01-01T${event.start_time}`), "h:mm a")} - ${format(new Date(`2000-01-01T${event.end_time}`), "h:mm a")})` : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to event details
                    router.push(`/admin/events/${event.event_id}`);
                  }}
                >
                  <div className="font-medium">{event.event_title}</div>
                  {event.start_time && event.end_time && (
                    <div className="text-xs opacity-75 mt-0.5">
                      {format(
                        new Date(`2000-01-01T${event.start_time}`),
                        "h:mm a"
                      )}{" "}
                      -{" "}
                      {format(
                        new Date(`2000-01-01T${event.end_time}`),
                        "h:mm a"
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    // Next month days to fill the grid
    const remainingDays = 42 - calendarDays.length;
    for (let day = 1; day <= remainingDays; day++) {
      calendarDays.push(
        <div
          key={`next-${day}`}
          className="min-h-[120px] p-2 text-gray-400 bg-gray-50 border border-gray-100"
        >
          <div className="text-sm">{day}</div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 animate-in slide-in-from-bottom-4 duration-500">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm bg-[#028A75] text-white rounded-lg hover:bg-[#027a65] transition-colors duration-200"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth("next")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-4 text-sm font-medium text-gray-600 text-center border-r border-gray-200 last:border-r-0 bg-gray-50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">{calendarDays}</div>
      </div>
    );
  };

  // Event details sidebar for selected date
  const EventDetailsSidebar = () => {
    if (!selectedDate) return null;

    const dayEvents = getEventsForDate(selectedDate);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-in slide-in-from-right-4 duration-500">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Events for{" "}
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>

        {dayEvents.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No events scheduled for this date.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayEvents.map((event, index) => {
              const colors = getStatusColor(event.event_status);
              const paymentColors = getPaymentStatusColor(event.payment_status);

              const getClientInitials = (name: string) => {
                return name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();
              };

              const getProfileImageUrl = (pfpPath?: string) => {
                if (!pfpPath) return undefined;
                if (pfpPath.startsWith("http")) {
                  return pfpPath;
                }
                // Use the image serving script for proper image delivery
                return `http://localhost/events-api/serve-image.php?path=${encodeURIComponent(pfpPath)}`;
              };

              return (
                <div
                  key={event.event_id}
                  className={`p-4 rounded-lg border-l-4 ${colors.border} ${colors.bg} cursor-pointer hover:opacity-80 transition-all duration-200 animate-in slide-in-from-right-4 delay-${index * 100}`}
                  onClick={() => router.push(`/admin/events/${event.event_id}`)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Client Profile Picture */}
                    <div className="relative flex-shrink-0">
                      {event.client_pfp &&
                      getProfileImageUrl(event.client_pfp) ? (
                        <img
                          src={getProfileImageUrl(event.client_pfp)}
                          alt={`${event.client_name}'s profile`}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove(
                              "hidden"
                            );
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-10 h-10 bg-gradient-to-br from-[#028A75] to-[#027a65] rounded-full flex items-center justify-center ${event.client_pfp ? "hidden" : ""}`}
                      >
                        <span className="text-white font-medium text-sm">
                          {getClientInitials(event.client_name || "C")}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900 truncate">
                        {event.event_title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        Client: {event.client_name || "Unknown"}
                      </p>
                      {event.start_time && event.end_time && (
                        <p className="text-xs text-gray-600">
                          {format(
                            new Date(`2000-01-01T${event.start_time}`),
                            "h:mm a"
                          )}{" "}
                          -{" "}
                          {format(
                            new Date(`2000-01-01T${event.end_time}`),
                            "h:mm a"
                          )}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-xs text-gray-600">
                          <span>Guests: {event.guest_count}</span>
                          <span className="mx-1">•</span>
                          <span>₱{event.total_budget?.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                        >
                          {event.event_status}
                        </span>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${paymentColors.bg} ${paymentColors.text}`}
                        >
                          {event.payment_status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Helper function for payment status colors
  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
        };
      case "partial":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
        };
      case "unpaid":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
        };
      case "refunded":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#028A75] mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
          <p className="text-gray-600">Manage and organize all your events</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle Buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                view === "calendar"
                  ? "bg-white text-[#028A75] shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                view === "list"
                  ? "bg-white text-[#028A75] shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>

          <button
            className="flex items-center gap-2 px-6 py-2 bg-[#028A75] text-white rounded-lg hover:bg-[#027a65] transition-colors duration-200 font-medium"
            onClick={() => router.push("/admin/event-builder")}
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 animate-in slide-in-from-bottom-4 duration-500 delay-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75] transition-colors duration-200"
              placeholder="Search events by title, client, or venue..."
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75] transition-colors duration-200">
              <option value="">All Event Types</option>
              <option value="1">Wedding</option>
              <option value="2">Anniversary</option>
              <option value="3">Birthday</option>
              <option value="4">Corporate Event</option>
              <option value="5">Others</option>
              <option value="10">Baptism</option>
              <option value="11">Baby Shower</option>
              <option value="12">Reunion</option>
              <option value="13">Festival</option>
              <option value="14">Engagement Party</option>
              <option value="15">Christmas Party</option>
              <option value="16">New Year's Party</option>
            </select>

            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75] transition-colors duration-200">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="on_going">On Going</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75] transition-colors duration-200">
              <option value="">All Payment Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {view === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <EventCalendar />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <EventDetailsSidebar />

            {/* Calendar Legend */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 animate-in slide-in-from-right-4 duration-500 delay-200">
              <h4 className="font-semibold text-gray-900 mb-4">
                Status Legend
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-100 border-l-4 border-green-500 rounded-sm"></div>
                  <span className="text-gray-700">Confirmed</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-500 rounded-sm"></div>
                  <span className="text-gray-700">Planning/Draft</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-500 rounded-sm"></div>
                  <span className="text-gray-700">On Going</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-purple-100 border-l-4 border-purple-500 rounded-sm"></div>
                  <span className="text-gray-700">Done</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-100 border-l-4 border-red-500 rounded-sm"></div>
                  <span className="text-gray-700">Cancelled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => {
            const colors = getStatusColor(event.event_status);
            const paymentColors = getPaymentStatusColor(event.payment_status);
            return (
              <div
                key={event.event_id}
                className={`rounded-lg border border-gray-200 bg-white p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 cursor-pointer animate-in slide-in-from-bottom-4  delay-${index * 50}`}
                onClick={() => {
                  console.log(
                    "🃏 Event card clicked, navigating to:",
                    `/admin/events/${event.event_id}`
                  );
                  router.push(`/admin/events/${event.event_id}`);
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-lg text-gray-900 truncate">
                      {event.event_title}
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
                    >
                      {event.event_status}
                    </span>
                  </div>

                  {event.event_theme && (
                    <div className="text-sm text-gray-500 mb-3 italic">
                      Theme: {event.event_theme}
                    </div>
                  )}

                  <div className="text-sm text-gray-600 mb-2">
                    {new Date(event.event_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>

                  {event.start_time && event.end_time && (
                    <div className="text-sm text-gray-600 mb-4">
                      {format(
                        new Date(`2000-01-01T${event.start_time}`),
                        "h:mm a"
                      )}{" "}
                      -{" "}
                      {format(
                        new Date(`2000-01-01T${event.end_time}`),
                        "h:mm a"
                      )}
                    </div>
                  )}

                  {/* Client Information Section */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      {/* Client Profile Picture */}
                      <div className="relative flex-shrink-0">
                        {event.client_pfp &&
                          (() => {
                            const pfpPath = event.client_pfp;
                            const imageUrl =
                              pfpPath && pfpPath.startsWith("http")
                                ? pfpPath
                                : pfpPath
                                  ? `http://localhost/events-api/serve-image.php?path=${encodeURIComponent(pfpPath)}`
                                  : undefined;
                            return (
                              <img
                                src={imageUrl}
                                alt={`${event.client_name}'s profile`}
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.nextElementSibling?.classList.remove(
                                    "hidden"
                                  );
                                }}
                              />
                            );
                          })()}
                        <div
                          className={`w-12 h-12 bg-gradient-to-br from-[#028A75] to-[#027a65] rounded-full flex items-center justify-center ${event.client_pfp ? "hidden" : ""}`}
                        >
                          <span className="text-white font-medium text-sm">
                            {event.client_name
                              ? event.client_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                              : "C"}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900">
                          {event.client_name || "Unknown Client"}
                        </div>
                        {event.client_email && (
                          <div className="text-xs text-gray-600 truncate">
                            {event.client_email}
                          </div>
                        )}
                        {event.client_contact && (
                          <div className="text-xs text-gray-600">
                            {event.client_contact}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm mb-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Venue:</span>
                      <span className="text-gray-600">
                        {event.venue_name || "TBD"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Type:</span>
                      <span className="text-gray-600">
                        {event.event_type_name || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        Package:
                      </span>
                      <span className="text-gray-600">
                        {event.package_title || "Custom"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Guests:</span>
                      <span className="text-gray-600">{event.guest_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Budget:</span>
                      <span className="text-gray-600">
                        ₱{event.total_budget?.toLocaleString() || "0"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        Down Payment:
                      </span>
                      <span className="text-gray-600">
                        ₱{event.down_payment?.toLocaleString() || "0"}
                      </span>
                    </div>
                    {event.original_booking_reference && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">
                          Booking Ref:
                        </span>
                        <span className="text-gray-600">
                          {event.original_booking_reference}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Payment Status */}
                  <div className="mb-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${paymentColors.bg} ${paymentColors.text}`}
                    >
                      Payment: {event.payment_status}
                    </span>
                    {event.payment_method && (
                      <span className="ml-2 text-xs text-gray-500">
                        via {event.payment_method}
                      </span>
                    )}
                  </div>

                  {event.additional_notes && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg mb-4">
                      <span className="font-semibold">Notes:</span>{" "}
                      {event.additional_notes}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <button
                    className="flex items-center gap-1 px-3 py-1 rounded border border-gray-300 bg-gray-50 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/events/${event.event_id}/timeline`);
                    }}
                  >
                    <span>⏱️</span> Timeline
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1 rounded border border-blue-300 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/payments?event_id=${event.event_id}`);
                    }}
                  >
                    <span>💳</span> Payments
                  </button>
                  <button
                    className="px-4 py-1 rounded bg-[#028A75] text-white text-sm font-semibold hover:bg-[#027a65] transition-colors duration-200"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleViewDetails(event.event_id);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <div className="col-span-full text-center py-16 animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-gray-400 mb-6">
                <CalendarDays className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">
                No events found
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Get started by creating your first event. You can organize
                weddings, birthdays, corporate events, and more.
              </p>
              <button
                className="px-6 py-3 rounded-lg bg-[#028A75] text-white font-semibold hover:bg-[#027a65] transition-colors duration-200 flex items-center gap-2 mx-auto"
                onClick={() => router.push("/admin/event-builder")}
              >
                <Plus className="h-4 w-4" />
                Create Event
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
