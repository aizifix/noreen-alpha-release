"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider duration={3000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
            {/* Progress bar */}
            <div
              className={`absolute bottom-0 left-0 h-1 w-full bg-transparent`}
            >
              <div
                className={`h-1 w-full toast-progress ${
                  props.variant === "destructive"
                    ? "bg-red-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  // @ts-ignore custom CSS variable used by globals.css
                  "--toast-duration": "3s",
                }}
              />
            </div>
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
