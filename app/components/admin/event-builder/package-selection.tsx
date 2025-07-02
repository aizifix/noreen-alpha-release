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
  onSelect: (packageId: string) => void;
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
    onSelect(packageId);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => {
          const isSelected = selectedPackage === pkg.package_id;
          return (
            <Card
              key={getPackageId(pkg)}
              className={`relative overflow-hidden transition-all cursor-pointer hover:shadow-md h-full flex flex-col ${
                isSelected
                  ? "ring-2 ring-green-500 shadow-lg border-green-200"
                  : "hover:border-green-200"
              }`}
              onClick={() => handleSelect(getPackageId(pkg))}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {getPackageTitle(pkg)}
                    </h3>
                    <CardDescription>
                      {getPackageDescription(pkg)}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    {/* Show price range if venue pricing is available */}
                    {"total_price_range" in pkg && pkg.total_price_range ? (
                      <div>
                        <div className="text-lg font-bold">
                          {pkg.total_price_range.min ===
                          pkg.total_price_range.max
                            ? formatCurrency(pkg.total_price_range.min)
                            : `${formatCurrency(pkg.total_price_range.min)} - ${formatCurrency(pkg.total_price_range.max)}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Package + Venue
                        </div>
                        <div className="text-xs text-green-600">
                          Base: {formatCurrency(getPackagePrice(pkg))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(getPackagePrice(pkg))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          + Venue pricing
                        </div>
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground mt-1">
                      up to {getGuestCapacity(pkg)} guests
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                {/* Inclusions Section */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Inclusions ({getInclusionItems(pkg).length})
                  </h4>
                  {getInclusionItems(pkg).length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {getInclusionItems(pkg)
                          .slice(0, 6)
                          .map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <Check className="h-4 w-4 text-brand-500" />
                              {item}
                            </div>
                          ))}
                      </div>
                      {getInclusionItems(pkg).length > 6 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          +{getInclusionItems(pkg).length - 6} more inclusions
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No inclusions specified
                    </div>
                  )}
                </div>

                {/* Venues Section */}
                {getVenueCount(pkg) > 0 && (
                  <div
                    className={`p-3 rounded-lg ${isSelected ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}
                  >
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M3 21h18" />
                        <path d="M19 21v-4" />
                        <path d="M19 17a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-2" />
                        <path d="M5 21v-16a2 2 0 0 1 2-2h8" />
                        <path d="M9 21v-4" />
                        <path d="M9 5v4" />
                        <path d="M9 13v4" />
                        <path d="M14 5h.01" />
                        <path d="M14 9h.01" />
                        <path d="M14 13h.01" />
                        <path d="M14 17h.01" />
                      </svg>
                      {getVenueCount(pkg) > 1
                        ? `Choose from ${getVenueCount(pkg)} venues`
                        : `${getVenueCount(pkg)} venue available`}
                    </h4>
                    {isSelected && getVenueCount(pkg) > 1 && (
                      <div className="text-xs text-primary font-medium mb-2">
                        You'll choose your preferred venue in the next step
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {getVenuePreviews(pkg).map((venue, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-lg overflow-hidden">
                            {venue.venue_profile_picture ? (
                              <img
                                src={venue.venue_profile_picture}
                                alt={venue.venue_title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-muted flex items-center justify-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-muted-foreground"
                                >
                                  <path d="M3 21h18" />
                                  <path d="M19 21v-4" />
                                  <path d="M19 17a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-2" />
                                  <path d="M5 21v-16a2 2 0 0 1 2-2h8" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {venue.venue_title}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Freebies Section */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Freebies ({getFreebiesCount(pkg)})
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    {getFreebiesCount(pkg) > 0 ? (
                      getFreebiesText(pkg)
                    ) : (
                      <span className="italic">No freebies available</span>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button
                  className={`w-full transition-all ${
                    isSelected
                      ? "bg-brand-500 hover:bg-brand-600 text-white"
                      : "border-brand-500 text-brand-500 hover:bg-brand-50"
                  }`}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => handleSelect(getPackageId(pkg))}
                >
                  {isSelected ? (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Selected
                    </div>
                  ) : (
                    "Select Package"
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
