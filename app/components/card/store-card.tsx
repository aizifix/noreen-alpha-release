"use client";
import Image from "next/image";
import { endpoints } from "@/app/config/api";

interface StoreCardProps {
  id: number;
  vendorName: string;
  storeName: string;
  storeType: string;
  storeCategory: string;
  coverPhoto: string | null;
  profilePicture: string | null;
  isAdminView?: boolean;
}

export function StoreCard({
  id,
  vendorName,
  storeName,
  storeType,
  storeCategory,
  coverPhoto,
  profilePicture,
  isAdminView = false, // Default to vendor view
}: StoreCardProps) {
  // Normalize Image Paths using image serving script
  const normalizePath = (path: string | null) => {
    if (!path || path.startsWith("http")) return path;
    // Use the image serving script for proper image delivery
    return `${endpoints.serveImage}?path=${encodeURIComponent(path)}`;
  };

  const coverPhotoUrl = normalizePath(coverPhoto) || "/placeholder.svg";
  const profilePictureUrl = normalizePath(profilePicture) || "/placeholder.svg";

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Cover Image */}
      <div className="h-32 w-full overflow-hidden">
        <Image
          src={coverPhotoUrl || "/placeholder.svg"}
          alt={`${storeName} cover`}
          width={256}
          height={128}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      {/* Profile Picture */}
      <div className="absolute left-4 top-16 h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-white">
        <Image
          src={profilePictureUrl || "/placeholder.svg"}
          alt={`${vendorName} profile`}
          width={64}
          height={64}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>

      {/* Content */}
      <div className="p-4 pt-12">
        <h3 className="text-lg font-semibold text-gray-900">{storeName}</h3>
        <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
          {storeCategory}
        </span>

        {/* Show "Manage" button for Admin */}
        {isAdminView ? (
          <button className="mt-4 w-full rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600">
            Manage Vendor
          </button>
        ) : (
          <button className="mt-4 w-full rounded-md bg-brand-500 px-4 py-2 text-white hover:bg-brand-600">
            View Details
          </button>
        )}
      </div>
    </div>
  );
}
