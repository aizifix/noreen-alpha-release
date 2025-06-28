"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  Copy,
  Check,
  Upload,
  Wallet,
  BanknoteIcon,
  Smartphone,
  Building,
  FileText,
  X,
  Paperclip,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";

interface PaymentMethodProps {
  totalAmount: number;
  onSubmit: (method: string, data: any) => void;
}

interface PaymentData {
  total: number;
  downPayment: number;
  downPaymentMethod: string;
  downPaymentStatus: string;
  referenceNumber: string;
  balance: number;
  balanceMethod: string;
  balanceStatus: string;
  notes: string;
  balanceNotes: string;
  attachments: File[];
  customPercentage: number;
  cashBondRequired: boolean;
  cashBondStatus: string;
  cashBondDamageDetails?: { description: string; amount: number };
  scheduleTypeId: number;
  paymentType: "full" | "half" | "custom" | "monthly" | "quarterly";
}

export function PaymentMethod({ totalAmount, onSubmit }: PaymentMethodProps) {
  // Use a ref to track initial render
  const isInitialRender = useRef(true);

  const [paymentData, setPaymentData] = useState<PaymentData>({
    total: totalAmount,
    downPayment: Math.round(totalAmount * 0.5), // Default 50%
    downPaymentMethod: "gcash",
    downPaymentStatus: "pending",
    referenceNumber: "",
    balance: Math.round(totalAmount * 0.5), // Default 50%
    balanceMethod: "cash",
    balanceStatus: "pending",
    notes: "",
    balanceNotes: "",
    attachments: [] as File[],
    customPercentage: 50,
    cashBondRequired: true,
    cashBondStatus: "pending",
    scheduleTypeId: 2, // Default to 50-50 payment
    paymentType: "half",
  });

  // Update total amount when it changes from props
  useEffect(() => {
    if (paymentData.total !== totalAmount) {
      const downPaymentAmount = Math.round(totalAmount * 0.5);
      setPaymentData((prev) => ({
        ...prev,
        total: totalAmount,
        downPayment: downPaymentAmount,
        balance: totalAmount - downPaymentAmount,
      }));
    }
  }, [totalAmount, paymentData.total]);

  const [copied, setCopied] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [tempReferenceNumber, setTempReferenceNumber] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [showDamageEdit, setShowDamageEdit] = useState(false);
  const [damageDetails, setDamageDetails] = useState({
    description: "",
    amount: 3000,
  });

  // Update payment data
  const handleInputChange = (
    field: keyof PaymentData,
    value: PaymentData[keyof PaymentData]
  ) => {
    setPaymentData((prev) => {
      const updated = { ...prev, [field]: value };

      // Recalculate payments when schedule type or percentage changes
      if (
        field === "scheduleTypeId" ||
        field === "customPercentage" ||
        field === "paymentType"
      ) {
        const percentage =
          field === "customPercentage"
            ? (value as number)
            : updated.customPercentage;
        const downPaymentAmount = (totalAmount * percentage) / 100;

        updated.downPayment = Math.round(downPaymentAmount);
        updated.balance = Math.round(totalAmount - downPaymentAmount);
      }

      return updated;
    });
  };

  // Copy reference number to clipboard
  const copyReferenceNumber = () => {
    const refNumber = "GC-123456789"; // Demo reference number
    navigator.clipboard.writeText(refNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  // Handle attachment upload
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setShowAttachmentModal(true);
      // Reset the file input
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
    }
  };

  // Save attachment with description
  const saveAttachment = () => {
    if (
      attachmentInputRef.current?.files &&
      attachmentInputRef.current.files[0]
    ) {
      const file = attachmentInputRef.current.files[0];
      const newAttachments = [...paymentData.attachments, file];
      setPaymentData((prev) => ({
        ...prev,
        attachments: newAttachments,
      }));
      setAttachmentDescription("");
      setShowAttachmentModal(false);
      toast({
        title: "Attachment added",
        description: `${file.name} has been added to the payment.`,
      });
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    const newAttachments = [...paymentData.attachments];
    newAttachments.splice(index, 1);
    setPaymentData((prev) => ({
      ...prev,
      attachments: newAttachments,
    }));
  };

  // Save reference number from modal
  const saveReferenceNumber = () => {
    if (!tempReferenceNumber.trim()) {
      toast({
        title: "Reference number required",
        description: "Please enter a valid reference number.",
        variant: "destructive",
      });
      return;
    }

    handleInputChange("referenceNumber", tempReferenceNumber);
    setShowReferenceModal(false);
    toast({
      title: "Reference number saved",
      description: "The reference number has been added to the payment.",
    });
  };

  // Submit payment data
  const handleSubmit = () => {
    // Check if reference number is provided for methods that require it
    if (
      (paymentData.downPaymentMethod === "gcash" ||
        paymentData.downPaymentMethod === "bank-transfer") &&
      !paymentData.referenceNumber
    ) {
      setShowReferenceModal(true);
      toast({
        title: "Reference number required",
        description: `Please provide a reference number for ${paymentData.downPaymentMethod === "gcash" ? "GCash" : "bank transfer"} payment.`,
        variant: "destructive",
      });
      return;
    }

    // Include payment schedule information in the data
    const enhancedPaymentData = {
      ...paymentData,
      payment_schedule_type_id: paymentData.scheduleTypeId,
      payment_method: paymentData.downPaymentMethod,
      payment_status: paymentData.downPaymentStatus,
      reference_number: paymentData.referenceNumber,
      cash_bond_required: paymentData.cashBondRequired,
      cash_bond_status: paymentData.cashBondStatus,
      cash_bond_damage_details: paymentData.cashBondDamageDetails,
    };

    onSubmit(paymentData.downPaymentMethod, enhancedPaymentData);
  };

  // Mock GCash account number
  const gcashNumber = "09123456789";

  // Payment method options with icons
  const paymentMethods = [
    {
      id: "gcash",
      name: "GCash",
      icon: <Smartphone className="h-6 w-6" />,
      description: "Pay via GCash mobile wallet",
    },
    {
      id: "bank-transfer",
      name: "Bank Transfer",
      icon: <Building className="h-6 w-6" />,
      description: "Pay via bank transfer",
    },
    {
      id: "cash",
      name: "Cash",
      icon: <BanknoteIcon className="h-6 w-6" />,
      description: "Pay with cash in person",
    },
  ];

  // Payment status options
  const paymentStatuses = [
    { id: "pending", name: "Pending", color: "bg-yellow-100 text-yellow-800" },
    {
      id: "partial",
      name: "Partially Paid",
      color: "bg-blue-100 text-blue-800",
    },
    { id: "paid", name: "Paid", color: "bg-green-100 text-green-800" },
    { id: "failed", name: "Failed", color: "bg-red-100 text-red-800" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted">
          <CardContent className="py-4 flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Total Price</span>
            <span className="text-2xl font-bold text-green-700">
              ₱{totalAmount.toLocaleString()}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="py-4 flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Down Payment</span>
            <span className="text-2xl font-bold text-green-700">
              ₱{paymentData.downPayment.toLocaleString()}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="py-4 flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Balance</span>
            <span className="text-2xl font-bold text-green-700">
              ₱{paymentData.balance.toLocaleString()}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Payment Schedule Selection */}
      <Card>
        <CardContent className="py-6">
          <div className="mb-4">
            <Label className="font-semibold mb-3 block">Payment Schedule</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant={
                  paymentData.paymentType === "full" ? "default" : "outline"
                }
                onClick={() => {
                  handleInputChange("paymentType", "full");
                  handleInputChange("scheduleTypeId", 1);
                  handleInputChange("customPercentage", 100);
                }}
                className="flex flex-col items-center py-6"
              >
                <span className="text-2xl mb-2">💰</span>
                <span className="font-medium">Full Payment</span>
                <span className="text-xs text-muted-foreground">
                  Pay all at once
                </span>
              </Button>
              <Button
                variant={
                  paymentData.paymentType === "half" ? "default" : "outline"
                }
                onClick={() => {
                  handleInputChange("paymentType", "half");
                  handleInputChange("scheduleTypeId", 2);
                  handleInputChange("customPercentage", 50);
                }}
                className="flex flex-col items-center py-6"
              >
                <span className="text-2xl mb-2">⚖️</span>
                <span className="font-medium">50-50 Payment</span>
                <span className="text-xs text-muted-foreground">
                  Two equal payments
                </span>
              </Button>
              <Button
                variant={
                  paymentData.paymentType === "monthly" ? "default" : "outline"
                }
                onClick={() => {
                  handleInputChange("paymentType", "monthly");
                  handleInputChange("scheduleTypeId", 3);
                  handleInputChange("customPercentage", 30);
                }}
                className="flex flex-col items-center py-6"
              >
                <span className="text-2xl mb-2">📅</span>
                <span className="font-medium">Monthly</span>
                <span className="text-xs text-muted-foreground">
                  3 monthly payments
                </span>
              </Button>
              <Button
                variant={
                  paymentData.paymentType === "quarterly"
                    ? "default"
                    : "outline"
                }
                onClick={() => {
                  handleInputChange("paymentType", "quarterly");
                  handleInputChange("scheduleTypeId", 4);
                  handleInputChange("customPercentage", 25);
                }}
                className="flex flex-col items-center py-6"
              >
                <span className="text-2xl mb-2">📊</span>
                <span className="font-medium">Quarterly</span>
                <span className="text-xs text-muted-foreground">
                  4 quarterly payments
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  paymentData.customPercentage === 50 ? "default" : "outline"
                }
                onClick={() => handleInputChange("customPercentage", 50)}
                className="px-6"
              >
                Half Payment (50%)
              </Button>
              <Button
                variant={
                  paymentData.customPercentage === 100 ? "default" : "outline"
                }
                onClick={() => handleInputChange("customPercentage", 100)}
                className="px-6"
              >
                Full Payment (100%)
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant={
                    paymentData.customPercentage !== 50 &&
                    paymentData.customPercentage !== 100
                      ? "default"
                      : "outline"
                  }
                  className="px-4"
                >
                  Custom
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={paymentData.customPercentage}
                  onChange={(e) =>
                    handleInputChange(
                      "customPercentage",
                      Number(e.target.value)
                    )
                  }
                  className="w-20"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <Label className="font-semibold mb-2 block">Payment Method</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paymentMethods.map((method) => (
                <Button
                  key={method.id}
                  variant={
                    paymentData.downPaymentMethod === method.id
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    handleInputChange("downPaymentMethod", method.id)
                  }
                  className="flex flex-col items-center py-6"
                >
                  {method.icon}
                  <span className="mt-2 font-medium">{method.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Payment Status */}
          <div className="mb-4">
            <Label className="font-semibold mb-2 block">Payment Status</Label>
            <select
              value={paymentData.downPaymentStatus}
              onChange={(e) =>
                handleInputChange("downPaymentStatus", e.target.value)
              }
              className="w-full border rounded px-3 py-2"
            >
              {paymentStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cash Bond Toggle and Section */}
          <div className="mb-4 flex items-center gap-4">
            <Label className="font-semibold mb-2 block">
              Cash Bond (₱3,000)
            </Label>
            <Switch
              checked={paymentData.cashBondRequired}
              onCheckedChange={(checked: boolean) =>
                handleInputChange("cashBondRequired", checked)
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
                    handleInputChange("cashBondStatus", e.target.value)
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
                  <Button
                    size="sm"
                    onClick={() => {
                      handleInputChange("cashBondDamageDetails", damageDetails);
                      setShowDamageEdit(false);
                    }}
                  >
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
              <div className="flex flex-col items-center gap-2 mt-4">
                <div className="bg-white p-4 rounded-lg border w-fit mx-auto">
                  <QrCode className="h-24 w-24 text-green-600 mx-auto" />
                </div>
                <span className="font-bold text-lg">09123456789</span>
                <span className="text-muted-foreground text-sm">
                  Noreen Events
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReferenceModal(true)}
                  className="flex items-center gap-2"
                >
                  {paymentData.referenceNumber
                    ? "Edit Reference Number"
                    : "Add Reference Number"}
                </Button>
                {paymentData.referenceNumber && (
                  <span className="text-green-700 font-medium">
                    {paymentData.referenceNumber}
                  </span>
                )}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReferenceModal(true)}
                  className="flex items-center gap-2"
                >
                  {paymentData.referenceNumber
                    ? "Edit Reference Number"
                    : "Add Reference Number"}
                </Button>
                {paymentData.referenceNumber && (
                  <span className="text-green-700 font-medium">
                    {paymentData.referenceNumber}
                  </span>
                )}
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
              value={paymentData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
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
              {paymentData.attachments.map((file, idx) => (
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
            <Button onClick={handleSubmit} className="bg-green-600 text-white">
              Save Payment Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reference Number Modal (for GCash and Bank Transfer) */}
      <Dialog open={showReferenceModal} onOpenChange={setShowReferenceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reference Number</DialogTitle>
            <DialogDescription>
              Enter the GCash reference number for this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="reference-number">Reference Number</Label>
            <Input
              id="reference-number"
              autoFocus
              value={tempReferenceNumber}
              onChange={(e) => setTempReferenceNumber(e.target.value)}
              placeholder="Enter GCash reference number"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReferenceModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleInputChange("referenceNumber", tempReferenceNumber);
                setShowReferenceModal(false);
              }}
              disabled={!tempReferenceNumber.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
