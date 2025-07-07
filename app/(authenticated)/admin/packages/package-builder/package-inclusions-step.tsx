import React from "react";
import { X, Plus } from "lucide-react";

interface Component {
  name: string;
}

interface Inclusion {
  name: string;
  price: string | number;
  components: Component[];
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
}) => {
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
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1">
                <label className="block mb-2 font-medium">Inclusion Name</label>
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
