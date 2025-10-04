"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Smartphone,
  Building2,
  Upload,
  X,
  FileText,
  Image,
  Calculator,
  Receipt,
  Eye,
  CheckCircle,
} from "lucide-react";

interface PaymentProof {
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  uploadedPath?: string;
  uploadedAt?: string;
}

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
  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>([]);
  const [notes, setNotes] = useState("");

  const paymentMethods = [
    {
      id: "cash",
      label: "Cash Payment",
      icon: DollarSign,
      requiresRef: false,
      description: "Pay in cash directly",
    },
    {
      id: "gcash",
      label: "GCash",
      icon: Smartphone,
      requiresRef: true,
      description: "Mobile payment via GCash",
    },
    {
      id: "bank-transfer",
      label: "Bank Transfer",
      icon: Building2,
      requiresRef: true,
      description: "Direct bank transfer",
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
      paymentProofs: paymentProofs.map((proof) => ({
        name: proof.name,
        size: proof.size,
        type: proof.type,
      })),
      paymentAttachments: paymentProofs
        .filter((proof) => proof.uploadedPath)
        .map((proof) => ({
          original_name: proof.name,
          file_name: proof.uploadedPath?.split("/").pop() || proof.name,
          file_path: proof.uploadedPath,
          file_size: proof.size,
          file_type: proof.type,
          description: `Payment proof for ${paymentMethod} payment`,
          proof_type: proof.type.includes("image") ? "screenshot" : "receipt",
          uploaded_at: proof.uploadedAt || new Date().toISOString(),
        })),
      notes,
    };

    console.log("Auto-updating payment data:", paymentData);
    onUpdate(paymentData);
  }, [
    paymentMethod,
    referenceNumber,
    downPaymentPercentage,
    paymentProofs,
    notes,
    totalBudget,
    downPaymentAmount,
    remainingAmount,
  ]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      const proof: PaymentProof = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      };

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          proof.preview = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }

      // Upload file to server immediately
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("operation", "uploadFile");
        formData.append("fileType", "payment_proof");

        const API_URL =
          process.env.NEXT_PUBLIC_API_URL ||
          "https://noreen-events.online/noreen-events";
        console.log("Uploading file to:", `${API_URL}/admin.php`);
        console.log("FormData contents:", {
          file: file.name,
          operation: "uploadFile",
          fileType: "payment_proof",
        });

        const response = await fetch(`${API_URL}/admin.php`, {
          method: "POST",
          body: formData,
          headers: {
            // Don't set Content-Type for FormData, let the browser set it with boundary
          },
        });

        console.log("Upload response status:", response.status);
        console.log("Upload response headers:", response.headers);

        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const textResponse = await response.text();
          console.error("Server returned non-JSON response:", textResponse);
          console.error("Response status:", response.status);
          console.error("Response URL:", response.url);
          alert(
            `Failed to upload ${file.name}: Server returned invalid response (Status: ${response.status})`
          );
          return;
        }

        const result = await response.json();

        if (result.status === "success") {
          // Add the uploaded file path to the proof
          proof.uploadedPath = result.filePath;
          proof.uploadedAt = new Date().toISOString();
          setPaymentProofs((prev) => [...prev, proof]);
        } else {
          alert(
            `Failed to upload ${file.name}: ${result.message || "Unknown error"}`
          );
        }
      } catch (error) {
        console.error("Upload error:", error);
        alert(`Failed to upload ${file.name}. Please try again.`);
      }
    }
  };

  const removeProof = (index: number) => {
    setPaymentProofs((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    return FileText;
  };

  const handleComplete = () => {
    const paymentData = {
      // Use field names that match what the event builder expects
      totalBudget,
      downPaymentMethod: paymentMethod, // Match event builder field name
      referenceNumber,
      downPaymentPercentage,
      downPayment: downPaymentAmount, // Match event builder field name
      downPaymentAmount, // Keep for compatibility
      remainingAmount,
      paymentProofs: paymentProofs.map((proof) => ({
        name: proof.name,
        size: proof.size,
        type: proof.type,
      })),
      // Include payment attachments with server file paths for backend processing
      paymentAttachments: paymentProofs
        .filter((proof) => proof.uploadedPath) // Only include successfully uploaded files
        .map((proof) => ({
          original_name: proof.name,
          file_name: proof.uploadedPath?.split("/").pop() || proof.name,
          file_path: proof.uploadedPath,
          file_size: proof.size,
          file_type: proof.type,
          description: `Payment proof for ${paymentMethod} payment`,
          proof_type: proof.type.includes("image") ? "screenshot" : "receipt",
          uploaded_at: proof.uploadedAt || new Date().toISOString(),
        })),
      notes,
    };

    console.log("Payment step returning data:", paymentData);
    onUpdate(paymentData);
    onComplete();
  };

  const isFormValid = () => {
    const methodRequiresRef = paymentMethods.find(
      (m) => m.id === paymentMethod
    )?.requiresRef;
    if (methodRequiresRef && !referenceNumber.trim()) return false;
    if (paymentProofs.length === 0) return false;
    return true;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800">Payment Setup</h2>
        <p className="text-gray-600 mt-2">
          Configure your payment details and upload proof of payment
        </p>
      </div>

      {/* Purchase Review */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Receipt className="h-5 w-5" />
            Purchase Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {selectedPackage && (
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <span className="font-medium">Package:</span>
                <p className="text-sm text-gray-600">{selectedPackage.name}</p>
              </div>
              <span className="font-bold text-green-600">
                ₱{selectedPackage.price?.toLocaleString()}
              </span>
            </div>
          )}

          {selectedVenue && (
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <span className="font-medium">Venue:</span>
                <p className="text-sm text-gray-600">{selectedVenue.name}</p>
              </div>
              <span className="font-bold text-green-600">
                ₱{selectedVenue.price?.toLocaleString()}
              </span>
            </div>
          )}

          {selectedComponents && selectedComponents.length > 0 && (
            <div className="space-y-2">
              <span className="font-medium">Additional Components:</span>
              {selectedComponents.map((component, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-1 pl-4 border-l-2 border-gray-200"
                >
                  <span className="text-sm">{component.name}</span>
                  <span className="text-sm font-medium text-green-600">
                    ₱{component.price?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="flex justify-between items-center py-3 bg-gray-50 px-4 rounded-lg">
            <span className="text-xl font-bold">Total Amount:</span>
            <span className="text-2xl font-bold text-blue-600">
              ₱{totalBudget.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Amount Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Payment Amount
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium">
              Down Payment Percentage: {downPaymentPercentage}%
            </Label>
            <div className="mt-3">
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={downPaymentPercentage}
                onChange={(e) =>
                  setDownPaymentPercentage(parseInt(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800">Down Payment</h4>
              <p className="text-2xl font-bold text-green-600">
                ₱{downPaymentAmount.toLocaleString()}
              </p>
              <p className="text-sm text-green-600">Pay now</p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-medium text-orange-800">Remaining Balance</h4>
              <p className="text-2xl font-bold text-orange-600">
                ₱{remainingAmount.toLocaleString()}
              </p>
              <p className="text-sm text-orange-600">Pay later</p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-800">
                Payment Progress
              </span>
              <span className="text-sm text-blue-600">
                {downPaymentPercentage}%
              </span>
            </div>
            <Progress value={downPaymentPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="grid md:grid-cols-3 gap-4">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div key={method.id} className="relative">
                    <RadioGroupItem
                      value={method.id}
                      id={method.id}
                      className="sr-only"
                    />
                    <label
                      htmlFor={method.id}
                      className={`
                        flex flex-col items-center p-6 rounded-lg border-2 cursor-pointer transition-all
                        ${
                          paymentMethod === method.id
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-gray-300"
                        }
                      `}
                    >
                      <Icon
                        className={`h-10 w-10 mb-3 ${
                          paymentMethod === method.id
                            ? "text-blue-600"
                            : "text-gray-400"
                        }`}
                      />
                      <span className="font-medium text-center">
                        {method.label}
                      </span>
                      <span className="text-xs text-gray-500 text-center mt-1">
                        {method.description}
                      </span>
                      {paymentMethod === method.id && (
                        <CheckCircle className="h-5 w-5 text-blue-600 mt-2" />
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </RadioGroup>

          {/* Reference Number */}
          {paymentMethods.find((m) => m.id === paymentMethod)?.requiresRef && (
            <div className="mt-6">
              <Label htmlFor="reference" className="text-base font-medium">
                Reference Number *
              </Label>
              <Input
                id="reference"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Enter transaction reference number"
                className="mt-2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for{" "}
                {paymentMethods.find((m) => m.id === paymentMethod)?.label}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Proof Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Payment Proof *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Upload Payment Proof
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Screenshots, receipts, or bank transfer confirmations
            </p>
            <input
              type="file"
              onChange={handleFileUpload}
              multiple
              accept="image/*,.pdf"
              className="hidden"
              id="proof-upload"
            />
            <label
              htmlFor="proof-upload"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </label>
            <p className="text-xs text-gray-400 mt-2">
              Maximum file size: 10MB. Accepted formats: JPG, PNG, PDF
            </p>
          </div>

          {/* Uploaded Files Display */}
          {paymentProofs.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Uploaded Proofs:</h4>
              {paymentProofs.map((proof, index) => {
                const FileIcon = getFileIcon(proof.type);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      {proof.preview ? (
                        <img
                          src={proof.preview}
                          alt={proof.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <FileIcon className="h-8 w-8 text-gray-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm truncate max-w-xs">
                          {proof.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(proof.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {proof.preview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(proof.preview, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeProof(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional payment notes or special instructions..."
            rows={3}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Validation Messages */}
      {!isFormValid() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-800 mb-2">
            Required Information Missing:
          </h4>
          <ul className="text-sm text-red-600 space-y-1">
            {paymentMethods.find((m) => m.id === paymentMethod)?.requiresRef &&
              !referenceNumber.trim() && (
                <li>
                  • Reference number is required for{" "}
                  {paymentMethods.find((m) => m.id === paymentMethod)?.label}
                </li>
              )}
            {paymentProofs.length === 0 && (
              <li>• At least one payment proof must be uploaded</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
