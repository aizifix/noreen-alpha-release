"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
} from "lucide-react";
import { secureStorage } from "@/app/utils/encryption";
import { toast } from "@/components/ui/use-toast";
import { apiClient } from "@/app/utils/apiClient";

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
  const [paymentSchedule, setPaymentSchedule] =
    useState<PaymentSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] =
    useState<Event | null>(null);

  // Search and filter states
  const [eventsSearch, setEventsSearch] = useState("");
  const [eventsStatusFilter, setEventsStatusFilter] = useState("all");
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState("all");
  const [paymentsMethodFilter, setPaymentsMethodFilter] = useState("all");

  // Filtered data
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.event_title
      .toLowerCase()
      .includes(eventsSearch.toLowerCase());
    const matchesStatus =
      eventsStatusFilter === "all" ||
      event.payment_status === eventsStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.event_title
        .toLowerCase()
        .includes(paymentsSearch.toLowerCase()) ||
      payment.payment_reference
        ?.toLowerCase()
        .includes(paymentsSearch.toLowerCase());
    const matchesStatus =
      paymentsStatusFilter === "all" ||
      payment.payment_status === paymentsStatusFilter;
    const matchesMethod =
      paymentsMethodFilter === "all" ||
      payment.payment_method === paymentsMethodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  useEffect(() => {
    const userData = secureStorage.getItem("user");
    if (userData?.user_id && userData?.user_role?.toLowerCase() === "client") {
      fetchClientData(userData.user_id);
    } else {
      console.warn("Invalid or missing user data");
      toast({
        title: "Authentication Error",
        description: "Please log in again to access payment information",
        variant: "destructive",
      });
    }
  }, []);

  const fetchClientData = async (userId: number) => {
    try {
      setLoading(true);

      // Fetch client events and payment history in parallel
      const [eventsResponse, paymentsResponse] = await Promise.all([
        apiClient.get(`?operation=getClientEvents&user_id=${userId}`),
        apiClient.get(`?operation=getClientPaymentHistory&user_id=${userId}`),
      ]);

      // Handle events response
      if (eventsResponse.data?.status === "success") {
        setEvents(eventsResponse.data.events || []);
      } else {
        console.warn("Failed to fetch events:", eventsResponse.data?.message);
        setEvents([]);
      }

      // Handle payments response
      if (paymentsResponse.data?.status === "success") {
        setPayments(paymentsResponse.data.payments || []);
      } else {
        console.warn(
          "Failed to fetch payments:",
          paymentsResponse.data?.message
        );
        setPayments([]);
      }
    } catch (error: any) {
      console.error("Error fetching client data:", error);
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to load payment information. Please try again.",
        variant: "destructive",
      });
      // Set empty arrays on error to prevent undefined errors
      setEvents([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSchedule = async (eventId: number) => {
    try {
      const userData = secureStorage.getItem("user");
      if (!userData?.user_id) {
        console.warn("No user data available for fetching payment schedule");
        return;
      }

      const response = await apiClient.get(
        `?operation=getClientPaymentSchedule&user_id=${userData.user_id}&event_id=${eventId}`
      );

      if (response.data?.status === "success") {
        setPaymentSchedule(response.data.schedule || null);
      } else {
        console.warn(
          "Failed to fetch payment schedule:",
          response.data?.message
        );
        setPaymentSchedule(null);
      }
    } catch (error: any) {
      console.error("Error fetching payment schedule:", error);
      toast({
        title: "Error",
        description: "Failed to load payment schedule details",
        variant: "destructive",
      });
      setPaymentSchedule(null);
    }
  };

  const handleOpenPaymentDetails = async (event: Event) => {
    setSelectedEventForModal(event);
    await fetchPaymentSchedule(event.event_id);
    setIsModalOpen(true);
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

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="events">Your Events</TabsTrigger>
          <TabsTrigger value="history">Complete Payment History</TabsTrigger>
        </TabsList>
        <TabsContent value="events">
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                <div className="flex-1 min-w-0">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Search Events
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by event title..."
                      value={eventsSearch}
                      onChange={(e) => setEventsSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-full lg:w-48">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Payment Status
                  </label>
                  <Select
                    value={eventsStatusFilter}
                    onValueChange={setEventsStatusFilter}
                  >
                    <SelectTrigger className="w-full">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events with Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Your Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {events.length === 0
                    ? "No events found"
                    : "No events match your filters"}
                </p>
              ) : (
                filteredEvents.map((event) => (
                  <div
                    key={event.event_id}
                    className="p-4 border rounded-lg transition-colors hover:border-gray-300 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{event.event_title}</h3>
                      <Badge
                        className={getPaymentStatusColor(event.payment_status)}
                      >
                        {event.payment_status.charAt(0).toUpperCase() +
                          event.payment_status.slice(1)}
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground">
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
                        value={event.payment_percentage || 0}
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        {(event.payment_percentage || 0).toFixed(1)}% paid
                        {(event.remaining_balance || 0) > 0 && (
                          <span>
                            {" "}
                            • {formatCurrency(
                              event.remaining_balance || 0
                            )}{" "}
                            remaining
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleOpenPaymentDetails(event)}
                    >
                      Payment Details
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>
                  Payment Details - {selectedEventForModal?.event_title}
                </DialogTitle>
              </DialogHeader>
              {selectedEventForModal && (
                <div className="space-y-6 flex flex-col max-h-[70vh]">
                  {/* Event Summary */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {selectedEventForModal.event_title}
                    </h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Event Date:{" "}
                        {new Date(
                          selectedEventForModal.event_date
                        ).toLocaleDateString()}
                      </div>
                      <div>
                        Total Budget:{" "}
                        {formatCurrency(selectedEventForModal.total_budget)}
                      </div>
                      <div>Admin: {selectedEventForModal.admin_name}</div>
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
                            {formatCurrency(paymentSchedule.total_budget || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Amount Paid:</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(paymentSchedule.total_paid || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Remaining Balance:</span>
                          <span className="font-medium text-orange-600">
                            {formatCurrency(
                              paymentSchedule.remaining_balance || 0
                            )}
                          </span>
                        </div>

                        {(paymentSchedule.remaining_balance || 0) > 0 && (
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
                                  {paymentSchedule.balance_due_date
                                    ? new Date(
                                        paymentSchedule.balance_due_date
                                      ).toLocaleDateString()
                                    : "Date not available"}
                                  <br />
                                  {Math.abs(
                                    paymentSchedule.days_until_due || 0
                                  )}{" "}
                                  days{" "}
                                  {paymentSchedule.is_balance_overdue
                                    ? "overdue"
                                    : "remaining"}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {(paymentSchedule.remaining_balance || 0) === 0 && (
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
                  <div className="flex-1 min-h-0">
                    <h4 className="font-semibold mb-4">Payment History</h4>
                    <div className="h-full overflow-y-auto pb-4">
                      {payments.filter(
                        (p) =>
                          p.event_title === selectedEventForModal.event_title
                      ).length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No payments recorded yet
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {payments
                            .filter(
                              (p) =>
                                p.event_title ===
                                selectedEventForModal.event_title
                            )
                            .map((payment) => (
                              <div
                                key={payment.payment_id}
                                className="border rounded-lg p-3"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                      {getPaymentMethodIcon(
                                        payment.payment_method
                                      )}
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
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="history">
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                <div className="flex-1 min-w-0">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Search Payments
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by event title or reference..."
                      value={paymentsSearch}
                      onChange={(e) => setPaymentsSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-full lg:w-48">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Payment Status
                  </label>
                  <Select
                    value={paymentsStatusFilter}
                    onValueChange={setPaymentsStatusFilter}
                  >
                    <SelectTrigger className="w-full">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full lg:w-48">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Payment Method
                  </label>
                  <Select
                    value={paymentsMethodFilter}
                    onValueChange={setPaymentsMethodFilter}
                  >
                    <SelectTrigger className="w-full">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="gcash">GCash</SelectItem>
                      <SelectItem value="bank-transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit-card">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complete Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPayments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {payments.length === 0
                    ? "No payment history found"
                    : "No payments match your filters"}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredPayments.map((payment) => (
                    <div
                      key={payment.payment_id}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">
                            {payment.event_title}
                          </h4>
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
                            {payment.payment_method
                              .replace("-", " ")
                              .toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <div>
                            {new Date(
                              payment.payment_date
                            ).toLocaleDateString()}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
