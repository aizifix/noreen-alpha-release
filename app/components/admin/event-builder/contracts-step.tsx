"use client";

import type React from "react";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  File,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { EventDetails } from "@/app/types/index";

interface ContractsStepProps {
  contractDetails: {
    contractType: string;
    attachments: string[];
    additionalTerms: string;
    clientSignatureRequired: boolean;
    adminSignatureRequired: boolean;
    eventSpecificForms: { id: string; name: string; completed: boolean }[];
  };
  setContractDetails: React.Dispatch<
    React.SetStateAction<{
      contractType: string;
      attachments: string[];
      additionalTerms: string;
      clientSignatureRequired: boolean;
      adminSignatureRequired: boolean;
      eventSpecificForms: { id: string; name: string; completed: boolean }[];
    }>
  >;
  eventDetails: EventDetails;
  onNext: () => void;
  onPrevious: () => void;
}

export function ContractsStep({
  contractDetails,
  setContractDetails,
  eventDetails,
  onNext,
  onPrevious,
}: ContractsStepProps) {
  const [fileInputKey, setFileInputKey] = useState<number>(0);
  const [newFormName, setNewFormName] = useState("");

  // Event-specific form templates based on event type
  const eventSpecificFormTemplates = {
    wedding: [
      { id: "wedding-checklist", name: "Wedding Day Checklist" },
      { id: "wedding-timeline", name: "Wedding Timeline" },
      { id: "wedding-guest", name: "Guest Information Form" },
      { id: "wedding-vendor", name: "Vendor Contact Sheet" },
    ],
    birthday: [
      { id: "birthday-checklist", name: "Birthday Event Checklist" },
      { id: "birthday-guest", name: "Guest Information Form" },
      { id: "birthday-menu", name: "Menu Selection Form" },
    ],
    corporate: [
      { id: "corporate-checklist", name: "Corporate Event Checklist" },
      { id: "corporate-av", name: "AV Requirements Form" },
      { id: "corporate-schedule", name: "Event Schedule" },
      { id: "corporate-attendees", name: "Attendee Information" },
    ],
  };

  const handleContractTypeChange = (value: string) => {
    setContractDetails((prev) => ({
      ...prev,
      contractType: value,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments = [...contractDetails.attachments];
    for (let i = 0; i < files.length; i++) {
      newAttachments.push(files[i].name);
    }

    setContractDetails((prev) => ({
      ...prev,
      attachments: newAttachments,
    }));

    // Reset the file input
    setFileInputKey((prev) => prev + 1);
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = [...contractDetails.attachments];
    newAttachments.splice(index, 1);

    setContractDetails((prev) => ({
      ...prev,
      attachments: newAttachments,
    }));
  };

  const handleAdditionalTermsChange = (value: string) => {
    setContractDetails((prev) => ({
      ...prev,
      additionalTerms: value,
    }));
  };

  const handleToggleForm = (formId: string, checked: boolean) => {
    setContractDetails((prev) => {
      const updatedForms = [...prev.eventSpecificForms];
      const formIndex = updatedForms.findIndex((form) => form.id === formId);

      if (formIndex >= 0) {
        // Update existing form
        updatedForms[formIndex] = {
          ...updatedForms[formIndex],
          completed: checked,
        };
      } else if (checked) {
        // Add new form
        const formTemplate = eventSpecificFormTemplates[
          eventDetails.type as keyof typeof eventSpecificFormTemplates
        ]?.find((template) => template.id === formId);

        if (formTemplate) {
          updatedForms.push({
            id: formId,
            name: formTemplate.name,
            completed: true,
          });
        }
      }

      return {
        ...prev,
        eventSpecificForms: updatedForms,
      };
    });
  };

  const handleAddCustomForm = () => {
    if (!newFormName.trim()) {
      toast({
        title: "Form name required",
        description: "Please enter a name for the custom form",
        variant: "destructive",
      });
      return;
    }

    const customFormId = `custom-${Date.now()}`;

    setContractDetails((prev) => ({
      ...prev,
      eventSpecificForms: [
        ...prev.eventSpecificForms,
        {
          id: customFormId,
          name: newFormName,
          completed: false,
        },
      ],
    }));

    setNewFormName("");

    toast({
      title: "Custom form added",
      description: `${newFormName} has been added to the event forms`,
    });
  };

  const isFormSelected = (formId: string) => {
    return contractDetails.eventSpecificForms.some(
      (form) => form.id === formId
    );
  };

  const validateForm = () => {
    if (
      contractDetails.contractType === "custom" &&
      contractDetails.attachments.length === 0
    ) {
      toast({
        title: "Contract attachment required",
        description: "Please upload at least one contract document",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contracts & Forms</CardTitle>
        <CardDescription>
          Manage contracts and event-specific forms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="contract-type">Contract Type</Label>
          <Select
            value={contractDetails.contractType}
            onValueChange={handleContractTypeChange}
          >
            <SelectTrigger id="contract-type">
              <SelectValue placeholder="Select contract type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard Event Contract</SelectItem>
              <SelectItem value="premium">Premium Event Contract</SelectItem>
              <SelectItem value="corporate">
                Corporate Event Contract
              </SelectItem>
              <SelectItem value="custom">Custom Contract</SelectItem>
            </SelectContent>
          </Select>

          {contractDetails.contractType === "standard" && (
            <div className="rounded-md border p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Standard Event Contract</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Our standard contract covers all basic terms and conditions for
                event planning services, including payment schedules,
                cancellation policies, and service guarantees.
              </p>
              <Button variant="outline" size="sm">
                <File className="mr-2 h-4 w-4" />
                Preview Contract
              </Button>
            </div>
          )}

          {contractDetails.contractType === "premium" && (
            <div className="rounded-md border p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Premium Event Contract</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Our premium contract includes all standard terms plus additional
                provisions for premium services, extended liability coverage,
                and enhanced cancellation terms.
              </p>
              <Button variant="outline" size="sm">
                <File className="mr-2 h-4 w-4" />
                Preview Contract
              </Button>
            </div>
          )}

          {contractDetails.contractType === "corporate" && (
            <div className="rounded-md border p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Corporate Event Contract</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Specifically designed for corporate clients, this contract
                includes terms for corporate billing, intellectual property
                rights, and confidentiality clauses.
              </p>
              <Button variant="outline" size="sm">
                <File className="mr-2 h-4 w-4" />
                Preview Contract
              </Button>
            </div>
          )}

          {contractDetails.contractType === "custom" && (
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="contract-upload">Upload Custom Contract</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="contract-upload"
                    type="file"
                    multiple
                    key={fileInputKey}
                    onChange={handleFileUpload}
                  />
                </div>
              </div>

              {contractDetails.attachments.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Documents</Label>
                  <div className="space-y-2">
                    {contractDetails.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate">{attachment}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAttachment(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="additional-terms">
            Additional Terms & Conditions
          </Label>
          <Textarea
            id="additional-terms"
            placeholder="Enter any additional terms or special conditions for this event"
            value={contractDetails.additionalTerms}
            onChange={(e) => handleAdditionalTermsChange(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Signature Requirements</Label>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="client-signature"
                checked={contractDetails.clientSignatureRequired}
                onCheckedChange={(checked: boolean) =>
                  setContractDetails((prev) => ({
                    ...prev,
                    clientSignatureRequired: checked,
                  }))
                }
              />
              <Label htmlFor="client-signature">Require client signature</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="admin-signature"
                checked={contractDetails.adminSignatureRequired}
                onCheckedChange={(checked: boolean) =>
                  setContractDetails((prev) => ({
                    ...prev,
                    adminSignatureRequired: checked,
                  }))
                }
              />
              <Label htmlFor="admin-signature">Require admin signature</Label>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Event-Specific Forms</Label>
            <Badge variant="outline" className="font-normal">
              {contractDetails.eventSpecificForms.length} Selected
            </Badge>
          </div>

          <ScrollArea className="h-[200px] border rounded-md p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recommended Forms</h4>
                {eventSpecificFormTemplates[
                  eventDetails.type as keyof typeof eventSpecificFormTemplates
                ]?.map((form) => (
                  <div key={form.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={form.id}
                      checked={isFormSelected(form.id)}
                      onCheckedChange={(checked: boolean) =>
                        handleToggleForm(form.id, checked)
                      }
                    />
                    <Label htmlFor={form.id} className="text-sm">
                      {form.name}
                    </Label>
                  </div>
                ))}
              </div>

              {contractDetails.eventSpecificForms.some((form) =>
                form.id.startsWith("custom-")
              ) && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-sm font-medium">Custom Forms</h4>
                  {contractDetails.eventSpecificForms
                    .filter((form) => form.id.startsWith("custom-"))
                    .map((form) => (
                      <div
                        key={form.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={form.id}
                          checked={true}
                          onCheckedChange={(checked: boolean) => {
                            if (!checked) {
                              setContractDetails((prev) => ({
                                ...prev,
                                eventSpecificForms:
                                  prev.eventSpecificForms.filter(
                                    (f) => f.id !== form.id
                                  ),
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={form.id} className="text-sm">
                          {form.name}
                        </Label>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="custom-form">Add Custom Form</Label>
              <Input
                id="custom-form"
                placeholder="Enter form name"
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleAddCustomForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Form
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={handleNext}>
          Next Step
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
