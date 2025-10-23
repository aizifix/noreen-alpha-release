"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Phone,
  Mail,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  CalendarDays,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Configure axios base URL
axios.defaults.baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://noreen-events.online/noreen-events";

interface Assignment {
  event_id: number;
  event_title: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  event_status: string;
  payment_status: string;
  guest_count: number;
  total_budget: number;
  event_type_name?: string;
  venue_title?: string;
  venue_location?: string;
  client_name?: string;
  client_email?: string;
  client_contact?: string;
  client_pfp?: string;
  additional_notes?: string;
  assignment_status?: string;
  assigned_at?: string;
  created_at?: string;
}

interface AssignmentDetails {
  event_id: number;
  event_title: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  event_status: string;
  payment_status: string;
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
  created_at?: string;
}

export default function OrganizerAssignments() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] =
    useState<AssignmentDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [organizerId, setOrganizerId] = useState<number | null>(null);
  const [actualOrganizerId, setActualOrganizerId] = useState<number | null>(
    null
  );

  useEffect(() => {
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
      // We'll resolve the actual organizer_id in fetchAssignments
      setOrganizerId(userData.user_id);
    } catch (error) {
      console.error("Error accessing user data:", error);
      router.push("/auth/login");
    }
  }, [router]);

  useEffect(() => {
    if (organizerId) {
      fetchAssignments();
    }
  }, [organizerId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);

      // Fetch organizer profile to get organizer_id
      const profileResponse = await axios.post("organizer.php", {
        operation: "getOrganizerProfile",
        user_id: organizerId,
      });

      let resolvedOrganizerId = organizerId;
      if (
        profileResponse.data?.status === "success" &&
        profileResponse.data.data?.organizer_id
      ) {
        resolvedOrganizerId = profileResponse.data.data.organizer_id;
        setActualOrganizerId(resolvedOrganizerId); // Store the actual organizer_id
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
        return;
      }

      // Fetch assignments
      const response = await axios.post("organizer.php", {
        operation: "getOrganizerEvents",
        organizer_id: resolvedOrganizerId,
      });

      if (response.data?.status === "success") {
        const allEvents = response.data.data || [];
        // Filter for pending assignments
        const pendingAssignments = allEvents.filter(
          (event: any) =>
            event.assignment_status === "assigned" ||
            event.status === "assigned"
        );
        setAssignments(pendingAssignments);
      } else {
        // Fallback: try to get assignments via attachments
        await fetchAssignmentsViaAttachments();
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      // Fallback: try to get assignments via attachments
      await fetchAssignmentsViaAttachments();
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentsViaAttachments = async () => {
    try {
      const response = await axios.post("admin.php", {
        operation: "getAllEvents",
      });

      if (response.data?.status === "success") {
        const allEvents = response.data.events || [];
        const assignments = allEvents.filter((event: any) => {
          try {
            const attachments = event.event_attachments
              ? JSON.parse(event.event_attachments)
              : event.attachments;
            if (!attachments || !Array.isArray(attachments)) return false;

            const invite = attachments.find(
              (a: any) => a.attachment_type === "organizer_invites"
            );
            if (!invite || !invite.description) return false;

            const data = JSON.parse(invite.description);
            const isPending = Array.isArray(data.pending)
              ? data.pending.includes(String(organizerId))
              : false;
            return isPending;
          } catch {
            return false;
          }
        });
        setAssignments(assignments);
      }
    } catch (error) {
      console.error("Error fetching assignments via attachments:", error);
      setAssignments([]);
    }
  };

  const handleAcceptAssignment = async (assignment: Assignment) => {
    if (!actualOrganizerId) {
      toast({
        title: "Error",
        description: "Organizer ID not resolved. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await axios.post("organizer.php", {
        operation: "updateAssignmentStatus",
        event_id: assignment.event_id,
        status: "accepted",
        organizer_id: actualOrganizerId,
      });

      if (response.data?.status === "success") {
        toast({
          title: "Assignment Accepted",
          description: "You have successfully accepted this event assignment.",
        });
        // Remove from assignments list
        setAssignments((prev) =>
          prev.filter((a) => a.event_id !== assignment.event_id)
        );

        // Trigger notification refresh in parent layout
        window.dispatchEvent(
          new CustomEvent("assignmentActionTaken", {
            detail: { eventId: assignment.event_id, action: "accepted" },
          })
        );

        // Trigger calendar refresh
        window.dispatchEvent(
          new CustomEvent("calendarRefresh", {
            detail: { eventId: assignment.event_id, action: "accepted" },
          })
        );
      } else {
        throw new Error(
          response.data?.message || "Failed to accept assignment"
        );
      }
    } catch (error) {
      console.error("Error accepting assignment:", error);
      toast({
        title: "Error",
        description: "Failed to accept assignment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectAssignment = async (assignment: Assignment) => {
    if (!actualOrganizerId) {
      toast({
        title: "Error",
        description: "Organizer ID not resolved. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await axios.post("organizer.php", {
        operation: "updateAssignmentStatus",
        event_id: assignment.event_id,
        status: "rejected",
        organizer_id: actualOrganizerId,
      });

      if (response.data?.status === "success") {
        toast({
          title: "Assignment Rejected",
          description: "You have declined this event assignment.",
        });
        // Remove from assignments list
        setAssignments((prev) =>
          prev.filter((a) => a.event_id !== assignment.event_id)
        );

        // Trigger notification refresh in parent layout
        window.dispatchEvent(
          new CustomEvent("assignmentActionTaken", {
            detail: { eventId: assignment.event_id, action: "rejected" },
          })
        );

        // Trigger calendar refresh
        window.dispatchEvent(
          new CustomEvent("calendarRefresh", {
            detail: { eventId: assignment.event_id, action: "rejected" },
          })
        );
      } else {
        throw new Error(
          response.data?.message || "Failed to reject assignment"
        );
      }
    } catch (error) {
      console.error("Error rejecting assignment:", error);
      toast({
        title: "Error",
        description: "Failed to reject assignment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = async (assignment: Assignment) => {
    try {
      // Fetch detailed event information
      const response = await axios.get(
        `admin.php?operation=getEventDetails&event_id=${assignment.event_id}`
      );

      if (response.data?.status === "success") {
        setSelectedAssignment(response.data.data);
        setShowDetailsModal(true);
      } else {
        // Use assignment data as fallback
        setSelectedAssignment(assignment as AssignmentDetails);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
      // Use assignment data as fallback
      setSelectedAssignment(assignment as AssignmentDetails);
      setShowDetailsModal(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "on_going":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "done":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "partial":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "unpaid":
        return "bg-red-100 text-red-800 border-red-200";
      case "refunded":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Event Assignments
          </h1>
          <p className="text-gray-600">
            Review and respond to event assignment invitations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarDays className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Pending Assignments
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {assignments.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <CalendarDays className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Pending Assignments
          </h3>
          <p className="text-gray-500">
            You don't have any pending event assignments at the moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <Card
              key={assignment.event_id}
              className="border border-gray-200 hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {assignment.event_title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        className={`text-xs ${getStatusColor(assignment.event_status)}`}
                      >
                        {assignment.event_status}
                      </Badge>
                      <Badge
                        className={`text-xs ${getPaymentStatusColor(assignment.payment_status)}`}
                      >
                        {assignment.payment_status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Client Info */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-[#028A75] to-[#027a65] rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {assignment.client_name?.charAt(0) || "C"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {assignment.client_name || "Client"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {assignment.client_email}
                    </p>
                  </div>
                </div>

                {/* Event Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(assignment.event_date), "MMM dd, yyyy")}
                    </span>
                  </div>

                  {assignment.venue_title && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{assignment.venue_title}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{assignment.guest_count} guests</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrency(assignment.total_budget)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleViewDetails(assignment)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  {assignment.assignment_status === "assigned" && (
                    <>
                      <Button
                        onClick={() => handleAcceptAssignment(assignment)}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleRejectAssignment(assignment)}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Event Details Modal */}
      {showDetailsModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky Header with Event Details */}
            <div className="p-6 border-b border-gray-200 bg-white rounded-t-lg sticky top-0 z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Event Details
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Key Event Info in Header */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedAssignment.event_title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(
                        new Date(selectedAssignment.event_date),
                        "MMMM dd, yyyy"
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{selectedAssignment.guest_count} guests</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrency(selectedAssignment.total_budget)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Event Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Event Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedAssignment.event_type_name && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Event Type
                        </label>
                        <p className="text-gray-900">
                          {selectedAssignment.event_type_name}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Status
                      </label>
                      <p className="text-gray-900 capitalize">
                        {selectedAssignment.event_status}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Payment Status
                      </label>
                      <p className="text-gray-900 capitalize">
                        {selectedAssignment.payment_status}
                      </p>
                    </div>
                    {selectedAssignment.down_payment > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Down Payment
                        </label>
                        <p className="text-gray-900">
                          {formatCurrency(selectedAssignment.down_payment)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Client Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Client Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Client Name
                      </label>
                      <p className="text-gray-900">
                        {selectedAssignment.client_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <p className="text-gray-900">
                        {selectedAssignment.client_email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Contact
                      </label>
                      <p className="text-gray-900">
                        {selectedAssignment.client_contact || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Venue Info */}
                {selectedAssignment.venue_title && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Venue Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Venue Name
                        </label>
                        <p className="text-gray-900">
                          {selectedAssignment.venue_title}
                        </p>
                      </div>
                      {selectedAssignment.venue_location && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Location
                          </label>
                          <p className="text-gray-900">
                            {selectedAssignment.venue_location}
                          </p>
                        </div>
                      )}
                      {selectedAssignment.venue_contact && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Venue Contact
                          </label>
                          <p className="text-gray-900">
                            {selectedAssignment.venue_contact}
                          </p>
                        </div>
                      )}
                      {selectedAssignment.venue_capacity && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Capacity
                          </label>
                          <p className="text-gray-900">
                            {selectedAssignment.venue_capacity} people
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {selectedAssignment.additional_notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Additional Notes
                    </h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {selectedAssignment.additional_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Action Buttons at Bottom */}
            {selectedAssignment.assignment_status === "assigned" && (
              <div className="p-6 border-t border-gray-200 bg-white rounded-b-lg sticky bottom-0">
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      handleAcceptAssignment(selectedAssignment as Assignment);
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Assignment
                  </Button>
                  <Button
                    onClick={() => {
                      handleRejectAssignment(selectedAssignment as Assignment);
                      setShowDetailsModal(false);
                    }}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Assignment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
