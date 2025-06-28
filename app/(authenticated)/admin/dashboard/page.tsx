"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import {
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  Eye,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

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
    <div className="space-y-6">
      {/* Event Types Distribution */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Event Types Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData?.eventTypes?.map((type: any, index: number) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium">{type.event_name}</h4>
                <p className="text-2xl font-bold text-green-600">
                  {type.count}
                </p>
                <p className="text-sm text-gray-500">
                  ₱{parseFloat(type.total_budget).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Status Breakdown */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Payment Status Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analyticsData?.paymentStatus?.map((status: any, index: number) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium capitalize">
                  {status.payment_status}
                </h4>
                <p className="text-2xl font-bold text-blue-600">
                  {status.count}
                </p>
                <p className="text-sm text-gray-500">
                  ₱{parseFloat(status.total_amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Venues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
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
                    <p className="font-bold text-green-600">
                      ₱{parseFloat(venue.total_revenue).toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Packages */}
        <Card>
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
                    <p className="font-bold text-green-600">
                      ₱{parseFloat(pkg.total_revenue).toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      <Card>
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
                      <td className="p-2 font-bold text-green-600">
                        ₱{parseFloat(client.total_spent).toLocaleString()}
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

  const formatCurrency = (amount: number) => {
    return `₱${parseFloat(amount.toString()).toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="flex gap-4 mb-6">
        {["summary", "financial", "events", "clients"].map((type) => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`px-4 py-2 rounded-lg capitalize ${
              reportType === type
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {type} Report
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {reportType === "summary" && reportsData?.summary && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Summary Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800">Total Events</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {reportsData.summary.total_events}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800">
                      Completed Events
                    </h4>
                    <p className="text-2xl font-bold text-green-600">
                      {reportsData.summary.completed_events}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-800">
                      Total Contract Value
                    </h4>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(reportsData.summary.total_contract_value)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-800">
                      Revenue Collected
                    </h4>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(
                        reportsData.summary.total_revenue_collected
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {reportType === "financial" && reportsData?.financial && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Financial Report</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Event</th>
                        <th className="text-left p-2">Client</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Budget</th>
                        <th className="text-left p-2">Paid</th>
                        <th className="text-left p-2">Balance</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.financial.map((item: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.event_title}</td>
                          <td className="p-2">{item.client_name}</td>
                          <td className="p-2">
                            {new Date(item.event_date).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            {formatCurrency(item.total_budget)}
                          </td>
                          <td className="p-2">
                            {formatCurrency(item.total_paid)}
                          </td>
                          <td className="p-2">
                            {formatCurrency(item.remaining_balance)}
                          </td>
                          <td className="p-2">
                            <Badge
                              className={
                                item.payment_status === "paid"
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                              }
                            >
                              {item.payment_status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {reportType === "events" && reportsData?.events && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Events Report</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Event</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Client</th>
                        <th className="text-left p-2">Venue</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Guests</th>
                        <th className="text-left p-2">Budget</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.events.map((event: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{event.event_title}</td>
                          <td className="p-2">{event.event_type}</td>
                          <td className="p-2">{event.client_name}</td>
                          <td className="p-2">
                            {event.venue_title || "No venue"}
                          </td>
                          <td className="p-2">
                            {new Date(event.event_date).toLocaleDateString()}
                          </td>
                          <td className="p-2">{event.guest_count}</td>
                          <td className="p-2">
                            {formatCurrency(event.total_budget)}
                          </td>
                          <td className="p-2">
                            <Badge
                              className={
                                event.event_status === "completed"
                                  ? "bg-green-500"
                                  : "bg-blue-500"
                              }
                            >
                              {event.event_status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {reportType === "clients" && reportsData?.clients && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Clients Report</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Client Name</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Contact</th>
                        <th className="text-left p-2">Events</th>
                        <th className="text-left p-2">Total Spent</th>
                        <th className="text-left p-2">Last Event</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.clients.map((client: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{client.client_name}</td>
                          <td className="p-2">{client.user_email}</td>
                          <td className="p-2">{client.user_contact}</td>
                          <td className="p-2">{client.total_events}</td>
                          <td className="p-2">
                            {formatCurrency(client.total_contract_value)}
                          </td>
                          <td className="p-2">
                            {new Date(
                              client.last_event_date
                            ).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
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

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  // Format percentage helper
  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
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
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      // Protect route from unauthorized access and back navigation
      protectRoute();

      const userData = secureStorage.getItem("user");
      if (
        !userData ||
        !userData.user_role ||
        userData.user_role.toLowerCase() !== "admin"
      ) {
        console.log("Invalid user data in dashboard:", userData);
        router.push("/auth/login");
        return;
      }

      // Fetch initial data
      fetchDashboardData();

      // Set up auto-refresh interval (every 5 minutes)
      const refreshInterval = setInterval(fetchDashboardData, 5 * 60 * 1000);

      return () => clearInterval(refreshInterval);
    } catch (error) {
      console.error("Error accessing user data:", error);
      router.push("/auth/login");
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="text-sm text-gray-500">Last 30 Days</div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-white data-[state=active]:shadow-none"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="data-[state=active]:bg-white data-[state=active]:shadow-none"
          >
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="data-[state=active]:bg-white data-[state=active]:shadow-none"
          >
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Events
                    </p>
                    <h3 className="text-3xl font-bold mt-2">
                      {metrics.totalEvents}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatPercentage(metrics.monthlyGrowth.events)} from last
                      month
                    </p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-md">
                    <Calendar className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Revenue</p>
                    <h3 className="text-3xl font-bold mt-2">
                      {formatCurrency(metrics.totalRevenue)}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatPercentage(metrics.monthlyGrowth.revenue)} from
                      last month
                    </p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-md">
                    <DollarSign className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Clients</p>
                    <h3 className="text-3xl font-bold mt-2">
                      {metrics.totalClients}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatPercentage(metrics.monthlyGrowth.clients)} from
                      last month
                    </p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-md">
                    <Users className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Completed Events
                    </p>
                    <h3 className="text-3xl font-bold mt-2">
                      {metrics.completedEvents}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatPercentage(metrics.monthlyGrowth.completed)} from
                      last month
                    </p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-md">
                    <CheckCircle className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events and Recent Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Events */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Upcoming Events</h3>
                    <p className="text-sm text-gray-500">
                      You have {upcomingEvents.length} upcoming events
                    </p>
                  </div>
                  <button
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => router.push("/admin/events")}
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-6">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{event.title}</h4>
                        <Badge
                          className={
                            event.status.toLowerCase() === "confirmed"
                              ? "bg-green-500"
                              : "bg-blue-500"
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
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                        onClick={() => router.push(`/admin/events/${event.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Recent Payments</h3>
                    <p className="text-sm text-gray-500">
                      Latest payment transactions
                    </p>
                  </div>
                  <button
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => router.push("/admin/payments")}
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-6">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div>
                        <h4 className="font-medium">{payment.event}</h4>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.date).toLocaleDateString()} •{" "}
                          {payment.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(payment.amount)}
                        </p>
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-600 border-green-200"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <button
                    className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                    onClick={() => router.push("/admin/payments")}
                  >
                    View All Payments <ArrowRight className="ml-1 h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsContent />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
