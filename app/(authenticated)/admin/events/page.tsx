"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

// Updated interface to match tbl_events structure
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
  payment_status: "pending" | "partial" | "paid" | "overdue" | "cancelled";
  package_id?: number;
  venue_id?: number;
  total_budget: number;
  down_payment: number;
  payment_method?: string;
  payment_schedule_type_id?: number;
  reference_number?: string;
  additional_notes?: string;
  event_status:
    | "draft"
    | "confirmed"
    | "in-progress"
    | "completed"
    | "cancelled";
  booking_date?: string;
  booking_time?: string;
  created_by?: number;
  // Joined data from related tables
  venue_name?: string;
  venue_location?: string;
  client_name?: string;
  client_email?: string;
  event_type_name?: string;
  package_title?: string;
  admin_name?: string;
  organizer_name?: string;
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
      case "confirmed":
        return {
          border: "border-green-500",
          bg: "bg-green-100",
          text: "text-green-700",
        };
      case "draft":
      case "planning":
        return {
          border: "border-yellow-500",
          bg: "bg-yellow-100",
          text: "text-yellow-700",
        };
      case "in-progress":
        return {
          border: "border-blue-500",
          bg: "bg-blue-100",
          text: "text-blue-700",
        };
      case "completed":
        return {
          border: "border-purple-500",
          bg: "bg-purple-100",
          text: "text-purple-700",
        };
      case "cancelled":
        return {
          border: "border-red-500",
          bg: "bg-red-100",
          text: "text-red-700",
        };
      default:
        return {
          border: "border-gray-500",
          bg: "bg-gray-100",
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
          className="min-h-[120px] p-2 text-gray-400 bg-gray-50"
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

      calendarDays.push(
        <div
          key={day}
          className={`min-h-[120px] p-2 border cursor-pointer hover:bg-gray-50 ${
            isToday ? "bg-blue-50 border-blue-200" : "border-gray-200"
          } ${isSelected ? "ring-2 ring-green-500" : ""}`}
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
                  className={`text-xs p-1 rounded truncate ${colors.bg} ${colors.text} cursor-pointer hover:opacity-80`}
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
          className="min-h-[120px] p-2 text-gray-400 bg-gray-50"
        >
          <div className="text-sm">{day}</div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {currentDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth("next")}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-3 text-sm font-medium text-gray-500 text-center border-r last:border-r-0"
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
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">
          Events for{" "}
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>

        {dayEvents.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No events scheduled for this date.
          </p>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((event) => {
              const colors = getStatusColor(event.event_status);
              return (
                <div
                  key={event.event_id}
                  className={`p-3 rounded-lg border-l-4 ${colors.border} ${colors.bg} cursor-pointer hover:opacity-80`}
                  onClick={() => router.push(`/admin/events/${event.event_id}`)}
                >
                  <h4 className="font-medium text-sm">{event.event_title}</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Client: {event.client_name || "Unknown"}
                  </p>
                  {event.start_time && event.end_time && (
                    <p className="text-xs text-gray-600">
                      Time:{" "}
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
                  <p className="text-xs text-gray-600">
                    Guests: {event.guest_count}
                  </p>
                  <p className="text-xs text-gray-600">
                    Budget: ₱{event.total_budget?.toLocaleString()}
                  </p>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${colors.bg} ${colors.text}`}
                  >
                    {event.event_status}
                  </span>
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
      case "pending":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
        };
      case "overdue":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
        };
      case "cancelled":
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Event Management</h1>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded font-semibold border ${view === "calendar" ? "bg-green-600 text-white border-green-600" : "bg-white text-green-700 border-green-600"}`}
            onClick={() => setView("calendar")}
          >
            Calendar
          </button>
          <button
            className={`px-4 py-2 rounded font-semibold border ${view === "list" ? "bg-green-600 text-white border-green-600" : "bg-white text-green-700 border-green-600"}`}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button
            className="ml-2 px-4 py-2 rounded bg-green-500 text-white font-semibold hover:bg-green-600 flex items-center gap-2"
            onClick={() => router.push("/admin/event-builder")}
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            className="border rounded px-10 py-2 w-full"
            placeholder="Search events..."
          />
        </div>
        <select className="border rounded px-3 py-2">
          <option value="">All Types</option>
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
        <select className="border rounded px-3 py-2">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="border rounded px-3 py-2">
          <option value="">All Payment Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {view === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <EventCalendar />
          </div>
          <div className="lg:col-span-1">
            <EventDetailsSidebar />

            {/* Calendar legend */}
            <div className="bg-white rounded-lg shadow p-4 mt-4">
              <h4 className="font-semibold mb-3">Status Legend</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 border-l-4 border-green-500"></div>
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-100 border-l-4 border-yellow-500"></div>
                  <span>Planning/Draft</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-100 border-l-4 border-blue-500"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-100 border-l-4 border-purple-500"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-100 border-l-4 border-red-500"></div>
                  <span>Cancelled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const colors = getStatusColor(event.event_status);
            const paymentColors = getPaymentStatusColor(event.payment_status);
            return (
              <div
                key={event.event_id}
                className={`rounded-lg shadow border-t-4 ${colors.border} bg-white p-6 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer`}
                onClick={() => router.push(`/admin/events/${event.event_id}`)}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-bold text-lg truncate">
                      {event.event_title}
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
                    >
                      {event.event_status}
                    </span>
                  </div>

                  {event.event_theme && (
                    <div className="text-sm text-gray-500 mb-1 italic">
                      Theme: {event.event_theme}
                    </div>
                  )}

                  <div className="text-sm text-gray-600 mb-1">
                    {new Date(event.event_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>

                  {event.start_time && event.end_time && (
                    <div className="text-sm text-gray-600 mb-2">
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

                  <div className="text-sm mb-2 space-y-1">
                    <div>
                      <span className="font-semibold">Client:</span>{" "}
                      {event.client_name || "Unknown Client"}
                    </div>
                    <div>
                      <span className="font-semibold">Venue:</span>{" "}
                      {event.venue_name || "TBD"}
                    </div>
                    <div>
                      <span className="font-semibold">Type:</span>{" "}
                      {event.event_type_name || "Unknown"}
                    </div>
                    <div>
                      <span className="font-semibold">Package:</span>{" "}
                      {event.package_title || "Custom"}
                    </div>
                    <div>
                      <span className="font-semibold">Guests:</span>{" "}
                      {event.guest_count}
                    </div>
                    <div>
                      <span className="font-semibold">Budget:</span> ₱
                      {event.total_budget?.toLocaleString() || "0"}
                    </div>
                    <div>
                      <span className="font-semibold">Down Payment:</span> ₱
                      {event.down_payment?.toLocaleString() || "0"}
                    </div>
                    {event.original_booking_reference && (
                      <div>
                        <span className="font-semibold">Booking Ref:</span>{" "}
                        {event.original_booking_reference}
                      </div>
                    )}
                  </div>

                  {/* Payment Status */}
                  <div className="mb-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${paymentColors.bg} ${paymentColors.text}`}
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
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2">
                      <span className="font-semibold">Notes:</span>{" "}
                      {event.additional_notes}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button
                    className="flex items-center gap-1 px-3 py-1 rounded border border-gray-300 bg-gray-50 text-gray-700 text-sm font-medium hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/events/${event.event_id}/timeline`);
                    }}
                  >
                    <span>⏱️</span> Timeline
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1 rounded border border-blue-300 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/payments?event_id=${event.event_id}`);
                    }}
                  >
                    <span>💳</span> Payments
                  </button>
                  <button className="px-3 py-1 rounded bg-green-600 text-white text-sm font-semibold hover:bg-green-700">
                    View Details
                  </button>
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 mb-4">
                <Calendar className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No events found
              </h3>
              <p className="text-gray-500 mb-4">
                Get started by creating your first event.
              </p>
              <button
                className="px-4 py-2 rounded bg-green-500 text-white font-semibold hover:bg-green-600 flex items-center gap-2 mx-auto"
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
