"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  User,
  DollarSign,
  Package,
  MapPin,
  Mail,
  Activity,
} from "lucide-react";
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
  const [itemsPerPage] = useState<number>(10);

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

      const response = await fetch(
        `http://localhost/events-api/admin.php?${params.toString()}`
      );

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

  useEffect(() => {
    fetchTimeline();
  }, [startDate, endDate, currentPage, itemsPerPage]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "event_created":
        return <Calendar className="h-4 w-4" />;
      case "payment_received":
      case "payment_confirmed":
        return <DollarSign className="h-4 w-4" />;
      case "organizer_activity":
        return <User className="h-4 w-4" />;
      case "supplier_activity":
      case "supplier_created":
        return <Package className="h-4 w-4" />;
      case "email_sent":
        return <Mail className="h-4 w-4" />;
      case "package_created":
        return <Package className="h-4 w-4" />;
      case "venue_created":
        return <MapPin className="h-4 w-4" />;
      case "booking_created":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case "event_created":
      case "booking_created":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "payment_received":
        return "bg-green-100 text-green-800 border-green-200";
      case "payment_confirmed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "organizer_activity":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "supplier_activity":
      case "supplier_created":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "email_sent":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "package_created":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "venue_created":
        return "bg-teal-100 text-teal-800 border-teal-200";
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
    return item.action_type === filter;
  });

  const actionTypes = [
    { value: "all", label: "All Activities" },
    { value: "event_created", label: "Events Created" },
    { value: "booking_created", label: "Bookings Created" },
    { value: "payment_received", label: "Payments Received" },
    { value: "payment_confirmed", label: "Payments Confirmed" },
    { value: "organizer_activity", label: "Organizer Activities" },
    { value: "supplier_activity", label: "Supplier Activities" },
    { value: "supplier_created", label: "Suppliers Created" },
    { value: "email_sent", label: "Emails Sent" },
    { value: "package_created", label: "Packages Created" },
    { value: "venue_created", label: "Venues Created" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              System Activity Timeline
            </h1>
            <p className="text-gray-600 mt-2">
              Track all activities and actions taken within the system
            </p>
          </div>
          <Button onClick={fetchTimeline} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters & Date Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setFilter("all");
                    setCurrentPage(1);
                  }}
                  variant="outline"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
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
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Events Created
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      timeline.filter(
                        (item) => item.action_type === "event_created"
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
                  <p className="text-sm font-medium text-gray-600">Payments</p>
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
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    User Activities
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      timeline.filter((item) =>
                        ["organizer_activity", "supplier_activity"].includes(
                          item.action_type
                        )
                      ).length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Activity Timeline</CardTitle>
            <div className="text-sm text-gray-600">
              {pagination
                ? `Showing ${pagination.showing} out of ${pagination.totalItems}`
                : ""}
            </div>
          </CardHeader>
          {error && (
            <div className="px-6 -mt-4 text-red-600 text-sm">{error}</div>
          )}
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading timeline...</span>
              </div>
            ) : filteredTimeline.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No activities found for the selected date range and filters.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTimeline.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActionColor(item.action_type)}`}
                    >
                      {getActionIcon(item.action_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {item.description}
                        </p>
                        <Badge
                          className={`text-xs ${getUserTypeColor(item.user_type)}`}
                        >
                          {item.user_type}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(
                              new Date(item.timestamp),
                              "MMM dd, yyyy HH:mm"
                            )}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{item.user_name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.entity_type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {pagination && pagination.totalPages > 1 && (
                  <div className="flex justify-end items-center pt-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={!pagination.hasPrevPage}
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((p) =>
                            Math.min(pagination.totalPages, p + 1)
                          )
                        }
                        disabled={!pagination.hasNextPage}
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
