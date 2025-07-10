"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EventDetailsFormProps {
  initialValues: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    eventType: string;
    guestCount: number;
    notes: string;
  };
  onUpdate: (values: any) => void;
}

export function EventDetailsForm({
  initialValues,
  onUpdate,
}: EventDetailsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [date, setDate] = useState<Date | undefined>(
    initialValues.eventDate ? new Date(initialValues.eventDate) : undefined
  );

  // Sync date state with initialValues when they change
  useEffect(() => {
    if (initialValues.eventDate) {
      setDate(new Date(initialValues.eventDate));
    } else {
      setDate(undefined);
    }
  }, [initialValues.eventDate]);

  // Sync values state with initialValues when they change
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = (field: string, value: any) => {
    const newValues = { ...values, [field]: value };
    setValues(newValues);
    onUpdate(newValues);
  };

  const handleDateChange = (date: Date | undefined) => {
    setDate(date);
    if (date) {
      handleChange("eventDate", format(date, "yyyy-MM-dd"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Event Details</h2>
        <p className="text-muted-foreground">
          Enter the client and event details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>
            Enter the client's contact information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={values.clientName}
                onChange={(e) => handleChange("clientName", e.target.value)}
                placeholder="Enter client name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={values.clientEmail}
                onChange={(e) => handleChange("clientEmail", e.target.value)}
                placeholder="Enter client email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Phone</Label>
              <Input
                id="clientPhone"
                value={values.clientPhone}
                onChange={(e) => handleChange("clientPhone", e.target.value)}
                placeholder="Enter client phone"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
          <CardDescription>Enter the event details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                value={values.eventType}
                onValueChange={(value) => handleChange("eventType", value)}
              >
                <SelectTrigger id="eventType">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="wedding" value="wedding">
                    Wedding
                  </SelectItem>
                  <SelectItem key="debut" value="debut">
                    Debut
                  </SelectItem>
                  <SelectItem key="birthday" value="birthday">
                    Birthday
                  </SelectItem>
                  <SelectItem key="corporate" value="corporate">
                    Corporate Event
                  </SelectItem>
                  <SelectItem key="other" value="other">
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDate">Event Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Select
                value={values.startTime}
                onValueChange={(value) => handleChange("startTime", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 36 }, (_, i) => {
                    const hour = Math.floor(i / 2) + 6;
                    const minute = (i % 2) * 30;
                    const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
                    const displayTime = format(
                      new Date(`2000-01-01T${timeString}`),
                      "h:mm a"
                    );
                    return (
                      <SelectItem key={timeString} value={timeString}>
                        {displayTime}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Select
                value={values.endTime}
                onValueChange={(value) => handleChange("endTime", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 36 }, (_, i) => {
                    const hour = Math.floor(i / 2) + 6;
                    const minute = (i % 2) * 30;
                    const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
                    const displayTime = format(
                      new Date(`2000-01-01T${timeString}`),
                      "h:mm a"
                    );
                    return (
                      <SelectItem key={timeString} value={timeString}>
                        {displayTime}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestCount">Guest Count</Label>
              <Input
                id="guestCount"
                type="number"
                min="1"
                value={values.guestCount}
                onChange={(e) =>
                  handleChange(
                    "guestCount",
                    Number.parseInt(e.target.value) || 0
                  )
                }
                placeholder="Enter number of guests"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={values.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Enter any additional notes or requirements"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
