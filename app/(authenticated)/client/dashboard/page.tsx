"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bell,
  Calendar,
  CreditCard,
  FileText,
  List,
  Users,
  LogOut,
  Plus,
} from "lucide-react";
import Link from "next/link";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
      <div
        className="h-2 rounded-full bg-green-600 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function ClientDashboard() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    try {
      // Protect route from unauthorized access and back navigation
      // Use secureStorage and check for 'Client' role
      const userDataRaw = secureStorage.getItem("user");
      let userData = userDataRaw;
      if (!userData) {
        router.push("/auth/login");
        return;
      }
      if (typeof userData === "string") {
        try {
          userData = JSON.parse(userData);
        } catch {
          secureStorage.removeItem("user");
          router.push("/auth/login");
          return;
        }
      }
      if (!userData.user_role || userData.user_role !== "Client") {
        router.push("/auth/login");
        return;
      }
    } catch (error) {
      router.push("/auth/login");
    }
  }, [router]);

  // Client-related metrics
  const metrics = [
    { title: "Events Booked", value: "8", change: "+10%", trend: "up" },
    { title: "Payments Made", value: "$2,400", change: "+5%", trend: "up" },
    { title: "Upcoming Events", value: "3", change: "0%", trend: "up" },
    { title: "Total Spent", value: "$5,800", change: "+12%", trend: "up" },
  ];

  const reviews = {
    positive: 92,
    neutral: 6,
    negative: 2,
    total: "24",
  };

  const events = [
    {
      title: "Wedding Reception at Grand Ballroom",
      time: "22 DEC 7:20 PM",
      color: "bg-green-500",
    },
    {
      title: "Corporate Seminar at Conference Center",
      time: "21 DEC 11:21 PM",
      color: "bg-blue-500",
    },
    {
      title: "Birthday Party at Garden Pavilion",
      time: "21 DEC 9:28 PM",
      color: "bg-[#486968]",
    },
  ];

  // Calendar functions
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const lastDayOfPrevMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    0
  ).getDate();

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const isToday = (date: number) => {
    const today = new Date();
    return (
      date === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: number) => {
    return (
      date === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const getDayElement = (dayIndex: number, isCurrentMonth = true) => {
    const className = `h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors ${
      !isCurrentMonth
        ? "text-gray-400"
        : isSelected(dayIndex)
          ? "bg-[#486968] text-white"
          : isToday(dayIndex)
            ? "font-semibold"
            : "hover:bg-[#486968]/10"
    }`;

    return (
      <button
        key={`${isCurrentMonth ? "current" : "other"}-${dayIndex}`}
        className={className}
        onClick={() =>
          isCurrentMonth &&
          setSelectedDate(
            new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              dayIndex
            )
          )
        }
        disabled={!isCurrentMonth}
      >
        {dayIndex}
      </button>
    );
  };

  const renderCalendarDays = () => {
    const days = [];

    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push(getDayElement(lastDayOfPrevMonth - i, false));
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(getDayElement(i));
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows × 7 days = 42
    for (let i = 1; i <= remainingDays; i++) {
      days.push(getDayElement(i, false));
    }

    return days;
  };

  // Dummy data
  const summary = {
    totalEvents: 2,
    upcomingEvent: {
      name: "Wedding Anniversary",
      date: "June 15, 2025",
    },
    totalPayments: 200000,
    paymentsCount: 2,
    notifications: 3,
    unreadNotifications: 2,
  };

  const eventProgress = [
    {
      name: "Wedding Anniversary",
      date: "June 15, 2025",
      progress: 75,
      venue: "The Grand Pavilion",
    },
    {
      name: "Birthday Party",
      date: "July 22, 2025",
      progress: 40,
      venue: "Garden Terrace",
    },
  ];

  const notifications = [
    {
      title: "Payment Received",
      status: "New",
      description:
        "Your payment of ₱125,000 for Wedding Anniversary has been received.",
      timeAgo: "-40 days ago",
    },
    {
      title: "Event Update",
      status: "New",
      description: "The venue for your Birthday Party has been confirmed.",
      timeAgo: "-38 days ago",
    },
    {
      title: "New Document",
      status: "",
      description: "A new contract document has been uploaded for your review.",
      timeAgo: "-35 days ago",
    },
  ];

  // Tabs state
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="p-6 space-y-6">
      {/* Header row: Dashboard title left, Book New Event button right */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link href="/client/events/new">
          <button className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg flex items-center gap-2">
            <Plus className="h-5 w-5" /> Book New Event
          </button>
        </Link>
      </div>
      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 flex flex-col gap-1 border">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Total Events
          </span>
          <span className="text-2xl font-bold">{summary.totalEvents}</span>
          <span className="text-xs text-gray-400">2 active events</span>
        </div>
        <div className="bg-white rounded-lg p-4 flex flex-col gap-1 border">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <List className="h-4 w-4" /> Upcoming Event
          </span>
          <span className="text-lg font-semibold truncate">
            {summary.upcomingEvent.name}
          </span>
          <span className="text-xs text-gray-400">
            {summary.upcomingEvent.date}
          </span>
        </div>
        <div className="bg-white rounded-lg p-4 flex flex-col gap-1 border">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <CreditCard className="h-4 w-4" /> Total Payments
          </span>
          <span className="text-2xl font-bold">
            ₱{summary.totalPayments.toLocaleString()}
          </span>
          <span className="text-xs text-gray-400">
            {summary.paymentsCount} payments made
          </span>
        </div>
        <div className="bg-white rounded-lg p-4 flex flex-col gap-1 border">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Bell className="h-4 w-4" /> Notifications
          </span>
          <span className="text-2xl font-bold">{summary.notifications}</span>
          <span className="text-xs text-gray-400">
            {summary.unreadNotifications} unread
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg p-4 border">
        <div className="flex gap-4 border-b mb-4">
          {["Overview", "Events", "Payments", "Notifications"].map((tab) => (
            <button
              key={tab}
              className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-brand-600"}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "Events" && (
                <span className="ml-1 bg-brand-100 text-brand-600 rounded-full px-2 text-xs">
                  2
                </span>
              )}
              {tab === "Payments" && (
                <span className="ml-1 bg-brand-100 text-brand-600 rounded-full px-2 text-xs">
                  2
                </span>
              )}
              {tab === "Notifications" && (
                <span className="ml-1 bg-brand-100 text-brand-600 rounded-full px-2 text-xs">
                  2
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "Overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Event Planning Progress */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-2">
                Event Planning Progress
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Track the progress of your upcoming events
              </p>
              <div className="space-y-4">
                {eventProgress.map((event) => (
                  <div key={event.name} className="mb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{event.name}</span>
                        <span className="block text-xs text-gray-500">
                          {event.date}
                        </span>
                      </div>
                      <span className="font-semibold">{event.progress}%</span>
                    </div>
                    <ProgressBar value={event.progress} />
                    <div className="text-xs text-gray-400 mt-1">
                      {event.venue}
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/client/events"
                className="text-green-700 text-sm mt-4 inline-block"
              >
                View all events &rarr;
              </Link>
            </div>
            {/* Recent Notifications */}
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Recent Notifications
              </h2>
              <p className="text-sm text-gray-500 mb-4">Your latest updates</p>
              <div className="space-y-4">
                {notifications.map((notif, idx) => (
                  <div
                    key={idx}
                    className="border-b pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{notif.title}</span>
                      {notif.status && (
                        <span className="ml-1 bg-brand-100 text-brand-600 rounded-full px-2 text-xs">
                          {notif.status}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {notif.description}
                    </div>
                    <div className="text-xs text-gray-400">{notif.timeAgo}</div>
                  </div>
                ))}
              </div>
              <Link
                href="/client/notifications"
                className="text-green-700 text-sm mt-4 inline-block"
              >
                View all notifications &rarr;
              </Link>
            </div>
          </div>
        )}
        {/* You can add content for Events, Payments, Notifications tabs here as needed */}
      </div>
    </div>
  );
}
