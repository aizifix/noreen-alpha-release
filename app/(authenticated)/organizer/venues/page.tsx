"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckIcon } from "lucide-react";
import { apiClient } from "@/utils/apiClient";
import { VenueCard } from "../../../components/card/venue-card";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";

const steps = [
  { id: 1, name: "Venue Details" },
  { id: 2, name: "Contact Information" },
  { id: 3, name: "Pricing & Capacity" },
  { id: 4, name: "Location" },
  { id: 5, name: "Document Upload" },
  { id: 6, name: "Review" },
];

interface VenueDetailsProps {
  venueTitle: string;
  setVenueTitle: (value: string) => void;
  venueOwner: string;
  setVenueOwner: (value: string) => void;
  venueDetails: string;
  setVenueDetails: (value: string) => void;
  venueType: string;
  setVenueType: (value: string) => void;
}

function VenueDetails({
  venueTitle,
  setVenueTitle,
  venueOwner,
  setVenueOwner,
  venueDetails,
  setVenueDetails,
  venueType,
  setVenueType,
}: VenueDetailsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="venueTitle"
          className="block text-sm font-medium text-gray-700"
        >
          Venue Title
        </label>
        <input
          id="venueTitle"
          type="text"
          value={venueTitle}
          onChange={(e) => setVenueTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
        />
      </div>
      <div>
        <label
          htmlFor="venueOwner"
          className="block text-sm font-medium text-gray-700"
        >
          Venue Owner
        </label>
        <input
          id="venueOwner"
          type="text"
          value={venueOwner}
          onChange={(e) => setVenueOwner(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
        />
      </div>
      <div>
        <label
          htmlFor="venueDetails"
          className="block text-sm font-medium text-gray-700"
        >
          Venue Details
        </label>
        <textarea
          id="venueDetails"
          value={venueDetails}
          onChange={(e) => setVenueDetails(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
          rows={4}
        />
      </div>
      <div>
        <label
          htmlFor="venueType"
          className="block text-sm font-medium text-gray-700"
        >
          Venue Type
        </label>
        <select
          id="venueType"
          value={venueType}
          onChange={(e) => setVenueType(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
        >
          <option value="internal">Internal</option>
          <option value="external">External</option>
        </select>
      </div>
    </div>
  );
}

interface ContactInformationProps {
  venueContact: string;
  setVenueContact: (value: string) => void;
}

function ContactInformation({
  venueContact,
  setVenueContact,
}: ContactInformationProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="venueContact"
          className="block text-sm font-medium text-gray-700"
        >
          Contact Number
        </label>
        <input
          id="venueContact"
          type="tel"
          value={venueContact}
          onChange={(e) => setVenueContact(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
        />
      </div>
    </div>
  );
}

interface PricingCapacityProps {
  venueCapacity: string;
  setVenueCapacity: (value: string) => void;
}

function PricingCapacity({
  venueCapacity,
  setVenueCapacity,
}: PricingCapacityProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="venueCapacity"
          className="block text-sm font-medium text-gray-700"
        >
          Venue Capacity
        </label>
        <input
          id="venueCapacity"
          type="number"
          value={venueCapacity}
          onChange={(e) => setVenueCapacity(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
        />
      </div>
    </div>
  );
}

interface LocationProps {
  venueLocation: string;
  setVenueLocation: (value: string) => void;
}

function Location({ venueLocation, setVenueLocation }: LocationProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="venueLocation"
          className="block text-sm font-medium text-gray-700"
        >
          Venue Location
        </label>
        <textarea
          id="venueLocation"
          value={venueLocation}
          onChange={(e) => setVenueLocation(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
          rows={4}
        />
      </div>
    </div>
  );
}

interface DocumentUploadProps {
  venueProfilePicture: File | null;
  setVenueProfilePicture: (file: File | null) => void;
  venueCoverPhoto: File | null;
  setVenueCoverPhoto: (file: File | null) => void;
}

function DocumentUpload({
  venueProfilePicture,
  setVenueProfilePicture,
  venueCoverPhoto,
  setVenueCoverPhoto,
}: DocumentUploadProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="venueProfilePicture"
          className="block text-sm font-medium text-gray-700"
        >
          Profile Picture
        </label>
        <input
          id="venueProfilePicture"
          type="file"
          onChange={(e) => setVenueProfilePicture(e.target.files?.[0] || null)}
          className="mt-1 block w-full"
        />
      </div>
      <div>
        <label
          htmlFor="venueCoverPhoto"
          className="block text-sm font-medium text-gray-700"
        >
          Cover Photo
        </label>
        <input
          id="venueCoverPhoto"
          type="file"
          onChange={(e) => setVenueCoverPhoto(e.target.files?.[0] || null)}
          className="mt-1 block w-full"
        />
      </div>
    </div>
  );
}

interface Venue {
  venue_id: number;
  venue_title: string;
  venue_owner: string;
  venue_location: string;
  venue_contact: string;
  venue_details: string;
  venue_status: string;
  venue_capacity: number;
  venue_type: string;
  venue_profile_picture: string | null;
  venue_cover_photo: string | null;
}

export default function VendorVenues() {
  const [currentStep, setCurrentStep] = useState(1);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Venue form states
  const [venueTitle, setVenueTitle] = useState("");
  const [venueOwner, setVenueOwner] = useState("");
  const [venueDetails, setVenueDetails] = useState("");
  const [venueType, setVenueType] = useState("internal");
  const [venueContact, setVenueContact] = useState("");
  const [venueCapacity, setVenueCapacity] = useState("");
  const [venueLocation, setVenueLocation] = useState("");
  const [venueProfilePicture, setVenueProfilePicture] = useState<File | null>(
    null
  );
  const [venueCoverPhoto, setVenueCoverPhoto] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchVenues = useCallback(async () => {
    try {
      const userData = secureStorage.getItem("user");
      if (!userData?.user_id) {
        throw new Error("User ID not found");
      }

      const response = await axios.get(
        `vendor.php?operation=getVenues&user_id=${userData.user_id}`
      );

      if (
        response.status === "success" &&
        Array.isArray(response.data.venues)
      ) {
        setVenues(response.data.venues);
      } else {
        setError(response.data.message || "Failed to fetch venues");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    protectRoute();
    fetchVenues();
  }, [fetchVenues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      const userData = secureStorage.getItem("user");

      if (!userData?.user_id) {
        throw new Error("User ID not found");
      }

      formData.append("operation", "createVenue");
      formData.append("user_id", userData.user_id);
      formData.append("venue_title", venueTitle);
      formData.append("venue_owner", venueOwner);
      formData.append("venue_details", venueDetails);
      formData.append("venue_type", venueType);
      formData.append("venue_contact", venueContact);
      formData.append("venue_capacity", venueCapacity);
      formData.append("venue_location", venueLocation);
      formData.append("venue_status", "available");

      if (venueProfilePicture) {
        formData.append("venue_profile_picture", venueProfilePicture);
      }
      if (venueCoverPhoto) {
        formData.append("venue_cover_photo", venueCoverPhoto);
      }

      const response = await axios.post(
        "/vendor.php",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === "success") {
        setShowModal(false);
        fetchVenues();
        // Reset form
        setVenueTitle("");
        setVenueOwner("");
        setVenueDetails("");
        setVenueType("internal");
        setVenueContact("");
        setVenueCapacity("");
        setVenueLocation("");
        setVenueProfilePicture(null);
        setVenueCoverPhoto(null);
        setCurrentStep(1);
      } else {
        throw new Error(response.data.message || "Failed to create venue");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Venues</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-[#486968] px-4 py-2 text-white hover:bg-[#3a5453]"
        >
          Create Venue
        </button>
      </div>

      {venues.length === 0 ? (
        <div className="text-center text-gray-500">No venues found</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue, index) => (
            <VenueCard
              key={`venue-${venue.venue_id ?? index}`}
              id={venue.venue_id}
              venueTitle={venue.venue_title}
              venueProfilePicture={venue.venue_profile_picture}
              venueCoverPhoto={venue.venue_cover_photo}
              venueLocation={venue.venue_location}
              venueType={venue.venue_type}
              venueStatus={venue.venue_status}
            />
          ))}
        </div>
      )}

      {/* Modal for venue creation */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
          <div className="relative w-full max-w-2xl rounded-lg bg-white p-6">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
            <div className="mb-8">
              <nav aria-label="Progress">
                <ol className="flex items-center">
                  {steps.map((step) => (
                    <li
                      key={step.id}
                      className={`relative ${
                        step.id !== steps.length ? "pr-8" : ""
                      } ${step.id !== 1 ? "pl-8" : ""}`}
                    >
                      <div
                        className="absolute inset-0 flex items-center"
                        aria-hidden="true"
                      >
                        <div
                          className={`h-0.5 w-full ${
                            currentStep > step.id
                              ? "bg-[#486968]"
                              : "bg-gray-200"
                          }`}
                        />
                      </div>
                      <div
                        className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                          currentStep > step.id
                            ? "bg-[#486968]"
                            : currentStep === step.id
                              ? "border-2 border-[#486968] bg-white"
                              : "border-2 border-gray-300 bg-white"
                        }`}
                      >
                        {currentStep > step.id ? (
                          <CheckIcon
                            className="h-5 w-5 text-white"
                            aria-hidden="true"
                          />
                        ) : (
                          <span
                            className={
                              currentStep === step.id
                                ? "text-[#486968]"
                                : "text-gray-500"
                            }
                          >
                            {step.id}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            <form onSubmit={handleSubmit}>
              {currentStep === 1 && (
                <VenueDetails
                  venueTitle={venueTitle}
                  setVenueTitle={setVenueTitle}
                  venueOwner={venueOwner}
                  setVenueOwner={setVenueOwner}
                  venueDetails={venueDetails}
                  setVenueDetails={setVenueDetails}
                  venueType={venueType}
                  setVenueType={setVenueType}
                />
              )}
              {currentStep === 2 && (
                <ContactInformation
                  venueContact={venueContact}
                  setVenueContact={setVenueContact}
                />
              )}
              {currentStep === 3 && (
                <PricingCapacity
                  venueCapacity={venueCapacity}
                  setVenueCapacity={setVenueCapacity}
                />
              )}
              {currentStep === 4 && (
                <Location
                  venueLocation={venueLocation}
                  setVenueLocation={setVenueLocation}
                />
              )}
              {currentStep === 5 && (
                <DocumentUpload
                  venueProfilePicture={venueProfilePicture}
                  setVenueProfilePicture={setVenueProfilePicture}
                  venueCoverPhoto={venueCoverPhoto}
                  setVenueCoverPhoto={setVenueCoverPhoto}
                />
              )}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Review Your Information
                  </h3>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <dl className="space-y-2">
                      <div>
                        <dt className="font-medium">Venue Title:</dt>
                        <dd>{venueTitle}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Owner:</dt>
                        <dd>{venueOwner}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Details:</dt>
                        <dd>{venueDetails}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Type:</dt>
                        <dd>{venueType}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Contact:</dt>
                        <dd>{venueContact}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Capacity:</dt>
                        <dd>{venueCapacity}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Location:</dt>
                        <dd>{venueLocation}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Profile Picture:</dt>
                        <dd>
                          {venueProfilePicture
                            ? venueProfilePicture.name
                            : "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium">Cover Photo:</dt>
                        <dd>
                          {venueCoverPhoto
                            ? venueCoverPhoto.name
                            : "Not provided"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                )}
                {currentStep < steps.length && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="ml-auto rounded-md bg-[#486968] px-4 py-2 text-sm font-medium text-white hover:bg-[#3a5453]"
                  >
                    Next
                  </button>
                )}
                {currentStep === steps.length && (
                  <button
                    type="submit"
                    className="ml-auto rounded-md bg-[#486968] px-4 py-2 text-sm font-medium text-white hover:bg-[#3a5453]"
                  >
                    Submit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
