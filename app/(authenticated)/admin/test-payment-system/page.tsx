"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import axios from "axios";
import { endpoints } from "@/app/config/api";

interface TestResult {
  test_name: string;
  status: "pass" | "fail" | "pending";
  message: string;
  details?: any;
}

export default function TestPaymentSystemPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const tests = [
    {
      name: "Database Schema Verification",
      description: "Check if all required database columns exist",
    },
    {
      name: "Payment Settings API",
      description: "Test getPaymentSettings endpoint",
    },
    {
      name: "Booking Creation",
      description: "Test creating a booking with payment data",
    },
    {
      name: "Payment Recording",
      description: "Test recording a payment for a booking",
    },
    {
      name: "Booking Acceptance",
      description: "Test accepting a booking",
    },
    {
      name: "Event Conversion",
      description: "Test converting booking to event with payment transfer",
    },
  ];

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Database Schema Verification
    await runTest("Database Schema Verification", async () => {
      const response = await axios.get("/api/test_booking_payment_system.php");
      const data = response.data;

      if (data.overall_status === "PASS") {
        return {
          status: "pass",
          message: "All database schema changes are in place",
          details: data.database_schema,
        };
      } else {
        return {
          status: "fail",
          message: "Database schema verification failed",
          details: data,
        };
      }
    });

    // Test 2: Payment Settings API
    await runTest("Payment Settings API", async () => {
      try {
        const response = await axios.get(`${endpoints.admin}`, {
          params: { operation: "getWebsiteSettings" },
        });

        if (response.data.status === "success") {
          const settings = response.data.website_settings;
          const hasPaymentSettings =
            settings.gcash_name ||
            settings.bank_name ||
            settings.payment_instructions;

          return {
            status: hasPaymentSettings ? "pass" : "fail",
            message: hasPaymentSettings
              ? "Payment settings API working correctly"
              : "Payment settings not configured",
            details: settings,
          };
        } else {
          return {
            status: "fail",
            message: "Failed to fetch website settings",
            details: response.data,
          };
        }
      } catch (error) {
        return {
          status: "fail",
          message: "Error calling payment settings API",
          details: error,
        };
      }
    });

    // Test 3: Booking Creation
    await runTest("Booking Creation", async () => {
      try {
        const testBookingData = {
          operation: "createBooking",
          event_type_id: 1,
          event_name: `TEST_BOOKING_${Date.now()}`,
          event_date: "2024-12-31",
          event_time: "18:00:00",
          guest_count: 50,
          notes: "Test booking for payment system verification",
        };

        const response = await axios.post(
          `${endpoints.client}`,
          testBookingData
        );

        if (response.data.status === "success") {
          return {
            status: "pass",
            message: "Booking created successfully",
            details: { booking_id: response.data.booking_id },
          };
        } else {
          return {
            status: "fail",
            message: "Failed to create booking",
            details: response.data,
          };
        }
      } catch (error) {
        return {
          status: "fail",
          message: "Error creating booking",
          details: error,
        };
      }
    });

    // Test 4: Payment Recording
    await runTest("Payment Recording", async () => {
      try {
        // First create a test booking
        const bookingResponse = await axios.post(`${endpoints.client}`, {
          operation: "createBooking",
          event_type_id: 1,
          event_name: `TEST_PAYMENT_BOOKING_${Date.now()}`,
          event_date: "2024-12-31",
          event_time: "18:00:00",
          guest_count: 50,
          notes: "Test booking for payment recording",
        });

        if (bookingResponse.data.status === "success") {
          const bookingId = bookingResponse.data.booking_id;

          // Now record a payment
          const paymentResponse = await axios.post(`${endpoints.admin}`, {
            operation: "createPayment",
            booking_id: bookingId,
            payment_amount: 5000,
            payment_method: "gcash",
            payment_date: "2024-01-01",
            payment_status: "completed",
            payment_reference: `TEST_REF_${Date.now()}`,
            payment_notes: "Test payment",
          });

          if (paymentResponse.data.status === "success") {
            return {
              status: "pass",
              message: "Payment recorded successfully",
              details: {
                booking_id: bookingId,
                payment_id: paymentResponse.data.payment_id,
              },
            };
          } else {
            return {
              status: "fail",
              message: "Failed to record payment",
              details: paymentResponse.data,
            };
          }
        } else {
          return {
            status: "fail",
            message: "Failed to create test booking for payment",
            details: bookingResponse.data,
          };
        }
      } catch (error) {
        return {
          status: "fail",
          message: "Error recording payment",
          details: error,
        };
      }
    });

    // Test 5: Booking Acceptance
    await runTest("Booking Acceptance", async () => {
      try {
        // Create a test booking first
        const bookingResponse = await axios.post(`${endpoints.client}`, {
          operation: "createBooking",
          event_type_id: 1,
          event_name: `TEST_ACCEPT_BOOKING_${Date.now()}`,
          event_date: "2024-12-31",
          event_time: "18:00:00",
          guest_count: 50,
          notes: "Test booking for acceptance",
        });

        if (bookingResponse.data.status === "success") {
          const bookingId = bookingResponse.data.booking_id;

          // Accept the booking
          const acceptResponse = await axios.post(`${endpoints.admin}`, {
            operation: "acceptBooking",
            booking_id: bookingId,
            user_id: 1, // Assuming admin user ID is 1
            user_role: "admin",
          });

          if (acceptResponse.data.status === "success") {
            return {
              status: "pass",
              message: "Booking accepted successfully",
              details: { booking_id: bookingId },
            };
          } else {
            return {
              status: "fail",
              message: "Failed to accept booking",
              details: acceptResponse.data,
            };
          }
        } else {
          return {
            status: "fail",
            message: "Failed to create test booking for acceptance",
            details: bookingResponse.data,
          };
        }
      } catch (error) {
        return {
          status: "fail",
          message: "Error accepting booking",
          details: error,
        };
      }
    });

    // Test 6: Event Conversion
    await runTest("Event Conversion", async () => {
      try {
        // Create a test booking with payment
        const bookingResponse = await axios.post(`${endpoints.client}`, {
          operation: "createBooking",
          event_type_id: 1,
          event_name: `TEST_CONVERT_BOOKING_${Date.now()}`,
          event_date: "2024-12-31",
          event_time: "18:00:00",
          guest_count: 50,
          notes: "Test booking for conversion",
        });

        if (bookingResponse.data.status === "success") {
          const bookingId = bookingResponse.data.booking_id;

          // Accept the booking first
          await axios.post(`${endpoints.admin}`, {
            operation: "acceptBooking",
            booking_id: bookingId,
            user_id: 1,
            user_role: "admin",
          });

          // Record a payment
          await axios.post(`${endpoints.admin}`, {
            operation: "createPayment",
            booking_id: bookingId,
            payment_amount: 10000,
            payment_method: "bank-transfer",
            payment_date: "2024-01-01",
            payment_status: "completed",
            payment_reference: `TEST_CONVERT_REF_${Date.now()}`,
            payment_notes: "Test payment for conversion",
          });

          // Convert to event
          const eventResponse = await axios.post(`${endpoints.staff}`, {
            operation: "createEvent",
            booking_id: bookingId,
            event_title: `TEST_EVENT_${Date.now()}`,
            event_description: "Test event converted from booking",
            event_date: "2024-12-31",
            event_startTime: "18:00:00",
            event_endTime: "23:00:00",
            guest_count: 50,
            venue_id: null,
            package_id: null,
            total_price: 10000,
          });

          if (eventResponse.data.status === "success") {
            return {
              status: "pass",
              message: "Event conversion successful",
              details: {
                booking_id: bookingId,
                event_id: eventResponse.data.event_id,
              },
            };
          } else {
            return {
              status: "fail",
              message: "Failed to convert booking to event",
              details: eventResponse.data,
            };
          }
        } else {
          return {
            status: "fail",
            message: "Failed to create test booking for conversion",
            details: bookingResponse.data,
          };
        }
      } catch (error) {
        return {
          status: "fail",
          message: "Error converting booking to event",
          details: error,
        };
      }
    });

    setIsRunning(false);
  };

  const runTest = async (
    testName: string,
    testFunction: () => Promise<any>
  ) => {
    setTestResults((prev) => [
      ...prev,
      { test_name: testName, status: "pending", message: "Running..." },
    ]);

    try {
      const result = await testFunction();
      setTestResults((prev) =>
        prev.map((test) =>
          test.test_name === testName ? { ...test, ...result } : test
        )
      );
    } catch (error) {
      setTestResults((prev) =>
        prev.map((test) =>
          test.test_name === testName
            ? {
                test_name: testName,
                status: "fail",
                message: "Test failed with error",
                details: error,
              }
            : test
        )
      );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "pending":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass":
        return <Badge className="bg-green-100 text-green-800">PASS</Badge>;
      case "fail":
        return <Badge className="bg-red-100 text-red-800">FAIL</Badge>;
      case "pending":
        return <Badge className="bg-blue-100 text-blue-800">RUNNING</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">UNKNOWN</Badge>;
    }
  };

  const passedTests = testResults.filter(
    (test) => test.status === "pass"
  ).length;
  const totalTests = testResults.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment System Test Suite</h1>
          <p className="text-muted-foreground">
            Comprehensive testing for the booking reservation payment system
          </p>
        </div>
        <Button
          onClick={runTests}
          disabled={isRunning}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            "Run All Tests"
          )}
        </Button>
      </div>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Test Results
              {totalTests > 0 && (
                <Badge variant="outline">
                  {passedTests}/{totalTests} Passed
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((test, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <h3 className="font-medium">{test.test_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {test.message}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(test.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tests.map((test, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">{test.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {test.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> This test suite will create and clean up test
          data automatically. Make sure you have the necessary permissions and
          that the database is properly configured before running the tests.
        </AlertDescription>
      </Alert>
    </div>
  );
}
