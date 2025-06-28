import { type VenuePackage } from "./index";

export interface PackageComponent {
  id: string;
  name: string;
  price: number;
  category: string;
  included?: boolean;
  isCustom?: boolean;
  originalId?: number | string;
  subComponents?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    option?: string;
  }[];
  isExpanded?: boolean;
}

export interface EventDetails {
  title: string;
  type: string;
  date: string;
  capacity: number;
  notes?: string;
  venue?: string;
  package?: string;
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  packages: VenuePackage[];
  contactInfo?: {
    address?: string;
    phone?: string[];
    mobile?: string[];
    email?: string;
    website?: string;
  };
}

export interface EventTheme {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  colors: string[];
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contactInfo: {
    phone?: string;
    email?: string;
    address?: string;
  };
}

export interface TimelineData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  componentId?: string;
  notes?: string;
  componentName?: string;
  category?: string;
  date?: string;
  location?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  dependencies?: string[];
}
