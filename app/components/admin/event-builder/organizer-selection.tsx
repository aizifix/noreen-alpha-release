"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Check, Search, UserPlus, Loader } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { API_URL, endpoints } from "@/app/config/api";
import type { OrganizerSelectionProps } from "@/app/types/event-builder";

// Interface for organizer data from API
interface Organizer {
  organizer_id: string;
  organizer_name: string;
  organizer_role: string;
  organizer_email: string;
  organizer_phone: string;
  organizer_specialties: string;
  organizer_status: string;
  organizer_profile_picture?: string;
  talent_fee_min?: number | null;
  talent_fee_max?: number | null;
  talent_fee_currency?: string;
}

// Default organizers as fallback
const defaultOrganizers: Organizer[] = [
  {
    organizer_id: "noreen",
    organizer_name: "Noreen Lagdamin",
    organizer_role: "Lead Coordinator",
    organizer_email: "noreen@example.com",
    organizer_phone: "+63 912 345 6789",
    organizer_specialties: "Wedding Coordination, Event Planning",
    organizer_status: "active",
  },
  {
    organizer_id: "maria",
    organizer_name: "Maria Santos",
    organizer_role: "Assistant Coordinator",
    organizer_email: "maria@example.com",
    organizer_phone: "+63 923 456 7890",
    organizer_specialties: "Corporate Events, Birthday Parties",
    organizer_status: "active",
  },
  {
    organizer_id: "juan",
    organizer_name: "Juan Dela Cruz",
    organizer_role: "Event Specialist",
    organizer_email: "juan@example.com",
    organizer_phone: "+63 934 567 8901",
    organizer_specialties: "Outdoor Events, Catering Coordination",
    organizer_status: "active",
  },
];

export function OrganizerSelection({
  selectedIds,
  onSelect,
  onOrganizerDataUpdate,
  externalOrganizer,
  onExternalOrganizerChange,
}: Omit<OrganizerSelectionProps, "onNext"> & {
  onOrganizerDataUpdate?: (organizers: Organizer[]) => void;
  externalOrganizer?: string;
  onExternalOrganizerChange?: (organizer: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [newOrganizerDialog, setNewOrganizerDialog] = useState(false);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch organizers from backend
  useEffect(() => {
    const fetchOrganizers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log("🔄 Fetching organizers from API...");

        const response = await axios.post(endpoints.admin, {
          operation: "getAllOrganizers",
          page: 1,
          limit: 100, // Get all organizers
        });

        console.log("📡 API Response:", response.data);

        if (response.data.status === "success") {
          // Map the API response to match our interface
          const apiOrganizers = response.data.data?.organizers || [];
          console.log("📋 Raw organizers from API:", apiOrganizers);

          const mappedOrganizers = apiOrganizers.map((org: any) => ({
            organizer_id: org.organizer_id || org.user_id,
            organizer_name:
              org.full_name ||
              `${org.first_name || ""} ${org.last_name || ""}`.trim(),
            organizer_role: "Event Coordinator", // Default role since API doesn't provide it
            organizer_email: org.email || "",
            organizer_phone: org.contact_number || "",
            organizer_specialties:
              org.experience_summary || "Event Planning, Coordination",
            organizer_status: org.is_active ? "active" : "inactive",
            organizer_profile_picture: org.profile_picture || undefined,
            talent_fee_min: org.talent_fee_min ?? null,
            talent_fee_max: org.talent_fee_max ?? null,
            talent_fee_currency: org.talent_fee_currency || "PHP",
          }));

          console.log("✅ Mapped organizers:", mappedOrganizers);

          const finalOrganizers =
            mappedOrganizers.length > 0 ? mappedOrganizers : defaultOrganizers;
          setOrganizers(finalOrganizers);
          setError(null);

          // Notify parent component about the organizer data
          if (onOrganizerDataUpdate) {
            onOrganizerDataUpdate(finalOrganizers);
          }
        } else {
          console.error("❌ API Error:", response.data.message);
          setError(response.data.message || "Failed to fetch organizers");
          // Use default organizers as fallback
          setOrganizers(defaultOrganizers);
        }
      } catch (err) {
        console.error("💥 Network Error:", err);
        setError("Failed to connect to server. Using default organizers.");
        // Use default organizers as fallback
        setOrganizers(defaultOrganizers);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizers();
  }, []);

  // Filter organizers based on search query and availability filter
  const filteredOrganizers = organizers.filter((organizer) => {
    const specialties = organizer.organizer_specialties
      ? organizer.organizer_specialties.split(",").map((s) => s.trim())
      : [];

    const matchesSearch =
      organizer.organizer_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      organizer.organizer_role
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      specialties.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesAvailability = showAvailableOnly
      ? organizer.organizer_status === "active"
      : true;

    return matchesSearch && matchesAvailability;
  });

  const toggleOrganizer = (organizerId: string) => {
    if (selectedIds.includes(organizerId)) {
      onSelect(selectedIds.filter((id) => id !== organizerId));
    } else {
      onSelect([...selectedIds, organizerId]);
    }
  };

  const getAvailabilityBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Available
          </Badge>
        );
      case "busy":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200"
          >
            Busy
          </Badge>
        );
      case "inactive":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Inactive
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* External Organizer Section */}
      <Card>
        <CardHeader>
          <CardTitle>External Organizer</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add an external organizer for this event (optional)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="external-organizer">External Organizer Name</Label>
            <Input
              id="external-organizer"
              placeholder="Enter external organizer name"
              value={externalOrganizer || ""}
              onChange={(e) => onExternalOrganizerChange?.(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search organizers..."
            className="pl-8 w-full sm:w-[300px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="available-only"
              checked={showAvailableOnly}
              onChange={() => setShowAvailableOnly(!showAvailableOnly)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="available-only" className="text-sm cursor-pointer">
              Available only
            </Label>
          </div>
          <Dialog
            open={newOrganizerDialog}
            onOpenChange={setNewOrganizerDialog}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-1 bg-[#028A75] hover:bg-[#027A65] text-white"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Organizer</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Organizer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  This feature will be implemented in a future update.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="h-12 w-12 animate-spin text-green-500 mb-4" />
          <p className="text-lg text-gray-600">Loading organizers...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrganizers.map((organizer) => {
            const specialties = organizer.organizer_specialties
              ? organizer.organizer_specialties.split(",").map((s) => s.trim())
              : [];

            return (
              <Card
                key={organizer.organizer_id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary",
                  selectedIds.includes(organizer.organizer_id) &&
                    "border-primary"
                )}
                onClick={() => toggleOrganizer(organizer.organizer_id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={
                          organizer.organizer_profile_picture
                            ? `${API_URL}/serve-image.php?path=${encodeURIComponent(organizer.organizer_profile_picture)}`
                            : "/default_pfp.png"
                        }
                        alt={organizer.organizer_name}
                        onError={(
                          e: React.SyntheticEvent<HTMLImageElement>
                        ) => {
                          // Fallback to default if image fails to load
                          (e.currentTarget as HTMLImageElement).src =
                            "/default_pfp.png";
                        }}
                      />
                      <AvatarFallback>
                        {organizer.organizer_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">
                            {organizer.organizer_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {organizer.organizer_role}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getAvailabilityBadge(organizer.organizer_status)}
                          {selectedIds.includes(organizer.organizer_id) && (
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        {specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {specialties.map((specialty) => (
                              <Badge
                                key={specialty}
                                variant="secondary"
                                className="text-xs"
                              >
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 text-sm">
                          <p>{organizer.organizer_phone}</p>
                          <p>{organizer.organizer_email}</p>
                          {(organizer.talent_fee_min != null ||
                            organizer.talent_fee_max != null) && (
                            <p className="mt-1 text-muted-foreground">
                              Fee: {organizer.talent_fee_currency || "PHP"}{" "}
                              {organizer.talent_fee_min != null
                                ? organizer.talent_fee_min.toLocaleString()
                                : "?"}
                              {" - "}
                              {organizer.talent_fee_max != null
                                ? organizer.talent_fee_max.toLocaleString()
                                : "?"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && !error && filteredOrganizers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No organizers found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
}
