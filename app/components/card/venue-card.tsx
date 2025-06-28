"use client";
import Image from "next/image";
import type React from "react";

interface VenueCardProps {
  id: number;
  venueTitle: string;
  venueProfilePicture: string | null;
  venueCoverPhoto: string | null;
  venueLocation: string;
  venueType: string;
  venueStatus: string;
}

export function VenueCard({
  id,
  venueTitle,
  venueProfilePicture,
  venueCoverPhoto,
  venueLocation,
  venueType,
  venueStatus,
}: VenueCardProps) {
  // Normalize Image Paths
  const normalizePath = (path: string | null) => {
    if (!path || path.startsWith("http")) return path;
    return `http://localhost/events-api/${path}`;
  };

  const coverPhotoUrl =
    normalizePath(venueCoverPhoto) || "/placeholder-cover.jpg";
  const profilePictureUrl =
    normalizePath(venueProfilePicture) || "/placeholder-profile.jpg";

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return "bg-green-100 text-green-800";
      case "booked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Cover Image */}
      <div className="h-32 w-full overflow-hidden">
        <Image
          src={coverPhotoUrl}
          alt={`${venueTitle} cover`}
          width={256}
          height={128}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      {/* Profile Picture */}
      <div className="absolute left-4 top-16 h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-white">
        <Image
          src={profilePictureUrl}
          alt={`${venueTitle} profile`}
          width={64}
          height={64}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      {/* Content */}
      <div className="p-4 pt-12">
        <h3 className="text-lg font-semibold text-gray-900">{venueTitle}</h3>
        <p className="mt-1 text-sm text-gray-500">{venueLocation}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
            {venueType}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(venueStatus)}`}
          >
            {venueStatus}
          </span>
        </div>
        <button
          onClick={() => (window.location.href = `/vendor/venues/${id}`)}
          className="mt-4 w-full rounded-md bg-[#486968] px-4 py-2 text-white hover:bg-[#3a5453]"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
