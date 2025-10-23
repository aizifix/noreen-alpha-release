"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Image from "next/image";
import { MapPin, Check, Users, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { endpoints } from "@/app/config/api";

interface VenueSelectionProps {
  venues: any[];
  eventType: string;
  initialVenueId?: string;
  initialPackageId?: string;
  initialGuestCount?: number;
  currentGuestCount?: number;
  onSelect: (
    venueId: string,
    packageId: string,
    guestCount: number
  ) => Promise<void>;
  // New props for handling "start from scratch" scenario
  isStartFromScratch?: boolean;
  onVenuesLoaded?: (venues: any[]) => void;
  // Venue buffer fee from package
  venueBufferFee?: number | null;
}

export function VenueSelection({
  venues,
  eventType,
  initialVenueId,
  initialPackageId,
  initialGuestCount = 100,
  currentGuestCount,
  onSelect,
  isStartFromScratch = false,
  onVenuesLoaded,
  venueBufferFee = 0,
}: VenueSelectionProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string>(
    initialVenueId || ""
  );
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    initialPackageId || ""
  );
  const [guestCount, setGuestCount] = useState<number>(
    currentGuestCount || initialGuestCount
  );
  const [guestCountInput, setGuestCountInput] = useState<string>(
    String(currentGuestCount || initialGuestCount)
  );

  // Debug logging for guest count props
  console.log("🎯 VenueSelection guest count props:", {
    currentGuestCount,
    initialGuestCount,
    finalGuestCount: currentGuestCount || initialGuestCount
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredVenues, setFilteredVenues] = useState<any[]>([]);
  const [showVenueDetailsModal, setShowVenueDetailsModal] = useState(false);
  const [selectedVenueForModal, setSelectedVenueForModal] = useState<
    any | null
  >(null);

  // New state for handling "start from scratch" scenario
  const [isLoadingVenues, setIsLoadingVenues] = useState(false);
  const [allVenues, setAllVenues] = useState<any[]>([]);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [isUpdatingGuestCount, setIsUpdatingGuestCount] = useState(false);

  // Update guest count when currentGuestCount prop changes
  useEffect(() => {
    if (currentGuestCount && currentGuestCount !== guestCount) {
      console.log("🔄 Updating guest count from prop:", currentGuestCount);
      setGuestCount(currentGuestCount);
      setGuestCountInput(String(currentGuestCount));
    }
  }, [currentGuestCount, guestCount]);

  // Fetch all venues when in "start from scratch" mode and no venues are provided
  useEffect(() => {
    if (isStartFromScratch && (!venues || venues.length === 0)) {
      fetchAllVenues();
    }
  }, [isStartFromScratch, venues]);

  // Function to fetch all venues from the database
  const fetchAllVenues = async () => {
    try {
      setIsLoadingVenues(true);
      setVenuesError(null);

      const response = await axios.post(
        `${endpoints.admin}`,
        { operation: "getAllAvailableVenues" },
        { headers: { "Content-Type": "application/json" } }
      );
      const data = response.data;
      console.log("API Response:", data);

      if (data.status === "success") {
        const fetchedVenues = data.venues || [];
        console.log(
          `Fetched ${fetchedVenues.length} venues for start from scratch mode`
        );
        console.log("Raw venue data:", fetchedVenues);

        // Process venues to include proper pricing and pax rates
        const processedVenues = fetchedVenues.map((venue: any) => {
          const processedVenue = {
            ...venue,
            venue_id: venue.venue_id,
            venue_title: venue.venue_title,
            venue_location: venue.venue_location,
            venue_price: parseFloat(venue.venue_price || 0),
            extra_pax_rate: parseFloat(venue.extra_pax_rate || 0),
            venue_capacity: parseInt(venue.venue_capacity || 100),
            venue_type: venue.venue_type || "indoor",
            venue_profile_picture: venue.venue_profile_picture,
            venue_cover_photo: venue.venue_cover_photo,
            inclusions: [], // Will be populated if needed
            is_active: venue.is_active,
            venue_status: venue.venue_status,
          };

          // Debug logging for extra pax rate
          console.log(
            `Venue: ${processedVenue.venue_title}, Extra Pax Rate: ${processedVenue.extra_pax_rate}`
          );

          return processedVenue;
        });

        setAllVenues(processedVenues);
        if (onVenuesLoaded) {
          onVenuesLoaded(processedVenues);
        }
      } else {
        throw new Error(data.message || "Failed to fetch venues");
      }
    } catch (error) {
      console.error("Error fetching all venues:", error);

      // Handle fetch errors
      setVenuesError(
        error instanceof Error ? error.message : "Failed to fetch venues"
      );
    } finally {
      setIsLoadingVenues(false);
    }
  };

  // Determine which venues to use
  const venuesToUse = venues && venues.length > 0 ? venues : allVenues;

  // Update guest count when currentGuestCount prop changes
  useEffect(() => {
    if (currentGuestCount && currentGuestCount !== guestCount) {
      setGuestCount(currentGuestCount);
      setGuestCountInput(String(currentGuestCount));
    }
  }, [currentGuestCount, guestCount]);

  // Only update selection when venue changes, not on every guest count change
  useEffect(() => {
    if (selectedVenueId && guestCount > 0) {
      onSelect(selectedVenueId, selectedPackageId, guestCount);
    }
  }, [selectedVenueId, selectedPackageId, onSelect]);

  // Filter venues based on search query
  useEffect(() => {
    if (!venuesToUse || !Array.isArray(venuesToUse)) {
      setFilteredVenues([]);
      return;
    }

    // Check if venues have pax rate data
    const venuesWithPaxRates = venuesToUse.filter(
      (venue: any) => parseFloat(venue.extra_pax_rate || 0) > 0
    );
    console.log(`Total venues: ${venuesToUse.length}`);
    console.log(`Venues with pax rates: ${venuesWithPaxRates.length}`);

    // Debug: Log all venues and their pax rates
    venuesToUse.forEach((venue: any) => {
      console.log(
        `Venue: ${venue.venue_title} - Pax Rate: ${venue.extra_pax_rate} (${typeof venue.extra_pax_rate})`
      );
    });

    if (venuesWithPaxRates.length > 0) {
      console.log(`Found ${venuesWithPaxRates.length} venues with pax rates`);
    } else {
      console.warn("No venues found with pax rates!");
    }

    const venuesFilteredBySearch = venuesToUse.filter(
      (venue: any) =>
        venue.venue_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.venue_location?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredVenues(venuesFilteredBySearch);
  }, [searchQuery, venuesToUse]);

  // Handle venue selection
  const handleVenueSelect = async (venueId: string) => {
    setSelectedVenueId(venueId);
    // Set default guest count to 100 when venue is first selected
    setGuestCount(100);
    setGuestCountInput("100");
    // Automatically call onSelect when venue is selected with default guest count
    await onSelect(venueId, selectedPackageId, 100);
  };

  // Handle guest count input changes
  const handleGuestCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setGuestCountInput(inputValue);
  };

  // Handle guest count input blur (when user finishes typing)
  const handleGuestCountBlur = async (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    const value = parseInt(e.target.value) || 100;
    const clampedValue = Math.max(1, Math.min(1000, value));
    setGuestCountInput(String(clampedValue));

    // Update guest count and call onSelect if we have a selected venue
    if (selectedVenueId && clampedValue !== guestCount) {
      setIsUpdatingGuestCount(true);
      try {
        setGuestCount(clampedValue);
        await onSelect(selectedVenueId, selectedPackageId, clampedValue);
      } finally {
        setIsUpdatingGuestCount(false);
      }
    }
  };

  // Handle calculate button click
  const handleCalculate = async () => {
    if (!selectedVenueId) {
      return;
    }

    const value = parseInt(guestCountInput) || 100;
    const clampedValue = Math.max(1, Math.min(1000, value));
    setGuestCountInput(String(clampedValue));

    setIsUpdatingGuestCount(true);
    try {
      setGuestCount(clampedValue);
      await onSelect(selectedVenueId, selectedPackageId, clampedValue);
    } finally {
      setIsUpdatingGuestCount(false);
    }
  };

  // Handle Enter key press
  const handleGuestCountKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  // Handle venue details modal
  const handleVenueDetailsClick = (venue: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVenueForModal(venue);
    setShowVenueDetailsModal(true);
  };

  // Function to get proper image URL
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath)
      return `${endpoints.serveImage}?path=${encodeURIComponent("uploads/user_profile/default_pfp.png")}`;

    // If the image path already contains a full URL, use it as is
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    // Handle case where imagePath might be a JSON object instead of just a file path
    let actualPath = imagePath;
    try {
      // Try to parse as JSON - if it's a JSON object, extract the filePath
      const parsed = JSON.parse(imagePath);
      if (parsed && typeof parsed === "object" && parsed.filePath) {
        actualPath = parsed.filePath;
      }
    } catch (e) {
      // If parsing fails, it's not JSON, so use the original path
      actualPath = imagePath;
    }

    // Use the serve-image.php script for proper image serving
    return `${endpoints.serveImage}?path=${encodeURIComponent(actualPath)}`;
  };

  // Helper function to calculate venue cost using the new formula
  const calculateVenueCost = (
    guestCount: number,
    venueRate: string | number,
    venueBufferFee: number = 0
  ) => {
    const rate = parseFloat(String(venueRate)) || 0;
    const clientPax = guestCount;

    // Calculate actual venue cost: VenueRate × ClientPax
    const actualVenueCost = rate * clientPax;

    // Calculate excess payment: MAX(0, ActualVenueCost - VenueBuffer)
    const excessPayment = Math.max(0, actualVenueCost - venueBufferFee);

    return {
      actualVenueCost,
      excessPayment,
      venueBufferFee,
    };
  };

  // Helper function to get current guest count safely
  const getCurrentGuestCount = () => currentGuestCount || guestCount;

  // Show loading state
  if (isLoadingVenues) {
    return (
      <div className="space-y-6">
        {/* <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Venue Selection
          </h2>
          <p className="text-gray-600">
            {isStartFromScratch
              ? "Loading all available venues for your custom event..."
              : "Choose a venue and set your expected guest count to see overflow charges"}
          </p>
        </div> */}

        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#028A75] mx-auto mb-4" />
            <p className="text-gray-600">Loading venues...</p>
            <p className="text-sm text-gray-500 mt-1">
              {isStartFromScratch
                ? "Fetching all available venues from the database"
                : "Please wait while we load the venue options"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (venuesError) {
    return (
      <div className="space-y-6">
        {/* <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Venue Selection
          </h2>
          <p className="text-gray-600">
            {isStartFromScratch
              ? "Loading all available venues for your custom event..."
              : "Choose a venue and set your expected guest count to see overflow charges"}
          </p>
        </div> */}

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <X className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Error Loading Venues
            </h3>
            <p className="text-red-700 mb-4">{venuesError}</p>
            <Button
              onClick={fetchAllVenues}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Event Mode Notice */}
      {isStartFromScratch && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>Custom Event Mode:</strong> You're creating an event from
            scratch. All available venues are shown below. Select any venue that
            fits your needs.
          </p>
        </div>
      )}

      {/* Guest Count Input */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="block text-sm font-medium text-blue-900 mb-2">
              Expected Guest Count
            </label>
            <div className="flex items-center space-x-4">
              <Input
                type="number"
                min="1"
                max="1000"
                value={guestCountInput}
                onChange={handleGuestCountChange}
                onBlur={handleGuestCountBlur}
                onKeyDown={handleGuestCountKeyDown}
                className="w-32"
                placeholder="100"
                disabled={isUpdatingGuestCount}
              />
              <span className="text-sm text-blue-700">guests</span>
              <Button
                onClick={handleCalculate}
                disabled={!selectedVenueId || isUpdatingGuestCount}
                size="sm"
                className="bg-[#028A75] hover:bg-[#027A65] text-white"
              >
                {isUpdatingGuestCount ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Calculate"
                )}
              </Button>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Venue buffer fee is included in package price. Additional charges
              apply if actual venue cost (rate × guest count) exceeds the
              buffer. Click "Calculate" to update pricing.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between">
        <Input
          type="search"
          placeholder="Search venues..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Selected Venue Summary */}
      {selectedVenueId &&
        (() => {
          const selectedVenue = venuesToUse.find(
            (v) => String(v.venue_id) === selectedVenueId
          );
          if (!selectedVenue) return null;

          const venueRate = parseFloat(selectedVenue.extra_pax_rate || 0) || 0;
          // Use venue buffer fee from package, fallback to venue price for start from scratch
          const displayVenueBufferFee = isStartFromScratch
            ? parseFloat(selectedVenue.venue_price || 0) || 0
            : venueBufferFee || 0;

          const venueCost = calculateVenueCost(
            guestCount,
            venueRate,
            displayVenueBufferFee
          );

          console.log("🏢 Venue Selection - Buffer Fee Display:", {
            isStartFromScratch,
            venueBufferFee,
            selectedVenuePrice: parseFloat(selectedVenue.venue_price || 0),
            displayVenueBufferFee,
            venueCost,
          });

          return (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-900">
                    Selected: {selectedVenue.venue_title}
                  </h3>
                  <p className="text-sm text-green-700">
                    Guest count: {guestCount}
                  </p>
                  {venueRate > 0 && (
                    <p className="text-xs text-blue-700 mt-1">
                      Venue rate: {formatCurrency(venueRate)} per guest
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-700">
                    Venue buffer fee: {formatCurrency(displayVenueBufferFee)}{" "}
                    (included in package)
                  </div>
                  <div className="text-sm text-blue-700">
                    Actual venue cost:{" "}
                    {formatCurrency(venueCost.actualVenueCost)}
                  </div>
                  {venueCost.excessPayment > 0 && (
                    <div className="text-sm text-orange-700">
                      Excess payment: +{formatCurrency(venueCost.excessPayment)}
                    </div>
                  )}
                  {venueCost.excessPayment > 0 && (
                    <div className="text-xl font-bold text-green-900">
                      Total Extra: {formatCurrency(venueCost.excessPayment)}
                    </div>
                  )}
                  {venueCost.excessPayment === 0 && (
                    <div className="text-sm text-green-700">
                      No additional charges
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Venue Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredVenues.map((venue: any, index: number) => {
          const isSelected = selectedVenueId === String(venue.venue_id);

          return (
            <Card
              key={`venue-${venue.venue_id ?? index}`}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected ? "ring-2 ring-[#028A75] border-[#028A75]" : ""
              }`}
              onClick={() => handleVenueSelect(String(venue.venue_id))}
            >
              {/* Cover Photo */}
              <div className="relative h-48 bg-gray-200">
                {venue.venue_cover_photo ? (
                  <Image
                    src={getImageUrl(venue.venue_cover_photo)}
                    alt={`${venue.venue_title} cover`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `${endpoints.serveImage}?path=${encodeURIComponent("uploads/user_profile/default_pfp.png")}`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <MapPin className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {/* Profile Picture Overlay */}
                <div className="absolute -bottom-5 left-4">
                  <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden">
                    <Image
                      src={getImageUrl(venue.venue_profile_picture)}
                      alt={venue.venue_title}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `${endpoints.serveImage}?path=${encodeURIComponent("uploads/user_profile/default_pfp.png")}`;
                      }}
                    />
                  </div>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full bg-[#028A75] text-white">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>

              <CardHeader className="pt-7 pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{venue.venue_title}</CardTitle>
                  {isSelected && <Check className="h-5 w-5 text-[#028A75]" />}
                </div>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="truncate">{venue.venue_location}</span>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-[#028A75]">
                        {formatCurrency(parseFloat(venue.extra_pax_rate) || 0)}
                      </span>
                      <span className="text-xs text-blue-600">
                        Per guest rate
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-1" />
                      {venue.venue_capacity || 0} guests
                    </div>
                  </div>

                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{venue.inclusions?.length || 0} add-ons</span>
                    <span>Available</span>
                  </div>

                  {/* Venue Buffer Fee Information */}
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="text-xs text-green-800 font-medium mb-1">
                      Venue Buffer Fee Included
                    </div>
                    <div className="text-xs text-green-700">
                      Package price includes venue buffer fee. Additional
                      charges apply if actual venue cost exceeds buffer.
                    </div>
                    {guestCount > 0 &&
                      parseFloat(venue.extra_pax_rate || 0) > 0 && (
                        <div className="text-xs text-green-700 mt-1">
                          Total venue cost:{" "}
                          {formatCurrency(
                            parseFloat(venue.extra_pax_rate || 0) * guestCount
                          )}{" "}
                          for {guestCount} guests
                        </div>
                      )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVenueSelect(String(venue.venue_id));
                      }}
                    >
                      {isSelected ? "Selected" : "Select Venue"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVenueDetailsClick(venue, e);
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

      {filteredVenues.length === 0 && (
        <div className="text-center py-12 border rounded-lg border-gray-200">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
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

      {/* Venue Details Modal */}
      <Dialog
        open={showVenueDetailsModal}
        onOpenChange={setShowVenueDetailsModal}
      >
        <DialogContent className="max-w-3xl h-[85vh] mx-auto fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col p-0 gap-0 bg-white rounded-lg">
          {/* Close Button - Top Right */}
          <button
            onClick={() => setShowVenueDetailsModal(false)}
            className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Main Content Container */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header Section */}
            <div className="px-6 pt-6 pb-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-2xl font-semibold text-gray-900">
                  {selectedVenueForModal?.venue_title}
                </DialogTitle>
                <DialogDescription className="text-base text-gray-600">
                  {selectedVenueForModal?.venue_location}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6">
              {selectedVenueForModal && (
                <div className="space-y-8 pb-6">
                  {/* Venue Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center p-6 bg-green-50 rounded-xl">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600">
                        {selectedVenueForModal.venue_capacity || 0}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Maximum Guests
                      </div>
                    </div>
                    <div className="text-center p-6 bg-blue-50 rounded-xl">
                      <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                        {formatCurrency(
                          parseFloat(selectedVenueForModal.extra_pax_rate) || 0
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Per Guest Rate
                      </div>
                    </div>
                    <div className="text-center p-6 bg-purple-50 rounded-xl">
                      <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                        {selectedVenueForModal.inclusions?.length || 0}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Available Add-ons
                      </div>
                    </div>
                  </div>

                  {/* Venue Description */}
                  {selectedVenueForModal.venue_details && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        About This Venue
                      </h4>
                      <p className="text-gray-700 leading-relaxed">
                        {selectedVenueForModal.venue_details}
                      </p>
                    </div>
                  )}

                  {/* Venue Buffer Fee Information */}
                  <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
                    <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Venue Buffer Fee & Cost Calculation
                    </h4>
                    <div className="space-y-3">
                      <p className="text-green-800">
                        The package price includes a{" "}
                        <strong>venue buffer fee</strong>. Additional charges
                        apply only if the actual venue cost exceeds this buffer.
                      </p>
                      <div className="bg-white p-4 rounded-lg border border-green-300">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-green-900 font-medium">
                            Per Guest Rate:
                          </span>
                          <span className="text-green-900 font-bold">
                            {formatCurrency(
                              parseFloat(selectedVenueForModal.extra_pax_rate)
                            )}{" "}
                            per guest
                          </span>
                        </div>
                        <div className="text-sm text-green-700">
                          <p>• Venue buffer fee: Included in package price</p>
                          <p>• Actual venue cost: Rate × Guest Count</p>
                          <p>
                            • Excess payment: MAX(0, Actual Cost - Buffer Fee)
                          </p>
                        </div>
                      </div>

                      {/* Current Guest Count Calculation */}
                      {getCurrentGuestCount() > 0 && (
                        <div className="p-4 rounded-lg border bg-blue-50 border-blue-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-blue-900">
                              Your Event ({getCurrentGuestCount()} guests):
                            </span>
                            <span className="font-bold text-blue-900">
                              {formatCurrency(
                                parseFloat(
                                  selectedVenueForModal.extra_pax_rate
                                ) * getCurrentGuestCount()
                              )}{" "}
                              total venue cost
                            </span>
                          </div>
                          <div className="text-sm text-blue-700">
                            <p>
                              • Actual cost: {getCurrentGuestCount()} ×{" "}
                              {formatCurrency(
                                parseFloat(selectedVenueForModal.extra_pax_rate)
                              )}{" "}
                              ={" "}
                              {formatCurrency(
                                parseFloat(
                                  selectedVenueForModal.extra_pax_rate
                                ) * getCurrentGuestCount()
                              )}
                            </p>
                            <p>
                              • Venue buffer fee: Already included in package
                              price
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Venue Inclusions */}
                  {selectedVenueForModal.inclusions &&
                    selectedVenueForModal.inclusions.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Available Add-ons & Inclusions
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                          {selectedVenueForModal.inclusions.map(
                            (inclusion: any, idx: number) => (
                              <div
                                key={`modal-${selectedVenueForModal.venue_id}-inclusion-${inclusion.inclusion_id ?? 0}-${idx}`}
                                className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="text-lg font-semibold text-gray-900">
                                    {inclusion.inclusion_name}
                                  </h5>
                                  <Badge
                                    variant="outline"
                                    className="border-[#028A75] text-[#028A75] px-3 py-1"
                                  >
                                    {formatCurrency(
                                      parseFloat(inclusion?.inclusion_price) ||
                                        0
                                    )}
                                  </Badge>
                                </div>

                                {inclusion.components &&
                                  inclusion.components.length > 0 && (
                                    <div className="space-y-3">
                                      <p className="text-sm font-medium text-gray-700">
                                        What's included:
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {inclusion.components.map(
                                          (component: any, index: number) => (
                                            <div
                                              key={`modal-${selectedVenueForModal.venue_id}-${inclusion.inclusion_id}-${component.component_id}-${index}`}
                                              className="flex items-center space-x-2 text-sm text-gray-600"
                                            >
                                              <Check className="h-4 w-4 text-[#028A75] flex-shrink-0" />
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
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Pricing Summary */}
                  <div className="bg-gray-50 p-6 rounded-xl">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Pricing Summary
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Venue Buffer Fee:</span>
                        <span className="font-semibold text-green-600">
                          Included in Package Price
                        </span>
                      </div>

                      {/* Venue Cost Calculation */}
                      {parseFloat(selectedVenueForModal.extra_pax_rate) > 0 && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                              Per Guest Rate:
                            </span>
                            <span className="font-semibold text-blue-600">
                              {formatCurrency(
                                parseFloat(selectedVenueForModal.extra_pax_rate)
                              )}{" "}
                              per guest
                            </span>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <div className="text-sm text-blue-800 space-y-1">
                              <p>
                                <strong>Venue Cost Examples:</strong>
                              </p>
                              <p>
                                • 120 guests: 120 ×{" "}
                                {formatCurrency(
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
                                )}{" "}
                                ={" "}
                                {formatCurrency(
                                  120 *
                                    parseFloat(
                                      selectedVenueForModal.extra_pax_rate
                                    )
                                )}
                              </p>
                              <p>
                                • 150 guests: 150 ×{" "}
                                {formatCurrency(
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
                                )}{" "}
                                ={" "}
                                {formatCurrency(
                                  150 *
                                    parseFloat(
                                      selectedVenueForModal.extra_pax_rate
                                    )
                                )}
                              </p>
                              <p>
                                • 200 guests: 200 ×{" "}
                                {formatCurrency(
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
                                )}{" "}
                                ={" "}
                                {formatCurrency(
                                  200 *
                                    parseFloat(
                                      selectedVenueForModal.extra_pax_rate
                                    )
                                )}
                              </p>
                            </div>
                          </div>
                        </>
                      )}

                      {selectedVenueForModal.inclusions &&
                        selectedVenueForModal.inclusions.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                              Inclusions Total:
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(
                                selectedVenueForModal.inclusions.reduce(
                                  (sum: number, inclusion: any) => {
                                    return (
                                      sum +
                                      (parseFloat(inclusion?.inclusion_price) ||
                                        0)
                                    );
                                  },
                                  0
                                )
                              )}
                            </span>
                          </div>
                        )}

                      {/* Venue Cost for Current Guest Count */}
                      {getCurrentGuestCount() > 0 &&
                        parseFloat(selectedVenueForModal.extra_pax_rate) >
                          0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                              Total Venue Cost ({getCurrentGuestCount()}{" "}
                              guests):
                            </span>
                            <span className="font-semibold text-blue-600">
                              {formatCurrency(
                                parseFloat(
                                  selectedVenueForModal.extra_pax_rate
                                ) * getCurrentGuestCount()
                              )}
                            </span>
                          </div>
                        )}

                      <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                        <span className="text-lg font-bold text-gray-900">
                          Additional Venue Cost:
                        </span>
                        <span className="text-xl font-bold text-[#028A75]">
                          {formatCurrency(
                            (getCurrentGuestCount() > 0 &&
                            parseFloat(selectedVenueForModal.extra_pax_rate) > 0
                              ? parseFloat(
                                  selectedVenueForModal.extra_pax_rate
                                ) * getCurrentGuestCount()
                              : 0) +
                              (selectedVenueForModal.inclusions?.reduce(
                                (sum: number, inclusion: any) => {
                                  return (
                                    sum +
                                    (parseFloat(inclusion?.inclusion_price) ||
                                      0)
                                  );
                                },
                                0
                              ) || 0)
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {getCurrentGuestCount() > 0
                          ? `* Total venue cost for ${getCurrentGuestCount()} guests (venue buffer fee already included in package)`
                          : "* Venue buffer fee is included in your package price"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
