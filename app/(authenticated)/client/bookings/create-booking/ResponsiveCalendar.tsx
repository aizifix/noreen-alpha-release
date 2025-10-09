"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  AlertCircle,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import axios from "axios";
import { endpoints } from "@/app/config/api";

interface CalendarEvent {
  event_type_id: number;
  event_type_name: string;
  count: number;
}

interface ModalEvent {
  id: string;
  title: string;
  date: string;
  status: "confirmed" | "pending" | "cancelled";
  type: "wedding" | "corporate" | "birthday" | "other";
}

interface CalendarConflictData {
  [date: string]: {
    hasWedding: boolean;
    hasOtherEvents: boolean;
    eventCount: number;
    events: CalendarEvent[];
  };
}

interface ResponsiveCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  calendarConflictData: CalendarConflictData;
  className?: string;
}

export default function ResponsiveCalendar({
  selectedDate,
  onDateSelect,
  calendarConflictData,
  className,
}: ResponsiveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<ModalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localCalendarData, setLocalCalendarData] =
    useState<CalendarConflictData>({});

  // Load calendar conflict data from API
  const loadCalendarConflictData = useCallback(async (targetDate: Date) => {
    try {
      setIsLoading(true);
      const startDate = format(startOfMonth(targetDate), "yyyy-MM-dd");
      const endDate = format(endOfMonth(targetDate), "yyyy-MM-dd");

      const response = await axios.post(`${endpoints.client}`, {
        operation: "getCalendarConflictData",
        start_date: startDate,
        end_date: endDate,
      });

      if (response.data.status === "success") {
        setLocalCalendarData(response.data.calendarData || {});
      }
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load calendar data when component mounts or currentDate changes
  useEffect(() => {
    loadCalendarConflictData(currentDate);
  }, [currentDate, loadCalendarConflictData]);

  // Use local data if available, otherwise fall back to passed data
  const effectiveCalendarData =
    Object.keys(localCalendarData).length > 0
      ? localCalendarData
      : calendarConflictData;

  // Get heat map color based on event count and wedding status
  const getHeatMapColor = (eventCount: number, hasWedding: boolean) => {
    if (hasWedding) return "bg-red-500 text-white hover:bg-red-600";
    if (eventCount === 0) return "bg-white text-gray-900 hover:bg-gray-50";
    if (eventCount === 1)
      return "bg-yellow-200 text-gray-900 hover:bg-yellow-300";
    if (eventCount === 2)
      return "bg-orange-300 text-gray-900 hover:bg-orange-400";
    if (eventCount >= 3) return "bg-red-300 text-gray-900 hover:bg-red-400";
    return "bg-gray-50 text-gray-900 hover:bg-gray-100";
  };

  // Get status color for events
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          border: "border-green-200",
        };
      case "pending":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-800",
          border: "border-yellow-200",
        };
      case "cancelled":
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          border: "border-red-200",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          border: "border-gray-200",
        };
    }
  };

  // Navigate months
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Get calendar days for the current month
  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  // Handle day click
  const handleDayClick = (day: Date) => {
    const dateString = format(day, "yyyy-MM-dd");
    const dayData = effectiveCalendarData[dateString];

    if (dayData && dayData.events.length > 0) {
      // Convert the events to the format expected by the modal
      const modalEvents = dayData.events.map((event, index) => ({
        id: `${event.event_type_id}-${index}`,
        title: event.event_type_name,
        date: dateString,
        status: "confirmed" as const,
        type: event.event_type_name.toLowerCase().includes("wedding")
          ? ("wedding" as const)
          : ("other" as const),
      }));
      setSelectedDayData(modalEvents);
      setShowDetailsModal(true);
    } else {
      onDateSelect(day);
    }
  };

  // Render calendar day
  const renderCalendarDay = (day: Date) => {
    const dateString = format(day, "yyyy-MM-dd");
    const dayData = effectiveCalendarData[dateString];
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isTodayDate = isToday(day);
    const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0));

    const eventCount = dayData?.eventCount || 0;
    const hasWedding = dayData?.hasWedding || false;
    const heatMapColor = getHeatMapColor(eventCount, hasWedding);

    return (
      <button
        className={cn(
          "relative w-full h-full aspect-square text-sm font-medium rounded-md transition-all duration-200",
          "flex flex-col items-center justify-center",
          "min-h-[2.5rem] sm:min-h-[3rem] md:min-h-[3.5rem] lg:min-h-[4rem]",
          "max-w-[2.5rem] sm:max-w-[3rem] md:max-w-[3.5rem] lg:max-w-[4rem]",
          "mx-auto", // Center the button within its grid cell
          heatMapColor,
          isSelected && "ring-2 ring-[#028A75] ring-offset-1 border-[#028A75]",
          isPastDate && "opacity-50 cursor-not-allowed text-gray-400",
          !isCurrentMonth && "text-gray-400",
          isTodayDate && !isSelected && "ring-1 ring-blue-300 bg-blue-50",
          !isPastDate && !hasWedding && "hover:scale-105 focus:scale-105"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isPastDate) {
            handleDayClick(day);
          }
        }}
        disabled={isPastDate}
      >
        <span className="text-xs sm:text-sm font-medium">
          {format(day, "d")}
        </span>
        {eventCount > 0 && !isPastDate && (
          <div className="absolute -top-1 -right-1 z-10">
            <div className="text-[8px] sm:text-[10px] rounded-full w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center font-bold bg-[#028A75] text-white border border-white">
              {eventCount}
            </div>
          </div>
        )}
      </button>
    );
  };

  const calendarDays = getCalendarDays();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl font-semibold text-[#028A75] flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Event Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevMonth}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              {format(currentDate, "MMMM yyyy")}
            </h3>
          </div>
        </CardHeader>

        <CardContent className="p-2 sm:p-4">
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#028A75]"></div>
              <span className="ml-2 text-sm text-gray-600">
                Loading calendar data...
              </span>
            </div>
          )}

          {/* Day names header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-xs sm:text-sm font-medium text-gray-500 py-1 sm:py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 w-full max-w-full overflow-hidden">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className="aspect-square flex items-center justify-center min-h-0"
              >
                {renderCalendarDay(day)}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-white border border-gray-300"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-200"></div>
                <span>1 Event</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-300"></div>
                <span>2 Events</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-300"></div>
                <span>3+ Events</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span>Wedding</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] w-full overflow-hidden p-0 flex flex-col">
          <DialogHeader className="p-4 sm:p-6 border-b">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center">
              <Info className="h-5 w-5 mr-2 text-[#028A75]" />
              Event Details
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-grow p-4 sm:p-6">
            {selectedDayData.length > 0 ? (
              <div className="space-y-4">
                {selectedDayData.map((event) => {
                  const statusColors = getStatusColor(event.status);
                  return (
                    <Card
                      key={event.id}
                      className="border-l-4 border-l-[#028A75]"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {event.title}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className={`${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                              >
                                {event.status}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {event.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {format(
                                new Date(event.date),
                                "EEEE, MMMM d, yyyy"
                              )}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-600">No events found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
