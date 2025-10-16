import React from "react";
import { Building2, Edit3, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_details: string;
  venue_location: string;
  venue_capacity: number;
  venue_profile_picture: string;
  total_price: number;
  venue_price: number;
  extra_pax_rate: number;
}

interface VenueFeeInclusionProps {
  venueFeeBuffer: number | null;
  selectedVenues: number[];
  venues: Venue[];
  guestCount: number;
  onVenueFeeBufferChange: (value: number | null) => void;
}

export const VenueFeeInclusion: React.FC<VenueFeeInclusionProps> = ({
  venueFeeBuffer,
  selectedVenues,
  venues,
  guestCount,
  onVenueFeeBufferChange,
}) => {
  // Calculate venue cost based on pax count
  const calculateVenueCost = (venue: Venue) => {
    const basePrice = venue.venue_price || 0;
    const extraPaxRate = venue.extra_pax_rate || 0;
    const baseCapacity = 100; // Base capacity for pax rate calculation

    if (guestCount <= baseCapacity) {
      return basePrice;
    } else {
      const extraPax = guestCount - baseCapacity;
      return basePrice + extraPax * extraPaxRate;
    }
  };

  // Calculate total venue cost for all selected venues
  const calculateTotalVenueCost = (): number => {
    return selectedVenues.reduce((sum, venueId) => {
      const venue = venues.find((v) => v.venue_id === venueId);
      return sum + (venue ? calculateVenueCost(venue) : 0);
    }, 0);
  };

  // Calculate remaining venue budget (venue fee buffer - actual venue cost)
  const calculateRemainingVenueBudget = (): number => {
    if (venueFeeBuffer === null || venueFeeBuffer === undefined) return 0;
    const totalVenueCost = calculateTotalVenueCost();
    return Math.max(0, venueFeeBuffer - totalVenueCost);
  };

  // Calculate client additional payment (when venue cost exceeds buffer)
  const calculateClientAdditionalPayment = (): number => {
    if (venueFeeBuffer === null || venueFeeBuffer === undefined) return 0;
    const totalVenueCost = calculateTotalVenueCost();
    return Math.max(0, totalVenueCost - venueFeeBuffer);
  };

  const totalVenueCost = calculateTotalVenueCost();
  const remainingBudget = calculateRemainingVenueBudget();
  const clientAdditionalPayment = calculateClientAdditionalPayment();

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Building2 className="h-5 w-5" />
          Venue Fee Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Venue Fee Buffer Input */}
        <div className="space-y-2">
          <Label
            htmlFor="venueFeeBuffer"
            className="text-sm font-medium text-gray-700"
          >
            Venue Fee Buffer (₱)
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-4 w-4 text-gray-500" />
            </div>
            <Input
              id="venueFeeBuffer"
              type="text"
              value={
                venueFeeBuffer === null ? "" : venueFeeBuffer.toLocaleString()
              }
              onChange={(e) => {
                const value = e.target.value;
                const cleanValue = value.replace(/,/g, "");
                if (cleanValue === "") {
                  onVenueFeeBufferChange(null);
                } else {
                  const numValue = parseFloat(cleanValue);
                  if (!isNaN(numValue) && numValue >= 0) {
                    onVenueFeeBufferChange(numValue);
                  }
                }
              }}
              className="pl-10"
              placeholder="Enter venue fee buffer amount"
            />
          </div>
          <p className="text-xs text-gray-500">
            This is the maximum amount allocated for venue costs. Clients will
            pay additional fees if venue costs exceed this buffer.
          </p>
        </div>

        {/* Selected Venues Display */}
        {selectedVenues.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Selected Venues ({selectedVenues.length})
            </Label>
            <div className="space-y-2">
              {selectedVenues.map((venueId) => {
                const venue = venues?.find((v) => v.venue_id === venueId);
                return venue ? (
                  <div
                    key={venue.venue_id}
                    className="bg-white rounded-lg p-3 border border-blue-100"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">
                          {venue.venue_title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {venue.venue_location}
                        </p>
                        <p className="text-xs text-gray-500">
                          Capacity: {venue.venue_capacity} guests
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-600">
                          ₱{calculateVenueCost(venue).toLocaleString()}
                        </p>
                        {venue.extra_pax_rate > 0 && (
                          <p className="text-xs text-gray-500">
                            +₱{venue.extra_pax_rate.toLocaleString()}/pax
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Cost Breakdown */}
        {venueFeeBuffer !== null && venueFeeBuffer > 0 && (
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Cost Breakdown
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Venue Cost:</span>
                <span className="font-medium">
                  ₱{totalVenueCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Venue Fee Buffer:</span>
                <span className="font-medium">
                  ₱{venueFeeBuffer.toLocaleString()}
                </span>
              </div>
              <hr className="border-gray-200" />
              {clientAdditionalPayment > 0 ? (
                <div className="flex justify-between text-red-600">
                  <span>Client Additional Payment:</span>
                  <span className="font-medium">
                    ₱{clientAdditionalPayment.toLocaleString()}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-green-600">
                  <span>Remaining Budget:</span>
                  <span className="font-medium">
                    ₱{remainingBudget.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            {clientAdditionalPayment > 0 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                ⚠️ Venue cost exceeds buffer. Client will need to pay ₱
                {clientAdditionalPayment.toLocaleString()} additional.
              </div>
            )}
          </div>
        )}

        {/* No venues selected message */}
        {selectedVenues.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No venues selected</p>
            <p className="text-xs">
              Select venues in the Venue Selection step to see cost calculations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
