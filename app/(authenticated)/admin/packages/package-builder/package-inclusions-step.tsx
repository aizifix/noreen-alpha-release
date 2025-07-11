import React, { useState, useEffect } from "react";
import { X, Plus, Star, Building2, Users } from "lucide-react";

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
}

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_details: string;
  venue_location: string;
  venue_capacity: number;
  venue_profile_picture: string;
  total_price: number;
}

interface PackageInclusionsStepProps {
  inclusions: Inclusion[];
  selectedVenues: number[];
  venues: Venue[];
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
}

export const PackageInclusionsStep: React.FC<PackageInclusionsStepProps> = ({
  inclusions,
  selectedVenues,
  venues,
  updateInclusionName,
  updateInclusionPrice,
  updateComponentName,
  addComponent,
  removeComponent,
  removeInclusion,
  addInclusion,
  updateInclusionSupplier,
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
        "http://localhost/events-api/admin.php?operation=getAllSuppliers&is_verified=1"
      );
      const data = await response.json();
      if (data.status === "success") {
        setSuppliers(data.suppliers);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        "http://localhost/events-api/supplier.php?operation=getSupplierCategories"
      );
      const data = await response.json();
      if (data.status === "success") {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchOffers = async () => {
    try {
      const response = await fetch(
        "http://localhost/events-api/supplier.php?operation=getAllActiveOffers"
      );
      const data = await response.json();
      if (data.status === "success") {
        setOffers(data.offers);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  };

  const getOffersBySupplier = (supplierId: number) => {
    return offers.filter((offer) => offer.supplier_id === supplierId);
  };

  const getSupplierById = (supplierId: number) => {
    return suppliers.find((supplier) => supplier.supplier_id === supplierId);
  };

  const getOfferById = (offerId: number) => {
    return offers.find((offer) => offer.offer_id === offerId);
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
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{venue.venue_title}</p>
                      <p className="text-sm text-gray-600">
                        {venue.venue_location}
                      </p>
                    </div>
                    <p className="font-medium text-green-600">
                      ₱{(venue.total_price || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Existing inclusions form */}
      {inclusions &&
        inclusions.map((inclusion, inclusionIndex) => (
          <div
            key={`inclusion-${inclusionIndex}`}
            className="border rounded-lg p-4 bg-gray-50"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                {/* Supplier Selection */}
                <div className="mb-4">
                  <label className="block mb-2 font-medium">
                    Supplier Selection
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 text-sm font-medium">
                        Select Supplier
                      </label>
                      <select
                        value={inclusion.supplier_id || ""}
                        onChange={(e) =>
                          handleSupplierSelection(
                            inclusionIndex,
                            e.target.value
                          )
                        }
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Select Supplier</option>
                        <optgroup label="Internal Suppliers">
                          {suppliers
                            .filter((s) => s.supplier_type === "internal")
                            .map((supplier) => (
                              <option
                                key={supplier.supplier_id}
                                value={supplier.supplier_id}
                              >
                                {supplier.business_name} ⭐{" "}
                                {supplier.rating_average} (
                                {supplier.total_ratings})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="External Suppliers">
                          {suppliers
                            .filter((s) => s.supplier_type === "external")
                            .map((supplier) => (
                              <option
                                key={supplier.supplier_id}
                                value={supplier.supplier_id}
                              >
                                {supplier.business_name} ⭐{" "}
                                {supplier.rating_average} (
                                {supplier.total_ratings})
                              </option>
                            ))}
                        </optgroup>
                        <option value="manual">Manual Entry</option>
                      </select>
                    </div>

                    {inclusion.supplier_id && (
                      <div>
                        <label className="block mb-1 text-sm font-medium">
                          Select Offer/Tier
                        </label>
                        <select
                          value={inclusion.offer_id || ""}
                          onChange={(e) =>
                            handleOfferSelection(inclusionIndex, e.target.value)
                          }
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="">Select Offer</option>
                          {getOffersBySupplier(inclusion.supplier_id).map(
                            (offer) => (
                              <option
                                key={offer.offer_id}
                                value={offer.offer_id}
                              >
                                {offer.offer_title} (₱{offer.price_min} - ₱
                                {offer.price_max})
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    )}
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
                </div>

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
                        updateInclusionName(inclusionIndex, e.target.value)
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
                        updateInclusionPrice(inclusionIndex, e.target.value)
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
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
                onClick={() => removeInclusion(inclusionIndex)}
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
                      key={`component-${inclusionIndex}-${componentIndex}`}
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
                                    inclusionIndex,
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
                            removeComponent(inclusionIndex, componentIndex)
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
                onClick={() => addComponent(inclusionIndex)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Component
              </button>
            </div>
          </div>
        ))}
      <button
        onClick={addInclusion}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:bg-gray-50 flex items-center justify-center"
      >
        <Plus className="h-5 w-5 mr-2" /> Add Inclusion
      </button>
    </div>
  );
};
