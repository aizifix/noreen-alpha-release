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
  Menu,
  X,
  FileText,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../components/sidebar/ClientSidebar";
import { secureStorage } from "@/app/utils/encryption";
import { api } from "@/app/utils/apiWrapper";
import axios from "axios";
import { useTheme } from "next-themes";
import { startSessionWatcher } from "@/app/utils/session";
import { useRealtimeNotifications } from "@/app/hooks/useRealtimeNotifications";
import { endpoints } from "@/app/config/api";

interface User {
  user_firstName: string;
  user_lastName: string;
  user_role: string;
  user_email: string;
  user_pfp?: string;
  profilePicture?: string;
}

export default function ClientLayout({
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
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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
        isNotifDropdownOpen &&
        notifRef.current &&
        !notifRef.current.contains(target)
      ) {
        setIsNotifDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserDropdownOpen, isMobileMenuOpen, isNotifDropdownOpen]);

  useEffect(() => {
    // Start session timeout watcher for client portal
    const stopWatcher = startSessionWatcher({
      storageKeyPrefix: "session_client",
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
      let userData = secureStorage.getItem("user");

      if (!userData) {
        console.log("Client layout: No user data found, redirecting to login");
        router.replace("/auth/login");
        return;
      }
      if (typeof userData === "string") {
        try {
          userData = JSON.parse(userData);
        } catch {
          console.log(
            "Client layout: Failed to parse user data, redirecting to login"
          );
          secureStorage.removeItem("user");
          router.replace("/auth/login");
          return;
        }
      }
      if (!userData.user_role || userData.user_role !== "Client") {
        console.log(
          "Client layout: Invalid user role:",
          userData.user_role,
          "- redirecting"
        );
        // Redirect to correct dashboard based on role
        const role = userData.user_role
          ? userData.user_role.toLowerCase()
          : "unknown";
        if (role === "admin") {
          router.replace("/admin/dashboard");
        } else if (role === "vendor" || role === "organizer") {
          router.replace("/organizer/dashboard");
        } else {
          router.replace("/auth/login");
        }
        return;
      }
      setUser(userData);
      fetchNotificationCounts(userData);
    } catch (error) {
      console.error("Client layout: Authentication error:", error);
      secureStorage.removeItem("user");
      router.replace("/auth/login");
    }
  }, []);

  // Listen for user data changes (like profile picture updates)
  useEffect(() => {
    const handleUserDataChange = () => {
      try {
        const userData = secureStorage.getItem("user");
        if (userData && userData.user_role === "Client") {
          console.log("Client layout: User data updated, refreshing navbar");
          setUser(userData);
        }
      } catch (error) {
        console.error("Client layout: Error handling user data change:", error);
      }
    };

    // Listen for storage changes
    window.addEventListener("userDataChanged", handleUserDataChange);

    return () => {
      window.removeEventListener("userDataChanged", handleUserDataChange);
    };
  }, []);

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

  // Poll unread count
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => fetchNotificationCounts(user), 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Realtime notifications: get_recent + counts
  useRealtimeNotifications({
    userId: user?.user_id,
    onCounts: ({ unread }) => {
      setUnreadNotifCount(unread);
    },
    onNew: (items) => {
      // If dropdown is open, merge into the current list for immediate visibility
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
    try {
      const userId = currentUser?.user_id;
      if (!userId) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const res = await fetch(
        `${endpoints.notifications}?operation=get_counts&user_id=${encodeURIComponent(
          userId
        )}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      const data = await res.json();

      if (data?.status === "success") {
        setUnreadNotifCount(Number(data.counts?.unread || 0));
      }
    } catch (err: any) {
      // Handle network errors gracefully
      if (
        err.name === "AbortError" ||
        err.message?.includes("ERR_INTERNET_DISCONNECTED") ||
        err.message?.includes("Network Error")
      ) {
        console.warn("Network offline - notification count fetch skipped");
        return;
      }
      // For other errors, silently ignore to avoid console spam
    }
  }

  async function fetchNotificationsList(currentUser: any) {
    try {
      const userId = currentUser?.user_id;
      if (!userId) return;
      setIsNotifLoading(true);
      const res = await fetch(
        `${endpoints.notifications}?operation=get_notifications&user_id=${encodeURIComponent(
          userId
        )}&limit=10&offset=0`
      );
      const data = await res.json();
      if (data?.status === "success") {
        setNotifications(
          Array.isArray(data.notifications) ? data.notifications : []
        );
      } else {
        setNotifications([]);
      }
    } catch (err) {
      setNotifications([]);
    } finally {
      setIsNotifLoading(false);
    }
  }

  async function markAllNotificationsRead(currentUser: any) {
    try {
      const userId = currentUser?.user_id;
      if (!userId) return;
      const res = await fetch(
        `${endpoints.notifications}?operation=mark_read`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, operation: "mark_read" }),
        }
      );
      const data = await res.json();
      if (data?.status === "success") {
        setUnreadNotifCount(0);
      }
    } catch (err) {
      // ignore errors silently
    }
  }

  async function clearReadNotifications(currentUser: any) {
    try {
      const userId = currentUser?.user_id;
      if (!userId) return;
      const res = await fetch(
        `${endpoints.notifications}?operation=delete_notification&user_id=${encodeURIComponent(
          userId
        )}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data?.status === "success") {
        await fetchNotificationsList(currentUser);
      }
    } catch (err) {
      // ignore
    }
  }

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/client/dashboard" },
    { icon: Calendar, label: "Events", href: "/client/events" },
    { icon: CalendarCheck, label: "Bookings", href: "/client/bookings" },
    { icon: CreditCard, label: "Payments", href: "/client/payments" },
    { icon: FileText, label: "Documents", href: "/client/documents" },
  ];

  // Mobile navigation items for bottom nav
  const mobileNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/client/dashboard" },
    { icon: Calendar, label: "Events", href: "/client/events" },
    { icon: CalendarCheck, label: "Bookings", href: "/client/bookings" },
    { icon: CreditCard, label: "Payments", href: "/client/payments" },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100 w-full overflow-x-hidden lg:pl-64">
      {/* Desktop Sidebar (Fixed) - Completely hidden on mobile */}
      <div className="hidden lg:fixed lg:block inset-y-0 left-0 z-20 w-64">
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
              {menuItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.href}
                        className={`flex w-full items-center gap-3 px-3 py-2 rounded-md transition ${
                          isActive
                            ? "bg-brand-500 text-white"
                            : "text-[#797979] hover:bg-brand-500 hover:text-white"
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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

            <div className="relative cursor-pointer">
              <Calendar className="h-8 w-8 text-gray-600 border border-[#a1a1a1] p-1 rounded-md" />
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
              <Bell className="h-8 w-8 text-gray-600 border border-[#a1a1a1] p-1 rounded-md" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                </span>
              )}

              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="px-4 py-2 border-b flex items-center justify-between">
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
                        className="text-xs text-gray-500 hover:text-gray-700"
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
                        className="text-xs text-gray-500 hover:text-gray-700"
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
                            key={`notification-${n.notification_id || "temp"}-${idx}-${Date.now()}`}
                            className="rounded-md hover:bg-gray-50"
                          >
                            {n.notification_url ? (
                              <Link
                                href={n.notification_url}
                                className="block px-3 py-2"
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
                      router.push("/client/profile");
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      router.push("/client/settings");
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
              onClick={async () => {
                const nextOpen = !isNotifDropdownOpen;
                setIsNotifDropdownOpen(nextOpen);
                if (nextOpen && user) {
                  await markAllNotificationsRead(user);
                  await fetchNotificationsList(user);
                }
              }}
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center px-1">
                  {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                </span>
              )}

              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-[280px] max-h-[80vh] overflow-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50 fixed-dropdown">
                  <div className="px-4 py-2 border-b flex items-center justify-between">
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
                        className="text-xs text-gray-500 hover:text-gray-700"
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
                        className="text-xs text-gray-500 hover:text-gray-700"
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
                            key={`notification-${n.notification_id || "temp"}-${idx}-${Date.now()}`}
                            className="rounded-md hover:bg-gray-50"
                          >
                            {n.notification_url ? (
                              <Link
                                href={n.notification_url}
                                className="block px-3 py-2"
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
                      router.push("/client/profile");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      router.push("/client/settings");
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
                {menuItems.slice(4).map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
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
            </div>
          )}
        </header>

        {/* Page Content - Adjusted for Navbar */}
        <main className="pt-0 lg:pt-24 lg:p-6 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0 min-w-0 max-w-full">
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
