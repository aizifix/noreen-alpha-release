"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import {
  Calendar,
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { secureStorage } from "@/app/utils/encryption";
import { toast } from "@/components/ui/use-toast";
import axios from "axios";
import { endpoints } from "@/app/config/api";

interface Event {
  event_id: number;
  event_title: string;
  event_date: string;
  total_budget: number;
  total_paid: number;
  remaining_balance: number;
  payment_percentage: number;
  payment_status: string;
  event_status: string;
  admin_name: string;
  event_type_name: string;
  venue_name: string;
  package_title: string;
}

interface Payment {
  payment_id: number;
  event_title: string;
  event_date: string;
  payment_amount: number;
  payment_method: string;
  payment_status: string;
  payment_date: string;
  payment_reference: string;
  payment_notes: string;
  admin_name: string;
}

interface PaymentSchedule {
  event_title: string;
  event_date: string;
  total_budget: number;
  total_paid: number;
  remaining_balance: number;
  payment_percentage: number;
  balance_due_date: string;
  is_balance_overdue: boolean;
  days_until_due: number;
  payment_status: string;
}

export default function ClientPaymentsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [paymentSchedule, setPaymentSchedule] =
    useState<PaymentSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = secureStorage.getItem("user");
    if (userData?.user_id) {
      fetchClientData(userData.user_id);
    }
  }, []);

  const fetchClientData = async (userId: number) => {
    try {
      setLoading(true);

      // Fetch client events with payment info
      const eventsResponse = await axios.get(
        `${endpoints.client}?operation=getClientEvents&user_id=${userId}`
      );

      if (eventsResponse.data.status === "success") {
        setEvents(eventsResponse.data.events);
      }

      // Fetch payment history
      const paymentsResponse = await axios.get(
        `${endpoints.client}?operation=getClientPaymentHistory&user_id=${userId}`
      );

      if (paymentsResponse.data.status === "success") {
        setPayments(paymentsResponse.data.payments);
      }
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast({
        title: "Error",
        description: "Failed to load payment information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSchedule = async (eventId: number) => {
    try {
      const userData = secureStorage.getItem("user");
      if (!userData?.user_id) return;

      const response = await axios.get(
        `${endpoints.client}?operation=getClientPaymentSchedule&user_id=${userData.user_id}&event_id=${eventId}`
      );

      if (response.data.status === "success") {
        setPaymentSchedule(response.data.schedule);
      }
    } catch (error) {
      console.error("Error fetching payment schedule:", error);
    }
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    fetchPaymentSchedule(event.event_id);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "gcash":
        return "📱";
      case "bank-transfer":
        return "🏦";
      case "cash":
        return "💵";
      case "credit-card":
        return "💳";
      default:
        return "💰";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">
              Loading payment information...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Payment Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events with Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Your Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No events found
              </p>
            ) : (
              events.map((event) => (
                <div
                  key={event.event_id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedEvent?.event_id === event.event_id
                      ? "border-primary bg-primary/5"
                      : "hover:border-gray-300"
                  }`}
                  onClick={() => handleEventSelect(event)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{event.event_title}</h3>
                    <Badge
                      className={getPaymentStatusColor(event.payment_status)}
                    >
                      {event.payment_status.charAt(0).toUpperCase() +
                        event.payment_status.slice(1)}
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                      <span>{event.event_type_name}</span>
                    </div>
                    {event.venue_name && (
                      <div className="mt-1">📍 {event.venue_name}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Payment Progress</span>
                      <span className="font-medium">
                        {formatCurrency(event.total_paid)} /{" "}
                        {formatCurrency(event.total_budget)}
                      </span>
                    </div>
                    <Progress
                      value={event.payment_percentage}
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      {event.payment_percentage.toFixed(1)}% paid
                      {event.remaining_balance > 0 && (
                        <span>
                          {" "}
                          • {formatCurrency(event.remaining_balance)} remaining
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Payment Schedule & Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEvent ? (
              <div className="space-y-6">
                {/* Event Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    {selectedEvent.event_title}
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      Event Date:{" "}
                      {new Date(selectedEvent.event_date).toLocaleDateString()}
                    </div>
                    <div>
                      Total Budget: {formatCurrency(selectedEvent.total_budget)}
                    </div>
                    <div>Admin: {selectedEvent.admin_name}</div>
                  </div>
                </div>

                <Separator />

                {/* Payment Schedule */}
                {paymentSchedule && (
                  <div>
                    <h4 className="font-semibold mb-4">Payment Schedule</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Total Budget:</span>
                        <span className="font-medium">
                          {formatCurrency(paymentSchedule.total_budget)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Amount Paid:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(paymentSchedule.total_paid)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Remaining Balance:</span>
                        <span className="font-medium text-orange-600">
                          {formatCurrency(paymentSchedule.remaining_balance)}
                        </span>
                      </div>

                      {paymentSchedule.remaining_balance > 0 && (
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex items-start gap-2">
                            {paymentSchedule.is_balance_overdue ? (
                              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                            ) : (
                              <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">
                                {paymentSchedule.is_balance_overdue
                                  ? "Payment Overdue"
                                  : "Payment Due"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Balance due:{" "}
                                {new Date(
                                  paymentSchedule.balance_due_date
                                ).toLocaleDateString()}
                                <br />
                                {Math.abs(
                                  paymentSchedule.days_until_due
                                )} days{" "}
                                {paymentSchedule.is_balance_overdue
                                  ? "overdue"
                                  : "remaining"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {paymentSchedule.remaining_balance === 0 && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div className="font-medium text-green-700">
                              Payment Complete
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Recent Payments for this Event */}
                <div>
                  <h4 className="font-semibold mb-4">Payment History</h4>
                  {payments.filter(
                    (p) => p.event_title === selectedEvent.event_title
                  ).length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No payments recorded yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {payments
                        .filter(
                          (p) => p.event_title === selectedEvent.event_title
                        )
                        .map((payment) => (
                          <div
                            key={payment.payment_id}
                            className="border rounded-lg p-3"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {getPaymentMethodIcon(payment.payment_method)}
                                </span>
                                <div>
                                  <div className="font-medium">
                                    {formatCurrency(payment.payment_amount)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {payment.payment_method
                                      .replace("-", " ")
                                      .toUpperCase()}
                                  </div>
                                </div>
                              </div>
                              <Badge
                                variant={
                                  payment.payment_status === "completed"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {payment.payment_status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div>
                                Date:{" "}
                                {new Date(
                                  payment.payment_date
                                ).toLocaleDateString()}
                              </div>
                              {payment.payment_reference && (
                                <div>
                                  Reference: {payment.payment_reference}
                                </div>
                              )}
                              {payment.payment_notes && (
                                <div>Notes: {payment.payment_notes}</div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select an event to view payment details
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Payments History */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No payment history found
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.payment_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{payment.event_title}</h4>
                      <div className="text-sm text-muted-foreground">
                        Event:{" "}
                        {new Date(payment.event_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {formatCurrency(payment.payment_amount)}
                      </div>
                      <Badge
                        variant={
                          payment.payment_status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {payment.payment_status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Method:</span>
                      <div className="flex items-center gap-1">
                        <span>
                          {getPaymentMethodIcon(payment.payment_method)}
                        </span>
                        {payment.payment_method.replace("-", " ").toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <div>
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Admin:</span>
                      <div>{payment.admin_name}</div>
                    </div>
                    {payment.payment_reference && (
                      <div>
                        <span className="text-muted-foreground">
                          Reference:
                        </span>
                        <div className="font-mono text-xs">
                          {payment.payment_reference}
                        </div>
                      </div>
                    )}
                  </div>

                  {payment.payment_notes && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <span className="text-muted-foreground">Notes:</span>{" "}
                      {payment.payment_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
