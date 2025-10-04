"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/utils/apiClient";
import {
  Package,
  Clock,
  Users,
  MapPin,
  Eye,
  ArrowRight,
  Star,
  RefreshCw,
} from "lucide-react";

interface Package {
  package_id: number;
  package_title: string;
  package_description: string;
  package_price: number;
  guest_capacity: number;
  event_type_names: string[];
  components: Array<{
    component_name: string;
    component_price: number;
  }>;
  freebies: Array<{
    freebie_name: string;
    freebie_description: string;
    freebie_value: number;
  }>;
}

export default function BookingTemplatesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredPackages, setFeaturedPackages] = useState<Package[]>([]);
  const [regularPackages, setRegularPackages] = useState<Package[]>([]);

  // Format price helper
  const formatPrice = (amount: number): string => {
    return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch packages on component mount
  useEffect(() => {
    fetchPackages();
  }, []);

  // Fetch packages from API
  const fetchPackages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "/client.php",
        {
          params: { operation: "getAllPackages" },
        }
      );

      if (response.status === "success") {
        const allPackages = response.data.packages || [];

        // Separate featured and regular packages
        // For demo, we'll mark the first 3 as featured
        const featured = allPackages.slice(0, 3);
        const regular = allPackages.slice(3);

        setFeaturedPackages(featured);
        setRegularPackages(regular);
        setPackages(allPackages);
      } else {
        setError(response.data.message || "Failed to load packages");
      }
    } catch (err) {
      console.error("Error fetching packages:", err);
      setError("Failed to load packages. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Handle creating a new booking from scratch
  const handleCreateFromScratch = () => {
    router.push("/client/bookings/create-booking");
  };

  // Handle selecting a package template
  const handleSelectPackage = (packageId: number) => {
    router.push(`/client/bookings/create-booking?package=${packageId}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Booking Templates
          </h1>
          <p className="text-gray-600">
            Select a package template or create a custom booking from scratch
          </p>
        </div>
      </div>

      {/* Create From Scratch Card */}
      <div className="bg-[#028A75]/5 rounded-xl p-6 border-2 border-dashed border-[#028A75]/30">
        <div className="flex flex-col lg:flex-row items-center gap-6 justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-[#028A75]">
              Create Custom Booking
            </h2>
            <p className="text-gray-600 max-w-2xl">
              Start from scratch and build your perfect event. You'll have full
              control over every aspect including event type, venue, and all
              inclusions.
            </p>
          </div>
          <Button
            onClick={handleCreateFromScratch}
            className="bg-[#028A75] hover:bg-[#028A75]/90 px-6 py-5 h-auto"
          >
            <ArrowRight className="mr-2 h-5 w-5" />
            Start From Scratch
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#028A75]"></div>
            <p className="text-gray-500">Loading package templates...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg text-center">
          {error}
          <Button
            variant="outline"
            onClick={fetchPackages}
            className="mt-2 mx-auto block"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : (
        <>
          {/* Featured Templates */}
          {featuredPackages.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Star className="text-yellow-500 mr-2 h-5 w-5" />
                Featured Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredPackages.map((pkg) => (
                  <Card
                    key={pkg.package_id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-200 border-2 border-yellow-200 bg-yellow-50"
                  >
                    <div className="h-2 bg-yellow-400"></div>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          {pkg.package_title}
                        </CardTitle>
                        <Star className="h-5 w-5 text-yellow-500" />
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {pkg.package_description}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-[#028A75]">
                          {formatPrice(pkg.package_price)}
                        </span>
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-1" />
                          {pkg.guest_capacity} guests
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Package className="h-4 w-4 text-[#028A75]" />
                          <span>
                            {pkg.components?.length || 0} components included
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 text-[#028A75]" />
                          <span>Choice of venues</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleSelectPackage(pkg.package_id)}
                        className="w-full mt-2 bg-[#028A75] hover:bg-[#028A75]/90"
                      >
                        Select This Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Regular Templates */}
          {regularPackages.length > 0 && (
            <div className="space-y-4 mt-8">
              <h2 className="text-xl font-semibold text-gray-900">
                All Package Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularPackages.map((pkg) => (
                  <Card
                    key={pkg.package_id}
                    className="overflow-hidden hover:shadow-md transition-all duration-200"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        {pkg.package_title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {pkg.package_description}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-[#028A75]">
                          {formatPrice(pkg.package_price)}
                        </span>
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-1" />
                          {pkg.guest_capacity} guests
                        </div>
                      </div>

                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{pkg.components?.length || 0} components</span>
                        <span>{pkg.freebies?.length || 0} freebies</span>
                      </div>

                      <Button
                        onClick={() => handleSelectPackage(pkg.package_id)}
                        className="w-full mt-2 bg-[#028A75] hover:bg-[#028A75]/90"
                      >
                        Select This Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Templates */}
          {packages.length === 0 && (
            <div className="text-center py-16">
              <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No Package Templates Available
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                There are currently no package templates available. You can
                still create a custom booking from scratch.
              </p>
              <Button
                onClick={handleCreateFromScratch}
                className="bg-[#028A75] hover:bg-[#028A75]/90"
              >
                Create Custom Booking
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
