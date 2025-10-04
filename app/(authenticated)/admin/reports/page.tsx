"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { endpoints } from "@/app/config/api";
import {
  Calendar,
  Clock,
  User,
  DollarSign,
  Package,
  MapPin,
  Mail,
  Activity,
  LogIn,
  UserPlus,
  Shield,
  Users,
  Timer,
  AlertTriangle,
  Monitor,
  LogOut,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface TimelineItem {
  action_type: string;
  timestamp: string;
  description: string;
  user_name: string;
  user_type: string;
  related_id: number;
  entity_type: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  showing: number;
  showingText: string;
}

interface ActivityTimelineResponse {
  status: string;
  timeline: TimelineItem[];
  pagination: PaginationInfo;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  message?: string;
}

interface SessionStats {
  user_role: string;
  unique_users_logged_in: number;
  total_logins: number;
  total_logouts: number;
  logins_today: number;
  logouts_today: number;
  logins_week: number;
  logouts_week: number;
  avg_session_duration_seconds: number;
  last_activity: string;
}

interface ActiveSession {
  session_id: string;
  user_firstName: string;
  user_lastName: string;
  user_email: string;
  user_role: string;
  login_time: string;
  last_activity: string;
  ip_address: string;
  session_duration_minutes: number;
}

interface SessionLog {
  id: number;
  action_type: string;
  created_at: string;
  description: string;
  ip_address: string;
  session_duration: number;
  login_method: string;
  success: boolean;
  failure_reason: string;
  user_id: number;
  user_firstName: string;
  user_lastName: string;
  user_email: string;
  user_role: string;
  user_contact: string;
  formatted_session_duration: string;
}

interface SessionAnalyticsResponse {
  status: string;
  data: {
    roleStats: SessionStats[];
    trends: any[];
    activeSessions: ActiveSession[];
    failedLogins: any[];
    summary: {
      totalLogins: number;
      totalLogouts: number;
      totalUniqueUsers: number;
      activeSessionsCount: number;
      avgSessionDurationMinutes: number;
      failedLoginsCount: number;
    };
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

interface SessionLogsResponse {
  status: string;
  logs: SessionLog[];
  pagination: PaginationInfo;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  filters: {
    userRole: string;
  };
}

export default function ReportsPage() {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Leave dates empty to let backend apply wide default (last 6 months)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Session Analytics State
  const [sessionAnalytics, setSessionAnalytics] =
    useState<SessionAnalyticsResponse | null>(null);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [sessionLogsLoading, setSessionLogsLoading] = useState(false);
  const [sessionLogsPagination, setSessionLogsPagination] =
    useState<PaginationInfo | null>(null);
  const [sessionLogsCurrentPage, setSessionLogsCurrentPage] =
    useState<number>(1);
  const [sessionLogsItemsPerPage, setSessionLogsItemsPerPage] =
    useState<number>(20);
  const [selectedUserRole, setSelectedUserRole] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("activities");

  const adminId = 7; // This should come from your auth context

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("operation", "getActivityTimeline");
      params.set("admin_id", String(adminId));
      params.set("page", String(currentPage));
      params.set("limit", String(itemsPerPage));
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const response = await fetch(`${endpoints.admin}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log("Raw API response:", responseText);

      let data: ActivityTimelineResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Response text:", responseText);
        setError("Invalid JSON response from server");
        return;
      }

      if (data.status === "success") {
        setTimeline(data.timeline);
        setPagination(data.pagination);
      } else {
        setError(data.message || "Failed to fetch timeline data");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        "Error fetching timeline data: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      params.set("operation", "getSessionAnalytics");
      params.set("admin_id", String(adminId));
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const response = await fetch(`${endpoints.admin}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SessionAnalyticsResponse = await response.json();
      if (data.status === "success") {
        setSessionAnalytics(data);
      } else {
        setError("Failed to fetch session analytics");
      }
    } catch (err) {
      console.error("Session analytics fetch error:", err);
      setError(
        "Error fetching session analytics: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    }
  };

  const fetchSessionLogs = async () => {
    setSessionLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("operation", "getDetailedSessionLogs");
      params.set("admin_id", String(adminId));
      params.set("page", String(sessionLogsCurrentPage));
      params.set("limit", String(sessionLogsItemsPerPage));
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (selectedUserRole !== "all") params.set("user_role", selectedUserRole);

      const response = await fetch(`${endpoints.admin}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SessionLogsResponse = await response.json();
      if (data.status === "success") {
        setSessionLogs(data.logs);
        setSessionLogsPagination(data.pagination);
      } else {
        setError("Failed to fetch session logs");
      }
    } catch (err) {
      console.error("Session logs fetch error:", err);
      setError(
        "Error fetching session logs: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setSessionLogsLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      const params = new URLSearchParams();
      params.set("operation", "terminateUserSession");
      params.set("admin_id", String(adminId));
      params.set("session_id", sessionId);
      params.set("reason", "admin_terminated");

      const response = await fetch(`${endpoints.admin}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === "success") {
        // Refresh session analytics to update active sessions
        fetchSessionAnalytics();
        alert("Session terminated successfully");
      } else {
        alert("Failed to terminate session: " + data.message);
      }
    } catch (err) {
      console.error("Session termination error:", err);
      alert(
        "Error terminating session: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    }
  };

  useEffect(() => {
    fetchTimeline();
    fetchSessionAnalytics();
  }, [startDate, endDate, currentPage, itemsPerPage]);

  useEffect(() => {
    if (activeTab === "sessions") {
      fetchSessionLogs();
    }
  }, [
    activeTab,
    startDate,
    endDate,
    sessionLogsCurrentPage,
    sessionLogsItemsPerPage,
    selectedUserRole,
  ]);

  const getActionIcon = (actionType: string) => {
    // Handle both old and new action types
    switch (actionType) {
      case "logout":
      case "user_logout":
        return <LogIn className="h-4 w-4 rotate-180" />;
      case "login":
      case "user_login":
      case "login_attempt":
        return <LogIn className="h-4 w-4" />;
      case "signup":
      case "user_signup":
        return <UserPlus className="h-4 w-4" />;
      case "created":
      case "event_created":
      case "booking_created":
      case "package_created":
      case "venue_created":
      case "organizer_created":
      case "supplier_created":
      case "offer_created":
        return <Calendar className="h-4 w-4" />;
      case "updated":
      case "status_updated":
      case "settings_updated":
        return <Activity className="h-4 w-4" />;
      case "finalized":
      case "confirmed":
      case "offer_accepted":
        return <Shield className="h-4 w-4" />;
      case "cancelled":
      case "offer_rejected":
        return <AlertTriangle className="h-4 w-4" />;
      case "payment_received":
      case "payment_confirmed":
      case "refunded":
      case "proof_uploaded":
        return <DollarSign className="h-4 w-4" />;
      case "organizer_activity":
        return <User className="h-4 w-4" />;
      case "supplier_activity":
        return <Package className="h-4 w-4" />;
      case "email_sent":
        return <Mail className="h-4 w-4" />;
      case "report_generated":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    // Handle both old and new action types
    switch (actionType) {
      case "logout":
      case "user_logout":
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "login":
      case "user_login":
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "login_attempt":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "signup":
      case "user_signup":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "created":
      case "event_created":
      case "booking_created":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "updated":
      case "status_updated":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "finalized":
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "offer_accepted":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "offer_rejected":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "payment_received":
        return "bg-green-100 text-green-800 border-green-200";
      case "payment_confirmed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "refunded":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "proof_uploaded":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "organizer_created":
      case "organizer_activity":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "supplier_created":
      case "supplier_activity":
      case "offer_created":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "package_created":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "venue_created":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "email_sent":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "settings_updated":
        return "bg-violet-100 text-violet-800 border-violet-200";
      case "report_generated":
        return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case "client":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "admin":
        return "bg-red-50 text-red-700 border-red-200";
      case "organizer":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "supplier":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "system":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const filteredTimeline = timeline.filter((item) => {
    if (filter === "all") return true;
    if (filter === "login") {
      return item.action_type === "login" || item.action_type === "user_login";
    }
    if (filter === "logout") {
      return (
        item.action_type === "logout" || item.action_type === "user_logout"
      );
    }
    if (filter === "signup") {
      return (
        item.action_type === "signup" || item.action_type === "user_signup"
      );
    }
    return item.action_type === filter;
  });

  const actionTypes = [
    { value: "all", label: "All Activities" },
    // Authentication
    { value: "login", label: "User Logins" },
    { value: "logout", label: "User Logouts" },
    { value: "signup", label: "User Signups" },
    { value: "login_attempt", label: "Login Attempts" },
    // Events
    { value: "created", label: "Items Created" },
    { value: "updated", label: "Items Updated" },
    { value: "finalized", label: "Events Finalized" },
    { value: "cancelled", label: "Items Cancelled" },
    // Bookings
    { value: "booking_created", label: "Bookings Created" },
    { value: "confirmed", label: "Bookings Confirmed" },
    { value: "status_updated", label: "Status Updated" },
    { value: "offer_accepted", label: "Offers Accepted" },
    { value: "offer_rejected", label: "Offers Rejected" },
    // Payments
    { value: "payment_received", label: "Payments Received" },
    { value: "payment_confirmed", label: "Payments Confirmed" },
    { value: "refunded", label: "Payments Refunded" },
    { value: "proof_uploaded", label: "Payment Proofs Uploaded" },
    // Entities
    { value: "organizer_created", label: "Organizers Created" },
    { value: "supplier_created", label: "Suppliers Created" },
    { value: "offer_created", label: "Supplier Offers Created" },
    { value: "package_created", label: "Packages Created" },
    { value: "venue_created", label: "Venues Created" },
    // System
    { value: "email_sent", label: "Emails Sent" },
    { value: "settings_updated", label: "Settings Updated" },
    { value: "report_generated", label: "Reports Generated" },
  ];

  const userRoleTypes = [
    { value: "all", label: "All Roles" },
    { value: "admin", label: "Administrators" },
    { value: "client", label: "Clients" },
    { value: "organizer", label: "Organizers" },
    { value: "supplier", label: "Suppliers" },
    { value: "staff", label: "Staff" },
  ];

  const getActionLabel = (actionType: string) => {
    // Handle both old and new action types
    switch (actionType) {
      case "login":
      case "user_login":
        return "Login";
      case "logout":
      case "user_logout":
        return "Logout";
      case "login_attempt":
        return "Login Attempt";
      case "signup":
      case "user_signup":
        return "Sign up";
      case "created":
      case "event_created":
      case "booking_created":
        return "Created";
      case "updated":
        return "Updated";
      case "status_updated":
        return "Status Changed";
      case "finalized":
        return "Finalized";
      case "confirmed":
        return "Confirmed";
      case "cancelled":
        return "Cancelled";
      case "offer_accepted":
        return "Offer Accepted";
      case "offer_rejected":
        return "Offer Rejected";
      case "payment_received":
        return "Payment Received";
      case "payment_confirmed":
        return "Payment Confirmed";
      case "refunded":
        return "Refunded";
      case "proof_uploaded":
        return "Proof Uploaded";
      case "organizer_created":
        return "Organizer Created";
      case "supplier_created":
        return "Supplier Created";
      case "offer_created":
        return "Offer Created";
      case "package_created":
        return "Package Created";
      case "venue_created":
        return "Venue Created";
      case "email_sent":
        return "Email Sent";
      case "settings_updated":
        return "Settings Updated";
      case "report_generated":
        return "Report Generated";
      default:
        // Convert snake_case to Title Case for unknown action types
        return actionType
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
    }
  };

  return (
    <div className="container mx-auto max-w-[1400px] p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              System Reports & Analytics
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive system activity tracking, session management, and
              user analytics
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchTimeline} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Data"}
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b">
          <button
            onClick={() => setActiveTab("activities")}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === "activities"
                ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Activity className="inline h-4 w-4 mr-2" />
            Activity Timeline
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === "sessions"
                ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Monitor className="inline h-4 w-4 mr-2" />
            Session Management
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === "analytics"
                ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <TrendingUp className="inline h-4 w-4 mr-2" />
            Session Analytics
          </button>
        </div>

        {/* Common Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters & Date Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {activeTab === "activities" ? (
                <div>
                  <Label htmlFor="filter">Activity Type</Label>
                  <select
                    id="filter"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {actionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="roleFilter">User Role</Label>
                  <select
                    id="roleFilter"
                    value={selectedUserRole}
                    onChange={(e) => setSelectedUserRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {userRoleTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setFilter("all");
                    setSelectedUserRole("all");
                    setCurrentPage(1);
                    setSessionLogsCurrentPage(1);
                  }}
                  variant="outline"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === "activities" && (
          <>
            {/* Activity Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Activities
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {timeline.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <LogIn className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        User Logins
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {
                          timeline.filter(
                            (item) =>
                              item.action_type === "user_login" ||
                              item.action_type === "login"
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <LogOut className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        User Logouts
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {
                          timeline.filter(
                            (item) =>
                              item.action_type === "user_logout" ||
                              item.action_type === "logout"
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Payments
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {
                          timeline.filter((item) =>
                            item.action_type.includes("payment")
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeTab === "analytics" && sessionAnalytics && (
          <>
            {/* Session Analytics Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Unique Users
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {sessionAnalytics.data.summary.totalUniqueUsers}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <LogIn className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Logins
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {sessionAnalytics.data.summary.totalLogins}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Wifi className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Active Sessions
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {sessionAnalytics.data.summary.activeSessionsCount}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Timer className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Avg Session
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {
                          sessionAnalytics.data.summary
                            .avgSessionDurationMinutes
                        }
                        m
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Role-based Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Session Statistics by User Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessionAnalytics.data.roleStats.map((stat) => (
                    <Card key={stat.user_role} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">
                          {stat.user_role}
                        </span>
                        <Badge className={getUserTypeColor(stat.user_role)}>
                          {stat.unique_users_logged_in} users
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Logins:</span>
                          <span className="font-medium">
                            {stat.total_logins}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Logouts:</span>
                          <span className="font-medium">
                            {stat.total_logouts}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>This Week:</span>
                          <span className="font-medium">
                            {stat.logins_week}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Session:</span>
                          <span className="font-medium">
                            {Math.round(stat.avg_session_duration_seconds / 60)}
                            m
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            {sessionAnalytics.data.activeSessions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Wifi className="h-5 w-5 mr-2" />
                    Active Sessions (
                    {sessionAnalytics.data.activeSessions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Login Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionAnalytics.data.activeSessions.map(
                        (session, index) => (
                          <TableRow
                            key={`session-${session.user_email}-${index}`}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {session.user_firstName}{" "}
                                  {session.user_lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {session.user_email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getUserTypeColor(session.user_role)}
                              >
                                {session.user_role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(session.login_time),
                                "MMM dd, HH:mm"
                              )}
                            </TableCell>
                            <TableCell>
                              {session.session_duration_minutes}m
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {session.ip_address}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  terminateSession("user_" + session.user_email)
                                }
                                className="text-red-600 hover:text-red-700"
                              >
                                <WifiOff className="h-3 w-3 mr-1" />
                                Force Logout
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Failed Login Attempts */}
            {sessionAnalytics.data.failedLogins.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center text-red-600">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Recent Failed Login Attempts (
                    {sessionAnalytics.data.failedLogins.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionAnalytics.data.failedLogins.map(
                        (attempt, index) => (
                          <TableRow
                            key={`failed-${attempt.user_email || "unknown"}-${attempt.created_at}-${index}`}
                          >
                            <TableCell>
                              {format(
                                new Date(attempt.created_at),
                                "MMM dd, HH:mm"
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {attempt.user_firstName}{" "}
                                  {attempt.user_lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {attempt.user_email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {attempt.ip_address}
                            </TableCell>
                            <TableCell>
                              <span className="text-red-600">
                                {attempt.failure_reason ||
                                  "Invalid credentials"}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === "sessions" && (
          <>
            {/* Session Logs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex flex-col">
                  <CardTitle className="text-lg">
                    Detailed Session Logs
                  </CardTitle>
                  <span className="text-sm text-gray-600">
                    {sessionLogsPagination
                      ? `Showing ${sessionLogsPagination.showing} of ${sessionLogsPagination.totalItems}`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="sessionPageSize"
                    className="text-sm text-gray-600"
                  >
                    Rows per page
                  </Label>
                  <select
                    id="sessionPageSize"
                    value={sessionLogsItemsPerPage}
                    onChange={(e) => {
                      setSessionLogsItemsPerPage(Number(e.target.value));
                      setSessionLogsCurrentPage(1);
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
              {error && (
                <div className="px-6 -mt-4 text-red-600 text-sm">{error}</div>
              )}
              <CardContent>
                {sessionLogsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">
                      Loading session logs...
                    </span>
                  </div>
                ) : sessionLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No session logs found for the selected filters and date
                    range.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[160px]">Timestamp</TableHead>
                          <TableHead className="w-[100px]">Action</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Session Duration</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionLogs.map((log, index) => (
                          <TableRow key={`log-${log.id || index}`}>
                            <TableCell>
                              <div className="flex items-center gap-2 text-xs text-gray-700">
                                <Clock className="h-3 w-3" />
                                {format(
                                  new Date(log.created_at),
                                  "MMM dd, yyyy HH:mm"
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${getActionColor(log.action_type)}`}
                              >
                                {log.action_type === "login" ||
                                log.action_type === "user_login" ? (
                                  <LogIn className="h-3 w-3" />
                                ) : (
                                  <LogOut className="h-3 w-3" />
                                )}
                                <span className="font-medium capitalize">
                                  {log.action_type}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-gray-500" />
                                <div>
                                  <div className="text-sm text-gray-900">
                                    {log.user_firstName} {log.user_lastName}
                                  </div>
                                  <Badge
                                    className={`text-xs ${getUserTypeColor(log.user_role)}`}
                                  >
                                    {log.user_role}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.ip_address || "N/A"}
                            </TableCell>
                            <TableCell>
                              {log.formatted_session_duration || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {log.login_method || "email"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {log.success ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  Success
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {sessionLogsPagination &&
                      sessionLogsPagination.totalPages > 1 && (
                        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between pt-2">
                          <div className="text-xs text-gray-600">
                            Page {sessionLogsPagination.currentPage} of{" "}
                            {sessionLogsPagination.totalPages}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSessionLogsCurrentPage(1)}
                              disabled={!sessionLogsPagination.hasPrevPage}
                              className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                              aria-label="First page"
                            >
                              «
                            </button>
                            <button
                              onClick={() =>
                                setSessionLogsCurrentPage((p) =>
                                  Math.max(1, p - 1)
                                )
                              }
                              disabled={!sessionLogsPagination.hasPrevPage}
                              className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                              aria-label="Previous page"
                            >
                              ‹
                            </button>
                            {(() => {
                              const pages: number[] = [];
                              const total = sessionLogsPagination.totalPages;
                              const current = sessionLogsPagination.currentPage;
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
                                    key={`session-page-${p}-${i}`}
                                    onClick={() => setSessionLogsCurrentPage(p)}
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
                                    key={`session-gap-${i}`}
                                    className="px-2 text-gray-500"
                                  >
                                    {p}
                                  </span>
                                )
                              );
                            })()}
                            <button
                              onClick={() =>
                                setSessionLogsCurrentPage((p) =>
                                  Math.min(
                                    sessionLogsPagination.totalPages,
                                    p + 1
                                  )
                                )
                              }
                              disabled={!sessionLogsPagination.hasNextPage}
                              className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                              aria-label="Next page"
                            >
                              ›
                            </button>
                            <button
                              onClick={() =>
                                setSessionLogsCurrentPage(
                                  sessionLogsPagination.totalPages
                                )
                              }
                              disabled={!sessionLogsPagination.hasNextPage}
                              className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                              aria-label="Last page"
                            >
                              »
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Activity Table - Only show for activities tab */}
        {activeTab === "activities" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col">
                <CardTitle className="text-lg">Activity Log</CardTitle>
                <span className="text-sm text-gray-600">
                  {pagination
                    ? `Showing ${pagination.showing} of ${pagination.totalItems}`
                    : ""}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="pageSize" className="text-sm text-gray-600">
                  Rows per page
                </Label>
                <select
                  id="pageSize"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
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
            {error && (
              <div className="px-6 -mt-4 text-red-600 text-sm">{error}</div>
            )}
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">
                    Loading activities...
                  </span>
                </div>
              ) : filteredTimeline.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activities found for the selected date range and filters.
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Timestamp</TableHead>
                        <TableHead className="w-[200px]">Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[220px]">User</TableHead>
                        <TableHead className="w-[120px]">Entity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTimeline.map((item, index) => (
                        <TableRow
                          key={`timeline-${item.action_type}-${item.timestamp}-${index}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2 text-xs text-gray-700">
                              <Clock className="h-3 w-3" />
                              {format(
                                new Date(item.timestamp),
                                "MMM dd, yyyy HH:mm"
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${getActionColor(item.action_type)}`}
                            >
                              {getActionIcon(item.action_type)}
                              <span className="font-medium">
                                {getActionLabel(item.action_type)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-900 truncate max-w-[520px]">
                              {item.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-gray-500" />
                              <span className="text-sm text-gray-900">
                                {item.user_name}
                              </span>
                              <Badge
                                className={`text-xs ${getUserTypeColor(item.user_type)}`}
                              >
                                {item.user_type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {item.entity_type}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between pt-2">
                      <div className="text-xs text-gray-600">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={!pagination.hasPrevPage}
                          className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                          aria-label="First page"
                        >
                          «
                        </button>
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={!pagination.hasPrevPage}
                          className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                          aria-label="Previous page"
                        >
                          ‹
                        </button>
                        {(() => {
                          const pages: number[] = [];
                          const total = pagination.totalPages;
                          const current = pagination.currentPage;
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
                                key={`activity-page-${p}-${i}`}
                                onClick={() => setCurrentPage(p)}
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
                                key={`activity-gap-${i}`}
                                className="px-2 text-gray-500"
                              >
                                {p}
                              </span>
                            )
                          );
                        })()}
                        <button
                          onClick={() =>
                            setCurrentPage((p) =>
                              Math.min(pagination.totalPages, p + 1)
                            )
                          }
                          disabled={!pagination.hasNextPage}
                          className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                          aria-label="Next page"
                        >
                          ›
                        </button>
                        <button
                          onClick={() => setCurrentPage(pagination.totalPages)}
                          disabled={!pagination.hasNextPage}
                          className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                          aria-label="Last page"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
