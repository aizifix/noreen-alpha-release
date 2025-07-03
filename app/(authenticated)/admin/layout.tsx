"use client";

import { useState, useEffect } from "react";
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
import { useTheme } from "next-themes";

interface User {
  user_firstName: string;
  user_lastName: string;
  user_role: string;
  user_email: string;
  profilePicture?: string;
}

export default function AdminLayout({
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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserDropdownOpen]);

  useEffect(() => {
    try {
      const userData = secureStorage.getItem("user");
      if (!userData) {
        console.log("No user data found in secure storage");
        router.replace("/auth/login");
        return;
      }

      if (userData.user_role !== "Admin") {
        console.log("Invalid user role:", userData.user_role);
        // Redirect to correct dashboard based on role
        const role = userData.user_role.toLowerCase();
        if (role === "client") {
          router.replace("/client/dashboard");
        } else if (role === "vendor" || role === "organizer") {
          router.replace("/organizer/dashboard");
        } else {
          router.replace("/auth/login");
        }
        return;
      }
      setUser(userData);
    } catch (error) {
      console.error("Error in admin layout:", error);
      secureStorage.removeItem("user");
      router.replace("/auth/login");
    }
  }, []); // Remove router dependency to prevent repeated calls

  const handleLogout = () => {
    try {
      secureStorage.removeItem("user");
      // Clear any other stored data
      document.cookie =
        "pending_otp_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie =
        "pending_otp_email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      // Clear browser history and redirect
      window.location.replace("/auth/login");
    } catch (error) {
      console.error("Error during logout:", error);
      // Force redirect even if there's an error
      window.location.replace("/auth/login");
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
    { icon: Calendar, label: "Events", href: "/admin/events" },
    { icon: Wrench, label: "Event Builder", href: "/admin/event-builder" },
    { icon: CalendarCheck, label: "Bookings", href: "/admin/bookings" },
    { icon: Package, label: "Packages", href: "/admin/packages" },
    { icon: MapPin, label: "Venues", href: "/admin/venues" },
    { icon: Users, label: "Clients", href: "/admin/clients" },
    { icon: UserCheck, label: "Organizers", href: "/admin/organizers" },
    { icon: Truck, label: "Suppliers", href: "/admin/suppliers" },
    { icon: CreditCard, label: "Payments", href: "/admin/payments" },
    { icon: BarChart3, label: "Reports", href: "/admin/reports" },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar (Fixed) */}
      <div className="fixed inset-y-0 left-0 z-20 w-64">
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
                  pathname.startsWith(`${item.href}/`); // Check if the current path is active or a subpath
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
      <div className="flex-1 ml-64">
        {/* Navbar */}
        <header className="fixed top-0 right-0 left-64 z-10 bg-white border-b px-6 py-4 h-16 flex justify-end items-center">
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
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">
                29
              </span>
            </div>
            <div className="cursor-pointer">
              <Bell className="h-8 w-8 text-gray-600 border border-[#a1a1a1] p-1 rounded-md" />
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Profile Picture */}
                <div className="h-10 w-10 border border-[#D2D2D2] rounded-full overflow-hidden">
                  {user.profilePicture ? (
                    <Image
                      src={user.profilePicture || "/placeholder.svg"}
                      alt={`${user.user_firstName} ${user.user_lastName}`}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm">
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
                      router.push("/admin/profile");
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      router.push("/admin/settings");
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
        <main className="pt-24 p-6 h-screen overflow-auto">{children}</main>
      </div>
    </div>
  );
}
