export type ComponentCategory =
  | "coordination"
  | "venue"
  | "venue_fee"
  | "attire"
  | "decor"
  | "media"
  | "extras"
  | "hotel"
  | "food"
  | "services"
  | "photography"
  | "beauty"
  | "catering"
  | "decoration"
  | "entertainment"
  | "equipment";

export interface VenueChoice {
  id: string;
  name: string;
  price: number;
  description: string;
  maxGuests: number;
  venueId?: string;
}

export interface PackageComponent {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ComponentCategory;
  isRemovable: boolean;
  included?: boolean;
  isCustom?: boolean;
  isVenueInclusion?: boolean;
  venueOptions?: VenueChoice[];
  subComponents?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    option?: string;
    included?: boolean;
  }[];
  isExpanded?: boolean;
  supplierId?: string;
  supplierName?: string;
  inclusions?: string[];
}

export interface EventPackage {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  maxGuests: number;
  eventType: string;
  imageUrl: string;
  components: PackageComponent[];
}

export const eventPackages: EventPackage[] = [
  {
    id: "pkg-001",
    name: "Gold Wedding Package",
    description:
      "Our premium wedding package with all the luxuries for your special day",
    basePrice: 250000,
    maxGuests: 200,
    eventType: "wedding",
    imageUrl: "/placeholder.svg?height=200&width=400",
    components: [
      {
        id: "comp-001",
        name: "Wedding Coordination",
        description: "Full wedding planning and day-of coordination",
        price: 50000,
        category: "coordination",
        isRemovable: false,
      },
      {
        id: "comp-002",
        name: "Catering (200 pax)",
        description: "Premium 5-course meal with dessert station",
        price: 100000,
        category: "venue",
        isRemovable: false,
        subComponents: [
          {
            id: "buffet",
            name: "Buffet",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "drinks",
            name: "Drinks",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "dessert",
            name: "Dessert Bar",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-003",
        name: "Bridal Gown",
        description: "Custom-designed bridal gown",
        price: 30000,
        category: "attire",
        isRemovable: true,
      },
      {
        id: "comp-004",
        name: "Groom's Attire",
        description: "Custom-tailored suit for the groom",
        price: 15000,
        category: "attire",
        isRemovable: true,
      },
      {
        id: "comp-005",
        name: "Floral Arrangements",
        description: "Premium floral arrangements for ceremony and reception",
        price: 25000,
        category: "decor",
        isRemovable: true,
        subComponents: [
          {
            id: "bouquets",
            name: "Bouquets",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "centerpieces",
            name: "Table Centerpieces",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "arch",
            name: "Ceremony Arch",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-006",
        name: "Photography",
        description: "Professional photography coverage (10 hours)",
        price: 35000,
        category: "media",
        isRemovable: true,
        subComponents: [
          {
            id: "photo-drone",
            name: "Drone Coverage",
            quantity: 1,
            unitPrice: 5000,
            included: true,
          },
          {
            id: "photo-photobooth",
            name: "Photobooth",
            quantity: 1,
            unitPrice: 3000,
            included: true,
          },
          {
            id: "photo-prints",
            name: "Printed Album",
            quantity: 1,
            unitPrice: 2000,
            included: true,
          },
          {
            id: "photo-gallery",
            name: "Online Gallery",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "photo-sde",
            name: "Same-day Edit",
            quantity: 1,
            unitPrice: 4000,
            included: false,
          },
        ],
      },
      {
        id: "comp-007",
        name: "Videography",
        description: "Professional video coverage with same-day edit",
        price: 40000,
        category: "media",
        isRemovable: true,
      },
      {
        id: "comp-008",
        name: "Bridal Car",
        description: "Luxury car rental for the couple",
        price: 15000,
        category: "extras",
        isRemovable: true,
      },
      {
        id: "comp-009",
        name: "Honeymoon Suite",
        description: "One night stay in a luxury hotel suite",
        price: 20000,
        category: "hotel",
        isRemovable: true,
      },
    ],
  },
  {
    id: "pkg-002",
    name: "Silver Wedding Package",
    description: "A beautiful wedding package with essential services",
    basePrice: 150000,
    maxGuests: 150,
    eventType: "wedding",
    imageUrl: "/placeholder.svg?height=200&width=400",
    components: [
      {
        id: "comp-010",
        name: "Wedding Coordination",
        description: "Day-of coordination services",
        price: 30000,
        category: "coordination",
        isRemovable: false,
      },
      {
        id: "comp-011",
        name: "Catering (150 pax)",
        description: "4-course meal with dessert",
        price: 75000,
        category: "venue",
        isRemovable: false,
        subComponents: [
          {
            id: "buffet",
            name: "Buffet",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "drinks",
            name: "Drinks",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "dessert",
            name: "Dessert Bar",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-012",
        name: "Bridal Gown",
        description: "Ready-to-wear bridal gown",
        price: 20000,
        category: "attire",
        isRemovable: true,
      },
      {
        id: "comp-013",
        name: "Groom's Attire",
        description: "Ready-to-wear suit for the groom",
        price: 10000,
        category: "attire",
        isRemovable: true,
      },
      {
        id: "comp-014",
        name: "Floral Arrangements",
        description: "Standard floral arrangements",
        price: 15000,
        category: "decor",
        isRemovable: true,
        subComponents: [
          {
            id: "bouquets",
            name: "Bouquets",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "centerpieces",
            name: "Table Centerpieces",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-015",
        name: "Photography",
        description: "Professional photography coverage (8 hours)",
        price: 25000,
        category: "media",
        isRemovable: true,
        subComponents: [
          {
            id: "photo-drone",
            name: "Drone Coverage",
            quantity: 1,
            unitPrice: 4000,
            included: false,
          },
          {
            id: "photo-photobooth",
            name: "Photobooth",
            quantity: 1,
            unitPrice: 2500,
            included: true,
          },
          {
            id: "photo-prints",
            name: "Printed Album",
            quantity: 1,
            unitPrice: 1500,
            included: true,
          },
          {
            id: "photo-gallery",
            name: "Online Gallery",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "photo-sde",
            name: "Same-day Edit",
            quantity: 1,
            unitPrice: 3000,
            included: false,
          },
        ],
      },
      {
        id: "comp-016",
        name: "Videography",
        description: "Professional video coverage",
        price: 25000,
        category: "media",
        isRemovable: true,
      },
    ],
  },
  {
    id: "pkg-003",
    name: "Premium Birthday Package",
    description: "Make your birthday celebration unforgettable",
    basePrice: 100000,
    maxGuests: 100,
    eventType: "birthday",
    imageUrl: "/placeholder.svg?height=200&width=400",
    components: [
      {
        id: "comp-017",
        name: "Event Coordination",
        description: "Full event planning and coordination",
        price: 20000,
        category: "coordination",
        isRemovable: false,
      },
      {
        id: "comp-018",
        name: "Catering (100 pax)",
        description: "Buffet meal with dessert station",
        price: 50000,
        category: "venue",
        isRemovable: false,
        subComponents: [
          {
            id: "buffet",
            name: "Buffet",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "drinks",
            name: "Drinks",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "dessert",
            name: "Dessert Bar",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-019",
        name: "Decorations",
        description: "Themed decorations and balloon arrangements",
        price: 15000,
        category: "decor",
        isRemovable: true,
        subComponents: [
          {
            id: "balloons",
            name: "Balloons",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "banners",
            name: "Banners",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-020",
        name: "Photography",
        description: "Professional photography coverage (6 hours)",
        price: 15000,
        category: "media",
        isRemovable: true,
        subComponents: [
          {
            id: "photo-drone",
            name: "Drone Coverage",
            quantity: 1,
            unitPrice: 3000,
            included: false,
          },
          {
            id: "photo-photobooth",
            name: "Photobooth",
            quantity: 1,
            unitPrice: 2000,
            included: true,
          },
          {
            id: "photo-prints",
            name: "Printed Album",
            quantity: 1,
            unitPrice: 1000,
            included: true,
          },
        ],
      },
      {
        id: "comp-021",
        name: "Entertainment",
        description: "DJ and MC services",
        price: 10000,
        category: "extras",
        isRemovable: true,
      },
      {
        id: "comp-022",
        name: "Custom Cake",
        description: "Personalized multi-tier cake",
        price: 8000,
        category: "extras",
        isRemovable: true,
      },
    ],
  },
  {
    id: "pkg-004",
    name: "Standard Birthday Package",
    description: "A fun and memorable birthday celebration",
    basePrice: 60000,
    maxGuests: 50,
    eventType: "birthday",
    imageUrl: "/placeholder.svg?height=200&width=400",
    components: [
      {
        id: "comp-023",
        name: "Event Coordination",
        description: "Day-of coordination services",
        price: 10000,
        category: "coordination",
        isRemovable: false,
      },
      {
        id: "comp-024",
        name: "Catering (50 pax)",
        description: "Buffet meal with cake",
        price: 30000,
        category: "venue",
        isRemovable: false,
        subComponents: [
          {
            id: "buffet",
            name: "Buffet",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "drinks",
            name: "Drinks",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "cake",
            name: "Cake",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-025",
        name: "Basic Decorations",
        description: "Standard decorations and balloons",
        price: 8000,
        category: "decor",
        isRemovable: true,
        subComponents: [
          {
            id: "balloons",
            name: "Balloons",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "banners",
            name: "Banners",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-026",
        name: "Photography",
        description: "Professional photography coverage (4 hours)",
        price: 10000,
        category: "media",
        isRemovable: true,
        subComponents: [
          {
            id: "photo-photobooth",
            name: "Photobooth",
            quantity: 1,
            unitPrice: 1500,
            included: true,
          },
          {
            id: "photo-prints",
            name: "Printed Album",
            quantity: 1,
            unitPrice: 800,
            included: true,
          },
          {
            id: "photo-gallery",
            name: "Online Gallery",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-027",
        name: "Birthday Cake",
        description: "Standard birthday cake",
        price: 5000,
        category: "extras",
        isRemovable: true,
      },
    ],
  },
  {
    id: "pkg-005",
    name: "Executive Corporate Package",
    description: "Professional corporate events for your business",
    basePrice: 150000,
    maxGuests: 100,
    eventType: "corporate",
    imageUrl: "/placeholder.svg?height=200&width=400",
    components: [
      {
        id: "comp-028",
        name: "Event Management",
        description: "Full corporate event planning and management",
        price: 30000,
        category: "coordination",
        isRemovable: false,
      },
      {
        id: "comp-029",
        name: "Catering (100 pax)",
        description: "Premium corporate catering with coffee breaks",
        price: 70000,
        category: "venue",
        isRemovable: false,
        subComponents: [
          {
            id: "buffet",
            name: "Buffet",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "drinks",
            name: "Drinks",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "coffee",
            name: "Coffee Breaks",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-030",
        name: "AV Equipment",
        description: "Professional audio-visual setup",
        price: 25000,
        category: "extras",
        isRemovable: true,
      },
      {
        id: "comp-031",
        name: "Corporate Decor",
        description: "Professional stage and venue decoration",
        price: 15000,
        category: "decor",
        isRemovable: true,
        subComponents: [
          {
            id: "stage",
            name: "Stage Setup",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "centerpieces",
            name: "Table Centerpieces",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-032",
        name: "Photography",
        description: "Event photography coverage",
        price: 15000,
        category: "media",
        isRemovable: true,
        subComponents: [
          {
            id: "photo-drone",
            name: "Drone Coverage",
            quantity: 1,
            unitPrice: 3500,
            included: false,
          },
          {
            id: "photo-prints",
            name: "Printed Album",
            quantity: 1,
            unitPrice: 1200,
            included: true,
          },
          {
            id: "photo-gallery",
            name: "Online Gallery",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-033",
        name: "Accommodation",
        description: "Hotel rooms for key personnel",
        price: 30000,
        category: "hotel",
        isRemovable: true,
      },
    ],
  },
  {
    id: "pkg-006",
    name: "Standard Corporate Package",
    description: "Efficient and professional business events",
    basePrice: 80000,
    maxGuests: 50,
    eventType: "corporate",
    imageUrl: "/placeholder.svg?height=200&width=400",
    components: [
      {
        id: "comp-034",
        name: "Event Coordination",
        description: "Day-of coordination services",
        price: 15000,
        category: "coordination",
        isRemovable: false,
      },
      {
        id: "comp-035",
        name: "Catering (50 pax)",
        description: "Standard corporate catering",
        price: 40000,
        category: "venue",
        isRemovable: false,
        subComponents: [
          {
            id: "buffet",
            name: "Buffet",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "drinks",
            name: "Drinks",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-036",
        name: "Basic AV Setup",
        description: "Standard audio-visual equipment",
        price: 15000,
        category: "extras",
        isRemovable: true,
      },
      {
        id: "comp-037",
        name: "Basic Decor",
        description: "Simple stage and venue decoration",
        price: 8000,
        category: "decor",
        isRemovable: true,
        subComponents: [
          {
            id: "stage",
            name: "Stage Setup",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "banners",
            name: "Banners",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-038",
        name: "Photography",
        description: "Basic event photography",
        price: 10000,
        category: "media",
        isRemovable: true,
      },
    ],
  },
  {
    id: "pkg-007",
    name: "Platinum Wedding Package with Venue Choices",
    description:
      "Premium wedding package with integrated venue selection - choose from multiple venue options within your budget",
    basePrice: 250000,
    maxGuests: 200,
    eventType: "wedding",
    imageUrl: "/placeholder.svg?height=200&width=400",
    components: [
      {
        id: "comp-039",
        name: "Wedding Coordination",
        description: "Full wedding planning and day-of coordination",
        price: 50000,
        category: "coordination",
        isRemovable: false,
      },
      {
        id: "comp-040",
        name: "Catering (200 pax)",
        description: "Premium 5-course meal with dessert station",
        price: 100000,
        category: "venue",
        isRemovable: false,
        subComponents: [
          {
            id: "buffet",
            name: "Buffet",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "drinks",
            name: "Drinks",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "dessert",
            name: "Dessert Bar",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-041",
        name: "Venue Fee",
        description:
          "Venue rental and basic setup - select from available venue choices",
        price: 65000, // Default venue choice price
        category: "venue_fee",
        isRemovable: false,
        venueOptions: [
          {
            id: "venue-choice-1",
            name: "Premium Hotel Ballroom",
            price: 80000,
            description:
              "Elegant ballroom with premium amenities and city views",
            maxGuests: 200,
            venueId: "venue-1",
          },
          {
            id: "venue-choice-2",
            name: "Garden Resort Pavilion",
            price: 65000,
            description: "Beautiful garden pavilion with outdoor charm",
            maxGuests: 180,
            venueId: "venue-3",
          },
          {
            id: "venue-choice-3",
            name: "Boutique Hotel Function Room",
            price: 55000,
            description:
              "Intimate and stylish function room for smaller gatherings",
            maxGuests: 150,
            venueId: "venue-4",
          },
        ],
      },
      {
        id: "comp-042",
        name: "Bridal Gown",
        description: "Custom-designed bridal gown",
        price: 30000,
        category: "attire",
        isRemovable: true,
      },
      {
        id: "comp-043",
        name: "Groom's Attire",
        description: "Custom-tailored suit for the groom",
        price: 15000,
        category: "attire",
        isRemovable: true,
      },
      {
        id: "comp-044",
        name: "Floral Arrangements",
        description: "Premium floral arrangements for ceremony and reception",
        price: 25000,
        category: "decor",
        isRemovable: true,
        subComponents: [
          {
            id: "bouquets",
            name: "Bouquets",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "centerpieces",
            name: "Table Centerpieces",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "arch",
            name: "Ceremony Arch",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
        ],
      },
      {
        id: "comp-045",
        name: "Photography",
        description: "Professional photography coverage (10 hours)",
        price: 35000,
        category: "media",
        isRemovable: true,
        subComponents: [
          {
            id: "photo-drone",
            name: "Drone Coverage",
            quantity: 1,
            unitPrice: 5000,
            included: true,
          },
          {
            id: "photo-photobooth",
            name: "Photobooth",
            quantity: 1,
            unitPrice: 3000,
            included: true,
          },
          {
            id: "photo-prints",
            name: "Printed Album",
            quantity: 1,
            unitPrice: 2000,
            included: true,
          },
          {
            id: "photo-gallery",
            name: "Online Gallery",
            quantity: 1,
            unitPrice: 0,
            included: true,
          },
          {
            id: "photo-sde",
            name: "Same-day Edit",
            quantity: 1,
            unitPrice: 4000,
            included: false,
          },
        ],
      },
      {
        id: "comp-046",
        name: "Videography",
        description: "Professional video coverage with same-day edit",
        price: 40000,
        category: "media",
        isRemovable: true,
      },
      {
        id: "comp-047",
        name: "Bridal Car",
        description: "Luxury car rental for the couple",
        price: 15000,
        category: "extras",
        isRemovable: true,
      },
      {
        id: "comp-048",
        name: "Honeymoon Suite",
        description: "One night stay in a luxury hotel suite",
        price: 20000,
        category: "hotel",
        isRemovable: true,
      },
    ],
  },
];
