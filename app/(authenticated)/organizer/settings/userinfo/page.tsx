"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (!user?.user_role || user.user_role !== "Vendor") {
      router.push("/auth/login")
    }
  }, [router])

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {/* User Profile Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden">
              <Image
                src="/placeholder.svg?height=64&width=64"
                alt="Profile"
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                John Doe
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </h2>
              <p className="text-gray-500">Vendor</p>
            </div>
          </div>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit
          </button>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 flex justify-between items-center border-b">
          <h3 className="text-xl font-semibold">Personal Information</h3>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit
          </button>
        </div>
        <div className="p-6 grid gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First name
              </label>
              <input
                id="firstName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="John"
                readOnly
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last name
              </label>
              <input
                id="lastName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="Doe"
                readOnly
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="johndoe@gmail.com"
                readOnly
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Contact number
              </label>
              <input
                id="phone"
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="0900909090"
                readOnly
              />
            </div>
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              defaultValue="This is just a sample"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Vendor Information */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 flex justify-between items-center border-b">
          <h3 className="text-xl font-semibold">Vendor Information</h3>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit
          </button>
        </div>
        <div className="p-6 grid gap-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="vendorAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Vendor Address
              </label>
              <input
                id="vendorAddress"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="Cagayan de Oro City"
                readOnly
              />
            </div>
            <div>
              <label htmlFor="businessContact" className="block text-sm font-medium text-gray-700 mb-1">
                Business Contact
              </label>
              <input
                id="businessContact"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="0909090909"
                readOnly
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <input
                id="status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="Verified"
                readOnly
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="businessEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="businessEmail"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="johndoe@gmail.com"
                readOnly
              />
            </div>
            <div>
              <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Contact number
              </label>
              <input
                id="businessPhone"
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                defaultValue="0900909090"
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Documents */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 flex justify-between items-center border-b">
          <h3 className="text-xl font-semibold">Vendor Documents</h3>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit
          </button>
        </div>
        <div className="p-6">
          <div className="rounded-lg border p-4">
            <div className="flex items-start gap-4">
              <div className="rounded-lg border p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium">business_permit.pdf</p>
                <p className="text-sm text-gray-500">15 Jan 2024</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
