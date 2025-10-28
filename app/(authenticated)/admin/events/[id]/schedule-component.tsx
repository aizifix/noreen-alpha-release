"use client";

import { useEffect, useState } from "react";
import {
  Edit,
  Save,
  X,
  Download,
  Calendar,
  Clock,
  Plus,
  Package,
  Check,
  Trash2,
  Move,
  GripVertical,
} from "lucide-react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Event interface (simplified for schedule component)
interface Event {
  event_id: number;
  event_title: string;
  event_date: string;
  end_time?: string;
  package_id?: number;
}

// Enhanced Event Schedule Component using the new tbl_event_schedule system
export function EventScheduleTab({
  event,
  onEventUpdate,
  userRole = "admin", // Default to admin, can be "organizer" for restricted access
}: {
  event: Event;
  onEventUpdate: () => Promise<void>;
  userRole?: "admin" | "organizer";
}) {
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [groupedSchedules, setGroupedSchedules] = useState<
    Record<string, any[]>
  >({});
  const [emptyDates, setEmptyDates] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddDateModal, setShowAddDateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    component_name: "",
    inclusion_name: "",
    scheduled_date: event.event_date || new Date().toISOString().split("T")[0],
    scheduled_time: "09:00",
    remarks: "",
    is_custom: 1,
  });
  const [newDateItem, setNewDateItem] = useState({
    scheduled_date: "",
  });

  // Fetch schedule data from the new API
  const fetchScheduleData = async () => {
    if (!event || !event.event_id) {
      console.error("Event or event_id is missing:", event);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Fetching schedule data for event_id:", event.event_id);
      console.log("Event object:", event);

      const requestData = {
        operation: "schedules",
        subaction: "get",
        event_id: event.event_id,
      };

      console.log("Request data:", requestData);

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

  // Seed schedule from package inclusions
  const seedSchedule = async () => {
    try {
      setIsSaving(true);
      const response = await axios.post(endpoints.admin, {
        operation: "schedules",
        subaction: "seed",
        event_id: event.event_id,
      });

      if (response.data?.status === "success") {
        toast({
          title: "Success",
          description: response.data.message,
        });
        await fetchScheduleData();
        await onEventUpdate();
      } else if (response.data?.status === "warning") {
        toast({
          title: "Warning",
          description: response.data.message,
          variant: "destructive",
        });
        // Still refresh the data in case there are existing items
        await fetchScheduleData();
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to seed schedule",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error seeding schedule:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to seed schedule",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add new schedule item
  const addScheduleItem = async () => {
    try {
      setIsSaving(true);
      const response = await axios.post(endpoints.admin, {
        operation: "schedules",
        subaction: "create",
        event_id: event.event_id,
        ...newItem,
      });

      if (response.data?.status === "success") {
        toast({
          title: "Success",
          description: "Schedule item added successfully",
        });
        setShowAddModal(false);
        setNewItem({
          component_name: "",
          inclusion_name: "",
          scheduled_date:
            event.event_date || new Date().toISOString().split("T")[0],
          scheduled_time: "09:00",
          remarks: "",
          is_custom: 1,
        });
        await fetchScheduleData();
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to add schedule item",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error adding schedule item:", error);
      toast({
        title: "Error",
        description: "Failed to add schedule item",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add new empty date
  const addNewDate = async () => {
    try {
      setIsSaving(true);
      const response = await axios.post(endpoints.admin, {
        operation: "schedules",
        subaction: "create_empty_date",
        event_id: event.event_id,
        scheduled_date: newDateItem.scheduled_date,
      });

      if (response.data?.status === "success") {
        toast({
          title: "Success",
          description: "New date added successfully",
        });
        setShowAddDateModal(false);
        setNewDateItem({
          scheduled_date: "",
        });
        await fetchScheduleData();
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to add new date",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error adding new date:", error);
      toast({
        title: "Error",
        description: "Failed to add new date",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update schedule item
  const updateScheduleItem = async (item: any) => {
    try {
      setIsSaving(true);
      const response = await axios.post(endpoints.admin, {
        operation: "schedules",
        subaction: "update",
        schedule_id: item.schedule_id,
        component_name: item.component_name,
        inclusion_name: item.inclusion_name,
        scheduled_date: item.scheduled_date,
        scheduled_time: item.scheduled_time,
        status: item.status,
        remarks: item.remarks,
      });

      if (response.data?.status === "success") {
        toast({
          title: "Success",
          description: "Schedule item updated successfully",
        });
        setEditingItem(null);
        await fetchScheduleData();
      } else {
        toast({
          title: "Error",
          description:
            response.data.message || "Failed to update schedule item",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error updating schedule item:", error);
      toast({
        title: "Error",
        description: "Failed to update schedule item",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Move schedule item to different date
  const moveScheduleItem = async (scheduleId: number, newDate: string) => {
    try {
      setIsSaving(true);
      const response = await axios.post(endpoints.admin, {
        operation: "schedules",
        subaction: "move",
        schedule_id: scheduleId,
        scheduled_date: newDate,
      });

      if (response.data?.status === "success") {
        toast({
          title: "Success",
          description: "Schedule item moved successfully",
        });
        await fetchScheduleData();
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to move schedule item",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error moving schedule item:", error);
      toast({
        title: "Error",
        description: "Failed to move schedule item",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: any) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDraggedOverDate(date);
  };

  const handleDragLeave = () => {
    setDraggedOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();

    if (draggedItem && draggedItem.scheduled_date !== targetDate) {
      await moveScheduleItem(draggedItem.schedule_id, targetDate);
    }

    setDraggedItem(null);
    setDraggedOverDate(null);
  };

  // Toggle status (for organizers - restricted to pending/done only)
  const toggleStatus = async (scheduleId: number, newStatus: string) => {
    // Restrict organizer permissions - only allow pending to done transitions
    if (userRole === "organizer") {
      // Find the current item to check its current status
      const currentItem = scheduleData.find(
        (item) => item.schedule_id === scheduleId
      );
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
    }

    try {
      const response = await axios.post(endpoints.admin, {
        operation: "schedules",
        subaction: "toggle_status",
        schedule_id: scheduleId,
        status: newStatus,
        user_role: userRole, // Pass user role to API
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

  // Delete schedule item
  const deleteScheduleItem = async (scheduleId: number) => {
    try {
      const response = await axios.post(endpoints.admin, {
        operation: "schedules",
        subaction: "delete",
        schedule_id: scheduleId,
      });

      if (response.data?.status === "success") {
        toast({
          title: "Success",
          description: "Schedule item deleted successfully",
        });
        await fetchScheduleData();
      } else {
        toast({
          title: "Error",
          description:
            response.data.message || "Failed to delete schedule item",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error deleting schedule item:", error);
      toast({
        title: "Error",
        description: "Failed to delete schedule item",
        variant: "destructive",
      });
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
        return "text-green-600 bg-green-100";
      case "Delivered":
        return "text-blue-600 bg-blue-100";
      case "Cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  // Get minimum date (today)
  const getMinDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Get maximum date (event date)
  const getMaxDate = () => {
    return event.event_date || new Date().toISOString().split("T")[0];
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
          {!isEditing ? (
            <>
              {userRole === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={seedSchedule}
                  disabled={isSaving}
                >
                  <Package className="h-4 w-4 mr-2" />
                  {isSaving ? "Seeding..." : "Seed from Package"}
                </Button>
              )}
              {userRole === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Schedule
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={printSchedule}
                disabled={isPrinting}
              >
                <Download className="h-4 w-4 mr-2" />
                Print Schedule
              </Button>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-500 mr-2">
                <Move className="h-4 w-4 inline mr-1" />
                Drag items between dates
              </div>
              {userRole === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddDateModal(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Add Date
                </Button>
              )}
              {userRole === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Schedule Content */}
      <div className="space-y-4">
        {sortedDates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h4 className="text-lg font-medium mb-2">No Schedule Items</h4>
            <p>
              Click "Seed from Package" to automatically create schedule items
              from your package inclusions, or "Add Item" to create custom
              items.
            </p>
            {isEditing && userRole === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            )}
          </div>
        ) : (
          sortedDates.map((date) => (
            <div
              key={date}
              className={`bg-white border border-gray-200 rounded-lg p-4 transition-all duration-200 ${
                draggedOverDate === date ? "border-blue-400 bg-blue-50" : ""
              }`}
              onDragOver={
                userRole === "admin"
                  ? (e) => handleDragOver(e, date)
                  : undefined
              }
              onDragLeave={userRole === "admin" ? handleDragLeave : undefined}
              onDrop={
                userRole === "admin" ? (e) => handleDrop(e, date) : undefined
              }
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
                {isEditing && userRole === "admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewItem({
                        ...newItem,
                        scheduled_date: date,
                      });
                      setShowAddModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </div>

              <div className="space-y-2 min-h-[60px]">
                {groupedSchedules[date]?.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No items scheduled for this date</p>
                    {isEditing && userRole === "admin" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewItem({
                            ...newItem,
                            scheduled_date: date,
                          });
                          setShowAddModal(true);
                        }}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Component
                      </Button>
                    )}
                  </div>
                ) : (
                  groupedSchedules[date]?.map((item, index) => (
                    <div
                      key={item.schedule_id}
                      className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-200 ${
                        draggedItem?.schedule_id === item.schedule_id
                          ? "opacity-50"
                          : ""
                      }`}
                      draggable={isEditing && userRole === "admin"}
                      onDragStart={(e) => handleDragStart(e, item)}
                    >
                      <div className="flex items-center space-x-3">
                        {isEditing && userRole === "admin" && (
                          <div className="cursor-move text-gray-400 hover:text-gray-600">
                            <GripVertical className="h-4 w-4" />
                          </div>
                        )}
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={
                              item.status === "Done" ||
                              item.status === "Delivered"
                            }
                            onChange={(e) => {
                              const newStatus = e.target.checked
                                ? "Done"
                                : "Pending";
                              toggleStatus(item.schedule_id, newStatus);
                            }}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                            >
                              {item.status}
                            </div>
                            {userRole === "organizer" &&
                              item.status === "Pending" && (
                                <button
                                  onClick={() =>
                                    toggleStatus(item.schedule_id, "Done")
                                  }
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                  title="Mark as Done"
                                >
                                  ✓ Done
                                </button>
                              )}
                            {userRole === "organizer" &&
                              item.status === "Done" && (
                                <button
                                  onClick={() =>
                                    toggleStatus(item.schedule_id, "Pending")
                                  }
                                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                                  title="Mark as Pending"
                                >
                                  ↶ Pending
                                </button>
                              )}
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {isEditing &&
                            editingItem?.schedule_id === item.schedule_id ? (
                              <input
                                type="text"
                                value={editingItem.component_name}
                                onChange={(e) =>
                                  setEditingItem({
                                    ...editingItem,
                                    component_name: e.target.value,
                                  })
                                }
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                              />
                            ) : (
                              item.component_name
                            )}
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
                          {isEditing &&
                            editingItem?.schedule_id === item.schedule_id && (
                              <div className="mt-2">
                                <label className="text-xs text-gray-500 block mb-1">
                                  Date:
                                </label>
                                <input
                                  type="date"
                                  value={editingItem.scheduled_date}
                                  onChange={(e) =>
                                    setEditingItem({
                                      ...editingItem,
                                      scheduled_date: e.target.value,
                                    })
                                  }
                                  min={getMinDate()}
                                  max={getMaxDate()}
                                  className="border border-gray-300 rounded px-2 py-1 text-xs"
                                />
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-600">
                          {isEditing &&
                          editingItem?.schedule_id === item.schedule_id ? (
                            <input
                              type="time"
                              value={editingItem.scheduled_time}
                              onChange={(e) =>
                                setEditingItem({
                                  ...editingItem,
                                  scheduled_time: e.target.value,
                                })
                              }
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          ) : (
                            formatTime(item.scheduled_time)
                          )}
                        </div>

                        {isEditing && userRole === "admin" && (
                          <div className="flex items-center space-x-1">
                            {editingItem?.schedule_id === item.schedule_id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateScheduleItem(editingItem)
                                  }
                                  disabled={isSaving}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingItem(null)}
                                >
                                  <X className="h-4 w-4 text-gray-600" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingItem(item)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    deleteScheduleItem(item.schedule_id)
                                  }
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Item Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Schedule Item</DialogTitle>
            <DialogDescription>
              Add a new custom item to the event schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="component_name">Component Name *</Label>
              <Input
                id="component_name"
                value={newItem.component_name}
                onChange={(e) =>
                  setNewItem({ ...newItem, component_name: e.target.value })
                }
                placeholder="e.g., Photography Setup"
              />
            </div>
            <div>
              <Label htmlFor="inclusion_name">Inclusion Category</Label>
              <Input
                id="inclusion_name"
                value={newItem.inclusion_name}
                onChange={(e) =>
                  setNewItem({ ...newItem, inclusion_name: e.target.value })
                }
                placeholder="e.g., Photo & Video"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduled_date">Date *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={newItem.scheduled_date}
                  onChange={(e) =>
                    setNewItem({ ...newItem, scheduled_date: e.target.value })
                  }
                  min={getMinDate()}
                  max={getMaxDate()}
                />
              </div>
              <div>
                <Label htmlFor="scheduled_time">Time *</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  value={newItem.scheduled_time}
                  onChange={(e) =>
                    setNewItem({ ...newItem, scheduled_time: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                value={newItem.remarks}
                onChange={(e) =>
                  setNewItem({ ...newItem, remarks: e.target.value })
                }
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={addScheduleItem}
              disabled={isSaving || !newItem.component_name}
            >
              {isSaving ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Date Modal */}
      <Dialog open={showAddDateModal} onOpenChange={setShowAddDateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Date</DialogTitle>
            <DialogDescription>
              Add a new date to the schedule. You can then add components to
              this date separately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new_date">Date *</Label>
              <Input
                id="new_date"
                type="date"
                value={newDateItem.scheduled_date}
                onChange={(e) =>
                  setNewDateItem({
                    ...newDateItem,
                    scheduled_date: e.target.value,
                  })
                }
                min={getMinDate()}
                max={getMaxDate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDateModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={addNewDate}
              disabled={isSaving || !newDateItem.scheduled_date}
            >
              {isSaving ? "Adding..." : "Add Date"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
