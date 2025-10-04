"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { secureStorage } from "@/app/utils/encryption";

// Configure axios base URL
axios.defaults.baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://noreen-events.online/noreen-events";
import {
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  Eye,
  ArrowRight,
  Loader2,
  Plus,
  RefreshCw,
  Clock,
  TrendingUp,
  BarChart3,
  FileText,
  Settings,
  Heart,
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Package,
  MapPin,
  UserCheck,
  Truck,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";

// Types for our dashboard data
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

interface RecentPayment {
  id: number;
  event: string;
  date: string;
  amount: number;
  type: string;
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

// Mock data for the revenue chart (will be moved to analytics)
const revenueData = [
  { month: "Jan", revenue: 45000 },
  { month: "Feb", revenue: 52000 },
  { month: "Mar", revenue: 48000 },
  { month: "Apr", revenue: 61000 },
  { month: "May", revenue: 55000 },
  { month: "Jun", revenue: 67000 },
  { month: "Jul", revenue: 72000 },
  { month: "Aug", revenue: 68000 },
  { month: "Sep", revenue: 75000 },
  { month: "Oct", revenue: 82000 },
  { month: "Nov", revenue: 78000 },
  { month: "Dec", revenue: 85000 },
];

// Helper function to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

// Helper function to format currency with M/K notation
const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `₱${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `₱${(amount / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

// Enhanced Calendar Component with Event Builder Style
function EnhancedCalendar({ events }: { events: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarConflictData, setCalendarConflictData] =
    useState<CalendarConflictData>({});

  // Load calendar conflict data
  const loadCalendarConflictData = async (date: Date = currentDate) => {
    try {
      const startDate = format(startOfMonth(date), "yyyy-MM-dd");
      const endDate = format(endOfMonth(date), "yyyy-MM-dd");

      const userData = secureStorage.getItem("user");
      const response = await axios.get("/admin.php", {
        params: {
          operation: "getCalendarConflictData",
          admin_id: userData?.user_id,
          start_date: startDate,
          end_date: endDate,
        },
      });

      if (response.data.status === "success") {
        setCalendarConflictData(response.data.calendarData || {});
      }
    } catch (error) {
      console.error("Error loading calendar data:", error);
      // Generate sample data for demonstration
      generateSampleCalendarData(date);
    }
  };

  // Generate sample calendar data for demonstration
  const generateSampleCalendarData = (date: Date) => {
    const sampleData: CalendarConflictData = {};
    const daysInMonth = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    ).getDate();

    // Sample data for current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = format(
        new Date(date.getFullYear(), date.getMonth(), day),
        "yyyy-MM-dd"
      );

      // Random event distribution
      const hasEvent = Math.random() > 0.7;
      if (hasEvent) {
        const eventCount = Math.floor(Math.random() * 3) + 1;
        const hasWedding = Math.random() > 0.8;

        sampleData[dateString] = {
          hasWedding,
          hasOtherEvents: !hasWedding,
          eventCount,
          events: hasWedding
            ? [{ event_type_id: 1, event_type_name: "Wedding", count: 1 }]
            : [
                {
                  event_type_id: 2,
                  event_type_name: "Other",
                  count: eventCount,
                },
              ],
        };
      }
    }

    setCalendarConflictData(sampleData);
  };

  useEffect(() => {
    loadCalendarConflictData(currentDate);
  }, [currentDate]);

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

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const startingDay = getStartingDay(currentDate);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get heat map color based on event count (same as event builder)
  const getHeatMapColor = (eventCount: number, hasWedding: boolean) => {
    if (hasWedding) {
      return "bg-red-500 text-white"; // Wedding - always red and blocked
    }

    if (eventCount === 0) {
      return "bg-white text-gray-900 hover:bg-gray-50"; // No events
    } else if (eventCount === 1) {
      return "bg-yellow-200 text-gray-900"; // One event - light yellow
    } else if (eventCount === 2) {
      return "bg-orange-300 text-gray-900"; // Two events - orange
    } else if (eventCount >= 3) {
      return "bg-red-300 text-gray-900"; // Three or more events - light red
    }

    return "bg-gray-50 text-gray-900"; // Default
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
        {/* Heat Map Guide */}
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

        {/* Calendar Grid */}
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
                  className={`text-sm font-medium ${
                    isToday ? "text-[#028A75]" : "text-gray-700"
                  }`}
                >
                  {day}
                </span>

                {/* Event indicators with colored plots */}
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

                {/* Event count badge for multiple events */}
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

// Analytics Component with Revenue Trend
function AnalyticsContent() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const userData = secureStorage.getItem("user");
        const response = await axios.get("/admin.php", {
          params: {
            operation: "getAnalyticsData",
            admin_id: userData?.user_id,
          },
        });

        if (response.data.status === "success") {
          setAnalyticsData(response.data.analytics);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Revenue Trend Chart - Moved from Overview */}
      <Card className="border-0 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Revenue Trend
          </CardTitle>
          <p className="text-sm text-gray-500">Monthly revenue overview</p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis
                  stroke="#6b7280"
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [
                    `₱${value.toLocaleString()}`,
                    "Revenue",
                  ]}
                  labelStyle={{ color: "#374151" }}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#028A75"
                  strokeWidth={3}
                  dot={{ fill: "#028A75", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#028A75", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Event Types Distribution */}
      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Event Types Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData?.eventTypes?.map((type: any, index: number) => (
              <div
                key={index}
                className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
              >
                <h4 className="font-medium">{type.event_name}</h4>
                <p className="text-2xl font-bold text-[#028A75]">
                  {type.count}
                </p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(parseFloat(type.total_budget))}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Status Breakdown */}
      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Payment Status Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analyticsData?.paymentStatus?.map((status: any, index: number) => (
              <div
                key={index}
                className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
              >
                <h4 className="font-medium capitalize">
                  {status.payment_status}
                </h4>
                <p className="text-2xl font-bold text-[#028A75]">
                  {status.count}
                </p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(parseFloat(status.total_amount))}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Venues and Packages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Venues</h3>
            <div className="space-y-3">
              {analyticsData?.topVenues
                ?.slice(0, 5)
                .map((venue: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{venue.venue_title}</p>
                      <p className="text-sm text-gray-500">
                        {venue.events_count} events
                      </p>
                    </div>
                    <p className="font-bold text-[#028A75]">
                      {formatCurrency(parseFloat(venue.total_revenue))}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Packages</h3>
            <div className="space-y-3">
              {analyticsData?.topPackages
                ?.slice(0, 5)
                .map((pkg: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{pkg.package_name}</p>
                      <p className="text-sm text-gray-500">
                        {pkg.bookings_count} bookings
                      </p>
                    </div>
                    <p className="font-bold text-[#028A75]">
                      {formatCurrency(parseFloat(pkg.total_revenue))}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reports Component
function ReportsContent() {
  const [reportsData, setReportsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReports = async (type: string) => {
    try {
      setIsLoading(true);
      const userData = secureStorage.getItem("user");
      const response = await axios.get("/admin.php", {
        params: {
          operation: "getReports",
          admin_id: userData?.user_id,
          report_type: type,
        },
      });

      if (response.data.status === "success") {
        setReportsData(response.data.reports);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => fetchReports("events")}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
        >
          <Calendar className="h-8 w-8 text-[#028A75] mb-2" />
          <h3 className="font-semibold text-gray-900">Events Report</h3>
          <p className="text-sm text-gray-500">Detailed event analysis</p>
        </button>

        <button
          onClick={() => fetchReports("revenue")}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
        >
          <DollarSign className="h-8 w-8 text-[#028A75] mb-2" />
          <h3 className="font-semibold text-gray-900">Revenue Report</h3>
          <p className="text-sm text-gray-500">Financial performance</p>
        </button>

        <button
          onClick={() => fetchReports("clients")}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
        >
          <Users className="h-8 w-8 text-[#028A75] mb-2" />
          <h3 className="font-semibold text-gray-900">Clients Report</h3>
          <p className="text-sm text-gray-500">Client engagement metrics</p>
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {reportsData && (
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Report Results</h3>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(reportsData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [userFirstName, setUserFirstName] = useState("");
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalEvents: 0,
    totalRevenue: 0,
    totalClients: 0,
    completedEvents: 0,
    monthlyGrowth: {
      events: 0,
      revenue: 0,
      clients: 0,
      completed: 0,
    },
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Update current date and time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get user first name
  useEffect(() => {
    const userData = secureStorage.getItem("user");
    if (userData?.first_name) {
      setUserFirstName(userData.first_name);
    }
  }, []);

  // Format percentage helper
  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true);
      const userData = secureStorage.getItem("user");

      // Fetch metrics
      const metricsResponse = await axios.get("/admin.php", {
        params: {
          operation: "getDashboardMetrics",
          admin_id: userData?.user_id,
        },
      });

      if (metricsResponse.data.status === "success") {
        setMetrics(metricsResponse.data.metrics);
      }

      // Fetch upcoming events
      const eventsResponse = await axios.get("/admin.php", {
        params: {
          operation: "getUpcomingEvents",
          admin_id: userData?.user_id,
          limit: 5,
        },
      });

      if (eventsResponse.data.status === "success") {
        setUpcomingEvents(eventsResponse.data.events);
      }

      // Fetch recent payments
      const paymentsResponse = await axios.get("/admin.php", {
        params: {
          operation: "getRecentPayments",
          admin_id: userData?.user_id,
          limit: 5,
        },
      });

      if (paymentsResponse.data.status === "success") {
        setRecentPayments(paymentsResponse.data.payments);
      }

      // Fetch calendar events (all events for the calendar view)
      const calendarResponse = await axios.get("/admin.php", {
        params: {
          operation: "getEvents",
          admin_id: userData?.user_id,
        },
      });

      if (calendarResponse.data.status === "success") {
        const events = calendarResponse.data.events || [];
        const calendarData = events.map((event: any) => ({
          id: event.id,
          title: event.event_title,
          date: event.event_date,
          status: event.event_status,
          event_type_id: event.event_type_id,
          event_type_name: event.event_type_name,
        }));
        setCalendarEvents(calendarData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchDashboardData();
    toast({
      title: "Refreshed",
      description: "Dashboard data has been updated.",
    });
  };

  useEffect(() => {
    // Fetch initial data
    fetchDashboardData();

    // Set up auto-refresh interval (every 5 minutes)
    const refreshInterval = setInterval(fetchDashboardData, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#028A75] mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {userFirstName || "Admin"}!
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
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
                <Calendar className="h-4 w-4" />
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
              onClick={() => router.push("/admin/event-builder")}
              className="flex items-center gap-2 px-6 py-2 bg-[#028A75] text-white rounded-lg hover:bg-[#027a65] transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Create Event
            </button>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#028A75] data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-[#028A75] data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="data-[state=active]:bg-[#028A75] data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Reports
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="overview"
            className="mt-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500"
          >
            {/* Metrics Cards */}
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
                      <p className="text-xs text-gray-500 mt-1">
                        {formatPercentage(metrics.monthlyGrowth.events)} from
                        last month
                      </p>
                    </div>
                    <div className="p-3 bg-[#028A75]/10 rounded-lg">
                      <Calendar className="h-6 w-6 text-[#028A75]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Revenue
                      </p>
                      <h3 className="text-3xl font-bold mt-2 text-gray-900">
                        {formatCurrency(metrics.totalRevenue)}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatPercentage(metrics.monthlyGrowth.revenue)} from
                        last month
                      </p>
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
                      <p className="text-sm font-medium text-gray-500">
                        Clients
                      </p>
                      <h3 className="text-3xl font-bold mt-2 text-gray-900">
                        {formatNumber(metrics.totalClients)}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatPercentage(metrics.monthlyGrowth.clients)} from
                        last month
                      </p>
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
                      <p className="text-sm font-medium text-gray-500">
                        Completed Events
                      </p>
                      <h3 className="text-3xl font-bold mt-2 text-gray-900">
                        {formatNumber(metrics.completedEvents)}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatPercentage(metrics.monthlyGrowth.completed)} from
                        last month
                      </p>
                    </div>
                    <div className="p-3 bg-[#028A75]/10 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-[#028A75]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Section */}
            <Card className="border-0 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Quick Actions
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Common administrative tasks
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <button
                    onClick={() => router.push("/admin/event-builder")}
                    className="flex flex-col items-center p-4 bg-[#028A75]/5 hover:bg-[#028A75]/10 rounded-lg transition-colors border border-[#028A75]/20"
                  >
                    <Plus className="h-6 w-6 text-[#028A75] mb-2" />
                    <span className="text-sm font-medium text-[#028A75]">
                      Create Event
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      router.push("/admin/packages/package-builder")
                    }
                    className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  >
                    <Package className="h-6 w-6 text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-blue-600">
                      New Package
                    </span>
                  </button>

                  <button
                    onClick={() => router.push("/admin/venues/venue-builder")}
                    className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                  >
                    <MapPin className="h-6 w-6 text-green-600 mb-2" />
                    <span className="text-sm font-medium text-green-600">
                      Add Venue
                    </span>
                  </button>

                  <button
                    onClick={() => router.push("/admin/organizers")}
                    className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                  >
                    <UserCheck className="h-6 w-6 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-purple-600">
                      Manage Organizers
                    </span>
                  </button>

                  <button
                    onClick={() => router.push("/admin/supplier")}
                    className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200"
                  >
                    <Truck className="h-6 w-6 text-orange-600 mb-2" />
                    <span className="text-sm font-medium text-orange-600">
                      Suppliers
                    </span>
                  </button>

                  <button
                    onClick={() => router.push("/admin/settings")}
                    className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                  >
                    <Settings className="h-6 w-6 text-gray-600 mb-2" />
                    <span className="text-sm font-medium text-gray-600">
                      Settings
                    </span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* System Status Section */}
            <Card className="border-0 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  System Status
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Current system health and performance
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-green-800">
                        API Status
                      </span>
                    </div>
                    <span className="text-sm text-green-600">Online</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-blue-800">
                        Database
                      </span>
                    </div>
                    <span className="text-sm text-blue-600">Connected</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium text-yellow-800">
                        Notifications
                      </span>
                    </div>
                    <span className="text-sm text-yellow-600">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar and Events Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Enhanced Calendar */}
              <div className="lg:col-span-2">
                <EnhancedCalendar events={calendarEvents} />
              </div>

              {/* Upcoming Events */}
              <div className="lg:col-span-1">
                <Card className="border-0 bg-white shadow-sm h-full">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Upcoming Events
                      </CardTitle>
                      <button
                        className="flex items-center text-sm text-[#028A75] hover:text-[#027a65] font-medium"
                        onClick={() => router.push("/admin/events")}
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
                    <div className="space-y-4">
                      {upcomingEvents.map((event, index) => (
                        <div
                          key={event.id}
                          className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900 line-clamp-2">
                              {event.title}
                            </h4>
                            <Badge
                              className={
                                event.status.toLowerCase() === "confirmed"
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-blue-100 text-blue-800 border-blue-200"
                              }
                            >
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
                            onClick={() =>
                              router.push(`/admin/events/${event.id}`)
                            }
                          >
                            <Eye className="h-4 w-4 mr-1" /> View Details
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Payments */}
            <Card className="border-0 bg-white shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Recent Payments
                  </CardTitle>
                  <button
                    className="flex items-center text-sm text-[#028A75] hover:text-[#027a65] font-medium"
                    onClick={() => router.push("/admin/payments")}
                  >
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Latest payment transactions
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-center border-b border-gray-100 pb-4 last:border-0 last:pb-0 hover:bg-gray-50 p-3 rounded-lg transition-colors"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {payment.event}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.date).toLocaleDateString()} •{" "}
                          {payment.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <button
                    className="inline-flex items-center text-sm font-medium text-[#028A75] hover:text-[#027a65]"
                    onClick={() => router.push("/admin/payments")}
                  >
                    View All Payments <ArrowRight className="ml-1 h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-8">
            <AnalyticsContent />
          </TabsContent>

          <TabsContent value="reports" className="mt-8">
            <ReportsContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
