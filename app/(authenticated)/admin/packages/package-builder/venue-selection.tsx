import React from "react";
import Image from "next/image";

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
    <div className="bg-white rounded-xl shadow p-8 space-y-6">
      <h2 className="text-xl font-semibold mb-1">Select Venues</h2>
      <p className="text-gray-500 text-sm mb-4">
        Choose one or more venues to include in this package. Click a card to
        select or deselect.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => {
          const isSelected = selectedVenueIds.includes(venue.venue_id);
          return (
            <div
              key={venue.venue_id}
              className={`relative border rounded-lg p-0 cursor-pointer transition-all group bg-white shadow-sm flex flex-col items-center ${
                isSelected
                  ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => onVenueToggle(venue.venue_id)}
              style={{ minHeight: 340 }}
            >
              <div className="absolute top-3 left-3 z-20">
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  tabIndex={-1}
                />
              </div>
              <div className="relative w-full h-28 md:h-32 lg:h-36 rounded-t-lg overflow-hidden">
                <Image
                  src={venue.venue_profile_picture || "/placeholder-venue.jpg"}
                  alt={venue.venue_title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative w-full flex justify-center">
                <div className="absolute -top-8 z-10">
                  <div className="w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                    <Image
                      src={
                        venue.venue_profile_picture || "/placeholder-venue.jpg"
                      }
                      alt={venue.venue_title}
                      width={64}
                      height={64}
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
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {venue.venue_location}
                  </span>
                  <span className="flex items-center justify-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Capacity: {venue.venue_capacity} guests
                  </span>
                  <span className="font-semibold text-blue-600">
                    ₱{(venue.total_price || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
