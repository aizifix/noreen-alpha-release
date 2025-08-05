"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Heart,
  Users,
  RefreshCw,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { EventDetails } from "@/app/types";
import type { EventDetailsStepProps } from "@/app/types/event-builder";
import axios from "axios";
import { toast } from "@/hooks/use-toast";
import { CircularTimePicker } from "./circular-time-picker";

// Interface for conflicting events
interface ConflictingEvent {
  event_id: number;
  event_title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type_id: number;
  event_type_name: string;
  client_name: string;
  venue_name: string;
}

// Interface for calendar conflict data with heat map support
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

export function EventDetailsStep({
  initialData,
  onUpdate,
  onNext,
}: EventDetailsStepProps) {
  const [date, setDate] = useState<Date>(() => new Date());
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflictingEvents, setConflictingEvents] = useState<
    ConflictingEvent[]
  >([]);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [hasWedding, setHasWedding] = useState(false);
  const [hasOtherEvents, setHasOtherEvents] = useState(false);
  const [calendarConflictData, setCalendarConflictData] =
    useState<CalendarConflictData>({});
  const [isLoadingCalendarData, setIsLoadingCalendarData] = useState(false);
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  const [isCheckingDateConflicts, setIsCheckingDateConflicts] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const calendarDataLoadedRef = useRef<Set<string>>(new Set());
  const conflictCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create a stable update function that only updates specific fields
  const updateField = useCallback(
    (field: string, value: any) => {
      onUpdate({ [field]: value });
    },
    [onUpdate]
  );

  // Create a stable update function for multiple fields
  const updateFields = useCallback(
    (updates: Partial<typeof initialData>) => {
      onUpdate(updates);
    },
    [onUpdate]
  );

  // Update date when data changes (e.g., from booking lookup)
  useEffect(() => {
    if (initialData.date) {
      try {
        const parsedDate = new Date(initialData.date);
        if (!isNaN(parsedDate.getTime())) {
          setDate(parsedDate);
        }
      } catch (error) {
        console.error("Error parsing date:", initialData.date, error);
      }
    }
  }, [initialData.date]);

  // Set default start time if not already set - only run once on mount
  useEffect(() => {
    if (!initialData.startTime) {
      const updates: Partial<typeof initialData> = {};
      updates.startTime = "10:00";

      console.log("Setting default start time:", updates);
      updateFields(updates);
    }
    
    // Set default end time if not already set
    if (!initialData.endTime) {
      const updates: Partial<typeof initialData> = {};
      updates.endTime = "18:00";

      console.log("Setting default end time:", updates);
      updateFields(updates);
    }

    // Mark initialization as complete
    setIsInitialLoad(false);
  }, []); // Empty dependency array - only run once

  // Trigger conflict check when component mounts with default times
  useEffect(() => {
    if (initialData.startTime && initialData.endTime && date) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        checkForConflicts();
      }, 100);
    }
  }, [initialData.startTime, initialData.endTime, date]);

  // Generate sample heat map data based on actual events from database
  const generateSampleHeatMapData = (
    startDate: string,
    endDate: string
  ): CalendarConflictData => {
    const sampleData: CalendarConflictData = {};

    // Based on actual events from database for July 2025
    if (startDate.includes("2025-07")) {
      // July 3: Multiple events (orange)
      sampleData["2025-07-03"] = {
        hasWedding: false,
        hasOtherEvents: true,
        eventCount: 2,
        events: [{ event_type_id: 5, event_type_name: "Others", count: 2 }],
      };

      // July 8: Anniversary (yellow)
      sampleData["2025-07-08"] = {
        hasWedding: false,
        hasOtherEvents: true,
        eventCount: 1,
        events: [
          { event_type_id: 2, event_type_name: "Anniversary", count: 1 },
        ],
      };

      // July 9: Jesse Wedding (yellow - but listed as Anniversary in DB)
      sampleData["2025-07-09"] = {
        hasWedding: false,
        hasOtherEvents: true,
        eventCount: 1,
        events: [
          { event_type_id: 2, event_type_name: "Anniversary", count: 1 },
        ],
      };

      // July 10: Event with Payment Proof (yellow)
      sampleData["2025-07-10"] = {
        hasWedding: false,
        hasOtherEvents: true,
        eventCount: 1,
        events: [{ event_type_id: 5, event_type_name: "Others", count: 1 }],
      };

      // July 11: Wedding + Montreal Wedding (red - multiple with wedding)
      sampleData["2025-07-11"] = {
        hasWedding: true,
        hasOtherEvents: true,
        eventCount: 2,
        events: [
          { event_type_id: 1, event_type_name: "Wedding", count: 1 },
          { event_type_id: 1, event_type_name: "Wedding", count: 1 },
        ],
      };

      // July 12: Another Fix v2 (yellow)
      sampleData["2025-07-12"] = {
        hasWedding: false,
        hasOtherEvents: true,
        eventCount: 1,
        events: [{ event_type_id: 5, event_type_name: "Others", count: 1 }],
      };

      // July 13: V3 - Payment Method Attempt (yellow)
      sampleData["2025-07-13"] = {
        hasWedding: false,
        hasOtherEvents: true,
        eventCount: 1,
        events: [{ event_type_id: 5, event_type_name: "Others", count: 1 }],
      };

      // July 18: Test Event (yellow)
      sampleData["2025-07-18"] = {
        hasWedding: false,
        hasOtherEvents: true,
        eventCount: 1,
        events: [{ event_type_id: 5, event_type_name: "Others", count: 1 }],
      };

      // July 23: Montreal Wedding (yellow - Anniversary in DB)
      sampleData["2025-07-23"] = {
        hasWedding: false,
        hasOtherEvents: true,
        eventCount: 1,
        events: [{ event_type_id: 5, event_type_name: "Others", count: 1 }],
      };

      // July 31: Event Name (yellow)
      sampleData["2025-07-31"] = {
        hasWedding: false,
        hasOtherEvents: true,
        eventCount: 1,
        events: [{ event_type_id: 5, event_type_name: "Others", count: 1 }],
      };
    } else {
      // For other months, generate generic sample data
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Sample wedding (red, blocked)
      const weddingDate = new Date(currentYear, currentMonth, 15);
      sampleData[format(weddingDate, "yyyy-MM-dd")] = {
        hasWedding: true,
        hasOtherEvents: false,
        eventCount: 1,
        events: [{ event_type_id: 1, event_type_name: "Wedding", count: 1 }],
      };

      // Sample events on different dates
      const eventDates = [8, 22, 28];
      eventDates.forEach((day, index) => {
        const eventDate = new Date(currentYear, currentMonth, day);
        const dateString = format(eventDate, "yyyy-MM-dd");

        sampleData[dateString] = {
          hasWedding: false,
          hasOtherEvents: true,
          eventCount: index + 1,
          events: [
            {
              event_type_id: index + 2,
              event_type_name: "Others",
              count: index + 1,
            },
          ],
        };
      });
    }

    console.log(
      "Generated sample data for date range:",
      startDate,
      "to",
      endDate
    );
    console.log("Sample data:", sampleData);
    return sampleData;
  };

  // Load calendar conflict data when component mounts or date changes
  useEffect(() => {
    if (date) {
      loadCalendarConflictData();
    } else {
      // Load real data for July 2025 by default to show actual events from database
      const july2025 = new Date(2025, 6, 1); // July 2025
      loadCalendarConflictData(july2025);
    }
  }, [date]); // Only depend on date changes

  // Check for conflicts when date or time changes
  useEffect(() => {
    if (
      initialData.date &&
      initialData.startTime &&
      initialData.endTime
    ) {
      // Clear any existing timeout
      if (conflictCheckTimeoutRef.current) {
        clearTimeout(conflictCheckTimeoutRef.current);
      }

      // Add a debounced delay to prevent excessive API calls
      conflictCheckTimeoutRef.current = setTimeout(() => {
        checkForConflicts();
      }, 500); // Increased delay to 500ms for better debouncing

      return () => {
        if (conflictCheckTimeoutRef.current) {
          clearTimeout(conflictCheckTimeoutRef.current);
        }
      };
    }
  }, [
    initialData.date,
    initialData.startTime,
    initialData.endTime,
  ]);

  // Notify parent component about conflicts - only when conflicts change
  useEffect(() => {
    if (initialData.hasConflicts !== hasConflicts) {
      console.log("Updating parent with conflict status:", hasConflicts);
      updateField("hasConflicts", hasConflicts);
    }
  }, [hasConflicts, initialData.hasConflicts, updateField]); // Only depend on conflict status changes

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (conflictCheckTimeoutRef.current) {
        clearTimeout(conflictCheckTimeoutRef.current);
      }
    };
  }, []);

  const loadCalendarConflictData = useCallback(
    async (targetDate?: Date) => {
      const dateToUse = targetDate || date || new Date();
      const monthKey = format(dateToUse, "yyyy-MM");

      // Check if we've already loaded data for this month
      if (calendarDataLoadedRef.current.has(monthKey)) {
        console.log("Calendar data already loaded for:", monthKey);
        return;
      }

      setIsLoadingCalendarData(true);
      try {
        const startDate = format(startOfMonth(dateToUse), "yyyy-MM-dd");
        const endDate = format(endOfMonth(dateToUse), "yyyy-MM-dd");

        console.log(
          "Loading calendar data for range:",
          startDate,
          "to",
          endDate
        );

        // Use axios like in events page for consistency
        const response = await axios.post(
          "http://localhost/events-api/admin.php",
          {
            operation: "getCalendarConflictData",
            start_date: startDate,
            end_date: endDate,
          }
        );

        console.log("Calendar conflict data response:", response.data);

        if (response.data.status === "success") {
          setCalendarConflictData(response.data.calendarData || {});
          console.log(
            "✅ Successfully loaded real calendar data:",
            response.data.calendarData
          );

          // Count total events loaded for logging
          const totalEvents = Object.values(
            response.data.calendarData || {}
          ).reduce(
            (sum: number, dayData: any) => sum + (dayData.eventCount || 0),
            0
          );

          console.log(
            `📊 Found ${totalEvents} events for ${format(dateToUse, "MMMM yyyy")}`
          );

          // Mark this month as loaded
          calendarDataLoadedRef.current.add(monthKey);
        } else {
          console.error(
            "❌ API Error loading calendar data:",
            response.data.message
          );

          // If API fails, show sample data for demonstration
          const sampleData = generateSampleHeatMapData(startDate, endDate);
          setCalendarConflictData(sampleData);
          console.log("Using sample heat map data:", sampleData);

          toast({
            title: "API Error - Using Sample Data",
            description:
              response.data.message || "Calendar API returned an error",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("❌ Network error loading calendar data:", error);

        // If network fails, show sample data
        const startDate = format(startOfMonth(dateToUse), "yyyy-MM-dd");
        const endDate = format(endOfMonth(dateToUse), "yyyy-MM-dd");
        const sampleData = generateSampleHeatMapData(startDate, endDate);
        setCalendarConflictData(sampleData);
        console.log(
          "Using sample heat map data due to network error:",
          sampleData
        );

        toast({
          title: "Network Error - Using Sample Data",
          description:
            "Cannot connect to server. Showing sample heat map data.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCalendarData(false);
        // Mark initial load as complete after first calendar data load
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      }
    },
    [date, isInitialLoad]
  );

  const handleDateSelect = async (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    console.log("Date selected:", selectedDate);
    setClickedDate(selectedDate);
    setIsCheckingDateConflicts(true);

    const formattedDate = format(selectedDate, "yyyy-MM-dd");

    // Check if this date has existing events
    const dateData = calendarConflictData[formattedDate];

    try {
      // Update the date state immediately
      setDate(selectedDate);
      console.log("Updating with date:", formattedDate);
      updateField("date", formattedDate);

      // Always check for conflicts when a date is selected
      if (initialData.startTime && initialData.endTime) {
        // Force a fresh conflict check for the selected date
        await checkForConflicts();
      }

      // Show immediate feedback about the selected date
      if (dateData && (dateData.hasWedding || dateData.hasOtherEvents)) {
        if (dateData.hasWedding) {
          toast({
            title: "Wedding Scheduled",
            description: `This date has a wedding event. Only one wedding per day is allowed.`,
            variant: "destructive",
          });
        } else if (dateData.hasOtherEvents && dateData.eventCount > 1) {
          toast({
            title: "Multiple Events Scheduled",
            description: `This date has ${dateData.eventCount} events. Check for time conflicts.`,
            variant: "default",
          });
        }
      }
    } catch (error) {
      console.error("Error in handleDateSelect:", error);
    } finally {
      setIsCheckingDateConflicts(false);
      setClickedDate(null);
    }
  };

  const handleTimeChange = (field: "startTime" | "endTime", value: string) => {
    console.log(`Time changed - ${field}:`, value);

    // Validate that start time is before end time
    if (
      field === "startTime" &&
      initialData.endTime &&
      value >= initialData.endTime
    ) {
      toast({
        title: "Invalid Time",
        description: "Start time must be before end time",
        variant: "destructive",
      });
      return;
    }

    if (
      field === "endTime" &&
      initialData.startTime &&
      value <= initialData.startTime
    ) {
      toast({
        title: "Invalid Time",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    console.log("Updating with time:", field, value);
    updateField(field, value);

    // Clear any existing timeout
    if (conflictCheckTimeoutRef.current) {
      clearTimeout(conflictCheckTimeoutRef.current);
    }

    // Check for conflicts when time changes - with debouncing
    conflictCheckTimeoutRef.current = setTimeout(() => {
      checkForConflicts();
    }, 300); // Shorter delay for time changes
  };

  const checkForConflicts = useCallback(async () => {
    console.log(
      "🔍 Checking conflicts - date:",
      date,
      "startTime:",
      initialData.startTime,
      "endTime:",
      initialData.endTime
    );

    if (!date || !initialData.startTime || !initialData.endTime) {
      console.log("⏭️ Skipping conflict check - missing required data");
      setHasConflicts(false);
      setHasWedding(false);
      setHasOtherEvents(false);
      setConflictingEvents([]);
      updateField("hasConflicts", false);
      return;
    }

    setIsCheckingConflicts(true);

    try {
      const eventDate = format(date, "yyyy-MM-dd");
      console.log("Checking conflicts for date:", eventDate);

      // Use axios for consistency with other API calls
      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "checkEventConflicts",
          event_date: eventDate,
          start_time: initialData.startTime,
          end_time: initialData.endTime,
          exclude_event_id: "", // New event
        }
      );

      console.log("Conflict check response:", response.data);

      if (response.data.status === "success") {
        const hasConflictsFound = response.data.hasConflicts || false;
        const hasWeddingFound = response.data.hasWedding || false;
        const hasOtherEventsFound = response.data.hasOtherEvents || false;

        setHasConflicts(hasConflictsFound);
        setHasWedding(hasWeddingFound);
        setHasOtherEvents(hasOtherEventsFound);
        setConflictingEvents(response.data.conflicts || []);

        // Update parent component with conflict status
        updateField("hasConflicts", hasConflictsFound);
        
        console.log("✅ Conflict check completed - hasConflicts:", hasConflictsFound);
      } else {
        console.error("Error checking conflicts:", response.data.message);
        setHasConflicts(false);
        setHasWedding(false);
        setHasOtherEvents(false);
        setConflictingEvents([]);
        updateField("hasConflicts", false);
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
      setHasConflicts(false);
      setHasWedding(false);
      setHasOtherEvents(false);
      setConflictingEvents([]);
      updateField("hasConflicts", false);
    } finally {
      setIsCheckingConflicts(false);
    }
  }, [
    date,
    initialData.startTime,
    initialData.endTime,
    updateField,
  ]);

  // Get heat map color based on event count
  const getHeatMapColor = (eventCount: number, hasWedding: boolean) => {
    if (hasWedding) {
      return "bg-red-500"; // Wedding - always red and blocked
    }

    if (eventCount === 0) {
      return "bg-white"; // No events - very light green
    } else if (eventCount === 1) {
      return "bg-yellow-200"; // One event - light yellow
    } else if (eventCount === 2) {
      return "bg-orange-300"; // Two events - orange
    } else if (eventCount >= 3) {
      return "bg-red-300"; // Three or more events - light red
    }

    return "bg-gray-50"; // Default
  };

  // Get text color for heat map
  const getHeatMapTextColor = (eventCount: number, hasWedding: boolean) => {
    if (hasWedding || eventCount >= 3) {
      return "text-white";
    }
    return "text-gray-900";
  };

  // Custom calendar day renderer with heat map
  const renderCalendarDay = (day: Date) => {
    const dateString = format(day, "yyyy-MM-dd");
    const dayData = calendarConflictData[dateString];
    const isSelected = date && isSameDay(day, date);
    const isClickedDate = clickedDate && isSameDay(day, clickedDate);

    const eventCount = dayData?.eventCount || 0;
    const hasWedding = dayData?.hasWedding || false;

    const heatMapBgColor = getHeatMapColor(eventCount, hasWedding);
    const heatMapTextColor = getHeatMapTextColor(eventCount, hasWedding);

    return (
      <button
        className={cn(
          "relative w-9 h-9 text-sm font-medium rounded-md transition-all duration-200",
          "flex items-center justify-center",
          heatMapBgColor,
          heatMapTextColor,
          isSelected && "ring-2 ring-blue-500 ring-offset-1",
          isClickedDate &&
            isCheckingDateConflicts &&
            "animate-pulse ring-2 ring-yellow-400",
          "hover:bg-gray-100 focus:bg-gray-100"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDateSelect(day);
        }}
        style={{ border: "none", boxShadow: "none" }}
      >
        <span>{format(day, "d")}</span>

        {/* Event count indicator for multiple events */}
        {eventCount > 1 && (
          <div className="absolute -top-1 -right-1 z-10">
            <div
              className={cn(
                "text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-sm border border-white",
                hasWedding ? "bg-red-700 text-white" : "bg-blue-600 text-white"
              )}
            >
              {eventCount}
            </div>
          </div>
        )}

        {/* Loading indicator for clicked date */}
        {isClickedDate && isCheckingDateConflicts && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-md z-20">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          </div>
        )}
      </button>
    );
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const displayTime = format(
          new Date(`2000-01-01T${timeString}`),
          "h:mm a"
        );
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="event-title">
              Event Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="event-title"
              value={initialData.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Enter event title"
              required
            />
          </div>
        </div>

        {/* Event Theme Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="event-theme">
            Event Theme <span className="text-red-500">*</span>
          </Label>
          <Select
            value={initialData.theme || ""}
            onValueChange={(value) => updateField("theme", value)}
          >
            <SelectTrigger id="event-theme">
              <SelectValue placeholder="Select event theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classic-elegance">Classic Elegance</SelectItem>
              <SelectItem value="modern-minimalist">
                Modern Minimalist
              </SelectItem>
              <SelectItem value="rustic-garden">Rustic Garden</SelectItem>
              <SelectItem value="vintage-romance">Vintage Romance</SelectItem>
              <SelectItem value="boho-chic">Boho Chic</SelectItem>
              <SelectItem value="tropical-paradise">
                Tropical Paradise
              </SelectItem>
              <SelectItem value="winter-wonderland">
                Winter Wonderland
              </SelectItem>
              <SelectItem value="fairy-tale">Fairy Tale</SelectItem>
              <SelectItem value="art-deco">Art Deco</SelectItem>
              <SelectItem value="beach-themed">Beach Themed</SelectItem>
              <SelectItem value="cultural-traditional">
                Cultural Traditional
              </SelectItem>
              <SelectItem value="color-coordinated">
                Color Coordinated
              </SelectItem>
              <SelectItem value="custom">Custom Theme</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Church Location for Wedding Events */}
        {initialData.type === "wedding" && (
          <div className="space-y-2">
            <Label htmlFor="church-location">
              Church Location <span className="text-red-500">*</span>
            </Label>
            <Input
              id="church-location"
              value={initialData.churchLocation || ""}
              onChange={(e) => updateField("churchLocation", e.target.value)}
              placeholder="Enter church name and address"
              required
            />
          </div>
        )}

        {/* Church Start Time for Wedding Events */}
        {initialData.type === "wedding" && (
          <div className="space-y-2">
            <Label htmlFor="church-start-time">
              Church Start Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="church-start-time"
              type="time"
              value={initialData.churchStartTime || ""}
              onChange={(e) => updateField("churchStartTime", e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              This is the time the wedding ceremony starts at the church
            </p>
          </div>
        )}

        {/* Enhanced Date and Time Selection Section with Heat Map Calendar */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Date & Time Selection with Event Heat Map
          </h3>

          {/* Heat Map Guide */}
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Heat Map Guide:
            </h4>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-50 border rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-200 border rounded"></div>
                <span>1 Event</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-orange-300 border rounded"></div>
                <span>2 Events</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-300 border rounded"></div>
                <span>3+ Events</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 border rounded"></div>
                {/* <Heart className="h-3 w-3 text-white fill-white absolute" /> */}
                <span>Wedding (Blocked)</span>
              </div>
            </div>
            
            {/* Calendar loading indicator */}
            {isLoadingCalendarData && (
              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span>Loading event data for this month...</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Date Selection with Heat Map */}
            <div className="space-y-2">
              <Label htmlFor="event-date">
                Event Date <span className="text-red-500">*</span>
                {hasConflicts && (
                  <span className="text-red-500 ml-2">Conflict detected</span>
                )}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="event-date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white hover:bg-gray-50",
                      !date && "text-muted-foreground",
                      hasConflicts && "border-red-500 border-2 shadow-red-100"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  {/* Loading indicator for calendar data */}
                  {isLoadingCalendarData && (
                    <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-md">
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Loading calendar data...
                      </div>
                    </div>
                  )}

                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    onMonthChange={(newMonth) => {
                      console.log("Month changed to:", newMonth);
                      // Load data for the new month
                      loadCalendarConflictData(newMonth);
                    }}
                    defaultMonth={date}
                    disabled={(checkDate) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dateToCheck = new Date(checkDate);
                      dateToCheck.setHours(0, 0, 0, 0);
                      return dateToCheck < today;
                    }}
                    initialFocus
                    className="rounded-md border"
                    components={{
                      Day: ({ date: dayDate, ...props }: any) => {
                        const day = new Date(dayDate);
                        const { displayMonth, className, ...domProps } = props;
                        const isOutsideMonth =
                          displayMonth &&
                          (day.getMonth() !== displayMonth.getMonth() ||
                            day.getFullYear() !== displayMonth.getFullYear());
                        return (
                          <div
                            className={cn(
                              "flex items-center justify-center p-0 h-9 w-9",
                              className,
                              isOutsideMonth && "pointer-events-none opacity-40"
                            )}
                          >
                            {renderCalendarDay(day)}
                          </div>
                        );
                      },
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Start Time with Circular Picker */}
            <div className="space-y-2">
              <CircularTimePicker
                value={initialData.startTime || "10:00"}
                onChange={(value) => handleTimeChange("startTime", value)}
                label={
                  <span>
                    Start Time <span className="text-red-500">*</span>
                  </span>
                }
                hasConflict={hasConflicts}
              />
            </div>
          </div>

          {/* Time Duration Display */}
          {initialData.startTime && initialData.endTime && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Event Duration:</span>
                <span className="font-medium text-gray-900">
                  {(() => {
                    const start = new Date(
                      `2000-01-01T${initialData.startTime}`
                    );
                    const end = new Date(`2000-01-01T${initialData.endTime}`);
                    const diffMs = end.getTime() - start.getTime();
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMinutes = Math.floor(
                      (diffMs % (1000 * 60 * 60)) / (1000 * 60)
                    );
                    return `${diffHours}h ${diffMinutes}m`;
                  })()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Conflict checking indicator and manual refresh */}
        <div className="flex items-center justify-between">
          {(isCheckingConflicts || isCheckingDateConflicts) && (
            <div className="flex items-center gap-3 text-sm text-blue-600 bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div className="flex flex-col">
                <span className="font-medium">
                  {isCheckingDateConflicts
                    ? "Checking date availability..."
                    : "Checking for scheduling conflicts..."}
                </span>
                <span className="text-xs text-blue-500">
                  Please wait while we verify your selected date and time
                </span>
              </div>
            </div>
          )}

          {/* Manual refresh button for debugging */}
          {initialData.date && initialData.startTime && initialData.endTime && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log("🔄 Manual conflict check triggered");
                checkForConflicts();
              }}
              disabled={isCheckingConflicts || isCheckingDateConflicts}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh Conflicts
            </Button>
          )}
        </div>

        {/* Loading state when checking conflicts - show before results */}
        {(isCheckingConflicts || isCheckingDateConflicts) && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-md font-bold text-blue-800">
                    Checking Availability
                  </h4>
                </div>
                <p className="text-blue-700 font-medium mb-3">
                  {isCheckingDateConflicts
                    ? "Verifying if the selected date is available for your event..."
                    : "Analyzing potential scheduling conflicts with existing events..."}
                </p>
                <div className="bg-blue-100 border-l-4 border-blue-500 p-3 rounded-r-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-blue-800 text-sm font-medium">
                      Please wait while we check the database...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Success message when no conflicts */}
        {!hasConflicts &&
          !isCheckingConflicts &&
          !isCheckingDateConflicts &&
          initialData.date &&
          initialData.startTime &&
          initialData.endTime && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-md font-bold text-green-800">
                      No Conflicts Found
                    </h4>
                  </div>
                  <p className="text-green-700 font-medium mb-3">
                    Your selected date and time slot is completely available.
                  </p>
                  <div className="bg-green-100 border-l-4 border-green-500 p-3 rounded-r-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-800 text-sm font-medium">
                        You can proceed to the next step with confidence!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Show conflict warning when conflicts exist */}
        {hasConflicts && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-xl font-bold text-red-800">
                    Scheduling Conflicts Detected
                  </h4>
                </div>

                {/* Business rule explanation */}
                {hasWedding && (
                  <div className="bg-red-100 border-l-4 border-red-500 p-3 rounded-r-lg mb-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-bold text-red-900">
                          Business Rule Violation
                        </p>
                        <p className="text-red-800 text-sm">
                          Only one wedding is allowed per day. Please select a
                          different date.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {hasOtherEvents &&
                  initialData.type === "wedding" &&
                  !hasWedding && (
                    <div className="bg-orange-100 border-l-4 border-orange-500 p-3 rounded-r-lg mb-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-bold text-orange-900">
                            Business Rule Violation
                          </p>
                          <p className="text-orange-800 text-sm">
                            Weddings cannot be scheduled alongside other events.
                            Please select a different date.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                <p className="text-red-700 font-medium mb-4">
                  The following events overlap with your selected time slot:
                </p>

                <div className="space-y-3 mb-4">
                  {conflictingEvents.map((event) => (
                    <div
                      key={event.event_id}
                      className="bg-white p-4 rounded-lg border-2 border-red-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-bold text-red-800 text-lg">
                              {event.event_title}
                            </div>
                            {event.event_type_id === 1 && (
                              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                            )}
                            {event.event_type_id !== 1 && (
                              <Users className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                          <div className="text-red-700 text-sm space-y-1">
                            <div className="flex items-center gap-4">
                              <span>
                                <strong>Type:</strong> {event.event_type_name}
                              </span>
                              <span>
                                <strong>Client:</strong> {event.client_name}
                              </span>
                              <span>
                                <strong>Venue:</strong>{" "}
                                {event.venue_name || "TBD"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <strong>Time:</strong>{" "}
                              {format(
                                new Date(`2000-01-01T${event.start_time}`),
                                "h:mm a"
                              )}{" "}
                              -{" "}
                              {format(
                                new Date(`2000-01-01T${event.end_time}`),
                                "h:mm a"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-r-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-red-900 text-lg">
                        Action Required
                      </p>
                      <p className="text-red-800 text-sm mt-1">
                        Please select a different date or time to avoid
                        scheduling conflicts. You cannot proceed to the next
                        step until this is resolved.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug section for troubleshooting
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Info:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Date: {initialData.date || 'Not set'}</div>
            <div>Start Time: {initialData.startTime || 'Not set'}</div>
            <div>End Time: {initialData.endTime || 'Not set'}</div>
            <div>Has Conflicts: {hasConflicts ? 'Yes' : 'No'}</div>
            <div>Has Wedding: {hasWedding ? 'Yes' : 'No'}</div>
            <div>Has Other Events: {hasOtherEvents ? 'Yes' : 'No'}</div>
            <div>Conflicting Events Count: {conflictingEvents.length}</div>
            <div>Is Initializing: {isInitialLoad ? 'Yes' : 'No'}</div>
            <div>Is Checking Conflicts: {isCheckingConflicts ? 'Yes' : 'No'}</div>
            <div>Is Checking Date Conflicts: {isCheckingDateConflicts ? 'Yes' : 'No'}</div>
            <div>Is Loading Calendar Data: {isLoadingCalendarData ? 'Yes' : 'No'}</div>
          </div>
        </div> */}

        <div className="space-y-2">
          <Label htmlFor="event-notes">Additional Notes</Label>
          <Textarea
            id="event-notes"
            value={initialData.notes || ""}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Enter any additional notes or requirements"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
