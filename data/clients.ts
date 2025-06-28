export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company?: string;
  type: "individual" | "corporate";
  createdAt: string;
}

export const clients: Client[] = [
  {
    id: "client-001",
    name: "Maria Santos",
    email: "maria.santos@example.com",
    phone: "+63 912 345 6789",
    address: "123 Main St, Makati City",
    type: "individual",
    createdAt: "2023-01-15",
  },
  {
    id: "client-002",
    name: "Acme Technologies",
    email: "events@acmetech.com",
    phone: "+63 923 456 7890",
    address: "456 Corporate Ave, Taguig City",
    company: "Acme Technologies Inc.",
    type: "corporate",
    createdAt: "2023-02-22",
  },
  {
    id: "client-003",
    name: "Carlos Garcia",
    email: "carlos.garcia@example.com",
    phone: "+63 934 567 8901",
    address: "789 Residential Blvd, Quezon City",
    type: "individual",
    createdAt: "2023-03-10",
  },
  {
    id: "client-004",
    name: "Elena Reyes",
    email: "elena.reyes@example.com",
    phone: "+63 945 678 9012",
    address: "321 Park Avenue, Pasig City",
    type: "individual",
    createdAt: "2023-04-05",
  },
  {
    id: "client-005",
    name: "Global Solutions Corp",
    email: "events@globalsolutions.com",
    phone: "+63 956 789 0123",
    address: "789 Business Center, Makati City",
    company: "Global Solutions Corporation",
    type: "corporate",
    createdAt: "2023-05-18",
  },
  {
    id: "client-006",
    name: "Miguel Tan",
    email: "miguel.tan@example.com",
    phone: "+63 967 890 1234",
    address: "567 Sunset Drive, Alabang",
    type: "individual",
    createdAt: "2023-06-30",
  },
  {
    id: "client-007",
    name: "Sofia Cruz",
    email: "sofia.cruz@example.com",
    phone: "+63 978 901 2345",
    address: "890 Mountain View, Antipolo City",
    type: "individual",
    createdAt: "2023-07-12",
  },
  {
    id: "client-008",
    name: "Tech Innovators Inc",
    email: "events@techinnovators.com",
    phone: "+63 989 012 3456",
    address: "123 Innovation Hub, BGC, Taguig City",
    company: "Tech Innovators Inc.",
    type: "corporate",
    createdAt: "2023-08-25",
  },
];
