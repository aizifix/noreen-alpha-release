"use client";

import { useState, useEffect, useCallback } from "react";
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
  AlertTriangle,
  CheckCircle,
  Filter,
  Download,
  Plus,
  Search,
  X,
  CalendarDays,
  Wallet,
  Percent,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  client_id: number;
  client_email: string;
  payment_count: number;
}

interface EventForDropdown {
  event_id: number;
  event_title: string;
  event_date: string;
  client_id: number;
  client_name: string;
  client_email: string;
  client_contact?: string;
  total_budget: number;
  total_paid: number;
  remaining_balance: number;
  payment_percentage?: number;
  payment_count?: number;
  event_payment_status: string;
}

interface EventPaymentDetails {
  event: {
    event_id: number;
    event_title: string;
    event_date: string;
    event_time: string;
    client_id: number;
    client_name: string;
    client_email: string;
    client_contact: string;
    total_budget: number;
    total_paid: number;
    remaining_balance: number;
    payment_percentage: number;
    event_payment_status: string;
    total_payments: number;
    completed_payments: number;
    pending_payments: number;
  };
  payments: Array<{
    payment_id: number;
    payment_amount: number;
    payment_method: string;
    payment_status: string;
    payment_date: string;
    payment_reference: string;
    payment_notes: string;
    payment_attachments: string;
    attachments: Array<{
      filename: string;
      original_name: string;
      description: string;
      file_size: number;
      file_type: string;
      uploaded_at: string;
    }>;
    created_at: string;
    updated_at: string;
    formatted_created_at: string;
    formatted_updated_at: string;
    client_name: string;
  }>;
  payment_summary: Array<{
    payment_method: string;
    payment_count: number;
    total_amount: number;
  }>;
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
  event_id: number;
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

interface PaymentFilters {
  search: string;
  status: string;
  method: string;
  dateFrom: string;
  dateTo: string;
  eventId: string;
  clientName: string;
}

export default function AdminPaymentsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsForDropdown, setEventsForDropdown] = useState<
    EventForDropdown[]
  >([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedEventDetails, setSelectedEventDetails] =
    useState<EventPaymentDetails | null>(null);
  const [loadingEventDetails, setLoadingEventDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [eventSearchOpen, setEventSearchOpen] = useState(false);
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentDescriptions, setAttachmentDescriptions] = useState<
    string[]
  >([]);

  // Payment type selection
  const [paymentType, setPaymentType] = useState<
    "amount" | "percentage" | "full"
  >("amount");
  const [paymentPercentage, setPaymentPercentage] = useState<string>("");

  // Payment filters
  const [filters, setFilters] = useState<PaymentFilters>({
    search: "",
    status: "all",
    method: "all",
    dateFrom: "",
    dateTo: "",
    eventId: "",
    clientName: "",
  });

  // Create payment form states
  const [newPayment, setNewPayment] = useState({
    event_id: "",
    client_id: "",
    client_name: "",
    event_title: "",
    payment_amount: "",
    payment_method: "cash",
    payment_reference: "",
    payment_notes: "",
    payment_status: "pending",
    payment_date: new Date().toISOString().split("T")[0],
    due_date: "",
  });

  useEffect(() => {
    const userData = secureStorage.getItem("user");
    if (userData?.user_id) {
      fetchAdminData(userData.user_id);
      fetchEventsForDropdown(userData.user_id);
    }
  }, []);

  const fetchAdminData = async (adminId: number) => {
    try {
      setLoading(true);

      // Fetch events with payment status
      const eventsResponse = await axios.get(
        `admin.php?operation=getEventsWithPaymentStatus&admin_id=${adminId}`
      );

      if (eventsResponse.data.status === "success") {
        setEvents(eventsResponse.data.events);
      }

      // Fetch payments
      const paymentsResponse = await axios.get(
        `admin.php?operation=getAdminPayments&admin_id=${adminId}`
      );

      if (paymentsResponse.data.status === "success") {
        setPayments(paymentsResponse.data.payments);
      }

      // Fetch analytics
      const analyticsResponse = await axios.get(
        `admin.php?operation=getPaymentAnalytics&admin_id=${adminId}`
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

  const fetchEventsForDropdown = async (
    adminId: number,
    searchTerm: string = ""
  ) => {
    try {
      const response = await axios.get(
        `admin.php?operation=getEventsForPayments&admin_id=${adminId}&search_term=${encodeURIComponent(searchTerm)}`
      );

      if (response.data.status === "success") {
        setEventsForDropdown(response.data.events);
      }
    } catch (error) {
      console.error("Error fetching events for dropdown:", error);
    }
  };

  const fetchEventPaymentDetails = async (eventId: number) => {
    try {
      setLoadingEventDetails(true);
      const response = await axios.get(
        `admin.php?operation=getEventPaymentDetails&event_id=${eventId}`
      );

      if (response.data.status === "success") {
        setSelectedEventDetails(response.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load event payment details",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching event payment details:", error);
      toast({
        title: "Error",
        description: "Failed to load event payment details",
        variant: "destructive",
      });
    } finally {
      setLoadingEventDetails(false);
    }
  };

  const debouncedEventSearch = useCallback(
    debounce((searchTerm: string) => {
      const userData = secureStorage.getItem("user");
      if (userData?.user_id) {
        fetchEventsForDropdown(userData.user_id, searchTerm);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (eventSearchTerm !== "") {
      debouncedEventSearch(eventSearchTerm);
    } else {
      const userData = secureStorage.getItem("user");
      if (userData?.user_id) {
        fetchEventsForDropdown(userData.user_id);
      }
    }
  }, [eventSearchTerm, debouncedEventSearch]);

  const handleEventSelect = (event: EventForDropdown) => {
    setNewPayment((prev) => ({
      ...prev,
      event_id: event.event_id.toString(),
      client_id: event.client_id.toString(),
      client_name: event.client_name,
      event_title: event.event_title,
    }));
    setEventSearchOpen(false);

    // Create the event details from the dropdown data (no separate API call needed)
    // Calculate payment percentage correctly
    const calculatedPaymentPercentage =
      event.total_budget > 0
        ? (event.total_paid / event.total_budget) * 100
        : 0;

    const eventDetails: EventPaymentDetails = {
      event: {
        event_id: event.event_id,
        event_title: event.event_title,
        event_date: event.event_date,
        event_time: "",
        client_id: event.client_id,
        client_name: event.client_name,
        client_email: event.client_email,
        client_contact: event.client_contact || "",
        total_budget: event.total_budget,
        total_paid: event.total_paid,
        remaining_balance: event.remaining_balance,
        payment_percentage: calculatedPaymentPercentage,
        event_payment_status: event.event_payment_status,
        total_payments: event.payment_count || 0,
        completed_payments: 0,
        pending_payments: 0,
      },
      payments: [],
      payment_summary: [],
    };

    setSelectedEventDetails(eventDetails);
    setLoadingEventDetails(false);
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

      const response = await axios.post("/admin.php", {
        operation: "createPayment",
        ...paymentData,
      });

      if (response.data.status === "success") {
        const paymentId = response.data.payment_id;

        // Upload attachments if any
        if (attachmentFiles.length > 0) {
          for (let i = 0; i < attachmentFiles.length; i++) {
            const file = attachmentFiles[i];
            const description = attachmentDescriptions[i] || "";

            const formData = new FormData();
            formData.append("operation", "uploadPaymentAttachment");
            formData.append("payment_id", paymentId.toString());
            formData.append("event_id", newPayment.event_id.toString());
            formData.append("file", file);
            formData.append("description", description);

            try {
              const uploadResponse = await axios.post("/admin.php", formData, {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              });

              if (uploadResponse.data.status !== "success") {
                console.error(
                  `Failed to upload ${file.name}:`,
                  uploadResponse.data.message
                );
                toast({
                  title: "Upload Warning",
                  description: `Failed to upload ${file.name}`,
                  variant: "destructive",
                });
              }
            } catch (uploadError) {
              console.error(`Error uploading ${file.name}:`, uploadError);
              toast({
                title: "Upload Error",
                description: `Error uploading ${file.name}`,
                variant: "destructive",
              });
            }
          }
        }

        toast({
          title: "Success",
          description: `Payment recorded successfully${attachmentFiles.length > 0 ? " with attachments" : ""}`,
        });

        // Refresh event details if an event was selected
        if (newPayment.event_id) {
          fetchEventPaymentDetails(parseInt(newPayment.event_id));
        }

        // Refresh main data
        const userData = secureStorage.getItem("user");
        if (userData?.user_id) {
          fetchAdminData(userData.user_id);
        }

        // Reset form but keep event selected for potential additional payments
        setNewPayment((prev) => ({
          ...prev,
          payment_amount: "",
          payment_reference: "",
          payment_notes: "",
          payment_status: "pending",
          payment_date: new Date().toISOString().split("T")[0],
          due_date: "",
        }));

        // Reset attachment states
        setAttachmentFiles([]);
        setAttachmentDescriptions([]);
        setShowPaymentHistory(false);

        setShowCreatePayment(false);
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

  const resetPaymentForm = () => {
    setNewPayment({
      event_id: "",
      client_id: "",
      client_name: "",
      event_title: "",
      payment_amount: "",
      payment_method: "cash",
      payment_reference: "",
      payment_notes: "",
      payment_status: "pending",
      payment_date: new Date().toISOString().split("T")[0],
      due_date: "",
    });
    setSelectedEventDetails(null);
    setPaymentType("amount");
    setPaymentPercentage("");
    setAttachmentFiles([]);
    setAttachmentDescriptions([]);
  };

  const updatePaymentStatus = async (paymentId: number, status: string) => {
    try {
      const response = await axios.post("/admin.php", {
        operation: "updatePaymentStatus",
        payment_id: paymentId,
        status: status,
        notes: `Status updated to ${status} by admin`,
      });

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
      case "completed":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-orange-100 text-orange-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "refunded":
        return "bg-purple-100 text-purple-800";
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
      case "check":
        return "📝";
      case "online-banking":
        return "💻";
      default:
        return "💰";
    }
  };

  const applyFilters = () => {
    let filtered = [...payments];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          payment.event_title.toLowerCase().includes(searchLower) ||
          payment.client_name.toLowerCase().includes(searchLower) ||
          payment.payment_reference?.toLowerCase().includes(searchLower) ||
          payment.event_id.toString().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(
        (payment) => payment.payment_status === filters.status
      );
    }

    // Payment method filter
    if (filters.method !== "all") {
      filtered = filtered.filter(
        (payment) => payment.payment_method === filters.method
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (payment) =>
          new Date(payment.payment_date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(
        (payment) => new Date(payment.payment_date) <= new Date(filters.dateTo)
      );
    }

    // Event ID filter
    if (filters.eventId) {
      filtered = filtered.filter((payment) =>
        payment.event_id.toString().includes(filters.eventId)
      );
    }

    // Client name filter
    if (filters.clientName) {
      const clientNameLower = filters.clientName.toLowerCase();
      filtered = filtered.filter((payment) =>
        payment.client_name.toLowerCase().includes(clientNameLower)
      );
    }

    return filtered;
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "all",
      method: "all",
      dateFrom: "",
      dateTo: "",
      eventId: "",
      clientName: "",
    });
  };

  const filteredPayments = applyFilters();

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button onClick={() => setShowCreatePayment(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search events, clients, references..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="method-filter">Payment Method</Label>
                <Select
                  value={filters.method}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                    <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="online-banking">
                      Online Banking
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="event-id-filter">Event ID</Label>
                <Input
                  id="event-id-filter"
                  placeholder="Event ID..."
                  value={filters.eventId}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, eventId: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="date-from">Date From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="date-to">Date To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="client-filter">Client Name</Label>
                <Input
                  id="client-filter"
                  placeholder="Client name..."
                  value={filters.clientName}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      clientName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                {formatCurrency(
                  parseFloat(analytics.total_revenue?.toString() || "0")
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                From {analytics.total_payments || 0} payments
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
              <div className="text-2xl font-bold">
                {analytics.total_events || 0}
              </div>
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
                {formatCurrency(
                  parseFloat(analytics.pending_payments?.toString() || "0")
                )}
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
                {formatCurrency(
                  parseFloat(analytics.average_payment?.toString() || "0")
                )}
              </div>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Events & Progress</TabsTrigger>
          <TabsTrigger value="payments">
            Payment History ({filteredPayments.length})
          </TabsTrigger>
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
                            ID: {event.event_id} • Client: {event.client_name} •{" "}
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
                            {formatCurrency(
                              parseFloat(event.total_budget?.toString() || "0")
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Paid Amount
                          </div>
                          <div className="font-medium text-green-600">
                            {formatCurrency(
                              parseFloat(event.total_paid?.toString() || "0")
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Remaining
                          </div>
                          <div className="font-medium text-orange-600">
                            {formatCurrency(
                              parseFloat(
                                event.remaining_balance?.toString() || "0"
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Payment Progress</span>
                          <span>
                            {parseFloat(
                              event.payment_percentage?.toString() || "0"
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <Progress
                          value={parseFloat(
                            event.payment_percentage?.toString() || "0"
                          )}
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground">
                          {event.payment_count || 0} payment(s) recorded
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
                <div className="text-sm text-muted-foreground">
                  Showing {filteredPayments.length} of {payments.length}{" "}
                  payments
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPayments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No payments found matching your filters
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
                            ID: {payment.event_id} • Client:{" "}
                            {payment.client_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {formatCurrency(
                              parseFloat(
                                payment.payment_amount?.toString() || "0"
                              )
                            )}
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filters
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Create Payment Dialog */}
      <Dialog open={showCreatePayment} onOpenChange={setShowCreatePayment}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
            <DialogDescription>
              Add a payment record for an existing event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Enhanced Event Selection */}
            <div>
              <Label htmlFor="event_search">Select Event *</Label>
              <Popover open={eventSearchOpen} onOpenChange={setEventSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={eventSearchOpen}
                    className="w-full justify-between"
                  >
                    {newPayment.event_id ? (
                      <div className="text-left">
                        <div className="font-medium">
                          {newPayment.event_title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {newPayment.event_id}
                        </div>
                      </div>
                    ) : (
                      "Select event..."
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search events..."
                      value={eventSearchTerm}
                      onValueChange={setEventSearchTerm}
                    />
                    <CommandList>
                      <CommandEmpty>No events found.</CommandEmpty>
                      <CommandGroup>
                        {eventsForDropdown.map((event) => (
                          <CommandItem
                            key={event.event_id}
                            onSelect={() => handleEventSelect(event)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col w-full">
                              <div className="font-medium">
                                {event.event_title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {event.event_id} • {event.client_name} •
                                {formatCurrency(event.remaining_balance)}{" "}
                                remaining
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Client Information */}
            {newPayment.client_name && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">Client Information</div>
                <div className="text-sm text-muted-foreground">
                  {newPayment.client_name} (ID: {newPayment.client_id})
                </div>
              </div>
            )}

            {/* Professional Financial Overview */}
            {newPayment.event_id && (
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingEventDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
                      <span className="ml-2 text-sm text-slate-600">
                        Loading financial details...
                      </span>
                    </div>
                  ) : selectedEventDetails ? (
                    <>
                      {/* Financial Metrics Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                            Package Price
                          </div>
                          <div className="text-lg font-semibold text-slate-900">
                            {formatCurrency(
                              selectedEventDetails.event.total_budget
                            )}
                          </div>
                        </div>

                        <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                          <div className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">
                            Amount Paid
                          </div>
                          <div className="text-lg font-semibold text-emerald-700">
                            {formatCurrency(
                              selectedEventDetails.event.total_paid
                            )}
                          </div>
                        </div>

                        <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
                            Balance Due
                          </div>
                          <div className="text-lg font-semibold text-amber-700">
                            {formatCurrency(
                              selectedEventDetails.event.remaining_balance
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Payment Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600">
                            Payment Progress
                          </span>
                          <span className="text-sm text-slate-500">
                            {selectedEventDetails.event.payment_percentage.toFixed(
                              1
                            )}
                            % Complete
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(selectedEventDetails.event.payment_percentage, 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Payment Status */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-sm text-slate-600">
                          Payment Status:
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            selectedEventDetails.event.remaining_balance <= 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {selectedEventDetails.event.remaining_balance <= 0
                            ? "Fully Paid"
                            : "Partial Payment"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-slate-500">
                      <div className="text-sm">
                        Unable to load financial details
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Event ID: {newPayment.event_id}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Type Selection */}
            <div className="space-y-3">
              <Label>Payment Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={paymentType === "amount" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setPaymentType("amount");
                    setNewPayment((prev) => ({ ...prev, payment_amount: "" }));
                  }}
                  className="flex items-center gap-1"
                >
                  <DollarSign className="h-3 w-3" />
                  Custom Amount
                </Button>
                <Button
                  type="button"
                  variant={paymentType === "percentage" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setPaymentType("percentage");
                    setPaymentPercentage("");
                  }}
                  className="flex items-center gap-1"
                >
                  <Percent className="h-3 w-3" />
                  Percentage
                </Button>
                {selectedEventDetails?.event.remaining_balance &&
                  selectedEventDetails.event.remaining_balance > 0 && (
                    <Button
                      type="button"
                      variant={paymentType === "full" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setPaymentType("full");
                        setNewPayment((prev) => ({
                          ...prev,
                          payment_amount:
                            selectedEventDetails?.event.remaining_balance?.toString() ||
                            "0",
                        }));
                      }}
                      className="flex items-center gap-1"
                    >
                      <Wallet className="h-3 w-3" />
                      Pay Full Balance
                    </Button>
                  )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_amount">Payment Amount *</Label>
                {paymentType === "percentage" ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={paymentPercentage}
                        onChange={(e) => {
                          const percentage = parseFloat(e.target.value) || 0;
                          setPaymentPercentage(e.target.value);
                          if (selectedEventDetails && percentage > 0) {
                            const amount =
                              (selectedEventDetails.event.total_budget *
                                percentage) /
                              100;
                            setNewPayment((prev) => ({
                              ...prev,
                              payment_amount: amount.toFixed(2),
                            }));
                          }
                        }}
                        placeholder="0"
                        className="w-20"
                      />
                      <span className="flex items-center text-sm text-gray-600">
                        %
                      </span>
                    </div>
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
                      disabled
                      className="bg-gray-50"
                    />
                    {selectedEventDetails && paymentPercentage && (
                      <div className="text-xs text-gray-500">
                        {paymentPercentage}% of{" "}
                        {formatCurrency(
                          selectedEventDetails.event.total_budget
                        )}
                      </div>
                    )}
                  </div>
                ) : (
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
                    disabled={paymentType === "full"}
                    className={paymentType === "full" ? "bg-gray-50" : ""}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={newPayment.payment_date}
                  onChange={(e) =>
                    setNewPayment((prev) => ({
                      ...prev,
                      payment_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method *</Label>
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
                  <SelectItem value="cash">💵 Cash</SelectItem>
                  <SelectItem value="gcash">📱 GCash</SelectItem>
                  <SelectItem value="bank-transfer">
                    🏦 Bank Transfer
                  </SelectItem>
                  <SelectItem value="check">📝 Check</SelectItem>
                  <SelectItem value="online-banking">
                    💻 Online Banking
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_status">Status *</Label>
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
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="due_date">Next Due Date (Optional)</Label>
              <Input
                id="due_date"
                type="date"
                value={newPayment.due_date}
                onChange={(e) =>
                  setNewPayment((prev) => ({
                    ...prev,
                    due_date: e.target.value,
                  }))
                }
              />
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
                rows={3}
              />
            </div>

            {/* Payment Attachments */}
            <Card className="border border-dashed border-gray-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  📎 Payment Attachments (Optional)
                  <Badge variant="outline" className="text-xs">
                    Proof of Payment
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-gray-600 mb-2">
                  Upload receipts, screenshots, or other payment proof documents
                </div>

                {/* File Upload */}
                <div>
                  <Label htmlFor="payment_attachments">Choose Files</Label>
                  <Input
                    id="payment_attachments"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setAttachmentFiles(files);
                      setAttachmentDescriptions(
                        new Array(files.length).fill("")
                      );
                    }}
                    className="mt-1"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Supported: JPG, PNG, PDF, DOC, DOCX (Max 5MB each)
                  </div>
                </div>

                {/* File List */}
                {attachmentFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Selected Files:</div>
                    {attachmentFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Description (optional)"
                            value={attachmentDescriptions[index] || ""}
                            onChange={(e) => {
                              const newDescriptions = [
                                ...attachmentDescriptions,
                              ];
                              newDescriptions[index] = e.target.value;
                              setAttachmentDescriptions(newDescriptions);
                            }}
                            className="text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newFiles = attachmentFiles.filter(
                              (_, i) => i !== index
                            );
                            const newDescriptions =
                              attachmentDescriptions.filter(
                                (_, i) => i !== index
                              );
                            setAttachmentFiles(newFiles);
                            setAttachmentDescriptions(newDescriptions);
                          }}
                          className="text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreatePayment(false);
                resetPaymentForm();
              }}
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

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}
