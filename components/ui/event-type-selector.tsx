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
import { endpoints } from "@/app/config/api";
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
      const response = await axios.get(`${endpoints.admin}`, {
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
    // Only allow single selection - replace current selection
    setSelectedTypes([typeId]);
  };

  const handleSave = () => {
    onSave(selectedTypes);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-50">
              <Tag className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Select Event Type
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600 mt-1">
                Choose the event type this package is suitable for. Only one
                selection allowed.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Loading event types...</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[50vh] pr-2">
              <div className="space-y-2">
                {eventTypes.map((type) => (
                  <div
                    key={type.event_type_id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedTypes.includes(type.event_type_id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => handleTypeToggle(type.event_type_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedTypes.includes(type.event_type_id)
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedTypes.includes(type.event_type_id) && (
                            <Check className="h-2.5 w-2.5 text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm text-gray-900 truncate">
                            {type.event_name}
                          </h3>
                          {type.event_description && (
                            <p className="text-xs text-gray-600 line-clamp-1">
                              {type.event_description}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedTypes.includes(type.event_type_id) && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 text-xs flex-shrink-0"
                        >
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-gray-300 hover:bg-gray-50 text-sm"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
            size="sm"
          >
            {isLoading ? "Saving..." : "Save Event Type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
