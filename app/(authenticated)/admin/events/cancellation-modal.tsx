"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, X, FileText, DollarSign, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Event {
  event_id: number;
  event_title: string;
  event_date: string;
  total_budget: number;
  down_payment: number;
  payment_status: "unpaid" | "partial" | "paid" | "refunded";
  event_status: string;
  client_name?: string;
  booking_date?: string;
}

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, termsAccepted: boolean) => void;
  event: Event;
  loading?: boolean;
}

export function CancellationModal({
  isOpen,
  onClose,
  onConfirm,
  event,
  loading = false,
}: CancellationModalProps) {
  const [reason, setReason] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert("Please provide a cancellation reason.");
      return;
    }
    if (!termsAccepted) {
      alert("You must accept the terms and conditions to proceed.");
      return;
    }
    onConfirm(reason, termsAccepted);
  };

  const handleClose = () => {
    setReason("");
    setTermsAccepted(false);
    setShowTerms(false);
    onClose();
  };

  const getCancellationEligibility = () => {
    const today = new Date();
    const eventDate = new Date(event.event_date);
    const daysUntilEvent = Math.ceil(
      (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if cancellation is allowed based on business rules
    const isBookingRecent = event.booking_date
      ? (new Date().getTime() - new Date(event.booking_date).getTime()) /
          (1000 * 60 * 60 * 24) <
        1
      : false;

    const hasPayments = event.payment_status !== "unpaid";
    const isClientFault =
      reason.toLowerCase().includes("client") ||
      reason.toLowerCase().includes("customer") ||
      reason.toLowerCase().includes("personal");

    return {
      canCancel: !isBookingRecent && !isClientFault && daysUntilEvent > 7,
      reason: isBookingRecent
        ? "Cancellation not allowed for bookings made within 24 hours"
        : isClientFault
          ? "Cancellation not allowed for client-caused issues"
          : daysUntilEvent <= 7
            ? "Cancellation not allowed within 7 days of event"
            : "Cancellation may be subject to terms and conditions",
    };
  };

  const eligibility = getCancellationEligibility();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cancel Event Booking
          </DialogTitle>
          <DialogDescription>
            Cancel the event booking for{" "}
            <strong>{event.client_name || "Client"}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Event Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Event Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Event:</span>
                <p className="font-medium">{event.event_title}</p>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <p className="font-medium">
                  {new Date(event.event_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Total Budget:</span>
                <p className="font-medium">
                  {formatCurrency(event.total_budget)}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Payment Status:</span>
                <p className="font-medium capitalize">{event.payment_status}</p>
              </div>
            </div>
          </div>

          {/* Cancellation Eligibility */}
          <div
            className={`p-4 rounded-lg border ${
              eligibility.canCancel
                ? "bg-yellow-50 border-yellow-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`h-5 w-5 mt-0.5 ${
                  eligibility.canCancel ? "text-yellow-600" : "text-red-600"
                }`}
              />
              <div>
                <h4
                  className={`font-semibold ${
                    eligibility.canCancel ? "text-yellow-800" : "text-red-800"
                  }`}
                >
                  Cancellation Eligibility
                </h4>
                <p
                  className={`text-sm ${
                    eligibility.canCancel ? "text-yellow-700" : "text-red-700"
                  }`}
                >
                  {eligibility.reason}
                </p>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Cancellation Reason *
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide a detailed reason for cancellation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              disabled={!eligibility.canCancel}
            />
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTerms(!showTerms)}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {showTerms ? "Hide" : "View"} Terms & Conditions
              </Button>
            </div>

            {showTerms && (
              <div className="bg-gray-50 p-4 rounded-lg border text-sm space-y-3">
                <h4 className="font-semibold text-gray-900">
                  Cancellation Terms & Conditions
                </h4>
                <div className="space-y-2 text-gray-700">
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Cancellation is not honored once booking was made
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Cancellation is only honored if client's need to cancel
                      even if it was not used
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Cancellation is not honored if it's client fault that the
                      booking was made
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Cancellation is not honored for the first user made to
                      cover given since booking
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>No refund of money for delayed returned items</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Charges will be made upon the return of damage items
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Pricey this receipt upon claiming your item and cash bond
                    </span>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-blue-800 text-xs">
                    <strong>Note:</strong> This booking slip serves as temporary
                    receipt. Official receipt will be issued upon full payment.
                    Thank you!
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setTermsAccepted(checked as boolean)
                }
                disabled={!eligibility.canCancel}
              />
              <Label htmlFor="terms" className="text-sm">
                I have read and agree to the cancellation terms and conditions
              </Label>
            </div>
          </div>

          {/* Refund Information */}
          {eligibility.canCancel && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">
                Refund Information
              </h4>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Total Budget:</span>
                  <span>{formatCurrency(event.total_budget)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Down Payment:</span>
                  <span>{formatCurrency(event.down_payment)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Potential Refund:</span>
                  <span className="text-green-600">
                    {formatCurrency(
                      Math.max(0, event.down_payment - event.total_budget * 0.1)
                    )}
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  * 10% cancellation fee may apply. Final refund amount subject
                  to terms and conditions.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0 flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={
              !eligibility.canCancel ||
              !reason.trim() ||
              !termsAccepted ||
              loading
            }
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                Cancel Event
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
