"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckIcon } from "lucide-react";
import { apiClient } from "@/utils/apiClient";
import { StoreCard } from "../../../components/card/store-card";
import { secureStorage } from "@/app/utils/encryption";

const steps = [
  { id: 1, name: "Store Details" },
  { id: 2, name: "Contact Information" },
  { id: 3, name: "Store Type & Description" },
  { id: 4, name: "Location" },
  { id: 5, name: "Document Upload" },
  { id: 6, name: "Review" },
];

interface StoreDetailsProps {
  vendorName: string;
  setVendorName: (value: string) => void;
  storeName: string;
  setStoreName: (value: string) => void;
  storeDetails: string;
  setStoreDetails: (value: string) => void;
  storeMedia: File | null;
  setStoreMedia: (file: File | null) => void;
}

function StoreDetails({
  vendorName,
  setVendorName,
  storeName,
  setStoreName,
  storeDetails,
  setStoreDetails,
  storeMedia,
  setStoreMedia,
}: StoreDetailsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="vendorName"
          className="block text-sm font-medium text-gray-700"
        >
          Vendor Name
        </label>
        <input
          id="vendorName"
          type="text"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
        />
      </div>
      <div>
        <label
          htmlFor="storeName"
          className="block text-sm font-medium text-gray-700"
        >
          Store Name
        </label>
        <input
          id="storeName"
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
        />
      </div>
      <div>
        <label
          htmlFor="storeDetails"
          className="block text-sm font-medium text-gray-700"
        >
          Store Details
        </label>
        <textarea
          id="storeDetails"
          value={storeDetails}
          onChange={(e) => setStoreDetails(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
          rows={4}
        />
      </div>
      <div>
        <label
          htmlFor="storeMedia"
          className="block text-sm font-medium text-gray-700"
        >
          Store Media
        </label>
        <input
          id="storeMedia"
          type="file"
          onChange={(e) => setStoreMedia(e.target.files?.[0] || null)}
          className="mt-1 block w-full"
        />
      </div>
    </div>
  );
}

interface ContactInformationProps {
  contactNumber: string;
  setContactNumber: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
}

function ContactInformation({
  contactNumber,
  setContactNumber,
  email,
  setEmail,
}: ContactInformationProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="contactNumber"
          className="block text-sm font-medium text-gray-700"
        >
          Contact Number
        </label>
        <input
          id="contactNumber"
          type="tel"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
        />
      </div>
    </div>
  );
}

interface StoreTypeDescriptionProps {
  storeType: string;
  setStoreType: (value: string) => void;
  storeCategoryId: number | null;
  storeDescription: string;
  setStoreDescription: (value: string) => void;
  setStoreCategoryId: (value: number | null) => void;
  storeCategories: { id: number; type: string }[];
}

function StoreTypeDescription({
  storeType,
  setStoreType,
  storeCategoryId,
  setStoreCategoryId,
  storeCategories,
  storeDescription,
  setStoreDescription,
}: StoreTypeDescriptionProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="storeType"
          className="block text-sm font-medium text-gray-700"
        >
          Store Type
        </label>
        <select
          id="storeType"
          value={storeCategoryId ?? ""}
          onChange={(e) =>
            setStoreCategoryId(
              e.target.value ? Number.parseInt(e.target.value) : null
            )
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
        >
          <option value="">Select a store type</option>
          {storeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.type}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="storeDescription"
          className="block text-sm font-medium text-gray-700"
        >
          Store Description
        </label>
        <textarea
          id="storeDescription"
          value={storeDescription}
          onChange={(e) => setStoreDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
          rows={4}
        />
      </div>
    </div>
  );
}

interface LocationProps {
  location: string;
  setLocation: (value: string) => void;
}

function Location({ location, setLocation }: LocationProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-gray-700"
        >
          Store Location
        </label>
        <textarea
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#486968] focus:ring-[#486968]"
          rows={4}
        />
      </div>
    </div>
  );
}

interface DocumentUploadProps {
  coverPhoto: File | null;
  setCoverPhoto: (file: File | null) => void;
  profilePicture: File | null;
  setProfilePicture: (file: File | null) => void;
  businessPermit: File | null;
  setBusinessPermit: (file: File | null) => void;
  proofBilling: File | null;
  setProofBilling: (file: File | null) => void;
  govId: File | null;
  setGovId: (value: File | null) => void;
}

function DocumentUpload({
  coverPhoto,
  setCoverPhoto,
  profilePicture,
  setProfilePicture,
  businessPermit,
  setBusinessPermit,
  proofBilling,
  setProofBilling,
  govId,
  setGovId,
}: DocumentUploadProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="coverPhoto"
          className="block text-sm font-medium text-gray-700"
        >
          Cover Photo
        </label>
        <input
          id="coverPhoto"
          type="file"
          onChange={(e) => setCoverPhoto(e.target.files?.[0] || null)}
          className="mt-1 block w-full"
        />
      </div>
      <div>
        <label
          htmlFor="profilePicture"
          className="block text-sm font-medium text-gray-700"
        >
          Profile Picture
        </label>
        <input
          id="profilePicture"
          type="file"
          onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
          className="mt-1 block w-full"
        />
      </div>
      <div>
        <label
          htmlFor="businessPermit"
          className="block text-sm font-medium text-gray-700"
        >
          Business Permit
        </label>
        <input
          id="businessPermit"
          type="file"
          onChange={(e) => setBusinessPermit(e.target.files?.[0] || null)}
          className="mt-1 block w-full"
        />
      </div>
      <div>
        <label
          htmlFor="proofBilling"
          className="block text-sm font-medium text-gray-700"
        >
          Proof of Billing
        </label>
        <input
          id="proofBilling"
          type="file"
          onChange={(e) => setProofBilling(e.target.files?.[0] || null)}
          className="mt-1 block w-full"
        />
      </div>
      <div>
        <label
          htmlFor="govId"
          className="block text-sm font-medium text-gray-700"
        >
          Government ID
        </label>
        <input
          id="govId"
          type="file"
          onChange={(e) => setGovId(e.target.files?.[0] || null)}
          className="mt-1 block w-full"
        />
      </div>
    </div>
  );
}

interface Store {
  id: number;
  vendorName: string;
  storeName: string;
  storeType: string;
  storeCategory: string;
  coverPhoto: string | null;
  profilePicture: string | null;
}

export default function VendorStoreCreation() {
  const [storeCategories, setStoreCategories] = useState<
    { id: number; type: string }[]
  >([]);
  const [storeCategoryId, setStoreCategoryId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [vendorName, setVendorName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeDetails, setStoreDetails] = useState("");
  const [storeMedia, setStoreMedia] = useState<File | null>(null);
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [storeType, setStoreType] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [location, setLocation] = useState("");
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [businessPermit, setBusinessPermit] = useState<File | null>(null);
  const [proofBilling, setProofBilling] = useState<File | null>(null);
  const [govId, setGovId] = useState<File | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const userData = secureStorage.getItem("user");

      if (!userData) {
        setError("User ID not found. Please log in.");
        return;
      }

      const userId = userData.user_id;

      if (!userId) {
        setError("User ID not found. Please log in.");
        return;
      }

      console.log("Fetching stores with user ID:", userId);
      const response = await axios.get(
        "/vendor.php",
        {
          params: { operation: "getStores", user_id: userId },
        }
      );

      if (response.status === "success") {
        console.log("Fetched Stores:", response.data.stores);
        setStores(response.data.stores);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      setError("Failed to fetch stores.");
    } finally {
      setLoading(false);
    }
  }, []);

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  useEffect(() => {
    const fetchStoreCategories = async () => {
      try {
        const response = await axios.get(
          "/vendor.php",
          {
            params: { operation: "getStoreCategories" },
          }
        );

        if (response.status === "success") {
          setStoreCategories(response.data.categories);
        }
      } catch (error) {
        // console.error("Error fetching store categories:", error)
      }
    };

    fetchStoreCategories();
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      const userData = secureStorage.getItem("user");
      const userId = userData?.user_id;

      if (!userId) {
        alert("User is not logged in. Please log in first.");
        return;
      }

      if (!storeCategoryId) {
        alert("Please select a valid store category.");
        return;
      }

      formData.append("operation", "createStore");
      formData.append("user_id", userId.toString());
      formData.append("storeName", storeName);
      formData.append("storeDetails", storeDetails);
      formData.append("contactNumber", contactNumber);
      formData.append("email", email);
      formData.append("storeType", storeType);
      formData.append("storeDescription", storeDescription);
      formData.append("location", location);
      formData.append("store_category_id", storeCategoryId.toString());

      if (coverPhoto) formData.append("coverPhoto", coverPhoto);
      if (profilePicture) formData.append("profilePicture", profilePicture);

      console.log(
        "Submitting Form Data:",
        Object.fromEntries(formData.entries())
      );

      const response = await axios.post(
        "/vendor.php",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      console.log("Response:", response.data);

      if (response.status === "success") {
        alert("Vendor store created successfully!");
        closeModal();
        fetchStores();
      } else {
        alert("Error: " + response.data.message);
      }
    } catch (error) {
      //   console.error("Error submitting form:", error)
      alert("An error occurred while submitting the form.");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Stores</h1>
        <button
          onClick={openModal}
          className="rounded bg-[#486968] px-4 py-2 text-white hover:bg-[#3a5453]"
        >
          Create Store +
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#486968] border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-800">{error}</div>
      ) : stores.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">No stores yet</h3>
          <p className="mt-1 text-gray-500">
            Get started by creating a new store.
          </p>
          <button
            onClick={openModal}
            className="mt-4 rounded bg-[#486968] px-4 py-2 text-white hover:bg-[#3a5453]"
          >
            Create Store
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stores.map((store) => (
            <StoreCard
              key={store.id}
              id={store.id}
              vendorName={store.vendorName}
              storeName={store.storeName}
              storeType={store.storeType}
              storeCategory={store.storeCategory}
              coverPhoto={store.coverPhoto}
              profilePicture={store.profilePicture}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Create Your Store</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>

            <div className="mb-8">
              <div className="relative">
                <div className="absolute top-5 left-0 right-0 flex justify-between px-[3rem]">
                  {steps.slice(0, -1).map((_, index) => (
                    <div
                      key={index}
                      className={`h-[2px] w-full ${currentStep > index + 1 ? "bg-[#486968]" : "bg-gray-300"}`}
                    />
                  ))}
                </div>

                <ul className="flex justify-between relative z-10">
                  {steps.map((step, index) => (
                    <li key={step.id} className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 flex items-center justify-center rounded-full border-2 ${
                          currentStep > index + 1
                            ? "border-[#486968] bg-[#486968] text-white"
                            : currentStep === index + 1
                              ? "border-[#486968] bg-[#486968] text-white"
                              : "border-gray-300 bg-gray-300 text-gray-600"
                        }`}
                      >
                        {currentStep > index + 1 ? (
                          <CheckIcon className="w-5 h-5" />
                        ) : (
                          <span className="text-sm">{index + 1}</span>
                        )}
                      </div>
                      <span className="text-sm mt-2">{step.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-8">
              {currentStep === 1 && (
                <StoreDetails
                  vendorName={vendorName}
                  setVendorName={setVendorName}
                  storeName={storeName}
                  setStoreName={setStoreName}
                  storeDetails={storeDetails}
                  setStoreDetails={setStoreDetails}
                  storeMedia={storeMedia}
                  setStoreMedia={setStoreMedia}
                />
              )}
              {currentStep === 2 && (
                <ContactInformation
                  contactNumber={contactNumber}
                  setContactNumber={setContactNumber}
                  email={email}
                  setEmail={setEmail}
                />
              )}
              {currentStep === 3 && (
                <StoreTypeDescription
                  storeType={storeType}
                  setStoreType={setStoreType}
                  storeDescription={storeDescription}
                  setStoreDescription={setStoreDescription}
                  storeCategories={storeCategories}
                  storeCategoryId={storeCategoryId}
                  setStoreCategoryId={setStoreCategoryId}
                />
              )}
              {currentStep === 4 && (
                <Location location={location} setLocation={setLocation} />
              )}
              {currentStep === 5 && (
                <DocumentUpload
                  coverPhoto={coverPhoto}
                  setCoverPhoto={setCoverPhoto}
                  profilePicture={profilePicture}
                  setProfilePicture={setProfilePicture}
                  businessPermit={businessPermit}
                  setBusinessPermit={setBusinessPermit}
                  proofBilling={proofBilling}
                  setProofBilling={setProofBilling}
                  govId={govId}
                  setGovId={setGovId}
                />
              )}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Review Your Store Details
                  </h3>
                  <p>
                    <strong>Vendor Name:</strong> {vendorName}
                  </p>
                  <p>
                    <strong>Store Name:</strong> {storeName}
                  </p>
                  <p>
                    <strong>Contact Number:</strong> {contactNumber}
                  </p>
                  <p>
                    <strong>Email:</strong> {email}
                  </p>
                  <p>
                    <strong>Store Type:</strong> {storeType}
                  </p>
                  <p>
                    <strong>Location:</strong> {location}
                  </p>
                  <p>
                    <strong>Store Description:</strong> {storeDescription}
                  </p>
                  <p>
                    <strong>Documents Uploaded:</strong>
                  </p>
                  <ul className="list-disc list-inside">
                    <li>
                      Cover Photo:{" "}
                      {coverPhoto ? coverPhoto.name : "Not uploaded"}
                    </li>
                    <li>
                      Profile Picture:{" "}
                      {profilePicture ? profilePicture.name : "Not uploaded"}
                    </li>
                    <li>
                      Business Permit:{" "}
                      {businessPermit ? businessPermit.name : "Not uploaded"}
                    </li>
                    <li>
                      Proof of Billing:{" "}
                      {proofBilling ? proofBilling.name : "Not uploaded"}
                    </li>
                    <li>
                      Government ID: {govId ? govId.name : "Not uploaded"}
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              {currentStep > 1 && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </button>
              )}
              {currentStep < steps.length ? (
                <button
                  onClick={nextStep}
                  className="px-4 py-2 bg-[#486968] text-white rounded hover:bg-[#3a5453]"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-[#486968] text-white rounded hover:bg-[#3a5453]"
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
