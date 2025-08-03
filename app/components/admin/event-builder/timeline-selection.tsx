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
}: Omit<TimelineStepProps, "onNext">) {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(
    data || []
  );
  const [eventDateObj, setEventDateObj] = useState<Date | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Debug logging
  console.log("TimelineStep Debug:", {
    hasData: !!data,
    dataLength: data?.length || 0,
    hasEventDate: !!eventDate,
    eventDate,
    hasComponents: !!components,
    componentsLength: components?.length || 0,
    hasUpdateData: !!updateData,
    timelineItemsLength: timelineItems.length,
  });

  // Parse event date string to Date object
  useEffect(() => {
    if (eventDate) {
      const dateObj = new Date(eventDate);
      setEventDateObj(dateObj);
    }
  }, [eventDate]);

  // Initialize timeline items if empty
  useEffect(() => {
    console.log("Timeline initialization check:", {
      componentsLength: components?.length || 0,
      timelineItemsLength: timelineItems.length,
      hasEventDate: !!eventDateObj,
      hasUpdateData: !!updateData,
      components: components,
    });

    if (
      components?.length > 0 &&
      timelineItems.length === 0 &&
      eventDateObj &&
      updateData
    ) {
      console.log("Initializing timeline with components:", components);

      // Deduplicate components to prevent duplicate timeline items
      const uniqueComponents = components.filter(
        (component, index, self) =>
          index ===
          self.findIndex(
            (c) => c.id === component.id && c.category === component.category
          )
      );

      console.log(
        "Deduplicated components:",
        uniqueComponents.length,
        "from",
        components.length
      );

      const initialItems = uniqueComponents.map((component, index) => {
        // Create a time 2 hours apart for each component, starting from 8 AM
        const startTime = addHours(
          new Date(eventDateObj).setHours(8, 0, 0, 0),
          index * 2
        );

        const timelineItem = {
          id: `timeline-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          componentId: component.id || "",
          componentName: component.name || "Unknown Component",
          category: component.category || "",
          date: new Date(eventDateObj),
          startTime: format(startTime, "HH:mm"),
          endTime: format(addHours(startTime, 1), "HH:mm"),
          location: "",
          notes: "",
          supplierId: "",
          supplierName: "",
          status: "pending" as const,
          priority: "medium" as const,
          assignedTo: "",
          dependencies: [],
        };

        console.log("Created timeline item:", timelineItem);
        return timelineItem;
      });

      console.log("Setting timeline items:", initialItems);
      setTimelineItems(initialItems);
      updateData(initialItems);
    } else if (components?.length === 0 && timelineItems.length === 0) {
      console.log("No components available for timeline initialization");
    }
  }, [components, timelineItems.length, eventDateObj, updateData]);

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
      id: `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      status: "pending" as const,
      priority: "medium" as const,
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

  if (!components || components.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900 mb-2">
            No Components Available
          </p>
          <p className="text-gray-600 mb-4">
            Please select a package first to populate the timeline with
            activities.
          </p>
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => {
                // Create a basic timeline item to allow progression
                const basicTimelineItem: TimelineItem = {
                  id: `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  componentId: "manual",
                  componentName: "Manual Activity",
                  category: "general",
                  date: eventDateObj || new Date(),
                  startTime: "09:00",
                  endTime: "10:00",
                  location: "",
                  notes: "Add your event activities here",
                  supplierId: "",
                  supplierName: "",
                  status: "pending",
                  priority: "medium",
                  assignedTo: "",
                  dependencies: [],
                };

                setTimelineItems([basicTimelineItem]);
                if (updateData) {
                  updateData([basicTimelineItem]);
                }
              }}
            >
              Add Basic Timeline
            </Button>
            <div className="text-sm text-gray-500">
              Or click "Next" to skip timeline planning
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Timeline</h2>
          <p className="text-muted-foreground">
            Plan and organize the schedule for your event
          </p>
        </div>
        <div className="flex gap-2">
          {components?.length > 0 && timelineItems.length === 0 && (
            <Button
              onClick={() => {
                if (components?.length > 0 && eventDateObj && updateData) {
                  console.log(
                    "Manually populating timeline with components:",
                    components
                  );

                  // Deduplicate components to prevent duplicate timeline items
                  const uniqueComponents = components.filter(
                    (component, index, self) =>
                      index ===
                      self.findIndex(
                        (c) =>
                          c.id === component.id &&
                          c.category === component.category
                      )
                  );

                  console.log(
                    "Deduplicated components for manual population:",
                    uniqueComponents.length,
                    "from",
                    components.length
                  );

                  const initialItems = uniqueComponents.map(
                    (component, index) => {
                      const startTime = addHours(
                        new Date(eventDateObj).setHours(8, 0, 0, 0),
                        index * 2
                      );

                      return {
                        id: `timeline-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                        componentId: component.id || "",
                        componentName:
                          component.name ||
                          component.name ||
                          "Unknown Component",
                        category: component.category || "",
                        date: new Date(eventDateObj),
                        startTime: format(startTime, "HH:mm"),
                        endTime: format(addHours(startTime, 1), "HH:mm"),
                        location: "",
                        notes: "",
                        supplierId: "",
                        supplierName: "",
                        status: "pending" as const,
                        priority: "medium" as const,
                        assignedTo: "",
                        dependencies: [],
                      };
                    }
                  );

                  setTimelineItems(initialItems);
                  updateData(initialItems);
                }
              }}
              className="bg-[#028A75] hover:bg-[#027A65] text-white"
            >
              Populate with Package Components
            </Button>
          )}
          <Button onClick={addTimelineItem} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Activity
          </Button>
        </div>
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
                <div className="space-y-2">
                  <Label htmlFor={`componentName-${item.id}`}>
                    Name of the Component
                  </Label>
                  <Input
                    id={`componentName-${item.id}`}
                    value={item.componentName}
                    onChange={(e) =>
                      updateTimelineItem(
                        item.id,
                        "componentName",
                        e.target.value
                      )
                    }
                    placeholder="Enter component name"
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
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
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
          {timelineItems.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center space-x-2">
                <span className="font-medium">{index + 1}.</span>
                <span>{item.componentName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className={cn(
                    item.status === "pending"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : item.status === "in-progress"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : item.status === "completed"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : item.status === "completed"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : item.status === "pending"
                              ? "bg-red-50 text-red-700 border-red-200"
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

      {/* Debug information */}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-blue-800">Debug Information</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>Components available: {components?.length || 0}</p>
            <p>Timeline items: {timelineItems.length}</p>
            <p>Event date: {eventDate || "Not set"}</p>
            <p>Update function: Available</p>
            {components && components.length > 0 && (
              <div>
                <p className="font-medium">Available components:</p>
                <ul className="list-disc list-inside ml-2">
                  {components.map((comp, index) => (
                    <li key={index}>
                      {comp.name || "Unknown"} ({comp.category || "No category"}
                      )
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
