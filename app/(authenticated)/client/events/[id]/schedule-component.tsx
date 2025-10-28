"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Calendar,
  Clock,
  Package,
  CheckCircle,
  Circle,
  XCircle,
} from "lucide-react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { secureStorage } from "@/app/utils/encryption";

// Event interface (simplified for schedule component)
interface Event {
  event_id: number;
  event_title: string;
  event_date: string;
  end_time?: string;
  package_id?: number;
}

// Read-only Event Schedule Component for Clients
export function ClientScheduleTab({
  event,
  onEventUpdate,
}: {
  event: Event;
  onEventUpdate: () => Promise<void>;
}) {
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [groupedSchedules, setGroupedSchedules] = useState<
    Record<string, any[]>
  >({});
  const [emptyDates, setEmptyDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  // Fetch schedule data from the API
  const fetchScheduleData = async () => {
    if (!event || !event.event_id) {
      console.error("Event or event_id is missing:", event);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Fetching schedule data for event_id:", event.event_id);

      // Get current user ID from secure storage
      const userData = secureStorage.getItem("user");
      if (!userData || !userData.user_id) {
        toast({
          title: "Error",
          description: "User authentication required",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const requestData = {
        operation: "schedules",
        subaction: "get",
        event_id: event.event_id,
        user_id: userData.user_id,
      };

      console.log("Request data:", requestData);
      console.log("API endpoint:", endpoints.client);

      const response = await axios.post(endpoints.client, requestData);

      console.log("Response status:", response.status);
      console.log("Response data:", response.data);

      if (response.data?.status === "success") {
        setScheduleData(response.data.data || []);
        setGroupedSchedules(response.data.grouped_data || {});
        setEmptyDates(response.data.empty_dates || []);
      } else {
        console.error("API Error:", response.data);
        toast({
          title: "Error",
          description:
            response.data?.message || "Failed to fetch schedule data",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching schedule data:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to fetch schedule data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Print schedule
  const printSchedule = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Done":
        return "text-green-600 bg-green-50";
      case "Delivered":
        return "text-blue-600 bg-blue-50";
      case "Cancelled":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Done":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Delivered":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case "Cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, [event.event_id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isPrinting ? "print-mode" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Event Schedule
          </h3>
          <p className="text-sm text-gray-600">
            View your event schedule and timeline
          </p>
        </div>
        <Button onClick={printSchedule} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Print Schedule
        </Button>
      </div>

      {/* Schedule Content */}
      {Object.keys(groupedSchedules).length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Schedule Items
          </h3>
          <p className="text-gray-600">
            Your event schedule will appear here once it's created by the event
            organizer.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSchedules)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([date, schedules]) => (
              <div
                key={date}
                className="bg-white rounded-lg border border-gray-200"
              >
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {formatDate(date)}
                  </h4>
                </div>
                <div className="p-6">
                  {schedules.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No items scheduled for this date</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {schedules.map((schedule) => (
                        <div
                          key={schedule.schedule_id}
                          className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getStatusIcon(schedule.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-medium text-gray-900 truncate">
                                {schedule.component_name}
                              </h5>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                  schedule.status
                                )}`}
                              >
                                {schedule.status}
                              </span>
                            </div>
                            {schedule.inclusion_name && (
                              <p className="text-xs text-gray-600 mt-1">
                                Category: {schedule.inclusion_name}
                              </p>
                            )}
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{formatTime(schedule.scheduled_time)}</span>
                            </div>
                            {schedule.remarks && (
                              <p className="text-xs text-gray-600 mt-2">
                                {schedule.remarks}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print-mode {
            background: white !important;
          }
          .print-mode .bg-gray-50 {
            background: white !important;
          }
          .print-mode .border-gray-200 {
            border-color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
