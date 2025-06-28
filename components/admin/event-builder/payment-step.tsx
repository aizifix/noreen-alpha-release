import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PaymentData } from "@/app/types";
import { formatCurrency } from "@/lib/utils";

interface PaymentStepProps {
  data: PaymentData;
  updateData: (data: PaymentData) => void;
}

export function PaymentStep({ data, updateData }: PaymentStepProps) {
  const [paymentData, setPaymentData] = useState<PaymentData>(data);

  const handleChange = (field: keyof PaymentData, value: any) => {
    const updatedData = { ...paymentData, [field]: value };
    setPaymentData(updatedData);
    updateData(updatedData);
  };

  const handlePaymentTypeChange = (value: string) => {
    const percentage =
      value === "half"
        ? 50
        : value === "full"
          ? 100
          : paymentData.customPercentage;
    const downPayment = (paymentData.total * percentage) / 100;
    const balance = paymentData.total - downPayment;

    handleChange("paymentType", value);
    handleChange("downPayment", downPayment);
    handleChange("balance", balance);
    handleChange("customPercentage", percentage);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Payment Details</h3>
        <p className="text-sm text-muted-foreground">
          Set up the payment details for this event.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium">
                {formatCurrency(paymentData.total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Down Payment</span>
              <span className="font-medium">
                {formatCurrency(paymentData.downPayment)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-medium">
                {formatCurrency(paymentData.balance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>Payment Type</Label>
              <RadioGroup
                value={paymentData.paymentType}
                onValueChange={handlePaymentTypeChange}
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="half"
                    id="half"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="half"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span>50% Down Payment</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="full"
                    id="full"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="full"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span>Full Payment</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="custom"
                    id="custom"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="custom"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span>Custom</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {paymentData.paymentType === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customPercentage">Custom Percentage</Label>
                <Input
                  id="customPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={paymentData.customPercentage}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 0 && value <= 100) {
                      handlePaymentTypeChange("custom");
                      handleChange("customPercentage", value);
                    }
                  }}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="downPaymentMethod">Payment Method</Label>
              <RadioGroup
                value={paymentData.downPaymentMethod}
                onValueChange={(value) =>
                  handleChange("downPaymentMethod", value)
                }
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="cash"
                    id="cash"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="cash"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span>Cash</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="gcash"
                    id="gcash"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="gcash"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span>GCash</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="bank-transfer"
                    id="bank-transfer"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="bank-transfer"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span>Bank Transfer</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {(paymentData.downPaymentMethod === "gcash" ||
              paymentData.downPaymentMethod === "bank-transfer") && (
              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  value={paymentData.referenceNumber}
                  onChange={(e) =>
                    handleChange("referenceNumber", e.target.value)
                  }
                  placeholder="Enter reference number"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Payment Notes</Label>
              <Input
                id="notes"
                value={paymentData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Add any additional notes about the payment"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
