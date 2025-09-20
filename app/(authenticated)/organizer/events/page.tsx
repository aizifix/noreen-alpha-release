"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  CalendarDays,
  List,
  Eye,
  Clock,
  MapPin,
  Users,
  DollarSign,
} from "lucide-react";
import axios from "axios";
import { adminApi, organizerApi } from "@/app/utils/api";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

// Enhanced interface to match updated tbl_events structure
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
  client_name?: string;
  client_email?: string;
  client_contact?: string;
  client_pfp?: string;
  assignment_status?: string;
  assigned_at?: string;
}

export default function OrganizerEventsPage() {
  const router = useRouter();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [decisions, setDecisions] = useState<
    Record<string, { status: "accepted" | "rejected" }>
  >({});
  const [organizerId, setOrganizerId] = useState<number | null>(null);

  // Sample data for fallback
  const sampleEvents: Event[] = [
    {
      event_id: 1,
      event_title: "Sample Wedding",
      event_date: "2025-10-30",
      start_time: "10:00:00",
      end_time: "23:59:00",
      event_status: "confirmed",
      payment_status: "partial",
      guest_count: 100,
      total_budget: 52000,
      down_payment: 26000,
      event_type_name: "Wedding",
      venue_title: "Sample Venue",
      venue_location: "Sample Location",
      client_name: "Sample Client",
      assignment_status: "assigned",
    },
  ];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Protect route from unauthorized access and back navigation
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
        // Resolve organizer_id from profile (fallback to user_id)
        try {
          const organizerResponse = await organizerApi.post({
            operation: "getOrganizerProfile",
            user_id: userData.user_id,
          });
          if (organizerResponse.data?.status === "success") {
            setOrganizerId(
              organizerResponse.data.data?.organizer_id || userData.user_id
            );
          } else {
            setOrganizerId(userData.user_id);
          }
        } catch {
          setOrganizerId(userData.user_id);
        }
        // Load events assigned to organizer and pending invitations from all events
        await fetchOrganizerEventsAndInvites(userData.user_id);
      } catch (error) {
        router.push("/auth/login");
      }
    };
    checkAuth();
  }, [router]);

  const normalizeEvent = (raw: any): Event => {
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
      client_name: raw.client_name || raw.client || undefined,
      client_email: raw.client_email || undefined,
      client_contact: raw.client_contact || undefined,
      client_pfp: raw.client_pfp || undefined,
      assignment_status: raw.assignment_status || raw.status || undefined,
      assigned_at: raw.assigned_at || undefined,
    };
    return normalized;
  };

  const dedupeById = (items: Event[]): Event[] => {
    const map = new Map<number, Event>();
    for (const it of items) {
      if (!map.has(it.event_id)) map.set(it.event_id, it);
    }
    return Array.from(map.values());
  };

  const safeDateKey = (value: string | Date | undefined) => {
    if (!value) return "";
    try {
      const d = typeof value === "string" ? new Date(value) : value;
      if (!d || isNaN(d.getTime())) return "";
      return format(d, "yyyy-MM-dd");
    } catch {
      return "";
    }
  };

  const fetchOrganizerEventsAndInvites = async (organizerUserId: number) => {
    try {
      setLoading(true);
      console.log("🔍 Fetching events for organizer user ID:", organizerUserId);

      // For now, let's try using the user_id directly as organizer_id
      // This is a temporary fix until we properly map user_id to organizer_id
      let organizerId = organizerUserId;

      // Try to get the actual organizer_id from the profile first
      try {
        const organizerResponse = await organizerApi.post({
          operation: "getOrganizerProfile",
          user_id: organizerUserId,
        });

        console.log("📡 Organizer profile response:", organizerResponse.data);

        if (organizerResponse.data.status === "success") {
          organizerId = organizerResponse.data.data.organizer_id;
          console.log("✅ Found organizer ID:", organizerId);
        } else {
          console.warn(
            "⚠️ Could not get organizer profile, using user_id as organizer_id"
          );
        }
      } catch (profileError) {
        console.warn(
          "⚠️ Profile fetch failed, using user_id as organizer_id:",
          profileError
        );
      }

      // Fetch events assigned to this organizer using the organizer_id
      let assignedEvents: Event[] = [];
      try {
        const eventsResponse = await organizerApi.post({
          operation: "getOrganizerEvents",
          organizer_id: organizerId,
        });
        console.log("📡 Events API Response:", eventsResponse.data);
        if (eventsResponse.data.status === "success") {
          const raw = eventsResponse.data.data || [];
          assignedEvents = dedupeById(raw.map(normalizeEvent));
        } else {
          console.warn("⚠️ API returned error:", eventsResponse.data.message);
        }
      } catch (e) {
        console.warn("⚠️ API error; falling back to attachments for invites");
      }

      if (assignedEvents.length === 0) {
        // Fallback path: parse organizer_invites from admin getAllEvents
        try {
          const response = await adminApi.post({ operation: "getAllEvents" });
          const allEvents =
            response.data?.status === "success"
              ? response.data.events || []
              : [];
          const pendingEvents = allEvents.filter((e: any) => {
            try {
              const attachments = e.event_attachments
                ? JSON.parse(e.event_attachments)
                : e.attachments;
              if (!attachments || !Array.isArray(attachments)) return false;
              const invite = attachments.find(
                (a: any) => a.attachment_type === "organizer_invites"
              );
              if (!invite || !invite.description) return false;
              const data = JSON.parse(invite.description);
              const isPending = Array.isArray(data.pending)
                ? data.pending.includes(String(organizerId)) ||
                  data.pending.includes(String(organizerUserId))
                : false;
              return isPending;
            } catch {
              return false;
            }
          });
          setPendingInvites(dedupeById(pendingEvents.map(normalizeEvent)));
          // Keep events list minimal on fallback
          setEvents(
            pendingEvents.length
              ? dedupeById(pendingEvents.map(normalizeEvent))
              : sampleEvents
          );
        } catch (_f) {
          setEvents(sampleEvents);
          setPendingInvites([]);
        }
      } else {
        setEvents(assignedEvents);
        const pendingEvents = assignedEvents.filter(
          (e: any) => e.assignment_status === "assigned"
        );
        setPendingInvites(pendingEvents);
      }
    } catch (error) {
      console.error("❌ Error fetching organizer events:", error);
      // Fallback to sample data if API fails
      setEvents(sampleEvents);
      setPendingInvites([]);
    } finally {
      setLoading(false);
    }
  };

  const orderedInvites = useMemo(() => {
    return [...pendingInvites].sort((a, b) =>
      String(a.event_date).localeCompare(String(b.event_date))
    );
  }, [pendingInvites]);

  // Merge pending invites into calendar dataset so they appear on their dates
  const calendarEvents = useMemo(() => {
    const byId = new Map<number, Event>();
    for (const ev of events) byId.set(ev.event_id, ev);
    for (const inv of pendingInvites) {
      if (!byId.has(inv.event_id)) {
        byId.set(inv.event_id, inv);
      }
    }
    return Array.from(byId.values());
  }, [events, pendingInvites]);

  const pendingInviteIds = useMemo(() => {
    return new Set(pendingInvites.map((e) => e.event_id));
  }, [pendingInvites]);

  // Accept/Reject handlers calling organizer.php updateAssignmentStatus
  const handleAcceptInvite = async (eventItem: Event) => {
    const key = String(eventItem.event_id);
    if (decisions[key]?.status === "accepted") return;
    const assignmentId = await getAssignmentIdForEvent(eventItem.event_id);
    if (!assignmentId) return;
    try {
      console.debug("[Organizer] Accept invite:request", {
        eventId: eventItem.event_id,
        assignmentId,
        organizerId,
      });
      await organizerApi.post({
        operation: "updateAssignmentStatus",
        assignment_id: assignmentId,
        status: "accepted",
        organizer_id: organizerId ?? 0,
      });
      console.debug("[Organizer] Accept invite:success");
      toast({
        title: "Assignment accepted",
        description: "You are now assigned to this event.",
      });
      setDecisions((prev) => ({ ...prev, [key]: { status: "accepted" } }));
      setPendingInvites((prev) =>
        prev.filter((e) => e.event_id !== eventItem.event_id)
      );
      setEvents((prev) => {
        if (prev.find((e) => e.event_id === eventItem.event_id)) return prev;
        return [eventItem, ...prev];
      });
    } catch (e) {
      console.error("[Organizer] Accept invite:error", e);
      toast({
        title: "Action failed",
        description: "Could not accept assignment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectInvite = async (eventItem: Event) => {
    const key = String(eventItem.event_id);
    const assignmentId = await getAssignmentIdForEvent(eventItem.event_id);
    if (!assignmentId) return;
    try {
      console.debug("[Organizer] Reject invite:request", {
        eventId: eventItem.event_id,
        assignmentId,
        organizerId,
      });
      await organizerApi.post({
        operation: "updateAssignmentStatus",
        assignment_id: assignmentId,
        status: "rejected",
        organizer_id: organizerId ?? 0,
      });
      console.debug("[Organizer] Reject invite:success");
      toast({
        title: "Assignment rejected",
        description: "This event has been marked as rejected.",
      });
      setDecisions((prev) => ({ ...prev, [key]: { status: "rejected" } }));
      setPendingInvites((prev) =>
        prev.filter((e) => e.event_id !== eventItem.event_id)
      );
    } catch (e) {
      console.error("[Organizer] Reject invite:error", e);
      toast({
        title: "Action failed",
        description: "Could not reject assignment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getAssignmentIdForEvent = async (eventId: number) => {
    try {
      const res = await axios.get(
        `http://localhost/events-api/admin.php?operation=getEventOrganizerDetails&event_id=${eventId}`
      );
      if (
        res.data?.status === "success" &&
        res.data?.data?.organizer_assignment_id
      ) {
        return Number(res.data.data.organizer_assignment_id);
      }
    } catch {}
    return null;
  };

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(undefined);
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    return calendarEvents.filter(
      (event) => safeDateKey(event.event_date) === dateString
    );
  };

  // Get status colors
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return {
          bg: "bg-green-50",
          border: "border-green-500",
          text: "text-green-700",
        };
      case "draft":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-500",
          text: "text-yellow-700",
        };
      case "on_going":
        return {
          bg: "bg-blue-50",
          border: "border-blue-500",
          text: "text-blue-700",
        };
      case "done":
        return {
          bg: "bg-purple-50",
          border: "border-purple-500",
          text: "text-purple-700",
        };
      case "cancelled":
        return {
          bg: "bg-red-50",
          border: "border-red-500",
          text: "text-red-700",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-500",
          text: "text-gray-700",
        };
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return {
          bg: "bg-green-50",
          border: "border-green-500",
          text: "text-green-700",
        };
      case "partial":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-500",
          text: "text-yellow-700",
        };
      case "unpaid":
        return {
          bg: "bg-red-50",
          border: "border-red-500",
          text: "text-red-700",
        };
      case "refunded":
        return {
          bg: "bg-purple-50",
          border: "border-purple-500",
          text: "text-purple-700",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-500",
          text: "text-gray-700",
        };
    }
  };

  // Calendar component
  const CalendarView = () => {
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

    const calendarDays = [];
    const currentDateString = format(new Date(), "yyyy-MM-dd");

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dateString = format(date, "yyyy-MM-dd");
      const dayEvents = getEventsForDate(date);
      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
      const isToday = dateString === currentDateString;
      const isSelected =
        selectedDate && format(selectedDate, "yyyy-MM-dd") === dateString;

      calendarDays.push(
        <div
          key={i}
          className={`min-h-[120px] p-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
            !isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"
          } ${isToday ? "bg-blue-50 border-blue-300" : ""} ${
            isSelected ? "bg-green-50 border-green-300" : ""
          }`}
          onClick={() => setSelectedDate(date)}
        >
          <div className="text-sm font-medium mb-1">{format(date, "d")}</div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event) => {
              const colors = getStatusColor(event.event_status);
              return (
                <div
                  key={event.event_id}
                  className={`text-xs p-1 rounded truncate ${colors.bg} ${colors.text} cursor-pointer hover:opacity-80`}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/organizer/events/${event.event_id}`);
                  }}
                >
                  {event.event_title}
                </div>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Calendar Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-4 text-sm font-medium text-gray-600 text-center border-r border-gray-200 last:border-r-0 bg-gray-50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">{calendarDays}</div>
      </div>
    );
  };

  // Event details sidebar for selected date
  const EventDetailsSidebar = () => {
    if (!selectedDate) return null;

    const dayEvents = getEventsForDate(selectedDate);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-in slide-in-from-right-4 duration-500">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Events for{" "}
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>

        {dayEvents.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No events scheduled for this date.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayEvents.map((event, index) => {
              const colors = getStatusColor(event.event_status);
              const paymentColors = getPaymentStatusColor(event.payment_status);

              const getClientInitials = (name: string) => {
                return name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();
              };

              return (
                <div
                  key={event.event_id}
                  className={`p-4 rounded-lg border-l-4 ${colors.border} ${colors.bg} cursor-pointer hover:opacity-80 transition-all duration-200 animate-in slide-in-from-right-4 delay-${index * 100}`}
                  onClick={() =>
                    router.push(`/organizer/events/${event.event_id}`)
                  }
                >
                  <div className="flex items-start space-x-3">
                    {/* Client Profile Picture */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#028A75] to-[#027a65] rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {getClientInitials(event.client_name || "C")}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900 truncate">
                        {event.event_title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {event.client_name || "Client"}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                        >
                          {event.event_status}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${paymentColors.bg} ${paymentColors.text}`}
                        >
                          {event.payment_status}
                        </span>
                        {pendingInviteIds.has(event.event_id) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300">
                            Pending Invite
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {pendingInviteIds.has(event.event_id) && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptInvite(event);
                        }}
                        className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium"
                      >
                        Accept
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const reason = window.prompt(
                            "Optional: provide a reason for rejecting"
                          );
                          if (reason) {
                            console.debug("[Organizer] Reject reason:", {
                              eventId: event.event_id,
                              reason,
                            });
                          }
                          handleRejectInvite(event);
                        }}
                        className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
          <p className="text-gray-600 mt-1">
            Manage your assigned events and invitations
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${
              view === "calendar"
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-brand-700 border-brand-500 hover:bg-brand-50"
            }`}
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="h-4 w-4 inline mr-2" />
            Calendar
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${
              view === "list"
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-brand-700 border-brand-500 hover:bg-brand-50"
            }`}
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4 inline mr-2" />
            List
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CalendarDays className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Pending Invites
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingInvites.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Guests</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.reduce((sum, event) => sum + event.guest_count, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">
                ₱
                {events
                  .reduce((sum, event) => sum + event.total_budget, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Search events..."
          />
        </div>
        <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent">
          <option>All Types</option>
          <option>Wedding</option>
          <option>Birthday</option>
          <option>Corporate</option>
          <option>Others</option>
        </select>
        <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent">
          <option>All Statuses</option>
          <option>Draft</option>
          <option>Confirmed</option>
          <option>On Going</option>
          <option>Done</option>
        </select>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading events...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {view === "calendar" ? (
              <CalendarView />
            ) : (
              <div className="space-y-6 animate-in fade-in-50 duration-300">
                {/* Pending invites first */}
                {orderedInvites.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Pending Invitations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {orderedInvites.map((event) => (
                        <div
                          key={event.event_id}
                          className="rounded-lg shadow border-l-4 border-yellow-500 bg-yellow-50 p-6"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-lg text-gray-900">
                              {event.event_title}
                            </h4>
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
                              Pending Invite
                            </span>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center">
                              <CalendarDays className="h-4 w-4 mr-2" />
                              {format(
                                new Date(event.event_date),
                                "MMM dd, yyyy"
                              )}
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              {event.client_name || "Client"}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {event.venue_title || "TBD"}
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-2" />₱
                              {event.total_budget.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptInvite(event)}
                              className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectInvite(event)}
                              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned events */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Assigned Events
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.map((event) => {
                      const colors = getStatusColor(event.event_status);
                      const paymentColors = getPaymentStatusColor(
                        event.payment_status
                      );

                      return (
                        <div
                          key={event.event_id}
                          className={`rounded-lg shadow border-l-4 ${colors.border} bg-white p-6 cursor-pointer hover:shadow-md transition-shadow`}
                          onClick={() =>
                            router.push(`/organizer/events/${event.event_id}`)
                          }
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-lg text-gray-900">
                              {event.event_title}
                            </h4>
                            <div className="flex gap-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                              >
                                {event.event_status}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${paymentColors.bg} ${paymentColors.text}`}
                              >
                                {event.payment_status}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center">
                              <CalendarDays className="h-4 w-4 mr-2" />
                              {format(
                                new Date(event.event_date),
                                "MMM dd, yyyy"
                              )}
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              {event.client_name || "Client"}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {event.venue_title || "TBD"}
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-2" />₱
                              {event.total_budget.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/organizer/events/${event.event_id}`
                                )
                              }
                              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                              <Eye className="h-4 w-4 inline mr-2" />
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {view === "calendar" && <EventDetailsSidebar />}
          </div>
        </div>
      )}
    </div>
  );
}
