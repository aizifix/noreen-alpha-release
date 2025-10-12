"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LogOut,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  User,
  MapPin,
  ChevronRight,
  Plus,
  Store,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../components/sidebar/AdminSidebar";
import { secureStorage } from "@/app/utils/encryption";
import { api } from "@/app/utils/apiWrapper";
import axios from "axios";
import { useTheme } from "next-themes";

// Configure axios base URL
axios.defaults.baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://noreen-events.online/noreen-events";
import { toast } from "@/components/ui/use-toast";
import { startSessionWatcher } from "@/app/utils/session";
import { useRealtimeNotifications } from "@/app/hooks/useRealtimeNotifications";

interface User {
  user_firstName: string;
  user_lastName: string;
  user_role: string;
  user_email: string;
  user_pfp?: string;
  profilePicture?: string;
}

interface MenuItem {
  icon: any;
  label: string;
  href?: string;
  items?: MenuItem[];
}

interface MenuSection {
  label: string;
  icon?: any;
  items: MenuItem[];
  isExpanded?: boolean;
}

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<
    Record<string, { status: "accepted" | "rejected" }>
  >({});
  const [organizerId, setOrganizerId] = useState<number | null>(null);
  const assignmentIdCacheRef = useRef<Record<number, number>>({});
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const menuSections: MenuSection[] = [
    {
      label: "Overview",
      items: [
        {
          icon: LayoutDashboard,
          label: "Dashboard",
          href: "/organizer/dashboard",
        },
        { icon: BarChart3, label: "Overview", href: "/organizer/overview" },
      ],
    },
    {
      label: "Event Management",
      items: [
        { icon: Calendar, label: "Events", href: "/organizer/events" },
        { icon: Users, label: "Assignments", href: "/organizer/assignments" },
      ],
    },
  ];

  // Mobile navigation items for bottom nav
  const mobileNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/organizer/dashboard" },
    { icon: BarChart3, label: "Overview", href: "/organizer/overview" },
    { icon: Calendar, label: "Events", href: "/organizer/events" },
    { icon: Users, label: "Assignments", href: "/organizer/assignments" },
  ];

  // Initialize expandedSections with all section labels
  const [expandedSections, setExpandedSections] = useState<string[]>(
    menuSections.map((section) => section.label)
  );

  // After mounting, we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isUserDropdownOpen && !target.closest(".relative")) {
        setIsUserDropdownOpen(false);
      }
      if (isMobileMenuOpen && !target.closest(".mobile-menu")) {
        setIsMobileMenuOpen(false);
      }
      if (
        notificationsOpen &&
        notifRef.current &&
        !notifRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserDropdownOpen, isMobileMenuOpen, notificationsOpen]);

  useEffect(() => {
    // Start session timeout watcher for organizer portal
    const stopWatcher = startSessionWatcher({
      storageKeyPrefix: "session_organizer",
      onTimeout: () => {
        try {
          secureStorage.removeItem("user");
        } catch {}
        try {
          document.cookie =
            "pending_otp_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
          document.cookie =
            "pending_otp_email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        } catch {}
        router.replace("/auth/login");
      },
    });
    return () => {
      stopWatcher && stopWatcher();
    };
  }, [router]);

  useEffect(() => {
    try {
      const userData = secureStorage.getItem("user");
      if (!userData) {
        console.log("No user data found in secure storage");
        router.replace("/auth/login");
        return;
      }

      if (
        userData.user_role !== "Organizer" &&
        userData.user_role.toLowerCase() !== "organizer"
      ) {
        console.log("Invalid user role:", userData.user_role);
        // Redirect to correct dashboard based on role
        const role = userData.user_role.toLowerCase();
        if (role === "admin") {
          router.replace("/admin/dashboard");
        } else if (role === "client") {
          router.replace("/client/dashboard");
        } else if (role === "vendor") {
          router.replace("/vendor/dashboard");
        } else {
          router.replace("/auth/login");
        }
        return;
      }
      setUser(userData);
      // Resolve organizer_id for this user for later accept/reject actions
      resolveOrganizerId(userData.user_id);
      try {
        const stored = localStorage.getItem(
          `organizer_decisions_${userData.user_id}`
        );
        if (stored) setDecisions(JSON.parse(stored));
      } catch {}
      fetchPendingInvites(userData.user_id);
    } catch (error) {
      console.error("Error in organizer layout:", error);
      secureStorage.removeItem("user");
      router.replace("/auth/login");
    }
  }, []);

  const resolveOrganizerId = async (userId: number) => {
    try {
      const resp = await axios.post("organizer.php", {
        operation: "getOrganizerProfile",
        user_id: userId,
      });
      if (resp.data?.status === "success") {
        setOrganizerId(resp.data.data?.organizer_id || null);
      } else {
        // Fallback: use userId when mapping is unavailable
        setOrganizerId(userId || null);
      }
    } catch {
      setOrganizerId(userId || null);
    }
  };

  const fetchPendingInvites = async (orgId: number) => {
    try {
      const res = await axios.post("organizer.php", {
        operation: "getOrganizerEvents",
        organizer_id: orgId,
      });
      if (res.data?.status === "success") {
        const assigned = (res.data.data || []).filter(
          (evt: any) => (evt.assignment_status || evt.status) === "assigned"
        );
        // Always also merge attachment invites
        let attachmentInvites: any[] = [];
        try {
          const response = await axios.post("admin.php", {
            operation: "getAllEvents",
          });
          const allEvents =
            response.data?.status === "success"
              ? response.data.events || []
              : [];
          attachmentInvites = allEvents.filter((e: any) => {
            try {
              const attachments = e.event_attachments
                ? JSON.parse(e.event_attachments)
                : e.attachments;
              if (!attachments || !Array.isArray(attachments)) return false;
              const invite = attachments.find(
                (a: any) => a.attachment_type === "organizer_invites"
              );
              if (!invite || !invite.description) return false;
              const data = JSON.parse(invite.description);
              const isPending = Array.isArray(data.pending)
                ? data.pending.includes(String(orgId)) ||
                  data.pending.includes(
                    String(secureStorage.getItem("user")?.user_id)
                  )
                : false;
              return isPending;
            } catch {
              return false;
            }
          });
        } catch {}

        // Exclude those already locally decided
        const decided = new Set(
          Object.entries(decisions)
            .filter(([, v]) => v?.status)
            .map(([k]) => Number(k))
        );
        const merged = new Map<number, any>();
        for (const e of assigned)
          if (!decided.has(Number(e.event_id)))
            merged.set(Number(e.event_id), e);
        for (const e of attachmentInvites)
          if (
            !decided.has(Number(e.event_id)) &&
            !merged.has(Number(e.event_id))
          )
            merged.set(Number(e.event_id), e);
        setPendingInvites(Array.from(merged.values()));
      } else {
        // API error: fallback to legacy invites via attachments
        try {
          const response = await axios.post("admin.php", {
            operation: "getAllEvents",
          });
          const allEvents =
            response.data?.status === "success"
              ? response.data.events || []
              : [];
          const invites = allEvents.filter((e: any) => {
            try {
              const attachments = e.event_attachments
                ? JSON.parse(e.event_attachments)
                : e.attachments;
              if (!attachments || !Array.isArray(attachments)) return false;
              const invite = attachments.find(
                (a: any) => a.attachment_type === "organizer_invites"
              );
              if (!invite || !invite.description) return false;
              const data = JSON.parse(invite.description);
              const isPending = Array.isArray(data.pending)
                ? data.pending.includes(String(orgId)) ||
                  data.pending.includes(
                    String(secureStorage.getItem("user")?.user_id)
                  )
                : false;
              const decision = decisions[String(e.event_id)]?.status;
              return isPending && !decision;
            } catch {
              return false;
            }
          });
          setPendingInvites(invites);
        } catch {
          setPendingInvites([]);
        }
      }
    } catch {
      // Network/SQL error: fallback to legacy invites via attachments
      try {
        const response = await axios.post("admin.php", {
          operation: "getAllEvents",
        });
        const allEvents =
          response.data?.status === "success" ? response.data.events || [] : [];
        const invites = allEvents.filter((e: any) => {
          try {
            const attachments = e.event_attachments
              ? JSON.parse(e.event_attachments)
              : e.attachments;
            if (!attachments || !Array.isArray(attachments)) return false;
            const invite = attachments.find(
              (a: any) => a.attachment_type === "organizer_invites"
            );
            if (!invite || !invite.description) return false;
            const data = JSON.parse(invite.description);
            const isPending = Array.isArray(data.pending)
              ? data.pending.includes(String(orgId)) ||
                data.pending.includes(
                  String(secureStorage.getItem("user")?.user_id)
                )
              : false;
            const decision = decisions[String(e.event_id)]?.status;
            return isPending && !decision;
          } catch {
            return false;
          }
        });
        setPendingInvites(invites);
      } catch {
        setPendingInvites([]);
      }
    }
  };

  // Periodically refresh pending invites so the bell badge updates near real-time
  useEffect(() => {
    if (!organizerId) return;
    const id = window.setInterval(
      () => fetchPendingInvites(organizerId),
      15000
    );
    return () => window.clearInterval(id);
  }, [organizerId, decisions]);

  const persistDecisions = (
    userId: number,
    next: Record<string, { status: "accepted" | "rejected" }>
  ) => {
    try {
      localStorage.setItem(
        `organizer_decisions_${userId}`,
        JSON.stringify(next)
      );
    } catch {}
  };

  const handleInviteDecision = (
    eventItem: any,
    status: "accepted" | "rejected"
  ) => {
    const doUpdate = async () => {
      try {
        console.debug("[Organizer] handleInviteDecision:init", {
          eventId: eventItem?.event_id,
          status,
        });
      } catch {}
      const currentUser = secureStorage.getItem("user");
      if (!currentUser?.user_id) return;
      // Ensure we have organizerId
      const orgId = organizerId ?? currentUser.user_id;
      // Resolve assignment_id for this event
      const assignmentId = await getAssignmentIdForEvent(eventItem.event_id);
      if (!assignmentId) {
        console.warn("[Organizer] No assignment found for event", {
          eventId: eventItem?.event_id,
        });
        toast({
          title: "Unable to proceed",
          description: "Assignment not found for this event.",
          variant: "destructive",
        });
        return;
      }

      try {
        console.debug("[Organizer] updateAssignmentStatus:request", {
          url: "organizer.php",
          payload: {
            operation: "updateAssignmentStatus",
            assignment_id: assignmentId,
            status,
            organizer_id: orgId,
          },
        });
        const res = await axios.post(
          "organizer.php",
          {
            operation: "updateAssignmentStatus",
            ...(assignmentId ? { assignment_id: assignmentId } : {}),
            event_id: eventItem.event_id,
            status,
            organizer_id: orgId,
          },
          { headers: { "Content-Type": "application/json" } }
        );
        console.debug("[Organizer] updateAssignmentStatus:response", res?.data);
        if (res.data?.status === "success") {
          const key = String(eventItem.event_id);
          const next = { ...decisions, [key]: { status } };
          setDecisions(next);
          persistDecisions(currentUser.user_id, next);
          setPendingInvites((prev) =>
            prev.filter((e) => e.event_id !== eventItem.event_id)
          );

          // Refresh notifications to sync with the action
          await refreshNotifications(currentUser);

          // Trigger calendar refresh
          window.dispatchEvent(
            new CustomEvent("calendarRefresh", {
              detail: { eventId: eventItem.event_id, action: status },
            })
          );

          toast({
            title:
              status === "accepted" ? "Invite accepted" : "Invite rejected",
            description:
              status === "accepted"
                ? "You are now assigned to this event."
                : "You have declined this event assignment.",
          });
        } else {
          const message = res?.data?.message || "Failed to update status";
          console.error("[Organizer] updateAssignmentStatus:error", {
            message,
          });
          throw new Error(message);
        }
      } catch (e) {
        console.error("[Organizer] updateAssignmentStatus:exception", e);
        toast({
          title: "Action failed",
          description: "Could not update assignment status. Please try again.",
          variant: "destructive",
        });
      }
    };
    doUpdate();
  };

  const getAssignmentIdForEvent = async (eventId: number) => {
    if (assignmentIdCacheRef.current[eventId]) {
      return assignmentIdCacheRef.current[eventId];
    }
    try {
      const res = await axios.get(
        `admin.php?operation=getEventOrganizerDetails&event_id=${eventId}`
      );
      if (
        res.data?.status === "success" &&
        res.data?.data?.organizer_assignment_id
      ) {
        const id = Number(res.data.data.organizer_assignment_id);
        assignmentIdCacheRef.current[eventId] = id;
        return id;
      }
    } catch {}
    return null;
  };

  const handleClearAllNotifications = async () => {
    try {
      const currentUser = secureStorage.getItem("user");
      if (!currentUser?.user_id) return;

      // Clear pending invites
      setPendingInvites([]);

      // Mark all notifications as read
      await axios.put("notifications.php", {
        operation: "mark_read",
        user_id: currentUser.user_id,
      });

      // Clear notifications from state
      setNotifications([]);
      setUnreadNotifCount(0);

      toast({
        title: "Notifications Cleared",
        description: "All notifications have been cleared.",
      });
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast({
        title: "Error",
        description: "Failed to clear notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  const refreshNotifications = async (currentUser: any) => {
    try {
      // Refresh notification counts
      await fetchNotificationCounts(currentUser);

      // Refresh notifications list if dropdown is open
      if (notificationsOpen) {
        await fetchNotificationsList(currentUser);
      }

      // Refresh pending invites
      await fetchPendingInvites();
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    }
  };

  // Listen for user data changes (like profile picture updates)
  useEffect(() => {
    const handleUserDataChange = () => {
      try {
        const userData = secureStorage.getItem("user");
        if (
          userData &&
          (userData.user_role === "Organizer" ||
            userData.user_role.toLowerCase() === "organizer")
        ) {
          console.log("Organizer layout: User data updated, refreshing navbar");
          setUser(userData);
        }
      } catch (error) {
        console.error(
          "Organizer layout: Error handling user data change:",
          error
        );
      }
    };

    const handleAssignmentAction = async (event: any) => {
      try {
        const { eventId, action } = event.detail;
        console.log("Assignment action taken:", { eventId, action });

        // Remove the specific event from pending invites
        setPendingInvites((prev) => prev.filter((e) => e.event_id !== eventId));

        // Refresh notifications
        const currentUser = secureStorage.getItem("user");
        if (currentUser?.user_id) {
          await refreshNotifications(currentUser);
        }
      } catch (error) {
        console.error("Error handling assignment action:", error);
      }
    };

    // Listen for storage changes
    window.addEventListener("userDataChanged", handleUserDataChange);
    // Listen for assignment actions from other pages
    window.addEventListener("assignmentActionTaken", handleAssignmentAction);

    return () => {
      window.removeEventListener("userDataChanged", handleUserDataChange);
      window.removeEventListener(
        "assignmentActionTaken",
        handleAssignmentAction
      );
    };
  }, []);

  // Refresh invites when organizerId is resolved or decisions change
  useEffect(() => {
    if (organizerId) {
      fetchPendingInvites(organizerId);
    }
  }, [organizerId, decisions]);

  // Organizer general notifications (counts + list on open)
  const fetchNotificationCounts = async (currentUser: any) => {
    try {
      const userId = currentUser?.user_id;
      if (!userId) return;

      const res = await axios.get("notifications.php", {
        params: {
          operation: "get_counts",
          user_id: userId,
        },
        timeout: 5000, // 5 second timeout
      });

      if (res.data?.status === "success") {
        setUnreadNotifCount(Number(res.data.counts?.unread || 0));
      }
    } catch (err: any) {
      // Handle network errors gracefully
      if (
        err.code === "NETWORK_ERROR" ||
        err.message?.includes("ERR_INTERNET_DISCONNECTED") ||
        err.message?.includes("Network Error") ||
        err.code === "ECONNABORTED"
      ) {
        console.warn("Network offline - notification count fetch skipped");
        return;
      }
      // For other errors, silently ignore to avoid console spam
    }
  };

  const fetchNotificationsList = async (currentUser: any) => {
    try {
      const userId = currentUser?.user_id;
      if (!userId) return;
      setIsNotifLoading(true);

      const res = await axios.get("notifications.php", {
        params: {
          operation: "get_notifications",
          user_id: userId,
          limit: 10,
          offset: 0,
        },
        timeout: 5000, // 5 second timeout
      });

      if (res.data?.status === "success") {
        setNotifications(
          Array.isArray(res.data.notifications) ? res.data.notifications : []
        );
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      // Handle network errors gracefully
      if (
        err.code === "NETWORK_ERROR" ||
        err.message?.includes("ERR_INTERNET_DISCONNECTED") ||
        err.message?.includes("Network Error") ||
        err.code === "ECONNABORTED"
      ) {
        console.warn("Network offline - notification list fetch skipped");
        // Keep existing notifications when offline
        return;
      }
      setNotifications([]);
    } finally {
      setIsNotifLoading(false);
    }
  };

  // Poll counts periodically
  useEffect(() => {
    const currentUser = secureStorage.getItem("user");
    if (!currentUser?.user_id) return;
    fetchNotificationCounts(currentUser);
    const interval = setInterval(
      () => fetchNotificationCounts(currentUser),
      15000
    );
    return () => clearInterval(interval);
  }, []);

  // Realtime notifications: get_recent + counts
  useRealtimeNotifications({
    userId: user?.user_id as any,
    onCounts: ({ unread }) => setUnreadNotifCount(unread),
    onNew: (items) => {
      if (!notificationsOpen) return;
      setNotifications((prev) => {
        const map = new Map<number, any>();
        for (const n of prev) map.set(n.notification_id, n);
        for (const n of items as any[]) map.set(n.notification_id, n);
        const merged = Array.from(map.values());
        merged.sort((a: any, b: any) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });
        return merged;
      });
    },
  });

  const handleLogout = () => {
    try {
      const current = secureStorage.getItem("user");
      if (current?.user_id) {
        axios
          .post(
            "auth.php",
            { operation: "logout", user_id: current.user_id },
            { headers: { "Content-Type": "application/json" } }
          )
          .catch(() => {});
      }
    } catch {}
    try {
      secureStorage.removeItem("user");
      document.cookie =
        "pending_otp_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie =
        "pending_otp_email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      window.location.replace("/auth/login");
    } catch (error) {
      console.error("Error during logout:", error);
      window.location.replace("/auth/login");
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionLabel: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionLabel)
        ? prev.filter((label) => label !== sectionLabel)
        : [...prev, sectionLabel]
    );
  };

  // Optional: Save expanded state to localStorage to persist user preferences
  useEffect(() => {
    const savedExpandedSections = localStorage.getItem(
      "sidebarExpandedSections"
    );
    if (savedExpandedSections) {
      setExpandedSections(JSON.parse(savedExpandedSections));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "sidebarExpandedSections",
      JSON.stringify(expandedSections)
    );
  }, [expandedSections]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100 w-full overflow-x-hidden lg:pl-64">
      {/* Desktop Sidebar (Fixed) - Hidden on mobile */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-20 w-64">
        <Sidebar className="h-full w-64 bg-white border-r">
          <SidebarHeader className="border-b px-3 py-4 h-16 flex items-center justify-start">
            <Image
              src={Logo || "/placeholder.svg"}
              alt="Noreen Logo"
              width={100}
              height={40}
              className="object-contain"
            />
          </SidebarHeader>
          <SidebarContent className="flex flex-col h-[calc(100%-64px)]">
            <SidebarMenu className="flex-1 mt-4 space-y-1 px-1">
              {menuSections.map((section) => {
                const isSectionExpanded = expandedSections.includes(
                  section.label
                );
                const hasActiveItem = section.items.some(
                  (item) =>
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
                );

                return (
                  <div key={section.label} className="space-y-1">
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(section.label)}
                      className={`
                        group flex items-center justify-between w-full px-3 py-2 text-sm
                        ${hasActiveItem ? "text-brand-500 font-medium" : "text-gray-600"}
                        hover:bg-gray-100 rounded-md transition-colors
                      `}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider">
                          {section.label}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            isSectionExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Section Items */}
                    <div
                      className={`
                        space-y-1 transition-all duration-200 ease-in-out
                        ${isSectionExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}
                      `}
                    >
                      {section.items.map((item) => {
                        const isActive =
                          pathname === item.href ||
                          pathname.startsWith(`${item.href}/`);

                        return (
                          <SidebarMenuItem key={item.label}>
                            <SidebarMenuButton asChild>
                              <Link
                                href={item.href || "#"}
                                className={`
                                  flex items-center gap-3 px-3 py-2 rounded-md transition
                                  ml-2 text-sm
                                  ${
                                    isActive
                                      ? "bg-brand-500 text-white"
                                      : "text-gray-600 hover:bg-brand-50"
                                  }
                                `}
                              >
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Desktop Navbar - Hidden on mobile */}
        <header className="hidden lg:flex fixed top-0 right-0 left-64 z-10 bg-white border-b px-6 py-4 h-16 justify-end items-center">
          {/* User Info on the Right */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="Toggle theme"
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-5 w-5 text-gray-600" />
              ) : (
                <Moon className="h-5 w-5 text-gray-600" />
              )}
            </button>

            <div className="relative cursor-pointer" ref={notifRef}>
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  if (!notificationsOpen) {
                    const currentUser = secureStorage.getItem("user");
                    if (currentUser?.user_id) {
                      fetchNotificationsList(currentUser);
                    }
                  }
                }}
                className="cursor-pointer relative"
                aria-label="Notifications"
              >
                <Bell className="h-8 w-8 text-gray-600 border border-[#a1a1a1] p-1 rounded-md" />
                {(pendingInvites?.length || 0) > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">
                    {pendingInvites.length}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-b flex items-center justify-between">
                    <span>Notifications</span>
                    {(pendingInvites?.length > 0 ||
                      notifications?.length > 0) && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {/* Pending assignment invites */}
                    {pendingInvites && pendingInvites.length > 0 && (
                      <>
                        {pendingInvites.map((evt: any) => (
                          <div
                            key={`invite-${evt.event_id}`}
                            className="px-4 py-3 border-b last:border-b-0"
                          >
                            <div className="text-sm font-medium text-gray-900">
                              Pending Organizer Invite
                            </div>
                            <div className="text-sm text-gray-700 truncate">
                              {evt.event_title}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() =>
                                  handleInviteDecision(evt, "accepted")
                                }
                                className="px-2 py-1 rounded bg-green-600 text-white text-xs"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() =>
                                  handleInviteDecision(evt, "rejected")
                                }
                                className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => router.push("/organizer/events")}
                                className="ml-auto px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs border"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {/* General notifications */}
                    {notifications && notifications.length > 0 && (
                      <>
                        {notifications.map((n, idx) => (
                          <div
                            key={`organizer-notification-${n.notification_id || "temp"}-${idx}-${Date.now()}`}
                            className="px-4 py-3 border-b last:border-b-0"
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {n.notification_title || "Notification"}
                            </div>
                            <div className="text-sm text-gray-700 truncate">
                              {n.notification_message}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {(!pendingInvites || pendingInvites.length === 0) &&
                      (!notifications || notifications.length === 0) && (
                        <div className="px-4 py-3 text-sm text-gray-600">
                          No new notifications
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Profile Picture */}
                <div className="h-10 w-10 border border-[#D2D2D2] rounded-full overflow-hidden">
                  {user.user_pfp && user.user_pfp.trim() !== "" ? (
                    <img
                      src={api.getServeImageUrl(user.user_pfp)}
                      alt={`${user.user_firstName} ${user.user_lastName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : user.profilePicture ? (
                    <Image
                      src={user.profilePicture || "/placeholder.svg"}
                      alt={`${user.user_firstName} ${user.user_lastName}`}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {user?.user_firstName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Name and Role */}
                <div className="text-sm text-gray-600 text-left">
                  <div className="font-semibold text-left">
                    {user?.user_firstName} {user?.user_lastName}
                  </div>
                  <div className="text-left">
                    <span className="text-[#8b8b8b] font-semibold text-xs">
                      {user?.user_role}
                    </span>
                  </div>
                </div>

                {/* Dropdown Arrow */}
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform ${isUserDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown Menu */}
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      router.push("/organizer/profile");
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      router.push("/organizer/settings");
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Header - Only shown on mobile */}
        <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src={Logo || "/placeholder.svg"}
              alt="Noreen Logo"
              width={80}
              height={32}
              className="object-contain"
            />
          </div>

          {/* Right Side - User Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div
              className="relative cursor-pointer"
              ref={notifRef}
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                if (!notificationsOpen) {
                  const currentUser = secureStorage.getItem("user");
                  if (currentUser?.user_id) {
                    fetchNotificationsList(currentUser);
                  }
                }
              }}
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {(pendingInvites?.length || 0) > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center px-1">
                  {pendingInvites.length}
                </span>
              )}

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-[280px] max-h-[80vh] overflow-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50 fixed-dropdown">
                  <div className="px-4 py-2 border-b flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Notifications
                    </span>
                    {(pendingInvites?.length > 0 ||
                      notifications?.length > 0) && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="p-2">
                    {isNotifLoading ? (
                      <div className="py-6 text-center text-sm text-gray-500">
                        Loading...
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-auto">
                        {/* Pending assignment invites */}
                        {pendingInvites && pendingInvites.length > 0 && (
                          <>
                            {pendingInvites.map((evt: any) => (
                              <div
                                key={`invite-${evt.event_id}`}
                                className="px-4 py-3 border-b last:border-b-0"
                              >
                                <div className="text-sm font-medium text-gray-900">
                                  Pending Organizer Invite
                                </div>
                                <div className="text-sm text-gray-700 truncate">
                                  {evt.event_title}
                                </div>
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={() =>
                                      handleInviteDecision(evt, "accepted")
                                    }
                                    className="px-2 py-1 rounded bg-green-600 text-white text-xs"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleInviteDecision(evt, "rejected")
                                    }
                                    className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() =>
                                      router.push("/organizer/events")
                                    }
                                    className="ml-auto px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs border"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                        {/* General notifications */}
                        {notifications && notifications.length > 0 && (
                          <>
                            {notifications.map((n, idx) => (
                              <div
                                key={`organizer-notification-${n.notification_id || "temp"}-${idx}-${Date.now()}`}
                                className="px-4 py-3 border-b last:border-b-0"
                              >
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {n.notification_title || "Notification"}
                                </div>
                                <div className="text-sm text-gray-700 truncate">
                                  {n.notification_message}
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                        {(!pendingInvites || pendingInvites.length === 0) &&
                          (!notifications || notifications.length === 0) && (
                            <div className="px-4 py-3 text-sm text-gray-600">
                              No new notifications
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="h-8 w-8 border border-gray-300 rounded-full overflow-hidden">
                  {user.user_pfp && user.user_pfp.trim() !== "" ? (
                    <img
                      src={api.getServeImageUrl(user.user_pfp)}
                      alt={`${user.user_firstName} ${user.user_lastName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : user.profilePicture ? (
                    <Image
                      src={user.profilePicture || "/placeholder.svg"}
                      alt={`${user.user_firstName} ${user.user_lastName}`}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {user?.user_firstName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              </button>

              {/* Mobile Dropdown Menu */}
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border z-50">
                  <div className="px-4 py-2 border-b">
                    <div className="font-medium text-gray-900">
                      {user?.user_firstName} {user?.user_lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user?.user_role}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      router.push("/organizer/profile");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      router.push("/organizer/settings");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {mounted && theme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    Theme
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-full hover:bg-gray-100 ml-1"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 text-gray-600" />
              ) : (
                <Menu className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-white border-b shadow-lg z-40 mobile-menu">
              <div className="py-2">
                {menuSections.map((section) => (
                  <div key={section.label}>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {section.label}
                    </div>
                    {section.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.label}
                          href={item.href || "#"}
                          className={`flex items-center gap-3 px-4 py-3 transition ${
                            isActive
                              ? "bg-brand-50 text-brand-600 border-r-2 border-brand-500"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Page Content - Adjusted for Navbar */}
        <main className="lg:pt-24 lg:p-6 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0 min-w-0 max-w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-30 lg:hidden">
        <div className="flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2 px-3 min-w-0 flex-1 transition ${
                  isActive
                    ? "text-brand-600"
                    : "text-gray-600 hover:text-brand-600"
                }`}
              >
                <item.icon
                  className={`h-5 w-5 ${isActive ? "text-brand-600" : "text-gray-600"}`}
                />
                <span
                  className={`text-xs font-medium truncate ${
                    isActive ? "text-brand-600" : "text-gray-600"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
