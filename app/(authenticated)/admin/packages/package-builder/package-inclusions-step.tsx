import React, { useState, useEffect } from "react";
import { X, Plus, Star, Building2, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Component {
  name: string;
}

interface Inclusion {
  name: string;
  price: string | number;
  components: Component[];
  supplier_id?: number;
  offer_id?: number;
  is_manual?: boolean;
  tier_description?: string;
  tier_level?: number;
  category?: string;
}

interface Supplier {
  supplier_id: number;
  business_name: string;
  supplier_type: "internal" | "external";
  specialty_category: string;
  rating_average: number;
  total_ratings: number;
}

interface SupplierOffer {
  offer_id: number;
  supplier_id: number;
  offer_title: string;
  offer_description: string;
  price_min: number;
  price_max: number;
  service_category: string;
  package_size: string;
  business_name: string;
  supplier_type: "internal" | "external";
  rating_average: number;
  total_ratings: number;
  tier_level: number;
}

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


interface PackageInclusionsStepProps {
  inclusions: Inclusion[];
  selectedVenues: number[];
  venues: Venue[];
  guestCount: number; // Add guest count for venue cost calculation
  venueFeeBuffer?: number | null; // Add venue fee buffer
  updateInclusionName: (inclusionIndex: number, name: string) => void;
  updateInclusionPrice: (index: number, value: string) => void;
  updateComponentName: (
    inclusionIndex: number,
    componentIndex: number,
    name: string
  ) => void;
  addComponent: (inclusionIndex: number) => void;
  removeComponent: (inclusionIndex: number, componentIndex: number) => void;
  removeInclusion: (inclusionIndex: number) => void;
  addInclusion: () => void;
  updateInclusionSupplier: (
    inclusionIndex: number,
    supplierId: number | null,
    offerId: number | null,
    isManual: boolean
  ) => void;
  updateInclusionTier?: (inclusionIndex: number, tierLevel: number) => void;
}

export const PackageInclusionsStep: React.FC<PackageInclusionsStepProps> = ({
  inclusions,
  selectedVenues,
  venues,
  guestCount,
  venueFeeBuffer,
  updateInclusionName,
  updateInclusionPrice,
  updateComponentName,
  addComponent,
  removeComponent,
  removeInclusion,
  addInclusion,
  updateInclusionSupplier,
  updateInclusionTier,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [offers, setOffers] = useState<SupplierOffer[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingOffers, setLoadingOffers] = useState<Record<number, boolean>>(
    {}
  );

  // Fetch suppliers and categories on component mount
  useEffect(() => {
    fetchSuppliers();
    fetchCategories();
    fetchOffers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(
        "https://noreen-events.online/noreen-events/admin.php?operation=getAllSuppliers&is_verified=1&limit=100"
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Suppliers response:", data);

      if (data.status === "success") {
        setSuppliers(data.suppliers);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      // Fallback to empty array if API fails
      setSuppliers([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        "https://noreen-events.online/noreen-events/supplier.php?operation=getSupplierCategories"
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Categories response:", data);

      if (data.status === "success") {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Fallback to empty array if API fails
      setCategories([]);
    }
  };

  const fetchOffers = async () => {
    try {
      const response = await fetch(
        "https://noreen-events.online/noreen-events/supplier.php?operation=getAllActiveOffers"
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Offers response:", data);

      if (data.status === "success") {
        setOffers(data.offers);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      // Fallback to empty array if API fails
      setOffers([]);
    }
  };

  const getOffersBySupplier = (supplierId: number) => {
    return offers.filter((offer) => offer.supplier_id === supplierId);
  };

  const getOffersBySupplierAndTier = (
    supplierId: number,
    tierLevel: number
  ) => {
    return offers.filter(
      (offer) =>
        offer.supplier_id === supplierId && offer.tier_level === tierLevel
    );
  };

  const getAvailableTiers = (supplierId: number) => {
    const supplierOffers = offers.filter(
      (offer) => offer.supplier_id === supplierId
    );
    const uniqueTiers = [
      ...new Set(supplierOffers.map((offer) => offer.tier_level)),
    ].sort((a, b) => a - b);
    return uniqueTiers;
  };

  const getSupplierById = (supplierId: number) => {
    return suppliers.find((supplier) => supplier.supplier_id === supplierId);
  };

  const getOfferById = (offerId: number) => {
    return offers.find((offer) => offer.offer_id === offerId);
  };

  // Calculate venue cost based on pax count
  const calculateVenueCost = (venue: Venue) => {
    const basePrice = venue.venue_price || 0;
    const extraPaxRate = venue.extra_pax_rate || 0;
    const baseCapacity = 100; // Base capacity for pax rate calculation
    
    if (guestCount <= baseCapacity) {
      return basePrice;
    } else {
      const extraPax = guestCount - baseCapacity;
      return basePrice + (extraPax * extraPaxRate);
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

  const handleSupplierSelection = (
    inclusionIndex: number,
    supplierId: string
  ) => {
    if (supplierId === "manual") {
      updateInclusionSupplier(inclusionIndex, null, null, true);
    } else if (supplierId === "") {
      updateInclusionSupplier(inclusionIndex, null, null, false);
    } else {
      updateInclusionSupplier(
        inclusionIndex,
        parseInt(supplierId),
        null,
        false
      );
    }
  };

  const handleOfferSelection = (inclusionIndex: number, offerId: string) => {
    const offer = getOfferById(parseInt(offerId));
    if (offer) {
      updateInclusionSupplier(
        inclusionIndex,
        offer.supplier_id,
        offer.offer_id,
        false
      );
      // Auto-fill offer details
      updateInclusionName(inclusionIndex, offer.offer_title);
      updateInclusionPrice(inclusionIndex, offer.price_min.toString());
    }
  };

  const handleTierSelection = (inclusionIndex: number, tierLevel: number) => {
    const inclusion = inclusions[inclusionIndex];
    if (inclusion.supplier_id) {
      // Clear existing offer selection when tier changes
      updateInclusionSupplier(
        inclusionIndex,
        inclusion.supplier_id,
        null,
        false
      );
      // Update tier level in inclusion
      if (updateInclusionTier) {
        updateInclusionTier(inclusionIndex, tierLevel);
      }
    }
  };

  return (
    <div className="space-y-6">

      {/* Show selected venues as fixed inclusions */}
      {selectedVenues.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-2">Selected Venues:</h3>
          <div className="space-y-2">
            {selectedVenues.map((venueId) => {
              const venue = venues?.find((v) => v.venue_id === venueId);
              return venue ? (
                <div key={venue.venue_id} className="bg-gray-50 rounded p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{venue.venue_title}</p>
                      <p className="text-sm text-gray-600">
                        {venue.venue_location}
                      </p>
                    </div>
                    <div className="text-right">
                      {venue.extra_pax_rate > 0 ? (
                        <p className="text-sm font-medium text-gray-700">
                          Pax Rate: ₱{venue.extra_pax_rate.toLocaleString()}/pax
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No pax rate set
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

      {/* Venue Fee Card - Simplified */}
      {inclusions && inclusions.some(inc => inc.category === "venue_fee") && (
        <div className="mb-6">
          {inclusions
            .filter(inc => inc.category === "venue_fee")
            .map((inclusion, index) => {
              return (
                <div key={`venue-fee-${index}`} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-blue-900">Venue Fee</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        ₱{Number(inclusion.price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Existing inclusions form - excluding venue_fee */}
      {inclusions &&
        inclusions
          .filter(inclusion => inclusion.category !== "venue_fee")
          .map((inclusion, inclusionIndex) => {
            // Adjust index to account for filtered venue_fee items
            const originalIndex = inclusions.findIndex(inc => inc === inclusion);
            return (
              <div
                key={`inclusion-${originalIndex}`}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    {/* Supplier Selection */}
                    <div className="mb-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // This will be handled by the parent component
                            // For now, just show a message
                            toast.info(
                              "Supplier selection will be implemented in the parent component"
                            );
                          }}
                          className="flex-1 bg-[#028A75] text-white px-4 py-2 rounded hover:bg-[#027A65] flex items-center justify-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Supplier
                        </button>
                      </div>
                    </div>

                    {/* Show supplier info if selected */}
                    {inclusion.supplier_id && !inclusion.is_manual && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        {(() => {
                          const supplier = getSupplierById(inclusion.supplier_id);
                          return supplier ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {supplier.supplier_type === "internal" ? (
                                  <Building2 className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <Users className="h-4 w-4 text-green-600" />
                                )}
                                <span className="text-sm font-medium">
                                  {supplier.business_name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({supplier.specialty_category})
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span className="text-xs">
                                  {supplier.rating_average}
                                </span>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {/* Show offer details if selected */}
                    {inclusion.offer_id && (
                      <div className="mt-2 p-3 bg-green-50 rounded-lg">
                        {(() => {
                          const offer = getOfferById(inclusion.offer_id);
                          return offer ? (
                            <div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium">
                                    {offer.offer_title}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {offer.offer_description}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-green-600">
                                    ₱{offer.price_min} - ₱{offer.price_max}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {offer.package_size}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {/* Inclusion Details */}
                    <label className="block mb-2 font-medium">
                      Inclusion Details
                    </label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={inclusion.name}
                          onChange={(e) =>
                            updateInclusionName(originalIndex, e.target.value)
                          }
                          placeholder="E.g., Venue Decoration"
                          className="w-full border rounded px-3 py-2"
                          disabled={!!inclusion.offer_id}
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="block mb-1 text-sm font-medium">
                          Price (₱)
                        </label>
                        <input
                          type="number"
                          value={inclusion.price}
                          onChange={(e) =>
                            updateInclusionPrice(originalIndex, e.target.value)
                          }
                          placeholder="0.00"
                          min="0"
                          step="1000"
                          className="w-full border rounded px-3 py-2"
                        />
                        {inclusion.offer_id && (
                          <p className="text-xs text-gray-500 mt-1">
                            Override supplier pricing if needed
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeInclusion(originalIndex)}
                    className="ml-2 p-1 text-gray-500 hover:text-red-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="pl-4 border-l-2 border-gray-300 space-y-4">
                  {inclusion.components &&
                    inclusion.components.map(
                      (component: Component, componentIndex: number) => (
                        <div
                          key={`component-${originalIndex}-${componentIndex}`}
                          className="border rounded-lg p-3 bg-white"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex-1">
                              <label className="block mb-1 text-sm font-medium">
                                Component
                              </label>
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={component.name}
                                    onChange={(e) =>
                                      updateComponentName(
                                        originalIndex,
                                        componentIndex,
                                        e.target.value
                                      )
                                    }
                                    placeholder="E.g., Flowers"
                                    className="w-full border rounded px-3 py-1 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                removeComponent(originalIndex, componentIndex)
                              }
                              className="ml-2 p-1 text-gray-500 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  <button
                    onClick={() => addComponent(originalIndex)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Component
                  </button>
                </div>
              </div>
            );
          })}
      <button
        onClick={addInclusion}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:bg-gray-50 flex items-center justify-center"
      >
        <Plus className="h-5 w-5 mr-2" /> Add Inclusion
      </button>
    </div>
  );
};
