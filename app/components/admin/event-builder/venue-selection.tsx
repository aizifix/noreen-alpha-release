"use client";

import { useState, useEffect } from "react";
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

      const response = await fetch("http://localhost/events-api/admin.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "getAllAvailableVenues",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "success") {
        const fetchedVenues = data.venues || [];
        console.log(
          `Fetched ${fetchedVenues.length} venues for start from scratch mode`
        );

        // Process venues to include proper pricing and pax rates
        const processedVenues = fetchedVenues.map((venue: any) => ({
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
        }));

        setAllVenues(processedVenues);
        if (onVenuesLoaded) {
          onVenuesLoaded(processedVenues);
        }
      } else {
        throw new Error(data.message || "Failed to fetch venues");
      }
    } catch (error) {
      console.error("Error fetching all venues:", error);
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
    if (venuesWithPaxRates.length > 0) {
      console.log(`Found ${venuesWithPaxRates.length} venues with pax rates`);
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
    // Automatically call onSelect when venue is selected with current guest count
    await onSelect(venueId, selectedPackageId, guestCount);
  };

  // Handle guest count input changes
  const handleGuestCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setGuestCountInput(inputValue);
  };

  // Handle guest count input blur (when user finishes typing)
  const handleGuestCountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 100;
    const clampedValue = Math.max(1, Math.min(1000, value));
    setGuestCount(clampedValue);
    setGuestCountInput(String(clampedValue));

    // Only call onSelect if we have a selected venue
    if (selectedVenueId) {
      onSelect(selectedVenueId, selectedPackageId, clampedValue);
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
    if (!imagePath) return "/default_pfp.png";

    // If the image path already contains a full URL, use it as is
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    // Use direct URL path to the image
    return `http://localhost/events-api/${imagePath}`;
  };

  // Show loading state
  if (isLoadingVenues) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Venue Selection
          </h2>
          <p className="text-gray-600">
            {isStartFromScratch
              ? "Loading all available venues for your custom event..."
              : "Choose a venue and set your expected guest count to see overflow charges"}
          </p>
        </div>

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
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Venue Selection
          </h2>
          <p className="text-gray-600">
            {isStartFromScratch
              ? "Loading all available venues for your custom event..."
              : "Choose a venue and set your expected guest count to see overflow charges"}
          </p>
        </div>

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
      {/* Step Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Venue Selection
        </h2>
        <p className="text-gray-600">
          {isStartFromScratch
            ? "Choose from all available venues for your custom event"
            : "Choose a venue and set your expected guest count to see overflow charges"}
        </p>
        {isStartFromScratch && (
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Custom Event Mode:</strong> You're creating an event from
              scratch. All available venues are shown below. Select any venue
              that fits your needs.
            </p>
          </div>
        )}
      </div>

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
              />
              <span className="text-sm text-blue-700">guests</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              This will be used to calculate overflow charges for venues with
              extra guest rates
            </p>
          </div>

          {/* Overflow Charge Preview */}
          {selectedVenueId && guestCount > 100 && (
            <div className="text-right">
              <div className="text-sm text-blue-700">
                Selected venue overflow:
              </div>
              <div className="text-lg font-bold text-blue-900">
                {(() => {
                  const selectedVenue = venuesToUse.find(
                    (v) => String(v.venue_id) === selectedVenueId
                  );

                  if (
                    selectedVenue &&
                    parseFloat(selectedVenue.extra_pax_rate || 0) > 0
                  ) {
                    const extraGuests = Math.max(0, guestCount - 100);
                    const overflowCharge =
                      extraGuests *
                      parseFloat(selectedVenue.extra_pax_rate || 0);
                    return formatCurrency(overflowCharge);
                  }
                  return "₱0.00";
                })()}
              </div>
              <div className="text-xs text-blue-600">
                for {guestCount - 100} extra guests
              </div>
            </div>
          )}
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

      {/* Selected Venue Pricing Summary */}
      {selectedVenueId &&
        (() => {
          const selectedVenue = venuesToUse.find(
            (v) => String(v.venue_id) === selectedVenueId
          );
          if (!selectedVenue) return null;

          const basePrice = parseFloat(selectedVenue.venue_price) || 0;
          const extraPaxRate =
            parseFloat(selectedVenue.extra_pax_rate || 0) || 0;
          const overflowCharge =
            guestCount > 100 ? Math.max(0, guestCount - 100) * extraPaxRate : 0;
          const totalPrice = basePrice + overflowCharge;

          return (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-900">
                    Selected: {selectedVenue.venue_title}
                  </h3>
                  <p className="text-sm text-green-700">
                    Guest count: {guestCount} • Base capacity: 100
                  </p>
                  {extraPaxRate > 0 && (
                    <p className="text-xs text-blue-700 mt-1">
                      Extra guest rate: {formatCurrency(extraPaxRate)} per guest
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-700">
                    Base price: {formatCurrency(basePrice)}
                  </div>
                  {overflowCharge > 0 && (
                    <div className="text-sm text-blue-700">
                      Overflow: +{formatCurrency(overflowCharge)}
                    </div>
                  )}
                  <div className="text-xl font-bold text-green-900">
                    Total: {formatCurrency(totalPrice)}
                  </div>
                  {extraPaxRate > 0 && guestCount > 100 && (
                    <div className="text-xs text-blue-600 mt-1">
                      Formula: {guestCount} guests ×{" "}
                      {formatCurrency(extraPaxRate)} ={" "}
                      {formatCurrency(overflowCharge)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Venue Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredVenues.map((venue: any) => {
          const isSelected = selectedVenueId === String(venue.venue_id);

          return (
            <Card
              key={venue.venue_id}
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
                      target.src = "/default_pfp.png";
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
                        target.src = "/default_pfp.png";
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
                        {formatCurrency(parseFloat(venue.venue_price) || 0)}
                      </span>
                      {parseFloat(venue.extra_pax_rate || 0) > 0 && (
                        <span className="text-xs text-blue-600">
                          +{" "}
                          {formatCurrency(
                            parseFloat(venue.extra_pax_rate || 0)
                          )}{" "}
                          per extra guest
                        </span>
                      )}
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

                  {/* Pricing Formula Display */}
                  {parseFloat(venue.extra_pax_rate || 0) > 0 && (
                    <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                      <div className="text-xs text-yellow-800 font-medium mb-1">
                        Pricing Formula:
                      </div>
                      <div className="text-xs text-yellow-700">
                        Base: {formatCurrency(parseFloat(venue.venue_price))}{" "}
                        (100 guests)
                      </div>
                      <div className="text-xs text-yellow-700">
                        Extra:{" "}
                        {formatCurrency(parseFloat(venue.extra_pax_rate || 0))}{" "}
                        per guest beyond 100
                      </div>
                      {guestCount > 100 && (
                        <div className="text-xs text-yellow-900 font-medium mt-1">
                          Your event: {guestCount} ×{" "}
                          {formatCurrency(
                            parseFloat(venue.extra_pax_rate || 0)
                          )}{" "}
                          ={" "}
                          {formatCurrency(
                            Math.max(0, guestCount - 100) *
                              parseFloat(venue.extra_pax_rate || 0)
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pax Rate Information */}
                  {parseFloat(venue.extra_pax_rate || 0) > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-700 font-medium text-sm">
                          Extra Guest Rate:
                        </span>
                        <span className="text-blue-800 font-bold text-sm">
                          {formatCurrency(
                            parseFloat(venue.extra_pax_rate || 0)
                          )}{" "}
                          per guest
                        </span>
                      </div>
                      <div className="text-xs text-blue-600 mb-2">
                        Base: 100 guests • Extra:{" "}
                        {formatCurrency(parseFloat(venue.extra_pax_rate || 0))}{" "}
                        each
                      </div>

                      {/* Overflow Charge for Current Guest Count */}
                      {guestCount > 100 && (
                        <div className="bg-white p-2 rounded border border-blue-300">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-blue-700 font-medium">
                              Overflow charge ({guestCount} guests):
                            </span>
                            <span className="text-blue-900 font-bold">
                              {formatCurrency(
                                Math.max(0, guestCount - 100) *
                                  parseFloat(venue.extra_pax_rate || 0)
                              )}
                            </span>
                          </div>
                          <div className="text-xs text-blue-600">
                            <strong>
                              Total:{" "}
                              {formatCurrency(parseFloat(venue.venue_price))} +{" "}
                              {formatCurrency(
                                Math.max(0, guestCount - 100) *
                                  parseFloat(venue.extra_pax_rate || 0)
                              )}{" "}
                              ={" "}
                              {formatCurrency(
                                parseFloat(venue.venue_price) +
                                  Math.max(0, guestCount - 100) *
                                    parseFloat(venue.extra_pax_rate || 0)
                              )}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="text-center p-6 bg-[#028A75]/10 rounded-xl">
                      <div className="text-2xl sm:text-3xl font-bold text-[#028A75]">
                        {formatCurrency(
                          parseFloat(selectedVenueForModal.venue_price) || 0
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Base Venue Price
                      </div>
                    </div>
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
                        Extra Guest Rate
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

                  {/* Pax Rate Information */}
                  {parseFloat(selectedVenueForModal.extra_pax_rate) > 0 && (
                    <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                      <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Guest Overflow Charges
                      </h4>
                      <div className="space-y-3">
                        <p className="text-blue-800">
                          This venue supports a base capacity of{" "}
                          <strong>100 guests</strong>. Additional guests beyond
                          this limit will incur an extra charge.
                        </p>
                        <div className="bg-white p-4 rounded-lg border border-blue-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-blue-900 font-medium">
                              Extra Guest Rate:
                            </span>
                            <span className="text-blue-900 font-bold">
                              {formatCurrency(
                                parseFloat(selectedVenueForModal.extra_pax_rate)
                              )}{" "}
                              per guest
                            </span>
                          </div>
                          <div className="text-sm text-blue-700">
                            <p>
                              • Base capacity: 100 guests (included in venue
                              price)
                            </p>
                            <p>
                              • Additional guests:{" "}
                              {formatCurrency(
                                parseFloat(selectedVenueForModal.extra_pax_rate)
                              )}{" "}
                              each
                            </p>
                            <p>
                              • Example: 150 guests = 50 extra ×{" "}
                              {formatCurrency(
                                parseFloat(selectedVenueForModal.extra_pax_rate)
                              )}{" "}
                              ={" "}
                              {formatCurrency(
                                50 *
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
                              )}{" "}
                              additional charge
                            </p>
                          </div>
                        </div>

                        {/* Current Guest Count Calculation */}
                        {currentGuestCount && currentGuestCount > 100 && (
                          <div className="bg-green-50 p-4 rounded-lg border border-green-300">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-green-900 font-medium">
                                Your Event ({currentGuestCount} guests):
                              </span>
                              <span className="text-green-900 font-bold">
                                {formatCurrency(
                                  (currentGuestCount - 100) *
                                    parseFloat(
                                      selectedVenueForModal.extra_pax_rate
                                    )
                                )}{" "}
                                additional charge
                              </span>
                            </div>
                            <div className="text-sm text-green-700">
                              <p>
                                • Extra guests: {currentGuestCount - 100} ×{" "}
                                {formatCurrency(
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
                                )}
                              </p>
                              <p>
                                • Total venue cost:{" "}
                                {formatCurrency(
                                  parseFloat(selectedVenueForModal.venue_price)
                                )}{" "}
                                +{" "}
                                {formatCurrency(
                                  (currentGuestCount - 100) *
                                    parseFloat(
                                      selectedVenueForModal.extra_pax_rate
                                    )
                                )}{" "}
                                ={" "}
                                {formatCurrency(
                                  parseFloat(
                                    selectedVenueForModal.venue_price
                                  ) +
                                    (currentGuestCount - 100) *
                                      parseFloat(
                                        selectedVenueForModal.extra_pax_rate
                                      )
                                )}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Step-by-step calculation */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-300 mt-3">
                          <h5 className="text-blue-900 font-medium mb-2">
                            Step-by-step Calculation:
                          </h5>
                          <div className="text-sm text-blue-800 space-y-1">
                            <p>
                              1. Base venue price:{" "}
                              {formatCurrency(
                                parseFloat(selectedVenueForModal.venue_price)
                              )}{" "}
                              (includes 100 guests)
                            </p>
                            <p>
                              2. Extra guest rate:{" "}
                              {formatCurrency(
                                parseFloat(selectedVenueForModal.extra_pax_rate)
                              )}{" "}
                              per guest
                            </p>
                            <p>
                              3. Your guest count:{" "}
                              {currentGuestCount || guestCount} guests
                            </p>
                            <p>
                              4. Extra guests:{" "}
                              {Math.max(
                                0,
                                (currentGuestCount || guestCount) - 100
                              )}
                            </p>
                            <p>
                              5. Overflow charge:{" "}
                              {Math.max(
                                0,
                                (currentGuestCount || guestCount) - 100
                              )}{" "}
                              ×{" "}
                              {formatCurrency(
                                parseFloat(selectedVenueForModal.extra_pax_rate)
                              )}{" "}
                              ={" "}
                              {formatCurrency(
                                Math.max(
                                  0,
                                  (currentGuestCount || guestCount) - 100
                                ) *
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
                              )}
                            </p>
                            <p className="font-bold">
                              6. Total:{" "}
                              {formatCurrency(
                                parseFloat(selectedVenueForModal.venue_price)
                              )}{" "}
                              +{" "}
                              {formatCurrency(
                                Math.max(
                                  0,
                                  (currentGuestCount || guestCount) - 100
                                ) *
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
                              )}{" "}
                              ={" "}
                              {formatCurrency(
                                parseFloat(selectedVenueForModal.venue_price) +
                                  Math.max(
                                    0,
                                    (currentGuestCount || guestCount) - 100
                                  ) *
                                    parseFloat(
                                      selectedVenueForModal.extra_pax_rate
                                    )
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Venue Inclusions */}
                  {selectedVenueForModal.inclusions &&
                    selectedVenueForModal.inclusions.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Available Add-ons & Inclusions
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                          {selectedVenueForModal.inclusions.map(
                            (inclusion: any) => (
                              <div
                                key={`modal-${selectedVenueForModal.venue_id}-inclusion-${inclusion.inclusion_id}`}
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
                        <span className="text-gray-600">Base Venue Price:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(
                            parseFloat(selectedVenueForModal.venue_price) || 0
                          )}
                        </span>
                      </div>

                      {/* Overflow Charge Calculation */}
                      {parseFloat(selectedVenueForModal.extra_pax_rate) > 0 && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                              Extra Guest Rate:
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
                                <strong>Overflow Charge Examples:</strong>
                              </p>
                              <p>
                                • 120 guests: 20 extra ×{" "}
                                {formatCurrency(
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
                                )}{" "}
                                ={" "}
                                {formatCurrency(
                                  20 *
                                    parseFloat(
                                      selectedVenueForModal.extra_pax_rate
                                    )
                                )}
                              </p>
                              <p>
                                • 150 guests: 50 extra ×{" "}
                                {formatCurrency(
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
                                )}{" "}
                                ={" "}
                                {formatCurrency(
                                  50 *
                                    parseFloat(
                                      selectedVenueForModal.extra_pax_rate
                                    )
                                )}
                              </p>
                              <p>
                                • 200 guests: 100 extra ×{" "}
                                {formatCurrency(
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
                                )}{" "}
                                ={" "}
                                {formatCurrency(
                                  100 *
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

                      {/* Overflow Charge for Current Guest Count */}
                      {currentGuestCount &&
                        currentGuestCount > 100 &&
                        parseFloat(selectedVenueForModal.extra_pax_rate) >
                          0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                              Overflow Charge ({currentGuestCount - 100} extra
                              guests):
                            </span>
                            <span className="font-semibold text-blue-600">
                              {formatCurrency(
                                Math.max(0, currentGuestCount - 100) *
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
                              )}
                            </span>
                          </div>
                        )}

                      <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                        <span className="text-lg font-bold text-gray-900">
                          Total Venue Cost:
                        </span>
                        <span className="text-xl font-bold text-[#028A75]">
                          {formatCurrency(
                            (parseFloat(selectedVenueForModal.venue_price) ||
                              0) +
                              (currentGuestCount &&
                              currentGuestCount > 100 &&
                              parseFloat(selectedVenueForModal.extra_pax_rate) >
                                0
                                ? Math.max(0, currentGuestCount - 100) *
                                  parseFloat(
                                    selectedVenueForModal.extra_pax_rate
                                  )
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
                        {currentGuestCount && currentGuestCount > 100
                          ? `* Total includes overflow charge for ${currentGuestCount} guests`
                          : "* Final venue cost will be calculated based on your actual guest count during event creation"}
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
