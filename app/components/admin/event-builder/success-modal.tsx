"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDashboard: () => void;
  eventDetails: {
    eventTitle: string;
    eventDate: string;
    eventId: string;
  };
}

export function SuccessModal({
  isOpen,
  onClose,
  onDashboard,
  eventDetails,
}: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-2">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            Event Created!
          </DialogTitle>
          <DialogDescription className="text-center">
            Your event has been successfully created and is ready to be managed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Event:</span>
                <span className="text-sm font-medium">
                  {eventDetails.eventTitle}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date:</span>
                <span className="text-sm font-medium">
                  {eventDetails.eventDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Event ID:</span>
                <span className="text-sm font-medium">
                  {eventDetails.eventId}
                </span>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            You can now manage this event from your dashboard.
          </p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center sm:space-x-2">
          <Button onClick={onDashboard} className="w-full sm:w-auto">
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="mt-3 sm:mt-0 w-full sm:w-auto"
          >
            Create Another Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
