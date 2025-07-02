"use client";

import React, { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  X,
  FileText,
  Image,
  Video,
  Music,
  FileIcon,
  Download,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FileAttachment {
  file: File;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedPath?: string;
  uploadedAt?: string;
}

interface EnhancedEventDetails {
  title?: string;
  type?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  notes?: string;
  venue?: string;
  package?: string;
  theme?: string;
  description?: string;
  isRecurring?: boolean;
  recurrenceRule?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    endDate?: string;
    endAfter?: number;
  };
}

interface AttachmentsStepProps {
  eventDetails: EnhancedEventDetails;
  attachments: FileAttachment[];
  uploadingFiles: boolean;
  clientSignature: string;
  onEventDetailsUpdate: (details: Partial<EnhancedEventDetails>) => void;
  onFileUpload: (files: File[]) => Promise<void>;
  onRemoveAttachment: (index: number) => void;
  onSignatureUpdate: (signature: string) => void;
  formatFileSize: (bytes: number) => string;
}

const AttachmentsStep: React.FC<AttachmentsStepProps> = ({
  eventDetails,
  attachments,
  uploadingFiles,
  clientSignature,
  onEventDetailsUpdate,
  onFileUpload,
  onRemoveAttachment,
  onSignatureUpdate,
  formatFileSize,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const getFileIcon = (fileName: string, fileType: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (
      fileType.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")
    ) {
      return <Image className="w-6 h-6 text-blue-500" />;
    }
    if (
      fileType.startsWith("video/") ||
      ["mp4", "avi", "mov", "wmv", "flv", "webm"].includes(extension || "")
    ) {
      return <Video className="w-6 h-6 text-purple-500" />;
    }
    if (
      fileType.startsWith("audio/") ||
      ["mp3", "wav", "flac", "aac", "ogg"].includes(extension || "")
    ) {
      return <Music className="w-6 h-6 text-green-500" />;
    }
    if (["pdf", "doc", "docx", "txt", "rtf"].includes(extension || "")) {
      return <FileText className="w-6 h-6 text-red-500" />;
    }
    return <FileIcon className="w-6 h-6 text-gray-500" />;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFileUpload(filesArray);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const filesArray = Array.from(e.target.files);
      onFileUpload(filesArray);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Event Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Theme */}
          <div>
            <Label htmlFor="event-theme">Event Theme</Label>
            <Input
              id="event-theme"
              placeholder="e.g., Rustic Garden, Modern Minimalist, Vintage Romance"
              value={eventDetails.theme || ""}
              onChange={(e) => onEventDetailsUpdate({ theme: e.target.value })}
            />
          </div>

          {/* Event Description */}
          <div>
            <Label htmlFor="event-description">Event Description</Label>
            <Textarea
              id="event-description"
              placeholder="Detailed description of the event, special requirements, or important notes..."
              value={eventDetails.description || ""}
              onChange={(e) =>
                onEventDetailsUpdate({ description: e.target.value })
              }
              rows={4}
            />
          </div>

          {/* Recurring Event Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-recurring"
                checked={eventDetails.isRecurring || false}
                onCheckedChange={(checked) =>
                  onEventDetailsUpdate({ isRecurring: checked as boolean })
                }
              />
              <Label htmlFor="is-recurring">This is a recurring event</Label>
            </div>

            {eventDetails.isRecurring && (
              <div className="ml-6 space-y-3 p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={
                        eventDetails.recurrenceRule?.frequency || "monthly"
                      }
                      onValueChange={(value) =>
                        onEventDetailsUpdate({
                          recurrenceRule: {
                            ...eventDetails.recurrenceRule,
                            frequency: value as
                              | "daily"
                              | "weekly"
                              | "monthly"
                              | "yearly",
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="interval">Every</Label>
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      value={eventDetails.recurrenceRule?.interval || 1}
                      onChange={(e) =>
                        onEventDetailsUpdate({
                          recurrenceRule: {
                            ...eventDetails.recurrenceRule,
                            interval: parseInt(e.target.value) || 1,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="end-date">End Date (Optional)</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={eventDetails.recurrenceRule?.endDate || ""}
                    onChange={(e) =>
                      onEventDetailsUpdate({
                        recurrenceRule: {
                          ...eventDetails.recurrenceRule,
                          endDate: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Attachments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Event Attachments</CardTitle>
          <p className="text-sm text-gray-600">
            Upload contracts, mood boards, reference images, or other important
            documents for this event.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop files here or click to upload
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports images, documents, videos (max 10MB per file)
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleUploadClick}
              disabled={uploadingFiles}
            >
              {uploadingFiles ? "Uploading..." : "Choose Files"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />
          </div>

          {/* Uploaded Files List */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Uploaded Files</h4>
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      {getFileIcon(attachment.fileName, attachment.fileType)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {attachment.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.fileSize)} • Uploaded{" "}
                          {attachment.uploadedAt
                            ? new Date(attachment.uploadedAt).toLocaleString()
                            : "just now"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {attachment.uploadedPath && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(attachment.uploadedPath, "_blank")
                          }
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Guidelines */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 mb-1">
                  Upload Guidelines:
                </p>
                <ul className="text-blue-700 space-y-1">
                  <li>• Maximum file size: 10MB per file</li>
                  <li>
                    • Supported formats: Images, Documents (PDF, DOC), Videos,
                    Audio
                  </li>
                  <li>
                    • Files will be stored securely and accessible by authorized
                    personnel only
                  </li>
                  <li>• You can upload multiple files at once</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Signature Section */}
      <Card>
        <CardHeader>
          <CardTitle>Client Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="client-signature">
              Client Digital Signature/Approval
            </Label>
            <Textarea
              id="client-signature"
              placeholder="Client name and approval confirmation, or digital signature reference..."
              value={clientSignature}
              onChange={(e) => onSignatureUpdate(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              This serves as confirmation that the client has reviewed and
              approved the event details.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttachmentsStep;
