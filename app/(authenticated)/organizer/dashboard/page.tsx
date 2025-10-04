"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { secureStorage } from "@/app/utils/encryption";

// Configure axios base URL
axios.defaults.baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://noreen-events.online/noreen-events";
import { protectRoute } from "@/app/utils/routeProtection";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  CheckCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Heart,
  ArrowRight,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";

interface DashboardMetrics {
  totalEvents: number;
  totalRevenue: number;
  totalClients: number;
  completedEvents: number;
  monthlyGrowth: {
    events: number;
    revenue: number;
    clients: number;
    completed: number;
  };
}

interface UpcomingEvent {
  id: number;
  title: string;
  date: string;
  venue: string;
  client: string;
  budget: number;
  status: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  status: string;
  event_type_id?: number;
  event_type_name?: string;
}

interface CalendarConflictData {
  [date: string]: {
    hasWedding: boolean;
    hasOtherEvents: boolean;
    eventCount: number;
    events: Array<{
      event_type_id: number;
      event_type_name: string;
      count: number;
    }>;
  };
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) return `₱${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `₱${(amount / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

function EnhancedCalendar({ events }: { events: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarConflictData] = useState<CalendarConflictData>({});

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getStartingDay = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (day: number) => {
    const dateString = format(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      "yyyy-MM-dd"
    );
    return events.filter((event) => event.date === dateString);
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const daysInMonth = getDaysInMonth(currentDate);
  const startingDay = getStartingDay(currentDate);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getHeatMapColor = (eventCount: number, hasWedding: boolean) => {
    if (hasWedding) return "bg-red-500 text-white";
    if (eventCount === 0) return "bg-white text-gray-900 hover:bg-gray-50";
    if (eventCount === 1) return "bg-yellow-200 text-gray-900";
    if (eventCount === 2) return "bg-orange-300 text-gray-900";
    if (eventCount >= 3) return "bg-red-300 text-gray-900";
    return "bg-gray-50 text-gray-900";
  };

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Event Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-2">
            Event Heat Map:
          </h4>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-white border rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-200 border rounded"></div>
              <span>1 Event</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-300 border rounded"></div>
              <span>2 Events</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-300 border rounded"></div>
              <span>3+ Events</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 border rounded relative">
                <Heart className="h-2 w-2 text-white fill-white absolute inset-0 m-auto" />
              </div>
              <span>Wedding</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs">
          {dayNames.map((day) => (
            <div
              key={day}
              className="p-2 text-center font-medium text-gray-500 text-xs"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: startingDay }, (_, i) => (
            <div key={`empty-${i}`} className="p-2"></div>
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateString = format(
              new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
              "yyyy-MM-dd"
            );
            const dayData = calendarConflictData[dateString];
            const dayEvents = getEventsForDate(day);
            const isToday = isSameDay(
              new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
              new Date()
            );

            const eventCount = dayData?.eventCount || dayEvents.length;
            const hasWedding = dayData?.hasWedding || false;
            const heatMapColor = getHeatMapColor(eventCount, hasWedding);

            return (
              <div
                key={day}
                className={`p-2 text-center border border-gray-100 min-h-[60px] relative transition-all duration-200 ${
                  isToday ? "ring-2 ring-[#028A75] ring-offset-1" : ""
                }`}
              >
                <span
                  className={`text-sm font-medium ${isToday ? "text-[#028A75]" : "text-gray-700"}`}
                >
                  {day}
                </span>

                {eventCount > 0 && (
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((event, index) => (
                      <div
                        key={index}
                        className={`w-full h-1.5 rounded-full mx-auto ${
                          event.status === "confirmed"
                            ? "bg-green-500"
                            : event.status === "planning"
                              ? "bg-yellow-500"
                              : event.status === "ongoing"
                                ? "bg-blue-500"
                                : event.status === "done"
                                  ? "bg-purple-500"
                                  : event.status === "cancelled"
                                    ? "bg-red-500"
                                    : "bg-gray-400"
                        }`}
                        title={`${event.title} - ${event.status}`}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                )}

                {eventCount > 1 && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <div className="text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-sm border border-white bg-[#028A75] text-white">
                      {eventCount}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrganizerDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [userFirstName, setUserFirstName] = useState("");
  const [organizerId, setOrganizerId] = useState<number | null>(null);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalEvents: 0,
    totalRevenue: 0,
    totalClients: 0,
    completedEvents: 0,
    monthlyGrowth: { events: 0, revenue: 0, clients: 0, completed: 0 },
  });

  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    try {
      protectRoute();
      const userData = secureStorage.getItem("user");
      if (
        !userData ||
        (userData.user_role || "").toLowerCase() !== "organizer"
      ) {
        router.push("/auth/login");
        return;
      }
      setUserFirstName(userData.first_name || "");
      // Resolve organizer_id from profile first
      (async () => {
        try {
          const resp = await axios.post("/organizer.php", {
            operation: "getOrganizerProfile",
            user_id: userData.user_id,
          });
          const oid =
            resp.data?.status === "success"
              ? resp.data?.data?.organizer_id || userData.user_id
              : userData.user_id;
          setOrganizerId(oid);
          await fetchAndPopulateDashboard(oid);
        } catch {
          setOrganizerId(userData.user_id);
          await fetchAndPopulateDashboard(userData.user_id);
        }
      })();
    } catch (_e) {
      router.push("/auth/login");
      return;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    (async () => {
      try {
        if (organizerId) {
          await fetchAndPopulateDashboard(organizerId);
          toast({
            title: "Refreshed",
            description: "Dashboard is up to date.",
          });
        }
      } finally {
        setIsRefreshing(false);
      }
    })();
  };

  const fetchAndPopulateDashboard = async (oid: number) => {
    try {
      const res = await axios.post("/organizer.php", {
        operation: "getOrganizerEvents",
        organizer_id: oid,
      });
      if (res.data?.status !== "success") return;
      const data = Array.isArray(res.data.data) ? res.data.data : [];
      // Upcoming: next 5 future events
      const today = new Date();
      const upcoming = data
        .filter(
          (e: any) => new Date(e.event_date) >= new Date(today.toDateString())
        )
        .sort(
          (a: any, b: any) =>
            new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        )
        .slice(0, 5)
        .map((e: any) => ({
          id: e.event_id,
          title: e.event_title,
          date: e.event_date,
          venue: e.venue_title || "TBD",
          client: e.client_name || "Client",
          budget: Number(e.total_budget || 0),
          status: e.event_status,
        }));
      setUpcomingEvents(upcoming);

      const cal = data.map((e: any) => ({
        id: e.event_id,
        title: e.event_title,
        date: e.event_date,
        status: e.event_status,
        event_type_id: e.event_type_id,
        event_type_name: e.event_type_name,
      }));
      setCalendarEvents(cal);

      // Basic metrics derived locally
      const totalEvents = data.length;
      const totalClients = new Set(
        data.map(
          (e: any) => e.client_name || e.client_email || e.client_contact
        )
      ).size;
      const completedEvents = data.filter(
        (e: any) => e.event_status === "done"
      ).length;
      const totalRevenue = data.reduce(
        (sum: number, e: any) => sum + Number(e.total_budget || 0),
        0
      );
      setMetrics((prev) => ({
        ...prev,
        totalEvents,
        totalRevenue,
        totalClients,
        completedEvents,
      }));
    } catch {
      // no-op for dashboard
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin text-[#028A75] mx-auto mb-4 border-4 border-[#028A75] border-t-transparent rounded-full" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {userFirstName || "Organizer"}!
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {currentDateTime.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  {currentDateTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 border border-gray-200 shadow-sm"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={() => router.push("/organizer/events")}
              className="flex items-center gap-2 px-6 py-2 bg-[#028A75] text-white rounded-lg hover:bg-[#027a65] transition-colors shadow-sm"
            >
              View My Events
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Events
                  </p>
                  <h3 className="text-3xl font-bold mt-2 text-gray-900">
                    {formatNumber(metrics.totalEvents)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Assigned to you</p>
                </div>
                <div className="p-3 bg-[#028A75]/10 rounded-lg">
                  <CalendarIcon className="h-6 w-6 text-[#028A75]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Revenue</p>
                  <h3 className="text-3xl font-bold mt-2 text-gray-900">
                    {formatCurrency(metrics.totalRevenue)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">This month</p>
                </div>
                <div className="p-3 bg-[#028A75]/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-[#028A75]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Clients</p>
                  <h3 className="text-3xl font-bold mt-2 text-gray-900">
                    {formatNumber(metrics.totalClients)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Active</p>
                </div>
                <div className="p-3 bg-[#028A75]/10 rounded-lg">
                  <Users className="h-6 w-6 text-[#028A75]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <h3 className="text-3xl font-bold mt-2 text-gray-900">
                    {formatNumber(metrics.completedEvents)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">All time</p>
                </div>
                <div className="p-3 bg-[#028A75]/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-[#028A75]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <EnhancedCalendar events={calendarEvents} />
          </div>
          <div className="lg:col-span-1">
            <Card className="border-0 bg-white shadow-sm h-full">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Upcoming Events
                  </CardTitle>
                  <button
                    className="flex items-center text-sm text-[#028A75] hover:text-[#027a65] font-medium"
                    onClick={() => router.push("/organizer/events")}
                  >
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  You have {upcomingEvents.length} upcoming events
                </p>
              </CardHeader>
              <CardContent className="p-4">
                {upcomingEvents.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    No upcoming events assigned yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 line-clamp-2">
                            {event.title}
                          </h4>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {event.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">
                          {new Date(event.date).toLocaleDateString()} •{" "}
                          {event.venue}
                        </p>
                        <p className="text-sm text-gray-500 mb-2">
                          Client: {event.client} • Budget:{" "}
                          {formatCurrency(event.budget)}
                        </p>
                        <button
                          className="flex items-center text-sm text-[#028A75] hover:text-[#027a65] font-medium"
                          onClick={() => router.push(`/organizer/events`)}
                        >
                          View Details
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
