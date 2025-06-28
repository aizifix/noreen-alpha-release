"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";

// Interface for event data
interface Event {
  event_id: number;
  event_title: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  user_id: number;
  admin_id: number;
  guest_count: number;
  event_status: string;
  total_budget: number;
  venue_name?: string;
  client_name?: string;
  event_type_name?: string;
  organizer_name?: string;
}

export default function ClientEventsPage() {
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
        userData.user_role.toLowerCase() !== "client"
      ) {
        router.push("/auth/login");
        return;
      }
      setUserRole(userData.user_role);
      setUserId(userData.user_id);
      fetchClientEvents();
    } catch (error) {
      router.push("/auth/login");
    }
  }, [router]);

  const fetchClientEvents = async () => {
    try {
      setIsLoading(true);
      const userData = secureStorage.getItem("user");

      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "getClientEvents",
          user_id: userData.user_id,
        }
      );

      if (response.data.status === "success") {
        setEvents(response.data.events || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch your events",
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
                  title={`${event.event_title} - ${event.organizer_name || "Assigned Organizer"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to event details (client view)
                    router.push(`/client/events/${event.event_id}`);
                  }}
                >
                  {event.event_title}
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
          My Events for{" "}
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
                  onClick={() =>
                    router.push(`/client/events/${event.event_id}`)
                  }
                >
                  <h4 className="font-medium text-sm">{event.event_title}</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Organizer: {event.organizer_name || "To be assigned"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Guests: {event.guest_count}
                  </p>
                  <p className="text-xs text-gray-600">
                    Budget: ₱{event.total_budget?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">
                    Venue: {event.venue_name || "TBD"}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Events</h1>
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
            onClick={() => router.push("/client/events/new")}
          >
            <Plus className="h-4 w-4" />
            Book New Event
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            className="border rounded px-10 py-2 w-full"
            placeholder="Search my events..."
          />
        </div>
        <select className="border rounded px-3 py-2">
          <option>All Types</option>
          <option>Wedding</option>
          <option>Corporate</option>
          <option>Birthday</option>
          <option>Social</option>
        </select>
        <select className="border rounded px-3 py-2">
          <option>All Statuses</option>
          <option>Draft</option>
          <option>Confirmed</option>
          <option>In Progress</option>
          <option>Completed</option>
          <option>Cancelled</option>
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

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-4 mt-4">
              <h4 className="font-semibold mb-3">Quick Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Events:</span>
                  <span className="font-medium">{events.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Upcoming:</span>
                  <span className="font-medium">
                    {
                      events.filter(
                        (e) =>
                          new Date(e.event_date) > new Date() &&
                          e.event_status !== "cancelled"
                      ).length
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="font-medium">
                    {
                      events.filter((e) => e.event_status === "completed")
                        .length
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const colors = getStatusColor(event.event_status);
            const isUpcoming = new Date(event.event_date) > new Date();
            return (
              <div
                key={event.event_id}
                className={`rounded-lg shadow border-t-4 ${colors.border} bg-white p-6 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer`}
                onClick={() => router.push(`/client/events/${event.event_id}`)}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-bold text-lg">{event.event_title}</h2>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
                    >
                      {event.event_status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    {new Date(event.event_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {isUpcoming && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Upcoming
                      </span>
                    )}
                  </div>
                  <div className="text-sm mb-2 space-y-1">
                    <div>
                      <span className="font-semibold">Organizer:</span>{" "}
                      {event.organizer_name || "To be assigned"}
                    </div>
                    <div>
                      <span className="font-semibold">Venue:</span>{" "}
                      {event.venue_name || "TBD"}
                    </div>
                    <div>
                      <span className="font-semibold">Budget:</span> ₱
                      {event.total_budget?.toLocaleString() || "0"}
                    </div>
                    <div>
                      <span className="font-semibold">Guests:</span>{" "}
                      {event.guest_count}
                    </div>
                    <div>
                      <span className="font-semibold">Type:</span>{" "}
                      {event.event_type_name || "Unknown"}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <button
                    className="flex items-center gap-1 px-4 py-2 rounded border border-gray-300 bg-gray-50 text-gray-700 font-medium hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to timeline
                      router.push(`/client/events/${event.event_id}/timeline`);
                    }}
                  >
                    <span>⏱️</span> Timeline
                  </button>
                  <button className="px-4 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700">
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
                Get started by booking your first event.
              </p>
              <button
                className="px-4 py-2 rounded bg-green-500 text-white font-semibold hover:bg-green-600 flex items-center gap-2 mx-auto"
                onClick={() => router.push("/client/events/new")}
              >
                <Plus className="h-4 w-4" />
                Book New Event
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
