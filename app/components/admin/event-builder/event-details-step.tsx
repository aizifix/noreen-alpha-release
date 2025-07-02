"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
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
  client_name: string;
  venue_name: string;
}

export function EventDetailsStep({
  initialData,
  onUpdate,
  onNext,
}: EventDetailsStepProps) {
  const [date, setDate] = useState<Date | undefined>(() => {
    if (initialData.date) {
      try {
        const parsedDate = new Date(initialData.date);
        return !isNaN(parsedDate.getTime()) ? parsedDate : undefined;
      } catch (error) {
        console.error("Error parsing initial date:", initialData.date, error);
        return undefined;
      }
    }
    return undefined;
  });
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflictingEvents, setConflictingEvents] = useState<
    ConflictingEvent[]
  >([]);
  const [hasConflicts, setHasConflicts] = useState(false);

  // Update date when data changes (e.g., from booking lookup)
  useEffect(() => {
    if (initialData.date) {
      try {
        const parsedDate = new Date(initialData.date);
        if (
          !isNaN(parsedDate.getTime()) &&
          (!date || format(date, "yyyy-MM-dd") !== initialData.date)
        ) {
          setDate(parsedDate);
        }
      } catch (error) {
        console.error("Error parsing date:", initialData.date, error);
      }
    }
  }, [initialData.date]);

  // Set default times if not already set
  useEffect(() => {
    if (!initialData.startTime || !initialData.endTime) {
      const defaultData = {
        ...initialData,
        startTime: initialData.startTime || "10:00",
        endTime: initialData.endTime || "18:00",
      };
      console.log("Setting default times:", defaultData);
      onUpdate(defaultData);
    }
  }, []);

  // Check for conflicts when date or time changes
  useEffect(() => {
    if (initialData.date && initialData.startTime && initialData.endTime) {
      checkForConflicts();
    }
  }, [initialData.date, initialData.startTime, initialData.endTime]);

  // Notify parent component about conflicts
  useEffect(() => {
    const updatedData = { ...initialData, hasConflicts };
    console.log("Updating parent with conflict status:", updatedData);
    onUpdate(updatedData);
  }, [hasConflicts]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);

    const formattedDate = selectedDate
      ? format(selectedDate, "yyyy-MM-dd")
      : "";

    const updatedData = {
      ...initialData,
      date: formattedDate,
    };

    onUpdate(updatedData);

    // Check for conflicts when date changes
    if (selectedDate) {
      setTimeout(checkForConflicts, 100);
    }
  };

  const handleTimeChange = (field: "startTime" | "endTime", value: string) => {
    const updatedData = {
      ...initialData,
      [field]: value,
    };

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

    onUpdate(updatedData);

    // Check for conflicts when time changes
    setTimeout(checkForConflicts, 100);
  };

  const checkForConflicts = async () => {
    console.log(
      "Checking conflicts - date:",
      date,
      "startTime:",
      initialData.startTime,
      "endTime:",
      initialData.endTime
    );

    if (!date || !initialData.startTime || !initialData.endTime) {
      console.log("Skipping conflict check - missing required data");
      setHasConflicts(false);
      setConflictingEvents([]);
      onUpdate({ ...initialData, hasConflicts: false });
      return;
    }

    setIsCheckingConflicts(true);

    try {
      const eventDate = format(date, "yyyy-MM-dd");
      console.log("Checking conflicts for date:", eventDate);

      const requestBody = new URLSearchParams({
        operation: "checkEventConflicts",
        event_date: eventDate,
        start_time: initialData.startTime,
        end_time: initialData.endTime,
        exclude_event_id: "", // New event
      });

      const response = await fetch("http://localhost/events-api/admin.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: requestBody,
      });

      const data = await response.json();
      console.log("Conflict check response:", data);

      if (data.status === "success") {
        const hasConflictsFound = data.hasConflicts || false;
        setHasConflicts(hasConflictsFound);
        setConflictingEvents(data.conflicts || []);

        // Update parent component with conflict status
        onUpdate({ ...initialData, hasConflicts: hasConflictsFound });
      } else {
        console.error("Error checking conflicts:", data.message);
        setHasConflicts(false);
        setConflictingEvents([]);
        onUpdate({ ...initialData, hasConflicts: false });
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
      setHasConflicts(false);
      setConflictingEvents([]);
      onUpdate({ ...initialData, hasConflicts: false });
    } finally {
      setIsCheckingConflicts(false);
    }
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
              onChange={(e) =>
                onUpdate({ ...initialData, title: e.target.value })
              }
              placeholder="Enter event title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-type">
              Event Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={initialData.type || "wedding"}
              onValueChange={(value) =>
                onUpdate({ ...initialData, type: value })
              }
            >
              <SelectTrigger id="event-type">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="wedding" value="wedding">
                  Wedding
                </SelectItem>
                <SelectItem key="corporate" value="corporate">
                  Corporate Event
                </SelectItem>
                <SelectItem key="birthday" value="birthday">
                  Birthday
                </SelectItem>
                <SelectItem key="anniversary" value="anniversary">
                  Anniversary
                </SelectItem>
                <SelectItem key="baptism" value="baptism">
                  Baptism
                </SelectItem>
                <SelectItem key="baby-shower" value="baby-shower">
                  Baby Shower
                </SelectItem>
                <SelectItem key="reunion" value="reunion">
                  Reunion
                </SelectItem>
                <SelectItem key="festival" value="festival">
                  Festival
                </SelectItem>
                <SelectItem key="engagement" value="engagement">
                  Engagement Party
                </SelectItem>
                <SelectItem key="christmas" value="christmas">
                  Christmas Party
                </SelectItem>
                <SelectItem key="new-year" value="new-year">
                  New Year's Party
                </SelectItem>
                <SelectItem key="other" value="other">
                  Other
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Event Theme Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="event-theme">
            Event Theme <span className="text-red-500">*</span>
          </Label>
          <Select
            value={initialData.theme || ""}
            onValueChange={(value) =>
              onUpdate({ ...initialData, theme: value })
            }
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

        {/* Enhanced Date and Time Selection Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Date & Time Selection
          </h3>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="event-date">
                Event Date <span className="text-red-500">*</span>
                {hasConflicts && (
                  <span className="text-red-500 ml-2">
                    ⚠️ Conflict detected!
                  </span>
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
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    disabled={(checkDate) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dateToCheck = new Date(checkDate);
                      dateToCheck.setHours(0, 0, 0, 0);
                      return dateToCheck < today;
                    }}
                    initialFocus
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

            {/* End Time with Circular Picker */}
            <div className="space-y-2">
              <CircularTimePicker
                value={initialData.endTime || "18:00"}
                onChange={(value) => handleTimeChange("endTime", value)}
                label={
                  <span>
                    End Time <span className="text-red-500">*</span>
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

        <div className="space-y-2">
          <Label htmlFor="event-capacity">
            Expected Guest Count <span className="text-red-500">*</span>
          </Label>
          <Input
            id="event-capacity"
            type="number"
            min="1"
            value={initialData.capacity || ""}
            onChange={(e) =>
              onUpdate({
                ...initialData,
                capacity: Number.parseInt(e.target.value) || 0,
              })
            }
            placeholder="Number of guests"
            className="max-w-xs"
          />
        </div>

        {/* Conflict checking indicator */}
        {isCheckingConflicts && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Checking for scheduling conflicts...
          </div>
        )}

        {/* Enhanced Conflict warning */}
        {hasConflicts && conflictingEvents.length > 0 && (
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
                    🚨 Scheduling Conflicts Detected!
                  </h4>
                </div>
                <p className="text-red-700 font-medium mb-4">
                  ⚠️ The following events overlap with your selected time slot:
                </p>

                <div className="space-y-3 mb-4">
                  {conflictingEvents.map((event) => (
                    <div
                      key={event.event_id}
                      className="bg-white p-4 rounded-lg border-2 border-red-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-red-800 text-lg mb-1">
                            {event.event_title}
                          </div>
                          <div className="text-red-700 text-sm space-y-1">
                            <div className="flex items-center gap-4">
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

        {/* Enhanced Success message when no conflicts */}
        {!hasConflicts &&
          !isCheckingConflicts &&
          initialData.date &&
          initialData.startTime &&
          initialData.endTime && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xl font-bold text-green-800">
                      ✅ Perfect! No Conflicts Found
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

        <div className="space-y-2">
          <Label htmlFor="event-notes">Additional Notes</Label>
          <Textarea
            id="event-notes"
            value={initialData.notes || ""}
            onChange={(e) =>
              onUpdate({ ...initialData, notes: e.target.value })
            }
            placeholder="Enter any additional notes or requirements"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
