"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { secureStorage } from "@/app/utils/encryption";

interface DraftData {
  currentStep: number;
  clientData: any;
  eventDetails: any;
  selectedPackageId: string | null;
  selectedVenueId: string | null;
  selectedVenue: any | null;
  components: any[];
  originalPackagePrice: number | null;
  selectedOrganizers: string[];
  paymentData: any;
  timelineData: any[];
  weddingFormData: any;
  lastSaved: string;
  version: string;
}

interface DraftHandlerProps {
  formData: any;
  onLoadDraft: (draft: DraftData) => void;
  onClearDraft: () => void;
  isDirty: boolean;
}

const DRAFT_VERSION = "1.0.0";
const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export function DraftHandler({
  formData,
  onLoadDraft,
  onClearDraft,
  isDirty,
}: DraftHandlerProps) {
  const router = useRouter();
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formDataRef = useRef(formData);

  // Get draft key based on user ID
  const getDraftKey = useCallback(() => {
    const userData = secureStorage.getItem("user");
    const userId = userData?.user_id || "anonymous";
    return `eventDraft_${userId}`;
  }, []);

  // Save draft to localStorage
  const saveDraft = useCallback(
    async (showToast = false) => {
      try {
        const draftKey = getDraftKey();
        const draftData: DraftData = {
          ...formDataRef.current,
          lastSaved: new Date().toISOString(),
          version: DRAFT_VERSION,
        };

        localStorage.setItem(draftKey, JSON.stringify(draftData));

        if (showToast) {
          toast({
            title: "Draft Saved",
            description: "Your progress has been saved automatically.",
          });
        }

        console.log("💾 Draft saved:", draftData);
      } catch (error) {
        console.error("Error saving draft:", error);
        if (showToast) {
          toast({
            title: "Save Failed",
            description: "Failed to save draft. Please try again.",
            variant: "destructive",
          });
        }
      }
    },
    [getDraftKey]
  );

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const draftKey = getDraftKey();
      const saved = localStorage.getItem(draftKey);

      if (!saved) {
        console.log("📭 No draft found");
        return null;
      }

      const draftData: DraftData = JSON.parse(saved);

      // Check if draft is expired
      const lastSaved = new Date(draftData.lastSaved);
      const now = new Date();
      if (now.getTime() - lastSaved.getTime() > DRAFT_TTL) {
        console.log("⏰ Draft expired, clearing");
        localStorage.removeItem(draftKey);
        return null;
      }

      // Check version compatibility
      if (draftData.version !== DRAFT_VERSION) {
        console.log("🔄 Draft version mismatch, clearing");
        localStorage.removeItem(draftKey);
        return null;
      }

      console.log("📂 Draft loaded:", draftData);
      return draftData;
    } catch (error) {
      console.error("Error loading draft:", error);
      return null;
    }
  }, [getDraftKey]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      const draftKey = getDraftKey();
      localStorage.removeItem(draftKey);
      onClearDraft();
      toast({
        title: "Draft Cleared",
        description: "All saved progress has been cleared.",
      });
      console.log("🗑️ Draft cleared");
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  }, [getDraftKey, onClearDraft]);

  // Update formData ref when formData changes
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Auto-save draft when form data changes
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        saveDraft();
      }, 2000); // Debounce for 2 seconds

      return () => clearTimeout(timer);
    }
  }, [isDirty, saveDraft]);

  // Load draft on mount - only once
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      // Check if this is a page refresh (not navigation)
      const isRefresh =
        !document.referrer ||
        document.referrer.includes(window.location.origin);

      if (isRefresh) {
        // On refresh, always start from step 1 but keep the form data
        const draftWithStep1 = { ...draft, currentStep: 1 };
        onLoadDraft(draftWithStep1);
        toast({
          title: "Draft Restored",
          description:
            "Your previous progress has been restored. Starting from step 1.",
        });
      } else {
        // On navigation, restore everything including the step
        onLoadDraft(draft);
        toast({
          title: "Draft Restored",
          description: "Your previous progress has been restored.",
        });
      }
    }
  }, []); // Empty dependency array to run only once

  // Handle route change attempts
  useEffect(() => {
    // Listen for beforeunload (page refresh/close)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if there are unsaved changes AND we're not on step 1
      if (isDirty && formDataRef.current.currentStep !== 1) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    // Listen for popstate (browser back/forward)
    const handlePopState = (e: PopStateEvent) => {
      // Only show modal if there are unsaved changes AND we're not on step 1
      if (isDirty && formDataRef.current.currentStep !== 1) {
        e.preventDefault();
        setShowExitModal(true);
        // Push the current state back to prevent navigation
        window.history.pushState(null, "", window.location.href);
      }
    };

    // Listen for click events on navigation links - more targeted approach
    const handleClick = (e: MouseEvent) => {
      // Only intercept if there are unsaved changes AND we're not on step 1
      if (!isDirty || formDataRef.current.currentStep === 1) return;

      const target = e.target as HTMLElement;

      // Check for regular anchor links that navigate away from event-builder
      const link = target.closest("a[href]");
      if (link) {
        const href = link.getAttribute("href");
        if (href && !href.includes("/event-builder") && !href.startsWith("#")) {
          e.preventDefault();
          e.stopPropagation();
          setPendingRoute(href);
          setShowExitModal(true);
          return false;
        }
      }

      // Check for Next.js Link components
      const nextLink = target.closest("[data-nextjs-router-link]");
      if (nextLink) {
        const anchor = nextLink.querySelector("a[href]");
        if (anchor) {
          const href = anchor.getAttribute("href");
          if (
            href &&
            !href.includes("/event-builder") &&
            !href.startsWith("#")
          ) {
            e.preventDefault();
            e.stopPropagation();
            setPendingRoute(href);
            setShowExitModal(true);
            return false;
          }
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleClick, true); // Use capture phase

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isDirty]);

  // Handle exit modal actions
  const handleSaveAndExit = async () => {
    const routeToNavigate = pendingRoute;
    setIsSaving(true);
    await saveDraft(true);
    setIsSaving(false);
    setShowExitModal(false);
    setPendingRoute(null);

    if (routeToNavigate) {
      router.push(routeToNavigate);
    }
  };

  const handleDiscardAndExit = () => {
    const routeToNavigate = pendingRoute;
    clearDraft();
    setShowExitModal(false);
    setPendingRoute(null);

    if (routeToNavigate) {
      router.push(routeToNavigate);
    }
  };

  const handleCancel = () => {
    setShowExitModal(false);
    setPendingRoute(null);
  };

  return (
    <>
      {/* Exit Confirmation Modal */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Your Progress?</DialogTitle>
            <DialogDescription>
              You have unsaved changes on step {formDataRef.current.currentStep}
              . Would you like to save your progress as a draft before leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleSaveAndExit}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? "Saving..." : "Save & Exit"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardAndExit}
              className="w-full sm:w-auto"
            >
              Discard & Exit
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
