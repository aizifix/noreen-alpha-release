"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VenueDetails } from "./venue-details";
import { VenueInclusions } from "./venue-inclusions";
import { VenueReview } from "./venue-review";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { endpoints } from "@/app/config/api";

// Types for venue data
export interface VenueFormData {
  // Step 1: Basic Details
  venue_title: string;
  venue_details: string;
  venue_location: string;
  venue_contact: string;
  venue_type: "internal" | "external";
  venue_capacity: number;
  venue_price: number;
  extra_pax_rate: number;
  venue_profile_picture?: File;
  venue_cover_photo?: File;
  is_active: boolean;

  // Step 2: Inclusions
  inclusions: VenueInclusion[];
}

export interface VenueInclusion {
  inclusion_name: string;
  inclusion_description?: string;
  inclusion_price: number;
  components: VenueComponent[];
}

export interface VenueComponent {
  component_name: string;
  component_description?: string;
  subcomponents: VenueSubcomponent[];
}

export interface VenueSubcomponent {
  subcomponent_name: string;
  subcomponent_description?: string;
}

export default function VenueBuilderPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<VenueFormData>({
    venue_title: "",
    venue_details: "",
    venue_location: "",
    venue_contact: "",
    venue_type: "internal",
    venue_capacity: 0,
    venue_price: 0,
    extra_pax_rate: 0,
    is_active: true,
    inclusions: [],
  });

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Use FormData for file uploads
      const formDataPayload = new FormData();
      formDataPayload.append("operation", "createVenue");
      formDataPayload.append("venue_title", formData.venue_title);
      formDataPayload.append("venue_details", formData.venue_details);
      formDataPayload.append("venue_location", formData.venue_location);
      formDataPayload.append("venue_contact", formData.venue_contact);
      formDataPayload.append("venue_type", formData.venue_type);
      formDataPayload.append(
        "venue_capacity",
        formData.venue_capacity.toString()
      );
      formDataPayload.append("venue_price", formData.venue_price.toString());
      formDataPayload.append(
        "extra_pax_rate",
        formData.extra_pax_rate.toString()
      );
      formDataPayload.append("is_active", formData.is_active ? "1" : "0");

      // Append files if they exist
      if (formData.venue_profile_picture) {
        formDataPayload.append(
          "venue_profile_picture",
          formData.venue_profile_picture
        );
      }
      if (formData.venue_cover_photo) {
        formDataPayload.append("venue_cover_photo", formData.venue_cover_photo);
      }

      // Append inclusions as JSON string
      formDataPayload.append(
        "inclusions_data",
        JSON.stringify(formData.inclusions)
      );

      const response = await fetch(endpoints.admin, {
        method: "POST",
        body: formDataPayload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      console.log("API Response:", text);

      const data = JSON.parse(text);

      if (data.status !== "success") {
        throw new Error(data.message || "Failed to create venue");
      }

      // Show success message
      toast.success("Venue created successfully!");

      // Redirect to venues list
      router.push("/admin/venues");
      router.refresh();
    } catch (error) {
      console.error("Error creating venue:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create venue"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (data: Partial<VenueFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const tabs = [
    { id: "details", label: "Venue Details" },
    { id: "inclusions", label: "Inclusions" },
    { id: "review", label: "Review" },
  ];

  const canProceed = {
    details: () =>
      formData.venue_title &&
      formData.venue_location &&
      formData.venue_contact &&
      formData.venue_capacity > 0 &&
      formData.venue_price >= 0,
    inclusions: () => true, // Inclusions are optional for venues
    review: () => true,
  };

  const handleNext = () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (
      currentIndex < tabs.length - 1 &&
      canProceed[activeTab as keyof typeof canProceed]()
    ) {
      setActiveTab(tabs[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Create New Venue</h1>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/venues")}
          >
            Cancel
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={!canProceed[tab.id as keyof typeof canProceed]()}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="details">
            <VenueDetails data={formData} onChange={updateFormData} />
          </TabsContent>

          <TabsContent value="inclusions">
            <VenueInclusions data={formData} onChange={updateFormData} />
          </TabsContent>

          <TabsContent value="review">
            <VenueReview data={formData} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={activeTab === "details"}
          >
            Back
          </Button>

          {activeTab === "review" ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Venue"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed[activeTab as keyof typeof canProceed]()}
            >
              Next
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
