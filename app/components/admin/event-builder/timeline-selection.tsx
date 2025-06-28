"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addHours, parse, isValid, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Clock,
  GripVertical,
  Plus,
  Trash2,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  TimelineItem,
  TimelineStepProps,
} from "@/app/types/event-builder";

export function TimelineStep({
  data,
  eventDate,
  components,
  suppliers,
  updateData,
  onNext,
}: TimelineStepProps) {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(
    data || []
  );
  const [eventDateObj, setEventDateObj] = useState<Date | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Parse event date string to Date object
  useEffect(() => {
    if (eventDate) {
      const dateObj = new Date(eventDate);
      setEventDateObj(dateObj);
    }
  }, [eventDate]);

  // Initialize timeline items if empty
  useEffect(() => {
    if (
      components?.length > 0 &&
      timelineItems.length === 0 &&
      eventDateObj &&
      updateData
    ) {
      const initialItems = components.map((component, index) => {
        // Create a time 2 hours apart for each component, starting from 8 AM
        const startTime = addHours(
          new Date(eventDateObj).setHours(8, 0, 0, 0),
          index * 2
        );

        return {
          id: `timeline-${Date.now()}-${index}`,
          componentId: component.id || "",
          componentName: component.name,
          category: component.category || "",
          date: new Date(eventDateObj),
          startTime: format(startTime, "HH:mm"),
          endTime: format(addHours(startTime, 1), "HH:mm"),
          location: "",
          notes: "",
          supplierId: "",
          supplierName: "",
          status: "pending",
          priority: "medium",
          assignedTo: "",
          dependencies: [],
        };
      });

      setTimelineItems(initialItems);
      updateData(initialItems);
    }
  }, [components, eventDateObj, timelineItems.length, updateData]);

  // Update a timeline item
  const updateTimelineItem = (
    itemId: string,
    field: keyof TimelineItem,
    value: any
  ) => {
    if (!updateData) return;

    const updatedItems = timelineItems.map((item) => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });

    setTimelineItems(updatedItems);
    updateData(updatedItems);
  };

  // Add a new timeline item
  const addTimelineItem = () => {
    if (!eventDateObj) return;

    // Find the latest end time to start the new item after
    let latestEndTime = new Date(eventDateObj).setHours(8, 0, 0, 0);

    if (timelineItems.length > 0) {
      timelineItems.forEach((item) => {
        const endTimeParts = item.endTime.split(":");
        const endTimeDate = new Date(eventDateObj);
        endTimeDate.setHours(
          Number.parseInt(endTimeParts[0], 10),
          Number.parseInt(endTimeParts[1], 10),
          0,
          0
        );

        if (endTimeDate.getTime() > latestEndTime) {
          latestEndTime = endTimeDate.getTime();
        }
      });
    }

    // Add 15 minutes buffer
    const startTime = addMinutes(new Date(latestEndTime), 15);
    const endTime = addHours(startTime, 1);

    const newItem: TimelineItem = {
      id: `timeline-${Date.now()}`,
      componentId: "",
      componentName: "",
      category: "",
      date: new Date(eventDateObj),
      startTime: format(startTime, "HH:mm"),
      endTime: format(endTime, "HH:mm"),
      location: "",
      notes: "",
      supplierId: "",
      supplierName: "",
      status: "pending",
      priority: "medium",
      assignedTo: "",
      dependencies: [],
    };

    const updatedItems = [...timelineItems, newItem];
    setTimelineItems(updatedItems);
    updateData(updatedItems);
  };

  // Remove a timeline item
  const removeTimelineItem = (itemId: string) => {
    const updatedItems = timelineItems.filter((item) => item.id !== itemId);
    setTimelineItems(updatedItems);
    updateData(updatedItems);
  };

  // Move a timeline item up or down
  const moveTimelineItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === timelineItems.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updatedItems = [...timelineItems];
    const item = updatedItems[index];

    updatedItems.splice(index, 1);
    updatedItems.splice(newIndex, 0, item);

    setTimelineItems(updatedItems);
    updateData(updatedItems);
  };

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  // Handle drag over
  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const updatedItems = [...timelineItems];
    const draggedItem = updatedItems[draggedItemIndex];

    // Remove the dragged item
    updatedItems.splice(draggedItemIndex, 1);
    // Insert it at the new position
    updatedItems.splice(index, 0, draggedItem);

    setTimelineItems(updatedItems);
    setDraggedItemIndex(index);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedItemIndex(null);
    updateData(timelineItems);
  };

  // Format time for display
  const formatTimeDisplay = (timeString: string | undefined) => {
    if (!timeString) return "";

    try {
      const date = parse(timeString, "HH:mm", new Date());
      if (!isValid(date)) return timeString;
      return format(date, "h:mm a");
    } catch (error) {
      return timeString;
    }
  };

  // Check for timeline conflicts
  const checkTimelineConflicts = () => {
    const conflicts: Array<{ item1: string; item2: string; message: string }> =
      [];

    // Sort items by start time for easier comparison
    const sortedItems = [...timelineItems].sort((a, b) => {
      const aTime = a.startTime.split(":").map(Number);
      const bTime = b.startTime.split(":").map(Number);

      if (aTime[0] !== bTime[0]) return aTime[0] - bTime[0];
      return aTime[1] - bTime[1];
    });

    // Check for overlaps
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const current = sortedItems[i];
      const next = sortedItems[i + 1];

      const currentEnd = current.endTime.split(":").map(Number);
      const nextStart = next.startTime.split(":").map(Number);

      // Convert to minutes for easier comparison
      const currentEndMinutes = currentEnd[0] * 60 + currentEnd[1];
      const nextStartMinutes = nextStart[0] * 60 + nextStart[1];

      if (currentEndMinutes > nextStartMinutes) {
        conflicts.push({
          item1: current.id,
          item2: next.id,
          message: `"${current.componentName}" overlaps with "${next.componentName}"`,
        });
      }
    }

    return conflicts;
  };

  const conflicts = checkTimelineConflicts();

  if (!eventDateObj) {
    return (
      <div className="flex items-center justify-center h-32">
        <p>Please set an event date first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Event Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Schedule the activities for your event on{" "}
            {new Date(eventDate).toLocaleDateString()}
          </p>
        </div>
        <Button onClick={addTimelineItem}>
          <Plus className="h-4 w-4 mr-2" />
          Add Activity
        </Button>
      </div>

      {conflicts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-yellow-700 mb-2">
            <AlertCircle className="h-4 w-4" />
            <h4 className="font-medium">Timeline Conflicts</h4>
          </div>
          <ul className="space-y-1 text-sm text-yellow-600">
            {conflicts.map((conflict, index) => (
              <li key={index}>{conflict.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {timelineItems.map((item, index) => (
          <Card
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className="relative"
          >
            <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-move opacity-20 hover:opacity-100">
              <GripVertical className="h-4 w-4" />
            </div>
            <CardContent className="p-4 pl-8">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`startTime-${item.id}`}>Start Time</Label>
                    <Input
                      id={`startTime-${item.id}`}
                      type="time"
                      value={item.startTime}
                      onChange={(e) =>
                        updateTimelineItem(item.id, "startTime", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`endTime-${item.id}`}>End Time</Label>
                    <Input
                      id={`endTime-${item.id}`}
                      type="time"
                      value={item.endTime}
                      onChange={(e) =>
                        updateTimelineItem(item.id, "endTime", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`componentName-${item.id}`}>Activity</Label>
                  <Select
                    value={item.componentId}
                    onValueChange={(value) => {
                      const component = components.find((c) => c.id === value);
                      if (component) {
                        updateTimelineItem(item.id, "componentId", value);
                        updateTimelineItem(
                          item.id,
                          "componentName",
                          component.name
                        );
                        updateTimelineItem(
                          item.id,
                          "category",
                          component.category
                        );
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder="Select an activity"
                        className="w-full"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {components.map((component) => (
                        <SelectItem key={component.id} value={component.id}>
                          {component.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`location-${item.id}`}>Location</Label>
                  <Input
                    id={`location-${item.id}`}
                    value={item.location}
                    onChange={(e) =>
                      updateTimelineItem(item.id, "location", e.target.value)
                    }
                    placeholder="Enter location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`notes-${item.id}`}>Notes</Label>
                  <Textarea
                    id={`notes-${item.id}`}
                    value={item.notes}
                    onChange={(e) =>
                      updateTimelineItem(item.id, "notes", e.target.value)
                    }
                    placeholder="Add any notes or special instructions"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`status-${item.id}`}>Status</Label>
                    <Select
                      value={item.status}
                      onValueChange={(value: TimelineItem["status"]) =>
                        updateTimelineItem(item.id, "status", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`priority-${item.id}`}>Priority</Label>
                    <Select
                      value={item.priority}
                      onValueChange={(value: TimelineItem["priority"]) =>
                        updateTimelineItem(item.id, "priority", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveTimelineItem(index, "up")}
                    >
                      ↑
                    </Button>
                  )}
                  {index < timelineItems.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveTimelineItem(index, "down")}
                    >
                      ↓
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTimelineItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Timeline Summary</h4>
        <div className="space-y-2">
          {timelineItems
            .sort((a, b) => {
              const aTime = a.startTime.split(":").map(Number);
              const bTime = b.startTime.split(":").map(Number);

              if (aTime[0] !== bTime[0]) return aTime[0] - bTime[0];
              return aTime[1] - bTime[1];
            })
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTimeDisplay(item.startTime)} -{" "}
                    {formatTimeDisplay(item.endTime)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>{item.componentName}</span>
                  {item.location && (
                    <span className="text-muted-foreground">
                      ({item.location})
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      item.status === "pending"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : item.status === "confirmed"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : item.status === "completed"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="flex justify-end">
        {onNext && (
          <Button
            onClick={onNext}
            className="bg-primary text-white hover:bg-primary/90"
          >
            Next Step
          </Button>
        )}
      </div>
    </div>
  );
}
