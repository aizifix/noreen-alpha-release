"use client";

import { Card } from "@/components/ui/card";
import { VenueFormData } from "./page";
import { formatCurrency } from "@/lib/utils";

interface VenueReviewProps {
  data: VenueFormData;
}

export function VenueReview({ data }: VenueReviewProps) {
  const totalPrice = data.inclusions.reduce(
    (sum, inclusion) => sum + inclusion.inclusion_price,
    0
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Basic Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-medium">Venue Name</label>
            <p className="text-gray-600">{data.venue_title}</p>
          </div>
          <div>
            <label className="font-medium">Type</label>
            <p className="text-gray-600">{data.venue_type}</p>
          </div>
          <div>
            <label className="font-medium">Capacity</label>
            <p className="text-gray-600">{data.venue_capacity} guests</p>
          </div>
          <div>
            <label className="font-medium">Location</label>
            <p className="text-gray-600">{data.venue_location}</p>
          </div>
          <div>
            <label className="font-medium">Contact</label>
            <p className="text-gray-600">{data.venue_contact}</p>
          </div>
          <div>
            <label className="font-medium">Venue Price</label>
            <p className="text-lg font-semibold text-green-600">
              ₱{data.venue_price?.toLocaleString() || "0"}
            </p>
          </div>
          <div>
            <label className="font-medium">Extra Guest Rate</label>
            <p className="text-lg font-semibold text-blue-600">
              ₱{data.extra_pax_rate?.toLocaleString() || "0"} per guest
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="font-medium">Description</label>
            <p className="text-gray-600">{data.venue_details}</p>
          </div>
          <div>
            <label className="font-medium">Profile Picture</label>
            <p className="text-gray-600">
              {data.venue_profile_picture
                ? data.venue_profile_picture.name
                : "Not uploaded"}
            </p>
          </div>
          <div>
            <label className="font-medium">Cover Photo</label>
            <p className="text-gray-600">
              {data.venue_cover_photo
                ? data.venue_cover_photo.name
                : "Not uploaded"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Inclusions</h2>
          <p className="text-lg font-semibold text-green-600">
            Total: {formatCurrency(totalPrice)}
          </p>
        </div>

        <div className="space-y-6">
          {data.inclusions.map((inclusion, index) => (
            <div key={index} className="border-b pb-4 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium">
                  {inclusion.inclusion_name}
                </h3>
                <p className="font-medium text-green-600">
                  {formatCurrency(inclusion.inclusion_price)}
                </p>
              </div>
              {inclusion.inclusion_description && (
                <p className="text-gray-600 mb-4">
                  {inclusion.inclusion_description}
                </p>
              )}

              {inclusion.components.length > 0 && (
                <div className="pl-4 space-y-4">
                  {inclusion.components.map((component, componentIndex) => (
                    <div key={componentIndex}>
                      <h4 className="font-medium">
                        {component.component_name}
                      </h4>
                      {component.component_description && (
                        <p className="text-gray-600 text-sm">
                          {component.component_description}
                        </p>
                      )}

                      {component.subcomponents.length > 0 && (
                        <ul className="pl-4 mt-2 space-y-1">
                          {component.subcomponents.map(
                            (subcomponent, subcomponentIndex) => (
                              <li
                                key={subcomponentIndex}
                                className="text-sm text-gray-600"
                              >
                                {subcomponent.subcomponent_name}
                                {subcomponent.subcomponent_description && (
                                  <span className="text-gray-500">
                                    {" "}
                                    - {subcomponent.subcomponent_description}
                                  </span>
                                )}
                              </li>
                            )
                          )}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
