import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Save, Trash2, X } from "lucide-react";

interface LocalStorageRecoveryModalProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  currentStep?: number;
}

export function LocalStorageRecoveryModal({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
  currentStep = 1,
}: LocalStorageRecoveryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Unsaved Changes Detected</DialogTitle>
          </div>
          <DialogDescription>
            We found unsaved changes from your previous session on step{" "}
            {currentStep}. What would you like to do?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Save:</strong> Restore your previous progress and continue
              where you left off
            </p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Discard:</strong> Start fresh and clear all saved data
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onDiscard}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Discard
          </Button>
          <Button onClick={onSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
