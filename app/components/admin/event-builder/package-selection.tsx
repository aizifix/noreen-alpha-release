"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Package, Users, Gift, Loader } from "lucide-react";
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
    venue_profile_picture: string | null;
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
  venue_profile_picture: string | null;
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
  const [isConfirming, setIsConfirming] = useState(false);

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

  // Fetch packages by event type
  useEffect(() => {
    const fetchPackages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("Fetching packages for event type:", eventType);
        console.log("Initial package ID:", initialPackageId);

        // Fetch packages by event type first to maintain order
        const eventTypeId = getEventTypeId(eventType);
        console.log("Event type ID:", eventTypeId);
        console.log(
          "API URL will be:",
          `http://localhost/events-api/admin.php?operation=getPackagesByEventType&event_type_id=${eventTypeId}`
        );

        if (eventTypeId) {
          const response = await axios.get<{
            status: string;
            packages?: DbPackage[];
            message?: string;
          }>("http://localhost/events-api/admin.php", {
            params: {
              operation: "getPackagesByEventType",
              event_type_id: eventTypeId,
            },
          });

          console.log("Packages response:", response.data);
          console.log(
            "Number of packages returned:",
            response.data.packages?.length || 0
          );

          if (response.data.status === "success") {
            let allPackages = response.data.packages || [];
            console.log("All packages before processing:", allPackages);

            // If we have an initial package ID that's not in the main list, fetch it separately
            if (
              initialPackageId &&
              !allPackages.find((p) => p.package_id === initialPackageId)
            ) {
              try {
                const initialPackageResponse = await axios.get<{
                  status: string;
                  package?: DbPackage;
                  message?: string;
                }>("http://localhost/events-api/admin.php", {
                  params: {
                    operation: "getPackageById",
                    package_id: initialPackageId,
                  },
                });

                console.log(
                  "Initial package response:",
                  initialPackageResponse.data
                );

                if (
                  initialPackageResponse.data.status === "success" &&
                  initialPackageResponse.data.package
                ) {
                  // Transform single package response to match array format
                  const pkg = initialPackageResponse.data.package;
                  const initialPackage: DbPackage = {
                    ...pkg,
                    component_count: pkg.components?.length || 0,
                    freebie_count: pkg.freebies?.length || 0,
                    venue_count: pkg.venues?.length || 0,
                    inclusions:
                      pkg.components?.map((c: any) => c.component_name) || [],
                    freebies:
                      pkg.freebies?.map((f: any) => f.freebie_name) || [],
                    venue_previews:
                      pkg.venues?.map((v: any) => ({
                        venue_id: v.venue_id,
                        venue_title: v.venue_title,
                        venue_profile_picture: v.venue_profile_picture,
                      })) || [],
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
            console.error("API returned error:", response.data.message);
            // Fallback: try to get all packages if specific event type fails
            try {
              console.log("Trying fallback: get all packages");
              const fallbackResponse = await axios.get<{
                status: string;
                packages?: DbPackage[];
                message?: string;
              }>("http://localhost/events-api/admin.php", {
                params: {
                  operation: "getPackagesByEventType",
                  event_type_id: 0, // 0 = all packages
                },
              });

              if (fallbackResponse.data.status === "success") {
                console.log("Fallback response:", fallbackResponse.data);
                setPackages(fallbackResponse.data.packages || []);
              } else {
                setError(
                  "Failed to load packages: " +
                    (response.data.message || "Unknown error")
                );
              }
            } catch (fallbackError) {
              console.error("Fallback API error:", fallbackError);
              setError("Failed to connect to server. Please try again later.");
            }
          }
        }
      } catch (error) {
        console.error("API error:", error);
        setError("Failed to connect to server. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackages();
  }, [eventType, initialPackageId]);

  const handleSelect = (packageId: string) => {
    console.log("Selecting package:", packageId);
    setSelectedPackage(packageId);
  };

  const handleConfirmSelection = async (packageId: string) => {
    setIsConfirming(true);
    try {
      await onSelect(packageId);
    } finally {
      setIsConfirming(false);
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
        <p className="text-yellow-800 mb-4">
          No packages available for {eventType} events.
        </p>
        <p className="text-sm text-yellow-600">
          Please select a different event type or contact support.
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  // Render packages
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Package Cards Grid */}
        <div className="w-full md:w-2/3">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Select a Package</h2>
            <p className="text-muted-foreground">
              Choose a package for your {eventType} event.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {packages.map((pkg) => {
              const isSelected = selectedPackage === pkg.package_id;
              return (
                <Card
                  key={getPackageId(pkg)}
                  className={`overflow-hidden cursor-pointer transition-all duration-200 h-full flex flex-col p-4 border border-gray-200 bg-white ${
                    isSelected
                      ? "ring-2 ring-green-500 shadow-lg border-green-200"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => handleSelect(getPackageId(pkg))}
                >
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="mb-2">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                        {getPackageTitle(pkg)}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {getPackageDescription(pkg)}
                      </p>
                    </div>
                    <div className="mb-4 flex items-center gap-4">
                      <span className="text-2xl font-bold text-brand-600">
                        {formatCurrency(getPackagePrice(pkg))}
                      </span>
                      <span className="text-xs text-gray-500">
                        up to {getGuestCapacity(pkg)} guests
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Button
                      className={`w-full py-2 text-base font-semibold rounded-lg transition-all ${
                        isSelected
                          ? "bg-brand-500 hover:bg-brand-600 text-white shadow"
                          : "border-brand-500 text-brand-500 hover:bg-brand-50"
                      }`}
                      variant={isSelected ? "default" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(getPackageId(pkg));
                      }}
                    >
                      {isSelected ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5" />
                          Selected
                        </div>
                      ) : (
                        "View Details"
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="w-full md:w-1/3">
          {selectedPackage &&
            (() => {
              const pkg = packages.find(
                (p) => getPackageId(p) === selectedPackage
              );
              if (!pkg) return null;
              const inclusions = getInclusionItems(pkg);
              const venues = getVenuePreviews(pkg);
              const freebies = pkg.freebies || [];
              return (
                <Card className="sticky top-4 border-green-200">
                  <CardHeader className="bg-green-50">
                    <h3 className="text-green-800 text-xl font-bold">
                      {getPackageTitle(pkg)}
                    </h3>
                    <CardDescription className="text-green-600">
                      {getPackageDescription(pkg)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-brand-600">
                        {formatCurrency(getPackagePrice(pkg))}
                      </span>
                      <span className="text-xs text-gray-500">
                        up to {getGuestCapacity(pkg)} guests
                      </span>
                    </div>
                    {/* Inclusions */}
                    <div>
                      <div className="font-medium text-green-800 mb-1">
                        Inclusions
                      </div>
                      <ul className="text-sm text-gray-700 list-disc list-inside pl-2 max-h-32 overflow-y-auto">
                        {inclusions.length > 0 ? (
                          inclusions.map((item, i) => (
                            <li key={i} className="truncate">
                              {item}
                            </li>
                          ))
                        ) : (
                          <li className="italic text-gray-400">
                            No inclusions specified
                          </li>
                        )}
                      </ul>
                    </div>
                    {/* Venues */}
                    {venues.length > 0 && (
                      <div>
                        <div className="font-medium text-green-800 mb-1">
                          Venues
                        </div>
                        <ul className="text-sm text-gray-700 list-disc list-inside pl-2 max-h-24 overflow-y-auto">
                          {venues.map((venue, i) => (
                            <li key={i} className="truncate">
                              {venue.venue_title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Freebies */}
                    {freebies.length > 0 && (
                      <div>
                        <div className="font-medium text-green-800 mb-1">
                          Freebies
                        </div>
                        <ul className="text-sm text-gray-700 list-disc list-inside pl-2 max-h-24 overflow-y-auto">
                          {freebies.map((freebie, i) => (
                            <li key={i} className="truncate">
                              {typeof freebie === "string"
                                ? freebie
                                : freebie.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white"
                      disabled={isConfirming}
                      onClick={() => handleConfirmSelection(getPackageId(pkg))}
                    >
                      {isConfirming ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Confirm Package Selection
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })()}
        </div>
      </div>
    </div>
  );
}
