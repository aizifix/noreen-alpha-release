"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  Percent,
  Wallet,
  CheckCircle,
  Circle,
  AlertCircle,
  Phone,
  Mail,
  Package,
  AlertTriangle,
  Plus,
  Building,
  Banknote,
  Search,
} from "lucide-react";
import axios from "axios";
import { adminApi, notificationsApi } from "@/app/utils/api";
import { endpoints } from "@/app/config/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { format } from "date-fns";
import ClientOnly from "@/app/components/client-only";

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
  assignment_status?: string;
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
  admin_pfp?: string;
  organizer_name?: string;
  organizer_assignment_id?: number;
  organizer_payment_status?: "unpaid" | "partial" | "paid" | "cancelled";
  venue_payment_status?: "unpaid" | "partial" | "paid" | "cancelled";
  created_by_name?: string;
  updated_by_name?: string;
  payment_schedule_name?: string;
  payment_schedule_description?: string;
  installment_count?: number;
  wedding_details?: any;
  feedback?: any;
  components?: EventComponent[];
  timeline?: any[];
  payment_schedule?: any[];
  payments?: any[];
}

interface EventComponent {
  component_id: number;
  event_id: number;
  component_name: string;
  component_price: number;
  component_description?: string;
  is_custom: boolean;
  is_included: boolean;
  original_package_component_id?: number;
  display_order: number;
  original_component_name?: string;
  original_component_description?: string;
  payment_status?: "pending" | "paid" | "cancelled";
  payment_date?: string;
  payment_notes?: string;
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

// Centralized currency formatting function
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Confirmation Modal Component
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  priceImpact,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  priceImpact?: number;
  loading?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        <p className="text-gray-600 mb-4">{message}</p>

        {priceImpact !== undefined && priceImpact !== 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                Budget Impact
              </span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              {priceImpact > 0
                ? `This will increase the total budget by ₱${formatCurrency(Math.abs(priceImpact))}`
                : `This will decrease the total budget by ₱${formatCurrency(Math.abs(priceImpact))}`}
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button onClick={onClose} variant="outline" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? "Processing..." : "Confirm Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Budget Progress Component with fixed formatting
function BudgetProgress({ event }: { event: Event }) {
  // Calculate total paid from payments and down payment
  const paymentsTotal =
    event.payments?.reduce((sum, payment: any) => {
      // Include completed, partial, and paid statuses
      if (["completed", "partial", "paid"].includes(payment.payment_status)) {
        return sum + Number(payment.payment_amount || 0);
      }
      return sum;
    }, 0) || 0;

  // Include down payment if it exists and hasn't been included in payments
  const downPayment = Number(event.down_payment || 0);

  // Check if down payment is already included in payments to avoid double counting
  const downPaymentIncluded =
    event.payments?.some(
      (payment: any) =>
        payment.payment_type === "down_payment" ||
        payment.payment_notes?.toLowerCase().includes("down payment")
    ) || false;

  const totalPaid = paymentsTotal + (downPaymentIncluded ? 0 : downPayment);

  // Ensure remaining amount is never negative
  const remaining = Math.max(0, event.total_budget - totalPaid);
  const progressPercentage = Math.min(
    100,
    Math.max(
      0,
      event.total_budget > 0 ? (totalPaid / event.total_budget) * 100 : 0
    )
  );

  // Debug logging
  console.log("Budget Progress Debug:", {
    totalBudget: event.total_budget,
    downPayment: downPayment,
    downPaymentIncluded: downPaymentIncluded,
    paymentsTotal: paymentsTotal,
    totalPaid: totalPaid,
    remaining: remaining,
    payments: event.payments,
    progressPercentage: progressPercentage,
  });

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
            ₱{formatCurrency(event.total_budget)}
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
              ₱{formatCurrency(totalPaid)}
            </div>
            <div className="text-green-600 text-xs">
              {progressPercentage.toFixed(1)}%
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-orange-700 font-medium">Remaining</div>
            <div className="text-orange-900 font-semibold">
              ₱{formatCurrency(remaining)}
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

// Event Countdown Component
function CalendarModal({
  isOpen,
  onClose,
  event,
}: {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
}) {
  const [daysLeft, setDaysLeft] = useState<number>(0);

  useEffect(() => {
    const calculateDaysLeft = () => {
      const today = new Date();
      const eventDate = new Date(event.event_date);

      // Reset time to compare dates only
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);

      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setDaysLeft(diffDays);
    };

    calculateDaysLeft();
  }, [event.event_date]);

  const generateTimelineData = () => {
    const today = new Date();
    const eventDate = new Date(event.event_date);

    // Calculate total days from today to event
    const totalDays = Math.ceil(
      (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Generate timeline segments (weeks)
    const timelineSegments = [];
    const currentDate = new Date(today);

    // Create segments for each week
    while (currentDate <= eventDate) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Don't go past event date
      if (weekEnd > eventDate) {
        weekEnd.setTime(eventDate.getTime());
      }

      timelineSegments.push({
        start: new Date(weekStart),
        end: new Date(weekEnd),
        isCurrentWeek: weekStart <= today && weekEnd >= today,
        isEventWeek: weekStart <= eventDate && weekEnd >= eventDate,
        isPast: weekEnd < today,
        isFuture: weekStart > today,
      });

      currentDate.setDate(currentDate.getDate() + 7);
    }

    return {
      totalDays,
      timelineSegments,
      today,
      eventDate,
    };
  };

  const timelineData = generateTimelineData();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            Event Timeline
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">
                  {event.event_title}
                </h4>
                <p className="text-sm text-gray-600">
                  {new Date(event.event_date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`text-2xl font-bold ${
                    daysLeft < 0
                      ? "text-gray-500"
                      : daysLeft <= 7
                        ? "text-red-600"
                        : daysLeft <= 30
                          ? "text-orange-600"
                          : "text-green-600"
                  }`}
                >
                  {daysLeft < 0
                    ? "Event Passed"
                    : daysLeft === 0
                      ? "Today!"
                      : daysLeft === 1
                        ? "Tomorrow!"
                        : `${daysLeft} days`}
                </div>
                <p className="text-sm text-gray-500">until event</p>
              </div>
            </div>
          </div>

          {/* Gantt Chart Style Timeline */}
          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm font-medium text-gray-600 mb-4">
              <span>Event Timeline</span>
              <span>{timelineData.totalDays} days remaining</span>
            </div>

            {/* Key Milestones */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Key Milestones
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Today</span>
                  <span className="text-gray-500">
                    {timelineData.today.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Event Day</span>
                  <span className="text-gray-500">
                    {timelineData.eventDate.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-600">30 Days Warning</span>
                  <span className="text-gray-500">Final month preparation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">7 Days Warning</span>
                  <span className="text-gray-500">Final week preparation</span>
                </div>
              </div>
            </div>

            {/* Gantt Chart */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Timeline Progress
                </h4>
                <div className="text-xs text-gray-500">
                  {timelineData.today.toLocaleDateString()} →{" "}
                  {timelineData.eventDate.toLocaleDateString()}
                </div>
              </div>

              {/* Main Timeline Bar */}
              <div className="relative mb-6">
                <div className="h-12 bg-gray-200 rounded-lg relative overflow-hidden">
                  {/* Progress bar */}
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-green-500 rounded-lg transition-all duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, timelineData.totalDays > 0 ? (timelineData.totalDays - daysLeft) / timelineData.totalDays : 0) * 100)}%`,
                    }}
                  ></div>

                  {/* Current position indicator */}
                  <div className="absolute top-0 left-0 h-full w-1 bg-blue-600 shadow-lg z-10"></div>

                  {/* Event date indicator */}
                  <div className="absolute top-0 right-0 h-full w-1 bg-green-600 shadow-lg z-10"></div>

                  {/* 30 days warning indicator */}
                  {daysLeft <= 30 && (
                    <div
                      className="absolute top-0 h-full w-1 bg-orange-500 shadow-lg z-10"
                      style={{
                        left: `${Math.max(0, Math.min(100, ((timelineData.totalDays - 30) / timelineData.totalDays) * 100))}%`,
                      }}
                    ></div>
                  )}

                  {/* 7 days warning indicator */}
                  {daysLeft <= 7 && (
                    <div
                      className="absolute top-0 h-full w-1 bg-red-500 shadow-lg z-10"
                      style={{
                        left: `${Math.max(0, Math.min(100, ((timelineData.totalDays - 7) / timelineData.totalDays) * 100))}%`,
                      }}
                    ></div>
                  )}
                </div>
              </div>

              {/* Week Segments */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-600 mb-2">
                  Weekly Breakdown
                </div>
                {timelineData.timelineSegments.map((segment, index) => {
                  const weekDuration =
                    segment.end.getTime() - segment.start.getTime();
                  const weekWidth = Math.max(
                    20,
                    (weekDuration / (7 * 24 * 60 * 60 * 1000)) * 100
                  );

                  return (
                    <div
                      key={`timeline-segment-${index}`}
                      className="flex items-center space-x-4"
                    >
                      <div className="w-16 text-xs text-gray-500 text-right">
                        Week {index + 1}
                      </div>
                      <div className="flex-1 relative">
                        <div className="h-8 bg-gray-100 rounded border relative overflow-hidden">
                          <div
                            className={`h-full rounded transition-all ${
                              segment.isCurrentWeek
                                ? "bg-blue-500"
                                : segment.isEventWeek
                                  ? "bg-green-500"
                                  : segment.isPast
                                    ? "bg-gray-300"
                                    : "bg-gray-200"
                            }`}
                            style={{
                              width: `${Math.min(100, weekWidth)}%`,
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {segment.start.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          -{" "}
                          {segment.end.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress Statistics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {daysLeft}
                </div>
                <div className="text-sm text-blue-600">Days Left</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.max(0, timelineData.totalDays - daysLeft)}
                </div>
                <div className="text-sm text-green-600">Days Passed</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.max(0, daysLeft - 30)}
                </div>
                <div className="text-sm text-orange-600">
                  Until 30-Day Warning
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {timelineData.totalDays}
                </div>
                <div className="text-sm text-gray-600">Total Days</div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-gray-600">Today</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-600">Event Day</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <span className="text-gray-600">Past Days</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <span className="text-gray-600">Future Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCountdown({ event }: { event: Event }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number>(0);

  useEffect(() => {
    const calculateDaysLeft = () => {
      const today = new Date();
      const eventDate = new Date(event.event_date);

      // Reset time to compare dates only
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);

      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setDaysLeft(diffDays);
    };

    calculateDaysLeft();
    // Update countdown every hour
    const interval = setInterval(calculateDaysLeft, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [event.event_date]);

  const getCountdownColor = () => {
    if (daysLeft < 0) return "text-gray-500";
    if (daysLeft <= 7) return "text-red-600";
    if (daysLeft <= 30) return "text-orange-600";
    return "text-green-600";
  };

  const getCountdownBg = () => {
    if (daysLeft < 0) return "bg-gray-50";
    if (daysLeft <= 7) return "bg-red-50";
    if (daysLeft <= 30) return "bg-orange-50";
    return "bg-green-50";
  };

  return (
    <>
      <div className={`rounded-xl shadow-sm border p-6 ${getCountdownBg()}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Event Countdown
          </h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 rounded-lg hover:bg-white hover:bg-opacity-50 transition-colors"
            title="View Timeline"
          >
            <Calendar className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="text-center">
          <ClientOnly
            fallback={
              <div className="text-3xl font-bold mb-2 text-gray-400">
                Loading...
              </div>
            }
          >
            <div className={`text-3xl font-bold mb-2 ${getCountdownColor()}`}>
              {daysLeft < 0
                ? "Event Passed"
                : daysLeft === 0
                  ? "Today!"
                  : daysLeft === 1
                    ? "Tomorrow!"
                    : daysLeft}
            </div>
          </ClientOnly>
          <ClientOnly
            fallback={
              <p className="text-sm font-medium text-gray-400">Loading...</p>
            }
          >
            <p className={`text-sm font-medium ${getCountdownColor()}`}>
              {daysLeft < 0
                ? "Event has passed"
                : daysLeft === 0
                  ? "Event is today!"
                  : daysLeft === 1
                    ? "Event is tomorrow!"
                    : `${daysLeft} days until event`}
            </p>
          </ClientOnly>
          <ClientOnly
            fallback={<p className="text-xs text-gray-400 mt-2">Loading...</p>}
          >
            <p className="text-xs text-gray-500 mt-2">
              {new Date(event.event_date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </ClientOnly>
        </div>
      </div>

      <CalendarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={event}
      />
    </>
  );
}

// Venue Selection Component
function VenueSelection({
  event,
  onEventUpdate,
}: {
  event: Event;
  onEventUpdate: () => Promise<void>;
}) {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCustomVenue, setShowCustomVenue] = useState(false);
  const [customVenueName, setCustomVenueName] = useState("");
  const [customVenuePrice, setCustomVenuePrice] = useState<number | "">("");
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    if (event.package_id) {
      fetchPackageVenues();
    }
  }, [event.package_id]);

  const fetchPackageVenues = async () => {
    try {
      setLoading(true);
      const response = await axios.post(endpoints.admin, {
        operation: "getPackageVenues",
        package_id: event.package_id,
      });

      if (response.data.status === "success") {
        setVenues(response.data.venues || []);
      }
    } catch (error) {
      console.error("Error fetching package venues:", error);
      toast({
        title: "Error",
        description: "Failed to fetch available venues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomVenue = async () => {
    if (!customVenueName.trim()) {
      toast({
        title: "Validation Error",
        description: "Enter a custom venue name",
        variant: "destructive",
      });
      return;
    }
    const priceNum = Number(customVenuePrice);
    if (!priceNum || priceNum <= 0) {
      toast({
        title: "Validation Error",
        description: "Enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }
    try {
      setSavingCustom(true);
      const res = await fetch(endpoints.admin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "addEventComponent",
          event_id: event.event_id,
          component_name: `Venue: ${customVenueName.trim()}`,
          component_description: "Custom Venue",
          component_price: priceNum,
          is_custom: true,
          is_included: true,
          payment_status: "pending",
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast({
          title: "Custom Venue Added",
          description: "Added as a custom inclusion.",
        });
        setCustomVenueName("");
        setCustomVenuePrice("");
        setShowCustomVenue(false);
        await onEventUpdate();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to add custom venue",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to add custom venue",
        variant: "destructive",
      });
    } finally {
      setSavingCustom(false);
    }
  };

  const handleVenueChange = async (venueId: number) => {
    try {
      setLoading(true);
      const response = await axios.post("/admin.php", {
        operation: "updateEventVenue",
        event_id: event.event_id,
        venue_id: venueId,
      });

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: "Venue updated successfully",
        });
        await onEventUpdate();
        setIsEditing(false);
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to update venue",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating venue:", error);
      toast({
        title: "Error",
        description: "Failed to update venue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!event.package_id) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Building className="h-6 w-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Venue Selection
            </h3>
            <p className="text-sm text-gray-500">
              Choose from available venues for this package
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
          size="sm"
          disabled={loading}
        >
          {isEditing ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Change Venue
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {venues.length > 0 ? (
            venues.map((venue) => (
              <div
                key={venue.venue_id}
                className={`border rounded-lg p-4 transition-all ${
                  event.venue_id === venue.venue_id
                    ? "border-purple-200 bg-purple-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {event.venue_id === venue.venue_id ? (
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <h4 className="font-medium text-gray-900">
                        {venue.venue_title}
                      </h4>
                      {event.venue_id === venue.venue_id && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {venue.venue_location}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-purple-600 font-semibold">
                        ₱{formatCurrency(venue.venue_price || 0)}
                      </span>
                      <span className="text-gray-500">
                        Capacity: {venue.venue_capacity || "N/A"}
                      </span>
                    </div>
                  </div>
                  {isEditing && event.venue_id !== venue.venue_id && (
                    <Button
                      onClick={() => handleVenueChange(venue.venue_id)}
                      disabled={loading}
                      variant="outline"
                      size="sm"
                    >
                      Select
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No venues available for this package</p>
            </div>
          )}

          {isEditing && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-gray-900">
                    Add Custom Venue
                  </span>
                </div>
                <Button
                  variant={showCustomVenue ? "outline" : "default"}
                  size="sm"
                  onClick={() => setShowCustomVenue((v) => !v)}
                >
                  {showCustomVenue ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      New
                    </>
                  )}
                </Button>
              </div>
              {showCustomVenue && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Label htmlFor="customVenueName">Venue Name</Label>
                    <Input
                      id="customVenueName"
                      placeholder="e.g. Client's Backyard"
                      value={customVenueName}
                      onChange={(e) => setCustomVenueName(e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label htmlFor="customVenuePrice">Price (₱)</Label>
                    <Input
                      id="customVenuePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        customVenuePrice === "" ? "" : String(customVenuePrice)
                      }
                      onChange={(e) =>
                        setCustomVenuePrice(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div className="col-span-1 flex items-end gap-2">
                    <Button
                      onClick={handleAddCustomVenue}
                      disabled={savingCustom}
                    >
                      {savingCustom ? "Saving..." : "Add"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCustomVenue(false);
                        setCustomVenueName("");
                        setCustomVenuePrice("");
                      }}
                      disabled={savingCustom}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="col-span-1 md:col-span-3 text-xs text-gray-500">
                    Adds a custom venue as an inclusion so you can flexibly
                    price it.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Package Inclusions Management Component
function PackageInclusionsManagement({
  event,
  onEventUpdate,
}: {
  event: Event;
  onEventUpdate: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [components, setComponents] = useState<EventComponent[]>(
    event.components || []
  );
  const [originalComponents, setOriginalComponents] = useState<
    EventComponent[]
  >(event.components || []);
  const [newComponent, setNewComponent] = useState({
    component_name: "",
    component_description: "",
    component_price: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: "save_changes" | "cancel";
    priceImpact?: number;
    message?: string;
  }>({
    isOpen: false,
    action: "save_changes",
  });
  // NOTE: Assign Organizer UI lives in the main EventDetailsPage component

  // Calculate total price of inclusions
  const totalInclusionsPrice = components
    .filter((comp) => comp.is_included)
    .reduce((sum, comp) => sum + Number(comp.component_price || 0), 0);

  // Check if there are any changes
  const hasChanges = () => {
    if (components.length !== originalComponents.length) return true;

    for (let i = 0; i < components.length; i++) {
      const current = components[i];
      const original = originalComponents[i];

      if (!original) return true;

      if (
        current.component_name !== original.component_name ||
        current.component_description !== original.component_description ||
        current.component_price !== original.component_price ||
        current.is_included !== original.is_included
      ) {
        return true;
      }
    }

    return false;
  };

  // Calculate price impact for all changes
  const calculateTotalPriceImpact = () => {
    const originalTotal = originalComponents
      .filter((comp) => comp.is_included)
      .reduce((sum, comp) => sum + Number(comp.component_price || 0), 0);

    const newTotal = components
      .filter((comp) => comp.is_included)
      .reduce((sum, comp) => sum + Number(comp.component_price || 0), 0);

    return newTotal - originalTotal;
  };

  // Validation function
  const validateComponent = (componentData: any) => {
    const errors: string[] = [];

    if (!componentData.component_name?.trim()) {
      errors.push("Component name is required");
    }

    if (componentData.component_name?.trim().length > 100) {
      errors.push("Component name must be less than 100 characters");
    }

    if (componentData.component_description?.length > 500) {
      errors.push("Description must be less than 500 characters");
    }

    if (componentData.component_price < 0) {
      errors.push("Price cannot be negative");
    }

    if (componentData.component_price > 10000000) {
      errors.push("Price cannot exceed ₱10,000,000");
    }

    return errors;
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // If currently editing and there are changes, show confirmation
      if (hasChanges()) {
        const priceImpact = calculateTotalPriceImpact();
        setConfirmModal({
          isOpen: true,
          action: "save_changes",
          priceImpact,
          message:
            "Do you want to save your changes? This will update the event budget.",
        });
      } else {
        // No changes, just cancel editing
        handleCancelChanges();
      }
    } else {
      // Start editing
      setIsEditing(true);
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      const priceImpact = calculateTotalPriceImpact();

      // Save all component changes
      for (const component of components) {
        const originalComponent = originalComponents.find(
          (c) => c.component_id === component.component_id
        );

        if (!originalComponent) {
          // New component
          await performSaveComponent(component, true);
        } else if (
          component.component_name !== originalComponent.component_name ||
          component.component_description !==
            originalComponent.component_description ||
          component.component_price !== originalComponent.component_price ||
          component.is_included !== originalComponent.is_included
        ) {
          // Updated component
          await performSaveComponent(component, false);
        }
      }

      // Delete removed components
      for (const originalComponent of originalComponents) {
        const stillExists = components.find(
          (c) => c.component_id === originalComponent.component_id
        );
        if (!stillExists) {
          await performDeleteComponent(originalComponent.component_id);
        }
      }

      // Update budget if there's a price impact
      if (priceImpact !== 0) {
        await updateEventBudget(event.event_id, priceImpact);
      }

      // Update original components and exit edit mode
      setOriginalComponents([...components]);
      setIsEditing(false);
      setShowAddForm(false);
      setConfirmModal({ isOpen: false, action: "save_changes" });

      // Refresh event data
      await onEventUpdate();

      toast({
        title: "Success",
        description: event.package_id
          ? "Package inclusions updated successfully"
          : "Event components updated successfully",
      });
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelChanges = () => {
    setComponents(originalComponents);
    setIsEditing(false);
    setShowAddForm(false);
    setConfirmModal({ isOpen: false, action: "cancel" });
  };

  const updateEventBudget = async (eventId: number, budgetChange: number) => {
    const response = await fetch(endpoints.admin, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operation: "updateEventBudget",
        event_id: eventId,
        budget_change: budgetChange,
      }),
    });

    const data = await response.json();
    if (data.status !== "success") {
      throw new Error(data.message || "Failed to update budget");
    }
  };

  const performSaveComponent = async (componentData: any, isNew: boolean) => {
    const response = await fetch(endpoints.admin, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operation: isNew ? "addEventComponent" : "updateEventComponent",
        event_id: event.event_id,
        component_id: isNew ? undefined : componentData.component_id,
        component_name: componentData.component_name?.trim(),
        component_description:
          componentData.component_description?.trim() || null,
        component_price: Number(componentData.component_price) || 0,
        is_custom: isNew,
        is_included: componentData.is_included,
        // allow setting initial payment status when creating a custom inclusion
        payment_status: isNew
          ? componentData.payment_status || "pending"
          : undefined,
      }),
    });

    const data = await response.json();
    if (data.status !== "success") {
      throw new Error(data.message || "Failed to save component");
    }

    if (isNew && data.component_id) {
      // Update the component with the new ID
      const updatedComponent = {
        ...componentData,
        component_id: data.component_id,
      };
      setComponents(
        components.map((comp) =>
          comp.component_id === componentData.component_id
            ? updatedComponent
            : comp
        )
      );
    }
  };

  const performDeleteComponent = async (componentId: number) => {
    const response = await fetch("/admin.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operation: "deleteEventComponent",
        component_id: componentId,
      }),
    });

    const data = await response.json();
    if (data.status !== "success") {
      throw new Error(data.message || "Failed to delete component");
    }
  };

  const handleAddComponent = () => {
    // Validation
    const validationErrors = validateComponent(newComponent);
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    // Generate a stable temporary ID for hydration safety
    const generateTempId = () => {
      return Math.floor(Math.random() * 1000000) + 1;
    };

    const newComp: EventComponent = {
      component_id: generateTempId(), // Temporary ID - stable for hydration
      event_id: event.event_id,
      component_name: newComponent.component_name.trim(),
      component_description: newComponent.component_description?.trim() || "",
      component_price: Number(newComponent.component_price) || 0,
      is_custom: true,
      is_included: true,
      display_order: components.length,
    };

    setComponents([...components, newComp]);
    setNewComponent({
      component_name: "",
      component_description: "",
      component_price: 0,
    });
    setShowAddForm(false);

    // For "from scratch" events, automatically start editing mode when adding the first component
    if (!event.package_id && components.length === 0) {
      setIsEditing(true);
    }
  };

  const handleEditComponent = (componentId: number) => {
    // This will be handled by the ComponentDisplay component
  };

  const handleUpdateComponent = (updatedComponent: EventComponent) => {
    setComponents(
      components.map((comp) =>
        comp.component_id === updatedComponent.component_id
          ? updatedComponent
          : comp
      )
    );
  };

  const handleDeleteComponent = (componentId: number) => {
    setComponents(
      components.filter((comp) => comp.component_id !== componentId)
    );
  };

  const handleToggleInclusion = (componentId: number) => {
    setComponents(
      components.map((comp) =>
        comp.component_id === componentId
          ? { ...comp, is_included: !comp.is_included }
          : comp
      )
    );
  };

  // Inline payment status dropdown state
  const [editingPaymentStatusFor, setEditingPaymentStatusFor] = useState<
    number | null
  >(null);

  const handlePaymentStatusChange = async (
    componentId: number,
    newStatus: "pending" | "paid" | "cancelled"
  ) => {
    try {
      console.log(
        "Changing payment status for component:",
        componentId,
        "to:",
        newStatus
      );
      setLoading(true);
      const response = await axios.post(
        endpoints.admin,
        {
          operation: "updateComponentPaymentStatus",
          component_id: componentId,
          payment_status: newStatus,
          payment_notes: `Status changed to ${newStatus} by admin`,
        },
        { validateStatus: () => true }
      );

      if (response.data?.status === "success") {
        // Update local state
        setComponents(
          components.map((comp) =>
            comp.component_id === componentId
              ? {
                  ...comp,
                  payment_status: newStatus,
                  payment_date:
                    newStatus === "paid" ? new Date().toISOString() : undefined,
                }
              : comp
          )
        );

        toast({
          title: "Success",
          description: `Payment status updated to ${newStatus}`,
        });

        // Create client notification for this inclusion update
        try {
          const comp = components.find((c) => c.component_id === componentId);
          const componentName =
            (comp as any)?.component_name ||
            (comp as any)?.name ||
            `Component #${componentId}`;
          if (event && event.user_id) {
            await notificationsApi.post({
              operation: "create_notification",
              user_id: event.user_id,
              type: "payment_component_status",
              title: "Inclusion Payment Status Updated",
              message: `The inclusion ${componentName} payment status is now ${newStatus}.`,
              priority: "medium",
              icon: "credit-card",
              url: `/client/events/${event.event_id}`,
              event_id: event.event_id,
              expires_hours: 168,
            });
          }
        } catch (e) {
          // Non-blocking: ignore notification errors
        }

        // Refresh event data to get updated stats
        await onEventUpdate();
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
    } finally {
      setLoading(false);
      setEditingPaymentStatusFor(null);
    }
  };

  return (
    <>
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, action: "save_changes" })
        }
        onConfirm={
          confirmModal.action === "save_changes"
            ? handleSaveChanges
            : handleCancelChanges
        }
        title="Confirm Changes"
        message={
          confirmModal.message || "Are you sure you want to save your changes?"
        }
        priceImpact={confirmModal.priceImpact}
        loading={loading}
      />

      {/* Inline dropdown replaces modal – nothing to render here */}

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {event.package_id ? "Package Inclusions" : "Event Components"}
              </h3>
              <p className="text-sm text-gray-500">
                {event.package_id
                  ? "Manage components and pricing for this event package"
                  : "Manage custom components and pricing for this event"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right min-w-[150px]">
              <div className="text-sm text-gray-500">
                {event.package_id ? "Total Inclusions" : "Total Components"}
              </div>
              <div className="text-sm font-semibold text-green-600">
                {components.filter((comp) => comp.is_included).length} items
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing && hasChanges() && (
                <>
                  <Button
                    onClick={handleSaveChanges}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleEditToggle}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
              {isEditing && !hasChanges() && (
                <Button
                  onClick={handleEditToggle}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              {!isEditing && (
                <Button
                  onClick={handleEditToggle}
                  variant="default"
                  size="sm"
                  disabled={loading}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* --- PAYMENT COMPLETION PROGRESS BAR --- */}
        {(() => {
          const includedComponents = components.filter(
            (comp) => comp.is_included
          );
          const paidComponents = includedComponents.filter(
            (comp) => (comp as any).payment_status === "paid"
          );

          // Include organizer and venue in counts
          const organizerCount = event.organizer_id ? 1 : 0;
          const venueCount = event.venue_id ? 1 : 0;
          const extraIncluded = organizerCount + venueCount;
          const organizerPaid =
            event.organizer_payment_status === "paid" || !event.organizer_id
              ? 1
              : 0;
          const venuePaid = event.venue_payment_status === "paid" ? 1 : 0;
          const extraPaid = organizerPaid + venuePaid;

          const totalIncludedWithExtras =
            includedComponents.length + extraIncluded;
          const totalPaidWithExtras = paidComponents.length + extraPaid;

          const completionPercentage =
            totalIncludedWithExtras > 0
              ? Math.round(
                  (totalPaidWithExtras / totalIncludedWithExtras) * 100
                )
              : 0;

          return (
            <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-gray-600" />
                  <h4 className="text-sm font-semibold text-gray-900">
                    Payment Completion Progress
                  </h4>
                </div>
                <div className="text-sm font-medium">
                  <span className="text-green-600">{totalPaidWithExtras}</span>{" "}
                  of{" "}
                  <span className="text-gray-900">
                    {totalIncludedWithExtras}
                  </span>{" "}
                  inclusions paid
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300 ease-out"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-bold text-gray-700">
                  {completionPercentage}%
                </span>
              </div>
            </div>
          );
        })()}

        {/* --- SUMMARY SECTION --- */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">
              {event.package_id
                ? "Total Inclusion Cost"
                : "Total Components Cost"}
            </div>
            <div className="text-lg font-bold text-green-700">
              ₱{formatCurrency(totalInclusionsPrice)}
            </div>
          </div>
          {event.package_id ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">
                Base Package Price
              </div>
              <div className="text-lg font-bold text-blue-700">
                ₱{formatCurrency(event.total_budget)}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">
                Total Event Budget
              </div>
              <div className="text-lg font-bold text-blue-700">
                ₱{formatCurrency(event.total_budget)}
              </div>
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            {event.package_id ? (
              // Package event logic
              totalInclusionsPrice < event.total_budget ? (
                <>
                  <div className="text-xs text-gray-500 mb-1">
                    Organizer Fee / Margin
                  </div>
                  <div className="text-lg font-bold text-orange-600">
                    ₱{formatCurrency(event.total_budget - totalInclusionsPrice)}
                  </div>
                </>
              ) : totalInclusionsPrice > event.total_budget ? (
                <>
                  <div className="text-xs text-gray-500 mb-1">
                    Add-on (Payable by Client)
                  </div>
                  <div className="text-lg font-bold text-red-600">
                    ₱{formatCurrency(totalInclusionsPrice - event.total_budget)}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs text-gray-500 mb-1">
                    No Margin / Add-on
                  </div>
                  <div className="text-lg font-bold text-gray-700">₱0.00</div>
                </>
              )
            ) : // From scratch event logic
            totalInclusionsPrice < event.total_budget ? (
              <>
                <div className="text-xs text-gray-500 mb-1">
                  Available Budget
                </div>
                <div className="text-lg font-bold text-green-600">
                  ₱{formatCurrency(event.total_budget - totalInclusionsPrice)}
                </div>
              </>
            ) : totalInclusionsPrice > event.total_budget ? (
              <>
                <div className="text-xs text-gray-500 mb-1">Budget Overrun</div>
                <div className="text-lg font-bold text-red-600">
                  ₱{formatCurrency(totalInclusionsPrice - event.total_budget)}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-500 mb-1">
                  Budget Balanced
                </div>
                <div className="text-lg font-bold text-gray-700">₱0.00</div>
              </>
            )}
          </div>
        </div>
        {/* --- END SUMMARY SECTION --- */}

        {/* Components List */}
        <div className="space-y-4">
          {components.length > 0 ? (
            <>
              {components.map((component, index) => (
                <div
                  key={
                    component?.component_id && component.component_id !== 0
                      ? `component-${component.component_id}`
                      : `component-temp-${index}-${component?.component_name || "unnamed"}`
                  }
                  className={`border rounded-lg p-4 transition-all ${
                    component.is_included
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        {component.is_included ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                        {isEditing && (
                          <input
                            type="checkbox"
                            checked={component.is_included}
                            onChange={() =>
                              handleToggleInclusion(component.component_id)
                            }
                            className="rounded border-gray-300"
                          />
                        )}
                      </div>

                      <div className="flex-1">
                        <ComponentDisplay
                          component={component}
                          isEditing={isEditing}
                          onEdit={() =>
                            handleEditComponent(component.component_id)
                          }
                          onDelete={() =>
                            handleDeleteComponent(component.component_id)
                          }
                          onToggleInclusion={() =>
                            handleToggleInclusion(component.component_id)
                          }
                          loading={loading}
                          onUpdateComponent={handleUpdateComponent}
                          onSetPaymentStatus={(id, status) =>
                            handlePaymentStatusChange(id, status)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>
                {event.package_id
                  ? "No components found for this package"
                  : "No components added yet. Start building your custom event by adding components."}
              </p>
            </div>
          )}

          {/* Inline Payment Status Dropdown */}
          {editingPaymentStatusFor && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setEditingPaymentStatusFor(null)}
            />
          )}
          <div className="relative">
            {components.map((component, index) => (
              <div
                key={
                  component?.component_id && component.component_id !== 0
                    ? `dropdown-anchor-${component.component_id}`
                    : `dropdown-anchor-temp-${index}`
                }
              />
            ))}
          </div>

          {/* Add New Component Button */}
          {!showAddForm && (
            <div className="text-center">
              <Button
                onClick={() => setShowAddForm(true)}
                variant="outline"
                className="border-dashed border-green-300 text-green-700 hover:bg-green-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                {event.package_id
                  ? "Add Custom Inclusion"
                  : "Add Custom Component"}
              </Button>
            </div>
          )}

          {/* Add New Component Form */}
          {showAddForm && (
            <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-green-900">
                  {event.package_id
                    ? "Add Custom Inclusion"
                    : "Add Custom Component"}
                </h4>
                <span className="text-xs text-green-700 bg-green-200 px-2 py-1 rounded">
                  {event.package_id ? "New Inclusion" : "New Component"}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Component Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newComponent.component_name}
                    onChange={(e) =>
                      setNewComponent({
                        ...newComponent,
                        component_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter component name"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newComponent.component_name.length}/100 characters
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newComponent.component_description}
                    onChange={(e) =>
                      setNewComponent({
                        ...newComponent,
                        component_description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter component description (optional)"
                    maxLength={500}
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newComponent.component_description.length}/500 characters
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">
                      ₱
                    </span>
                    <input
                      type="number"
                      value={
                        isNaN(newComponent.component_price)
                          ? 0
                          : newComponent.component_price
                      }
                      onChange={(e) =>
                        setNewComponent({
                          ...newComponent,
                          component_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                      min="0"
                      max="10000000"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3 border-t border-green-200">
                  <Button
                    onClick={handleAddComponent}
                    disabled={!newComponent.component_name.trim() || loading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {event.package_id ? "Add Inclusion" : "Add Component"}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setNewComponent({
                        component_name: "",
                        component_description: "",
                        component_price: 0,
                      });
                      setShowAddForm(false);
                    }}
                    variant="outline"
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Component Display for read-only and edit modes
function ComponentDisplay({
  component,
  isEditing,
  onEdit,
  onDelete,
  onToggleInclusion,
  loading,
  onUpdateComponent,
  onSetPaymentStatus,
}: {
  component: EventComponent;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleInclusion: () => void;
  loading: boolean;
  onUpdateComponent?: (updatedComponent: EventComponent) => void;
  onSetPaymentStatus?: (
    componentId: number,
    newStatus: "pending" | "paid" | "cancelled"
  ) => void;
}) {
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editedComponent, setEditedComponent] = useState(component);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    setEditedComponent(component);
  }, [component]);

  const handleSave = () => {
    // Update the component in the parent state
    if (onUpdateComponent) {
      onUpdateComponent(editedComponent);
    }
    setIsInlineEditing(false);
  };

  const handleCancel = () => {
    setEditedComponent(component);
    setIsInlineEditing(false);
  };

  const handleEdit = () => {
    setIsInlineEditing(true);
  };

  if (!isEditing) {
    // Read-only display mode
    return (
      <div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">
              {component.component_name}
              {component.is_custom && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Custom
                </span>
              )}
            </h4>
            {component.component_description && (
              <p className="text-sm text-gray-600 mt-1">
                {component.component_description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-lg font-semibold text-green-600">
                ₱{formatCurrency(Number(component.component_price) || 0)}
              </span>
              {!component.is_custom && component.original_component_name && (
                <span className="text-xs text-gray-500">
                  Original: {component.original_component_name}
                </span>
              )}
            </div>
            {/* Payment Status */}
            {component.is_included && (
              <div className="flex items-center gap-2 mt-3">
                <div className="text-xs text-gray-500">Payment Status:</div>
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu((v) => !v)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
                      component.payment_status === "paid"
                        ? "bg-green-100 text-green-800 border border-green-300"
                        : component.payment_status === "cancelled"
                          ? "bg-red-100 text-red-800 border border-red-300"
                          : "bg-yellow-100 text-yellow-800 border border-yellow-300"
                    }`}
                  >
                    {component.payment_status === "paid" && (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" /> Paid
                      </>
                    )}
                    {component.payment_status === "pending" && (
                      <>
                        <Clock className="h-3 w-3 mr-1" /> Pending
                      </>
                    )}
                    {component.payment_status === "cancelled" && (
                      <>
                        <X className="h-3 w-3 mr-1" /> Cancelled
                      </>
                    )}
                  </button>
                  {showStatusMenu && (
                    <div className="absolute z-50 mt-2 w-40 bg-white border rounded-md shadow-lg p-1">
                      <button
                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-green-50"
                        onClick={() => {
                          onSetPaymentStatus?.(component.component_id, "paid");
                          setShowStatusMenu(false);
                        }}
                      >
                        Mark as Paid
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-yellow-50"
                        onClick={() => {
                          onSetPaymentStatus?.(
                            component.component_id,
                            "pending"
                          );
                          setShowStatusMenu(false);
                        }}
                      >
                        Mark as Pending
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-red-50"
                        onClick={() => {
                          onSetPaymentStatus?.(
                            component.component_id,
                            "cancelled"
                          );
                          setShowStatusMenu(false);
                        }}
                      >
                        Mark as Cancelled
                      </button>
                    </div>
                  )}
                </div>
                {component.payment_date &&
                  component.payment_status === "paid" && (
                    <span className="text-xs text-gray-500">
                      Paid on{" "}
                      {new Date(component.payment_date).toLocaleDateString()}
                    </span>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isInlineEditing) {
    // Inline edit mode
    return (
      <div className="space-y-4 border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-medium text-blue-900">Editing Component</h5>
          <span className="text-xs text-blue-700 bg-blue-200 px-2 py-1 rounded">
            Edit Mode
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Component Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editedComponent.component_name}
              onChange={(e) =>
                setEditedComponent({
                  ...editedComponent,
                  component_name: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              placeholder="Component name"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {editedComponent.component_name.length}/100 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={editedComponent.component_description || ""}
              onChange={(e) =>
                setEditedComponent({
                  ...editedComponent,
                  component_description: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Component description (optional)"
              maxLength={500}
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">
              {(editedComponent.component_description || "").length}/500
              characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">₱</span>
              <input
                type="number"
                value={
                  isNaN(editedComponent.component_price)
                    ? 0
                    : editedComponent.component_price
                }
                onChange={(e) =>
                  setEditedComponent({
                    ...editedComponent,
                    component_price: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                min="0"
                max="10000000"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-3 border-t border-blue-200">
          <Button
            onClick={handleSave}
            disabled={loading || !editedComponent.component_name.trim()}
            className="flex-1"
            size="sm"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={loading}
            size="sm"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Edit mode (not inline editing)
  return (
    <div>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {component.component_name}
            {component.is_custom && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Custom
              </span>
            )}
          </h4>
          {component.component_description && (
            <p className="text-sm text-gray-600 mt-1">
              {component.component_description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-lg font-semibold text-green-600">
              ₱{formatCurrency(Number(component.component_price) || 0)}
            </span>
            {!component.is_custom && component.original_component_name && (
              <span className="text-xs text-gray-500">
                Original: {component.original_component_name}
              </span>
            )}
          </div>
          {/* Payment Status in Edit Mode */}
          {component.is_included && (
            <div className="flex items-center gap-2 mt-3">
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu((v) => !v)}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity ${
                    component.payment_status === "paid"
                      ? "bg-green-100 text-green-800"
                      : component.payment_status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {component.payment_status === "paid" && (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" /> Paid
                    </>
                  )}
                  {component.payment_status === "pending" && (
                    <>
                      <Clock className="h-3 w-3 mr-1" /> Pending
                    </>
                  )}
                  {component.payment_status === "cancelled" && (
                    <>
                      <X className="h-3 w-3 mr-1" /> Cancelled
                    </>
                  )}
                </button>
                {showStatusMenu && (
                  <div className="absolute z-50 mt-2 w-40 bg-white border rounded-md shadow-lg p-1">
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-green-50"
                      onClick={() => {
                        onSetPaymentStatus?.(component.component_id, "paid");
                        setShowStatusMenu(false);
                      }}
                    >
                      Mark as Paid
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-yellow-50"
                      onClick={() => {
                        onSetPaymentStatus?.(component.component_id, "pending");
                        setShowStatusMenu(false);
                      }}
                    >
                      Mark as Pending
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-red-50"
                      onClick={() => {
                        onSetPaymentStatus?.(
                          component.component_id,
                          "cancelled"
                        );
                        setShowStatusMenu(false);
                      }}
                    >
                      Mark as Cancelled
                    </button>
                  </div>
                )}
              </div>
              {component.payment_date &&
                component.payment_status === "paid" && (
                  <span className="text-xs text-gray-500">
                    Paid on{" "}
                    {new Date(component.payment_date).toLocaleDateString()}
                  </span>
                )}
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          <Button
            onClick={handleEdit}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            onClick={onDelete}
            disabled={loading}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// Event Timeline Component
function EventTimeline({ event }: { event: Event }) {
  const getTimelineSteps = () => {
    const includedComponents = (event.components || []).filter(
      (comp) => comp.is_included
    );
    const paidIncludedComponents = includedComponents.filter(
      (comp) => comp.payment_status === "paid"
    );
    const allIncludedPaid =
      includedComponents.length > 0 &&
      paidIncludedComponents.length === includedComponents.length;

    // Calculate derived payment status based on budget progress
    const calculateDerivedPaymentStatus = () => {
      // Calculate total paid amount
      const paymentsTotal =
        event.payments?.reduce((sum, payment: any) => {
          if (
            ["completed", "partial", "paid"].includes(payment.payment_status)
          ) {
            return sum + Number(payment.payment_amount || 0);
          }
          return sum;
        }, 0) || 0;

      const downPayment = Number(event.down_payment || 0);
      const downPaymentIncluded =
        event.payments?.some(
          (payment: any) =>
            payment.payment_type === "down_payment" ||
            payment.payment_notes?.toLowerCase().includes("down payment")
        ) || false;

      const totalPaid = paymentsTotal + (downPaymentIncluded ? 0 : downPayment);
      const remaining = event.total_budget - totalPaid;

      // If fully paid (no remaining balance), return "paid"
      if (remaining <= 0 && event.total_budget > 0) {
        return "paid";
      }

      // If partially paid, return "partial"
      if (totalPaid > 0 && remaining > 0) {
        return "partial";
      }

      // If no payments made, return "unpaid"
      return "unpaid";
    };

    const derivedPaymentStatus = calculateDerivedPaymentStatus();

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
        description: `Down payment: ₱${formatCurrency(Number(event.down_payment || 0))}`,
      },
      {
        id: "planning",
        title: "Event Planning",
        date: null,
        status:
          allIncludedPaid || event.event_status === "confirmed"
            ? "completed"
            : "pending",
        icon: Edit,
        description: allIncludedPaid
          ? "All inclusions paid. Event ready."
          : "Planning event details",
      },
      {
        id: "final-payment",
        title: "Final Payment",
        date: null,
        status:
          calculateDerivedPaymentStatus() === "paid" ? "completed" : "pending",
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

  const steps = (() => {
    const base = getTimelineSteps();
    // Compute derived counts including organizer and venue
    const includedComponents = (event.components || []).filter(
      (c) => c.is_included
    );
    const paidIncludedComponents = includedComponents.filter(
      (c) => c.payment_status === "paid"
    );
    const organizerPaid =
      event.organizer_payment_status === "paid" || !event.organizer_id;
    const venuePaid = event.venue_payment_status === "paid";
    const extraEntitiesCount =
      (event.organizer_id ? 1 : 0) + (event.venue_id ? 1 : 0);
    const derivedIncludedCount = includedComponents.length + extraEntitiesCount;
    const derivedPaidCount =
      paidIncludedComponents.length +
      (organizerPaid ? 1 : 0) +
      (venuePaid ? 1 : 0);
    const planningComplete =
      derivedIncludedCount > 0 && derivedPaidCount === derivedIncludedCount;
    return base.map((s) =>
      s.id === "planning"
        ? {
            ...s,
            status: event.event_status === "confirmed" ? "completed" : s.status,
          }
        : s
    );
  })();

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
    return `${endpoints.serveImage}?path=${encodeURIComponent(pfpPath)}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-start space-x-4">
        {/* Profile Picture */}
        <div className="relative flex-shrink-0">
          {event.client_pfp ? (
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
          ) : null}

          {/* Fallback initials (hidden if image loads successfully) */}
          <div
            className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center ${
              event.client_pfp ? "hidden" : ""
            }`}
          >
            <span className="text-white font-semibold text-lg">
              {getClientInitials(getClientFullName())}
            </span>
          </div>

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
              <span className="text-gray-600">Client</span>
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
  const [isCreating, setIsCreating] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    payment_type: "custom" as "custom" | "percentage" | "full",
    percentage: 0 as number,
    payment_amount: 0,
    payment_method: "cash" as "gcash" | "bank-transfer" | "cash",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_status: "completed" as "completed" | "pending",
    next_due_date: "",
    payment_reference: "",
    payment_notes: "",
  });
  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState("");
  const paymentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPaymentHistory();
  }, [event.event_id]);

  // Refresh payment history when modal opens
  useEffect(() => {
    if (isPaymentModalOpen) {
      console.log("Payment modal opened, refreshing payment history...");
      console.log("Current payment history:", paymentHistory);
      fetchPaymentHistory();
    }
  }, [isPaymentModalOpen]);

  const fetchPaymentHistory = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching payment history for event:", event.event_id);

      const response = await axios.post(endpoints.admin, {
        operation: "getEventPayments",
        event_id: event.event_id,
      });

      console.log("Payment history API response:", response.data);
      console.log("Response status:", response.status);
      console.log("Payments in response:", response.data.payments);
      console.log("Event payments:", event.payments);

      if (response.data.status === "success") {
        const raw = response.data.payments || event.payments || [];
        console.log("Raw payment data:", raw);
        console.log("Raw payment data length:", raw.length);

        const normalized = (raw || []).map((p: any) => {
          // Attachments removed; ensure field exists as empty array for UI safety
          return { ...p, payment_attachments: [] };
        });

        console.log("Normalized payment data:", normalized);
        console.log(
          "Setting payment history with",
          normalized.length,
          "payments"
        );

        setPaymentHistory(normalized);
      } else {
        console.error("API returned error:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      const fallback = (event.payments || []).map((p: any) => ({
        ...p,
        payment_attachments: [],
      }));
      console.log("Using fallback payment data:", fallback);
      setPaymentHistory(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  // Number formatting utilities
  const formatNumberWithCommas = (value: string | number): string => {
    if (!value || value === 0) return "";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "";

    return numValue.toLocaleString("en-US", {
      style: "decimal",
      minimumFractionDigits: 0, // No forced decimals
      maximumFractionDigits: 20, // Allow unlimited decimal places
    });
  };

  const parseFormattedNumber = (formattedValue: string): number => {
    if (!formattedValue) return 0;
    // Remove commas and parse
    const cleanValue = formattedValue.replace(/,/g, "");
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handlePaymentAmountChange = (value: string) => {
    // Allow typing freely but format with commas as user types
    const cleanValue = value.replace(/,/g, "");

    // Handle special cases for incomplete decimal inputs
    if (cleanValue === "" || cleanValue === "0") {
      setNewPayment((p) => ({ ...p, payment_amount: 0 }));
      setPaymentAmountDisplay("");
      return;
    }

    // Allow incomplete decimal inputs (like ".", ".0", "100.", etc.)
    if (
      cleanValue === "." ||
      cleanValue.endsWith(".") ||
      /^\d+\.$/.test(cleanValue) ||
      /^\d+\.\d*$/.test(cleanValue)
    ) {
      setPaymentAmountDisplay(value); // Keep the raw input as-is
      // Try to parse the numeric part for validation
      const numericPart = cleanValue.replace(/\.$/, ""); // Remove trailing dot
      const numericValue = parseFloat(numericPart);
      if (!isNaN(numericValue) && numericValue >= 0) {
        setNewPayment((p) => ({ ...p, payment_amount: numericValue }));
      }
      return;
    }

    // Only allow numbers and decimal point
    const numericValue = parseFloat(cleanValue);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setNewPayment((p) => ({ ...p, payment_amount: numericValue }));
      // Format with commas as user types
      setPaymentAmountDisplay(formatNumberWithCommas(numericValue));
    }
  };

  const handlePaymentAmountBlur = () => {
    // Format the number when user finishes typing (on blur)
    if (newPayment.payment_amount > 0) {
      setPaymentAmountDisplay(
        formatNumberWithCommas(newPayment.payment_amount)
      );
    } else {
      setPaymentAmountDisplay("");
    }
  };

  const handlePaymentAmountKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
    if (
      [8, 9, 27, 13, 46, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true)
    ) {
      return;
    }
    // Allow decimal point (dot)
    if (e.keyCode === 190 || e.keyCode === 110) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if (
      (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
      (e.keyCode < 96 || e.keyCode > 105)
    ) {
      e.preventDefault();
    }
  };

  // Validation functions
  const validatePaymentAmount = (
    amount: number
  ): { isValid: boolean; message?: string } => {
    if (amount <= 0) {
      return {
        isValid: false,
        message: "Payment amount must be greater than zero",
      };
    }

    const paidAmount = calculatePaidAmount();
    const remainingBalance = event.total_budget - paidAmount;

    if (remainingBalance <= 0) {
      return {
        isValid: false,
        message:
          "This event is already fully paid. No additional payments needed.",
      };
    }

    if (amount > remainingBalance) {
      return {
        isValid: false,
        message: `Payment amount (₱${formatCurrency(amount)}) exceeds remaining balance (₱${formatCurrency(remainingBalance)}). Maximum allowed: ₱${formatCurrency(remainingBalance)}`,
      };
    }

    return { isValid: true };
  };

  const isEventFullyPaid = (): boolean => {
    const paidAmount = calculatePaidAmount();
    return paidAmount >= event.total_budget;
  };

  const getRemainingBalance = (): number => {
    const paidAmount = calculatePaidAmount();
    return Math.max(0, event.total_budget - paidAmount);
  };

  const handleCreatePayment = async () => {
    try {
      setIsCreating(true);

      const paymentAmount = Number(newPayment.payment_amount) || 0;

      // Validate payment amount
      const validation = validatePaymentAmount(paymentAmount);
      if (!validation.isValid) {
        toast({
          title: "Payment Validation Error",
          description: validation.message,
          variant: "destructive",
        });
        return;
      }

      // Additional validation: Check if event is fully paid
      if (isEventFullyPaid()) {
        toast({
          title: "Event Fully Paid",
          description:
            "This event is already fully paid. No additional payments can be recorded.",
          variant: "destructive",
        });
        return;
      }

      // Create payment record - simple data only
      const paymentData = {
        operation: "createPayment",
        event_id: event.event_id,
        client_id: event.user_id,
        payment_method: newPayment.payment_method,
        payment_amount: paymentAmount,
        payment_notes: newPayment.payment_notes || "",
        payment_status: newPayment.payment_status,
        payment_date: newPayment.payment_date,
        payment_reference: newPayment.payment_reference || "",
        // Calculate payment percentage for tracking
        total_budget: event.total_budget || 0,
      };

      const response = await axios.post(endpoints.admin, paymentData);

      if (response.data.status !== "success") {
        toast({
          title: "Error",
          description: response.data.message || "Failed to create payment",
          variant: "destructive",
        });
        return;
      }

      // Check if this payment makes the event fully paid
      const newPaidAmount = calculatePaidAmount() + paymentAmount;
      const isNowFullyPaid = newPaidAmount >= event.total_budget;

      toast({
        title: "Success",
        description: isNowFullyPaid
          ? "Payment recorded successfully! Event is now fully paid."
          : "Payment recorded successfully",
      });

      // Reset form & close modal
      setNewPayment({
        payment_type: "custom",
        percentage: 0,
        payment_amount: 0,
        payment_method: "cash",
        payment_date: new Date().toISOString().slice(0, 10),
        payment_status: "completed",
        next_due_date: "",
        payment_reference: "",
        payment_notes: "",
      });
      setPaymentAmountDisplay("");
      setIsPaymentModalOpen(false);

      // Refresh payment history
      await fetchPaymentHistory();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to create payment",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
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

  const getTodayString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getDerivedEventStatus = (evt: Event) => {
    if (evt.event_status === "cancelled") return "cancelled";
    const today = getTodayString();
    if (evt.event_date === today) return "on_going";
    if (evt.event_date < today) return "done";
    // Check if event is confirmed
    if (evt.event_status === "confirmed") return "confirmed";
    // Otherwise, map to non-confirmed statuses; treat stray 'confirmed' as planning
    const status = (evt.event_status || "").toLowerCase().trim();
    if (["draft", "pending", "planning"].includes(status)) return status;
    if (["on_going", "done", "cancelled"].includes(status)) return status;
    return "draft";
  };

  const getHeaderBackground = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-50 border-green-200";
      case "draft":
      case "pending":
      case "planning":
        return "bg-yellow-50 border-yellow-200";
      case "on_going":
        return "bg-blue-50 border-blue-200";
      case "done":
        return "bg-purple-50 border-purple-200";
      case "cancelled":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  // File upload functions removed - simplified payment process

  // Helper function to calculate paid amount with fallback
  const calculatePaidAmount = () => {
    if (paymentHistory && paymentHistory.length > 0) {
      const paid = paymentHistory.reduce((sum, p) => {
        const isPaid =
          p.payment_status === "completed" ||
          p.payment_status === "paid" ||
          p.payment_status === "confirmed" ||
          p.payment_status === "processed" ||
          p.payment_status === "successful";
        return isPaid ? sum + p.payment_amount : sum;
      }, 0);
      console.log("Using payment history - paid amount:", paid);
      return paid;
    }

    // Fallback: try to get from event data
    if (event.payments && Array.isArray(event.payments)) {
      const paid = event.payments.reduce((sum, p) => {
        const isPaid =
          p.payment_status === "completed" ||
          p.payment_status === "paid" ||
          p.payment_status === "confirmed" ||
          p.payment_status === "processed" ||
          p.payment_status === "successful";
        return isPaid ? sum + p.payment_amount : sum;
      }, 0);
      console.log("Using event payments - paid amount:", paid);
      return paid;
    }

    console.log("No payment data available");
    return 0;
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
      {/* Header actions */}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setIsPaymentModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Make Payment
        </Button>
      </div>

      {/* Make Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-2xl lg:max-w-xl h-[90vh] flex flex-col p-0">
          {/* Header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-xl">Record Payment</DialogTitle>
              <DialogDescription className="text-sm">
                Record a new payment for this event. You can make partial
                payments, full payment, or any custom amount.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Payment Summary - Fixed at top of content */}
          <div
            className={`flex-shrink-0 bg-white border-b border-gray-200 p-6 ${
              isEventFullyPaid()
                ? "bg-gradient-to-r from-green-50 to-emerald-50"
                : "bg-gradient-to-r from-blue-50 to-indigo-50"
            }`}
          >
            <h4
              className={`font-semibold mb-4 flex items-center gap-2 ${
                isEventFullyPaid() ? "text-green-900" : "text-blue-900"
              }`}
            >
              <Wallet className="h-5 w-5" />
              Payment Summary
              {isEventFullyPaid() && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
                  ✓ Fully Paid
                </span>
              )}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-blue-700 font-medium mb-1">
                  Total Budget
                </div>
                <div className="font-bold text-lg text-blue-900">
                  ₱{formatCurrency(event.total_budget)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-green-700 font-medium mb-1">
                  Amount Paid
                </div>
                <div className="font-bold text-lg text-green-600">
                  ₱
                  {(() => {
                    const paidAmount = calculatePaidAmount();
                    console.log(
                      "Payment modal - final paid amount:",
                      paidAmount
                    );
                    return formatCurrency(paidAmount);
                  })()}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-orange-700 font-medium mb-1">
                  Balance Due
                </div>
                <div className="font-bold text-lg text-orange-600">
                  ₱{formatCurrency(event.total_budget - calculatePaidAmount())}
                </div>
              </div>
            </div>
            {(() => {
              const paid = calculatePaidAmount();
              const pct =
                event.total_budget > 0 ? (paid / event.total_budget) * 100 : 0;

              console.log("Payment modal progress calculation:");
              console.log("- Paid amount:", paid);
              console.log("- Total budget:", event.total_budget);
              console.log("- Percentage:", pct);
              console.log("- Payment history:", paymentHistory);

              return (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-blue-700 text-sm font-medium">
                      Payment Progress
                    </div>
                    <div className="text-sm font-bold text-blue-900">
                      {pct.toFixed(1)}% Complete
                    </div>
                  </div>
                  <div className="w-full h-3 rounded-full bg-blue-100 overflow-hidden">
                    <div
                      className="h-3 bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(pct, 100).toFixed(1)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>₱{formatCurrency(paid)} paid</span>
                    <span>
                      ₱{formatCurrency(event.total_budget - paid)} remaining
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Scrollable Content Area */}
          <div
            className="flex-1 overflow-y-auto px-6 py-4 min-h-0 flex-shrink"
            style={{ scrollbarGutter: "stable both-edges" }}
          >
            <div className="grid grid-cols-1 gap-6">
              <div>
                {/* Fully Paid Warning */}
                {isEventFullyPaid() && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Event Fully Paid</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      This event has been fully paid. No additional payments can
                      be recorded.
                    </p>
                  </div>
                )}

                {/* Enhanced Payment Type Selection */}
                <div className="mb-6">
                  <div className="text-sm font-medium text-gray-700 mb-3">
                    Quick Payment Options
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button
                      type="button"
                      variant={
                        newPayment.payment_type === "custom"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setNewPayment((p) => ({ ...p, payment_type: "custom" }))
                      }
                      className="h-12"
                      disabled={isEventFullyPaid()}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">Custom Amount</div>
                        <div className="text-xs opacity-75">
                          Enter any amount
                        </div>
                      </div>
                    </Button>
                    <Button
                      type="button"
                      variant={
                        newPayment.payment_type === "percentage"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setNewPayment((p) => ({
                          ...p,
                          payment_type: "percentage",
                        }))
                      }
                      className="h-12"
                      disabled={isEventFullyPaid()}
                    >
                      <Percent className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">Percentage</div>
                        <div className="text-xs opacity-75">Pay by %</div>
                      </div>
                    </Button>
                    <Button
                      type="button"
                      variant={
                        newPayment.payment_type === "full"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        const remainingBalance = Math.max(
                          0,
                          event.total_budget -
                            (paymentHistory?.reduce(
                              (s, pay) =>
                                pay.payment_status === "completed"
                                  ? s + pay.payment_amount
                                  : s,
                              0
                            ) || 0)
                        );
                        setNewPayment((p) => ({
                          ...p,
                          payment_type: "full",
                          percentage: 100,
                          payment_amount: remainingBalance,
                        }));
                        setPaymentAmountDisplay(
                          formatNumberWithCommas(remainingBalance)
                        );
                      }}
                      className="h-12"
                      disabled={isEventFullyPaid()}
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">Full Balance</div>
                        <div className="text-xs opacity-75">Pay remaining</div>
                      </div>
                    </Button>
                  </div>
                </div>

                {newPayment.payment_type === "percentage" && (
                  <div className="mb-4">
                    <label className="block text-sm text-gray-700 mb-1">
                      Percentage
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={
                        newPayment.percentage === 0 ? "" : newPayment.percentage
                      }
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value) || 0;
                        const calculatedAmount =
                          ((event.total_budget || 0) * percentage) / 100;
                        setNewPayment((p) => ({
                          ...p,
                          percentage: percentage,
                          payment_amount: calculatedAmount,
                        }));
                        setPaymentAmountDisplay(
                          formatNumberWithCommas(calculatedAmount)
                        );
                      }}
                      placeholder="e.g., 25"
                      className="w-28 px-3 py-2 border rounded-md"
                    />
                  </div>
                )}
                {/* Payment Details Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Amount *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          ₱
                        </span>
                        <input
                          ref={paymentInputRef}
                          type="text"
                          value={paymentAmountDisplay}
                          onChange={(e) =>
                            handlePaymentAmountChange(e.target.value)
                          }
                          onBlur={handlePaymentAmountBlur}
                          onKeyDown={handlePaymentAmountKeyDown}
                          className={`w-full pl-8 pr-3 py-2 border rounded-md focus:ring-2 focus:border-blue-500 ${
                            isEventFullyPaid()
                              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                              : newPayment.payment_amount >
                                  getRemainingBalance()
                                ? "border-red-300 bg-red-50 focus:ring-red-500"
                                : "border-gray-300 focus:ring-blue-500"
                          }`}
                          placeholder={
                            isEventFullyPaid() ? "Event fully paid" : "0.00"
                          }
                          disabled={
                            newPayment.payment_type === "full" ||
                            isEventFullyPaid()
                          }
                        />
                      </div>
                      {/* Validation Message */}
                      {newPayment.payment_amount > 0 && (
                        <div className="mt-2">
                          {newPayment.payment_amount > getRemainingBalance() ? (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              Amount exceeds remaining balance (₱
                              {formatCurrency(getRemainingBalance())})
                            </p>
                          ) : isEventFullyPaid() ? (
                            <p className="text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Event is fully paid
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600">
                              Remaining balance: ₱
                              {formatCurrency(getRemainingBalance())}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method *
                      </label>
                      <select
                        value={newPayment.payment_method}
                        onChange={(e) =>
                          setNewPayment((p) => ({
                            ...p,
                            payment_method: e.target.value as any,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 capitalize"
                      >
                        <option value="cash">Cash</option>
                        <option value="gcash">GCash</option>
                        <option value="bank-transfer">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        value={newPayment.payment_date}
                        onChange={(e) =>
                          setNewPayment((p) => ({
                            ...p,
                            payment_date: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status *
                      </label>
                      <select
                        value={newPayment.payment_status}
                        onChange={(e) =>
                          setNewPayment((p) => ({
                            ...p,
                            payment_status: e.target.value as any,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 capitalize"
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Number
                      <span className="text-gray-500 font-normal">
                        {" "}
                        (for GCash/Bank Transfer)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={newPayment.payment_reference}
                      onChange={(e) =>
                        setNewPayment((p) => ({
                          ...p,
                          payment_reference: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter transaction reference number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                      <span className="text-gray-500 font-normal">
                        {" "}
                        (Optional)
                      </span>
                    </label>
                    <textarea
                      value={newPayment.payment_notes}
                      onChange={(e) =>
                        setNewPayment((p) => ({
                          ...p,
                          payment_notes: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-24 resize-vertical"
                      rows={3}
                      placeholder="Additional payment notes or comments..."
                    />
                  </div>
                </div>
                {/* File attachments removed - simplified payment process */}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 p-6 pt-4 shadow-lg">
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setIsPaymentModalOpen(false)}
                variant="outline"
                disabled={isCreating}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePayment}
                disabled={
                  isCreating ||
                  newPayment.payment_amount <= 0 ||
                  isEventFullyPaid() ||
                  newPayment.payment_amount > getRemainingBalance()
                }
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 min-w-[140px] disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Record Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">Payment Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <div className="text-blue-700">Total Budget</div>
            <div className="font-semibold text-blue-900">
              ₱{formatCurrency(Number(event.total_budget || 0))}
            </div>
          </div>
          <div>
            <div className="text-blue-700">Down Payment</div>
            <div className="font-semibold text-blue-900">
              ₱{formatCurrency(Number(event.down_payment || 0))}
            </div>
          </div>
          <div>
            <div className="text-blue-700">Total Paid</div>
            <div className="font-semibold text-blue-900">
              ₱
              {formatCurrency(
                Number(
                  (() => {
                    const paid =
                      paymentHistory?.reduce((sum, p) => {
                        console.log("Main summary - Payment item:", p);
                        console.log(
                          "Main summary - Payment status:",
                          p.payment_status
                        );
                        console.log(
                          "Main summary - Payment amount:",
                          p.payment_amount
                        );
                        const isPaid =
                          p.payment_status === "completed" ||
                          p.payment_status === "paid" ||
                          p.payment_status === "confirmed" ||
                          p.payment_status === "processed" ||
                          p.payment_status === "successful";
                        console.log("Main summary - Is paid:", isPaid);
                        return isPaid ? sum + p.payment_amount : sum;
                      }, 0) || 0;
                    console.log("Main summary - Total paid amount:", paid);
                    console.log(
                      "Main summary - Payment history:",
                      paymentHistory
                    );
                    return paid;
                  })()
                )
              )}
            </div>
          </div>
          <div>
            <div className="text-blue-700">Remaining Balance</div>
            <div className="font-semibold text-blue-900">
              ₱
              {formatCurrency(
                Number(
                  event.total_budget -
                    (() => {
                      const paid =
                        paymentHistory?.reduce((sum, p) => {
                          const isPaid =
                            p.payment_status === "completed" ||
                            p.payment_status === "paid" ||
                            p.payment_status === "confirmed" ||
                            p.payment_status === "processed" ||
                            p.payment_status === "successful";
                          return isPaid ? sum + p.payment_amount : sum;
                        }, 0) || 0;
                      console.log(
                        "Remaining balance calculation - Paid amount:",
                        paid
                      );
                      return paid;
                    })()
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {paymentHistory && paymentHistory.length > 0 ? (
        <div className="space-y-4">
          {paymentHistory.map((payment: any, index: number) => (
            <div
              key={
                payment?.payment_id && payment.payment_id !== 0
                  ? `payment-${payment.payment_id}`
                  : `temp-${index}-${payment?.payment_reference || payment?.payment_date || "placeholder"}`
              }
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all duration-200 hover:border-blue-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                    {payment.payment_method === "cash" ? (
                      <Banknote className="h-6 w-6 text-blue-600" />
                    ) : payment.payment_method === "gcash" ? (
                      <CreditCard className="h-6 w-6 text-green-600" />
                    ) : (
                      <Building className="h-6 w-6 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-lg text-gray-900">
                      ₱{formatCurrency(Number(payment.payment_amount || 0))}
                    </h5>
                    <p className="text-sm text-gray-600 capitalize font-medium flex items-center gap-1">
                      {payment.payment_method === "cash" ? (
                        <>
                          <Banknote className="h-4 w-4" />
                          Cash
                        </>
                      ) : payment.payment_method === "gcash" ? (
                        <>
                          <CreditCard className="h-4 w-4" />
                          GCash
                        </>
                      ) : payment.payment_method === "bank-transfer" ? (
                        <>
                          <Building className="h-4 w-4" />
                          Bank Transfer
                        </>
                      ) : (
                        payment.payment_method || "N/A"
                      )}
                      {payment.installment_number &&
                        ` • Installment ${payment.installment_number}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(payment.payment_date).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getPaymentStatusColor(payment.payment_status)}`}
                  >
                    {payment.payment_status === "completed" ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </>
                    ) : payment.payment_status === "pending" ? (
                      <>
                        <Clock className="h-3 w-3" />
                        Pending
                      </>
                    ) : payment.payment_status === "paid" ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Paid
                      </>
                    ) : (
                      payment.payment_status
                    )}
                  </span>
                </div>
              </div>

              {payment.payment_reference && (
                <div className="bg-gray-50 rounded-lg px-4 py-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Reference Number:
                    </span>
                    <span className="text-sm font-mono bg-white px-2 py-1 rounded border text-gray-800">
                      {payment.payment_reference}
                    </span>
                  </div>
                </div>
              )}

              {payment.payment_notes && (
                <div className="bg-blue-50 rounded-lg px-4 py-3 mb-3">
                  <div className="text-sm text-blue-800">
                    <span className="font-medium">Notes:</span>{" "}
                    {payment.payment_notes}
                  </div>
                </div>
              )}

              {/* Attachments removed per simplified payments */}
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

  // Type guard for admin organizer
  const isAdminOrganizer = (id: number | "" | "admin"): id is "admin" => {
    return id === "admin";
  };

  // Authentication check
  useEffect(() => {
    try {
      protectRoute();
      const userData = secureStorage.getItem("user");
      if (
        !userData ||
        !userData.user_role ||
        userData.user_role.toLowerCase() !== "staff"
      ) {
        router.push("/auth/login");
        return;
      }
      // If authenticated, fetch event details
      if (eventId) {
        fetchEventDetails();
      }
    } catch (error) {
      router.push("/auth/login");
    }
  }, [router, eventId]);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [organizerMeta, setOrganizerMeta] = useState<{
    pending: string[];
    accepted: string[];
    rejected: string[];
    externalOrganizer?: string | null;
  } | null>(null);
  const [showOrganizerStatusMenu, setShowOrganizerStatusMenu] = useState(false);
  const [showVenueStatusMenu, setShowVenueStatusMenu] = useState(false);
  const [venuePaymentSupported, setVenuePaymentSupported] = useState(true);
  const [organizerNames, setOrganizerNames] = useState<Record<string, string>>(
    {}
  );
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [isOrganizerEditing, setIsOrganizerEditing] = useState(false);
  const [showAssignOrganizer, setShowAssignOrganizer] = useState(false);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [organizersLoading, setOrganizersLoading] = useState(false);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<
    number | "" | "admin"
  >(event?.organizer_id || "");
  const [agreedFee, setAgreedFee] = useState<number | "">("");
  const [assignMode, setAssignMode] = useState<"pick" | "custom">("pick");
  const [customOrganizer, setCustomOrganizer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
  });
  const [organizerDetails, setOrganizerDetails] = useState<any | null>(null);
  const [weddingDetails, setWeddingDetails] = useState<any | null>(null);
  const [weddingLoading, setWeddingLoading] = useState(false);
  const [isEditingWedding, setIsEditingWedding] = useState(false);
  const [editingWeddingData, setEditingWeddingData] = useState<any | null>(
    null
  );
  const [weddingSaving, setWeddingSaving] = useState(false);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  const getTodayStringLocal = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getDerivedEventStatusLocal = (evt: Event) => {
    if (evt.event_status === "cancelled") return "cancelled";
    const today = getTodayStringLocal();
    if (evt.event_date === today) return "on_going";
    if (evt.event_date < today) return "done";
    // Check if event is confirmed
    if (evt.event_status === "confirmed") return "confirmed";
    // Show as Planning for non-confirmed events
    return "planning";
  };

  const getHeaderBackgroundLocal = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-50 border-green-200";
      case "draft":
      case "pending":
      case "planning":
        return "bg-yellow-50 border-yellow-200";
      case "on_going":
        return "bg-blue-50 border-blue-200";
      case "done":
        return "bg-purple-50 border-purple-200";
      case "cancelled":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  useEffect(() => {
    protectRoute();
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const openAssignOrganizer = async () => {
    setShowAssignOrganizer(true);

    // Reset selected organizer to current event's organizer
    if (event?.organizer_id) {
      setSelectedOrganizerId(event.organizer_id);
    } else if (organizerDetails?.organizer_organizer_id) {
      setSelectedOrganizerId(organizerDetails.organizer_organizer_id);
    } else {
      setSelectedOrganizerId("");
    }

    // Always fetch fresh data when opening the modal
    try {
      setOrganizersLoading(true);

      // Fetch admin information first
      let adminInfo = null;
      if (event?.admin_id) {
        try {
          const adminResponse = await fetch(
            `${endpoints.admin}?operation=getUserProfile&user_id=${event.admin_id}`
          );
          const adminData = await adminResponse.json();
          if (adminData.status === "success") {
            adminInfo = {
              ...adminData.profile,
              organizer_id: "admin", // Special ID for admin
              first_name: adminData.profile.user_firstName,
              last_name: adminData.profile.user_lastName,
              email: adminData.profile.user_email,
              contact_number: adminData.profile.user_contact,
              profile_picture: adminData.profile.user_pfp,
              is_admin: true,
              talent_fee_min: null,
              talent_fee_max: null,
            };
          }
        } catch (adminError) {
          console.warn("Failed to fetch admin info:", adminError);
        }
      }

      // Use the same approach as the organizers page
      console.log("Fetching organizers from API...");
      const queryParams = new URLSearchParams({
        page: "1",
        limit: "100",
      });

      const response = await fetch(
        `${endpoints.admin}?operation=getAllOrganizers&${queryParams}`
      );
      const data = await response.json();

      console.log("API Response (getAllOrganizers):", data);

      if (data.status === "success") {
        // Sort organizers by name for better usability
        const organizersList = data.data?.organizers || [];
        console.log("📋 Raw organizers from API:", organizersList);

        organizersList.sort((a: any, b: any) => {
          const nameA = `${a.first_name || ""} ${a.last_name || ""}`.trim();
          const nameB = `${b.first_name || ""} ${b.last_name || ""}`.trim();
          return nameA.localeCompare(nameB);
        });

        // Add admin as the first option if available
        const finalOrganizersList = adminInfo
          ? [adminInfo, ...organizersList]
          : organizersList;

        setOrganizers(finalOrganizersList);
        console.log("✅ Loaded organizers:", finalOrganizersList.length);

        // Pre-select the current organizer if it exists in the list
        if (event?.organizer_id) {
          const currentOrganizer = finalOrganizersList.find(
            (org: any) => org.organizer_id === event.organizer_id
          );
          if (currentOrganizer) {
            setSelectedOrganizerId(currentOrganizer.organizer_id);
            console.log(
              "✓ Current organizer pre-selected:",
              currentOrganizer.organizer_id
            );
          }
        } else if (!event?.organizer_id && adminInfo) {
          // If no organizer is assigned, pre-select admin as default
          setSelectedOrganizerId("admin");
          console.log("✓ Admin pre-selected as default organizer");
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to load organizers",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading organizers:", error);
      toast({
        title: "Error",
        description: "Failed to load organizers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOrganizersLoading(false);
    }
  };

  const fetchOrganizerDetailsForEvent = async (id: number) => {
    try {
      // Using the adminApi wrapper for consistent error handling
      const res = await adminApi.post({
        operation: "getEventOrganizerDetails",
        event_id: id,
      });
      if (res && res.status === "success") {
        setOrganizerDetails(res.data);
      } else {
        setOrganizerDetails(null);
      }
    } catch (error) {
      console.error("Error fetching organizer details:", error);
      setOrganizerDetails(null);
    }
  };

  useEffect(() => {
    if (event?.event_id && event?.organizer_id) {
      fetchOrganizerDetailsForEvent(event.event_id);
    } else {
      setOrganizerDetails(null);
    }
  }, [event?.event_id, event?.organizer_id]);

  const assignOrganizer = async () => {
    if (!event) {
      console.error("No event available for organizer assignment");
      toast({
        title: "Error",
        description: "No event data available",
        variant: "destructive",
      });
      return;
    }

    // Handle admin assignment (special case)
    if (isAdminOrganizer(selectedOrganizerId)) {
      try {
        setOrganizersLoading(true);

        // For admin assignment, we'll set organizer_id to null in the event
        // This indicates that the admin is handling the event directly
        const payload = {
          operation: "updateEventOrganizer",
          event_id: event.event_id,
          organizer_id: null, // Set to null to indicate admin is handling
        };

        console.log("Assigning admin as organizer with payload:", payload);

        const response = await adminApi.post(payload);

        if (
          response &&
          (response.status === "success" || Object.keys(response).length === 0)
        ) {
          toast({
            title: "Admin Assigned",
            description: "Admin will handle this event directly.",
          });

          setShowAssignOrganizer(false);
          setOrganizerDetails(null); // Clear organizer details when admin is assigned
          await fetchEventDetails();
          return;
        } else {
          throw new Error(response?.message || "Failed to assign admin");
        }
      } catch (error: any) {
        console.error("Error assigning admin:", error);
        toast({
          title: "Error",
          description: "Failed to assign admin. Please try again.",
          variant: "destructive",
        });
      } finally {
        setOrganizersLoading(false);
      }
      return;
    }

    // Skip validation for admin case since it's handled above
    if (isAdminOrganizer(selectedOrganizerId)) {
      return; // This should not happen as admin case is handled above
    }

    const orgId = Number(selectedOrganizerId);

    if (!orgId || isNaN(orgId) || orgId <= 0) {
      console.error("Invalid organizer ID:", selectedOrganizerId);
      toast({
        title: "Validation Error",
        description: "Please select a valid organizer",
        variant: "destructive",
      });
      return;
    }

    // Validate event ID
    if (!event.event_id || isNaN(event.event_id) || event.event_id <= 0) {
      console.error("Invalid event ID:", event.event_id);
      toast({
        title: "Error",
        description: "Invalid event data",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use a loading state for better UX
      setOrganizersLoading(true);

      // Get the note value from the textarea using ref
      const notes =
        notesTextareaRef.current?.value ||
        `Assigned from event details page (${event.event_title})`;

      // Validate admin ID
      const adminId = event.admin_id || 7;
      if (!adminId || isNaN(adminId) || adminId <= 0) {
        console.warn("Invalid admin ID, using default:", adminId);
      }

      // Use the existing working API endpoint for organizer assignment
      const payload = {
        operation: "assignOrganizerToEvent",
        event_id: event.event_id,
        organizer_id: orgId,
        assigned_by: adminId,
        notes: notes,
      };

      console.log("Assigning organizer with payload:", payload);
      console.log("Payload validation:", {
        event_id_valid: !isNaN(payload.event_id) && payload.event_id > 0,
        organizer_id_valid:
          !isNaN(payload.organizer_id) && payload.organizer_id > 0,
        assigned_by_valid:
          !isNaN(payload.assigned_by) && payload.assigned_by > 0,
        notes_valid:
          typeof payload.notes === "string" && payload.notes.length > 0,
      });

      const response = await adminApi.post(payload);

      // Enhanced debugging to understand the response structure
      console.log("Full API response:", response);
      console.log("Response status:", response.status);
      console.log("Response type:", typeof response);
      console.log("Response keys:", Object.keys(response || {}));
      console.log("Response message:", response.message);
      console.log("Response data:", response.data);
      console.log("Response JSON string:", JSON.stringify(response));

      // Handle empty response object - this usually means the assignment was successful
      // but the response wasn't parsed correctly
      if (
        !response ||
        Object.keys(response).length === 0 ||
        JSON.stringify(response) === "{}" ||
        (response &&
          typeof response === "object" &&
          Object.keys(response).length === 0)
      ) {
        console.log(
          "✅ Empty response object - treating as success (common with PHP APIs)"
        );

        // Get selected organizer details for success message
        const selectedOrganizer = organizers.find(
          (o) => o.organizer_id === orgId
        );
        const organizerName = selectedOrganizer
          ? `${selectedOrganizer.first_name || ""} ${selectedOrganizer.last_name || ""}`.trim()
          : `Organizer #${orgId}`;

        toast({
          title: "Organizer Assigned",
          description: `${organizerName} has been assigned to this event.`,
        });

        setShowAssignOrganizer(false);
        await fetchEventDetails();
        return;
      }

      // Check for success in multiple possible response formats
      const isSuccess =
        response.status === "success" ||
        response.status === "SUCCESS" ||
        (response.data && response.data.status === "success") ||
        (response.message &&
          response.message.toLowerCase().includes("success")) ||
        (response.data &&
          response.data.message &&
          response.data.message.toLowerCase().includes("success"));

      if (isSuccess) {
        console.log("✅ Organizer assignment successful");

        // Get selected organizer details for better success message
        const selectedOrganizer = organizers.find(
          (o) => o.organizer_id === orgId
        );
        const organizerName = selectedOrganizer
          ? `${selectedOrganizer.first_name || ""} ${selectedOrganizer.last_name || ""}`.trim()
          : `Organizer #${orgId}`;

        toast({
          title: "Organizer Assigned",
          description: `${organizerName} has been assigned to this event.`,
        });

        // Create client notification for organizer assignment
        try {
          if (event && event.user_id) {
            await notificationsApi.post({
              operation: "create_notification",
              user_id: event.user_id,
              type: "organizer_assigned",
              title: "Organizer Assigned",
              message: `An organizer has been assigned to your event "${event.event_title}".`,
              priority: "medium",
              icon: "user",
              url: `/client/events/${event.event_id}`,
              event_id: event.event_id,
              expires_hours: 168, // 1 week
            });
          }
        } catch (notifyError) {
          // Non-blocking: Ignore notification errors
          console.warn("Failed to send notification:", notifyError);
        }

        setShowAssignOrganizer(false);

        // Refresh event data to show the updated assignment
        await fetchEventDetails();
      } else {
        console.error("❌ Error assigning organizer - Response:", response);
        console.error("Response status:", response.status);
        console.error("Response message:", response.message);

        const errorMessage =
          response.message ||
          response.error ||
          response.data?.message ||
          response.data?.error ||
          "Failed to assign organizer";

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      // Enhanced error logging to capture more details
      console.error("Error assigning organizer:", error);
      console.error("Error type:", typeof error);
      console.error("Error keys:", Object.keys(error || {}));
      console.error("Error string:", JSON.stringify(error, null, 2));

      let errorMessage = "Failed to assign organizer. Please try again.";

      // Check if it's an API response error (from our apiPost wrapper)
      if (error && typeof error === "object" && error.status === "error") {
        errorMessage = error.error || error.message || errorMessage;
        console.error("API wrapper error:", error);
      }
      // Check for axios error with response data
      else if (error && error.response && error.response.data) {
        console.error("Axios error response:", error.response.data);
        errorMessage = error.response.data.message || errorMessage;
      }
      // Check for direct error message
      else if (error && error.message) {
        errorMessage = error.message;
      }
      // Check for string error
      else if (typeof error === "string") {
        errorMessage = error;
      }
      // Handle empty or undefined error
      else if (
        !error ||
        (typeof error === "object" && Object.keys(error).length === 0)
      ) {
        errorMessage =
          "An unknown error occurred while assigning the organizer.";
        console.error("Empty or undefined error object");
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setOrganizersLoading(false);
    }
  };

  useEffect(() => {
    if (!event) return;
    try {
      const attachmentsArray: any[] = Array.isArray(event.attachments)
        ? event.attachments
        : Array.isArray((event as any).event_attachments)
          ? (event as any).event_attachments
          : [];
      const invites = attachmentsArray.find(
        (a: any) => a.attachment_type === "organizer_invites"
      );
      if (invites && invites.description) {
        try {
          const parsed = JSON.parse(invites.description);
          setOrganizerMeta({
            pending: Array.isArray(parsed.pending) ? parsed.pending : [],
            accepted: Array.isArray(parsed.accepted) ? parsed.accepted : [],
            rejected: Array.isArray(parsed.rejected) ? parsed.rejected : [],
            externalOrganizer: parsed.externalOrganizer || null,
          });
        } catch {
          setOrganizerMeta(null);
        }
      } else {
        setOrganizerMeta(null);
      }
    } catch {
      setOrganizerMeta(null);
    }
  }, [event]);

  useEffect(() => {
    const loadNames = async () => {
      if (!organizerMeta) return;
      const ids = [
        ...(organizerMeta.pending || []),
        ...(organizerMeta.accepted || []),
        ...(organizerMeta.rejected || []),
      ].filter(Boolean);
      const toFetch = ids.filter(
        (id) => organizerNames[String(id)] === undefined
      );
      if (toFetch.length === 0) return;
      const updates: Record<string, string> = {};
      await Promise.all(
        toFetch.map(async (id) => {
          try {
            const res = await axios.post(endpoints.admin, {
              operation: "getOrganizerById",
              organizer_id: Number(id),
            });
            if (
              res.data &&
              res.data.status === "success" &&
              res.data.organizer
            ) {
              const o = res.data.organizer;
              const name =
                [
                  o.user_firstName || o.first_name,
                  o.user_lastName || o.last_name,
                ]
                  .filter(Boolean)
                  .join(" ") || `Organizer #${id}`;
              updates[String(id)] = name;
            } else {
              updates[String(id)] = `Organizer #${id}`;
            }
          } catch {
            updates[String(id)] = `Organizer #${id}`;
          }
        })
      );
      if (Object.keys(updates).length) {
        setOrganizerNames((prev) => ({ ...prev, ...updates }));
      }
    };
    loadNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizerMeta]);

  const fetchAdminProfile = async (adminId: number) => {
    try {
      const response = await fetch(
        `${endpoints.admin}?operation=getUserProfile&user_id=${adminId}`
      );
      const data = await response.json();
      if (data.status === "success") {
        return data.profile.user_pfp;
      }
    } catch (error) {
      console.warn("Failed to fetch admin profile:", error);
    }
    return null;
  };

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      console.log("🔍 Fetching event details for ID:", eventId);

      const response = await axios.post(endpoints.admin, {
        operation: "getEventById",
        event_id: parseInt(eventId),
      });

      console.log("📡 Admin API Response:", response.data);

      if (response.data?.status === "success") {
        let eventData = response.data.event;

        // Fetch admin profile picture if admin_id exists
        if (eventData.admin_id) {
          const adminPfp = await fetchAdminProfile(eventData.admin_id);
          eventData.admin_pfp = adminPfp;
        }

        setEvent(eventData);
        console.log("✅ Event data loaded:", eventData);

        // Debug profile picture
        console.log("🖼️ Profile Picture Debug:", {
          client_pfp: eventData.client_pfp,
          admin_pfp: eventData.admin_pfp,
          has_pfp: !!eventData.client_pfp,
          pfp_type: typeof eventData.client_pfp,
        });

        // Debug attachments
        console.log("📎 Attachments Debug:", {
          event_attachments: eventData.event_attachments,
          attachments: eventData.attachments,
          has_attachments: !!eventData.attachments,
          attachments_length: eventData.attachments?.length || 0,
        });
      } else {
        const errorMessage =
          response.data?.message || "Failed to fetch event details";
        console.error("❌ Admin API Error:", errorMessage);
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-700 border-green-300";
      case "draft":
      case "pending":
      case "planning":
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
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-300";
      case "refunded":
        return "bg-purple-100 text-purple-700 border-purple-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const organizerVenuePaymentStatuses: Array<
    "unpaid" | "partial" | "paid" | "cancelled"
  > = ["unpaid", "partial", "paid", "cancelled"];

  const updateOrganizerPayment = async (
    assignmentId: number,
    status: "unpaid" | "partial" | "paid" | "cancelled"
  ) => {
    if (!assignmentId) {
      toast({
        title: "Organizer not assigned",
        description: "Assign an organizer before updating payment status.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await adminApi.post({
        operation: "updateOrganizerPaymentStatus",
        assignment_id: assignmentId,
        payment_status: status,
      });
      if (res.status === "success") {
        toast({
          title: "Updated",
          description: "Organizer payment status updated.",
        });
        // Optimistically update local state for snappier UI
        setEvent((prev) =>
          prev ? { ...prev, organizer_payment_status: status } : prev
        );
        // Create client notification for organizer payment update
        try {
          if (event && event.user_id) {
            await notificationsApi.post({
              operation: "create_notification",
              user_id: event.user_id,
              type: "payment_organizer_status",
              title: "Organizer Payment Status Updated",
              message: `Organizer payment status is now ${status}.`,
              priority: "medium",
              icon: "wallet",
              url: `/client/events/${event.event_id}`,
              event_id: event.event_id,
              expires_hours: 168,
            });
          }
        } catch (e) {
          // Non-blocking: ignore notification errors
        }
        await fetchEventDetails();
      } else {
        toast({
          title: "Error",
          description:
            res.data.message || "Failed to update organizer payment status",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to update organizer payment status",
        variant: "destructive",
      });
    }
  };

  const updateVenuePayment = async (
    eventId: number,
    status: "unpaid" | "partial" | "paid" | "cancelled"
  ) => {
    try {
      const res = await adminApi.post({
        operation: "updateVenuePaymentStatus",
        event_id: eventId,
        payment_status: status,
      });
      if (res.status === "success") {
        toast({
          title: "Updated",
          description: "Venue payment status updated.",
        });
        // Optimistically update local state for snappier UI
        setEvent((prev) =>
          prev ? { ...prev, venue_payment_status: status } : prev
        );
        // Create client notification for venue payment update
        try {
          if (event && event.user_id) {
            await notificationsApi.post({
              operation: "create_notification",
              user_id: event.user_id,
              type: "payment_venue_status",
              title: "Venue Payment Status Updated",
              message: `Venue payment status is now ${status}.`,
              priority: "medium",
              icon: "building",
              url: `/client/events/${event.event_id}`,
              event_id: event.event_id,
              expires_hours: 168,
            });
          }
        } catch (e) {
          // Non-blocking: ignore notification errors
        }
        await fetchEventDetails();
      } else {
        toast({
          title: "Error",
          description:
            res.data.message || "Failed to update venue payment status",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      const message =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to update venue payment status";
      if (
        typeof message === "string" &&
        message.includes("Unknown column 'venue_payment_status'")
      ) {
        setVenuePaymentSupported(false);
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const formatEventStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
      case "planning":
        return "Planning";
      case "on_going":
        return "On Going";
      case "confirmed":
        return "Confirmed";
      case "done":
        return "Done";
      case "cancelled":
        return "Cancelled";
      default:
        return "Planning";
    }
  };

  const formatPaymentStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "unpaid":
        return "Unpaid";
      case "partial":
        return "Partial";
      case "paid":
        return "Paid";
      case "refunded":
        return "Refunded";
      default:
        return status;
    }
  };

  // Load wedding details when appropriate
  useEffect(() => {
    console.log(
      "🔍 Event type check:",
      event?.event_type_name,
      "Event type ID:",
      event?.event_type_id
    );
    if (
      event?.event_type_id === 1 ||
      event?.event_type_name?.toLowerCase() === "wedding"
    ) {
      const fetchWedding = async () => {
        try {
          setWeddingLoading(true);
          console.log("🔍 Fetching wedding details for event:", event.event_id);
          console.log("🔍 Event type:", event.event_type_name);

          const res = await axios.get(
            `${endpoints.admin}?operation=getWeddingDetails&event_id=${event.event_id}`
          );

          console.log("📡 Wedding details response:", res.data);

          if (res?.data?.status === "success") {
            setWeddingDetails(res.data.wedding_details || null);
            console.log("✅ Wedding details set:", res.data.wedding_details);
          } else {
            console.log("❌ No wedding details found");
            setWeddingDetails(null);
          }
        } catch (e) {
          console.error("❌ Error fetching wedding details:", e);
          setWeddingDetails(null);
        } finally {
          setWeddingLoading(false);
        }
      };
      fetchWedding();
    } else {
      setWeddingDetails(null);
    }
  }, [event?.event_id, event?.event_type_id]);

  // Wedding form edit functions
  const handleEditWedding = () => {
    setIsEditingWedding(true);
    // Initialize with empty data if no wedding details exist
    const initialData = weddingDetails || {
      nuptial: "",
      motif: "",
      wedding_time: "",
      church: "",
      address: "",
      bride_name: "",
      bride_size: "",
      groom_name: "",
      groom_size: "",
      mother_bride_name: "",
      mother_bride_size: "",
      father_bride_name: "",
      father_bride_size: "",
      mother_groom_name: "",
      mother_groom_size: "",
      father_groom_name: "",
      father_groom_size: "",
      maid_of_honor_name: "",
      maid_of_honor_size: "",
      best_man_name: "",
      best_man_size: "",
      little_bride_name: "",
      little_bride_size: "",
      little_groom_name: "",
      little_groom_size: "",
      bridesmaids_qty: 0,
      bridesmaids_names: [],
      groomsmen_qty: 0,
      groomsmen_names: [],
      junior_groomsmen_qty: 0,
      junior_groomsmen_names: [],
      flower_girls_qty: 0,
      flower_girls_names: [],
      ring_bearer_qty: 0,
      ring_bearer_names: [],
      bible_bearer_qty: 0,
      bible_bearer_names: [],
      coin_bearer_qty: 0,
      coin_bearer_names: [],
      cushions_qty: 0,
      headdress_qty: 0,
      shawls_qty: 0,
      veil_cord_qty: 0,
      basket_qty: 0,
      petticoat_qty: 0,
      neck_bowtie_qty: 0,
      garter_leg_qty: 0,
      fitting_form_qty: 0,
      robe_qty: 0,
      prepared_by: "",
      received_by: "",
      pickup_date: "",
      return_date: "",
      customer_signature: "",
    };
    setEditingWeddingData(initialData);
  };

  const handleCancelEditWedding = () => {
    setIsEditingWedding(false);
    setEditingWeddingData(null);
  };

  const handleSaveWedding = async () => {
    if (!editingWeddingData || !event?.event_id) return;

    setWeddingSaving(true);
    try {
      const response = await axios.post(endpoints.admin, {
        operation: "saveWeddingDetails",
        event_id: event.event_id,
        ...editingWeddingData,
      });

      if (response.data.status === "success") {
        setWeddingDetails(editingWeddingData);
        setIsEditingWedding(false);
        setEditingWeddingData(null);
        toast({
          title: "Success",
          description: weddingDetails
            ? "Wedding details updated successfully"
            : "Wedding details created successfully",
        });
        // Refresh wedding details from server to ensure we have the latest data
        if (event?.event_id) {
          try {
            const refreshResponse = await axios.get(
              `${endpoints.admin}?operation=getWeddingDetails&event_id=${event.event_id}`
            );
            if (refreshResponse.data.status === "success") {
              setWeddingDetails(refreshResponse.data.wedding_details || null);
            }
          } catch (refreshError) {
            console.error("Error refreshing wedding details:", refreshError);
          }
        }
      } else {
        toast({
          title: "Error",
          description:
            response.data.message || "Failed to update wedding details",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving wedding details:", error);
      toast({
        title: "Error",
        description: "Failed to update wedding details",
        variant: "destructive",
      });
    } finally {
      setWeddingSaving(false);
    }
  };

  const updateWeddingField = (field: string, value: any) => {
    setEditingWeddingData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateWeddingPartyMember = (
    partyType: string,
    index: number,
    value: string
  ) => {
    setEditingWeddingData((prev: any) => {
      const newData = { ...prev };
      const names = [...(newData[partyType] || [])];
      names[index] = value;
      newData[partyType] = names;
      return newData;
    });
  };

  const addWeddingPartyMember = (partyType: string) => {
    setEditingWeddingData((prev: any) => {
      const newData = { ...prev };
      const names = [...(newData[partyType] || [])];
      names.push("");
      newData[partyType] = names;
      return newData;
    });
  };

  const removeWeddingPartyMember = (partyType: string, index: number) => {
    setEditingWeddingData((prev: any) => {
      const newData = { ...prev };
      const names = [...(newData[partyType] || [])];
      names.splice(index, 1);
      newData[partyType] = names;
      return newData;
    });
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "attachments", label: "Files", icon: Paperclip },
    // Only show nuptial tab for wedding events
    ...(event?.event_type_name?.toLowerCase() === "wedding"
      ? [{ id: "nuptial", label: "Nupital Form", icon: FileText }]
      : []),
  ];

  console.log("🔍 Tabs for event:", event?.event_type_name, "Tabs:", tabs);

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

  // Derived inclusion/payment aggregates including venue and organizer
  const organizerPaid =
    !!event &&
    (event.organizer_payment_status === "paid" || !event.organizer_id);
  const venuePaid = !!event && event.venue_payment_status === "paid";
  const extraEntitiesCount =
    (event?.organizer_id ? 1 : 0) + (event?.venue_id ? 1 : 0);
  const derivedIncludedCount =
    (event.components || []).filter((c) => c.is_included).length +
    extraEntitiesCount;
  const derivedPaidCount =
    (event.components || []).filter(
      (c) => c.is_included && c.payment_status === "paid"
    ).length +
    (organizerPaid ? 1 : 0) +
    (venuePaid ? 1 : 0);

  // Calculate derived payment status based on budget progress
  const calculateDerivedPaymentStatus = () => {
    // Calculate total paid amount
    const paymentsTotal =
      event.payments?.reduce((sum, payment: any) => {
        if (["completed", "partial", "paid"].includes(payment.payment_status)) {
          return sum + Number(payment.payment_amount || 0);
        }
        return sum;
      }, 0) || 0;

    const downPayment = Number(event.down_payment || 0);
    const downPaymentIncluded =
      event.payments?.some(
        (payment: any) =>
          payment.payment_type === "down_payment" ||
          payment.payment_notes?.toLowerCase().includes("down payment")
      ) || false;

    const totalPaid = paymentsTotal + (downPaymentIncluded ? 0 : downPayment);
    const remaining = event.total_budget - totalPaid;

    // If fully paid (no remaining balance), return "paid"
    if (remaining <= 0 && event.total_budget > 0) {
      return "paid";
    }

    // If partially paid, return "partial"
    if (totalPaid > 0 && remaining > 0) {
      return "partial";
    }

    // If no payments made, return "unpaid"
    return "unpaid";
  };

  const derivedPaymentStatus = calculateDerivedPaymentStatus();
  const derivedInclusionPercentage =
    derivedIncludedCount > 0
      ? Math.round((derivedPaidCount / derivedIncludedCount) * 100)
      : 0;
  const derivedPaidComponents = derivedPaidCount;
  const derivedPaymentPercentage =
    derivedIncludedCount > 0
      ? Math.round((derivedPaidComponents / derivedIncludedCount) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className={`shadow-sm border-b ${getHeaderBackgroundLocal(getDerivedEventStatusLocal(event))}`}
      >
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
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(getDerivedEventStatusLocal(event))}`}
              >
                {formatEventStatusLabel(getDerivedEventStatusLocal(event))}
              </span>
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
            <EventCountdown event={event} />
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
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                      Event Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <div className="space-y-4">
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

                          <div className="flex items-center space-x-3">
                            <Receipt className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-600">
                                Payment Status
                              </div>
                              <div
                                className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(derivedPaymentStatus)}`}
                              >
                                {formatPaymentStatusLabel(derivedPaymentStatus)}
                              </div>
                            </div>
                          </div>

                          {event.event_theme && (
                            <div className="flex items-center space-x-3">
                              <Edit className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-600">
                                  Theme
                                </div>
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
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <MapPin className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-600">
                                  Venue
                                </div>
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
                          {event.venue_title && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-blue-700">
                              <MapPin className="h-4 w-4" />
                              <span>Venue: {event.venue_title}</span>
                              {event.venue_location && (
                                <span className="text-blue-600">
                                  • {event.venue_location}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Package className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  )}

                  {/* Package Inclusions Management */}
                  <PackageInclusionsManagement
                    event={event}
                    onEventUpdate={fetchEventDetails}
                  />

                  {/* Organizer Section */}
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Organizer Assignment
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={isOrganizerEditing ? "outline" : "default"}
                          size="sm"
                          onClick={() => setIsOrganizerEditing((v) => !v)}
                        >
                          {isOrganizerEditing ? (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </>
                          ) : (
                            <>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </>
                          )}
                        </Button>
                        {isOrganizerEditing && (
                          <Button
                            size="sm"
                            onClick={() => openAssignOrganizer()}
                          >
                            <Plus className="h-4 w-4 mr-2" /> Assign / Change
                            Organizer
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                      <div>
                        <div className="text-gray-600">Assigned Organizer</div>
                        <div className="flex items-center gap-3 font-medium">
                          {event.organizer_id && organizerDetails ? (
                            <>
                              <img
                                src={
                                  organizerDetails?.profile_picture
                                    ? `${endpoints.serveImage}?path=${encodeURIComponent(
                                        organizerDetails.profile_picture
                                      )}`
                                    : `${endpoints.serveImage}?path=${encodeURIComponent("uploads/user_profile/default_pfp.png")}`
                                }
                                alt="Organizer"
                                className="h-8 w-8 rounded-full object-cover"
                              />
                              <div className="flex flex-col">
                                <span>
                                  {organizerDetails?.organizer_name ||
                                    event.organizer_name ||
                                    `Organizer #${event.organizer_id || organizerDetails?.organizer_organizer_id}`}
                                </span>
                                {/* Show assignment status if available */}
                                {organizerDetails?.assignment_status && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      organizerDetails.assignment_status ===
                                      "accepted"
                                        ? "bg-green-100 text-green-800"
                                        : organizerDetails.assignment_status ===
                                            "rejected"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {organizerDetails.assignment_status
                                      .charAt(0)
                                      .toUpperCase() +
                                      organizerDetails.assignment_status.slice(
                                        1
                                      )}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  event.admin_pfp
                                    ? `${endpoints.serveImage}?path=${encodeURIComponent(
                                        event.admin_pfp
                                      )}`
                                    : `${endpoints.serveImage}?path=${encodeURIComponent("uploads/user_profile/default_pfp.png")}`
                                }
                                alt="Admin"
                                className="h-8 w-8 rounded-full object-cover"
                              />
                              <div className="flex flex-col">
                                <span className="text-gray-900">
                                  {event.admin_name || "Admin"}
                                </span>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                  Admin (Default)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {(organizerMeta?.externalOrganizer ||
                        organizerDetails?.external_organizer_name) && (
                        <div>
                          <div className="text-gray-600">
                            External Organizer
                          </div>
                          <div className="font-medium">
                            {organizerMeta?.externalOrganizer ||
                              organizerDetails?.external_organizer_name}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Assignment Details */}
                    {(event.organizer_id ||
                      (!event.organizer_id && event.admin_id)) && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          Assignment Details
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Status:</span>
                            {(() => {
                              // If no organizer is assigned, show admin status
                              if (!event.organizer_id) {
                                return (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border bg-blue-50 text-blue-800 border-blue-200">
                                    Admin Assigned
                                  </span>
                                );
                              }

                              const status = (
                                organizerDetails?.assignment_status ||
                                event.assignment_status ||
                                "assigned"
                              ).toLowerCase();
                              const classes =
                                status === "accepted"
                                  ? "bg-green-50 text-green-800 border-green-200"
                                  : status === "rejected"
                                    ? "bg-red-50 text-red-800 border-red-200"
                                    : "bg-yellow-50 text-yellow-800 border-yellow-200";
                              const label =
                                status === "accepted"
                                  ? "Accepted"
                                  : status === "rejected"
                                    ? "Rejected"
                                    : "Pending";
                              return (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${classes}`}
                                >
                                  {label}
                                </span>
                              );
                            })()}
                          </div>
                          <div>
                            <span className="font-medium">Assigned by:</span>{" "}
                            Admin
                          </div>
                          <div className="col-span-1 md:col-span-2 flex items-center gap-2 mt-1">
                            <div className="text-xs text-gray-500">
                              Payment Status:
                            </div>
                            <div className="relative">
                              {!event.organizer_id ? (
                                <span className="px-2 py-1 text-xs rounded-full border bg-green-50 text-green-800 border-green-200 inline-flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Paid (Admin)
                                </span>
                              ) : (
                                <button
                                  disabled={!isOrganizerEditing}
                                  className={`px-2 py-1 text-xs rounded-full border inline-flex items-center gap-1 ${getPaymentStatusColor(event.organizer_payment_status || "unpaid")} ${!isOrganizerEditing ? "opacity-60 cursor-not-allowed" : ""}`}
                                  onClick={(e) => {
                                    if (!isOrganizerEditing) return;
                                    e.preventDefault();
                                    setShowOrganizerStatusMenu((prev) => !prev);
                                  }}
                                >
                                  {(event.organizer_payment_status ||
                                    "unpaid") === "paid" && (
                                    <CheckCircle className="h-3 w-3" />
                                  )}
                                  {(event.organizer_payment_status ||
                                    "unpaid") === "partial" && (
                                    <Percent className="h-3 w-3" />
                                  )}
                                  {(event.organizer_payment_status ||
                                    "unpaid") === "unpaid" && (
                                    <Wallet className="h-3 w-3" />
                                  )}
                                  {(event.organizer_payment_status ||
                                    "unpaid") === "cancelled" && (
                                    <X className="h-3 w-3" />
                                  )}
                                  {formatPaymentStatusLabel(
                                    event.organizer_payment_status || "unpaid"
                                  )}
                                </button>
                              )}
                              {showOrganizerStatusMenu &&
                                isOrganizerEditing &&
                                event.organizer_id && (
                                  <div className="absolute z-10 mt-1 w-40 bg-white border rounded shadow">
                                    <button
                                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-green-50"
                                      onClick={() => {
                                        event.organizer_assignment_id &&
                                          updateOrganizerPayment(
                                            event.organizer_assignment_id,
                                            "paid"
                                          );
                                        setShowOrganizerStatusMenu(false);
                                      }}
                                    >
                                      <span className="inline-flex items-center gap-2">
                                        <CheckCircle className="h-3 w-3" /> Paid
                                      </span>
                                    </button>
                                    <button
                                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-yellow-50"
                                      onClick={() => {
                                        event.organizer_assignment_id &&
                                          updateOrganizerPayment(
                                            event.organizer_assignment_id,
                                            "partial"
                                          );
                                        setShowOrganizerStatusMenu(false);
                                      }}
                                    >
                                      <span className="inline-flex items-center gap-2">
                                        <Percent className="h-3 w-3" /> Partial
                                      </span>
                                    </button>
                                    <button
                                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-red-50"
                                      onClick={() => {
                                        event.organizer_assignment_id &&
                                          updateOrganizerPayment(
                                            event.organizer_assignment_id,
                                            "cancelled"
                                          );
                                        setShowOrganizerStatusMenu(false);
                                      }}
                                    >
                                      <span className="inline-flex items-center gap-2">
                                        <X className="h-3 w-3" /> Cancelled
                                      </span>
                                    </button>
                                    <button
                                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-red-50"
                                      onClick={() => {
                                        event.organizer_assignment_id &&
                                          updateOrganizerPayment(
                                            event.organizer_assignment_id,
                                            "unpaid"
                                          );
                                        setShowOrganizerStatusMenu(false);
                                      }}
                                    >
                                      <span className="inline-flex items-center gap-2">
                                        <Wallet className="h-3 w-3" /> Unpaid
                                      </span>
                                    </button>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {(organizerMeta?.accepted?.length || 0) > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          Accepted
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {organizerMeta!.accepted.map((id) => (
                            <span
                              key={`accepted-${id}`}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border bg-green-50 text-green-800 border-green-200"
                            >
                              #{id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(organizerMeta?.rejected?.length || 0) > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          Rejected
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {organizerMeta!.rejected.map((id) => (
                            <span
                              key={`rejected-${id}`}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border bg-red-50 text-red-800 border-red-200"
                            >
                              #{id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Venue Selection */}
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Venue Selection
                      </h3>
                    </div>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="text-xs text-gray-500">
                        Payment Status:
                      </div>
                      <div className="relative">
                        <button
                          disabled={!venuePaymentSupported}
                          className={`px-2 py-1 text-xs rounded-full border inline-flex items-center gap-1 ${getPaymentStatusColor(event.venue_payment_status || "unpaid")}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setShowVenueStatusMenu((prev) => !prev);
                          }}
                        >
                          {(event.venue_payment_status || "unpaid") ===
                            "paid" && <CheckCircle className="h-3 w-3" />}
                          {(event.venue_payment_status || "unpaid") ===
                            "partial" && <Percent className="h-3 w-3" />}
                          {(event.venue_payment_status || "unpaid") ===
                            "unpaid" && <Wallet className="h-3 w-3" />}
                          {(event.venue_payment_status || "unpaid") ===
                            "cancelled" && <X className="h-3 w-3" />}
                          {formatPaymentStatusLabel(
                            event.venue_payment_status || "unpaid"
                          )}
                        </button>
                        {showVenueStatusMenu && venuePaymentSupported && (
                          <div className="absolute z-10 mt-1 w-40 bg-white border rounded shadow">
                            <button
                              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-green-50"
                              onClick={() => {
                                updateVenuePayment(event.event_id, "paid");
                                setShowVenueStatusMenu(false);
                              }}
                            >
                              <span className="inline-flex items-center gap-2">
                                <CheckCircle className="h-3 w-3" /> Paid
                              </span>
                            </button>
                            <button
                              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-yellow-50"
                              onClick={() => {
                                updateVenuePayment(event.event_id, "partial");
                                setShowVenueStatusMenu(false);
                              }}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Percent className="h-3 w-3" /> Partial
                              </span>
                            </button>
                            <button
                              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-red-50"
                              onClick={() => {
                                updateVenuePayment(event.event_id, "cancelled");
                                setShowVenueStatusMenu(false);
                              }}
                            >
                              <span className="inline-flex items-center gap-2">
                                <X className="h-3 w-3" /> Cancelled
                              </span>
                            </button>
                            <button
                              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-red-50"
                              onClick={() => {
                                updateVenuePayment(event.event_id, "unpaid");
                                setShowVenueStatusMenu(false);
                              }}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Wallet className="h-3 w-3" /> Unpaid
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <VenueSelection
                      event={event}
                      onEventUpdate={fetchEventDetails}
                    />
                  </div>

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
                        {event.wedding_details.wedding_time && (
                          <div>
                            <div className="text-sm text-pink-700">
                              Wedding Time
                            </div>
                            <div className="font-medium text-pink-900">
                              {event.wedding_details.wedding_time}
                            </div>
                          </div>
                        )}
                        {event.wedding_details.church && (
                          <div>
                            <div className="text-sm text-pink-700">
                              Church/Venue
                            </div>
                            <div className="font-medium text-pink-900">
                              {event.wedding_details.church}
                            </div>
                          </div>
                        )}
                        {event.wedding_details.address && (
                          <div>
                            <div className="text-sm text-pink-700">Address</div>
                            <div className="font-medium text-pink-900">
                              {event.wedding_details.address}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Dialog
                    open={showAssignOrganizer}
                    onOpenChange={setShowAssignOrganizer}
                  >
                    <DialogContent className="max-w-3xl sm:max-w-4xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl">
                          Assign Organizer
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                          Select an organizer and optionally set an agreed fee.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-base font-medium">
                              Select Organizer
                            </Label>
                            {organizersLoading && (
                              <div className="flex items-center text-xs text-blue-600">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                                Loading organizers...
                              </div>
                            )}
                          </div>

                          {/* Search input */}
                          <div className="mb-3">
                            <div className="relative">
                              <svg
                                className="absolute left-3 top-3 h-4 w-4 text-gray-400"
                                width="15"
                                height="15"
                                viewBox="0 0 15 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zm-.691 3.516a4.5 4.5 0 1 0-.707.707l2.838 2.838a.5.5 0 0 0 .708-.707l-2.838-2.838z"
                                  fill="currentColor"
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                ></path>
                              </svg>
                              <Input
                                placeholder="Search organizers by name"
                                className="pl-10"
                                onChange={(e) => {
                                  // Filter organizers on client side
                                  const searchTerm =
                                    e.target.value.toLowerCase();
                                  if (!searchTerm) {
                                    // Reset filtered list by re-fetching
                                    openAssignOrganizer();
                                    return;
                                  }

                                  // Otherwise filter the existing list
                                  const filtered = organizers.filter((o) => {
                                    const name =
                                      `${o.first_name || ""} ${o.last_name || ""}`.toLowerCase();
                                    return name.includes(searchTerm);
                                  });

                                  setOrganizers(filtered);
                                }}
                              />
                            </div>
                          </div>

                          {/* Organizers List */}
                          <div className="max-h-80 overflow-auto border rounded shadow-inner bg-gray-50">
                            {organizersLoading ? (
                              <div className="p-6 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                                <p>Loading organizers...</p>
                              </div>
                            ) : organizers.length === 0 ? (
                              <div className="p-6 text-center text-gray-500">
                                <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">
                                  No organizers found
                                </p>
                                <p className="text-sm mt-1">
                                  Try refreshing or add new organizers
                                </p>
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-200">
                                {organizers.map((o) => (
                                  <button
                                    key={o.organizer_id}
                                    className={`w-full text-left p-4 flex items-center gap-4 transition-colors hover:bg-purple-50/70 ${
                                      String(selectedOrganizerId) ===
                                      String(o.organizer_id)
                                        ? "bg-purple-100 border-l-4 border-purple-600"
                                        : "bg-white"
                                    } ${o.is_admin ? "border-l-4 border-l-blue-500" : ""}`}
                                    onClick={() =>
                                      setSelectedOrganizerId(o.organizer_id)
                                    }
                                  >
                                    <div className="relative">
                                      <img
                                        src={
                                          o.profile_picture
                                            ? `${endpoints.serveImage}?path=${encodeURIComponent(
                                                o.profile_picture
                                              )}`
                                            : `${endpoints.serveImage}?path=${encodeURIComponent("uploads/user_profile/default_pfp.png")}`
                                        }
                                        alt="Profile"
                                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                                      />
                                      {String(selectedOrganizerId) ===
                                        String(o.organizer_id) && (
                                        <div className="absolute -right-1 -bottom-1 bg-purple-600 text-white rounded-full p-0.5">
                                          <CheckCircle className="h-4 w-4" />
                                        </div>
                                      )}
                                      {o.is_admin && (
                                        <div className="absolute -right-1 -top-1 bg-blue-600 text-white rounded-full p-0.5">
                                          <User className="h-3 w-3" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <div className="font-medium text-gray-900">
                                          {o.first_name} {o.last_name}
                                        </div>
                                        {o.is_admin && (
                                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                            Admin (Default)
                                          </span>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-2 gap-2 mt-1">
                                        <div className="text-xs text-gray-500 flex items-center">
                                          <Mail className="h-3 w-3 mr-1" />
                                          {o.email || "No email"}
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center">
                                          <Phone className="h-3 w-3 mr-1" />
                                          {o.contact_number || "No phone"}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 mt-1">
                                        {o.is_admin ? (
                                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center">
                                            <User className="h-3 w-3 mr-1" />
                                            No additional fee
                                          </span>
                                        ) : (
                                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center">
                                            <Banknote className="h-3 w-3 mr-1" />
                                            {o.talent_fee_min
                                              ? `₱${formatCurrency(Number(o.talent_fee_min))}`
                                              : "No fee"}
                                            {o.talent_fee_max &&
                                            o.talent_fee_min !==
                                              o.talent_fee_max
                                              ? ` - ₱${formatCurrency(Number(o.talent_fee_max))}`
                                              : ""}
                                          </span>
                                        )}

                                        {o.experience_summary &&
                                          !o.is_admin && (
                                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                                              {
                                                o.experience_summary.split(
                                                  " "
                                                )[0]
                                              }{" "}
                                              exp.
                                            </span>
                                          )}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="col-span-1 space-y-4">
                          {/* Selected Organizer Summary */}
                          {selectedOrganizerId && (
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                              <h4 className="font-medium text-purple-900 mb-2">
                                Selected Organizer
                              </h4>

                              {(() => {
                                const selected = organizers.find(
                                  (o) =>
                                    String(o.organizer_id) ===
                                    String(selectedOrganizerId)
                                );

                                if (!selected) {
                                  return (
                                    <div className="text-sm text-purple-700">
                                      Organizer ID: {selectedOrganizerId}
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <img
                                          src={
                                            selected.profile_picture
                                              ? `${endpoints.serveImage}?path=${encodeURIComponent(
                                                  selected.profile_picture
                                                )}`
                                              : `${endpoints.serveImage}?path=${encodeURIComponent("uploads/user_profile/default_pfp.png")}`
                                          }
                                          alt="Profile"
                                          className="h-10 w-10 rounded-full object-cover"
                                        />
                                        {selected.is_admin && (
                                          <div className="absolute -right-1 -top-1 bg-blue-600 text-white rounded-full p-0.5">
                                            <User className="h-2 w-2" />
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <div className="font-medium text-purple-900">
                                            {selected.first_name}{" "}
                                            {selected.last_name}
                                          </div>
                                          {selected.is_admin && (
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                              Admin
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-purple-700">
                                          {selected.is_admin
                                            ? "Default Organizer"
                                            : `ID: ${selected.organizer_id}`}
                                        </div>
                                      </div>
                                    </div>

                                    {selected.is_admin ? (
                                      <div className="text-sm text-green-800">
                                        <span className="font-medium">
                                          Fee:
                                        </span>{" "}
                                        No additional fee (Admin handles event)
                                      </div>
                                    ) : selected.talent_fee_min ? (
                                      <div className="text-sm text-purple-800">
                                        <span className="font-medium">
                                          Regular Fee:
                                        </span>{" "}
                                        ₱
                                        {formatCurrency(
                                          Number(selected.talent_fee_min)
                                        )}
                                        {selected.talent_fee_max &&
                                        selected.talent_fee_min !==
                                          selected.talent_fee_max
                                          ? ` - ₱${formatCurrency(Number(selected.talent_fee_max))}`
                                          : ""}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          <div>
                            <Label className="text-base font-medium">
                              Agreed Talent Fee (optional)
                            </Label>
                            <div className="flex items-center mt-1">
                              <span className="bg-gray-100 p-2 border border-r-0 rounded-l-md text-gray-500">
                                ₱
                              </span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  agreedFee === "" ? "" : String(agreedFee)
                                }
                                onChange={(e) =>
                                  setAgreedFee(
                                    e.target.value === ""
                                      ? ""
                                      : Number(e.target.value)
                                  )
                                }
                                placeholder="e.g. 15000"
                                className="rounded-l-none"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              If provided, this fee will be saved with the
                              assignment and used for budget calculations.
                            </p>
                          </div>

                          {/* Assignment Note */}
                          <div>
                            <Label className="text-base font-medium">
                              Assignment Note (optional)
                            </Label>
                            <textarea
                              ref={notesTextareaRef}
                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                              rows={3}
                              placeholder="Add any special instructions or notes for this organizer assignment..."
                            ></textarea>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-6 border-t pt-4">
                        <div className="text-sm text-gray-500">
                          {organizersLoading ? (
                            <span className="flex items-center text-blue-600">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                              Processing...
                            </span>
                          ) : selectedOrganizerId ? (
                            <span className="text-green-600 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Ready to assign
                            </span>
                          ) : (
                            <span>Select an organizer to continue</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowAssignOrganizer(false)}
                            disabled={organizersLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => assignOrganizer()}
                            disabled={organizersLoading || !selectedOrganizerId}
                            className={
                              selectedOrganizerId
                                ? "bg-purple-600 hover:bg-purple-700"
                                : ""
                            }
                          >
                            {organizersLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                <User className="h-4 w-4 mr-2" />
                                {event?.organizer_id ||
                                organizerDetails?.organizer_organizer_id
                                  ? "Change Organizer"
                                  : "Assign Organizer"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

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
                            // Use window.open for better React compatibility
                            const link = document.createElement("a");
                            link.href = `${attachment.file_path}`;
                            link.download = attachment.original_name;
                            link.target = "_blank";
                            link.rel = "noopener noreferrer";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          };

                          const IconComponent = getFileIcon(
                            attachment.original_name || attachment.file_name
                          );

                          return (
                            <div
                              key={`attachment-${attachment.id || attachment.file_id || index}`}
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
              {activeTab === "nuptial" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Nupital Form
                    </h3>
                    {!isEditingWedding &&
                      event?.event_type_name?.toLowerCase() === "wedding" && (
                        <Button
                          onClick={handleEditWedding}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          {weddingDetails ? "Edit" : "Add Details"}
                        </Button>
                      )}
                    {isEditingWedding && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleCancelEditWedding}
                          variant="outline"
                          size="sm"
                          disabled={weddingSaving}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveWedding}
                          size="sm"
                          disabled={weddingSaving}
                          className="flex items-center gap-2"
                        >
                          {weddingSaving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {weddingSaving ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    )}
                  </div>
                  {weddingLoading ? (
                    <div className="text-gray-500">
                      Loading wedding details...
                    </div>
                  ) : !weddingDetails && !isEditingWedding ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="mb-4">
                        <FileText className="h-12 w-12 mx-auto text-gray-300" />
                      </div>
                      <p className="text-lg font-medium mb-2">
                        No wedding details yet
                      </p>
                      <p className="text-sm">
                        Click "Add Details" to start filling out the wedding
                        form.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-gray-600">
                            Nuptial
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.nuptial || ""}
                              onChange={(e) =>
                                updateWeddingField("nuptial", e.target.value)
                              }
                              placeholder="Enter nuptial details"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.nuptial || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Motif</Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.motif || ""}
                              onChange={(e) =>
                                updateWeddingField("motif", e.target.value)
                              }
                              placeholder="Enter wedding motif"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.motif || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Wedding Time
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              type="time"
                              value={editingWeddingData?.wedding_time || ""}
                              onChange={(e) =>
                                updateWeddingField(
                                  "wedding_time",
                                  e.target.value
                                )
                              }
                              placeholder="Select wedding time"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.wedding_time || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Church/Venue
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.church || ""}
                              onChange={(e) =>
                                updateWeddingField("church", e.target.value)
                              }
                              placeholder="Enter church or venue name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.church || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Address
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.address || ""}
                              onChange={(e) =>
                                updateWeddingField("address", e.target.value)
                              }
                              placeholder="Enter full address"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.address || "-"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bride & Groom */}
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-gray-600">
                            Bride Name
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.bride_name || ""}
                              onChange={(e) =>
                                updateWeddingField("bride_name", e.target.value)
                              }
                              placeholder="Enter bride's full name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.bride_name || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Bride Size
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.bride_size || ""}
                              onChange={(e) =>
                                updateWeddingField("bride_size", e.target.value)
                              }
                              placeholder="Enter gown size"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.bride_size || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Groom Name
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.groom_name || ""}
                              onChange={(e) =>
                                updateWeddingField("groom_name", e.target.value)
                              }
                              placeholder="Enter groom's full name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.groom_name || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Groom Size
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.groom_size || ""}
                              onChange={(e) =>
                                updateWeddingField("groom_size", e.target.value)
                              }
                              placeholder="Enter attire size"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.groom_size || "-"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bride's Parents */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 border-b border-gray-200 pb-1">
                          Bride's Parents
                        </h4>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Mother's Name
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.mother_bride_name || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "mother_bride_name",
                                  e.target.value
                                )
                              }
                              placeholder="Enter mother's name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.mother_bride_name || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Mother's Size
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.mother_bride_size || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "mother_bride_size",
                                  e.target.value
                                )
                              }
                              placeholder="Enter attire size"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.mother_bride_size || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Father's Name
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.father_bride_name || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "father_bride_name",
                                  e.target.value
                                )
                              }
                              placeholder="Enter father's name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.father_bride_name || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Father's Size
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.father_bride_size || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "father_bride_size",
                                  e.target.value
                                )
                              }
                              placeholder="Enter attire size"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.father_bride_size || "-"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Groom's Parents */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 border-b border-gray-200 pb-1">
                          Groom's Parents
                        </h4>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Mother's Name
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.mother_groom_name || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "mother_groom_name",
                                  e.target.value
                                )
                              }
                              placeholder="Enter groom's mother name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.mother_groom_name || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Mother's Size
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.mother_groom_size || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "mother_groom_size",
                                  e.target.value
                                )
                              }
                              placeholder="Enter attire size"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.mother_groom_size || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Father's Name
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.father_groom_name || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "father_groom_name",
                                  e.target.value
                                )
                              }
                              placeholder="Enter groom's father name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.father_groom_name || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Father's Size
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.father_groom_size || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "father_groom_size",
                                  e.target.value
                                )
                              }
                              placeholder="Enter attire size"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.father_groom_size || "-"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Principal Sponsors */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 border-b border-gray-200 pb-1">
                          Principal Sponsors
                        </h4>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Maid of Honor
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.maid_of_honor_name || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "maid_of_honor_name",
                                  e.target.value
                                )
                              }
                              placeholder="Enter maid of honor's name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.maid_of_honor_name || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Maid of Honor Size
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.maid_of_honor_size || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "maid_of_honor_size",
                                  e.target.value
                                )
                              }
                              placeholder="Enter dress size"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.maid_of_honor_size || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Best Man
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.best_man_name || ""}
                              onChange={(e) =>
                                updateWeddingField(
                                  "best_man_name",
                                  e.target.value
                                )
                              }
                              placeholder="Enter best man's name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.best_man_name || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Best Man Size
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.best_man_size || ""}
                              onChange={(e) =>
                                updateWeddingField(
                                  "best_man_size",
                                  e.target.value
                                )
                              }
                              placeholder="Enter suit size"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.best_man_size || "-"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Little Bride & Groom */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 border-b border-gray-200 pb-1">
                          Little Bride & Groom
                        </h4>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Little Bride Name
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.little_bride_name || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "little_bride_name",
                                  e.target.value
                                )
                              }
                              placeholder="Enter little bride's name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.little_bride_name || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Little Bride Size
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.little_bride_size || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "little_bride_size",
                                  e.target.value
                                )
                              }
                              placeholder="Enter dress size"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.little_bride_size || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Little Groom Name
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.little_groom_name || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "little_groom_name",
                                  e.target.value
                                )
                              }
                              placeholder="Enter little groom's name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.little_groom_name || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Little Groom Size
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.little_groom_size || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "little_groom_size",
                                  e.target.value
                                )
                              }
                              placeholder="Enter suit size"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.little_groom_size || "-"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Processing Information */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 border-b border-gray-200 pb-1">
                          Processing Information
                        </h4>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Prepared By
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.prepared_by || ""}
                              onChange={(e) =>
                                updateWeddingField(
                                  "prepared_by",
                                  e.target.value
                                )
                              }
                              placeholder="Enter preparer's name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.prepared_by || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Received By
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={editingWeddingData?.received_by || ""}
                              onChange={(e) =>
                                updateWeddingField(
                                  "received_by",
                                  e.target.value
                                )
                              }
                              placeholder="Enter receiver's name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.received_by || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Pickup Date
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              type="date"
                              value={editingWeddingData?.pickup_date || ""}
                              onChange={(e) =>
                                updateWeddingField(
                                  "pickup_date",
                                  e.target.value
                                )
                              }
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.pickup_date || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Return Date
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              type="date"
                              value={editingWeddingData?.return_date || ""}
                              onChange={(e) =>
                                updateWeddingField(
                                  "return_date",
                                  e.target.value
                                )
                              }
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.return_date || "-"}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Customer Signature
                          </Label>
                          {isEditingWedding ? (
                            <Input
                              value={
                                editingWeddingData?.customer_signature || ""
                              }
                              onChange={(e) =>
                                updateWeddingField(
                                  "customer_signature",
                                  e.target.value
                                )
                              }
                              placeholder="Enter customer signature or name"
                            />
                          ) : (
                            <div className="font-medium">
                              {weddingDetails?.customer_signature || "-"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Wedding Party */}
                      <div className="md:col-span-2">
                        <h4 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                          Wedding Party
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[
                            {
                              title: "Bridesmaids",
                              qtyKey: "bridesmaids_qty",
                              namesKey: "bridesmaids_names",
                            },
                            {
                              title: "Groomsmen",
                              qtyKey: "groomsmen_qty",
                              namesKey: "groomsmen_names",
                            },
                            {
                              title: "Junior Groomsmen",
                              qtyKey: "junior_groomsmen_qty",
                              namesKey: "junior_groomsmen_names",
                            },
                            {
                              title: "Flower Girls",
                              qtyKey: "flower_girls_qty",
                              namesKey: "flower_girls_names",
                            },
                            {
                              title: "Ring Bearers",
                              qtyKey: "ring_bearer_qty",
                              namesKey: "ring_bearer_names",
                            },
                            {
                              title: "Bible Bearers",
                              qtyKey: "bible_bearer_qty",
                              namesKey: "bible_bearer_names",
                            },
                            {
                              title: "Coin Bearers",
                              qtyKey: "coin_bearer_qty",
                              namesKey: "coin_bearer_names",
                            },
                          ].map((group) => (
                            <div
                              key={group.qtyKey}
                              className="border rounded-md p-3"
                            >
                              <div className="text-sm text-gray-600 mb-2 font-medium">
                                {group.title}
                              </div>
                              {isEditingWedding ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs text-gray-500">
                                      Quantity:
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={
                                        editingWeddingData?.[group.qtyKey] || 0
                                      }
                                      onChange={(e) =>
                                        updateWeddingField(
                                          group.qtyKey,
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="w-16 h-8 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    {(
                                      editingWeddingData?.[group.namesKey] || []
                                    ).map((name: string, idx: number) => (
                                      <div
                                        key={`${group.namesKey}-edit-${idx}`}
                                        className="flex gap-1"
                                      >
                                        <Input
                                          value={name || ""}
                                          onChange={(e) =>
                                            updateWeddingPartyMember(
                                              group.namesKey,
                                              idx,
                                              e.target.value
                                            )
                                          }
                                          placeholder="Enter name"
                                          className="text-sm h-8"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            removeWeddingPartyMember(
                                              group.namesKey,
                                              idx
                                            )
                                          }
                                          className="h-8 w-8 p-0"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        addWeddingPartyMember(group.namesKey)
                                      }
                                      className="w-full h-8 text-xs"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add {group.title.slice(0, -1)}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="text-xs text-gray-500 mb-2">
                                    Quantity:{" "}
                                    {weddingDetails?.[group.qtyKey] || 0}
                                  </div>
                                  <div className="space-y-1">
                                    {(weddingDetails?.[group.namesKey] || [])
                                      .length === 0 ? (
                                      <div className="text-gray-400 text-sm">
                                        None
                                      </div>
                                    ) : (
                                      (
                                        weddingDetails?.[group.namesKey] || []
                                      ).map((name: string, idx: number) => (
                                        <div
                                          key={`${group.namesKey}-${idx}`}
                                          className="text-sm"
                                        >
                                          {name || "-"}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Wedding Items */}
                      <div className="md:col-span-2">
                        <h4 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                          Wedding Items
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                          {[
                            ["cushions_qty", "Cushions"],
                            ["headdress_qty", "Headdress for Bride"],
                            ["shawls_qty", "Shawls"],
                            ["veil_cord_qty", "Veil & Cord"],
                            ["basket_qty", "Basket"],
                            ["petticoat_qty", "Petticoat"],
                            ["neck_bowtie_qty", "Neck/Bowtie"],
                            ["garter_leg_qty", "Garter Leg"],
                            ["fitting_form_qty", "Fitting Form"],
                            ["robe_qty", "Robe"],
                          ].map(([key, label]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between border rounded-md p-3"
                            >
                              <div className="text-sm text-gray-600">
                                {label}
                              </div>
                              {isEditingWedding ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={editingWeddingData?.[key] || 0}
                                  onChange={(e) =>
                                    updateWeddingField(
                                      key,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-16 h-8 text-sm"
                                />
                              ) : (
                                <div className="font-medium">
                                  {Number(weddingDetails?.[key] || 0)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
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
