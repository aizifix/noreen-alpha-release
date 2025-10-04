"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { apiClient } from "@/utils/apiClient";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

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
  components?: any[];
  timeline?: any[];
  payments?: any[];
  attachments?: any[];
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
          const profile = await axios.post(
            "/organizer.php",
            { operation: "getOrganizerProfile", user_id: userData.user_id }
          );
          if (profile.data?.status === "success") {
            setOrganizerId(profile.data.data?.organizer_id || userData.user_id);
          } else {
            setOrganizerId(userData.user_id);
          }
        } catch {
          setOrganizerId(userData.user_id);
        }
        await fetchEventDetails();
      } catch (error) {
        router.push("/auth/login");
      }
    };
    checkAuth();
  }, [router, eventId]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      console.log("🔍 Fetching event details for ID:", eventId);

      const response = await axios.post(
        "/organizer.php",
        {
          operation: "getOrganizerEventDetails",
          event_id: parseInt(eventId),
        }
      );

      console.log("📡 API Response:", response.data);

      if (response.status === "success") {
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
    if (pfpPath.startsWith("http")) {
      return pfpPath;
    }
    return `serve-image.php?path=${encodeURIComponent(pfpPath)}`;
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
                          <Clock className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Time
                            </p>
                            <p className="text-sm text-gray-600">
                              {event.start_time} - {event.end_time}
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
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Event Timeline
                    </h3>
                    {event.timeline && event.timeline.length > 0 ? (
                      <div className="space-y-4">
                        {event.timeline.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-4 animate-in slide-in-from-left-2 duration-300"
                          >
                            <div className="flex-shrink-0 w-3 h-3 bg-brand-500 rounded-full mt-2"></div>
                            <div className="flex-1 bg-gray-50 rounded-lg p-4">
                              <h4 className="font-semibold text-gray-900">
                                {item.activity_title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {format(
                                  new Date(item.activity_date),
                                  "MMM dd, yyyy"
                                )}{" "}
                                at {item.start_time}
                              </p>
                              {item.location && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Location: {item.location}
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">
                          No timeline items available.
                        </p>
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
    </div>
  );
}
