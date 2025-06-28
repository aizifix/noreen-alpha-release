import * as React from "react";

// Toast types
export type Toast = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

export type ToastActionElement = React.ReactElement;

interface ToastContextProps {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextProps | undefined>(
  undefined
);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Simple toast function for imperative use
export function toast(toast: Omit<Toast, "id">) {
  // This is a placeholder. In a real app, you would wire this up to your ToastProvider.
  // For now, just log to the console.
  console.log("Toast:", toast);
}
