"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Download,
  FileText,
  Image,
  FileIcon,
  Video,
  Music,
  Upload,
  Eye,
  Trash2,
  Receipt,
  User,
  CreditCard,
  Calendar,
  Paperclip,
  MapPin,
  Clock,
  Users,
  DollarSign,
  CheckCircle,
  Circle,
  AlertCircle,
  Phone,
  Mail,
  Package,
} from "lucide-react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

// Enhanced interface to match updated tbl_events structure
interface Event {
  event_id: number;
  original_booking_reference?: string;
  user_id: number;
  admin_id: number;
  organizer_id?: number;
  event_title: string;
  event_theme?: string;
  event_description?: string;
  event_type_id: number;
  guest_count: number;
  event_date: string;
  start_time?: string;
  end_time?: string;
  payment_status: "unpaid" | "partial" | "paid" | "refunded";
  package_id?: number;
  venue_id?: number;
  total_budget: number;
  down_payment: number;
  payment_method?: string;
  payment_schedule_type_id?: number;
  reference_number?: string;
  additional_notes?: string;
  event_status: "draft" | "confirmed" | "on_going" | "done" | "cancelled";
  booking_date?: string;
  booking_time?: string;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
  event_attachments?: any[];
  attachments?: any[];
  event_feedback_id?: number;
  event_wedding_form_id?: number;
  is_recurring?: boolean;
  recurrence_rule?: any;
  cancellation_reason?: string;
  finalized_at?: string;
  client_signature?: string;
  // Joined data from related tables
  venue_name?: string;
  venue_title?: string;
  venue_location?: string;
  venue_contact?: string;
  venue_capacity?: number;
  venue_price?: number;
  client_name?: string;
  client_first_name?: string;
  client_last_name?: string;
  client_suffix?: string;
  client_email?: string;
  client_contact?: string;
  client_pfp?: string;
  client_birthdate?: string;
  client_joined_date?: string;
  client_username?: string;
  event_type_name?: string;
  event_type_description?: string;
  package_title?: string;
  package_description?: string;
  admin_name?: string;
  organizer_name?: string;
  created_by_name?: string;
  updated_by_name?: string;
  payment_schedule_name?: string;
  payment_schedule_description?: string;
  installment_count?: number;
  wedding_details?: any;
  feedback?: any;
  components?: any[];
  timeline?: any[];
  payment_schedule?: any[];
  payments?: any[];
}

interface PaymentHistoryItem {
  payment_id: number;
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  payment_status: string;
  payment_reference?: string;
  installment_number?: number;
  description?: string;
}

// Budget Progress Component
function BudgetProgress({ event }: { event: Event }) {
  const totalPaid =
    event.payments?.reduce(
      (sum, payment: any) =>
        payment.payment_status === "completed"
          ? sum + payment.payment_amount
          : sum,
      0
    ) || 0;
  const remaining = event.total_budget - totalPaid;
  const progressPercentage = (totalPaid / event.total_budget) * 100;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Budget Progress</h3>
        <DollarSign className="h-5 w-5 text-green-600" />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Budget</span>
          <span className="font-semibold text-lg">
            ₱{event.total_budget.toLocaleString()}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-green-700 font-medium">Paid</div>
            <div className="text-green-900 font-semibold">
              ₱{totalPaid.toLocaleString()}
            </div>
            <div className="text-green-600 text-xs">
              {progressPercentage.toFixed(1)}%
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-orange-700 font-medium">Remaining</div>
            <div className="text-orange-900 font-semibold">
              ₱{remaining.toLocaleString()}
            </div>
            <div className="text-orange-600 text-xs">
              {(100 - progressPercentage).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Event Timeline Component
function EventTimeline({ event }: { event: Event }) {
  const getTimelineSteps = () => {
    const steps = [
      {
        id: "booking",
        title: "Event Booked",
        date: event.created_at,
        status: "completed",
        icon: Calendar,
        description: "Event booking confirmed",
      },
      {
        id: "payment",
        title: "Initial Payment",
        date: event.payments?.[0]?.payment_date,
        status: event.down_payment > 0 ? "completed" : "pending",
        icon: CreditCard,
        description: `Down payment: ₱${event.down_payment.toLocaleString()}`,
      },
      {
        id: "planning",
        title: "Event Planning",
        date: null,
        status: event.event_status === "confirmed" ? "in-progress" : "pending",
        icon: Edit,
        description: "Finalizing event details",
      },
      {
        id: "final-payment",
        title: "Final Payment",
        date: null,
        status: event.payment_status === "paid" ? "completed" : "pending",
        icon: DollarSign,
        description: "Complete payment settlement",
      },
      {
        id: "execution",
        title: "Event Day",
        date: event.event_date,
        status:
          event.event_status === "done"
            ? "completed"
            : event.event_status === "on_going"
              ? "in-progress"
              : "pending",
        icon: Users,
        description: "Event execution",
      },
    ];

    return steps;
  };

  const steps = getTimelineSteps();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 border-green-500";
      case "in-progress":
        return "bg-blue-500 border-blue-500";
      case "pending":
        return "bg-gray-300 border-gray-300";
      default:
        return "bg-gray-300 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return CheckCircle;
      case "in-progress":
        return Clock;
      case "pending":
        return Circle;
      default:
        return Circle;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Event Progress
      </h3>

      <div className="space-y-6">
        {steps.map((step, index) => {
          const StatusIcon = getStatusIcon(step.status);
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex items-start space-x-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${getStatusColor(step.status)}`}
                >
                  <StepIcon className="h-5 w-5 text-white" />
                </div>
                {index < steps.length - 1 && (
                  <div className="w-0.5 h-12 bg-gray-200 mt-2"></div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {step.title}
                  </h4>
                  <StatusIcon
                    className={`h-4 w-4 ${
                      step.status === "completed"
                        ? "text-green-500"
                        : step.status === "in-progress"
                          ? "text-blue-500"
                          : "text-gray-400"
                    }`}
                  />
                </div>
                <p className="text-sm text-gray-600 mb-1">{step.description}</p>
                {step.date && (
                  <p className="text-xs text-gray-500">
                    {new Date(step.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Client Profile Component
function ClientProfile({ event }: { event: Event }) {
  const getClientInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getClientFullName = () => {
    let fullName = "";
    if (event.client_first_name) fullName += event.client_first_name;
    if (event.client_last_name) fullName += ` ${event.client_last_name}`;
    if (event.client_suffix) fullName += ` ${event.client_suffix}`;
    return fullName.trim() || event.client_name || "Unknown Client";
  };

  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).getFullYear().toString();
    } catch {
      return "N/A";
    }
  };

  const getProfileImageUrl = (pfpPath?: string) => {
    if (!pfpPath) return null;
    // Handle both relative and absolute paths
    if (pfpPath.startsWith("http")) {
      return pfpPath;
    }
    // Use the image serving script for proper image delivery
    return `http://localhost/events-api/serve-image.php?path=${encodeURIComponent(pfpPath)}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-start space-x-4">
        {/* Profile Picture */}
        <div className="relative flex-shrink-0">
          {event.client_pfp ? (
            <>
              <img
                src={getProfileImageUrl(event.client_pfp) || ""}
                alt={`${getClientFullName()}'s profile`}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  e.currentTarget.style.display = "none";
                  const fallbackDiv = e.currentTarget
                    .nextElementSibling as HTMLElement;
                  if (fallbackDiv) {
                    fallbackDiv.classList.remove("hidden");
                  }
                }}
              />
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {getClientInitials(getClientFullName())}
                </span>
              </div>
            </>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {getClientInitials(getClientFullName())}
              </span>
            </div>
          )}
          {/* Online status indicator */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full"></div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Client Name */}
          <div className="mb-2">
            <h3 className="text-xl font-semibold text-gray-900 leading-tight">
              {getClientFullName()}
            </h3>
          </div>

          {/* Client Role and Username */}
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-600">Primary Client</span>
              {event.client_username && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">
                    @{event.client_username}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3 mb-4">
            {event.client_email && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                <span className="truncate">{event.client_email}</span>
              </div>
            )}
            {event.client_contact && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                <span>{event.client_contact}</span>
              </div>
            )}
            {event.client_birthdate && (
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                <span>
                  Born {new Date(event.client_birthdate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Footer with join date and status */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Client since {formatJoinDate(event.client_joined_date)}
              </span>
              <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full text-xs">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Payment History Component
function PaymentHistoryTab({ event }: { event: Event }) {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPaymentHistory();
  }, [event.event_id]);

  const fetchPaymentHistory = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "getEventPayments",
          event_id: event.event_id,
        }
      );

      if (response.data.status === "success") {
        setPaymentHistory(response.data.payments || event.payments || []);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      setPaymentHistory(event.payments || []);
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">Payment Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-blue-700">Total Budget</div>
            <div className="font-semibold text-blue-900">
              ₱{event.total_budget.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-blue-700">Down Payment</div>
            <div className="font-semibold text-blue-900">
              ₱{event.down_payment.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-blue-700">Total Paid</div>
            <div className="font-semibold text-blue-900">
              ₱
              {(
                paymentHistory?.reduce(
                  (sum, p) =>
                    p.payment_status === "completed"
                      ? sum + p.payment_amount
                      : sum,
                  0
                ) || 0
              ).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-blue-700">Status</div>
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(event.payment_status)}`}
            >
              {event.payment_status}
            </span>
          </div>
        </div>
      </div>

      {paymentHistory && paymentHistory.length > 0 ? (
        <div className="space-y-3">
          {paymentHistory.map((payment: any, index: number) => (
            <div
              key={payment.payment_id || index}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900">
                      ₱{payment.payment_amount.toLocaleString()}
                    </h5>
                    <p className="text-sm text-gray-600 capitalize">
                      {payment.payment_method || "N/A"}
                      {payment.installment_number &&
                        ` • Installment ${payment.installment_number}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(payment.payment_status)}`}
                  >
                    {payment.payment_status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {payment.payment_reference && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-2">
                  <span className="font-medium">Reference:</span>{" "}
                  {payment.payment_reference}
                </div>
              )}

              {payment.description && (
                <p className="text-sm text-gray-600 mt-2">
                  {payment.description}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            No Payment History
          </h4>
          <p className="text-gray-600">
            Payment records will appear here once processed.
          </p>
        </div>
      )}
    </div>
  );
}

export default function EventDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    protectRoute();
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      console.log("🔍 Fetching event details for ID:", eventId);

      const response = await axios.post(
        "http://localhost/events-api/admin.php",
        {
          operation: "getEventById",
          event_id: parseInt(eventId),
        }
      );

      console.log("📡 API Response:", response.data);

      if (response.data.status === "success") {
        setEvent(response.data.event);
        console.log("✅ Event data loaded:", response.data.event);

        // Debug profile picture
        console.log("🖼️ Profile Picture Debug:", {
          client_pfp: response.data.event.client_pfp,
          has_pfp: !!response.data.event.client_pfp,
          pfp_type: typeof response.data.event.client_pfp,
        });

        // Debug attachments
        console.log("📎 Attachments Debug:", {
          event_attachments: response.data.event.event_attachments,
          attachments: response.data.event.attachments,
          has_attachments: !!response.data.event.attachments,
          attachments_length: response.data.event.attachments?.length || 0,
        });
      } else {
        console.error("❌ API Error:", response.data.message);
        toast({
          title: "Error",
          description: response.data.message || "Failed to fetch event details",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Network Error:", error);
      toast({
        title: "Error",
        description:
          "Failed to connect to server. Please check if the backend is running.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "confirmed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "on_going":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "done":
        return "bg-green-100 text-green-700 border-green-300";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-700 border-green-300";
      case "partial":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "unpaid":
        return "bg-red-100 text-red-700 border-red-300";
      case "refunded":
        return "bg-purple-100 text-purple-700 border-purple-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "attachments", label: "Files", icon: Paperclip },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Event not found
        </h3>
        <p className="text-gray-500 mb-4">
          The event you're looking for doesn't exist.
        </p>
        <button
          onClick={() => router.push("/admin/events")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/admin/events")}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Events</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {event.event_title}
                </h1>
                <p className="text-sm text-gray-600">
                  Event ID: #{event.event_id}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(event.event_status)}`}
              >
                {event.event_status}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getPaymentStatusColor(event.payment_status)}`}
              >
                {event.payment_status}
              </span>
              <button
                onClick={() =>
                  router.push(`/admin/event-builder?edit=${event.event_id}`)
                }
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Event</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Client & Progress */}
          <div className="lg:col-span-1 space-y-6">
            <ClientProfile event={event} />
            <BudgetProgress event={event} />
            <EventTimeline event={event} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* Event Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                        Event Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-600">
                              Event Date
                            </div>
                            <div className="font-medium">
                              {new Date(event.event_date).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </div>
                          </div>
                        </div>

                        {event.start_time && event.end_time && (
                          <div className="flex items-center space-x-3">
                            <Clock className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-600">Time</div>
                              <div className="font-medium">
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
                          </div>
                        )}

                        <div className="flex items-center space-x-3">
                          <Users className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-600">
                              Guest Count
                            </div>
                            <div className="font-medium">
                              {event.guest_count} guests
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Package className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-600">
                              Event Type
                            </div>
                            <div className="font-medium">
                              {event.event_type_name || "N/A"}
                            </div>
                          </div>
                        </div>

                        {event.event_theme && (
                          <div className="flex items-center space-x-3">
                            <Edit className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-600">Theme</div>
                              <div className="font-medium">
                                {event.event_theme}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Venue Information */}
                    {event.venue_title && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                          Venue Details
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-600">Venue</div>
                              <div className="font-medium">
                                {event.venue_title}
                              </div>
                            </div>
                          </div>

                          {event.venue_location && (
                            <div className="flex items-start space-x-3">
                              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                              <div>
                                <div className="text-sm text-gray-600">
                                  Location
                                </div>
                                <div className="font-medium">
                                  {event.venue_location}
                                </div>
                              </div>
                            </div>
                          )}

                          {event.venue_capacity && (
                            <div className="flex items-center space-x-3">
                              <Users className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-600">
                                  Capacity
                                </div>
                                <div className="font-medium">
                                  {event.venue_capacity} guests
                                </div>
                              </div>
                            </div>
                          )}

                          {event.venue_contact && (
                            <div className="flex items-center space-x-3">
                              <Phone className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-600">
                                  Contact
                                </div>
                                <div className="font-medium">
                                  {event.venue_contact}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Package & Components */}
                  {event.package_title && (
                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3">
                        Selected Package
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-blue-800">
                            {event.package_title}
                          </h4>
                          {event.package_description && (
                            <p className="text-sm text-blue-700 mt-1">
                              {event.package_description}
                            </p>
                          )}
                        </div>
                        <Package className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  )}

                  {/* Wedding Details */}
                  {event.event_type_id === 1 && event.wedding_details && (
                    <div className="bg-pink-50 rounded-lg p-6 border border-pink-200">
                      <h3 className="text-lg font-semibold text-pink-900 mb-4">
                        Wedding Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {event.wedding_details.bride_name && (
                          <div>
                            <div className="text-sm text-pink-700">Bride</div>
                            <div className="font-medium text-pink-900">
                              {event.wedding_details.bride_name}
                            </div>
                          </div>
                        )}
                        {event.wedding_details.groom_name && (
                          <div>
                            <div className="text-sm text-pink-700">Groom</div>
                            <div className="font-medium text-pink-900">
                              {event.wedding_details.groom_name}
                            </div>
                          </div>
                        )}
                        {event.wedding_details.nuptial && (
                          <div>
                            <div className="text-sm text-pink-700">Nuptial</div>
                            <div className="font-medium text-pink-900">
                              {event.wedding_details.nuptial}
                            </div>
                          </div>
                        )}
                        {event.wedding_details.motif && (
                          <div>
                            <div className="text-sm text-pink-700">Motif</div>
                            <div className="font-medium text-pink-900">
                              {event.wedding_details.motif}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional Notes */}
                  {event.additional_notes && (
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Additional Notes
                      </h3>
                      <p className="text-gray-700">{event.additional_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "payments" && <PaymentHistoryTab event={event} />}

              {activeTab === "attachments" && (
                <div className="space-y-6">
                  {/* Upload Section */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Upload New Attachment
                    </h4>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            console.log("📎 File selected:", file);
                            // TODO: Implement file upload
                          }
                        }}
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Choose File</span>
                      </label>
                      <span className="text-sm text-blue-700">
                        Supported: PDF, DOC, DOCX, JPG, PNG, etc.
                      </span>
                    </div>
                  </div>

                  {/* Attachments List */}
                  {event.attachments &&
                  Array.isArray(event.attachments) &&
                  event.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {event.attachments.map(
                        (attachment: any, index: number) => {
                          const getFileIcon = (fileName: string) => {
                            const extension = fileName
                              .split(".")
                              .pop()
                              ?.toLowerCase();
                            switch (extension) {
                              case "pdf":
                              case "doc":
                              case "docx":
                              case "txt":
                                return FileText;
                              case "jpg":
                              case "jpeg":
                              case "png":
                              case "gif":
                              case "webp":
                                return Image;
                              case "mp4":
                              case "avi":
                              case "mov":
                              case "mkv":
                                return Video;
                              case "mp3":
                              case "wav":
                              case "flac":
                                return Music;
                              default:
                                return FileIcon;
                            }
                          };

                          const formatFileSize = (bytes: number) => {
                            if (bytes === 0) return "0 Bytes";
                            const k = 1024;
                            const sizes = ["Bytes", "KB", "MB", "GB"];
                            const i = Math.floor(Math.log(bytes) / Math.log(k));
                            return (
                              parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
                              " " +
                              sizes[i]
                            );
                          };

                          const handleFileDownload = (attachment: any) => {
                            const link = document.createElement("a");
                            link.href = `http://localhost/events-api/${attachment.file_path}`;
                            link.download = attachment.original_name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          };

                          const IconComponent = getFileIcon(
                            attachment.original_name || attachment.file_name
                          );

                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <IconComponent className="h-8 w-8 text-blue-600 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {attachment.original_name ||
                                      attachment.file_name}
                                  </p>
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    {attachment.file_size && (
                                      <span>
                                        {formatFileSize(attachment.file_size)}
                                      </span>
                                    )}
                                    {attachment.uploaded_at && (
                                      <>
                                        <span>•</span>
                                        <span>
                                          {new Date(
                                            attachment.uploaded_at
                                          ).toLocaleDateString()}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleFileDownload(attachment)}
                                className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex-shrink-0 ml-2"
                                title="Download file"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Paperclip className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        No Attachments
                      </h4>
                      <p className="text-gray-600">
                        Event attachments will appear here when uploaded.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
