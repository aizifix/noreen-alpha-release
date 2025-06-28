"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Filter,
  Download,
  Plus,
} from "lucide-react";
import { secureStorage } from "@/app/utils/encryption";
import { toast } from "@/components/ui/use-toast";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Event {
  event_id: number;
  event_title: string;
  event_date: string;
  total_budget: number;
  total_paid: number;
  remaining_balance: number;
  payment_percentage: number;
  event_payment_status: string;
  client_name: string;
  payment_count: number;
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
  client_name: string;
}

interface PaymentAnalytics {
  total_events: number;
  total_payments: number;
  total_revenue: number;
  pending_payments: number;
  average_payment: number;
  gcash_payments: number;
  bank_payments: number;
  cash_payments: number;
}

export default function AdminPaymentsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Create payment form states
  const [newPayment, setNewPayment] = useState({
    event_id: "",
    client_id: "",
    payment_amount: "",
    payment_method: "cash",
    payment_reference: "",
    payment_notes: "",
    payment_status: "pending",
    payment_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const userData = secureStorage.getItem("user");
    if (userData?.user_id) {
      fetchAdminData(userData.user_id);
    }
  }, []);

  const fetchAdminData = async (adminId: number) => {
    try {
      setLoading(true);

      // Fetch events with payment status
      const eventsResponse = await axios.get(
        `http://localhost/events-api/admin.php?operation=getEventsWithPaymentStatus&admin_id=${adminId}`
      );

      if (eventsResponse.data.status === "success") {
        setEvents(eventsResponse.data.events);
      }

      // Fetch payments
      const paymentsResponse = await axios.get(
        `http://localhost/events-api/admin.php?operation=getAdminPayments&admin_id=${adminId}`
      );

      if (paymentsResponse.data.status === "success") {
        setPayments(paymentsResponse.data.payments);
      }

      // Fetch analytics
      const analyticsResponse = await axios.get(
        `http://localhost/events-api/admin.php?operation=getPaymentAnalytics&admin_id=${adminId}`
      );

      if (analyticsResponse.data.status === "success") {
        setAnalytics(analyticsResponse.data.analytics);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load payment information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    try {
      if (
        !newPayment.event_id ||
        !newPayment.client_id ||
        !newPayment.payment_amount
      ) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const paymentData = {
        ...newPayment,
        payment_amount: parseFloat(newPayment.payment_amount),
        payment_percentage: null, // Will be calculated by backend
      };

      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "createPayment",
          ...paymentData,
        }
      );

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: "Payment recorded successfully",
        });
        setShowCreatePayment(false);
        setNewPayment({
          event_id: "",
          client_id: "",
          payment_amount: "",
          payment_method: "cash",
          payment_reference: "",
          payment_notes: "",
          payment_status: "pending",
          payment_date: new Date().toISOString().split("T")[0],
        });

        // Refresh data
        const userData = secureStorage.getItem("user");
        if (userData?.user_id) {
          fetchAdminData(userData.user_id);
        }
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to create payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      toast({
        title: "Error",
        description: "Failed to create payment",
        variant: "destructive",
      });
    }
  };

  const updatePaymentStatus = async (paymentId: number, status: string) => {
    try {
      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "updatePaymentStatus",
          payment_id: paymentId,
          status: status,
          notes: `Status updated to ${status} by admin`,
        }
      );

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: "Payment status updated successfully",
        });

        // Refresh data
        const userData = secureStorage.getItem("user");
        if (userData?.user_id) {
          fetchAdminData(userData.user_id);
        }
      } else {
        toast({
          title: "Error",
          description:
            response.data.message || "Failed to update payment status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
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

  const filteredPayments = payments.filter((payment) => {
    if (paymentFilter === "all") return true;
    return payment.payment_status === paymentFilter;
  });

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">
              Loading payment data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <Button onClick={() => setShowCreatePayment(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.total_revenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {analytics.total_payments} payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_events}</div>
              <p className="text-xs text-muted-foreground">
                Events being managed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Payments
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.pending_payments || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting confirmation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Payment</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.average_payment || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Events & Progress</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Events Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No events found
                  </p>
                ) : (
                  events.map((event) => (
                    <div key={event.event_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{event.event_title}</h3>
                          <div className="text-sm text-muted-foreground">
                            Client: {event.client_name} •{" "}
                            {new Date(event.event_date).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge
                          className={getPaymentStatusColor(
                            event.event_payment_status
                          )}
                        >
                          {event.event_payment_status.charAt(0).toUpperCase() +
                            event.event_payment_status.slice(1)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Total Budget
                          </div>
                          <div className="font-medium">
                            {formatCurrency(event.total_budget)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Paid Amount
                          </div>
                          <div className="font-medium text-green-600">
                            {formatCurrency(event.total_paid)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Remaining
                          </div>
                          <div className="font-medium text-orange-600">
                            {formatCurrency(event.remaining_balance)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Payment Progress</span>
                          <span>{event.payment_percentage.toFixed(1)}%</span>
                        </div>
                        <Progress
                          value={event.payment_percentage}
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground">
                          {event.payment_count} payment(s) recorded
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Payment History</CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={paymentFilter}
                    onValueChange={setPaymentFilter}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPayments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No payments found
                  </p>
                ) : (
                  filteredPayments.map((payment) => (
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
                            Client: {payment.client_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {formatCurrency(payment.payment_amount)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={getPaymentStatusColor(
                                payment.payment_status
                              )}
                            >
                              {payment.payment_status}
                            </Badge>
                            {payment.payment_status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updatePaymentStatus(
                                    payment.payment_id,
                                    "completed"
                                  )
                                }
                              >
                                Confirm
                              </Button>
                            )}
                          </div>
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
                          <span className="text-muted-foreground">
                            Event Date:
                          </span>
                          <div>
                            {new Date(payment.event_date).toLocaleDateString()}
                          </div>
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods Breakdown */}
            {analytics && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">📱 GCash</span>
                      <span className="font-medium">
                        {analytics.gcash_payments}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        🏦 Bank Transfer
                      </span>
                      <span className="font-medium">
                        {analytics.bank_payments}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">💵 Cash</span>
                      <span className="font-medium">
                        {analytics.cash_payments}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => setShowCreatePayment(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record New Payment
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Payment Report
                </Button>
                <Button variant="outline" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filters
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Payment Dialog */}
      <Dialog open={showCreatePayment} onOpenChange={setShowCreatePayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
            <DialogDescription>
              Add a payment record for an existing event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event_id">Event ID</Label>
              <Input
                id="event_id"
                type="number"
                value={newPayment.event_id}
                onChange={(e) =>
                  setNewPayment((prev) => ({
                    ...prev,
                    event_id: e.target.value,
                  }))
                }
                placeholder="Enter event ID"
              />
            </div>

            <div>
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                type="number"
                value={newPayment.client_id}
                onChange={(e) =>
                  setNewPayment((prev) => ({
                    ...prev,
                    client_id: e.target.value,
                  }))
                }
                placeholder="Enter client ID"
              />
            </div>

            <div>
              <Label htmlFor="payment_amount">Payment Amount</Label>
              <Input
                id="payment_amount"
                type="number"
                step="0.01"
                value={newPayment.payment_amount}
                onChange={(e) =>
                  setNewPayment((prev) => ({
                    ...prev,
                    payment_amount: e.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={newPayment.payment_method}
                onValueChange={(value) =>
                  setNewPayment((prev) => ({ ...prev, payment_method: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit-card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_reference">
                Reference Number (Optional)
              </Label>
              <Input
                id="payment_reference"
                value={newPayment.payment_reference}
                onChange={(e) =>
                  setNewPayment((prev) => ({
                    ...prev,
                    payment_reference: e.target.value,
                  }))
                }
                placeholder="Transaction reference"
              />
            </div>

            <div>
              <Label htmlFor="payment_status">Status</Label>
              <Select
                value={newPayment.payment_status}
                onValueChange={(value) =>
                  setNewPayment((prev) => ({ ...prev, payment_status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_notes">Notes (Optional)</Label>
              <Textarea
                id="payment_notes"
                value={newPayment.payment_notes}
                onChange={(e) =>
                  setNewPayment((prev) => ({
                    ...prev,
                    payment_notes: e.target.value,
                  }))
                }
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreatePayment(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePayment}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
