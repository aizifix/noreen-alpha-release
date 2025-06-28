export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  notes: string;
  venue: string;
  package: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt: string;
}

export const bookings: Booking[] = [
  {
    id: "BK-001",
    clientId: "client-001",
    clientName: "Maria Santos",
    clientEmail: "maria.santos@example.com",
    clientPhone: "+63 912 345 6789",
    clientAddress: "123 Main St, Makati City",
    eventType: "wedding",
    eventDate: "2025-06-15",
    guestCount: 150,
    notes: "Prefers a garden venue",
    venue: "Garden Paradise Resort",
    package: "Gold Package",
    status: "confirmed",
    createdAt: "2023-05-10",
  },
  {
    id: "BK-002",
    clientId: "client-002",
    clientName: "Acme Technologies",
    clientEmail: "events@acmetech.com",
    clientPhone: "+63 923 456 7890",
    clientAddress: "456 Corporate Ave, Taguig City",
    eventType: "corporate",
    eventDate: "2025-05-22",
    guestCount: 80,
    notes: "Annual company meeting",
    venue: "Business Center Conference Room",
    package: "Executive Package",
    status: "confirmed",
    createdAt: "2023-06-15",
  },
  {
    id: "BK-003",
    clientId: "client-003",
    clientName: "Carlos Garcia",
    clientEmail: "carlos.garcia@example.com",
    clientPhone: "+63 934 567 8901",
    clientAddress: "789 Residential Blvd, Quezon City",
    eventType: "birthday",
    eventDate: "2025-07-10",
    guestCount: 50,
    notes: "50th birthday celebration",
    venue: "Rooftop Lounge",
    package: "Premium Package",
    status: "pending",
    createdAt: "2023-07-22",
  },
  {
    id: "BK-004",
    clientId: "client-004",
    clientName: "Elena Reyes",
    clientEmail: "elena.reyes@example.com",
    clientPhone: "+63 945 678 9012",
    clientAddress: "321 Park Avenue, Pasig City",
    eventType: "anniversary",
    eventDate: "2025-08-05",
    guestCount: 75,
    notes: "25th wedding anniversary",
    venue: "Beachfront Villa",
    package: "Silver Package",
    status: "confirmed",
    createdAt: "2023-08-10",
  },
  {
    id: "BK-005",
    clientId: "client-005",
    clientName: "Global Solutions Corp",
    clientEmail: "events@globalsolutions.com",
    clientPhone: "+63 956 789 0123",
    clientAddress: "789 Business Center, Makati City",
    eventType: "corporate",
    eventDate: "2025-09-15",
    guestCount: 120,
    notes: "Product launch event",
    venue: "Hotel Meeting Space",
    package: "Executive Package",
    status: "pending",
    createdAt: "2023-09-01",
  },
];
