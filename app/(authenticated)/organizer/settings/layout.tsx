"use client"

import type React from "react"

import { User, Shield, Store, Trash2 } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const settingsMenuItems = [
  { icon: User, label: "User Info", href: "./userinfo" },
  { icon: Shield, label: "Security", href: "./security" },
  { icon: Store, label: "Vendor Manager", href: "./vendormanager" },
  { icon: Trash2, label: "Delete Account", href: "./deleteaccount" },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Redirect to /vendor/settings/userinfo if the current path is just /vendor/settings
    if (pathname === "/vendor/settings") {
      router.push("/vendor/settings/userinfo")
    }
  }, [pathname, router])

  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <div className="ml-auto flex items-center space-x-4">
            <p>Vendor Settings</p>
          </div>
        </div>
      </header>
      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr]">
        <aside className="hidden w-[200px] flex-col md:flex">
          <div className="space-y-4">
            <div className="pb-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Settings</h2>
              <nav className="space-y-1">
                {settingsMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      pathname?.includes(item.href) ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="mr-3 h-6 w-6" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
