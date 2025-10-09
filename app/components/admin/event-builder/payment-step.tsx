"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Smartphone,
  Building2,
  Calculator,
  Receipt,
  Eye,
  Calendar,
} from "lucide-react";

interface PaymentStepProps {
  totalBudget: number;
  onUpdate: (data: any) => void;
  onComplete: () => void;
  selectedPackage?: any;
  selectedVenue?: any;
  selectedComponents?: any[];
}

export default function PaymentStep({
  totalBudget,
  onUpdate,
  onComplete,
  selectedPackage,
  selectedVenue,
  selectedComponents = [],
}: PaymentStepProps) {
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [downPaymentPercentage, setDownPaymentPercentage] = useState(50);
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const paymentMethods = [
    {
      id: "cash",
      label: "Cash Payment",
      icon: DollarSign,
      requiresRef: false,
      requiresDate: true,
      description: "Pay in cash directly - just input the payment date",
    },
    {
      id: "gcash",
      label: "GCash",
      icon: Smartphone,
      requiresRef: true,
      requiresDate: false,
      description: "Mobile payment via GCash - input reference number",
    },
    {
      id: "bank-transfer",
      label: "Bank Transfer",
      icon: Building2,
      requiresRef: true,
      requiresDate: false,
      description: "Direct bank transfer - input reference number",
    },
  ];

  const downPaymentAmount = (totalBudget * downPaymentPercentage) / 100;
  const remainingAmount = totalBudget - downPaymentAmount;

  // Auto-update parent whenever payment data changes
  useEffect(() => {
    const paymentData = {
      totalBudget,
      downPaymentMethod: paymentMethod,
      referenceNumber,
      downPaymentPercentage,
      downPayment: downPaymentAmount,
      downPaymentAmount,
      remainingAmount,
      paymentDate,
      notes,
    };

    console.log("Auto-updating payment data:", paymentData);
    onUpdate(paymentData);
  }, [
    totalBudget,
    paymentMethod,
    referenceNumber,
    downPaymentPercentage,
    paymentDate,
    notes,
    onUpdate,
  ]);

  const handleComplete = () => {
    const paymentData = {
      totalBudget,
      downPaymentMethod: paymentMethod,
      referenceNumber,
      downPaymentPercentage,
      downPayment: downPaymentAmount,
      downPaymentAmount,
      remainingAmount,
      paymentDate,
      notes,
    };

    console.log("Payment step returning data:", paymentData);
    onUpdate(paymentData);
    onComplete();
  };

  const isFormValid = () => {
    const selectedMethod = paymentMethods.find((m) => m.id === paymentMethod);
    if (!selectedMethod) return false;

    if (selectedMethod.requiresRef && !referenceNumber.trim()) return false;
    if (selectedMethod.requiresDate && !paymentDate) return false;

    return true;
  };

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethod);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Method Selection */}
          <div>
            <Label className="text-base font-semibold mb-4 block">
              Payment Method *
            </Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="space-y-3"
            >
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.id}
                    className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <RadioGroupItem value={method.id} id={method.id} />
                    <div className="flex items-center space-x-3 flex-1">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <div className="flex-1">
                        <Label
                          htmlFor={method.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {method.label}
                        </Label>
                        <p className="text-xs text-gray-500">
                          {method.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Payment Amount Configuration */}
          <div>
            <Label className="text-base font-semibold mb-4 block">
              Down Payment Amount
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="percentage">Percentage</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={downPaymentPercentage}
                    onChange={(e) =>
                      setDownPaymentPercentage(parseInt(e.target.value) || 0)
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>
              <div>
                <Label>Amount</Label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="text-lg font-semibold">
                    ₱{downPaymentAmount.toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <Label>Remaining</Label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="text-lg font-semibold">
                    ₱{remainingAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details Based on Method */}
          {selectedMethod && (
            <div className="space-y-4">
              <Separator />
              <h3 className="text-lg font-semibold">Payment Information</h3>

              {/* Reference Number for GCash and Bank Transfer */}
              {selectedMethod.requiresRef && (
                <div>
                  <Label htmlFor="reference">Reference Number *</Label>
                  <Input
                    id="reference"
                    type="text"
                    placeholder={`Enter ${paymentMethod === "gcash" ? "GCash" : "bank transfer"} reference number`}
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the transaction reference number from your{" "}
                    {paymentMethod === "gcash" ? "GCash" : "bank transfer"}{" "}
                    receipt
                  </p>
                </div>
              )}

              {/* Payment Date for Cash */}
              {selectedMethod.requiresDate && (
                <div>
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the date when the cash payment was received
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional payment information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Payment Summary */}
          <Card className="bg-gray-50">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Budget:</span>
                  <span className="font-semibold">
                    ₱{totalBudget.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Down Payment ({downPaymentPercentage}%):</span>
                  <span className="font-semibold text-green-600">
                    ₱{downPaymentAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Balance:</span>
                  <span className="font-semibold text-orange-600">
                    ₱{remainingAmount.toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Payment Method:</span>
                  <span className="capitalize">
                    {paymentMethod.replace("-", " ")}
                  </span>
                </div>
                {referenceNumber && (
                  <div className="flex justify-between">
                    <span>Reference:</span>
                    <span className="font-mono text-sm">{referenceNumber}</span>
                  </div>
                )}
                {paymentDate && (
                  <div className="flex justify-between">
                    <span>Payment Date:</span>
                    <span>{new Date(paymentDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* No local action buttons; wizard controls handle navigation */}
        </CardContent>
      </Card>
    </div>
  );
}
