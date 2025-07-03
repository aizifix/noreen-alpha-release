"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import { Calendar, Clock, DollarSign, Package, Users } from "lucide-react";
import { format } from "date-fns";

interface Event {
  event_id: number;
  event_title: string;
  event_date: string;
  event_type_name: string;
  venue_name: string;
  package_name: string;
  total_budget: number;
  total_paid: number;
  remaining_balance: number;
  payment_percentage: number;
  payment_status: string;
  event_status: string;
}

interface PaymentSchedule {
  schedule_id: number;
  event_title: string;
  due_date: string;
  amount_due: number;
  urgency_status: "overdue" | "due_today" | "due_soon" | "upcoming";
  days_until_due: number;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<PaymentSchedule[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        protectRoute();
        const userData = secureStorage.getItem("user");

        // Log user data for debugging
        console.log("Dashboard: User data from storage:", userData);

        if (
          !userData ||
          !userData.user_role ||
          userData.user_role.toLowerCase() !== "client"
        ) {
          console.warn("Dashboard: Invalid user role or missing data");
          router.push("/auth/login");
          return;
        }

        setIsLoading(true);

        // Log API requests
        console.log("Dashboard: Fetching events for user:", userData.user_id);

        const eventsResponse = await axios.get(
          `http://localhost/events-api/client.php?operation=getClientEvents&user_id=${userData.user_id}`
        );

        console.log("Dashboard: Events response:", eventsResponse.data);

        const paymentsResponse = await axios.get(
          `http://localhost/events-api/client.php?operation=getClientNextPayments&user_id=${userData.user_id}`
        );

        console.log("Dashboard: Payments response:", paymentsResponse.data);

        if (eventsResponse.data.status === "success") {
          setEvents(eventsResponse.data.events);
        } else {
          console.error(
            "Dashboard: Failed to fetch events:",
            eventsResponse.data.message
          );
          setError(eventsResponse.data.message || "Failed to fetch events");
        }

        if (paymentsResponse.data.status === "success") {
          setUpcomingPayments(paymentsResponse.data.next_payments);
        } else {
          console.error(
            "Dashboard: Failed to fetch payments:",
            paymentsResponse.data.message
          );
          setError(paymentsResponse.data.message || "Failed to fetch payments");
        }
      } catch (error: any) {
        console.error("Dashboard: Error fetching data:", error);
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to load dashboard data";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "draft":
      case "planning":
        return "bg-yellow-100 text-yellow-800";
      case "on_going":
        return "bg-blue-100 text-blue-800";
      case "done":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-blue-100 text-blue-800";
      case "unpaid":
        return "bg-yellow-100 text-yellow-800";
      case "refunded":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getUrgencyColor = (status: string) => {
    switch (status) {
      case "overdue":
        return "bg-red-100 text-red-800";
      case "due_today":
        return "bg-yellow-100 text-yellow-800";
      case "due_soon":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Events</p>
              <h3 className="text-2xl font-bold">{events.length}</h3>
            </div>
            <Calendar className="h-8 w-8 text-brand-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Upcoming Events</p>
              <h3 className="text-2xl font-bold">
                {
                  events.filter((e) => new Date(e.event_date) > new Date())
                    .length
                }
              </h3>
            </div>
            <Clock className="h-8 w-8 text-brand-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Budget</p>
              <h3 className="text-2xl font-bold">
                ₱
                {events
                  .reduce((sum, e) => sum + e.total_budget, 0)
                  .toLocaleString()}
              </h3>
            </div>
            <DollarSign className="h-8 w-8 text-brand-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Payments</p>
              <h3 className="text-2xl font-bold">{upcomingPayments.length}</h3>
            </div>
            <Package className="h-8 w-8 text-brand-500" />
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {events
            .filter((event) => new Date(event.event_date) > new Date())
            .sort(
              (a, b) =>
                new Date(a.event_date).getTime() -
                new Date(b.event_date).getTime()
            )
            .slice(0, 5)
            .map((event) => (
              <div
                key={event.event_id}
                className="p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/client/events/${event.event_id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{event.event_title}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${getStatusColor(event.event_status)}`}
                  >
                    {event.event_status}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>{format(new Date(event.event_date), "MMMM d, yyyy")}</p>
                  <p>{event.venue_name || "Venue TBD"}</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${getPaymentStatusColor(event.payment_status)}`}
                  >
                    {event.payment_percentage}% Paid
                  </span>
                  <span className="text-xs text-gray-500">
                    ₱{event.remaining_balance.toLocaleString()} remaining
                  </span>
                </div>
              </div>
            ))}
          {events.filter((event) => new Date(event.event_date) > new Date())
            .length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No upcoming events
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Payments */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Upcoming Payments</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {upcomingPayments.slice(0, 5).map((payment) => (
            <div
              key={payment.schedule_id}
              className="p-4 border-b last:border-b-0 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{payment.event_title}</h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${getUrgencyColor(payment.urgency_status)}`}
                >
                  {payment.urgency_status === "overdue"
                    ? "Overdue"
                    : payment.urgency_status === "due_today"
                      ? "Due Today"
                      : payment.urgency_status === "due_soon"
                        ? "Due Soon"
                        : "Upcoming"}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <p>Due: {format(new Date(payment.due_date), "MMMM d, yyyy")}</p>
                <p className="font-medium">
                  Amount: ₱{payment.amount_due.toLocaleString()}
                </p>
              </div>
              {payment.days_until_due > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {payment.days_until_due} days until due
                </p>
              )}
            </div>
          ))}
          {upcomingPayments.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No upcoming payments
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
