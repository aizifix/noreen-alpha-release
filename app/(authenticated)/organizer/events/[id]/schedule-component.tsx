"use client";

import { useEffect, useState } from "react";
import { Download, Calendar, Clock, Check, X, ChevronDown } from "lucide-react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

// Event interface (simplified for schedule component)
interface Event {
  event_id: number;
  event_title: string;
  event_date: string;
  end_time?: string;
  package_id?: number;
}

// Organizer Event Schedule Component - Restricted version of admin schedule
export function OrganizerEventScheduleTab({
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
  const [openDropdowns, setOpenDropdowns] = useState<Set<number>>(new Set());

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

      const requestData = {
        operation: "schedules",
        subaction: "get",
        event_id: event.event_id,
      };

      const response = await axios.post(endpoints.admin, requestData);

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

  // Toggle status - Organizers can only change pending to done
  const toggleStatus = async (scheduleId: number, newStatus: string) => {
    // Find the current item to check its current status
    const currentItem = scheduleData.find(
      (item) => item.schedule_id === scheduleId
    );

    // Only allow Pending -> Done transitions
    if (
      currentItem &&
      currentItem.status !== "Pending" &&
      newStatus === "Done"
    ) {
      toast({
        title: "Action not allowed",
        description: "Organizers can only mark pending items as done.",
        variant: "destructive",
      });
      return;
    }

    // Only allow Pending -> Done transitions
    if (newStatus !== "Done" && newStatus !== "Pending") {
      toast({
        title: "Action not allowed",
        description:
          "Organizers can only toggle between Pending and Done status.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await axios.post(endpoints.admin, {
        operation: "schedules",
        subaction: "toggle_status",
        schedule_id: scheduleId,
        status: newStatus,
        user_role: "organizer", // Pass user role to API
      });

      if (response.data?.status === "success") {
        toast({
          title: "Success",
          description: "Status updated successfully",
        });
        await fetchScheduleData();
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  // Toggle dropdown
  const toggleDropdown = (scheduleId: number) => {
    setOpenDropdowns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(scheduleId)) {
        newSet.delete(scheduleId);
      } else {
        newSet.add(scheduleId);
      }
      return newSet;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".status-dropdown")) {
        setOpenDropdowns(new Set());
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
        return "text-green-600 bg-green-100";
      case "Delivered":
        return "text-blue-600 bg-blue-100";
      case "Cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  useEffect(() => {
    if (event && event.event_id) {
      fetchScheduleData();
    }
  }, [event?.event_id]);

  // Combine dates from groupedSchedules and emptyDates, then sort
  const allDates = [
    ...new Set([...Object.keys(groupedSchedules), ...emptyDates]),
  ];
  const sortedDates = allDates.sort();
  const totalItems = scheduleData.length;
  const completedItems = scheduleData.filter(
    (item) => item.status === "Done" || item.status === "Delivered"
  ).length;

  // Don't render if event is not available
  if (!event || !event.event_id) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h4 className="text-lg font-medium mb-2">Event Not Available</h4>
          <p>Please wait while the event data loads...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading schedule...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Progress and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Event Schedule
            </h3>
            <p className="text-sm text-gray-600">
              {completedItems} of {totalItems} items completed
            </p>
          </div>
          <div className="w-48 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={printSchedule}
            disabled={isPrinting}
          >
            <Download className="h-4 w-4 mr-2" />
            Print Schedule
          </Button>
        </div>
      </div>

      {/* Schedule Content */}
      <div className="space-y-4">
        {sortedDates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h4 className="text-lg font-medium mb-2">No Schedule Items</h4>
            <p>
              No schedule items have been created for this event yet. Contact
              your administrator to set up the schedule.
            </p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div
              key={date}
              className="bg-white border border-gray-200 rounded-lg p-4 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h4 className="text-lg font-semibold text-gray-900">
                    📅 {formatDate(date)}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {groupedSchedules[date]?.length || 0} items
                    </span>
                    {groupedSchedules[date]?.filter(
                      (item) =>
                        item.status === "Done" || item.status === "Delivered"
                    ).length > 0 && (
                      <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        {
                          groupedSchedules[date]?.filter(
                            (item) =>
                              item.status === "Done" ||
                              item.status === "Delivered"
                          ).length
                        }{" "}
                        completed
                      </span>
                    )}
                    {emptyDates.includes(date) && (
                      <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        Empty Date
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 min-h-[60px]">
                {groupedSchedules[date]?.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No items scheduled for this date</p>
                  </div>
                ) : (
                  groupedSchedules[date]?.map((item, index) => (
                    <div
                      key={item.schedule_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {/* Status Dropdown */}
                          <div className="relative status-dropdown">
                            <button
                              onClick={() => toggleDropdown(item.schedule_id)}
                              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(item.status)}`}
                            >
                              <span>{item.status}</span>
                              <ChevronDown className="h-3 w-3" />
                            </button>

                            {openDropdowns.has(item.schedule_id) && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[100px]">
                                <button
                                  onClick={() => {
                                    const newStatus =
                                      item.status === "Pending"
                                        ? "Done"
                                        : "Pending";
                                    toggleStatus(item.schedule_id, newStatus);
                                    setOpenDropdowns(new Set());
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs font-medium ${getStatusColor(item.status === "Pending" ? "Done" : "Pending")}`}
                                >
                                  {item.status === "Pending"
                                    ? "Done"
                                    : "Pending"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {item.component_name}
                          </div>
                          {item.inclusion_name && (
                            <div className="text-sm text-gray-500">
                              {item.inclusion_name}
                            </div>
                          )}
                          {item.remarks && (
                            <div className="text-sm text-gray-400">
                              {item.remarks}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-600">
                          {formatTime(item.scheduled_time)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Print Modal */}
      {isPrinting && (
        <div className="fixed inset-0 bg-white z-50 p-8 print-content">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                {event.event_title}
              </h1>
              <h2 className="text-xl text-gray-600">Event Schedule</h2>
              <p className="text-gray-500">
                Generated on {new Date().toLocaleDateString()}
              </p>
            </div>

            {sortedDates.map((date) => (
              <div key={date} className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  📅 {formatDate(date)}
                </h3>
                <div className="space-y-2">
                  {groupedSchedules[date]?.map((item) => (
                    <div
                      key={item.schedule_id}
                      className="flex items-center justify-between p-2 border-b"
                    >
                      <div>
                        <div className="font-medium">{item.component_name}</div>
                        {item.inclusion_name && (
                          <div className="text-sm text-gray-500">
                            {item.inclusion_name}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatTime(item.scheduled_time)} - {item.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
