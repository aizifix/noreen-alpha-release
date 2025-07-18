"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  X,
  FileText,
  Plus,
  Eye,
  EyeOff,
  RefreshCw,
  Mail,
  Building,
  Phone,
  MapPin,
  User,
  Shield,
} from "lucide-react";

interface SupplierDocument {
  id: string;
  file: File;
  type: string;
  title: string;
}

interface SupplierFormData {
  business_name: string;
  contact_person: string;
  contact_email: string;
  contact_number: string;
  business_address: string;
  business_description: string;
  specialty_category: string;
  supplier_type: "internal" | "external";
  agreement_signed: boolean;
  is_verified: boolean;
  documents: SupplierDocument[];
}

const documentTypes = [
  {
    code: "dti",
    name: "DTI Permit",
    required: true,
    description:
      "Department of Trade and Industry business registration permit",
  },
  {
    code: "business_permit",
    name: "Business Permit",
    required: true,
    description: "Local government business permit and licenses",
  },
  {
    code: "contract",
    name: "Service Contract",
    required: true,
    description: "Signed service agreements and contracts",
  },
  {
    code: "portfolio",
    name: "Portfolio",
    required: false,
    description: "Work samples and portfolio documents",
  },
  {
    code: "certification",
    name: "Certification",
    required: false,
    description: "Professional certifications and awards",
  },
  {
    code: "other",
    name: "Other Documents",
    required: false,
    description: "Miscellaneous supporting documents",
  },
];

const specialtyCategories = [
  "Catering Services",
  "Photography & Videography",
  "Floral Arrangements",
  "Entertainment & Music",
  "Decoration & Design",
  "Transportation",
  "Audio Visual Equipment",
  "Security Services",
  "Lighting & Effects",
  "Event Planning",
  "Venue Management",
  "Other",
];

export default function EnhancedSupplierCreationForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [formData, setFormData] = useState<SupplierFormData>({
    business_name: "",
    contact_person: "",
    contact_email: "",
    contact_number: "",
    business_address: "",
    business_description: "",
    specialty_category: "",
    supplier_type: "internal",
    agreement_signed: false,
    is_verified: false,
    documents: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentDocumentType, setCurrentDocumentType] = useState("");
  const [currentDocumentTitle, setCurrentDocumentTitle] = useState("");

  const generateSecurePassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";

    // Ensure at least one of each type
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // lowercase
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // uppercase
    password += "0123456789"[Math.floor(Math.random() * 10)]; // number
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // special

    // Fill the rest randomly
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }

    // Shuffle the password
    const shuffled = password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
    setGeneratedPassword(shuffled);
  };

  const handleInputChange = (field: keyof SupplierFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (
      !files ||
      files.length === 0 ||
      !currentDocumentType ||
      !currentDocumentTitle.trim()
    )
      return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        documents: "File size exceeds 10MB limit",
      }));
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        documents:
          "Invalid file type. Only PDF, JPG, and PNG files are allowed",
      }));
      return;
    }

    const newDocument: SupplierDocument = {
      id: Math.random().toString(36).substr(2, 9),
      file: file,
      type: currentDocumentType,
      title: currentDocumentTitle.trim(),
    };

    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, newDocument],
    }));

    setCurrentDocumentType("");
    setCurrentDocumentTitle("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeDocument = (documentId: string) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((doc) => doc.id !== documentId),
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.business_name.trim())
      newErrors.business_name = "Business name is required";
    if (!formData.contact_email.trim())
      newErrors.contact_email = "Email is required";
    if (!formData.contact_number.trim())
      newErrors.contact_number = "Contact number is required";
    if (!formData.supplier_type)
      newErrors.supplier_type = "Supplier type is required";

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.contact_email && !emailRegex.test(formData.contact_email)) {
      newErrors.contact_email = "Invalid email format";
    }

    // Phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (
      formData.contact_number &&
      !phoneRegex.test(formData.contact_number.replace(/[\s\-\(\)]/g, ""))
    ) {
      newErrors.contact_number = "Invalid phone number format";
    }

    // Check required documents for internal suppliers
    if (formData.supplier_type === "internal") {
      const requiredDocs = documentTypes.filter((type) => type.required);
      const uploadedTypes = formData.documents.map((doc) => doc.type);

      for (const requiredDoc of requiredDocs) {
        if (!uploadedTypes.includes(requiredDoc.code)) {
          newErrors.documents = `Missing required document: ${requiredDoc.name}`;
          break;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    setSuccess("");

    try {
      // Generate password for internal suppliers
      if (formData.supplier_type === "internal" && !generatedPassword) {
        generateSecurePassword();
      }

      const formDataToSend = new FormData();

      // Add basic supplier data
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== "documents") {
          formDataToSend.append(key, value.toString());
        }
      });

      // Add documents
      formData.documents.forEach((doc, index) => {
        formDataToSend.append(`documents[${index}][file]`, doc.file);
        formDataToSend.append(`documents[${index}][type]`, doc.type);
        formDataToSend.append(`documents[${index}][title]`, doc.title);
      });

      // Add admin ID (you would get this from your auth context)
      formDataToSend.append("admin_id", "1"); // Replace with actual admin ID

      const response = await fetch("/api/admin?operation=createSupplier", {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.status === "success") {
        setSuccess(result.message);
        setTimeout(() => {
          setOpen(false);
          window.location.reload(); // Refresh supplier list
        }, 2000);
      } else {
        setErrors({ general: result.message });
      }
    } catch (error) {
      console.error("Error creating supplier:", error);
      setErrors({ general: "Failed to create supplier. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      business_name: "",
      contact_person: "",
      contact_email: "",
      contact_number: "",
      business_address: "",
      business_description: "",
      specialty_category: "",
      supplier_type: "internal",
      agreement_signed: false,
      is_verified: false,
      documents: [],
    });
    setErrors({});
    setSuccess("");
    setGeneratedPassword("");
    setCurrentDocumentType("");
    setCurrentDocumentTitle("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-all duration-200">
          <Plus className="w-5 h-5 mr-2" />
          Add Supplier
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create New Supplier
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message */}
          {success && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <Mail className="w-4 h-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {errors.general && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information Section */}
          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building className="w-5 h-5 mr-2 text-blue-600" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="business_name"
                  className="flex items-center space-x-2"
                >
                  <span>Business Name</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) =>
                    handleInputChange("business_name", e.target.value)
                  }
                  placeholder="Enter business name"
                  className={errors.business_name ? "border-red-500" : ""}
                />
                {errors.business_name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.business_name}
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="contact_person"
                  className="flex items-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>Contact Person</span>
                </Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) =>
                    handleInputChange("contact_person", e.target.value)
                  }
                  placeholder="Enter contact person name"
                />
              </div>

              <div>
                <Label
                  htmlFor="contact_email"
                  className="flex items-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Address</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) =>
                    handleInputChange("contact_email", e.target.value)
                  }
                  placeholder="Enter email address"
                  className={errors.contact_email ? "border-red-500" : ""}
                />
                {errors.contact_email && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.contact_email}
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="contact_number"
                  className="flex items-center space-x-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Contact Number</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contact_number"
                  value={formData.contact_number}
                  onChange={(e) =>
                    handleInputChange("contact_number", e.target.value)
                  }
                  placeholder="Enter contact number"
                  className={errors.contact_number ? "border-red-500" : ""}
                />
                {errors.contact_number && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.contact_number}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label
                htmlFor="business_address"
                className="flex items-center space-x-2"
              >
                <MapPin className="w-4 h-4" />
                <span>Business Address</span>
              </Label>
              <Textarea
                id="business_address"
                value={formData.business_address}
                onChange={(e) =>
                  handleInputChange("business_address", e.target.value)
                }
                placeholder="Enter complete business address"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="business_description">Business Description</Label>
              <Textarea
                id="business_description"
                value={formData.business_description}
                onChange={(e) =>
                  handleInputChange("business_description", e.target.value)
                }
                placeholder="Describe the business and services offered"
                rows={3}
              />
            </div>
          </div>

          {/* Classification Section */}
          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-purple-600" />
              Classification & Verification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="supplier_type"
                  className="flex items-center space-x-2"
                >
                  <span>Supplier Type</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.supplier_type}
                  onValueChange={(value: "internal" | "external") =>
                    handleInputChange("supplier_type", value)
                  }
                >
                  <SelectTrigger
                    className={errors.supplier_type ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select supplier type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">
                      Internal Supplier (With Portal Access)
                    </SelectItem>
                    <SelectItem value="external">
                      External Supplier (No Portal Access)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.supplier_type && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.supplier_type}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="specialty_category">Specialty Category</Label>
                <Select
                  value={formData.specialty_category}
                  onValueChange={(value) =>
                    handleInputChange("specialty_category", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty category" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialtyCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreement_signed"
                  checked={formData.agreement_signed}
                  onCheckedChange={(checked) =>
                    handleInputChange("agreement_signed", checked)
                  }
                />
                <Label htmlFor="agreement_signed">Agreement Signed</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_verified"
                  checked={formData.is_verified}
                  onCheckedChange={(checked) =>
                    handleInputChange("is_verified", checked)
                  }
                />
                <Label htmlFor="is_verified">Pre-verified</Label>
              </div>
            </div>
          </div>

          {/* Auto-generated Password Section (Internal Suppliers Only) */}
          {formData.supplier_type === "internal" && (
            <div className="bg-blue-50 p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Portal Access Credentials
              </h3>

              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label>Auto-Generated Password</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={generatedPassword}
                      readOnly
                      className="bg-white"
                      placeholder="Click generate to create password"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateSecurePassword}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Alert className="bg-blue-100 border-blue-300 text-blue-800">
                <Mail className="w-4 h-4" />
                <AlertDescription>
                  The generated password will be automatically sent to the
                  supplier's email address upon account creation. The supplier
                  will be required to change this password on first login.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Document Upload Section */}
          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-green-600" />
              Documents Upload
              {formData.supplier_type === "internal" && (
                <Badge variant="secondary" className="ml-2">
                  Required for Internal Suppliers
                </Badge>
              )}
            </h3>

            {/* Document Upload Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
              <div>
                <Label htmlFor="document_type">Document Type</Label>
                <Select
                  value={currentDocumentType}
                  onValueChange={setCurrentDocumentType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.code} value={type.code}>
                        {type.name}{" "}
                        {type.required &&
                          formData.supplier_type === "internal" && (
                            <span className="text-red-500">*</span>
                          )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="document_title">Document Title</Label>
                <Input
                  id="document_title"
                  value={currentDocumentTitle}
                  onChange={(e) => setCurrentDocumentTitle(e.target.value)}
                  placeholder="Enter document title"
                />
              </div>

              <div>
                <Label htmlFor="document_file">Select File</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="document_file"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={
                      !currentDocumentType || !currentDocumentTitle.trim()
                    }
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {errors.documents && (
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertDescription>{errors.documents}</AlertDescription>
              </Alert>
            )}

            {/* Uploaded Documents List */}
            {formData.documents.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Documents ({formData.documents.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {formData.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{doc.title}</p>
                          <p className="text-xs text-gray-500">
                            {
                              documentTypes.find(
                                (type) => type.code === doc.type
                              )?.name
                            }{" "}
                            • {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating Supplier...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Supplier
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
