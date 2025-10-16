"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "axios";

// Configure axios base URL
axios.defaults.baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://noreen-events.online/noreen-events";

export default function StaffTestPage() {
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);

  const runTest = async (testName: string, operation: string) => {
    setLoading(testName);
    try {
      const response = await axios.get("staff.php", {
        params: {
          operation,
          user_id: 1, // Test user ID
          user_role: "staff",
        },
      });

      setTestResults((prev: any) => ({
        ...prev,
        [testName]: {
          status: "success",
          data: response.data,
        },
      }));
    } catch (error: any) {
      setTestResults((prev: any) => ({
        ...prev,
        [testName]: {
          status: "error",
          error: error.response?.data || error.message,
        },
      }));
    } finally {
      setLoading(null);
    }
  };

  const tests = [
    { name: "Dashboard", operation: "dashboard" },
    { name: "Reports", operation: "reports" },
    { name: "Events", operation: "events" },
    { name: "Bookings", operation: "bookings" },
    { name: "Payments", operation: "payments" },
    { name: "Clients", operation: "clients" },
    { name: "Packages", operation: "packages" },
    { name: "Venues", operation: "venues" },
    { name: "Organizers", operation: "organizers" },
    { name: "Suppliers", operation: "suppliers" },
    { name: "Profile", operation: "profile" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Staff API Test Page
        </h1>
        <p className="text-gray-600">
          Test all staff API endpoints and permissions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tests.map((test) => (
          <Card key={test.name}>
            <CardHeader>
              <CardTitle className="text-lg">{test.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => runTest(test.name, test.operation)}
                disabled={loading === test.name}
                className="w-full"
              >
                {loading === test.name ? "Testing..." : `Test ${test.name}`}
              </Button>

              {testResults[test.name] && (
                <div className="mt-3 p-3 rounded-lg text-sm">
                  {testResults[test.name].status === "success" ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-green-800 font-medium">
                        ✓ Success
                      </div>
                      <div className="text-green-700 mt-1">
                        {JSON.stringify(testResults[test.name].data, null, 2)}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-red-800 font-medium">✗ Error</div>
                      <div className="text-red-700 mt-1">
                        {JSON.stringify(testResults[test.name].error, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Module
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Admin
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Staff
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">
                    Dashboard
                  </td>
                  <td className="border border-gray-300 px-4 py-2">Full</td>
                  <td className="border border-gray-300 px-4 py-2">View</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Reports</td>
                  <td className="border border-gray-300 px-4 py-2">
                    Full export
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    View only
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Events</td>
                  <td className="border border-gray-300 px-4 py-2">
                    Create/Edit/Delete
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    View & Update
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">
                    Event Builder
                  </td>
                  <td className="border border-gray-300 px-4 py-2">Full</td>
                  <td className="border border-gray-300 px-4 py-2">Partial</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Bookings</td>
                  <td className="border border-gray-300 px-4 py-2">Full</td>
                  <td className="border border-gray-300 px-4 py-2">
                    Create/Edit/Verify Payment
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Packages</td>
                  <td className="border border-gray-300 px-4 py-2">Manage</td>
                  <td className="border border-gray-300 px-4 py-2">
                    View only
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Venues</td>
                  <td className="border border-gray-300 px-4 py-2">Manage</td>
                  <td className="border border-gray-300 px-4 py-2">
                    View only
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Clients</td>
                  <td className="border border-gray-300 px-4 py-2">Manage</td>
                  <td className="border border-gray-300 px-4 py-2">
                    Create/Edit
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">
                    Organizers
                  </td>
                  <td className="border border-gray-300 px-4 py-2">Manage</td>
                  <td className="border border-gray-300 px-4 py-2">
                    View only
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">
                    Suppliers
                  </td>
                  <td className="border border-gray-300 px-4 py-2">Manage</td>
                  <td className="border border-gray-300 px-4 py-2">
                    View only
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Staff</td>
                  <td className="border border-gray-300 px-4 py-2">Manage</td>
                  <td className="border border-gray-300 px-4 py-2">View own</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Payments</td>
                  <td className="border border-gray-300 px-4 py-2">
                    Full approval
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    Record/Verify only
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
