import React from "react";
import { MapPin, Users } from "lucide-react";

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_details: string;
  venue_location: string;
  venue_capacity: number;
  venue_profile_picture: string;
  total_price: number;
}

interface VenueSelectionProps {
  venues: Venue[];
  selectedVenueIds: number[];
  onVenueToggle: (venueId: number) => void;
}

export const VenueSelection: React.FC<VenueSelectionProps> = ({
  venues,
  selectedVenueIds,
  onVenueToggle,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Select Venues</h3>
        <p className="text-gray-600 mb-6">
          Choose one or more venues to include in this package. Clients will be
          able to choose from these selected venues.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => {
          const isSelected = selectedVenueIds.includes(venue.venue_id);
          return (
            <div
              key={venue.venue_id}
              className={`relative border rounded-lg p-0 cursor-pointer transition-all group bg-white shadow-sm flex flex-col items-center ${
                isSelected
                  ? "border-green-500 ring-2 ring-green-200 bg-green-50"
                  : "border-gray-200 hover:border-green-300 hover:shadow-md"
              }`}
              onClick={() => onVenueToggle(venue.venue_id)}
              style={{ minHeight: 340 }}
            >
              <div className="absolute top-3 left-3 z-20">
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  tabIndex={-1}
                />
              </div>

              <div className="relative w-full h-28 md:h-32 lg:h-36 rounded-t-lg overflow-hidden">
                <img
                  src={
                    venue.venue_profile_picture
                      ? `http://localhost/events-api/${venue.venue_profile_picture}`
                      : "/placeholder-venue.jpg"
                  }
                  alt={venue.venue_title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="relative w-full flex justify-center">
                <div className="absolute -top-8 z-10">
                  <div className="w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                    <img
                      src={
                        venue.venue_profile_picture
                          ? `http://localhost/events-api/${venue.venue_profile_picture}`
                          : "/placeholder-venue.jpg"
                      }
                      alt={venue.venue_title}
                      className="object-cover w-16 h-16"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-10 pb-4 px-4 w-full flex-1 flex flex-col items-center text-center">
                <h4 className="font-semibold text-lg mb-1">
                  {venue.venue_title}
                </h4>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {venue.venue_details}
                </p>

                <div className="flex flex-col gap-1 text-sm text-gray-600 w-full items-center">
                  <span className="flex items-center justify-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {venue.venue_location}
                  </span>
                  <span className="flex items-center justify-center">
                    <Users className="w-4 h-4 mr-1" />
                    Capacity: {venue.venue_capacity} guests
                  </span>
                  <span className="font-semibold text-green-600 mt-1">
                    ₱{(venue.total_price || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {venues.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <MapPin className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No venues available
          </h3>
          <p className="text-gray-600">
            Please add venues to the system before creating packages.
          </p>
        </div>
      )}

      {selectedVenueIds.length === 0 && venues.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">
            Please select at least one venue for this package.
          </p>
        </div>
      )}
    </div>
  );
};
