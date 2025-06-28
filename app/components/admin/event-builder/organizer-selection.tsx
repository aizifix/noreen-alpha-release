"use client";

import { useState } from "react";
import { Check, Search, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import type { OrganizerSelectionProps } from "@/app/types/event-builder";

// Sample organizer data
const organizers = [
  {
    id: "org-001",
    name: "Maria Reyes",
    role: "Lead Coordinator",
    avatar: "/placeholder.svg?height=40&width=40",
    availability: "available",
    specialties: ["Wedding", "Corporate"],
    contact: "+63 917 123 4567",
    email: "maria.reyes@example.com",
  },
  {
    id: "org-002",
    name: "Juan Santos",
    role: "Event Manager",
    avatar: "/placeholder.svg?height=40&width=40",
    availability: "busy",
    specialties: ["Birthday", "Anniversary"],
    contact: "+63 918 234 5678",
    email: "juan.santos@example.com",
  },
  {
    id: "org-003",
    name: "Elena Cruz",
    role: "Decor Specialist",
    avatar: "/placeholder.svg?height=40&width=40",
    availability: "available",
    specialties: ["Wedding", "Birthday"],
    contact: "+63 919 345 6789",
    email: "elena.cruz@example.com",
  },
  {
    id: "org-004",
    name: "Carlos Mendoza",
    role: "Technical Director",
    avatar: "/placeholder.svg?height=40&width=40",
    availability: "available",
    specialties: ["Corporate", "Concert"],
    contact: "+63 920 456 7890",
    email: "carlos.mendoza@example.com",
  },
  {
    id: "org-005",
    name: "Sofia Garcia",
    role: "Catering Coordinator",
    avatar: "/placeholder.svg?height=40&width=40",
    availability: "leave",
    specialties: ["Wedding", "Corporate", "Birthday"],
    contact: "+63 921 567 8901",
    email: "sofia.garcia@example.com",
  },
];

export function OrganizerSelection({
  selectedIds,
  onSelect,
  onNext,
}: OrganizerSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [newOrganizerDialog, setNewOrganizerDialog] = useState(false);

  // Filter organizers based on search query and availability filter
  const filteredOrganizers = organizers.filter((organizer) => {
    const matchesSearch =
      organizer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      organizer.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      organizer.specialties.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesAvailability = showAvailableOnly
      ? organizer.availability === "available"
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

  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case "available":
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
      case "leave":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            On Leave
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
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
              <Button size="sm" className="gap-1">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOrganizers.map((organizer) => (
          <Card
            key={organizer.id}
            className={cn(
              "cursor-pointer transition-all hover:border-primary",
              selectedIds.includes(organizer.id) && "border-primary"
            )}
            onClick={() => toggleOrganizer(organizer.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={organizer.avatar} alt={organizer.name} />
                  <AvatarFallback>{organizer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{organizer.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {organizer.role}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getAvailabilityBadge(organizer.availability)}
                      {selectedIds.includes(organizer.id) && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1 mt-1">
                      {organizer.specialties.map((specialty) => (
                        <Badge
                          key={specialty}
                          variant="secondary"
                          className="text-xs"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-2 text-sm">
                      <p>{organizer.contact}</p>
                      <p>{organizer.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrganizers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No organizers found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
}
