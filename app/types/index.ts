export interface PackageComponent {
  id: string;
  name: string;
  price: number;
  category: string;
  included?: boolean;
  isCustom?: boolean;
  isVenueInclusion?: boolean;
  subComponents?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    option?: string;
    included?: boolean;
  }[];
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
  downPayment: number;
  paymentStatus: "pending" | "partial" | "paid";
  attachments: string[];
  paymentMethod: "cash" | "gcash" | "bank-transfer";
  referenceNumber: string;
  notes: string;
  balance: number;
  customPercentage: number;
  paymentType: "full" | "half" | "custom";
}

export interface TimelineData {
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

export interface Package {
  id: string;
  name: string;
  price: number;
  maxGuests: number;
  components: PackageComponent[];
}

export interface Organizer {
  id: string;
  name: string;
  role?: string;
  contact?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contact: string;
  email: string;
  address: string;
  services: string[];
  rating: number;
  reviews: number;
  isVerified: boolean;
  price: number;
  description: string;
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
  packages: VenuePackage[];
}

export interface VenuePackage {
  id: string;
  name: string;
  price: number;
  pricePerExcessPerson?: number;
  serviceCharge?: number;
  description: string;
  maxGuests: number;
  inclusions: string[];
  imageUrl?: string;
  menuItems?: string[];
  eventTypes?: string[];
}

export interface EventTheme {
  id: string;
  name: string;
  description: string;
  image: string;
  colors: string[];
  style: string;
  category: string;
}
