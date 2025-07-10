import type { ReactNode } from "react";
import type { PackageComponent as DataPackageComponent } from "@/data/packages";
import type { Dispatch, SetStateAction } from "react";

// Base package component interface that both types extend
export interface BasePackageComponent {
  id: string;
  name: string;
  category: string;
  price: number;
  included?: boolean;
  isCustom?: boolean;
  isRemovable?: boolean;
  description?: string;
  subComponents?: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// Extend the base interface for our specific needs
export interface PackageComponent extends BasePackageComponent {
  isExpanded?: boolean;
  isVenueInclusion?: boolean;
  isRemovable?: boolean;
  originalId?: string;
  category: string;
  description?: string;
  subComponents?: Array<{
    id: string;
    name: string;
    price: number;
    description?: string;
  }>;
}

export interface TimelineItem {
  id: string;
  componentId: string;
  componentName: string;
  category: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  supplierId: string;
  supplierName: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  assignedTo: string;
  dependencies: string[];
}

export interface Step {
  id: string;
  title: string;
  description: string;
  component: ReactNode;
}

export interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface EventDetails {
  title: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string;
  venue: string;
  package: string;
  hasConflicts?: boolean;
  // Booking metadata for enhanced data flow
  bookingReference?: string;
  venueId?: string;
  theme?: string;
}

// Add payment attachment types
export interface PaymentAttachment {
  original_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  description: string;
  proof_type: string;
  uploaded_at: string;
}

export interface PaymentScheduleItem {
  id?: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "overdue";
  description?: string;
  proof_files?: PaymentAttachment[];
}

export interface EventAttachment {
  original_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  description: string;
  attachment_type: string;
  uploaded_at: string;
}

export interface PaymentData {
  total: number;
  paymentType: "full" | "half" | "custom";
  downPayment: number;
  balance: number;
  customPercentage: number;
  downPaymentMethod: "cash" | "gcash" | "bank-transfer" | "on-site";
  referenceNumber: string;
  notes: string;
  cashBondRequired: boolean;
  cashBondStatus: "pending" | "paid" | "refunded" | "claimed";
  scheduleTypeId?: number; // Payment schedule type ID for backend
  cashBondDamageDetails?: {
    description: string;
    amount: number;
    date: string;
  };
  // Add missing properties
  paymentAttachments?: PaymentAttachment[];
  paymentSchedule?: PaymentScheduleItem[];
}

export interface ClientDetailsStepProps {
  initialData: ClientData;
  onUpdate: (data: ClientData) => void;
  onNext: (eventDetails?: EventDetails) => void;
}

export interface EventDetailsStepProps {
  initialData: EventDetails;
  onUpdate: (details: Partial<EventDetails>) => void;
  onNext: () => void;
}

export interface PackageSelectionProps {
  eventType: string;
  onSelect: (packageId: string) => void | Promise<void>;
  initialPackageId?: string | null;
}

export interface PackageSelectionFallbackProps {
  onSelect: (packageId: string) => void | Promise<void>;
  initialPackageId: string | null;
}

export interface ComponentCustomizationProps {
  components: DataPackageComponent[];
  onUpdate: (updatedComponents: DataPackageComponent[]) => void;
  onNext: () => void;
}

export interface TimelineStepProps {
  data: TimelineItem[];
  eventDate: string;
  components: DataPackageComponent[];
  suppliers: Record<string, { supplierId: string; supplierName: string }>;
  updateData: (data: TimelineItem[]) => void;
  onNext?: () => void;
}

export interface OrganizerSelectionProps {
  selectedIds: string[];
  onSelect: Dispatch<SetStateAction<string[]>>;
  onNext: () => void;
}

export interface PaymentStepProps {
  totalBudget: number;
  onUpdate: (data: Partial<PaymentData>) => void;
  onComplete: () => Promise<void>;
}
