"use client";

import { useState } from "react";
import { Star, Upload, X } from "lucide-react";

interface SupplierRatingProps {
  supplierId: number;
  supplierName: string;
  eventId?: number;
  eventTitle?: string;
  clientId?: number;
  adminId?: number;
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

interface RatingData {
  rating: number;
  feedback: string;
  service_quality: number;
  punctuality: number;
  communication: number;
  value_for_money: number;
  would_recommend: boolean;
  is_public: boolean;
}

export default function SupplierRating({
  supplierId,
  supplierName,
  eventId,
  eventTitle,
  clientId,
  adminId,
  onSubmitSuccess,
  onCancel,
}: SupplierRatingProps) {
  const [formData, setFormData] = useState<RatingData>({
    rating: 0,
    feedback: "",
    service_quality: 0,
    punctuality: 0,
    communication: 0,
    value_for_money: 0,
    would_recommend: true,
    is_public: true,
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<{ [key: string]: number }>({});

  const ratingCategories = [
    { key: "rating", label: "Overall Rating", required: true },
    { key: "service_quality", label: "Service Quality" },
    { key: "punctuality", label: "Punctuality" },
    { key: "communication", label: "Communication" },
    { key: "value_for_money", label: "Value for Money" },
  ];

  const handleStarClick = (category: string, rating: number) => {
    setFormData((prev) => ({ ...prev, [category]: rating }));
  };

  const handleStarHover = (category: string, rating: number) => {
    setHoveredStar((prev) => ({ ...prev, [category]: rating }));
  };

  const handleStarLeave = (category: string) => {
    setHoveredStar((prev) => ({ ...prev, [category]: 0 }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).filter((file) => {
        // Validate file type and size
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
          alert(`${file.name} is not a supported image type`);
          return false;
        }

        if (file.size > maxSize) {
          alert(`${file.name} is too large. Maximum size is 5MB`);
          return false;
        }

        return true;
      });

      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.rating === 0) {
      alert("Please provide an overall rating");
      return;
    }

    setLoading(true);

    try {
      // Handle file uploads first
      const feedback_attachments = [];

      for (const file of attachments) {
        const formDataFile = new FormData();
        formDataFile.append("file", file);

        // You would typically upload the file to your storage here
        // For now, we'll just add the file info
        feedback_attachments.push({
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          uploaded_at: new Date().toISOString(),
        });
      }

      // Submit rating
      const ratingPayload = {
        supplier_id: supplierId,
        event_id: eventId,
        client_id: clientId,
        admin_id: adminId,
        ...formData,
        feedback_attachments,
      };

      const response = await fetch("http://localhost/events-api/supplier.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "createRating",
          ...ratingPayload,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        alert("Rating submitted successfully!");
        onSubmitSuccess();
      } else {
        alert(data.message || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (
    category: string,
    label: string,
    required = false
  ) => {
    const currentRating = formData[category as keyof RatingData] as number;
    const hovered = hoveredStar[category] || 0;
    const displayRating = hovered || currentRating;

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-6 w-6 cursor-pointer transition-colors ${
                star <= displayRating
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-300"
              }`}
              onMouseEnter={() => handleStarHover(category, star)}
              onMouseLeave={() => handleStarLeave(category)}
              onClick={() => handleStarClick(category, star)}
            />
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {displayRating > 0 ? `${displayRating}/5` : "Not rated"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Rate Supplier</h2>
            <p className="text-gray-600">{supplierName}</p>
            {eventTitle && (
              <p className="text-sm text-gray-500">Event: {eventTitle}</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Ratings */}
          <div className="space-y-4">
            {ratingCategories.map((category) => (
              <div key={category.key}>
                {renderStarRating(
                  category.key,
                  category.label,
                  category.required
                )}
              </div>
            ))}
          </div>

          {/* Written Feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Written Feedback
            </label>
            <textarea
              value={formData.feedback}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, feedback: e.target.value }))
              }
              placeholder="Share your experience with this supplier..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              rows={4}
            />
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Would you recommend this supplier?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="would_recommend"
                  checked={formData.would_recommend === true}
                  onChange={() =>
                    setFormData((prev) => ({ ...prev, would_recommend: true }))
                  }
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="would_recommend"
                  checked={formData.would_recommend === false}
                  onChange={() =>
                    setFormData((prev) => ({ ...prev, would_recommend: false }))
                  }
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* Photo Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo Attachments (Optional)
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4" />
                  Upload Photos
                </label>
                <span className="text-sm text-gray-500">
                  Max 5MB per image (JPEG, PNG)
                </span>
              </div>

              {/* Preview uploaded images */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {attachments.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Privacy Settings */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_public: e.target.checked,
                  }))
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                Make this review public (visible to other clients)
              </span>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || formData.rating === 0}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {loading ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
