"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";

// Sample event data (replace with real data source if available)
const sampleEvents = [
  {
    id: 1,
    title: "Santos-Reyes Wedding",
    date: "Saturday, March 15, 2025",
    client: "Maria Santos",
    venue: "The Grand Pavilion",
    budget: 180000,
    type: "Wedding",
    status: "Confirmed",
    statusColor: "border-green-500",
    statusBg: "bg-green-100",
    statusText: "text-green-700",
  },
  {
    id: 2,
    title: "Tech Innovations Conference",
    date: "Saturday, March 22, 2025",
    client: "Acme Technologies",
    venue: "Manila Business Center",
    budget: 350000,
    type: "Corporate",
    status: "Planning",
    statusColor: "border-yellow-500",
    statusBg: "bg-yellow-100",
    statusText: "text-yellow-700",
  },
  {
    id: 3,
    title: "Emerald Soiree",
    date: "Wednesday, March 12, 2025",
    client: "City Tourism Office",
    venue: "Rain City Hall",
    budget: 120000,
    type: "Social",
    status: "Confirmed",
    statusColor: "border-green-500",
    statusBg: "bg-green-100",
    statusText: "text-green-700",
  },
  {
    id: 4,
    title: "Product Launch: NextGen",
    date: "Wednesday, March 5, 2025",
    client: "Future Electronics",
    venue: "Innovation Hub",
    budget: 275000,
    type: "Corporate",
    status: "Planning",
    statusColor: "border-yellow-500",
    statusBg: "bg-yellow-100",
    statusText: "text-yellow-700",
  },
  {
    id: 5,
    title: "Annual Charity Gala",
    date: "Wednesday, March 19, 2025",
    client: "Hope Foundation",
    venue: "Luxury Hotel Ballroom",
    budget: 300000,
    type: "Social",
    status: "Confirmed",
    statusColor: "border-green-500",
    statusBg: "bg-green-100",
    statusText: "text-green-700",
  },
];

export default function VendorDashboard() {
  const router = useRouter();
  const [view, setView] = useState<"calendar" | "list">("calendar");

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
        router.push("/auth/login");
        return;
      }
    } catch (error) {
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Event Management</h1>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded font-semibold border ${view === "calendar" ? "bg-green-600 text-white border-green-600" : "bg-white text-green-700 border-green-600"}`}
            onClick={() => setView("calendar")}
          >
            Calendar
          </button>
          <button
            className={`px-4 py-2 rounded font-semibold border ${view === "list" ? "bg-green-600 text-white border-green-600" : "bg-white text-green-700 border-green-600"}`}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button className="ml-2 px-4 py-2 rounded bg-green-500 text-white font-semibold">
            + Create Event
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="Search events..."
        />
        <select className="border rounded px-3 py-2">
          <option>All Types</option>
        </select>
        <select className="border rounded px-3 py-2">
          <option>All Statuses</option>
        </select>
      </div>

      {view === "calendar" ? (
        // Insert your calendar component here
        <div className="min-h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg bg-white shadow-sm">
          Calendar component goes here
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleEvents.map((event) => (
            <div
              key={event.id}
              className={`rounded-lg shadow border-t-4 ${event.statusColor} bg-white p-6 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-lg">{event.title}</h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${event.statusBg} ${event.statusText}`}
                  >
                    {event.status}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  {event.date}
                </div>
                <div className="text-sm mb-2">
                  <div>
                    <span className="font-semibold">Client:</span>{" "}
                    {event.client}
                  </div>
                  <div>
                    <span className="font-semibold">Venue:</span> {event.venue}
                  </div>
                  <div>
                    <span className="font-semibold">Budget:</span> ₱
                    {event.budget.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold">Type:</span> {event.type}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <button className="flex items-center gap-1 px-4 py-2 rounded border border-gray-300 bg-gray-50 text-gray-700 font-medium">
                  <span>⏱️</span> Timeline
                </button>
                <button className="px-4 py-2 rounded bg-green-600 text-white font-semibold">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
