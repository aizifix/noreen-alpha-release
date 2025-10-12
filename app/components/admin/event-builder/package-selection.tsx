"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { toast } from "sonner";
import { CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Package,
  Users,
  Gift,
  Loader,
  X,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { weddingPackages } from "@/data/wedding-packages";

// Interface for package-event type relationship
interface PackageEventType {
  package_id: number;
  event_type_id: number;
}

// Interface for package data from API
interface DbPackage {
  package_id: string;
  package_title: string;
  package_description: string;
  package_price: string;
  guest_capacity: number;
  component_count: number;
  inclusions: string[]; // This will be the component names
  freebies: string[]; // This will be the freebie names
  freebie_count: number;
  venue_count: number;
  venue_previews?: Array<{
    venue_id: string;
    venue_title: string;
    venue_location: string;
    venue_capacity: number;
    venue_price: number;
    venue_profile_picture: string | null;
    venue_cover_photo: string | null;
  }>;
  venue_price_range?: {
    min: number;
    max: number;
    venues: Array<{
      venue_id: string;
      venue_title: string;
      venue_price: string;
      inclusions_total: string;
      total_venue_price: string;
    }>;
  };
  total_price_range?: {
    min: number;
    max: number;
  };
  // Additional properties from getPackageById
  components?: Array<{
    component_id: string;
    component_name: string;
    component_description: string;
    component_price: string;
  }>;
  venues?: Array<{
    venue_id: string;
    venue_title: string;
    venue_profile_picture: string | null;
    venue_price: string;
    inclusions: Array<{
      inclusion_name: string;
      inclusion_price: string;
    }>;
  }>;
}

// Interface for static package data
interface StaticPackage {
  id: string;
  name: string;
  price: number;
  description: string;
  maxGuests: number;
  inclusions: Array<{
    category: string;
    items: string[];
  }>;
  freebies: Array<{
    name: string;
    description?: string;
  }>;
  hotelChoices?: string[];
}

// Union type for all package types
type Package = DbPackage | StaticPackage;

// Helper function to get package ID
const getPackageId = (pkg: Package): string => {
  if ("package_id" in pkg) {
    return pkg.package_id;
  }
  return pkg.id;
};

// Helper function to get package title/name
const getPackageTitle = (pkg: Package): string => {
  if ("package_title" in pkg) {
    return pkg.package_title;
  }
  return pkg.name;
};

// Helper function to get package price
const getPackagePrice = (pkg: Package): number => {
  if ("package_price" in pkg) {
    return parseFloat(pkg.package_price);
  }
  return pkg.price;
};

// Helper function to get package description
const getPackageDescription = (pkg: Package): string => {
  if ("package_description" in pkg) {
    return pkg.package_description;
  }
  return pkg.description;
};

// Helper function to get guest capacity
const getGuestCapacity = (pkg: Package): number => {
  if ("guest_capacity" in pkg) {
    return pkg.guest_capacity;
  }
  return pkg.maxGuests;
};

// Helper function to get freebies count
const getFreebiesCount = (pkg: Package): number => {
  if ("freebie_count" in pkg) {
    return pkg.freebie_count;
  }
  return pkg.freebies?.length || 0;
};

// Helper function to get inclusion items
const getInclusionItems = (pkg: Package): string[] => {
  if ("inclusions" in pkg && Array.isArray(pkg.inclusions)) {
    if (pkg.inclusions.length === 0) return [];

    // If it's a DbPackage (array of strings)
    if (typeof pkg.inclusions[0] === "string") {
      return pkg.inclusions as string[];
    }

    // If it's a StaticPackage (array of objects with items)
    const staticInclusions = pkg.inclusions as Array<{
      category: string;
      items: string[];
    }>;
    return staticInclusions.flatMap((inc) => inc.items);
  }
  return [];
};

// Helper function to get freebies display text
const getFreebiesText = (pkg: Package): string => {
  if ("freebies" in pkg && Array.isArray(pkg.freebies)) {
    if (pkg.freebies.length === 0) return "No freebies available";

    // If it's a DbPackage (array of strings)
    if (typeof pkg.freebies[0] === "string") {
      return (pkg.freebies as string[]).join(", ");
    }

    // If it's a StaticPackage (array of objects with name)
    const staticFreebies = pkg.freebies as Array<{
      name: string;
      description?: string;
    }>;
    return staticFreebies.map((f) => f.name).join(", ");
  }
  return "No freebies available";
};

// Helper function to get venue previews
const getVenuePreviews = (
  pkg: Package
): Array<{
  venue_id: string;
  venue_title: string;
  venue_location: string;
  venue_capacity: number;
  venue_price: number;
  venue_profile_picture: string | null;
  venue_cover_photo: string | null;
}> => {
  if ("venue_previews" in pkg && pkg.venue_previews) {
    return pkg.venue_previews;
  }
  return [];
};

// Helper function to get venue count
const getVenueCount = (pkg: Package): number => {
  if ("venue_count" in pkg) {
    return pkg.venue_count;
  }
  return 0;
};

// Helper function to get freebies as displayable items
const getFreebiesDisplay = (pkg: Package): string[] => {
  if ("freebies" in pkg && Array.isArray(pkg.freebies)) {
    if (pkg.freebies.length === 0) return [];

    // If it's a DbPackage (array of strings)
    if (typeof pkg.freebies[0] === "string") {
      return pkg.freebies as string[];
    }

    // If it's a StaticPackage (array of objects with name)
    const staticFreebies = pkg.freebies as Array<{
      name: string;
      description?: string;
    }>;
    return staticFreebies.map((f) => f.name);
  }
  return [];
};

interface PackageSelectionProps {
  eventType: string;
  onSelect: (packageId: string) => Promise<void>;
  initialPackageId?: string | null;
}

export function PackageSelection({
  eventType,
  onSelect,
  initialPackageId,
}: PackageSelectionProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(
    initialPackageId || null
  );
  const [packages, setPackages] = useState<DbPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackageForDetails, setSelectedPackageForDetails] =
    useState<DbPackage | null>(null);
  const [isPackageDetailsModalOpen, setIsPackageDetailsModalOpen] =
    useState(false);
  const [currentVenueIndex, setCurrentVenueIndex] = useState(0);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [showAllPackages, setShowAllPackages] = useState(false);

  // Limit to show only 4 packages initially
  const PACKAGES_TO_SHOW = 4;

  // Helper function to get image URL
  const getImageUrl = (path: string | null) => {
    if (!path) return null;

    // If the image path already contains a full URL, use it as is
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    // Use the configured serve-image endpoint
    return `${endpoints.serveImage}?path=${encodeURIComponent(path)}`;
  };

  // Map event type strings to event type IDs
  const getEventTypeId = (type: string): number | null => {
    const eventTypeMap: Record<string, number> = {
      wedding: 1,
      anniversary: 2,
      birthday: 3,
      corporate: 4,
      other: 5,
      "other-event": 5,
      others: 5,
      baptism: 10,
      "baby-shower": 11,
      reunion: 12,
      festival: 13,
      engagement: 14,
      christmas: 15,
      "new-year": 16,
    };

    // Convert type to lowercase and remove spaces/special chars
    const normalizedType = type
      .toLowerCase()
      .replace(/[\s-_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Try direct match first
    if (eventTypeMap[normalizedType]) {
      return eventTypeMap[normalizedType];
    }

    // Try without hyphens
    const withoutHyphens = normalizedType.replace(/-/g, "");
    if (eventTypeMap[withoutHyphens]) {
      return eventTypeMap[withoutHyphens];
    }

    // Special handling for "other" variants
    if (normalizedType.includes("other")) {
      return 5;
    }

    return null;
  };

  // Fetch packages based on event type
  useEffect(() => {
    const fetchPackages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("Fetching packages for event type:", eventType);
        console.log("Initial package ID:", initialPackageId);

        // If no event type is selected, show a message instead of fetching all packages
        if (!eventType) {
          setError("Please select an event type to view available packages");
          setIsLoading(false);
          return;
        }

        // Get event type ID
        const eventTypeId = getEventTypeId(eventType);
        console.log("Event type ID:", eventTypeId);

        let data: any;

        if (eventTypeId) {
          const response = await axios.get(
            `${endpoints.admin}?operation=getPackagesByEventType&event_type_id=${eventTypeId}`
          );
          data = response.data;
        } else {
          const response = await axios.get(
            `${endpoints.admin}?operation=getAllPackages`
          );
          data = response.data;
        }

        console.log("Response data:", data);

        console.log("Packages response:", data);

        if (data.status === "error") {
          console.error("API Error:", data.message);
          setError(data.message || "Unknown error occurred");
          return;
        }

        if (!data.packages || data.packages.length === 0) {
          console.log("No packages returned from API");
          setError("Please select an event type to select package");
          return;
        }

        console.log("Number of packages returned:", data.packages?.length || 0);
        console.log("Packages:", data.packages);

        if (data.status === "success") {
          let allPackages: DbPackage[] = data.packages || [];
          console.log("All packages before processing:", allPackages);

          // If we have an initial package ID that's not in the main list, fetch it separately
          if (
            initialPackageId &&
            !allPackages.find((p) => p.package_id === initialPackageId)
          ) {
            try {
              const initialPackageResponse = await axios.get(
                `${endpoints.admin}?operation=getPackageById&package_id=${initialPackageId}`
              );
              const initialPackageData = initialPackageResponse.data;
              console.log("Initial package response:", initialPackageData);

              if (
                initialPackageData.status === "success" &&
                initialPackageData.package
              ) {
                // Transform single package response to match array format
                const pkg = initialPackageData.package;
                const initialPackage: DbPackage = {
                  ...pkg,
                  component_count: pkg.components?.length || 0,
                  freebie_count: pkg.freebies?.length || 0,
                  venue_count: pkg.venues?.length || 0,
                  inclusions:
                    pkg.components?.map((c: any) => c.component_name) || [],
                  freebies: pkg.freebies?.map((f: any) => f.freebie_name) || [],
                  venue_previews:
                    pkg.venues?.map((v: any) => {
                      return {
                        venue_id: v.venue_id,
                        venue_title: v.venue_title,
                        venue_location:
                          v.venue_location || "Location not specified",
                        venue_capacity: parseInt(v.venue_capacity) || 0,
                        venue_price: parseFloat(v.venue_price) || 0,
                        venue_profile_picture: v.venue_profile_picture,
                        venue_cover_photo: v.venue_cover_photo,
                      };
                    }) || [],
                };

                // Add the initial package to the end to avoid reordering
                allPackages.push(initialPackage);
              }
            } catch (error) {
              console.error("Error fetching initial package:", error);
            }
          }

          // Deduplicate packages by package_id
          const uniquePackages = allPackages.reduce(
            (acc: DbPackage[], current: DbPackage) => {
              const existing = acc.find(
                (pkg) => pkg.package_id === current.package_id
              );
              if (!existing) {
                acc.push(current);
              }
              return acc;
            },
            []
          );

          // Set packages in their natural order
          setPackages(uniquePackages);
        } else {
          console.error("API returned error:", data.message);
          setError(
            "Failed to load packages: " + (data.message || "Unknown error")
          );
        }
      } catch (error) {
        console.error("API error:", error);
        setError("Failed to connect to server. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackages();
  }, [initialPackageId, eventType]);

  const handleSelect = (packageId: string) => {
    console.log("Selecting package:", packageId);
    setSelectedPackage(packageId);

    // Call onSelect but don't automatically proceed
    onSelect(packageId).catch((error) => {
      console.error("Error selecting package:", error);
    });
  };

  const handleViewDetails = async (pkg: DbPackage) => {
    setIsModalLoading(true);
    try {
      // Fetch complete package details to ensure we have all venue data
      const response = await axios.get(
        `${endpoints.admin}?operation=getPackageById&package_id=${pkg.package_id}`
      );
      const data = response.data;
      if (data.status === "success" && data.package) {
        const completePackage = data.package;
        const enhancedPackage: DbPackage = {
          ...completePackage,
          component_count: completePackage.components?.length || 0,
          freebie_count: completePackage.freebies?.length || 0,
          venue_count: completePackage.venues?.length || 0,
          inclusions:
            completePackage.components?.map((c: any) => c.component_name) || [],
          freebies:
            completePackage.freebies?.map((f: any) => f.freebie_name) || [],
          venue_previews:
            completePackage.venues?.map((v: any) => ({
              venue_id: v.venue_id,
              venue_title: v.venue_title,
              venue_location: v.venue_location || "Location not specified",
              venue_capacity: parseInt(v.venue_capacity) || 0,
              venue_price: parseFloat(v.venue_price) || 0,
              venue_profile_picture: v.venue_profile_picture,
              venue_cover_photo: v.venue_cover_photo,
            })) || [],
        };

        setSelectedPackageForDetails(enhancedPackage);
        setCurrentVenueIndex(0);
        setIsPackageDetailsModalOpen(true);
      } else {
        // Fallback to original package if API call fails
        setSelectedPackageForDetails(pkg);
        setCurrentVenueIndex(0);
        setIsPackageDetailsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching package details:", error);
      // Fallback to original package if API call fails
      setSelectedPackageForDetails(pkg);
      setCurrentVenueIndex(0);
      setIsPackageDetailsModalOpen(true);
    } finally {
      setIsModalLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader className="h-12 w-12 animate-spin text-green-500 mb-4" />
        <p className="text-lg text-gray-600">Loading packages...</p>
      </div>
    );
  }

  // No packages available
  if (packages.length === 0) {
    return (
      <div className="rounded-lg bg-yellow-50 p-6 text-center">
        <p className="text-yellow-800 mb-4">No packages available.</p>
        <p className="text-sm text-yellow-600">
          Please contact support to add packages.
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg bg-[#028A75]/10 p-6 text-center border border-[#028A75]/50">
        <p className="text-[#028A75] text-md font-semibold">
          {!eventType ? "No event type selected" : "No packages available"}
        </p>
        <p className="text-[#028A75] text-sm">{error}</p>
        {!eventType && (
          <p className="mt-3 text-sm text-gray-600">
            Please select an event type from the dropdown above and click the
            "Select Event Type" button
          </p>
        )}
      </div>
    );
  }

  // Get packages to display based on showAllPackages state
  const packagesToShow = showAllPackages
    ? packages
    : packages.slice(0, PACKAGES_TO_SHOW);
  const hasMorePackages = packages.length > PACKAGES_TO_SHOW;

  // Render packages
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {packagesToShow.map((pkg, index) => {
          const isSelected = selectedPackage === getPackageId(pkg);
          return (
            <Card
              key={getPackageId(pkg)}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? "ring-2 ring-[#028A75] border-[#028A75]" : ""
              }`}
              onClick={() => handleSelect(getPackageId(pkg))}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    {getPackageTitle(pkg)}
                  </CardTitle>
                  {isSelected && (
                    <CheckCircle className="h-5 w-5 text-[#028A75]" />
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {getPackageDescription(pkg)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-[#028A75]">
                      {formatCurrency(getPackagePrice(pkg))}
                    </span>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-1" />
                      {getGuestCapacity(pkg)} guests
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{getInclusionItems(pkg).length} components</span>
                    <span>{getFreebiesDisplay(pkg).length} freebies</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(getPackageId(pkg));
                      }}
                    >
                      {isSelected ? "Selected" : "Select Package"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(pkg as DbPackage);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* See More / See Less Button */}
      {hasMorePackages && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setShowAllPackages(!showAllPackages)}
            className="px-6 py-2"
          >
            {showAllPackages
              ? "See Less"
              : `See More (${packages.length - PACKAGES_TO_SHOW} more)`}
          </Button>
        </div>
      )}

      {selectedPackage && (
        <div className="mt-6 p-4 bg-[#028A75]/5 rounded-lg border border-[#028A75]/20">
          <h3 className="font-medium text-[#028A75] mb-2">Selected Package</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[#028A75]">
                {(() => {
                  const selectedPkg = packages.find(
                    (p) => getPackageId(p) === selectedPackage
                  );
                  return selectedPkg
                    ? getPackageTitle(selectedPkg)
                    : "Selected Package";
                })()}
              </p>
              <p className="text-sm text-[#028A75]/70">
                {formatCurrency(
                  getPackagePrice(
                    packages.find((p) => getPackageId(p) === selectedPackage) ||
                      packages[0]
                  )
                )}
              </p>
            </div>
            <button
              onClick={() => setSelectedPackage(null)}
              className="text-[#028A75] hover:text-[#028A75]/80"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Package Details Modal */}
      <Dialog
        open={isPackageDetailsModalOpen}
        onOpenChange={setIsPackageDetailsModalOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          {/* Header Section */}
          <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-2xl font-semibold text-gray-900">
                {selectedPackageForDetails?.package_title}
              </DialogTitle>
              <DialogDescription className="text-base text-gray-600">
                {selectedPackageForDetails?.package_description}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            {isModalLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader className="h-8 w-8 animate-spin text-[#028A75] mx-auto mb-4" />
                  <p className="text-gray-600">Loading package details...</p>
                </div>
              </div>
            ) : selectedPackageForDetails ? (
              <div className="space-y-8">
                {/* Package Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center p-6 bg-[#028A75]/10 rounded-xl">
                    <div className="text-2xl sm:text-3xl font-bold text-[#028A75]">
                      {formatCurrency(
                        parseFloat(selectedPackageForDetails.package_price)
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Total Package Price
                    </div>
                  </div>
                  <div className="text-center p-6 bg-green-50 rounded-xl">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600">
                      {selectedPackageForDetails.guest_capacity}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Maximum Guests
                    </div>
                  </div>
                  <div className="text-center p-6 bg-purple-50 rounded-xl">
                    <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                      {selectedPackageForDetails.freebie_count || 0}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Free Items</div>
                  </div>
                </div>

                {/* Package Inclusions */}
                <div>
                  <h4 className="text-xl font-semibold mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    What's Included
                  </h4>
                  <div className="space-y-3">
                    {selectedPackageForDetails.inclusions &&
                    selectedPackageForDetails.inclusions.length > 0 ? (
                      selectedPackageForDetails.inclusions.map(
                        (inclusion, idx) => (
                          <div
                            key={`package-selection-inclusion-${idx}`}
                            className="flex items-center p-4 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                            <h5 className="font-medium text-gray-900">
                              {inclusion}
                            </h5>
                          </div>
                        )
                      )
                    ) : (
                      <div className="text-gray-500 text-center p-4">
                        No inclusions available
                      </div>
                    )}
                  </div>
                </div>

                {/* Freebies */}
                {selectedPackageForDetails.freebies &&
                  selectedPackageForDetails.freebies.length > 0 && (
                    <div>
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <Gift className="h-5 w-5 mr-2 text-orange-600" />
                        Free Bonuses
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedPackageForDetails.freebies.map(
                          (freebie, idx) => (
                            <div
                              key={`package-selection-freebie-${idx}`}
                              className="flex items-start p-4 bg-orange-50 rounded-lg"
                            >
                              <Gift className="h-5 w-5 mr-3 text-orange-600 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900">
                                  {freebie}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Venue Choices */}
                {selectedPackageForDetails.venue_previews &&
                  selectedPackageForDetails.venue_previews.length > 0 && (
                    <div>
                      <h4 className="text-xl font-semibold mb-4 flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-[#028A75]" />
                        Available Venues
                      </h4>
                      <div className="relative">
                        <div className="overflow-hidden rounded-xl">
                          {/* Carousel Container */}
                          <div
                            className="relative"
                            style={{
                              transform: `translateX(-${currentVenueIndex * 100}%)`,
                              transition: "transform 0.5s ease-in-out",
                              display: "flex",
                              width: `${selectedPackageForDetails.venue_previews.length * 100}%`,
                            }}
                          >
                            {selectedPackageForDetails.venue_previews.map(
                              (venue, idx) => (
                                <div
                                  key={venue.venue_id}
                                  className="w-full flex-shrink-0"
                                >
                                  {/* Cover Photo Container */}
                                  <div className="relative w-full h-[300px]">
                                    <img
                                      src={
                                        getImageUrl(venue.venue_cover_photo) ||
                                        "/placeholder.jpg"
                                      }
                                      alt={`${venue.venue_title} cover`}
                                      className="w-full h-full object-cover rounded-t-lg"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.src = "/placeholder.jpg";
                                      }}
                                    />
                                    {/* Profile Picture Overlay */}
                                    <div className="absolute -bottom-5 left-4">
                                      <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden">
                                        <img
                                          src={
                                            getImageUrl(
                                              venue.venue_profile_picture
                                            ) || "/default_pfp.png"
                                          }
                                          alt={venue.venue_title}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target =
                                              e.target as HTMLImageElement;
                                            target.src = "/default_pfp.png";
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  {/* Venue Details */}
                                  <div className="pt-7 pb-4 px-4 bg-white rounded-b-lg">
                                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                                      {venue.venue_title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                      {venue.venue_location}
                                    </p>
                                    <div className="flex items-center justify-between mt-3">
                                      <span className="text-sm text-gray-600 flex items-center">
                                        <Users className="h-4 w-4 mr-1" />
                                        Up to {venue.venue_capacity} guests
                                      </span>
                                      <span className="font-medium text-[#028A75]">
                                        ₱
                                        {Number(
                                          venue.venue_price
                                        ).toLocaleString("en-PH", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                          {/* Navigation Arrows */}
                          {selectedPackageForDetails.venue_previews &&
                            selectedPackageForDetails.venue_previews.length >
                              1 && (
                              <>
                                <button
                                  onClick={() =>
                                    setCurrentVenueIndex((prev) =>
                                      Math.max(0, prev - 1)
                                    )
                                  }
                                  className={`absolute top-1/2 left-2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm transition-opacity ${
                                    currentVenueIndex === 0
                                      ? "opacity-50 cursor-not-allowed"
                                      : "opacity-100 hover:bg-white"
                                  }`}
                                  disabled={currentVenueIndex === 0}
                                >
                                  <ChevronLeft className="h-5 w-5 text-gray-700" />
                                </button>
                                <button
                                  onClick={() =>
                                    setCurrentVenueIndex((prev) =>
                                      Math.min(
                                        (selectedPackageForDetails
                                          .venue_previews?.length ?? 1) - 1,
                                        prev + 1
                                      )
                                    )
                                  }
                                  className={`absolute top-1/2 right-2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm transition-opacity ${
                                    currentVenueIndex ===
                                    (selectedPackageForDetails.venue_previews
                                      ?.length ?? 1) -
                                      1
                                      ? "opacity-50 cursor-not-allowed"
                                      : "opacity-100 hover:bg-white"
                                  }`}
                                  disabled={
                                    currentVenueIndex ===
                                    (selectedPackageForDetails.venue_previews
                                      ?.length ?? 1) -
                                      1
                                  }
                                >
                                  <ChevronRight className="h-5 w-5 text-gray-700" />
                                </button>
                              </>
                            )}
                        </div>
                        {/* Dots Navigation */}
                        {selectedPackageForDetails.venue_previews &&
                          selectedPackageForDetails.venue_previews.length >
                            1 && (
                            <div className="flex justify-center gap-2 mt-4">
                              {selectedPackageForDetails.venue_previews.map(
                                (_, idx) => (
                                  <button
                                    key={`package-selection-venue-dot-${idx}`}
                                    onClick={() => setCurrentVenueIndex(idx)}
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      idx === currentVenueIndex
                                        ? "w-8 bg-[#028A75]"
                                        : "w-2 bg-gray-300"
                                    }`}
                                  />
                                )
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  )}
              </div>
            ) : null}
          </div>

          {/* Footer with Action Button - Fixed position */}
          <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0">
            <Button
              onClick={() => {
                if (selectedPackageForDetails) {
                  handleSelect(selectedPackageForDetails.package_id);
                  setIsPackageDetailsModalOpen(false);
                }
              }}
              className="w-full bg-[#028A75] hover:bg-[#027A65] text-white"
            >
              Select This Package
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
