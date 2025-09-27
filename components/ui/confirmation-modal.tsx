"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Copy, Save } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmationModalProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          icon: <Trash2 className="h-6 w-6 text-red-600" />,
          confirmButton: "bg-red-600 hover:bg-red-700 text-white",
          iconBg: "bg-red-50",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
          confirmButton: "bg-yellow-600 hover:bg-yellow-700 text-white",
          iconBg: "bg-yellow-50",
        };
      default:
        return {
          icon: <Save className="h-6 w-6 text-blue-600" />,
          confirmButton: "bg-blue-600 hover:bg-blue-700 text-white",
          iconBg: "bg-blue-50",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-gray-300 hover:bg-gray-50"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={styles.confirmButton}
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
