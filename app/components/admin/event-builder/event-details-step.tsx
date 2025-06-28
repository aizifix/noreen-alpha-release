"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, AlertTriangle } from "lucide-react";
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
import { toast } from "@/components/ui/use-toast";

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
  const [date, setDate] = useState<Date | undefined>(
    initialData.date ? new Date(initialData.date) : undefined
  );
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflictingEvents, setConflictingEvents] = useState<
    ConflictingEvent[]
  >([]);
  const [hasConflicts, setHasConflicts] = useState(false);

  // Update date when data changes (e.g., from booking lookup)
  useEffect(() => {
    if (
      initialData.date &&
      (!date || format(date, "yyyy-MM-dd") !== initialData.date)
    ) {
      setDate(new Date(initialData.date));
    }
  }, [initialData.date, date]);

  // Check for conflicts when date or time changes
  useEffect(() => {
    if (initialData.date && initialData.startTime && initialData.endTime) {
      checkForConflicts();
    }
  }, [initialData.date, initialData.startTime, initialData.endTime]);

  // Notify parent component about conflicts
  useEffect(() => {
    onUpdate({ ...initialData, hasConflicts });
  }, [hasConflicts]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    onUpdate({
      ...initialData,
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
    });
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
  };

  const checkForConflicts = async () => {
    if (!initialData.date || !initialData.startTime || !initialData.endTime) {
      return;
    }

    setIsCheckingConflicts(true);
    try {
      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "checkEventConflicts",
          event_date: initialData.date,
          start_time: initialData.startTime,
          end_time: initialData.endTime,
        }
      );

      if (response.data.status === "success") {
        const conflicts = response.data.conflicts || [];
        setConflictingEvents(conflicts);
        setHasConflicts(conflicts.length > 0);
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
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

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="event-date">
              Event Date <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="event-date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
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
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-time">
              Start Time <span className="text-red-500">*</span>
            </Label>
            <Select
              value={initialData.startTime || ""}
              onValueChange={(value) => handleTimeChange("startTime", value)}
            >
              <SelectTrigger id="start-time">
                <SelectValue placeholder="Select start time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-time">
              End Time <span className="text-red-500">*</span>
            </Label>
            <Select
              value={initialData.endTime || ""}
              onValueChange={(value) => handleTimeChange("endTime", value)}
            >
              <SelectTrigger id="end-time">
                <SelectValue placeholder="Select end time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

        {/* Conflict warning */}
        {hasConflicts && conflictingEvents.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-2">
                <p className="font-medium">
                  ⚠️ Scheduling conflicts detected! The following events overlap
                  with your selected time:
                </p>
                <div className="space-y-1">
                  {conflictingEvents.map((event) => (
                    <div
                      key={event.event_id}
                      className="text-sm bg-white p-2 rounded border"
                    >
                      <div className="font-medium">{event.event_title}</div>
                      <div className="text-gray-600">
                        Client: {event.client_name} • Venue:{" "}
                        {event.venue_name || "TBD"}
                      </div>
                      <div className="text-gray-600">
                        Time:{" "}
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
                  ))}
                </div>
                <p className="text-sm">
                  Please choose a different date or time to avoid conflicts.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success message when no conflicts */}
        {!hasConflicts &&
          !isCheckingConflicts &&
          initialData.date &&
          initialData.startTime &&
          initialData.endTime && (
            <Alert className="border-green-200 bg-green-50">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-500"></div>
                <span className="text-green-800 font-medium">
                  ✓ No scheduling conflicts found
                </span>
              </div>
            </Alert>
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
