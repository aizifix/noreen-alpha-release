"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { secureStorage } from "@/app/utils/encryption";
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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
}

// Mock data for the revenue chart
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

// Analytics Component
function AnalyticsContent() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const userData = secureStorage.getItem("user");
        const response = await axios.get(
          "http://localhost/events-api/admin.php",
          {
            params: {
              operation: "getAnalyticsData",
              admin_id: userData?.user_id,
            },
          }
        );

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
      {/* Event Types Distribution */}
      <Card className="border-0 bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Event Types Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData?.eventTypes?.map((type: any, index: number) => (
              <div
                key={index}
                className="bg-gray-50 p-4 rounded-lg border border-gray-100"
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
      <Card className="border-0 bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Payment Status Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analyticsData?.paymentStatus?.map((status: any, index: number) => (
              <div
                key={index}
                className="bg-gray-50 p-4 rounded-lg border border-gray-100"
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

      {/* Top Venues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Venues</h3>
            <div className="space-y-3">
              {analyticsData?.topVenues
                ?.slice(0, 5)
                .map((venue: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
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

        {/* Top Packages */}
        <Card className="border-0 bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Packages</h3>
            <div className="space-y-3">
              {analyticsData?.topPackages
                ?.slice(0, 5)
                .map((pkg: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{pkg.package_title}</p>
                      <p className="text-sm text-gray-500">
                        {pkg.events_count} events
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

      {/* Top Clients */}
      <Card className="border-0 bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Clients by Revenue</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Client Name</th>
                  <th className="text-left p-2">Events</th>
                  <th className="text-left p-2">Total Spent</th>
                  <th className="text-left p-2">Last Event</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData?.topClients
                  ?.slice(0, 5)
                  .map((client: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{client.client_name}</td>
                      <td className="p-2">{client.events_count}</td>
                      <td className="p-2 font-bold text-[#028A75]">
                        {formatCurrency(parseFloat(client.total_spent))}
                      </td>
                      <td className="p-2">
                        {new Date(client.last_event_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Reports Component
function ReportsContent() {
  const [reportsData, setReportsData] = useState<any>(null);
  const [reportType, setReportType] = useState("summary");
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async (type: string) => {
    setIsLoading(true);
    try {
      const userData = secureStorage.getItem("user");
      const response = await axios.get(
        "http://localhost/events-api/admin.php",
        {
          params: {
            operation: "getReportsData",
            admin_id: userData?.user_id,
            report_type: type,
          },
        }
      );

      if (response.data.status === "success") {
        setReportsData(response.data.reports);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(reportType);
  }, [reportType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setReportType("summary")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            reportType === "summary"
              ? "bg-[#028A75] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setReportType("detailed")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            reportType === "detailed"
              ? "bg-[#028A75] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Detailed
        </button>
        <button
          onClick={() => setReportType("financial")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            reportType === "financial"
              ? "bg-[#028A75] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Financial
        </button>
      </div>

      <Card className="border-0 bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
          </h3>
          <div className="space-y-4">
            {reportsData ? (
              <div className="text-gray-600">
                <p>
                  Report data will be displayed here based on the selected type.
                </p>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No report data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Calendar Component
function QuickCalendar({ events }: { events: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((event) => event.date === dateStr);
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  return (
    <Card className="border-0 bg-white">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Event Calendar
          </h3>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <span className="font-medium">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs">
          {dayNames.map((day) => (
            <div
              key={day}
              className="p-2 text-center font-medium text-gray-500"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: startingDay }, (_, i) => (
            <div key={`empty-${i}`} className="p-2"></div>
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDate(day);
            const isToday =
              new Date().toDateString() ===
              new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
              ).toDateString();

            return (
              <div
                key={day}
                className={`p-2 text-center border border-gray-100 min-h-[60px] relative ${
                  isToday ? "bg-[#028A75]/10 border-[#028A75]" : ""
                }`}
              >
                <span
                  className={`text-sm ${isToday ? "font-bold text-[#028A75]" : "text-gray-700"}`}
                >
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <div className="mt-1">
                    {dayEvents.slice(0, 2).map((event, index) => (
                      <div
                        key={index}
                        className="w-2 h-2 bg-[#028A75] rounded-full mx-auto mb-1"
                        title={event.title}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayEvents.length - 2}
                      </div>
                    )}
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
      const metricsResponse = await axios.get(
        "http://localhost/events-api/admin.php",
        {
          params: {
            operation: "getDashboardMetrics",
            admin_id: userData?.user_id,
          },
        }
      );

      if (metricsResponse.data.status === "success") {
        setMetrics(metricsResponse.data.metrics);
      }

      // Fetch upcoming events
      const eventsResponse = await axios.get(
        "http://localhost/events-api/admin.php",
        {
          params: {
            operation: "getUpcomingEvents",
            admin_id: userData?.user_id,
            limit: 5,
          },
        }
      );

      if (eventsResponse.data.status === "success") {
        setUpcomingEvents(eventsResponse.data.events);
      }

      // Fetch recent payments
      const paymentsResponse = await axios.get(
        "http://localhost/events-api/admin.php",
        {
          params: {
            operation: "getRecentPayments",
            admin_id: userData?.user_id,
            limit: 5,
          },
        }
      );

      if (paymentsResponse.data.status === "success") {
        setRecentPayments(paymentsResponse.data.payments);
      }

      // Fetch calendar events (all events for the calendar view)
      const calendarResponse = await axios.get(
        "http://localhost/events-api/admin.php",
        {
          params: {
            operation: "getEvents",
            admin_id: userData?.user_id,
          },
        }
      );

      if (calendarResponse.data.status === "success") {
        const events = calendarResponse.data.events || [];
        const calendarData = events.map((event: any) => ({
          id: event.id,
          title: event.event_title,
          date: event.event_date,
          status: event.event_status,
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            Hello, {userFirstName || "Admin"}
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
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={() => router.push("/admin/event-builder")}
            className="flex items-center gap-2 px-6 py-2 bg-[#028A75] text-white rounded-lg hover:bg-[#027a65] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-lg border-0">
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
            <Card className="border-0 bg-white hover:bg-gray-50 transition-colors duration-200">
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
                      {formatPercentage(metrics.monthlyGrowth.events)} from last
                      month
                    </p>
                  </div>
                  <div className="p-3 bg-[#028A75]/10 rounded-lg">
                    <Calendar className="h-6 w-6 text-[#028A75]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white hover:bg-gray-50 transition-colors duration-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Revenue</p>
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

            <Card className="border-0 bg-white hover:bg-gray-50 transition-colors duration-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Clients</p>
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

            <Card className="border-0 bg-white hover:bg-gray-50 transition-colors duration-200">
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

          {/* Revenue Chart and Calendar Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart - Smaller */}
            <Card className="border-0 bg-white lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Revenue Trend
                  </h3>
                  <p className="text-sm text-gray-500">Monthly overview</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={11} />
                      <YAxis
                        stroke="#6b7280"
                        fontSize={11}
                        tickFormatter={(value) =>
                          `₱${(value / 1000).toFixed(0)}k`
                        }
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
                        strokeWidth={2}
                        dot={{ fill: "#028A75", strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5, stroke: "#028A75", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Calendar */}
            <div className="lg:col-span-1">
              <QuickCalendar events={calendarEvents} />
            </div>
          </div>

          {/* Upcoming Events and Recent Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Events */}
            <Card className="border-0 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Upcoming Events
                    </h3>
                    <p className="text-sm text-gray-500">
                      You have {upcomingEvents.length} upcoming events
                    </p>
                  </div>
                  <button
                    className="flex items-center text-sm text-[#028A75] hover:text-[#027a65] font-medium"
                    onClick={() => router.push("/admin/events")}
                  >
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {upcomingEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">
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
                        onClick={() => router.push(`/admin/events/${event.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View Details
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="border-0 bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Recent Payments
                    </h3>
                    <p className="text-sm text-gray-500">
                      Latest payment transactions
                    </p>
                  </div>
                  <button
                    className="flex items-center text-sm text-[#028A75] hover:text-[#027a65] font-medium"
                    onClick={() => router.push("/admin/payments")}
                  >
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-center border-b border-gray-100 pb-4 last:border-0 last:pb-0"
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
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-8">
          <AnalyticsContent />
        </TabsContent>

        <TabsContent value="reports" className="mt-8">
          <ReportsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
