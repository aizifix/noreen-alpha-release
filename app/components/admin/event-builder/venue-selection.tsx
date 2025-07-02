"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  MapPin,
  Check,
  Phone,
  MapPinned,
  Users,
  Calendar,
  DollarSign,
  Grid3X3,
  List,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrency } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface VenueSelectionProps {
  venues: any[];
  eventType: string;
  initialVenueId?: string;
  initialPackageId?: string;
  initialGuestCount?: number;
  onSelect: (venueId: string, packageId: string, guestCount: number) => void;
}

export function VenueSelection({
  venues,
  eventType,
  initialVenueId,
  initialPackageId,
  initialGuestCount = 100,
  onSelect,
}: VenueSelectionProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string>(
    initialVenueId || ""
  );
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    initialPackageId || ""
  );
  const [guestCount, setGuestCount] = useState<number>(initialGuestCount);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredVenues, setFilteredVenues] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);

  // Filter venues based on search query
  useEffect(() => {
    const venuesFilteredBySearch = venues.filter(
      (venue: any) =>
        venue.venue_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.venue_location?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredVenues(venuesFilteredBySearch);
  }, [searchQuery, venues]);

  // Update selected venue when ID changes
  useEffect(() => {
    if (selectedVenueId) {
      const venue = filteredVenues.find(
        (v: any) => String(v.venue_id) === String(selectedVenueId)
      );
      setSelectedVenue(venue || null);
    } else {
      setSelectedVenue(null);
    }
  }, [selectedVenueId, filteredVenues]);

  // Handle venue selection
  const handleVenueSelect = (venueId: string) => {
    setSelectedVenueId(venueId);
    // Do NOT call onSelect here
  };

  // Handle guest count change
  const handleGuestCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = Number.parseInt(e.target.value);
    if (!isNaN(count) && count > 0) {
      setGuestCount(count);
      if (selectedVenueId && selectedPackageId) {
        onSelect(selectedVenueId, selectedPackageId, count);
      }
    }
  };

  // Calculate total venue cost including inclusions
  const calculateVenueCost = () => {
    if (!selectedVenue) return 0;

    // Use the calculated total_venue_price if available from backend
    if (selectedVenue.total_venue_price) {
      return parseFloat(selectedVenue.total_venue_price);
    }

    // Fallback to manual calculation
    let total = 0;

    // Add base venue price if it exists
    if (selectedVenue.venue_price) {
      total += parseFloat(selectedVenue.venue_price) || 0;
    }

    // Add cost of venue inclusions
    if (selectedVenue.inclusions && Array.isArray(selectedVenue.inclusions)) {
      total += selectedVenue.inclusions.reduce(
        (sum: number, inclusion: any) => {
          const price = parseFloat(inclusion?.inclusion_price) || 0;
          return sum + price;
        },
        0
      );
    }

    return total;
  };

  // Calculate base venue price and inclusions total separately
  const getVenueBasePricing = () => {
    if (!selectedVenue) return { basePrice: 0, inclusionsTotal: 0 };

    const basePrice = parseFloat(selectedVenue.venue_price) || 0;

    // Use calculated inclusions_total if available from backend
    const inclusionsTotal = selectedVenue.inclusions_total
      ? parseFloat(selectedVenue.inclusions_total)
      : (selectedVenue.inclusions || []).reduce(
          (sum: number, inclusion: any) => {
            return sum + (parseFloat(inclusion?.inclusion_price) || 0);
          },
          0
        );

    return { basePrice, inclusionsTotal };
  };

  // Function to get proper image URL
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return "/placeholder.svg";

    // If the image path already contains a full URL, use it as is
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    // Use the image serving script for proper image delivery
    return `http://localhost/events-api/serve-image.php?path=${encodeURIComponent(imagePath)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select a Venue</h2>
        <p className="text-muted-foreground">
          Choose a venue from the available options for your {eventType} event.
        </p>
      </div>

      <Alert className="border-green-200 bg-green-50">
        <AlertDescription className="flex items-center text-green-800">
          <Users className="h-4 w-4 mr-2" />
          <span>
            The number of guests affects the total cost. Please ensure the venue
            can accommodate your guest count.
          </span>
        </AlertDescription>
      </Alert>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3">
          <div className="mb-4 flex items-center justify-between">
            <Input
              type="search"
              placeholder="Search venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm focus:ring-green-500 focus:border-green-500"
            />
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className={`h-8 w-8 ${
                  viewMode === "grid"
                    ? "bg-brand-500 hover:bg-brand-600 text-white"
                    : "border-brand-500 text-brand-500 hover:bg-brand-50"
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className={`h-8 w-8 ${
                  viewMode === "list"
                    ? "bg-brand-500 hover:bg-brand-600 text-white"
                    : "border-brand-500 text-brand-500 hover:bg-brand-50"
                }`}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {filteredVenues.length > 0 ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
                  : "space-y-4"
              }
            >
              {filteredVenues.map((venue: any) => (
                <Card
                  key={venue.venue_id}
                  className={`overflow-hidden cursor-pointer transition-all duration-200 h-full flex flex-col ${
                    selectedVenueId === String(venue.venue_id)
                      ? "ring-2 ring-green-500 shadow-lg"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => handleVenueSelect(String(venue.venue_id))}
                >
                  <div className="relative h-24 bg-gradient-to-r from-brand-50 to-brand-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-brand-600 mb-1">
                        {filteredVenues.indexOf(venue) + 1}
                      </div>
                      <div className="text-sm text-brand-500 font-medium">
                        Venue Option
                      </div>
                    </div>
                    {selectedVenueId === String(venue.venue_id) && (
                      <div className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full bg-brand-500 text-white">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2">
                      <Badge
                        variant="secondary"
                        className="bg-white/90 text-black"
                      >
                        {formatCurrency(parseFloat(venue.venue_price) || 0)}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="flex-none">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="truncate">
                          {venue.venue_title}
                        </CardTitle>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">
                            {venue.venue_location}
                          </span>
                        </div>
                        {venue.venue_capacity && (
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <Users className="h-3 w-3 mr-1" />
                            <span>Capacity: {venue.venue_capacity} guests</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {venue.venue_details || "No description available"}
                    </p>

                    {venue.inclusions && venue.inclusions.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Available Add-ons:
                        </h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {venue.inclusions
                            .slice(0, 2)
                            .map((inclusion: any) => (
                              <div
                                key={`${venue.venue_id}-inclusion-${inclusion.inclusion_id}`}
                                className="p-3 bg-green-50 rounded-lg border border-green-200"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-green-800">
                                    {inclusion.inclusion_name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="border-green-500 text-green-600"
                                  >
                                    {formatCurrency(
                                      parseFloat(inclusion?.inclusion_price) ||
                                        0
                                    )}
                                  </Badge>
                                </div>
                                {inclusion.components &&
                                  inclusion.components.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-xs text-green-700 font-medium">
                                        Includes:
                                      </p>
                                      <div className="grid grid-cols-1 gap-1">
                                        {inclusion.components
                                          .slice(0, 3)
                                          .map(
                                            (component: any, index: number) => (
                                              <div
                                                key={`${venue.venue_id}-${inclusion.inclusion_id}-${component.component_id}-${index}`}
                                                className="flex items-center space-x-1 text-xs text-green-600"
                                              >
                                                <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                <span className="truncate">
                                                  {component.component_name}
                                                </span>
                                              </div>
                                            )
                                          )}
                                        {inclusion.components.length > 3 && (
                                          <p className="text-xs text-green-600 italic">
                                            +{inclusion.components.length - 3}{" "}
                                            more items
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            ))}
                          {venue.inclusions.length > 2 && (
                            <p className="text-xs text-muted-foreground text-center italic">
                              +{venue.inclusions.length - 2} more add-ons
                              available
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="mt-auto">
                    <Button
                      className={`w-full ${
                        selectedVenueId === String(venue.venue_id)
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "border-green-500 text-green-500 hover:bg-green-50"
                      }`}
                      variant={
                        selectedVenueId === String(venue.venue_id)
                          ? "default"
                          : "outline"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVenueSelect(String(venue.venue_id));
                      }}
                    >
                      {selectedVenueId === String(venue.venue_id) ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Selected
                        </>
                      ) : (
                        "Select Venue"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg border-green-200">
              <div className="mx-auto h-12 w-12 text-green-500 mb-4">
                <MapPin className="h-12 w-12" />
              </div>
              <p className="text-muted-foreground mb-2">
                No venues found matching your search.
              </p>
              <p className="text-sm text-muted-foreground">
                Please adjust your search or contact the administrator.
              </p>
            </div>
          )}
        </div>

        <div className="w-full md:w-1/3">
          <Card className="sticky top-4 border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-800">Venue Details</CardTitle>
              <CardDescription className="text-green-600">
                Configure your venue selection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label
                  htmlFor="guest-count"
                  className="flex items-center font-medium"
                >
                  <Users className="h-4 w-4 mr-2 text-green-500" />
                  Number of Guests
                </Label>
                <Input
                  id="guest-count"
                  type="number"
                  min="1"
                  value={guestCount}
                  onChange={handleGuestCountChange}
                  className={`focus:ring-green-500 focus:border-green-500 ${
                    selectedVenue && guestCount > selectedVenue.venue_capacity
                      ? "border-amber-500"
                      : ""
                  }`}
                />
                {selectedVenue && guestCount > selectedVenue.venue_capacity && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ This exceeds the venue's capacity of{" "}
                    {selectedVenue.venue_capacity} guests.
                  </p>
                )}
              </div>

              {selectedVenue && (
                <div className="space-y-4 pt-4 border-t border-green-200">
                  <h4 className="font-medium text-green-800">Selected Venue</h4>

                  <div className="space-y-3">
                    <div className="relative h-24 rounded-lg overflow-hidden">
                      <Image
                        src={getImageUrl(selectedVenue.venue_profile_picture)}
                        alt={selectedVenue.venue_title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg";
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="font-medium text-green-800">
                        {selectedVenue.venue_title}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {selectedVenue.venue_location}
                      </div>
                      {selectedVenue.venue_capacity && (
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          Capacity: {selectedVenue.venue_capacity} guests
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedVenue.inclusions &&
                    selectedVenue.inclusions.length > 0 && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem
                          value="inclusions"
                          className="border-green-200"
                        >
                          <AccordionTrigger className="text-green-800 hover:text-green-900">
                            Venue Add-ons ({selectedVenue.inclusions.length})
                          </AccordionTrigger>
                          <AccordionContent className="space-y-3 pt-2">
                            {selectedVenue.inclusions.map((inclusion: any) => (
                              <div
                                key={`${selectedVenue.venue_id}-sidebar-inclusion-${inclusion.inclusion_id}`}
                                className="p-3 bg-green-50 rounded-lg border border-green-200"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium text-green-800">
                                    {inclusion.inclusion_name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="border-green-500 text-green-600 ml-2"
                                  >
                                    {formatCurrency(
                                      parseFloat(inclusion?.inclusion_price) ||
                                        0
                                    )}
                                  </Badge>
                                </div>
                                {inclusion.components &&
                                  inclusion.components.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-xs text-green-700 font-medium">
                                        What's included:
                                      </p>
                                      <div className="grid grid-cols-1 gap-1">
                                        {inclusion.components.map(
                                          (component: any, index: number) => (
                                            <div
                                              key={`${selectedVenue.venue_id}-${inclusion.inclusion_id}-${component.component_id}-${index}`}
                                              className="flex items-center space-x-1 text-xs text-green-600"
                                            >
                                              <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                              <span>
                                                {component.component_name}
                                              </span>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                  <div className="pt-4 space-y-2">
                    {(() => {
                      const { basePrice, inclusionsTotal } =
                        getVenueBasePricing();
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Base Venue Price:</span>
                            <span>{formatCurrency(basePrice)}</span>
                          </div>
                          {inclusionsTotal > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Inclusions Total:</span>
                              <span>{formatCurrency(inclusionsTotal)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold text-green-800 pt-2 border-t border-green-200">
                            <span>Total Venue Cost:</span>
                            <span>{formatCurrency(calculateVenueCost())}</span>
                          </div>
                          {selectedVenue.inclusions &&
                            selectedVenue.inclusions.length > 0 && (
                              <div className="text-xs text-muted-foreground pt-1">
                                * Includes {selectedVenue.inclusions.length}{" "}
                                add-on package
                                {selectedVenue.inclusions.length > 1 ? "s" : ""}
                              </div>
                            )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-brand-500 hover:bg-brand-600 text-white"
                disabled={!selectedVenueId}
                onClick={() =>
                  onSelect(selectedVenueId, selectedPackageId, guestCount)
                }
              >
                {selectedVenueId ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm Venue Selection
                  </>
                ) : (
                  "Select a Venue First"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
