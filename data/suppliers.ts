export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  services: string[];
  categories: string[];
  notes: string;
  isPreferred: boolean;
  coverPhoto?: string;
  category: string; // Primary category
  rating: number; // Rating out of 5
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
}

export const suppliers: Supplier[] = [
  {
    id: "sup-001",
    name: "Elegant Decor Co.",
    contactPerson: "Sarah Johnson",
    phone: "+1 (555) 123-4567",
    email: "sarah@elegantdecor.com",
    address: "123 Main St, Anytown, CA 94321",
    services: [
      "Wedding Decorations",
      "Event Styling",
      "Floral Arrangements",
      "Lighting Setup",
    ],
    categories: ["decor"],
    notes: "Specializes in luxury wedding decorations. Requires 50% deposit.",
    isPreferred: true,
    coverPhoto:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sunrise-nature-background-sky-morning-landscape-summer-beautiful-blue-heaven-free-photo.jpg-kAbaOdwTxaim0vaLoIzBfK42EC3COO.jpeg",
    category: "decor",
    rating: 4.8,
    contact: {
      phone: "+1 (555) 123-4567",
      email: "sarah@elegantdecor.com",
      website: "www.elegantdecor.com",
    },
  },
  {
    id: "sup-002",
    name: "Delicious Catering",
    contactPerson: "Michael Chen",
    phone: "+1 (555) 987-6543",
    email: "michael@deliciouscatering.com",
    address: "456 Oak Ave, Somewhere, CA 94322",
    services: [
      "Full-Service Catering",
      "Buffet Service",
      "Cocktail Reception",
      "Custom Menus",
    ],
    categories: ["catering"],
    notes: "Farm-to-table approach. Can accommodate dietary restrictions.",
    isPreferred: true,
    coverPhoto: "/placeholder.svg?height=170&width=340",
    category: "catering",
    rating: 4.9,
    contact: {
      phone: "+1 (555) 987-6543",
      email: "michael@deliciouscatering.com",
      website: "www.deliciouscatering.com",
    },
  },
  {
    id: "sup-003",
    name: "Capture Moments Photography",
    contactPerson: "Jessica Williams",
    phone: "+1 (555) 456-7890",
    email: "jessica@capturemoments.com",
    address: "789 Pine St, Elsewhere, CA 94323",
    services: [
      "Wedding Photography",
      "Event Videography",
      "Photo Booths",
      "Same-Day Edits",
    ],
    categories: ["media"],
    notes:
      "Award-winning photographer. Books up quickly during wedding season.",
    isPreferred: false,
    coverPhoto:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sunset-5314319_1280.jpg-d0kmHsqPVOXEiCNYjDAzULp8EvZIGf.jpeg",
    category: "media",
    rating: 4.7,
    contact: {
      phone: "+1 (555) 456-7890",
      email: "jessica@capturemoments.com",
      website: "www.capturemoments.com",
    },
  },
  {
    id: "sup-004",
    name: "Sound & Lights Entertainment",
    contactPerson: "David Rodriguez",
    phone: "+1 (555) 234-5678",
    email: "david@soundlights.com",
    address: "101 Elm St, Nowhere, CA 94324",
    services: [
      "DJ Services",
      "Live Bands",
      "Sound Equipment Rental",
      "Lighting Effects",
    ],
    categories: ["entertainment"],
    notes: "Has worked with us for over 5 years. Very reliable.",
    isPreferred: true,
    coverPhoto:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/635762059672496245-WomenBridge-tYxmi7s9oJFcW2YuAqG4te1IqqFNH7.webp",
    category: "entertainment",
    rating: 4.6,
    contact: {
      phone: "+1 (555) 234-5678",
      email: "david@soundlights.com",
      website: "www.soundlights.com",
    },
  },
  {
    id: "sup-005",
    name: "Perfect Fit Attire",
    contactPerson: "Emma Thompson",
    phone: "+1 (555) 345-6789",
    email: "emma@perfectfit.com",
    address: "202 Cedar Ave, Anyplace, CA 94325",
    services: [
      "Wedding Dresses",
      "Tuxedo Rentals",
      "Alterations",
      "Accessories",
    ],
    categories: ["attire"],
    notes:
      "Offers special discounts for our clients. Schedule fittings 2 months in advance.",
    isPreferred: false,
    coverPhoto: "/placeholder.svg?height=170&width=340",
    category: "attire",
    rating: 4.5,
    contact: {
      phone: "+1 (555) 345-6789",
      email: "emma@perfectfit.com",
      website: "www.perfectfit.com",
    },
  },
  {
    id: "sup-006",
    name: "Grand Ballroom",
    contactPerson: "Robert Kim",
    phone: "+1 (555) 567-8901",
    email: "robert@grandballroom.com",
    address: "303 Maple Dr, Somewhere Else, CA 94326",
    services: [
      "Wedding Venue",
      "Reception Hall",
      "Outdoor Ceremony Space",
      "In-house Coordination",
    ],
    categories: ["venue"],
    notes: "Capacity: 300 guests. Includes tables, chairs, and basic linens.",
    isPreferred: true,
    coverPhoto: "/placeholder.svg?height=170&width=340",
    category: "venue",
    rating: 4.9,
    contact: {
      phone: "+1 (555) 567-8901",
      email: "robert@grandballroom.com",
      website: "www.grandballroom.com",
    },
  },
];
