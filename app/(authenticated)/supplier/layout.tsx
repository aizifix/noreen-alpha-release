"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Calendar,
  FileText,
  Settings,
  BarChart3,
  LogOut,
  Menu,
  X,
  Star,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { Badge } from "@/components/ui/badge";

interface SupplierLayoutProps {
  children: React.ReactNode;
}

export default function SupplierLayout({ children }: SupplierLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    {
      name: "Dashboard",
      href: "/supplier/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "My Offers",
      href: "/supplier/offers",
      icon: Package,
    },
    {
      name: "Bookings",
      href: "/supplier/bookings",
      icon: Calendar,
    },
    {
      name: "Analytics",
      href: "/supplier/analytics",
      icon: BarChart3,
    },
    {
      name: "Documents",
      href: "/supplier/documents",
      icon: FileText,
    },
    {
      name: "Profile",
      href: "/supplier/profile",
      icon: User,
    },
    {
      name: "Settings",
      href: "/supplier/settings",
      icon: Settings,
    },
  ];

  const isActive = (href: string) => {
    return pathname === href;
  };

  const handleLogout = () => {
    try {
      const stored = window.localStorage.getItem("user");
      let userId: number | null = null;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          userId = parsed?.user_id ?? null;
        } catch {}
      }
      if (userId) {
        axios
          .post(
            endpoints.auth,
            { operation: "logout", user_id: userId },
            { headers: { "Content-Type": "application/json" } }
          )
          .catch(() => {});
      }
    } catch {}
    window.location.replace("/auth/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:z-auto`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Supplier Portal</h2>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Supplier Info */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
              <User className="h-6 w-6 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                Elegant Catering Services
              </p>
              <p className="text-xs text-gray-500">Catering Specialist</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="default" className="text-xs">
                  Verified
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-gray-600">4.8</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-brand-50 text-brand-700 border-r-2 border-brand-500"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-gray-600 hover:text-gray-900"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">
              {navigation.find((item) => isActive(item.href))?.name ||
                "Supplier Portal"}
            </h1>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Package className="h-4 w-4 mr-2" />
              New Offer
            </Button>

            {/* Notifications */}
            <div className="relative">
              <Button variant="ghost" size="sm" className="relative">
                <Calendar className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                  3
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
