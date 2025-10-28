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
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import axios from "axios";
import { organizerApi } from "@/app/utils/api";
import { endpoints } from "@/app/config/api";

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
  components?: EventComponent[];
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
}

export default function OrganizerEventsPage() {
  const router = useRouter();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
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
          if (
            organizerResponse.status === "success" &&
            (organizerResponse.data as any)?.organizer_id
          ) {
            setOrganizerId((organizerResponse.data as any).organizer_id);
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
            router.push("/auth/login");
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
          router.push("/auth/login");
          return;
        }
        // Load events assigned to organizer and pending invitations from all events
        await fetchOrganizerEventsAndInvites(userData.user_id);
      } catch (error) {
        router.push("/auth/login");
      }
    };
    checkAuth();
  }, [router]);

  // Listen for assignment actions from other pages to refresh calendar
  useEffect(() => {
    const handleAssignmentAction = async (event: any) => {
      try {
        const { eventId, action } = event.detail;
        console.log("Calendar: Assignment action received:", {
          eventId,
          action,
        });

        // Refresh events data to reflect the changes
        const userData = secureStorage.getItem("user");
        if (userData?.user_id) {
          await fetchOrganizerEventsAndInvites(userData.user_id);
        }
      } catch (error) {
        console.error("Error handling assignment action in calendar:", error);
      }
    };

    // Listen for assignment actions from other pages
    window.addEventListener("assignmentActionTaken", handleAssignmentAction);

    // Also listen for direct calendar refresh events
    window.addEventListener("calendarRefresh", handleAssignmentAction);

    return () => {
      window.removeEventListener(
        "assignmentActionTaken",
        handleAssignmentAction
      );
      window.removeEventListener("calendarRefresh", handleAssignmentAction);
    };
  }, []);

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
      assignment_status: raw.assignment_status || undefined,
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

      // BUGFIX: Prevent organizers from seeing events they're no longer assigned to
      // When admin switches assignment from organizer 1 to organizer 2, organizer 1
      // should not see the event in their calendar anymore, even if they're still
      // in the event_attachments organizer_invites data.

      // For now, let's try using the user_id directly as organizer_id
      // This is a temporary fix until we properly map user_id to organizer_id
      let organizerId = organizerUserId;

      // Try to get the actual organizer_id from the profile first
      try {
        const organizerResponse = await axios.post(endpoints.organizer, {
          operation: "getOrganizerProfile",
          user_id: organizerUserId,
        });

        console.log("📡 Organizer profile response:", organizerResponse);

        if (organizerResponse.data.status === "success") {
          organizerId = organizerResponse.data.data?.organizer_id;
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
        const eventsResponse = await axios.post(endpoints.organizer, {
          operation: "getOrganizerEvents",
          organizer_id: organizerId,
        });
        console.log("📡 Events API Response:", eventsResponse);
        if (eventsResponse.data.status === "success") {
          const raw = eventsResponse.data.data || [];
          assignedEvents = dedupeById(raw.map(normalizeEvent));
        } else {
          console.warn("⚠️ API returned error:", eventsResponse.data.message);
        }
      } catch (e) {
        console.warn("⚠️ API error; falling back to attachments for invites");
      }
      // Always also scan attachments for organizer_invites and merge
      // BUT only include events where the organizer still has a valid assignment
      let attachmentPending: Event[] = [];
      try {
        const response = await axios.post("/admin.php", {
          operation: "getAllEvents",
        });
        const allEvents =
          response.data?.status === "success" ? response.data.events || [] : [];

        // Get current assignment IDs for this organizer to cross-reference
        const currentAssignmentIds = new Set<number>();
        try {
          const assignmentResponse = await axios.post(endpoints.organizer, {
            operation: "getOrganizerAssignments",
            organizer_id: organizerId,
          });
          if (assignmentResponse.data.status === "success") {
            const assignments = assignmentResponse.data.data || [];
            assignments.forEach((assignment: any) => {
              if (assignment.event_id) {
                currentAssignmentIds.add(Number(assignment.event_id));
              }
            });
          }
        } catch (assignmentError) {
          console.warn(
            "Could not fetch current assignments for cross-reference:",
            assignmentError
          );
        }

        const pendingEvents = allEvents.filter((e: any) => {
          try {
            // First check if organizer has a current assignment for this event
            const eventId = Number(e.event_id);
            if (!currentAssignmentIds.has(eventId)) {
              // Organizer doesn't have current assignment, don't show this event
              return false;
            }

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
        attachmentPending = dedupeById(
          pendingEvents.map((e: any) => {
            const normalized = normalizeEvent(e);
            // Ensure attachment events have proper assignment status
            // If they're in the attachment pending list, they should be "assigned"
            if (!normalized.assignment_status) {
              normalized.assignment_status = "assigned";
            }
            return normalized;
          })
        );
      } catch {}

      // Only show events that are actually assigned to this organizer
      // Filter assignedEvents to only include accepted events
      const acceptedEvents = assignedEvents.filter(
        (event) => event.assignment_status === "accepted"
      );

      // Set events to only accepted events (no fallback to sample data)
      setEvents(acceptedEvents);

      // For pending invites, only show events that are actually assigned to this organizer
      // This prevents showing events that were reassigned to other organizers
      const assignedPending = assignedEvents.filter(
        (e: any) => e.assignment_status === "assigned"
      );

      // Cross-reference attachment pending with current assignments
      // Only include attachment events if organizer still has assignment
      const validAttachmentPending = attachmentPending.filter((event) => {
        // Check if this event is in the assignedEvents (meaning organizer has current assignment)
        const hasAssignment = assignedEvents.some(
          (assigned) => assigned.event_id === event.event_id
        );
        if (!hasAssignment) {
          console.log(
            `🚫 Filtering out event ${event.event_id} - organizer no longer assigned`
          );
        }
        return hasAssignment;
      });

      const mergedPendingMap = new Map<number, Event>();
      for (const p of assignedPending) mergedPendingMap.set(p.event_id, p);
      for (const p of validAttachmentPending)
        if (!mergedPendingMap.has(p.event_id))
          mergedPendingMap.set(p.event_id, p);
      setPendingInvites(Array.from(mergedPendingMap.values()));
    } catch (error) {
      console.error("❌ Error fetching organizer events:", error);
      // Don't fallback to sample data - only show actual assigned events
      setEvents([]);
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

  // Show both accepted events and pending invites on the calendar
  const calendarEvents = useMemo(() => {
    // Only show events that are assigned to this organizer
    // events = accepted events assigned to this organizer
    // pendingInvites = pending invitations for this organizer

    // Combine accepted events and pending invites
    const allEvents = [...events, ...pendingInvites];

    // Remove duplicates based on event_id
    const uniqueEvents = allEvents.filter(
      (event, index, self) =>
        index === self.findIndex((e) => e.event_id === event.event_id)
    );

    // Additional safety check: ensure we only show organizer's assigned events
    return uniqueEvents.filter((event) => {
      // Events should either be accepted (in events array) or pending (in pendingInvites)
      // Both arrays are already filtered to only contain organizer's events
      return true;
    });
  }, [events, pendingInvites]);

  const pendingInviteIds = useMemo(() => {
    // Only show pending invite badges/buttons for events that are actually in "assigned" status
    // This prevents showing accept/reject buttons for events that are already accepted
    const assignedPendingEvents = pendingInvites.filter(
      (e) => e.assignment_status === "assigned"
    );
    const assignedPendingIds = new Set(
      assignedPendingEvents.map((e) => e.event_id)
    );

    console.log("📋 Pending invite analysis:", {
      totalPendingInvites: pendingInvites.length,
      assignedStatusEvents: assignedPendingEvents.length,
      assignedPendingIds: Array.from(assignedPendingIds),
      allPendingStatuses: pendingInvites.map((e) => ({
        id: e.event_id,
        status: e.assignment_status,
      })),
    });

    return assignedPendingIds;
  }, [pendingInvites]);

  // Accept/Reject handlers calling organizer.php updateAssignmentStatus
  const handleAcceptInvite = async (eventItem: Event) => {
    const key = String(eventItem.event_id);
    if (decisions[key]?.status === "accepted") return;
    const assignmentId = await getAssignmentIdForEvent(eventItem.event_id);
    try {
      console.debug("[Organizer] Accept invite:request", {
        eventId: eventItem.event_id,
        assignmentId,
        organizerId,
      });
      await axios.post(endpoints.organizer, {
        operation: "updateAssignmentStatus",
        ...(assignmentId ? { assignment_id: assignmentId } : {}),
        event_id: eventItem.event_id,
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

      // Trigger notification refresh in parent layout
      window.dispatchEvent(
        new CustomEvent("assignmentActionTaken", {
          detail: { eventId: eventItem.event_id, action: "accepted" },
        })
      );

      // Trigger calendar refresh
      window.dispatchEvent(
        new CustomEvent("calendarRefresh", {
          detail: { eventId: eventItem.event_id, action: "accepted" },
        })
      );
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
    try {
      console.debug("[Organizer] Reject invite:request", {
        eventId: eventItem.event_id,
        assignmentId,
        organizerId,
      });
      await axios.post(endpoints.organizer, {
        operation: "updateAssignmentStatus",
        ...(assignmentId ? { assignment_id: assignmentId } : {}),
        event_id: eventItem.event_id,
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

      // Trigger notification refresh in parent layout
      window.dispatchEvent(
        new CustomEvent("assignmentActionTaken", {
          detail: { eventId: eventItem.event_id, action: "rejected" },
        })
      );

      // Trigger calendar refresh
      window.dispatchEvent(
        new CustomEvent("calendarRefresh", {
          detail: { eventId: eventItem.event_id, action: "rejected" },
        })
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
        `admin.php?operation=getEventOrganizerDetails&event_id=${eventId}`
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
    const newDate = new Date(selectedYear, selectedMonth - 1, 1);
    setCurrentDate(newDate);
    setSelectedMonth(selectedMonth - 1 < 0 ? 11 : selectedMonth - 1);
    if (selectedMonth - 1 < 0) {
      setSelectedYear(selectedYear - 1);
    }
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedYear, selectedMonth + 1, 1);
    setCurrentDate(newDate);
    setSelectedMonth(selectedMonth + 1 > 11 ? 0 : selectedMonth + 1);
    if (selectedMonth + 1 > 11) {
      setSelectedYear(selectedYear + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(undefined);
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
    setSelectedDay(null);
  };

  // Filter handlers
  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    setCurrentDate(new Date(selectedYear, month, 1));
    setSelectedDay(null);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setCurrentDate(new Date(year, selectedMonth, 1));
    setSelectedDay(null);
  };

  const handleDayChange = (day: number | null) => {
    setSelectedDay(day);
    if (day !== null) {
      setSelectedDate(new Date(selectedYear, selectedMonth, day));
    } else {
      setSelectedDate(undefined);
    }
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    return calendarEvents.filter(
      (event) => safeDateKey(event.event_date) === dateString
    );
  };

  // Helper function to get today's date string
  const getTodayString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Intelligent event status derivation
  const getDerivedEventStatus = (event: Event) => {
    if (event.event_status === "cancelled") return "cancelled";
    const today = getTodayString();

    // Events happening today are "on_going" (blue)
    if (event.event_date === today) return "on_going";

    // Past events are "done" (purple)
    if (event.event_date < today) return "done";

    // For future events, check if they're truly ready to be "confirmed"
    if (event.event_date > today) {
      // Check if all inclusions are paid and event is fully ready
      const includedComponents = (event.components || []).filter(
        (c) => c.is_included
      );
      const paidIncludedComponents = includedComponents.filter(
        (c) => c.payment_status === "paid"
      );
      const allIncludedPaid =
        includedComponents.length > 0 &&
        paidIncludedComponents.length === includedComponents.length;

      // Only show as "confirmed" if all inclusions are paid AND event status is explicitly confirmed
      if (event.event_status === "confirmed" && allIncludedPaid) {
        return "confirmed";
      }

      // Otherwise show as "planning" (yellow) for future events
      return "planning";
    }

    // Fallback to planning for any other case
    return "planning";
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
      case "planning":
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
          className={`min-h-[60px] sm:min-h-[80px] lg:min-h-[120px] p-1 sm:p-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
            !isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"
          } ${isToday ? "bg-blue-50 border-blue-300" : ""} ${
            isSelected ? "bg-green-50 border-green-300" : ""
          }`}
          onClick={() => setSelectedDate(date)}
        >
          <div className="text-xs sm:text-sm font-medium mb-1">
            {format(date, "d")}
          </div>
          <div className="space-y-0.5 sm:space-y-1">
            {/* Show only 1 event on mobile, 2 on larger screens */}
            <div className="block sm:hidden">
              {dayEvents.slice(0, 1).map((event) => {
                const colors = getStatusColor(getDerivedEventStatus(event));
                return (
                  <div
                    key={event.event_id}
                    className={`text-[10px] p-0.5 rounded truncate ${colors.bg} ${colors.text} cursor-pointer hover:opacity-80`}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/organizer/events/${event.event_id}`);
                    }}
                  >
                    {event.event_title}
                  </div>
                );
              })}
              {dayEvents.length > 1 && (
                <div className="text-[10px] text-gray-500">
                  +{dayEvents.length - 1} more
                </div>
              )}
            </div>

            {/* Show 2 events on larger screens */}
            <div className="hidden sm:block">
              {dayEvents.slice(0, 2).map((event) => {
                const colors = getStatusColor(getDerivedEventStatus(event));
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
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        {/* Calendar Header */}
        <div className="flex flex-col gap-4 p-3 sm:p-4 border-b border-gray-200">
          {/* Navigation and Title */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
            >
              Today
            </button>
          </div>

          {/* Calendar Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                >
                  <option value={0}>January</option>
                  <option value={1}>February</option>
                  <option value={2}>March</option>
                  <option value={3}>April</option>
                  <option value={4}>May</option>
                  <option value={5}>June</option>
                  <option value={6}>July</option>
                  <option value={7}>August</option>
                  <option value={8}>September</option>
                  <option value={9}>October</option>
                  <option value={10}>November</option>
                  <option value={11}>December</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Day
                </label>
                <select
                  value={selectedDay || ""}
                  onChange={(e) =>
                    handleDayChange(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                >
                  <option value="">All Days</option>
                  {Array.from(
                    {
                      length: new Date(
                        selectedYear,
                        selectedMonth + 1,
                        0
                      ).getDate(),
                    },
                    (_, i) => {
                      const day = i + 1;
                      return (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-2 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 text-center border-r border-gray-200 last:border-r-0 bg-gray-50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 min-w-[280px]">{calendarDays}</div>
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
              const colors = getStatusColor(getDerivedEventStatus(event));
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
                          {getDerivedEventStatus(event)}
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
      {/* Header - mirror admin layout */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
          <p className="text-gray-600">
            Manage your assigned events and invitations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                view === "calendar"
                  ? "bg-white text-[#028A75] shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                view === "list"
                  ? "bg-white text-[#028A75] shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[250px] sm:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Search events..."
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm sm:text-base">
            <option>All Types</option>
            <option>Wedding</option>
            <option>Birthday</option>
            <option>Corporate</option>
            <option>Others</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm sm:text-base">
            <option>All Statuses</option>
            <option>Draft</option>
            <option>Confirmed</option>
            <option>On Going</option>
            <option>Done</option>
          </select>
        </div>
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
                {events.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 max-w-7xl mx-auto px-4">
                    {events.map((event, index) => {
                      const colors = getStatusColor(
                        getDerivedEventStatus(event)
                      );
                      const paymentColors = getPaymentStatusColor(
                        event.payment_status
                      );

                      const getClientInitials = (name: string) => {
                        return name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase();
                      };

                      const getProfileImageUrl = (pfp: string) => {
                        if (!pfp) return "";
                        if (pfp.startsWith("http")) return pfp;
                        return `/uploads/client_profile_pictures/${pfp}`;
                      };

                      return (
                        <div
                          key={event.event_id}
                          className="group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden h-fit max-w-sm mx-auto w-full"
                          onClick={() =>
                            router.push(`/organizer/events/${event.event_id}`)
                          }
                        >
                          {/* Card Header */}
                          <div className="p-6 pb-4">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-lg text-gray-900 truncate mb-2">
                                  {event.event_title}
                                </h2>
                              </div>
                              <div className="flex flex-col gap-2 ml-4">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
                                >
                                  {getDerivedEventStatus(event)}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${paymentColors.bg} ${paymentColors.text}`}
                                >
                                  {event.payment_status}
                                </span>
                              </div>
                            </div>

                            {/* Event Date & Time */}
                            <div className="mb-4">
                              <div className="text-sm text-gray-600 mb-1">
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
                              {event.start_time && event.end_time && (
                                <div className="text-sm text-gray-500">
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
                              )}
                            </div>

                            {/* Client Information Section */}
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                {/* Client Profile Picture */}
                                <div className="relative flex-shrink-0">
                                  {event.client_pfp &&
                                  getProfileImageUrl(event.client_pfp) ? (
                                    <img
                                      src={getProfileImageUrl(event.client_pfp)}
                                      alt={`${event.client_name}'s profile`}
                                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        e.currentTarget.nextElementSibling?.classList.remove(
                                          "hidden"
                                        );
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className={`w-10 h-10 bg-gradient-to-br from-[#028A75] to-[#027a65] rounded-full flex items-center justify-center ${event.client_pfp && getProfileImageUrl(event.client_pfp) ? "hidden" : ""}`}
                                  >
                                    <span className="text-white font-medium text-xs">
                                      {getClientInitials(
                                        event.client_name || "C"
                                      )}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-gray-900">
                                    {event.client_name || "Unknown Client"}
                                  </div>
                                  {event.client_email && (
                                    <div className="text-xs text-gray-600 truncate">
                                      {event.client_email}
                                    </div>
                                  )}
                                  {event.client_contact && (
                                    <div className="text-xs text-gray-600">
                                      {event.client_contact}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Event Details */}
                            <div className="mb-4 space-y-3">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Venue:
                                  </span>
                                  <p className="text-gray-600 truncate">
                                    {event.venue_title || "TBD"}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Type:
                                  </span>
                                  <p className="text-gray-600 truncate">
                                    {event.event_type_name || "Unknown"}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Guests:
                                  </span>
                                  <p className="text-gray-600">
                                    {event.guest_count}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Location:
                                  </span>
                                  <p className="text-gray-600 truncate">
                                    {event.venue_location || "TBD"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50">
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors duration-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/organizer/events/${event.event_id}`
                                  );
                                }}
                              >
                                <Eye className="h-4 w-4" /> View Details
                              </button>
                              <button
                                className="px-4 py-2 rounded-md bg-[#028A75] text-white text-sm font-semibold hover:bg-[#027a65] transition-colors duration-200"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  router.push(
                                    `/organizer/events/${event.event_id}`
                                  );
                                }}
                              >
                                Manage Event
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CalendarDays className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Events Assigned
                    </h3>
                    <p className="text-gray-500">
                      You don't have any assigned events yet. Check back later
                      or contact your administrator.
                    </p>
                  </div>
                )}
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
