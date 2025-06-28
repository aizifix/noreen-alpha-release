"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface SlidingAlertProps {
  message: string;
  onClose: () => void;
  show: boolean;
}

export function SlidingAlert({ message, onClose, show }: SlidingAlertProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 transform transition-all duration-500 ease-in-out translate-y-0 opacity-100">
      <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <span>{message}</span>
        <button onClick={onClose} className="p-1 hover:bg-red-600 rounded">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
