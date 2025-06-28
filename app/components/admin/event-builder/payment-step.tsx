"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle,
  Upload,
  AlertTriangle,
  Info,
  Paperclip,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PaymentStepProps, PaymentData } from "@/app/types/event-builder";

interface DamageDetails {
  description: string;
  amount: number;
  date: string;
}

export function PaymentStep({
  totalBudget,
  onUpdate,
  onComplete,
}: PaymentStepProps) {
  const [showDamageDialog, setShowDamageDialog] = useState(false);
  const [showDamageEdit, setShowDamageEdit] = useState(false);
  const [damageDetails, setDamageDetails] = useState<DamageDetails>({
    description: "",
    amount: 3000,
    date: new Date().toISOString().split("T")[0],
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    total: totalBudget,
    paymentType: "half",
    downPayment: totalBudget * 0.5,
    balance: totalBudget * 0.5,
    customPercentage: 50,
    downPaymentMethod: "cash",
    referenceNumber: "",
    notes: "",
    cashBondRequired: false,
    cashBondStatus: "pending",
    scheduleTypeId: 2,
  });

  // Update payment data when total budget changes
  useEffect(() => {
    setPaymentData((prev) => ({
      ...prev,
      total: totalBudget,
      downPayment:
        prev.paymentType === "full" ? totalBudget : totalBudget * 0.5,
      balance: prev.paymentType === "full" ? 0 : totalBudget * 0.5,
    }));
  }, [totalBudget]);

  const handlePaymentTypeChange = (value: PaymentData["paymentType"]) => {
    let downPayment = 0;
    let scheduleTypeId = 2; // Default to 50-50

    if (value === "full") {
      downPayment = totalBudget;
      scheduleTypeId = 1; // Full payment
    } else if (value === "half") {
      downPayment = totalBudget * 0.5;
      scheduleTypeId = 2; // 50-50 payment
    } else if (value === "custom") {
      const percentage = paymentData.customPercentage || 50;
      downPayment = (totalBudget * percentage) / 100;
      scheduleTypeId = 3; // Custom payment
    }

    const newData = {
      ...paymentData,
      paymentType: value,
      downPayment: Math.round(downPayment),
      balance: Math.round(totalBudget - downPayment),
      scheduleTypeId: scheduleTypeId,
    };

    setPaymentData(newData);
    onUpdate(newData);
  };

  const handleCustomPercentageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const percentage = Number.parseInt(e.target.value) || 0;
    const downPayment = (totalBudget * percentage) / 100;

    const newData = {
      ...paymentData,
      customPercentage: percentage,
      downPayment: Math.round(downPayment),
      balance: Math.round(totalBudget - downPayment),
      scheduleTypeId: 3, // Custom payment schedule
    };

    setPaymentData(newData);
    onUpdate(newData);
  };

  const handlePaymentMethodChange = (
    value: PaymentData["downPaymentMethod"]
  ) => {
    const newData = {
      ...paymentData,
      downPaymentMethod: value,
    };

    setPaymentData(newData);
    onUpdate(newData);
  };

  const handleReferenceNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newData = {
      ...paymentData,
      referenceNumber: e.target.value,
    };

    setPaymentData(newData);
    onUpdate(newData);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newData = {
      ...paymentData,
      notes: e.target.value,
    };

    setPaymentData(newData);
    onUpdate(newData);
  };

  const handleCashBondToggle = (checked: boolean) => {
    const newData = {
      ...paymentData,
      cashBondRequired: checked,
    };

    setPaymentData(newData);
    onUpdate(newData);
  };

  const handleCashBondStatusChange = (
    status: PaymentData["cashBondStatus"]
  ) => {
    const newData = {
      ...paymentData,
      cashBondStatus: status,
    };

    setPaymentData(newData);
    onUpdate(newData);
  };

  const handleDamageSubmit = () => {
    onUpdate({
      ...paymentData,
      cashBondStatus: "claimed",
      cashBondDamageDetails: damageDetails,
    });
    setShowDamageDialog(false);
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && e.target.files[0]) {
      setAttachments((prev) => [...prev, e.target.files![0]]);
      // Reset the file input
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted">
          <CardContent className="py-4 flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Total Price</span>
            <span className="text-2xl font-bold text-green-700">
              {formatCurrency(paymentData.total)}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="py-4 flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Down Payment</span>
            <span className="text-2xl font-bold text-green-700">
              {formatCurrency(paymentData.downPayment)}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="py-4 flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Balance</span>
            <span className="text-2xl font-bold text-green-700">
              {formatCurrency(paymentData.balance)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Down Payment Amount */}
      <Card>
        <CardContent className="py-6">
          <div className="mb-4">
            <Label className="font-semibold mb-2 block">
              Down Payment Amount
            </Label>
            <div className="flex flex-wrap gap-4 items-center">
              <Button
                variant={
                  paymentData.paymentType === "half" ? "default" : "outline"
                }
                onClick={() => handlePaymentTypeChange("half")}
                className="px-6"
              >
                Half Payment (50%)
              </Button>
              <Button
                variant={
                  paymentData.paymentType === "full" ? "default" : "outline"
                }
                onClick={() => handlePaymentTypeChange("full")}
                className="px-6"
              >
                Full Payment (100%)
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant={
                    paymentData.paymentType === "custom" ? "default" : "outline"
                  }
                  className="px-4"
                >
                  Custom
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={paymentData.customPercentage || 50}
                  onChange={handleCustomPercentageChange}
                  className="w-20"
                  disabled={paymentData.paymentType !== "custom"}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <Label className="font-semibold mb-2 block">Payment Method</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["gcash", "bank-transfer", "cash"].map((method) => (
                <Button
                  key={method}
                  variant={
                    paymentData.downPaymentMethod === method
                      ? "default"
                      : "outline"
                  }
                  onClick={() => handlePaymentMethodChange(method as any)}
                  className={`flex flex-col items-center py-14 bg-green-100 border-green-500 hover:bg-green-600 hover:text-white ${
                    paymentData.downPaymentMethod === method
                      ? "bg-green-600 text-white"
                      : "text-black"
                  }`}
                >
                  {method === "gcash" && <span className="text-3xl">📱</span>}
                  {method === "bank-transfer" && (
                    <span className="text-3xl">🏦</span>
                  )}
                  {method === "cash" && <span className="text-3xl">💵</span>}
                  <span className="mt-2 font-medium capitalize">
                    {method.replace("-", " ")}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Cash Bond Toggle and Section */}
          <div className="mb-4 flex items-center gap-4">
            <Label className="font-semibold mb-2 block">
              Cash Bond (₱3,000)
            </Label>
            <Switch
              checked={paymentData.cashBondRequired}
              onCheckedChange={(checked: boolean) =>
                handleCashBondToggle(checked)
              }
            />
            <span className="text-muted-foreground">
              {paymentData.cashBondRequired ? "Required" : "Not Required"}
            </span>
          </div>
          {paymentData.cashBondRequired && (
            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold">Cash Bond Status</span>
                  <div className="text-xs text-muted-foreground">
                    A refundable deposit that will be returned after the event
                    if no damages occur
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-bold text-green-700">
                    ₱
                    {paymentData.cashBondStatus === "claimed"
                      ? damageDetails.amount
                      : 3000}
                  </span>
                  <Badge
                    variant={
                      paymentData.cashBondStatus === "paid"
                        ? "default"
                        : paymentData.cashBondStatus === "claimed"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {paymentData.cashBondStatus.charAt(0).toUpperCase() +
                      paymentData.cashBondStatus.slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={paymentData.cashBondStatus}
                  onChange={(e) =>
                    handleCashBondStatusChange(e.target.value as any)
                  }
                  className="border rounded px-2 py-1"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="claimed">Claimed</option>
                  <option value="refunded">Refunded</option>
                </select>
                {paymentData.cashBondStatus === "claimed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDamageEdit((v) => !v)}
                  >
                    {showDamageEdit ? "Hide" : "Edit Damage"}
                  </Button>
                )}
              </div>
              {paymentData.cashBondStatus === "claimed" && showDamageEdit && (
                <div className="space-y-2">
                  <Input
                    type="number"
                    min={0}
                    value={damageDetails.amount}
                    onChange={(e) =>
                      setDamageDetails((d) => ({
                        ...d,
                        amount: Number(e.target.value),
                      }))
                    }
                    className="w-32"
                    placeholder="Damage Amount"
                  />
                  <Textarea
                    value={damageDetails.description}
                    onChange={(e) =>
                      setDamageDetails((d) => ({
                        ...d,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe the damage..."
                  />
                  <Button size="sm" onClick={handleDamageSubmit}>
                    Save
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Payment Details Section */}
          {paymentData.downPaymentMethod === "gcash" && (
            <div className="bg-muted rounded-lg p-6 mt-4">
              <Label className="font-semibold mb-2 block">GCash Payment</Label>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-4 rounded-lg border w-fit mx-auto">
                  <span className="text-6xl text-green-600">QR</span>
                </div>
                <span className="font-bold text-lg">09123456789</span>
                <span className="text-muted-foreground text-sm">
                  Noreen Events
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={paymentData.referenceNumber}
                    onChange={handleReferenceNumberChange}
                    placeholder="GCash Reference Number"
                    className="w-64"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    Copy Number
                  </Button>
                </div>
              </div>
            </div>
          )}
          {paymentData.downPaymentMethod === "bank-transfer" && (
            <div className="bg-muted rounded-lg p-6 mt-4">
              <Label className="font-semibold mb-2 block">
                Bank Transfer Details
              </Label>
              <div className="mb-2">Bank: BDO</div>
              <div className="mb-2">Account Name: Noreen Events Inc.</div>
              <div className="mb-2">Account Number: 1234567890</div>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={paymentData.referenceNumber}
                  onChange={handleReferenceNumberChange}
                  placeholder="Reference Number"
                  className="w-64"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Copy Reference
                </Button>
              </div>
            </div>
          )}
          {paymentData.downPaymentMethod === "cash" && (
            <div className="bg-muted rounded-lg p-6 mt-4">
              <Label className="font-semibold mb-2 block">Cash Payment</Label>
              <div>Pay with cash in person at the event.</div>
            </div>
          )}

          {/* Payment Notes */}
          <div className="mt-6">
            <Label className="font-semibold mb-2 block">Payment Notes</Label>
            <Textarea
              value={paymentData.notes || ""}
              onChange={handleNotesChange}
              placeholder="Add notes about this payment"
              className="w-full"
            />
          </div>

          {/* Attachments */}
          <div className="mt-6">
            <Label className="font-semibold mb-2 block">Attachments</Label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="file"
                ref={attachmentInputRef}
                onChange={handleAttachmentUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  attachmentInputRef.current &&
                  attachmentInputRef.current.click()
                }
                className="flex items-center gap-2"
              >
                <Paperclip className="h-4 w-4" /> Add Attachment
              </Button>
            </div>
            <div className="space-y-2">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white rounded p-2 border"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span>{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttachment(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-8">
            <Button variant="outline">Cancel</Button>
            <Button className="bg-green-600 text-white" onClick={onComplete}>
              Complete Event Creation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
