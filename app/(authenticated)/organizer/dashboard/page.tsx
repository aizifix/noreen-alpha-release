"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";

export default function VendorDashboard() {
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
        userData.user_role.toLowerCase() !== "vendor"
      ) {
        console.log("Invalid user data in dashboard:", userData);
        router.push("/auth/login");
        return;
      }
    } catch (error) {
      console.error("Error accessing user data:", error);
      router.push("/auth/login");
    }
  }, [router]);

  const metrics = [
    { title: "Venues Created", value: "16", change: "+25%", trend: "up" },
    { title: "Quick Events", value: "357", change: "+24%", trend: "up" },
    { title: "Performance", value: "2300", change: "+15%", trend: "up" },
    { title: "Active Events", value: "840", change: "+30%", trend: "up" },
  ];

  const reviews = {
    positive: 80,
    neutral: 17,
    negative: 3,
    total: "1,065",
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
    {
      title: "Product Launch at Exhibition Hall",
      time: "20 DEC 3:52 PM",
      color: "bg-purple-500",
    },
    {
      title: "Charity Gala at Rooftop Terrace",
      time: "19 DEC 11:35 PM",
      color: "bg-indigo-500",
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`rounded-xl p-6 ${
              index === 0
                ? "bg-[#486968]"
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
            <h2 className="text-lg font-semibold">Reviews</h2>
            <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">
              View all reviews
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Positive Reviews</span>
                <span className="text-sm font-medium">{reviews.positive}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-[80%] rounded-full bg-[#486968]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Neutral Reviews</span>
                <span className="text-sm font-medium">{reviews.neutral}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-[17%] rounded-full bg-gray-500" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Negative Reviews</span>
                <span className="text-sm font-medium">{reviews.negative}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-[3%] rounded-full bg-red-500" />
              </div>
            </div>

            <p className="text-sm text-gray-600">
              More than {reviews.total} vendors have created stores or venues on
              our platform.
            </p>
          </div>

          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Event Overview</h2>
              <span className="text-sm text-green-500">+24% this month</span>
            </div>

            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={index} className="flex gap-4">
                  <div className={`h-2 w-2 mt-2 rounded-full ${event.color}`} />
                  <div>
                    <p className="font-medium">{event.title}</p>
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
                  <p className="font-medium">Wedding Reception</p>
                  <p className="text-sm text-gray-500">Grand Ballroom</p>
                </div>
                <span className="text-xs bg-[#486968] text-white px-2 py-1 rounded-full">
                  Dec 15
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Corporate Seminar</p>
                  <p className="text-sm text-gray-500">Conference Hall</p>
                </div>
                <span className="text-xs bg-[#486968] text-white px-2 py-1 rounded-full">
                  Dec 18
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Birthday Party</p>
                  <p className="text-sm text-gray-500">Garden Pavilion</p>
                </div>
                <span className="text-xs bg-[#486968] text-white px-2 py-1 rounded-full">
                  Dec 22
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
