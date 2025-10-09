"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import { Filter, Search } from "lucide-react";

interface Store {
  id: number;
  storeName: string;
  storeCategory: string;
  coverPhoto: string | null;
  profilePicture: string;
  store_status: string;
  store_type: string;
  store_contact: string;
  store_location: string;
  store_createdAt: string;
}

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_owner: string;
  venue_location: string;
  venue_status: string;
  venue_type: string;
  venue_contact: string;
  venue_capacity: number;
  venue_profile_picture: string;
  venue_cover_photo: string | null;
}

interface ApiResponse<T> {
  status: string;
  stores?: T[];
  venues?: T[];
  message?: string;
}

export default function VendorDashboard() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"stores" | "venues">("stores");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

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
        console.log("Invalid user data in overview:", userData);
        router.push("/auth/login");
        return;
      }

      fetchData(userData.user_id);
    } catch (error) {
      console.error("Error accessing user data:", error);
      router.push("/auth/login");
    }
  }, [router]);

  const fetchData = async (userId: number) => {
    try {
      setLoading(true);
      const [storesResponse, venuesResponse] = await Promise.all([
        axios.get<ApiResponse<Store>>(endpoints.vendor, {
          params: {
            operation: "getStores",
            user_id: userId,
          },
        }),
        axios.get<ApiResponse<Venue>>(endpoints.vendor, {
          params: {
            operation: "getVenues",
            user_id: userId,
          },
        }),
      ]);

      if (
        storesResponse.data.status === "success" &&
        storesResponse.data.stores
      ) {
        setStores(storesResponse.data.stores);
      }

      if (
        venuesResponse.data.status === "success" &&
        venuesResponse.data.venues
      ) {
        setVenues(venuesResponse.data.venues);
      }

      setError("");
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const filteredData = () => {
    const data = activeTab === "stores" ? stores : venues;
    if (!Array.isArray(data)) {
      console.error("Data is not an array:", data);
      return [];
    }

    return data.filter((item) => {
      if (!item) return false;

      if (activeTab === "stores") {
        const store = item as Store;
        const matchesSearch = store.storeName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" ||
          store.store_status?.toLowerCase() === statusFilter.toLowerCase();

        const matchesType =
          typeFilter === "all" ||
          store.store_type?.toLowerCase() === typeFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesType;
      } else {
        const venue = item as Venue;
        const matchesSearch =
          venue.venue_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          venue.venue_owner?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" ||
          venue.venue_status?.toLowerCase() === statusFilter.toLowerCase();

        const matchesType =
          typeFilter === "all" ||
          venue.venue_type?.toLowerCase() === typeFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesType;
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#486968] border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-lg bg-red-50 p-4 text-red-800">{error}</div>
      </div>
    );
  }

  const noDataMessage = (
    <tr>
      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
        No {activeTab} found
      </td>
    </tr>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Overview Dashboard</h1>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("stores")}
            className={`rounded-lg px-4 py-2 ${
              activeTab === "stores"
                ? "bg-[#486968] text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Stores
          </button>
          <button
            onClick={() => setActiveTab("venues")}
            className={`rounded-lg px-4 py-2 ${
              activeTab === "venues"
                ? "bg-[#486968] text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Venues
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#486968]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#486968]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="available">Available</option>
              <option value="booked">Booked</option>
              <option value="unavailable">Unavailable</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#486968]"
            >
              <option value="all">All Types</option>
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {activeTab === "stores" ? "Store Name" : "Venue Title"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {activeTab === "stores" ? "Category" : "Owner"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              {activeTab === "venues" && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData().length > 0
              ? filteredData().map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activeTab === "stores"
                        ? item.storeName
                        : item.venue_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activeTab === "stores"
                        ? item.storeCategory
                        : item.venue_owner}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activeTab === "stores"
                        ? item.store_location
                        : item.venue_location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          item.store_status === "active" ||
                          item.venue_status === "available"
                            ? "bg-green-100 text-green-800"
                            : item.store_status === "inactive" ||
                                item.venue_status === "booked"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {activeTab === "stores"
                          ? item.store_status
                          : item.venue_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activeTab === "stores"
                        ? item.store_type
                        : item.venue_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activeTab === "stores"
                        ? item.store_contact
                        : item.venue_contact}
                    </td>
                    {activeTab === "venues" && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.venue_capacity}
                      </td>
                    )}
                  </tr>
                ))
              : noDataMessage}
          </tbody>
        </table>
      </div>
    </div>
  );
}
