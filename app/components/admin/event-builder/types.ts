import type { ReactNode } from "react";
import type { PackageComponent } from "@/data/packages";

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
  capacity: number;
  notes: string;
  venue: string;
  package: string;
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
  cashBondDamageDetails?: {
    description: string;
    amount: number;
    date: string;
  };
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
  status: string;
  priority: string;
  assignedTo: string;
  dependencies: string[];
}

export interface ClientDetailsStepProps {
  initialData: ClientData;
  onUpdate: (data: ClientData) => void;
  onNext: () => void;
}

export interface EventDetailsStepProps {
  initialData: EventDetails;
  onUpdate: (details: Partial<EventDetails>) => void;
  onNext: () => void;
}

export interface PackageSelectionProps {
  eventType: string;
  onSelect: (packageId: string) => void;
  initialPackageId?: string | null;
}

export interface ComponentCustomizationProps {
  components: PackageComponent[];
  onUpdate: (updatedComponents: PackageComponent[]) => void;
  onNext: () => void;
}

export interface TimelineStepProps {
  components: PackageComponent[];
  eventDate: string;
  onUpdate: (timeline: TimelineItem[]) => void;
  onNext: () => void;
}

export interface OrganizerSelectionProps {
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onNext: () => void;
}

export interface PaymentStepProps {
  totalBudget: number;
  onUpdate: (data: Partial<PaymentData>) => void;
  onComplete: () => void;
}
