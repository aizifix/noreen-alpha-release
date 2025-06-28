"use client";
import Link from "next/link";
import { Plus, Package, Edit, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { X, Check, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

// Define package interface
interface PackageItem {
  package_id: number;
  package_title: string;
  package_description: string;
  package_price: string | number;
  guest_capacity: number;
  created_at: string;
  user_firstName: string;
  user_lastName: string;
  created_by_name?: string;
  is_active: number;
  component_count: number;
  venue_count?: number;
  inclusions: string[];
  freebies: string[];
  freebie_count: number;
}

// Update types to include price at each level
interface SubComponent {
  name: string;
  price: number | string;
}

interface Component {
  name: string;
  price: number | string;
  subComponents: SubComponent[];
}

interface Inclusion {
  name: string;
  price: number | string;
  components: Component[];
}

interface EventType {
  event_type_id: number;
  event_name: string;
  event_description: string | null;
}

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_location: string;
  venue_capacity: number;
  total_price: number;
  venue_profile_picture: string | null;
  venue_cover_photo: string | null;
  inclusions: VenueInclusion[];
}

interface VenueInclusion {
  inclusion_id: number;
  inclusion_name: string;
  inclusion_price: number;
}

export default function PackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch packages when component mounts
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        "http://localhost/events-api/admin.php",
        {
          params: { operation: "getAllPackages" },
        }
      );

      if (response.data.status === "success") {
        setPackages(response.data.packages || []);
      } else {
        console.error("Error fetching packages:", response.data.message);
        toast.error("Failed to fetch packages: " + response.data.message);
      }
    } catch (error) {
      console.error("API error:", error);
      toast.error("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePackage = async (packageId: number) => {
    if (confirm("Are you sure you want to delete this package?")) {
      try {
        const response = await axios.post(
          "http://localhost/events-api/admin.php",
          {
            operation: "deletePackage",
            package_id: packageId,
          }
        );

        if (response.data.status === "success") {
          toast.success(
            response.data.message || "Package deleted successfully"
          );
          // Refresh the list
          fetchPackages();
        } else {
          console.error("Delete error:", response.data.message);
          toast.error("Failed to delete package: " + response.data.message);
        }
      } catch (error) {
        console.error("API error:", error);
        toast.error("Failed to connect to server");
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Add Package button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Packages</h1>
        <Link href="/admin/packages/package-builder">
          <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add Package
          </button>
        </Link>
      </div>

      {/* Summary Stats */}
      {!isLoading && packages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Packages</p>
                <p className="text-xl font-bold text-gray-900">
                  {packages.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Packages</p>
                <p className="text-xl font-bold text-gray-900">
                  {packages.filter((p) => p.is_active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <svg
                  className="h-5 w-5 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg. Price</p>
                <p className="text-xl font-bold text-gray-900">
                  ₱
                  {Math.round(
                    packages.reduce(
                      (sum, p) => sum + parseFloat(p.package_price.toString()),
                      0
                    ) / packages.length
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <svg
                  className="h-5 w-5 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Max Capacity</p>
                <p className="text-xl font-bold text-gray-900">
                  {Math.max(...packages.map((p) => p.guest_capacity))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10">
          <p>Loading packages...</p>
        </div>
      ) : (
        /* Packages Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.package_id}
              className="bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
            >
              {/* Green header section */}
              <div className="bg-green-50 p-5 border-b border-green-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-green-800">
                    {pkg.package_title}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${pkg.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {pkg.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-3xl font-bold text-green-600 my-2">
                  ₱{parseFloat(pkg.package_price.toString()).toLocaleString()}
                </div>
                <p className="text-gray-600 text-sm">
                  {pkg.package_description || "No description provided"}
                </p>
                <div className="mt-3 flex gap-4 text-sm text-gray-500">
                  <span>Created by {pkg.created_by_name || "Unknown"}</span>
                  <span>•</span>
                  <span>{new Date(pkg.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Main content */}
              <div className="p-5">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-gray-800">
                      {pkg.guest_capacity}
                    </div>
                    <div className="text-xs text-gray-500">Max Guests</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-gray-800">
                      {pkg.component_count || 0}
                    </div>
                    <div className="text-xs text-gray-500">Components</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-gray-800">
                      {pkg.venue_count || 0}
                    </div>
                    <div className="text-xs text-gray-500">Venues</div>
                  </div>
                </div>

                {/* Inclusions */}
                <div className="mb-4">
                  <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Inclusions:
                  </h4>
                  {pkg.inclusions && pkg.inclusions.length > 0 ? (
                    <ul className="space-y-1">
                      {pkg.inclusions
                        .slice(0, 3)
                        .map((item: string, i: number) => (
                          <li key={i} className="flex items-start text-sm">
                            <svg
                              className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      {pkg.inclusions.length > 3 && (
                        <li className="text-sm text-gray-500 ml-6">
                          +{pkg.inclusions.length - 3} more items...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No inclusions specified
                    </p>
                  )}
                </div>

                {/* Freebies */}
                <div>
                  <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                      />
                    </svg>
                    Freebies:
                  </h4>
                  {pkg.freebies && pkg.freebies.length > 0 ? (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">
                        {pkg.freebie_count || pkg.freebies.length} items
                      </span>
                      {pkg.freebies.length > 0 && (
                        <span className="text-gray-500">
                          {" "}
                          including {pkg.freebies.slice(0, 2).join(", ")}
                          {pkg.freebies.length > 2 && ", and more..."}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No freebies specified
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="mt-6 space-y-2">
                  <button
                    onClick={() =>
                      router.push(`/admin/packages/${pkg.package_id}`)
                    }
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 bg-white text-gray-700 hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
                  >
                    <Package className="h-4 w-4" /> View Details
                  </button>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/packages/package-builder/edit/${pkg.package_id}`}
                      className="flex-1"
                    >
                      <button className="w-full border border-blue-600 rounded-lg py-2 px-3 bg-white text-blue-700 hover:bg-blue-50 font-medium flex items-center justify-center gap-1">
                        <Edit className="h-4 w-4" /> Edit
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDeletePackage(pkg.package_id)}
                      className="flex-1 border border-red-500 rounded-lg py-2 px-3 bg-white text-red-600 hover:bg-red-50 font-medium flex items-center justify-center gap-1"
                      disabled={!pkg.is_active}
                    >
                      <Trash className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && packages.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium mb-2">No packages yet!</p>
          <p className="mb-4">Create your first package to offer to clients.</p>
          <Link href="/admin/packages/package-builder">
            <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 mx-auto">
              <Plus className="h-5 w-5" /> Build Now
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
