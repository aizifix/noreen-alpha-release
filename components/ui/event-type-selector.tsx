"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, X, Tag } from "lucide-react";
import axios from "axios";

interface EventType {
  event_type_id: number;
  event_name: string;
  event_description: string | null;
}

interface EventTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedTypes: number[]) => void;
  currentTypes: number[];
  isLoading?: boolean;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost/events-api";

export function EventTypeSelector({
  isOpen,
  onClose,
  onSave,
  currentTypes,
  isLoading = false,
}: EventTypeSelectorProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<number[]>(currentTypes);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEventTypes();
      setSelectedTypes(currentTypes);
    }
  }, [isOpen, currentTypes]);

  const fetchEventTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin.php`, {
        params: { operation: "getEventTypes" },
      });

      if (response.data.status === "success") {
        setEventTypes(response.data.event_types || []);
      }
    } catch (error) {
      console.error("Error fetching event types:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeToggle = (typeId: number) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSave = () => {
    onSave(selectedTypes);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-50">
              <Tag className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Select Event Types
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Choose which event types this package is suitable for. This will
                help with sorting and filtering.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading event types...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventTypes.map((type) => (
                <div
                  key={type.event_type_id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedTypes.includes(type.event_type_id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => handleTypeToggle(type.event_type_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedTypes.includes(type.event_type_id)
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedTypes.includes(type.event_type_id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {type.event_name}
                        </h3>
                        {type.event_description && (
                          <p className="text-sm text-gray-600">
                            {type.event_description}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedTypes.includes(type.event_type_id) && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800"
                      >
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? "Saving..." : "Save Event Types"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
