"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VenueFormData } from "./page";
import { ChangeEvent } from "react";

interface VenueDetailsProps {
  data: VenueFormData;
  onChange: (data: Partial<VenueFormData>) => void;
}

export function VenueDetails({ data, onChange }: VenueDetailsProps) {
  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    field: "venue_profile_picture" | "venue_cover_photo"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange({ [field]: file });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Venue Name */}
        <div className="space-y-2">
          <Label htmlFor="venue_title">Venue Name</Label>
          <Input
            id="venue_title"
            value={data.venue_title}
            onChange={(e) => onChange({ venue_title: e.target.value })}
            placeholder="Enter venue name"
          />
        </div>

        {/* Venue Type */}
        <div className="space-y-2">
          <Label htmlFor="venue_type">Venue Type</Label>
          <Select
            value={data.venue_type}
            onValueChange={(value) =>
              onChange({ venue_type: value as "internal" | "external" })
            }
          >
            <SelectTrigger id="venue_type">
              <SelectValue placeholder="Select venue type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="external">External</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Venue Capacity */}
        <div className="space-y-2">
          <Label htmlFor="venue_capacity">Capacity</Label>
          <Input
            id="venue_capacity"
            type="number"
            value={data.venue_capacity}
            onChange={(e) =>
              onChange({ venue_capacity: parseInt(e.target.value) || 0 })
            }
            placeholder="Enter maximum capacity"
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="venue_location">Location</Label>
          <Input
            id="venue_location"
            value={data.venue_location}
            onChange={(e) => onChange({ venue_location: e.target.value })}
            placeholder="Enter venue location"
          />
        </div>

        {/* Contact Information */}
        <div className="space-y-2">
          <Label htmlFor="venue_contact">Contact Number</Label>
          <Input
            id="venue_contact"
            value={data.venue_contact}
            onChange={(e) => onChange({ venue_contact: e.target.value })}
            placeholder="Enter contact number"
          />
        </div>

        {/* Venue Price */}
        <div className="space-y-2">
          <Label htmlFor="venue_price">Venue Price (₱)</Label>
          <Input
            id="venue_price"
            type="number"
            value={data.venue_price}
            onChange={(e) =>
              onChange({ venue_price: parseFloat(e.target.value) || 0 })
            }
            placeholder="Enter venue price"
          />
          <p className="text-sm text-gray-500">
            Fixed price that will be added to packages
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="venue_details">Description</Label>
          <Textarea
            id="venue_details"
            value={data.venue_details}
            onChange={(e) => onChange({ venue_details: e.target.value })}
            placeholder="Enter venue description"
            rows={4}
          />
        </div>

        {/* Profile Picture Upload */}
        <div className="space-y-2">
          <Label htmlFor="venue_profile_picture">Profile Picture</Label>
          <Input
            id="venue_profile_picture"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, "venue_profile_picture")}
          />
          <p className="text-sm text-gray-500">
            Upload a logo or representative image
          </p>
        </div>

        {/* Cover Photo Upload */}
        <div className="space-y-2">
          <Label htmlFor="venue_cover_photo">Cover Photo</Label>
          <Input
            id="venue_cover_photo"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, "venue_cover_photo")}
          />
          <p className="text-sm text-gray-500">
            Upload a banner image for the venue
          </p>
        </div>
      </div>
    </div>
  );
}
