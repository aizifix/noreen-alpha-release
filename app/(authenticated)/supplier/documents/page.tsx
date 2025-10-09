"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  FileCheck,
  Shield,
} from "lucide-react";

interface Document {
  document_id: number;
  document_type: string;
  document_title: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: number;
  is_verified: boolean;
  verification_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const documentTypes = [
  { value: "dti", label: "DTI Registration", icon: FileCheck },
  { value: "business_permit", label: "Business Permit", icon: Shield },
  { value: "contract", label: "Contract/Agreement", icon: FileText },
  { value: "portfolio", label: "Portfolio/Samples", icon: Eye },
  { value: "certification", label: "Certification", icon: CheckCircle },
  { value: "other", label: "Other Documents", icon: FileText },
];

const verificationStatusColors = {
  verified: "text-green-600 bg-green-50 border-green-200",
  pending: "text-yellow-600 bg-yellow-50 border-yellow-200",
  rejected: "text-red-600 bg-red-50 border-red-200",
};

export default function SupplierDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    document_type: "",
    document_title: "",
  });

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [documents, typeFilter, statusFilter, searchTerm]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const userId = 1; // This should come from authentication

      const response = await axios.get(
        `${endpoints.supplier}?operation=getDocuments&user_id=${userId}`
      );
      const data = response.data;

      if (data.status === "success") {
        setDocuments(data.documents);
      } else {
        console.error("Failed to fetch documents:", data.message);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = documents;

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((doc) => doc.document_type === typeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "verified") {
        filtered = filtered.filter((doc) => doc.is_verified);
      } else if (statusFilter === "pending") {
        filtered = filtered.filter((doc) => !doc.is_verified && doc.is_active);
      } else if (statusFilter === "rejected") {
        filtered = filtered.filter((doc) => !doc.is_verified && !doc.is_active);
      }
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.document_title.toLowerCase().includes(term) ||
          doc.document_type.toLowerCase().includes(term) ||
          doc.file_name.toLowerCase().includes(term)
      );
    }

    setFilteredDocuments(filtered);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        alert("Invalid file type. Please upload PDF, JPG, PNG, or DOC files.");
        return;
      }

      setSelectedFile(file);
      // Auto-generate title from filename
      if (!uploadForm.document_title) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        setUploadForm((prev) => ({
          ...prev,
          document_title: nameWithoutExtension,
        }));
      }
    }
  };

  const uploadDocument = async () => {
    if (
      !selectedFile ||
      !uploadForm.document_type ||
      !uploadForm.document_title
    ) {
      alert("Please fill in all required fields and select a file");
      return;
    }

    try {
      setUploading(true);
      const userId = 1; // This should come from authentication

      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("document_type", uploadForm.document_type);
      formData.append("title", uploadForm.document_title);

      const response = await axios.post(
        `${endpoints.supplier}?operation=uploadDocument&user_id=${userId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const data = response.data;

      if (data.status === "success") {
        // Refresh documents list
        await fetchDocuments();

        // Reset form
        setSelectedFile(null);
        setUploadForm({ document_type: "", document_title: "" });
        setShowUploadModal(false);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        alert("Failed to upload document: " + data.message);
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Error uploading document");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDocumentTypeLabel = (type: string) => {
    const docType = documentTypes.find((dt) => dt.value === type);
    return docType ? docType.label : type;
  };

  const getVerificationStatus = (doc: Document) => {
    if (doc.is_verified) return "verified";
    if (doc.is_active) return "pending";
    return "rejected";
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return CheckCircle;
      case "pending":
        return Clock;
      case "rejected":
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  const downloadDocument = (doc: Document) => {
    // In a real implementation, this would handle secure file downloads
    window.open(`${doc.file_path}`, "_blank");
  };

  const getDocumentCounts = () => {
    return {
      all: documents.length,
      verified: documents.filter((d) => d.is_verified).length,
      pending: documents.filter((d) => !d.is_verified && d.is_active).length,
      rejected: documents.filter((d) => !d.is_verified && !d.is_active).length,
    };
  };

  const documentCounts = getDocumentCounts();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Document Management
            </h1>
            <p className="text-gray-600">
              Upload and manage your business documents
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            statusFilter === "all"
              ? "border-brand-500 bg-brand-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => setStatusFilter("all")}
        >
          <div className="text-2xl font-bold text-gray-900">
            {documentCounts.all}
          </div>
          <div className="text-sm text-gray-600">Total Documents</div>
        </div>

        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            statusFilter === "verified"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => setStatusFilter("verified")}
        >
          <div className="text-2xl font-bold text-green-600">
            {documentCounts.verified}
          </div>
          <div className="text-sm text-gray-600">Verified</div>
        </div>

        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            statusFilter === "pending"
              ? "border-yellow-500 bg-yellow-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => setStatusFilter("pending")}
        >
          <div className="text-2xl font-bold text-yellow-600">
            {documentCounts.pending}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>

        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            statusFilter === "rejected"
              ? "border-red-500 bg-red-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => setStatusFilter("rejected")}
        >
          <div className="text-2xl font-bold text-red-600">
            {documentCounts.rejected}
          </div>
          <div className="text-sm text-gray-600">Rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No documents found
            </h3>
            <p className="text-gray-600 mb-4">
              {typeFilter !== "all" || statusFilter !== "all" || searchTerm
                ? "Try adjusting your filters to see more results."
                : "Upload your first document to get started."}
            </p>
            {filteredDocuments.length === 0 && documents.length === 0 && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload Document
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => {
                  const status = getVerificationStatus(doc);
                  const StatusIcon = getVerificationStatusIcon(status);

                  return (
                    <tr key={doc.document_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <FileText className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {doc.document_title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {doc.file_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getDocumentTypeLabel(doc.document_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                              verificationStatusColors[
                                status as keyof typeof verificationStatusColors
                              ]
                            }`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                          {doc.verification_notes && (
                            <div className="group relative">
                              <AlertCircle className="h-4 w-4 text-gray-400 cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 w-48">
                                {doc.verification_notes}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          {formatDate(doc.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => downloadDocument(doc)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => downloadDocument(doc)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Upload Document
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Upload business documents for verification
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  value={uploadForm.document_type}
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      document_type: e.target.value,
                    }))
                  }
                >
                  <option value="">Select document type</option>
                  {documentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Enter document title"
                  value={uploadForm.document_title}
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      document_title: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File *
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-6 w-6 text-brand-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(selectedFile.size)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to select a file
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, JPG, PNG, DOC files (max 10MB)
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileSelect}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Document Requirements:</p>
                    <ul className="text-xs space-y-1">
                      <li>• Files must be clear and readable</li>
                      <li>• Maximum file size: 10MB</li>
                      <li>• Accepted formats: PDF, JPG, PNG, DOC</li>
                      <li>• Documents will be reviewed within 24-48 hours</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setUploadForm({ document_type: "", document_title: "" });
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={uploadDocument}
                className="flex-1 px-4 py-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={
                  uploading ||
                  !selectedFile ||
                  !uploadForm.document_type ||
                  !uploadForm.document_title
                }
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Document
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
