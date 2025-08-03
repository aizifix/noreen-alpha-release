"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";

export default function OrganizerDashboard() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
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
        console.log("Invalid user data in organizer dashboard:", userData);
        router.push("/auth/login");
        return;
      }
    } catch (error) {
      console.error("Error accessing user data:", error);
      router.push("/auth/login");
    }
  }, [router]);

  const metrics = [
    { title: "Events Organized", value: "24", change: "+18%", trend: "up" },
    { title: "Active Bookings", value: "12", change: "+32%", trend: "up" },
    {
      title: "Revenue This Month",
      value: "₱45,200",
      change: "+15%",
      trend: "up",
    },
    { title: "Client Satisfaction", value: "95%", change: "+8%", trend: "up" },
  ];

  const clientFeedback = {
    positive: 85,
    neutral: 12,
    negative: 3,
    total: "148",
  };

  const recentEvents = [
    {
      title: "Maria & John's Wedding Reception",
      time: "22 DEC 7:20 PM",
      color: "bg-pink-500",
      status: "Upcoming",
    },
    {
      title: "Corporate Annual Meeting",
      time: "21 DEC 11:21 AM",
      color: "bg-blue-500",
      status: "In Progress",
    },
    {
      title: "Sarah's Birthday Celebration",
      time: "19 DEC 6:30 PM",
      color: "bg-purple-500",
      status: "Completed",
    },
    {
      title: "Tech Conference 2024",
      time: "18 DEC 9:00 AM",
      color: "bg-green-500",
      status: "Completed",
    },
    {
      title: "Holiday Party Planning",
      time: "17 DEC 8:00 PM",
      color: "bg-indigo-500",
      status: "Completed",
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
          ? "bg-brand-500 text-white"
          : isToday(dayIndex)
            ? "font-semibold"
            : "hover:bg-brand-500/10"
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Organizer Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome back! Here's your event organizing overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`rounded-xl p-6 ${
              index === 0
                ? "bg-brand-500"
                : index === 1
                  ? "bg-gray-900"
                  : "bg-white"
            } ${index > 1 ? "text-gray-900" : "text-white"}`}
          >
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-full bg-white/20 p-3" />
              <div className="flex items-center gap-1 text-sm">
                {metric.change}
                {metric.trend === "up" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold">{metric.value}</p>
              <p className="text-sm opacity-80">{metric.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Client Feedback</h2>
            <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">
              View all feedback
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Positive Feedback</span>
                <span className="text-sm font-medium">
                  {clientFeedback.positive}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-[85%] rounded-full bg-brand-500" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Neutral Feedback</span>
                <span className="text-sm font-medium">
                  {clientFeedback.neutral}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-[12%] rounded-full bg-gray-500" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Negative Feedback</span>
                <span className="text-sm font-medium">
                  {clientFeedback.negative}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-[3%] rounded-full bg-red-500" />
              </div>
            </div>

            <p className="text-sm text-gray-600">
              {clientFeedback.total} clients have shared their feedback on your
              organized events.
            </p>
          </div>

          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Events</h2>
              <span className="text-sm text-green-500">+18% this month</span>
            </div>

            <div className="space-y-4">
              {recentEvents.map((event, index) => (
                <div key={index} className="flex gap-4">
                  <div className={`h-2 w-2 mt-2 rounded-full ${event.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{event.title}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          event.status === "Upcoming"
                            ? "bg-blue-100 text-blue-800"
                            : event.status === "In Progress"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {days.map((day) => (
                <div
                  key={day}
                  className="h-8 flex items-center justify-center text-xs font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>
          </div>

          <div className="rounded-xl bg-white p-6">
            <h3 className="text-md font-semibold mb-4">Upcoming Events</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Maria & John's Wedding</p>
                  <p className="text-sm text-gray-500">Grand Ballroom</p>
                </div>
                <span className="text-xs bg-brand-500 text-white px-2 py-1 rounded-full">
                  Dec 22
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Corporate Meeting</p>
                  <p className="text-sm text-gray-500">Conference Hall</p>
                </div>
                <span className="text-xs bg-brand-500 text-white px-2 py-1 rounded-full">
                  Dec 21
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Holiday Party</p>
                  <p className="text-sm text-gray-500">Garden Pavilion</p>
                </div>
                <span className="text-xs bg-brand-500 text-white px-2 py-1 rounded-full">
                  Dec 25
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6">
            <h3 className="text-md font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push("/organizer/events")}
                className="w-full text-left px-3 py-2 rounded-md bg-brand-500 text-white hover:bg-brand-600 transition-colors"
              >
                Create New Event
              </button>
              <button
                onClick={() => router.push("/organizer/bookings")}
                className="w-full text-left px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                View All Bookings
              </button>
              <button
                onClick={() => router.push("/organizer/venues")}
                className="w-full text-left px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Manage Venues
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
