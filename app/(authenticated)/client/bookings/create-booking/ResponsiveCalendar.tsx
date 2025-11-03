"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  X,
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
  addDays,
  isBefore,
  setMonth,
  setYear,
  getMonth,
  getYear,
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

  // Handle month change from dropdown
  const handleMonthChange = (monthIndex: number) => {
    setCurrentDate(setMonth(currentDate, monthIndex));
  };

  // Handle year change from dropdown
  const handleYearChange = (year: number) => {
    setCurrentDate(setYear(currentDate, year));
  };

  // Generate month options
  const monthOptions = [
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

  // Generate year options (from minimum allowed date year to 5 years in the future)
  const getYearOptions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minimumAllowedDate = addDays(today, 7);
    const startYear = getYear(minimumAllowedDate);
    const endYear = startYear + 5; // 5 years into the future
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years;
  };

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

    // Calculate minimum allowed date (today + 7 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minimumAllowedDate = addDays(today, 7);
    minimumAllowedDate.setHours(0, 0, 0, 0);

    // Check if date is in the past or within the 7-day gap
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const isPastDate = isBefore(dayStart, minimumAllowedDate);

    const eventCount = dayData?.eventCount || 0;
    const hasWedding = dayData?.hasWedding || false;
    const heatMapColor = getHeatMapColor(eventCount, hasWedding);

    return (
      <button
        className={cn(
          "relative w-full h-full text-[9px] sm:text-xs font-medium rounded-sm sm:rounded transition-all duration-200",
          "flex items-center justify-center",
          "min-h-0 min-w-0 overflow-hidden",
          heatMapColor,
          isSelected && "ring-1 sm:ring-2 ring-[#028A75] ring-offset-0 sm:ring-offset-1",
          isPastDate && "opacity-40 cursor-not-allowed",
          !isCurrentMonth && "text-gray-400 opacity-50",
          isTodayDate && !isSelected && "ring-1 ring-blue-400 bg-blue-50",
          !isPastDate && !hasWedding && "hover:opacity-90",
          "focus:outline-none focus:ring-1 focus:ring-[#028A75]"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isPastDate) {
            handleDayClick(day);
          }
        }}
        disabled={isPastDate}
        aria-label={`${format(day, "MMMM d, yyyy")}${eventCount > 0 ? ` - ${eventCount} events` : ""}${isPastDate ? " - Date must be at least 7 days in advance" : ""}`}
        title={`${format(day, "MMMM d, yyyy")}${eventCount > 0 ? ` - ${eventCount} events` : ""}${isPastDate ? " - Date must be at least 7 days in advance" : ""}`}
      >
        <span className="font-semibold leading-none">
          {format(day, "d")}
        </span>
        {eventCount > 0 && !isPastDate && (
          <div className="absolute -top-0.5 -right-0.5 sm:top-0 sm:right-0">
            <div className="text-[7px] sm:text-[8px] rounded-full w-2.5 h-2.5 sm:w-3 sm:h-3 flex items-center justify-center font-bold bg-[#028A75] text-white border border-white shadow-sm leading-none">
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
      <Card className={cn("w-full max-w-full overflow-hidden mx-auto", className)}>
        <CardHeader className="pb-2 px-2 sm:px-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <CardTitle className="text-sm sm:text-base font-semibold text-[#028A75] flex items-center flex-shrink-0">
              <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Event Calendar</span>
              <span className="sm:hidden">Calendar</span>
            </CardTitle>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={prevMonth}
                className="h-6 w-6 sm:h-7 sm:w-7 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
                className="h-6 w-6 sm:h-7 sm:w-7 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {/* Month and Year Selectors */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <Select
              value={getMonth(currentDate).toString()}
              onValueChange={(value) => handleMonthChange(parseInt(value))}
            >
              <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm w-[100px] sm:w-[120px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={getYear(currentDate).toString()}
              onValueChange={(value) => handleYearChange(parseInt(value))}
            >
              <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm w-[80px] sm:w-[90px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {getYearOptions().map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-2 sm:p-3">
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#028A75]"></div>
              <span className="ml-2 text-sm text-gray-600">
                Loading calendar data...
              </span>
            </div>
          )}

          {/* Error state */}
          {!isLoading && Object.keys(effectiveCalendarData).length === 0 && (
            <div className="flex items-center justify-center py-4">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Unable to load calendar data</p>
              </div>
            </div>
          )}

          {/* Day names header */}
          <div className="grid grid-cols-7 gap-[2px] sm:gap-1 mb-1 w-full">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-[9px] sm:text-[10px] font-medium text-gray-500 py-0.5 sm:py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-[2px] sm:gap-1 w-full max-w-full">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className="aspect-square w-full min-w-0"
              >
                {renderCalendarDay(day)}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] px-1">
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm bg-white border border-gray-300"></div>
                <span className="whitespace-nowrap">Available</span>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm bg-yellow-200"></div>
                <span className="whitespace-nowrap">1 Event</span>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm bg-orange-300"></div>
                <span className="whitespace-nowrap">2 Events</span>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm bg-red-300"></div>
                <span className="whitespace-nowrap">3+ Events</span>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm bg-red-500"></div>
                <span className="whitespace-nowrap">Wedding</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] w-full overflow-hidden p-0 flex flex-col z-[100] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <DialogHeader className="p-4 sm:p-6 border-b relative">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center">
              <Info className="h-5 w-5 mr-2 text-[#028A75]" />
              Event Details
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-4 right-4 h-8 w-8 p-0 hover:bg-gray-100 z-10"
            >
              <X className="h-4 w-4" />
            </Button>
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
