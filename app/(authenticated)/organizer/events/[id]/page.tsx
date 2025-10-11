"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Phone,
  Mail,
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Package,
  Circle,
  TrendingUp,
  BarChart3,
  X,
} from "lucide-react";
import { apiClient } from "@/app/utils/apiClient";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import axios from "axios";
import { api } from "@/app/config/api";

// Feature flag: toggle delivery progress functionality for organizer
const ENABLE_DELIVERY_PROGRESS = false;

interface Event {
  event_id: number;
  event_title: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  event_status: "draft" | "confirmed" | "on_going" | "done" | "cancelled";
  payment_status: "unpaid" | "partial" | "paid" | "refunded";
  guest_count: number;
  total_budget: number;
  down_payment: number;
  event_type_name?: string;
  venue_title?: string;
  venue_location?: string;
  venue_contact?: string;
  venue_capacity?: number;
  client_name?: string;
  client_email?: string;
  client_contact?: string;
  client_pfp?: string;
  additional_notes?: string;
  assignment_status?: string;
  assigned_at?: string;
  components?: EventComponent[];
  timeline?: any[];
  payments?: any[];
  attachments?: any[];
  organizer_id?: number;
  venue_id?: number;
  organizer_payment_status?: "unpaid" | "partial" | "paid" | "cancelled";
  venue_payment_status?: "unpaid" | "partial" | "paid" | "cancelled";
}

interface EventComponent {
  component_id: number;
  event_id: number;
  component_name: string;
  component_price: number;
  component_description?: string;
  is_custom: boolean;
  is_included: boolean;
  payment_status?: "pending" | "paid" | "cancelled";
  payment_date?: string;
  payment_notes?: string;
  component_notes?: string;
  quantity?: number;
  unit?: string;
  supplier_status?: "pending" | "confirmed" | "delivered" | "cancelled";
  delivery_date?: string;
  supplier_notes?: string;
}

export default function OrganizerEventDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [organizerId, setOrganizerId] = useState<number | null>(null);
  const [updating, setUpdating] = useState<"accepted" | "rejected" | null>(
    null
  );
  const [expandedComponents, setExpandedComponents] = useState<
    Set<string | number>
  >(new Set());
  const [showGanttModal, setShowGanttModal] = useState(false);
  const [deliveryProgress, setDeliveryProgress] = useState<any>(null);
  const [updatingDelivery, setUpdatingDelivery] = useState<number | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedComponent, setSelectedComponent] =
    useState<EventComponent | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        protectRoute();
        const userData = secureStorage.getItem("user");
        if (
          !userData ||
          !userData.user_role ||
          (userData.user_role.toLowerCase() !== "organizer" &&
            userData.user_role !== "Organizer")
        ) {
          router.push("/auth/login");
          return;
        }
        // Resolve organizer_id for accept/reject actions
        try {
          const profile = await axios.post("/organizer.php", {
            operation: "getOrganizerProfile",
            user_id: userData.user_id,
          });
          if (
            profile.data?.status === "success" &&
            profile.data.data?.organizer_id
          ) {
            setOrganizerId(profile.data.data.organizer_id);
          } else {
            console.error(
              "Failed to get organizer profile or organizer_id not found"
            );
            toast({
              title: "Error",
              description:
                "Unable to resolve organizer ID. Please contact support.",
              variant: "destructive",
            });
            router.push("/organizer/events");
            return;
          }
        } catch (error) {
          console.error("Error fetching organizer profile:", error);
          toast({
            title: "Error",
            description:
              "Unable to load organizer profile. Please contact support.",
            variant: "destructive",
          });
          router.push("/organizer/events");
          return;
        }
        await fetchEventDetails();
      } catch (error) {
        router.push("/auth/login");
      }
    };
    checkAuth();
  }, [router, eventId]);

  // Fetch delivery progress when organizerId is available and all components are paid
  useEffect(() => {
    if (!ENABLE_DELIVERY_PROGRESS) return;
    if (organizerId && event && event.components) {
      const includedComponents = event.components.filter(
        (comp) => comp.is_included
      );
      const paidComponents = includedComponents.filter(
        (comp) => comp.payment_status?.toLowerCase() === "paid"
      );

      // Only fetch delivery progress if all included components are paid
      if (
        includedComponents.length > 0 &&
        includedComponents.length === paidComponents.length
      ) {
        fetchDeliveryProgress();
      }
    }
  }, [organizerId, event]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      console.log("🔍 Fetching event details for ID:", eventId);

      const response = await axios.post("/organizer.php", {
        operation: "getOrganizerEventDetails",
        event_id: parseInt(eventId),
      });

      console.log("📡 Organizer API Response:", response.data);

      if (response.data?.status === "success") {
        const raw = response.data.event || {};
        // Normalize a few potential API variations
        const normalized: Event = {
          event_id: Number(raw.event_id),
          event_title: String(
            raw.event_title || raw.title || "Untitled Event"
          ).trim(),
          event_date: String(raw.event_date || raw.date || "").slice(0, 10),
          start_time: raw.start_time || raw.start || undefined,
          end_time: raw.end_time || raw.end || undefined,
          event_status: (raw.event_status ||
            raw.status ||
            "draft") as Event["event_status"],
          payment_status: (raw.payment_status ||
            "unpaid") as Event["payment_status"],
          guest_count: Number(raw.guest_count || raw.guests || 0),
          total_budget: Number(raw.total_budget || raw.budget || 0),
          down_payment: Number(raw.down_payment || raw.down || 0),
          event_type_name:
            raw.event_type_name || raw.event_name || raw.type || undefined,
          venue_title: raw.venue_title || raw.venue || undefined,
          venue_location: raw.venue_location || raw.location || undefined,
          venue_contact: raw.venue_contact || undefined,
          venue_capacity: raw.venue_capacity
            ? Number(raw.venue_capacity)
            : undefined,
          client_name: raw.client_name || raw.client || undefined,
          client_email: raw.client_email || undefined,
          client_contact: raw.client_contact || undefined,
          client_pfp: raw.client_pfp || undefined,
          additional_notes: raw.additional_notes || raw.notes || undefined,
          assignment_status: raw.assignment_status || raw.status || undefined,
          assigned_at: raw.assigned_at || undefined,
          components: Array.isArray(raw.components) ? raw.components : [],
          timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
          payments: Array.isArray(raw.payments) ? raw.payments : [],
          attachments: Array.isArray(raw.attachments)
            ? raw.attachments
            : (() => {
                try {
                  return raw.event_attachments
                    ? JSON.parse(raw.event_attachments)
                    : [];
                } catch {
                  return [];
                }
              })(),
        };
        setEvent(normalized);
        console.log("✅ Event data loaded:", response.data.event);
      } else {
        const errorMessage =
          response.data?.message || "Failed to fetch event details";
        console.error("❌ Organizer API Error:", errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("❌ Network Error:", error);

      // Extract meaningful error message
      let errorMessage = "Failed to fetch event details";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateAssignment = async (status: "accepted" | "rejected") => {
    if (!event?.event_id) return;
    if (event.assignment_status && event.assignment_status !== "assigned") {
      return;
    }
    try {
      setUpdating(status);
      const details = await axios.get(
        `admin.php?operation=getEventOrganizerDetails&event_id=${event.event_id}`
      );
      const assignmentId = details.data?.data?.organizer_assignment_id;
      if (!assignmentId) {
        toast({
          title: "No assignment found",
          description: "This event doesn't have an organizer assignment yet.",
          variant: "destructive",
        });
        return;
      }
      const res = await axios.post(
        "/organizer.php",
        {
          operation: "updateAssignmentStatus",
          ...(assignmentId ? { assignment_id: Number(assignmentId) } : {}),
          event_id: event.event_id,
          status,
          organizer_id: organizerId ?? 0,
        },
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.data?.status === "success") {
        toast({
          title:
            status === "accepted"
              ? "Assignment accepted"
              : "Assignment rejected",
          description:
            status === "accepted"
              ? "You are now assigned to this event."
              : "This event has been marked as rejected.",
        });
        if (status === "accepted") {
          await fetchEventDetails();
        } else {
          // On reject, go back to list so organizer can look for other events
          router.push("/organizer/events");
        }
      } else {
        throw new Error(res.data?.message || "Failed to update");
      }
    } catch (e) {
      toast({
        title: "Action failed",
        description: "Could not update assignment status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-700 border-green-300";
      case "draft":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "on_going":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "done":
        return "bg-purple-100 text-purple-700 border-purple-300";
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

  const getClientInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getProfileImageUrl = (pfpPath?: string) => {
    if (!pfpPath) return undefined;
    return api.getServeImageUrl(pfpPath) || undefined;
  };

  const toggleComponent = (componentId: string | number) => {
    setExpandedComponents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(componentId)) {
        newSet.delete(componentId);
      } else {
        newSet.add(componentId);
      }
      return newSet;
    });
  };

  // Delivery tracking functions
  const fetchDeliveryProgress = async () => {
    if (!ENABLE_DELIVERY_PROGRESS) return;
    if (!organizerId) return;

    try {
      setDeliveryError(null);
      const response = await axios.post("/organizer.php", {
        operation: "getEventDeliveryProgress",
        event_id: parseInt(eventId),
        organizer_id: organizerId,
      });

      if (response.data?.status === "success") {
        setDeliveryProgress(response.data.data);
        setDeliveryError(null);
      } else {
        setDeliveryError(
          response.data?.message || "Failed to load delivery progress."
        );
      }
    } catch (error) {
      console.error("Error fetching delivery progress:", error);
      setDeliveryError("Unable to contact server for delivery progress.");
    }
  };

  const updateDeliveryStatus = async (
    componentId: number,
    status: string,
    deliveryDate?: string,
    notes?: string
  ) => {
    if (!ENABLE_DELIVERY_PROGRESS) return;
    if (!organizerId) return;

    // Ensure organizer has accepted the assignment before allowing updates
    if (
      event?.assignment_status &&
      event.assignment_status.toLowerCase() !== "accepted"
    ) {
      toast({
        title: "Action not allowed",
        description:
          "You must accept the assignment before updating delivery status.",
        variant: "destructive",
      });
      return;
    }

    // Check if all included components are paid before allowing delivery updates
    const includedComponents =
      event?.components?.filter((comp) => comp.is_included) || [];
    const paidComponents = includedComponents.filter(
      (comp) => comp.payment_status?.toLowerCase() === "paid"
    );

    if (
      includedComponents.length > 0 &&
      includedComponents.length !== paidComponents.length
    ) {
      toast({
        title: "Cannot Update Delivery",
        description:
          "All included components must be paid before tracking delivery status.",
        variant: "destructive",
      });
      return;
    }

    // Ensure a valid date is sent; default to today if missing
    const effectiveDeliveryDate =
      deliveryDate && deliveryDate.trim().length > 0
        ? deliveryDate
        : new Date().toISOString().split("T")[0];

    setUpdatingDelivery(componentId);
    try {
      const response = await axios.post("/organizer.php", {
        operation: "updateComponentDeliveryStatus",
        component_id: componentId,
        delivery_status: status,
        delivery_date: effectiveDeliveryDate,
        delivery_notes: notes,
        organizer_id: organizerId,
      });

      if (response.data?.status === "success") {
        toast({
          title: "Success",
          description: "Delivery status updated successfully",
        });
        // Refresh delivery progress and event data
        await fetchDeliveryProgress();
        await fetchEventDetails();
      } else {
        const msg =
          response.data?.message || "Failed to update delivery status";
        toast({ title: "Error", description: msg, variant: "destructive" });
        return;
      }
    } catch (error: any) {
      console.error("Error updating delivery status:", error);
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update delivery status. Please try again.";
      toast({
        title: "Error",
        description: backendMessage,
        variant: "destructive",
      });
    } finally {
      setUpdatingDelivery(null);
    }
  };

  const openDeliveryModal = (component: EventComponent) => {
    if (!ENABLE_DELIVERY_PROGRESS) return;
    // Ensure organizer has accepted the assignment before allowing updates
    if (
      event?.assignment_status &&
      event.assignment_status.toLowerCase() !== "accepted"
    ) {
      toast({
        title: "Action not allowed",
        description:
          "You must accept the assignment before updating delivery status.",
        variant: "destructive",
      });
      return;
    }

    // Check if all included components are paid before allowing delivery updates
    const includedComponents =
      event?.components?.filter((comp) => comp.is_included) || [];
    const paidComponents = includedComponents.filter(
      (comp) => comp.payment_status?.toLowerCase() === "paid"
    );

    if (
      includedComponents.length > 0 &&
      includedComponents.length !== paidComponents.length
    ) {
      toast({
        title: "Cannot Update Delivery",
        description:
          "All included components must be paid before tracking delivery status.",
        variant: "destructive",
      });
      return;
    }

    setSelectedComponent(component);
    setShowDeliveryModal(true);
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-700 border-green-300";
      case "confirmed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getDeliveryStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "confirmed":
        return <Clock className="h-4 w-4" />;
      case "pending":
        return <Circle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  // Event Progress Components
  const EventProgress = ({ event }: { event: Event }) => {
    const includedComponents = (event.components || []).filter(
      (comp) => comp.is_included
    );
    const paidComponents = includedComponents.filter(
      (comp) => comp.payment_status === "paid"
    );
    const organizerPaid = event.organizer_payment_status === "paid";
    const venuePaid = event.venue_payment_status === "paid";

    const extraEntitiesCount =
      (event.organizer_id ? 1 : 0) + (event.venue_id ? 1 : 0);
    const totalIncluded = includedComponents.length + extraEntitiesCount;
    const totalPaid =
      paidComponents.length + (organizerPaid ? 1 : 0) + (venuePaid ? 1 : 0);

    const completionPercentage =
      totalIncluded > 0 ? Math.round((totalPaid / totalIncluded) * 100) : 0;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-in slide-in-from-right-2 duration-300">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-brand-500" />
          Event Progress
        </h3>

        {/* Inclusion Status */}
        <div
          className={`p-4 rounded-lg border mb-4 ${
            completionPercentage === 100
              ? "bg-green-50 border-green-200"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Inclusion Status: {totalPaid} of {totalIncluded} completed
              </span>
            </div>
            <span
              className={`text-sm font-bold ${
                completionPercentage === 100
                  ? "text-green-600"
                  : "text-yellow-600"
              }`}
            >
              {completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                completionPercentage === 100 ? "bg-green-500" : "bg-yellow-500"
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          {completionPercentage !== 100 && (
            <p className="text-xs text-yellow-700 mt-2">
              All inclusions must be paid before the event can be finalized.
            </p>
          )}
        </div>

        {/* Component Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Component Status
          </h4>
          {includedComponents.map((component, index) => (
            <div
              key={component.component_id || index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {component.component_name}
                </span>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  component.payment_status === "paid"
                    ? "bg-green-100 text-green-700"
                    : component.payment_status === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {component.payment_status === "paid" && (
                  <>
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Paid
                  </>
                )}
                {component.payment_status === "pending" && (
                  <>
                    <Clock className="h-3 w-3 inline mr-1" />
                    Pending
                  </>
                )}
                {component.payment_status === "cancelled" && (
                  <>
                    <XCircle className="h-3 w-3 inline mr-1" />
                    Cancelled
                  </>
                )}
              </span>
            </div>
          ))}

          {/* Organizer Status */}
          {event.organizer_id && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Organizer Payment</span>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  event.organizer_payment_status === "paid"
                    ? "bg-green-100 text-green-700"
                    : event.organizer_payment_status === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {event.organizer_payment_status === "paid" && (
                  <>
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Paid
                  </>
                )}
                {event.organizer_payment_status === "unpaid" && (
                  <>
                    <Clock className="h-3 w-3 inline mr-1" />
                    Pending
                  </>
                )}
                {event.organizer_payment_status === "cancelled" && (
                  <>
                    <XCircle className="h-3 w-3 inline mr-1" />
                    Cancelled
                  </>
                )}
              </span>
            </div>
          )}

          {/* Venue Status */}
          {event.venue_id && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Venue Payment</span>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  event.venue_payment_status === "paid"
                    ? "bg-green-100 text-green-700"
                    : event.venue_payment_status === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {event.venue_payment_status === "paid" && (
                  <>
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Paid
                  </>
                )}
                {event.venue_payment_status === "unpaid" && (
                  <>
                    <Clock className="h-3 w-3 inline mr-1" />
                    Pending
                  </>
                )}
                {event.venue_payment_status === "cancelled" && (
                  <>
                    <XCircle className="h-3 w-3 inline mr-1" />
                    Cancelled
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Event Countdown Component
  const EventCountdown = ({ event }: { event: Event }) => {
    const calculateDaysLeft = () => {
      const eventDate = new Date(event.event_date);
      const today = new Date();
      const timeDiff = eventDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return daysLeft;
    };

    const daysLeft = calculateDaysLeft();

    const getCountdownColor = () => {
      if (daysLeft < 0) return "text-red-600";
      if (daysLeft <= 7) return "text-orange-600";
      if (daysLeft <= 30) return "text-yellow-600";
      return "text-green-600";
    };

    const getCountdownBg = () => {
      if (daysLeft < 0) return "bg-red-50 border-red-200";
      if (daysLeft <= 7) return "bg-orange-50 border-orange-200";
      if (daysLeft <= 30) return "bg-yellow-50 border-yellow-200";
      return "bg-green-50 border-green-200";
    };

    const getCountdownMessage = () => {
      if (daysLeft < 0) return "Event has passed";
      if (daysLeft === 0) return "Event is today!";
      if (daysLeft === 1) return "Event is tomorrow";
      if (daysLeft <= 7) return "Event is this week";
      if (daysLeft <= 30) return "Event is this month";
      return "Event is coming up";
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-in slide-in-from-right-2 duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-brand-500" />
            Event Countdown
          </h3>
          <button
            onClick={() => setShowGanttModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="View Gantt Chart Timeline"
          >
            <Calendar className="h-5 w-5 text-gray-600 hover:text-brand-500" />
          </button>
        </div>

        <div className={`p-4 rounded-lg border ${getCountdownBg()}`}>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getCountdownColor()} mb-2`}>
              {daysLeft < 0 ? Math.abs(daysLeft) : daysLeft}
            </div>
            <div className="text-sm font-medium text-gray-700 mb-1">
              {daysLeft < 0 ? "Days since event" : "Days remaining"}
            </div>
            <div className="text-xs text-gray-600">{getCountdownMessage()}</div>
          </div>

          {/* Event Date */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Event Date:</span>
                <span className="font-medium">
                  {format(new Date(event.event_date), "MMM dd, yyyy")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Gantt Chart Modal Component
  const GanttChartModal = ({
    event,
    isOpen,
    onClose,
  }: {
    event: Event;
    isOpen: boolean;
    onClose: () => void;
  }) => {
    const todayRef = useRef<HTMLDivElement>(null);
    const modalContentRef = useRef<HTMLDivElement>(null);

    const calculateDaysLeft = () => {
      const eventDate = new Date(event.event_date);
      const today = new Date();
      const timeDiff = eventDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return daysLeft;
    };

    const daysLeft = calculateDaysLeft();
    const today = new Date();
    const eventDate = new Date(event.event_date);

    // Auto-scroll to current date when modal opens
    useEffect(() => {
      if (isOpen && todayRef.current && modalContentRef.current) {
        // Small delay to ensure modal is fully rendered
        const timer = setTimeout(() => {
          todayRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }, 300);

        return () => clearTimeout(timer);
      }
    }, [isOpen]);

    const generateCalendarData = () => {
      const startDate = new Date(today);
      const endDate = new Date(eventDate);

      // Start from beginning of current month or event month, whichever is earlier
      const calendarStart = new Date(
        Math.min(startDate.getFullYear(), endDate.getFullYear()),
        Math.min(startDate.getMonth(), endDate.getMonth()),
        1
      );

      // End at end of event month
      const calendarEnd = new Date(
        endDate.getFullYear(),
        endDate.getMonth() + 1,
        0
      );

      const months: Array<{
        year: number;
        month: number;
        monthName: string;
        days: Array<{
          day: number | null;
          date: Date | null;
          isToday: boolean;
          isEventDay: boolean;
          isInRange: boolean;
        }>;
      }> = [];
      let currentMonth = new Date(calendarStart);

      while (currentMonth <= calendarEnd) {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const monthData = {
          year,
          month,
          monthName: firstDay.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
          days: [] as Array<{
            day: number | null;
            date: Date | null;
            isToday: boolean;
            isEventDay: boolean;
            isInRange: boolean;
          }>,
        };

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
          monthData.days.push({
            day: null,
            date: null,
            isToday: false,
            isEventDay: false,
            isInRange: false,
          });
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const isToday = date.toDateString() === today.toDateString();
          const isEventDay = date.toDateString() === eventDate.toDateString();
          const isInRange = date >= today && date <= eventDate;

          monthData.days.push({
            day,
            date,
            isToday,
            isEventDay,
            isInRange,
          });
        }

        months.push(monthData);
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }

      return months;
    };

    const calendarData = generateCalendarData();

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-brand-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Event Calendar
                </h2>
                <p className="text-sm text-gray-600">
                  {event.event_title} -{" "}
                  {format(new Date(event.event_date), "MMM dd, yyyy")}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div ref={modalContentRef} className="p-6 overflow-y-auto flex-1">
            {/* Event Info */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Event Timeline
                </h3>
                <div className="text-sm text-gray-600">
                  {daysLeft < 0
                    ? `${Math.abs(daysLeft)} days since event`
                    : `${daysLeft} days remaining`}
                </div>
              </div>
            </div>

            {/* Calendar View */}
            <div className="space-y-6">
              {calendarData.map((month, monthIndex) => (
                <div
                  key={monthIndex}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Month Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 text-center">
                      {month.monthName}
                    </h4>
                  </div>

                  {/* Calendar Grid */}
                  <div className="p-4">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (day) => (
                          <div
                            key={day}
                            className="text-center text-sm font-medium text-gray-500 py-2"
                          >
                            {day}
                          </div>
                        )
                      )}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {month.days.map((dayData, dayIndex) => (
                        <div
                          key={dayIndex}
                          ref={dayData.isToday ? todayRef : null}
                          className={`
                            aspect-square flex items-center justify-center text-sm font-medium rounded-lg border-2 transition-all
                            ${
                              !dayData.day
                                ? "invisible"
                                : dayData.isEventDay
                                  ? "bg-red-500 text-white border-red-600 shadow-lg"
                                  : dayData.isToday
                                    ? "bg-blue-500 text-white border-blue-600 shadow-lg"
                                    : dayData.isInRange
                                      ? "bg-green-100 text-green-700 border-green-300"
                                      : "bg-gray-50 text-gray-600 border-gray-200"
                            }
                          `}
                          title={
                            dayData.date
                              ? `${dayData.date.toLocaleDateString()}${dayData.isEventDay ? " (Event Day)" : dayData.isToday ? " (Today)" : dayData.isInRange ? " (In Range)" : ""}`
                              : ""
                          }
                        >
                          {dayData.day}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fixed Legend at Bottom */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 border-2 border-blue-600 rounded"></div>
                <span className="text-gray-600">Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 border-2 border-red-600 rounded"></div>
                <span className="text-gray-600">Event Day</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                <span className="text-gray-600">Days Until Event</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-50 border-2 border-gray-200 rounded"></div>
                <span className="text-gray-600">Other Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "attachments", label: "Files", icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading event details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Event Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The event you're looking for doesn't exist or you don't have
              access to it.
            </p>
            <button
              onClick={() => router.push("/organizer/events")}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 animate-in slide-in-from-top-2 fade-in-50 duration-300">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/organizer/events")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {event.event_title}
                </h1>
                <p className="text-gray-600">Event ID: #{event.event_id}</p>
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 animate-in fade-in-50 duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 animate-in fade-in-50 duration-300">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                          activeTab === tab.id
                            ? "border-brand-500 text-brand-600"
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

              <div className="p-6">
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* Event Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Event Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Event Date
                            </p>
                            <p className="text-sm text-gray-600">
                              {format(
                                new Date(event.event_date),
                                "EEEE, MMMM d, yyyy"
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Users className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Guest Count
                            </p>
                            <p className="text-sm text-gray-600">
                              {event.guest_count} guests
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Total Budget
                            </p>
                            <p className="text-sm text-gray-600">
                              ₱{event.total_budget.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Client Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Client Information
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-4">
                          {event.client_pfp &&
                          getProfileImageUrl(event.client_pfp) ? (
                            <img
                              src={getProfileImageUrl(event.client_pfp)}
                              alt={`${event.client_name}'s profile`}
                              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextElementSibling?.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-16 h-16 bg-gradient-to-br from-[#028A75] to-[#027a65] rounded-full flex items-center justify-center ${event.client_pfp ? "hidden" : ""}`}
                          >
                            <span className="text-white font-medium text-lg">
                              {getClientInitials(event.client_name || "C")}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {event.client_name}
                            </h4>
                            <div className="flex flex-col items-start space-y-2 mt-2 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Mail className="h-4 w-4" />
                                <span>{event.client_email}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Phone className="h-4 w-4" />
                                <span>{event.client_contact}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Venue Information */}
                    {event.venue_title && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Venue Information
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {event.venue_title}
                              </h4>
                              <p className="text-gray-600 mt-1">
                                {event.venue_location}
                              </p>
                              {event.venue_contact && (
                                <p className="text-gray-600 mt-1">
                                  Contact: {event.venue_contact}
                                </p>
                              )}
                              {event.venue_capacity && (
                                <p className="text-gray-600 mt-1">
                                  Capacity: {event.venue_capacity} guests
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Notes */}
                    {event.additional_notes && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Additional Notes
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-700">
                            {event.additional_notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "timeline" && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Event Timeline & Components
                      </h3>
                      <div className="text-sm text-gray-600">
                        Event ID: #{eventId} • {event.event_status} •{" "}
                        {event.payment_status}
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Components Section */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                          <Package className="h-4 w-4 mr-2 text-gray-600" />
                          Event Components
                        </h4>
                        {event.components &&
                          event.components
                            .filter(
                              (component, index, self) =>
                                index ===
                                self.findIndex(
                                  (c) =>
                                    c.component_id === component.component_id
                                )
                            )
                            .map((component, index) => (
                              <div
                                key={component.component_id || index}
                                className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-in slide-in-from-left-2 duration-300"
                              >
                                <button
                                  onClick={() =>
                                    toggleComponent(
                                      component.component_id || index
                                    )
                                  }
                                  className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                                >
                                  <div className="flex items-center space-x-3">
                                    <Package className="h-5 w-5 text-brand-500" />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-gray-900">
                                          {component.component_name}
                                        </h4>
                                        {/* Inclusion Status */}
                                        <span
                                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            component.is_included
                                              ? "bg-green-100 text-green-700"
                                              : "bg-gray-100 text-gray-700"
                                          }`}
                                        >
                                          {component.is_included
                                            ? "Included"
                                            : "Not Included"}
                                        </span>
                                      </div>
                                      {component.component_price && (
                                        <p className="text-sm text-gray-600">
                                          ₱
                                          {Number(
                                            component.component_price
                                          ).toLocaleString()}
                                        </p>
                                      )}
                                      {/* Payment Status */}
                                      {component.is_included && (
                                        <div className="flex items-center gap-2 mt-1">
                                          <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                                              component.payment_status ===
                                              "paid"
                                                ? "bg-green-100 text-green-700"
                                                : component.payment_status ===
                                                    "cancelled"
                                                  ? "bg-red-100 text-red-700"
                                                  : "bg-yellow-100 text-yellow-700"
                                            }`}
                                          >
                                            {component.payment_status ===
                                              "paid" && (
                                              <>
                                                <CheckCircle className="h-3 w-3 inline mr-1" />
                                                Paid
                                              </>
                                            )}
                                            {component.payment_status ===
                                              "pending" && (
                                              <>
                                                <Clock className="h-3 w-3 inline mr-1" />
                                                Pending
                                              </>
                                            )}
                                            {component.payment_status ===
                                              "cancelled" && (
                                              <>
                                                <XCircle className="h-3 w-3 inline mr-1" />
                                                Cancelled
                                              </>
                                            )}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {expandedComponents.has(
                                    component.component_id || index
                                  ) ? (
                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                  )}
                                </button>

                                {expandedComponents.has(
                                  component.component_id || index
                                ) && (
                                  <div className="px-4 pb-4 border-t border-gray-100">
                                    <div className="pt-4 space-y-3">
                                      {component.component_description && (
                                        <div>
                                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                                            Description:
                                          </h5>
                                          <p className="text-sm text-gray-600">
                                            {component.component_description}
                                          </p>
                                        </div>
                                      )}

                                      {component.component_notes && (
                                        <div>
                                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                                            Notes:
                                          </h5>
                                          <p className="text-sm text-gray-600">
                                            {component.component_notes}
                                          </p>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        {component.quantity && (
                                          <div>
                                            <span className="font-medium text-gray-700">
                                              Quantity:
                                            </span>
                                            <span className="ml-2 text-gray-600">
                                              {component.quantity}
                                            </span>
                                          </div>
                                        )}
                                        {component.unit && (
                                          <div>
                                            <span className="font-medium text-gray-700">
                                              Unit:
                                            </span>
                                            <span className="ml-2 text-gray-600">
                                              {component.unit}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Payment Details */}
                                      {component.is_included &&
                                        component.payment_status && (
                                          <div className="pt-3 border-t border-gray-100">
                                            <h5 className="text-sm font-medium text-gray-700 mb-2">
                                              Payment Details:
                                            </h5>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                              <div>
                                                <span className="font-medium text-gray-700">
                                                  Status:
                                                </span>
                                                <span
                                                  className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                                    component.payment_status ===
                                                    "paid"
                                                      ? "bg-green-100 text-green-700"
                                                      : component.payment_status ===
                                                          "cancelled"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-yellow-100 text-yellow-700"
                                                  }`}
                                                >
                                                  {component.payment_status}
                                                </span>
                                              </div>
                                              {component.payment_date && (
                                                <div>
                                                  <span className="font-medium text-gray-700">
                                                    Date:
                                                  </span>
                                                  <span className="ml-2 text-gray-600">
                                                    {format(
                                                      new Date(
                                                        component.payment_date
                                                      ),
                                                      "MMM dd, yyyy"
                                                    )}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            {component.payment_notes && (
                                              <div className="mt-2">
                                                <span className="font-medium text-gray-700">
                                                  Notes:
                                                </span>
                                                <p className="text-sm text-gray-600 mt-1">
                                                  {component.payment_notes}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        {/* Empty State */}
                        {(!event.components ||
                          event.components.length === 0) && (
                          <div className="text-center py-8">
                            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">
                              No components available for this event.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-8"></div>

                    {/* Delivery Progress Section - disabled via feature flag */}
                    {ENABLE_DELIVERY_PROGRESS && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Package className="h-5 w-5 mr-2 text-brand-500" />
                            Delivery Progress
                          </h4>
                          {deliveryProgress && (
                            <button
                              onClick={fetchDeliveryProgress}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Refresh
                            </button>
                          )}
                        </div>

                        {/* Check if all included components are paid */}
                        {(() => {
                          const includedComponents =
                            event.components?.filter(
                              (comp) => comp.is_included
                            ) || [];
                          const paidComponents = includedComponents.filter(
                            (comp) => comp.payment_status === "paid"
                          );
                          const allPaid =
                            includedComponents.length > 0 &&
                            includedComponents.length === paidComponents.length;

                          if (!allPaid) {
                            return (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                                <div className="flex items-center justify-center mb-3">
                                  <Clock className="h-8 w-8 text-yellow-500" />
                                </div>
                                <h5 className="text-lg font-semibold text-yellow-800 mb-2">
                                  Delivery Tracking Not Available
                                </h5>
                                <p className="text-yellow-700 mb-3">
                                  Delivery progress tracking will be available
                                  once all included components are paid.
                                </p>
                                <div className="text-sm text-yellow-600">
                                  <span className="font-medium">
                                    {paidComponents.length}
                                  </span>{" "}
                                  of{" "}
                                  <span className="font-medium">
                                    {includedComponents.length}
                                  </span>{" "}
                                  components paid
                                </div>
                              </div>
                            );
                          }

                          if (deliveryError) {
                            return (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                                <div className="flex items-center justify-center mb-3">
                                  <AlertCircle className="h-8 w-8 text-red-500" />
                                </div>
                                <h5 className="text-lg font-semibold text-red-800 mb-2">
                                  Failed to load delivery progress
                                </h5>
                                <p className="text-red-700 mb-3">
                                  {deliveryError}
                                </p>
                                <button
                                  onClick={fetchDeliveryProgress}
                                  className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  Retry
                                </button>
                              </div>
                            );
                          }

                          return deliveryProgress ? (
                            <>
                              {/* Delivery Progress Bar */}
                              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="text-sm font-medium text-gray-700">
                                    Overall Progress
                                  </h5>
                                  <span className="text-sm text-gray-600">
                                    {deliveryProgress.progress
                                      ?.delivered_components || 0}{" "}
                                    of{" "}
                                    {deliveryProgress.progress
                                      ?.included_components || 0}{" "}
                                    delivered
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                                  <div
                                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${
                                        deliveryProgress.progress
                                          ?.included_components > 0
                                          ? Math.round(
                                              ((deliveryProgress.progress
                                                ?.delivered_components || 0) /
                                                deliveryProgress.progress
                                                  ?.included_components) *
                                                100
                                            )
                                          : 0
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                      {deliveryProgress.progress
                                        ?.delivered_components || 0}
                                    </div>
                                    <div className="text-gray-600">
                                      Delivered
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                      {deliveryProgress.progress
                                        ?.confirmed_components || 0}
                                    </div>
                                    <div className="text-gray-600">
                                      Confirmed
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-600">
                                      {deliveryProgress.progress
                                        ?.pending_components || 0}
                                    </div>
                                    <div className="text-gray-600">Pending</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                      {deliveryProgress.progress
                                        ?.cancelled_components || 0}
                                    </div>
                                    <div className="text-gray-600">
                                      Cancelled
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Component Delivery Status */}
                              {deliveryProgress.components &&
                              deliveryProgress.components.length > 0 ? (
                                <div className="space-y-3">
                                  {deliveryProgress.components.map(
                                    (component: any, index: number) => (
                                      <div
                                        key={component.component_id || index}
                                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-3">
                                            <div className="flex items-center space-x-2">
                                              {getDeliveryStatusIcon(
                                                component.supplier_status
                                              )}
                                              <span className="font-medium text-gray-900">
                                                {component.component_name}
                                              </span>
                                            </div>
                                            <span
                                              className={`px-2 py-1 rounded-full text-xs font-medium ${getDeliveryStatusColor(component.supplier_status)}`}
                                            >
                                              {component.supplier_status ||
                                                "pending"}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            {component.delivery_date && (
                                              <span className="text-sm text-gray-600">
                                                {format(
                                                  new Date(
                                                    component.delivery_date
                                                  ),
                                                  "MMM dd, yyyy"
                                                )}
                                              </span>
                                            )}
                                            <button
                                              onClick={() =>
                                                openDeliveryModal(component)
                                              }
                                              disabled={
                                                updatingDelivery ===
                                                component.component_id
                                              }
                                              className="px-3 py-1 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                              {updatingDelivery ===
                                              component.component_id
                                                ? "Updating..."
                                                : "Update"}
                                            </button>
                                          </div>
                                        </div>
                                        {component.supplier_notes && (
                                          <div className="mt-2 text-sm text-gray-600">
                                            <strong>Notes:</strong>{" "}
                                            {component.supplier_notes}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                  <p className="text-gray-500">
                                    No components available for delivery
                                    tracking.
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">
                                No components available for delivery tracking.
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "attachments" && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Event Files
                    </h3>
                    {event.attachments && event.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {event.attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-4 animate-in fade-in-50 duration-300"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {attachment.original_name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {attachment.file_size
                                      ? `${(attachment.file_size / 1024).toFixed(1)} KB`
                                      : "Unknown size"}
                                  </p>
                                </div>
                              </div>
                              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">
                          No files attached to this event.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Event Countdown */}
            <EventCountdown event={event} />

            {/* Event Progress */}
            <EventProgress event={event} />

            {/* Assignment Status */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 animate-in slide-in-from-right-2 duration-300">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Assignment Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Status:
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.assignment_status === "assigned"
                        ? "bg-yellow-100 text-yellow-700"
                        : event.assignment_status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {event.assignment_status === "assigned"
                      ? "Pending"
                      : event.assignment_status === "rejected"
                        ? "Rejected"
                        : "Accepted"}
                  </span>
                </div>
                {event.assigned_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Assigned:
                    </span>
                    <span className="text-sm text-gray-600">
                      {format(new Date(event.assigned_at), "MMM dd, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 animate-in slide-in-from-right-2 duration-300">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Total Budget:
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    ₱{event.total_budget.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Down Payment:
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    ₱{event.down_payment.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Remaining:
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    ₱
                    {(event.total_budget - event.down_payment).toLocaleString()}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Payment Status:
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(event.payment_status)}`}
                    >
                      {event.payment_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 animate-in slide-in-from-right-2 duration-300">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                {event.assignment_status === "assigned" && (
                  <>
                    <button
                      onClick={() => updateAssignment("accepted")}
                      disabled={updating !== null}
                      className={`w-full px-4 py-2 rounded-lg transition-colors font-medium text-white ${
                        updating === "accepted"
                          ? "bg-brand-400 cursor-not-allowed"
                          : "bg-brand-500 hover:bg-brand-600"
                      }`}
                    >
                      <CheckCircle className="h-4 w-4 inline mr-2" />
                      {updating === "accepted"
                        ? "Accepting..."
                        : "Accept Assignment"}
                    </button>
                    <button
                      onClick={() => updateAssignment("rejected")}
                      disabled={updating !== null}
                      className={`w-full px-4 py-2 rounded-lg transition-colors font-medium text-white ${
                        updating === "rejected"
                          ? "bg-red-400 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      <XCircle className="h-4 w-4 inline mr-2" />
                      {updating === "rejected"
                        ? "Rejecting..."
                        : "Decline Assignment"}
                    </button>
                  </>
                )}
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                  <Info className="h-4 w-4 inline mr-2" />
                  Contact Client
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart Modal */}
      <GanttChartModal
        event={event}
        isOpen={showGanttModal}
        onClose={() => setShowGanttModal(false)}
      />

      {/* Delivery Status Update Modal */}
      {ENABLE_DELIVERY_PROGRESS && showDeliveryModal && selectedComponent && (
        <DeliveryStatusModal
          component={selectedComponent}
          isOpen={showDeliveryModal}
          onClose={() => {
            setShowDeliveryModal(false);
            setSelectedComponent(null);
          }}
          onUpdate={updateDeliveryStatus}
        />
      )}
    </div>
  );
}

// Delivery Status Update Modal Component
function DeliveryStatusModal({
  component,
  isOpen,
  onClose,
  onUpdate,
}: {
  component: EventComponent;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (
    componentId: number,
    status: string,
    deliveryDate?: string,
    notes?: string
  ) => Promise<void>;
}) {
  const [status, setStatus] = useState(component.supplier_status || "pending");
  const [deliveryDate, setDeliveryDate] = useState(
    component.delivery_date || new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState(component.supplier_notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onUpdate(
        component.component_id,
        status,
        deliveryDate || undefined,
        notes || undefined
      );
      onClose();
    } catch (error) {
      console.error("Error updating delivery status:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Update Delivery Status
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Component:
            </h4>
            <p className="text-gray-900 font-medium">
              {component.component_name}
            </p>
            {component.component_price && (
              <p className="text-sm text-gray-600 mt-1">
                Price: ₱{Number(component.component_price).toLocaleString()}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as
                      | "pending"
                      | "confirmed"
                      | "delivered"
                      | "cancelled"
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="Add any notes about the delivery..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Updating..." : "Update Status"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
