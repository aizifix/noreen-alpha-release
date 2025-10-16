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
  Wrench,
  ShoppingBag,
  CreditCard,
  BarChart3,
  Sun,
  Moon,
  ChevronDown,
  User,
  CalendarCheck,
  Package,
  MapPin,
  UserCheck,
  Truck,
  ChevronRight,
  Plus,
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
import { startSessionWatcher } from "@/app/utils/session";
import { useRealtimeNotifications } from "@/app/hooks/useRealtimeNotifications";
import { makeNetworkRequest } from "@/app/utils/networkUtils";

interface User {
  user_id?: number;
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

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname(); // Get current active path
  const [user, setUser] = useState<User | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  interface NotificationItem {
    notification_id: number;
    notification_type?: string;
    notification_title?: string;
    notification_message: string;
    notification_priority?: string;
    notification_icon?: string | null;
    notification_url?: string | null;
    event_id?: number | null;
    booking_id?: number | null;
    notification_status?: string;
    read_at?: string | null;
    created_at: string;
  }

  // Create menu sections with staff-specific permissions
  const getMenuSections = (): MenuSection[] => {
    return [
      {
        label: "Overview",
        items: [
          {
            icon: LayoutDashboard,
            label: "Dashboard",
            href: "/staff/dashboard",
          },
          { icon: BarChart3, label: "Reports", href: "/staff/reports" },
        ],
      },
      {
        label: "Event Management",
        items: [
          { icon: Calendar, label: "Events", href: "/staff/events" },
          {
            icon: Wrench,
            label: "Event Builder",
            href: "/staff/event-builder",
          },
          { icon: CalendarCheck, label: "Bookings", href: "/staff/bookings" },
        ],
      },
      {
        label: "Resources",
        items: [
          { icon: Package, label: "Packages", href: "/staff/packages" },
          { icon: MapPin, label: "Venues", href: "/staff/venues" },
        ],
      },
      {
        label: "People",
        items: [
          { icon: Users, label: "Clients", href: "/staff/clients" },
          { icon: UserCheck, label: "Organizers", href: "/staff/organizers" },
          { icon: Truck, label: "Suppliers", href: "/staff/supplier" },
        ],
      },
      {
        label: "Finance",
        items: [
          { icon: CreditCard, label: "Payments", href: "/staff/payments" },
        ],
      },
    ];
  };

  const menuSections = getMenuSections();

  // Initialize expandedSections with all section labels
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // After mounting, we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize expanded sections when menu sections change
  useEffect(() => {
    if (expandedSections.length === 0) {
      setExpandedSections(menuSections.map((section) => section.label));
    }
  }, [menuSections, expandedSections.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isUserDropdownOpen && !target.closest(".relative")) {
        setIsUserDropdownOpen(false);
      }
      if (
        isNotifDropdownOpen &&
        notifRef.current &&
        !notifRef.current.contains(target)
      ) {
        setIsNotifDropdownOpen(false);
      }
      // Close mobile menu when clicking outside
      if (isMobileMenuOpen && !target.closest(".mobile-menu-container")) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserDropdownOpen, isNotifDropdownOpen, isMobileMenuOpen]);

  useEffect(() => {
    // Start session timeout watcher for staff portal
    const stopWatcher = startSessionWatcher({
      storageKeyPrefix: "session_staff",
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
      let userData: any = secureStorage.getItem("user");
      if (typeof userData === "string") {
        try {
          userData = JSON.parse(userData);
        } catch {
          userData = null;
        }
      }
      if (!userData) {
        console.log("No user data found in secure storage");
        router.replace("/auth/login");
        return;
      }

      if (userData.user_role !== "Staff") {
        console.log("Invalid user role:", userData.user_role);
        // Redirect to correct dashboard based on role
        const role = userData.user_role.toLowerCase();
        if (role === "client") {
          router.replace("/client/dashboard");
        } else if (role === "vendor" || role === "organizer") {
          router.replace("/organizer/dashboard");
        } else if (role === "admin") {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/auth/login");
        }
        return;
      }
      setUser(userData);
      // Fetch notifications once user is ready
      fetchNotificationCounts(userData);
    } catch (error) {
      console.error("Error in staff layout:", error);
      secureStorage.removeItem("user");
      router.replace("/auth/login");
    }
  }, []); // Remove router dependency to prevent repeated calls

  // Listen for user data changes (like profile picture updates)
  useEffect(() => {
    const handleUserDataChange = (event: any) => {
      try {
        const userData = secureStorage.getItem("user");
        if (userData && userData.user_role === "Staff") {
          console.log("Staff layout: User data updated, refreshing navbar", {
            user_pfp: userData.user_pfp,
            eventDetail: event.detail,
          });
          setUser(userData);
        }
      } catch (error) {
        console.error("Staff layout: Error handling user data change:", error);
      }
    };

    // Listen for storage changes
    window.addEventListener("userDataChanged", handleUserDataChange);

    return () => {
      window.removeEventListener("userDataChanged", handleUserDataChange);
    };
  }, []);

  // Poll unread notification count periodically
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => fetchNotificationCounts(user), 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Realtime notifications: get_recent + counts
  useRealtimeNotifications({
    userId: user?.user_id,
    onCounts: ({ unread }) => setUnreadNotifCount(unread),
    onNew: (items) => {
      if (!isNotifDropdownOpen) return;
      setNotifications((prev) => {
        const map = new Map<number, NotificationItem>();
        for (const n of prev) map.set(n.notification_id, n);
        for (const n of items) map.set(n.notification_id, n as any);
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

  async function fetchNotificationCounts(currentUser: any) {
    const userId = currentUser?.user_id;
    if (!userId) return;

    const result = await makeNetworkRequest(
      async () => {
        const res = await axios.get("notifications.php", {
          params: {
            operation: "get_counts",
            user_id: userId,
          },
          timeout: 5000,
        });
        return res.data;
      },
      {
        maxRetries: 2,
        retryDelay: 1000,
        onRetry: (attempt) => {
          console.warn(
            `Retrying notification count fetch (attempt ${attempt})`
          );
        },
        onOffline: () => {
          console.warn("Network offline - notification count fetch skipped");
        },
      }
    );

    if (result?.status === "success") {
      setUnreadNotifCount(Number(result.counts?.unread || 0));
    }
  }

  async function fetchNotificationsList(currentUser: any) {
    const userId = currentUser?.user_id;
    if (!userId) return;

    setIsNotifLoading(true);

    try {
      const result = await makeNetworkRequest(
        async () => {
          const res = await axios.get("notifications.php", {
            params: {
              operation: "get_notifications",
              user_id: userId,
              limit: 10,
              offset: 0,
            },
            timeout: 5000,
          });
          return res.data;
        },
        {
          maxRetries: 2,
          retryDelay: 1000,
          onRetry: (attempt) => {
            console.warn(
              `Retrying notification list fetch (attempt ${attempt})`
            );
          },
          onOffline: () => {
            console.warn("Network offline - notification list fetch skipped");
            // Keep existing notifications when offline
          },
        }
      );

      if (result?.status === "success") {
        setNotifications(
          Array.isArray(result.notifications) ? result.notifications : []
        );
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      // For non-network errors, still clear notifications
      console.warn("Notification list fetch failed:", err.message);
      setNotifications([]);
    } finally {
      setIsNotifLoading(false);
    }
  }

  async function markAllNotificationsRead(currentUser: any) {
    try {
      const userId = currentUser?.user_id;
      if (!userId) return;
      const res = await axios.put("notifications.php", {
        user_id: userId,
        operation: "mark_read",
      });
      if (res.data?.status === "success") {
        setUnreadNotifCount(0);
      }
    } catch (err) {
      // ignore errors silently for UX
    }
  }

  async function clearReadNotifications(currentUser: any) {
    try {
      const userId = currentUser?.user_id;
      if (!userId) return;
      const res = await axios.delete("notifications.php", {
        params: {
          operation: "delete_notification",
          user_id: userId,
        },
      });
      if (res.data?.status === "success") {
        await fetchNotificationsList(currentUser);
      }
    } catch (err) {
      // ignore
    }
  }

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
      // Clear session localStorage keys
      if (typeof window !== "undefined") {
        localStorage.removeItem("session_staff_absolute_start");
        localStorage.removeItem("session_staff_last_activity");
      }
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
      "staffSidebarExpandedSections"
    );
    if (savedExpandedSections) {
      setExpandedSections(JSON.parse(savedExpandedSections));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "staffSidebarExpandedSections",
      JSON.stringify(expandedSections)
    );
  }, [expandedSections]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Responsive) - Hidden on mobile unless menu is open */}
      <div
        className={`
        fixed inset-y-0 left-0 z-40 w-56 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        lg:static lg:inset-0
      `}
      >
        <Sidebar className="h-full w-56 bg-white border-r">
          <SidebarHeader className="border-b px-3 py-3 h-14 flex items-center justify-between">
            <Image
              src={Logo || "/placeholder.svg"}
              alt="Noreen Logo"
              width={80}
              height={32}
              className="object-contain"
            />
            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </SidebarHeader>
          <SidebarContent className="flex flex-col h-[calc(100%-56px)] overflow-y-auto">
            <SidebarMenu className="flex-1 mt-3 space-y-1 px-1 pb-4">
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
                        flex items-center justify-between w-full px-2 py-2 text-xs
                        ${hasActiveItem ? "text-brand-500 font-medium" : "text-gray-600"}
                        hover:bg-gray-100 rounded-md transition-colors
                      `}
                    >
                      <span className="flex items-center gap-1">
                        <span className="text-xs uppercase tracking-wider font-medium">
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
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`
                                  flex items-center gap-2 px-2 py-2 rounded-md transition
                                  ml-1 text-sm
                                  ${
                                    isActive
                                      ? "bg-brand-500 text-white"
                                      : "text-gray-600 hover:bg-gray-100"
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
      <div className="flex-1 flex flex-col w-full lg:w-auto overflow-hidden">
        {/* Navbar */}
        <header className="sticky top-0 z-20 bg-white border-b px-3 lg:px-6 py-3 h-14 flex justify-between lg:justify-end items-center shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* User Info on the Right */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Theme Toggle - Hidden on mobile */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hidden sm:block p-1.5 rounded-full hover:bg-gray-100"
              aria-label="Toggle theme"
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-4 w-4 text-gray-600" />
              ) : (
                <Moon className="h-4 w-4 text-gray-600" />
              )}
            </button>

            {/* Calendar - Hidden on mobile */}
            <div className="hidden sm:block relative cursor-pointer">
              <Calendar className="h-5 w-5 text-gray-600 border border-[#a1a1a1] p-1 rounded-md" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center">
                29
              </span>
            </div>
            <div
              className="relative cursor-pointer"
              ref={notifRef}
              onClick={async () => {
                const nextOpen = !isNotifDropdownOpen;
                setIsNotifDropdownOpen(nextOpen);
                if (nextOpen && user) {
                  await markAllNotificationsRead(user);
                  await fetchNotificationsList(user);
                }
              }}
            >
              <Bell className="h-5 w-5 text-gray-600 border border-[#a1a1a1] p-1 rounded-md" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                  {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                </span>
              )}

              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 md:w-96 max-h-[70vh] sm:max-h-96 overflow-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="sticky top-0 bg-white px-3 sm:px-4 py-2 border-b flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Notifications
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (user) {
                            await markAllNotificationsRead(user);
                            await clearReadNotifications(user);
                          }
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap"
                      >
                        Clear all
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (user) {
                            await clearReadNotifications(user);
                          }
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap"
                      >
                        Clear read
                      </button>
                    </div>
                  </div>
                  <div className="p-2">
                    {isNotifLoading ? (
                      <div className="py-6 text-center text-sm text-gray-500">
                        Loading...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-6 text-center text-sm text-gray-500">
                        No notifications
                      </div>
                    ) : (
                      <ul className="space-y-1">
                        {notifications.map((n, idx) => (
                          <li
                            key={`staff-notification-${n.notification_id || "temp"}-${idx}-${Date.now()}`}
                            className="rounded-md hover:bg-gray-50"
                          >
                            {n.notification_url ? (
                              <Link
                                href={n.notification_url}
                                className="block px-3 py-2"
                                onClick={() => setIsNotifDropdownOpen(false)}
                              >
                                <div className="text-sm font-medium text-gray-800 line-clamp-1">
                                  {n.notification_title ||
                                    n.notification_type ||
                                    "Notification"}
                                </div>
                                <div className="text-xs text-gray-600 line-clamp-2">
                                  {n.notification_message}
                                </div>
                                <div className="mt-1 text-[10px] text-gray-400">
                                  {new Date(n.created_at).toLocaleString()}
                                </div>
                              </Link>
                            ) : (
                              <div className="px-3 py-2">
                                <div className="text-sm font-medium text-gray-800 line-clamp-1">
                                  {n.notification_title ||
                                    n.notification_type ||
                                    "Notification"}
                                </div>
                                <div className="text-xs text-gray-600 line-clamp-2">
                                  {n.notification_message}
                                </div>
                                <div className="mt-1 text-[10px] text-gray-400">
                                  {new Date(n.created_at).toLocaleString()}
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-1.5 lg:gap-2 p-1.5 lg:p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Profile Picture */}
                <div className="h-7 w-7 lg:h-8 lg:w-8 border border-[#D2D2D2] rounded-full overflow-hidden shrink-0">
                  {user.user_pfp && user.user_pfp.trim() !== "" ? (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_API_URL || "https://noreen-events.online/noreen-events"}/serve-image.php?path=${encodeURIComponent(user.user_pfp)}`}
                      alt={`${user.user_firstName} ${user.user_lastName}`}
                      width={32}
                      height={32}
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

                {/* User Name and Role - Hidden on mobile */}
                <div className="hidden lg:block text-xs text-gray-600 text-left min-w-0">
                  <div className="font-medium text-left truncate">
                    {user?.user_firstName} {user?.user_lastName}
                  </div>
                  <div className="text-left">
                    <span className="text-[#8b8b8b] font-medium text-xs">
                      {user?.user_role}
                    </span>
                  </div>
                </div>

                {/* Dropdown Arrow */}
                <ChevronDown
                  className={`h-3 w-3 text-gray-500 transition-transform shrink-0 ${isUserDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown Menu */}
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      router.push("/staff/settings");
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

        {/* Page Content - Adjusted for Navbar */}
        <main className="flex-1 p-3 lg:p-6 overflow-auto">{children}</main>
        {/* Global Toaster moved to root layout */}
      </div>
    </div>
  );
}
