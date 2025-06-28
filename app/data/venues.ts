export interface VenuePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  maxGuests: number;
  pricePerExcessPerson?: number;
  serviceCharge?: number;
  inclusions: string[];
  menuItems?: string[];
  eventTypes?: string[];
}

export interface VenueContactInfo {
  address?: string;
  phone?: string[];
  mobile?: string[];
  email?: string;
  website?: string;
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  location: string;
  imageUrl?: string;
  packages: VenuePackage[];
  contactInfo?: VenueContactInfo;
}

export const venues: Venue[] = [
  {
    id: "venue-1",
    name: "Grand Ballroom",
    description: "Elegant venue perfect for weddings and corporate events",
    location: "123 Main Street, City Center",
    imageUrl: "/venues/grand-ballroom.jpg",
    packages: [
      {
        id: "package-1",
        name: "Wedding Package",
        description: "Complete wedding package with catering and decoration",
        price: 50000,
        maxGuests: 200,
        pricePerExcessPerson: 500,
        serviceCharge: 0.1,
        inclusions: [
          "Full venue access",
          "Basic decoration",
          "Sound system",
          "Tables and chairs",
        ],
        menuItems: [
          "Welcome drinks",
          "4-course dinner",
          "Dessert buffet",
          "Coffee and tea service",
        ],
        eventTypes: ["wedding", "debut"],
      },
      {
        id: "package-2",
        name: "Corporate Package",
        description: "Professional setup for business events",
        price: 30000,
        maxGuests: 150,
        pricePerExcessPerson: 300,
        serviceCharge: 0.1,
        inclusions: [
          "Conference setup",
          "Projector and screen",
          "WiFi access",
          "Coffee break service",
        ],
        eventTypes: ["corporate", "conference"],
      },
    ],
    contactInfo: {
      address: "123 Main Street, City Center",
      phone: ["+1 234 567 8900"],
      email: "info@grandballroom.com",
      website: "www.grandballroom.com",
    },
  },
  {
    id: "venue-2",
    name: "Garden Pavilion",
    description: "Beautiful outdoor venue surrounded by nature",
    location: "456 Park Avenue, Green District",
    imageUrl: "/venues/garden-pavilion.jpg",
    packages: [
      {
        id: "package-3",
        name: "Garden Wedding Package",
        description: "Romantic outdoor wedding package",
        price: 45000,
        maxGuests: 150,
        pricePerExcessPerson: 450,
        serviceCharge: 0.1,
        inclusions: [
          "Garden ceremony setup",
          "Tent and flooring",
          "Lighting system",
          "Garden decoration",
        ],
        menuItems: [
          "Cocktail reception",
          "Buffet dinner",
          "Dessert table",
          "Bar service",
        ],
        eventTypes: ["wedding", "debut"],
      },
    ],
    contactInfo: {
      address: "456 Park Avenue, Green District",
      phone: ["+1 234 567 8901"],
      email: "info@gardenpavilion.com",
      website: "www.gardenpavilion.com",
    },
  },
];
