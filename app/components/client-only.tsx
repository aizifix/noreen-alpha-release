"use client";

import { useEffect, useState, type ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ClientOnly component to prevent hydration errors
 * Only renders its children on the client-side after hydration is complete
 * Shows optional fallback during server-side rendering
 */
export default function ClientOnly({
  children,
  fallback = null,
}: ClientOnlyProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
