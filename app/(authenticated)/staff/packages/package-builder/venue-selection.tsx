import React, { useState, useEffect } from "react";
import {
  MapPin,
  Users,
  Star,
  Check,
  Loader2,
  Eye,
  X,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import Image from "next/image";
import { endpoints } from "@/app/config/api";

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_details: string;
  venue_location: string;
  venue_capacity: number;
  venue_profile_picture: string;
  venue_cover_photo?: string;
  total_price: number;
  venue_price: number;
  extra_pax_rate: number;
  has_pax_rate?: boolean;
  base_capacity?: number;
}

interface VenueSelectionProps {
  venues: Venue[];
  selectedVenueIds: number[];
  onVenueToggle: (venueId: number) => void;
  onViewDetails?: (venueId: number) => void;
  loading?: boolean;
  error?: string | null;
  guestCount?: number;
}

export const VenueSelection: React.FC<VenueSelectionProps> = ({
  venues,
  selectedVenueIds,
  onVenueToggle,
  onViewDetails,
  loading = false,
  error = null,
  guestCount = 100,
}) => {
  const [imageLoadingStates, setImageLoadingStates] = useState<
    Record<number, boolean>
  >({});
  const [showAllVenues, setShowAllVenues] = useState(false);
  const [selectedVenueForDetails, setSelectedVenueForDetails] =
    useState<Venue | null>(null);
  const maxVisibleVenues = 6;

  // Calculate venue cost based on guest count and pax rates
  const calculateVenueCost = (venue: Venue): number => {
    const basePrice = venue.venue_price || 0;
    const extraPaxRate = venue.extra_pax_rate || 0;
    const baseCapacity = venue.base_capacity || 100;

    if (guestCount <= baseCapacity) {
      return basePrice;
    } else {
      const extraPax = guestCount - baseCapacity;
      return basePrice + extraPax * extraPaxRate;
    }
  };

  // Handle image loading states
  const handleImageLoad = (venueId: number) => {
    setImageLoadingStates((prev) => ({ ...prev, [venueId]: false }));
  };

  const handleImageError = (venueId: number) => {
    setImageLoadingStates((prev) => ({ ...prev, [venueId]: false }));
  };

  const handleImageLoadStart = (venueId: number) => {
    setImageLoadingStates((prev) => ({ ...prev, [venueId]: true }));
  };

  // Get proper image URL - using the same approach as event builder
  const getImageUrl = (imagePath: string | null | undefined): string => {
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
  return (
    <div className="space-y-6">
      {/* Selection Counter */}
      {selectedVenueIds.length > 0 && (
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
            <Check className="w-4 h-4 text-emerald-600 mr-2" />
            <span className="text-emerald-800 text-sm font-medium">
              {selectedVenueIds.length} venue
              {selectedVenueIds.length !== 1 ? "s" : ""} selected
            </span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-lg">Loading venues...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Error loading venues
          </h3>
          <p className="text-gray-600">{error}</p>
        </div>
      )}

      {/* Venues Grid */}
      {!loading && !error && venues && venues.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(showAllVenues ? venues : venues.slice(0, maxVisibleVenues)).map(
              (venue) => {
                const isSelected = selectedVenueIds.includes(venue.venue_id);
                const venueCost = calculateVenueCost(venue);
                const isImageLoading = imageLoadingStates[venue.venue_id];
                const hasPaxRate = venue.extra_pax_rate > 0;
                const baseCapacity = venue.base_capacity || 100;

                return (
                  <div
                    key={venue.venue_id}
                    className={`group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border overflow-hidden cursor-pointer flex flex-col h-full ${
                      isSelected
                        ? "border-green-500 ring-2 ring-green-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => onVenueToggle(venue.venue_id)}
                  >
                    {/* Selection Indicator */}
                    <div className="absolute top-4 right-4 z-20">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-sm ${
                          isSelected
                            ? "bg-green-500 border-green-500"
                            : "bg-white border-gray-300 group-hover:border-green-400"
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>

                    {/* Cover Image */}
                    <div className="relative h-48 overflow-hidden">
                      {isImageLoading && (
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                        </div>
                      )}
                      <Image
                        src={getImageUrl(
                          venue.venue_cover_photo || venue.venue_profile_picture
                        )}
                        alt={venue.venue_title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        onLoadStart={() => handleImageLoadStart(venue.venue_id)}
                        onLoad={() => handleImageLoad(venue.venue_id)}
                        onError={() => handleImageError(venue.venue_id)}
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    {/* Content - Flex grow to push button to bottom */}
                    <div className="p-5 flex flex-col flex-grow">
                      {/* Header with title and rating */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">
                            {venue.venue_title}
                          </h4>
                          <div className="flex items-center text-yellow-500">
                            <Star className="w-4 h-4 fill-current mr-1" />
                            <span className="text-sm font-semibold">4.8</span>
                            <span className="text-gray-400 text-sm ml-1">
                              (24 reviews)
                            </span>
                          </div>
                        </div>
                        {hasPaxRate && (
                          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                            ₱{venue.extra_pax_rate.toLocaleString()}/pax
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                        {venue.venue_details}
                      </p>

                      {/* Venue Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-gray-600 text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            {venue.venue_location}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm">
                          <Users className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span>Up to {venue.venue_capacity} guests</span>
                        </div>
                        {/* Pax Rate Information */}
                        <div className="flex items-center text-gray-600 text-sm">
                          <span className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0">
                            ₱
                          </span>
                          <span>
                            {hasPaxRate ? (
                              <>
                                Base: ₱
                                {venue.venue_price?.toLocaleString() || 0} (up
                                to {venue.base_capacity || 100} guests)
                                <br />
                                Extra: ₱{venue.extra_pax_rate.toLocaleString()}
                                /pax
                              </>
                            ) : (
                              `Fixed: ₱${venue.venue_price?.toLocaleString() || 0}`
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Spacer to push button to bottom */}
                      <div className="flex-grow"></div>

                      {/* View Details Button - Full Width */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVenueForDetails(venue);
                        }}
                        className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 text-sm font-semibold"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </button>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/5 transition-colors duration-300 pointer-events-none" />
                  </div>
                );
              }
            )}
          </div>

          {/* Show More/Less Button */}
          {venues.length > maxVisibleVenues && (
            <div className="text-center mt-8">
              <button
                onClick={() => setShowAllVenues(!showAllVenues)}
                className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 font-medium"
              >
                {showAllVenues ? (
                  <>
                    <span>See Less</span>
                    <svg
                      className="w-4 h-4 ml-2 transform rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>
                      See More ({venues.length - maxVisibleVenues} more venues)
                    </span>
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && !error && (!venues || venues.length === 0) && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No venues available
          </h3>
          <p className="text-gray-600">
            Please add venues to the system before creating packages.
          </p>
        </div>
      )}

      {/* Selection Warning */}
      {!loading &&
        !error &&
        selectedVenueIds.length === 0 &&
        venues &&
        venues.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                <svg
                  className="w-4 h-4 text-amber-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-amber-800 text-sm font-medium">
                Please select at least one venue for this package.
              </p>
            </div>
          </div>
        )}

      {/* Venue Details Modal */}
      {selectedVenueForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedVenueForDetails.venue_title}
              </h2>
              <button
                onClick={() => setSelectedVenueForDetails(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Images */}
                <div className="space-y-4">
                  {/* Cover Image */}
                  <div className="relative h-64 rounded-lg overflow-hidden">
                    <Image
                      src={getImageUrl(
                        selectedVenueForDetails.venue_cover_photo ||
                          selectedVenueForDetails.venue_profile_picture
                      )}
                      alt={selectedVenueForDetails.venue_title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Profile Picture */}
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-200">
                      <Image
                        src={getImageUrl(
                          selectedVenueForDetails.venue_profile_picture
                        )}
                        alt={selectedVenueForDetails.venue_title}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div>
                      <div className="flex items-center text-yellow-500 mb-1">
                        <Star className="w-5 h-5 fill-current mr-1" />
                        <span className="text-lg font-semibold">4.8</span>
                        <span className="text-gray-500 ml-1">(24 reviews)</span>
                      </div>
                      <p className="text-gray-600 text-sm">Premium Venue</p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Details */}
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      About This Venue
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedVenueForDetails.venue_details}
                    </p>
                  </div>

                  {/* Venue Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Venue Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-5 h-5 mr-3 text-gray-400" />
                        <span>{selectedVenueForDetails.venue_location}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Users className="w-5 h-5 mr-3 text-gray-400" />
                        <span>
                          Capacity: Up to{" "}
                          {selectedVenueForDetails.venue_capacity} guests
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                        <span>Available for booking</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Pricing
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {selectedVenueForDetails.extra_pax_rate > 0 ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                              Base Price (up to{" "}
                              {selectedVenueForDetails.base_capacity || 100}{" "}
                              guests):
                            </span>
                            <span className="font-semibold">
                              ₱
                              {selectedVenueForDetails.venue_price?.toLocaleString() ||
                                0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                              Extra guest rate:
                            </span>
                            <span className="font-semibold text-green-600">
                              ₱
                              {selectedVenueForDetails.extra_pax_rate.toLocaleString()}
                              /pax
                            </span>
                          </div>
                          <div className="border-t border-gray-200 pt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">
                                Estimated cost for {guestCount} guests:
                              </span>
                              <span className="font-bold text-lg text-green-600">
                                ₱
                                {calculateVenueCost(
                                  selectedVenueForDetails
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600 mb-1">
                            ₱
                            {calculateVenueCost(
                              selectedVenueForDetails
                            ).toLocaleString()}
                          </div>
                          <div className="text-gray-600">
                            for {guestCount} guests
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => {
                        onVenueToggle(selectedVenueForDetails.venue_id);
                        setSelectedVenueForDetails(null);
                      }}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                        selectedVenueIds.includes(
                          selectedVenueForDetails.venue_id
                        )
                          ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                          : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                      }`}
                    >
                      {selectedVenueIds.includes(
                        selectedVenueForDetails.venue_id
                      )
                        ? "Remove from Package"
                        : "Add to Package"}
                    </button>
                    <button
                      onClick={() => setSelectedVenueForDetails(null)}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
