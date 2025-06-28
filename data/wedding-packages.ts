import { ComponentCategory } from "./packages";

export interface WeddingPackage {
  id: string;
  name: string;
  price: number;
  basePrice?: number;
  description: string;
  maxGuests: number;
  features: string[];
  inclusions: {
    category: string;
    items: string[];
  }[];
  freebies?: {
    id?: string;
    name: string;
    description?: string;
    quantity?: number;
    details?: {
      id?: string;
      name: string;
      description?: string;
      quantity?: number;
    }[];
  }[];
  hotelChoices?: string[];
  allocatedBudget?: number;
}

export const weddingPackages = [
  {
    id: "basic",
    name: "Basic Package",
    price: 120000,
    basePrice: 120000,
    allocatedBudget: 100000,
    description: "Essential wedding package for up to 100 guests",
    maxGuests: 100,
    features: [
      "Venue rental for 5 hours",
      "Basic sound system",
      "Standard lighting",
      "Basic decoration",
      "Buffet menu for 100 guests",
    ],
    inclusions: [
      {
        category: "Venue",
        items: [
          "Function room for 5 hours",
          "Basic sound system",
          "Standard lighting",
          "Round tables and chairs",
          "Basic table setup",
          "White seat covers",
        ],
      },
      {
        category: "Food",
        items: [
          "Buffet menu (3 main dishes, 2 sides, dessert)",
          "Free flowing iced tea",
          "Free corkage on 2 lechon",
        ],
      },
      {
        category: "Services",
        items: [
          "Standby waiters",
          "Buffet serving",
          "1 complimentary room for the couple",
        ],
      },
    ],
    freebies: [
      { id: "f1", name: "Bridal car", description: "Basic decoration" },
      { id: "f2", name: "Welcome signage", description: "Standard design" },
    ],
    hotelChoices: ["City Garden Hotel", "Pearlmont Inn", "Red Planet Hotel"],
  },
  {
    id: "standard",
    name: "Standard Package",
    price: 180000,
    basePrice: 180000,
    allocatedBudget: 120000,
    description: "Complete wedding package for up to 150 guests",
    maxGuests: 150,
    features: [
      "Venue rental for 6 hours",
      "Professional sound system",
      "Enhanced lighting",
      "Standard decoration",
      "Premium buffet menu for 150 guests",
      "Photo and video coverage",
    ],
    inclusions: [
      {
        category: "Venue",
        items: [
          "Function room for 6 hours",
          "Professional sound system",
          "Enhanced lighting",
          "Round tables and chairs",
          "Premium table setup",
          "Elegant chair covers with sash",
        ],
      },
      {
        category: "Food",
        items: [
          "Premium buffet menu (4 main dishes, 3 sides, dessert station)",
          "Free flowing iced tea and soda",
          "Free corkage on 3 lechon",
          "Wedding cake (3 tiers)",
        ],
      },
      {
        category: "Services",
        items: [
          "Professional waiters",
          "Buffet serving",
          "1 complimentary suite for the couple",
          "Basic photo and video coverage",
          "Bridal car with flower decoration",
        ],
      },
    ],
    freebies: [
      {
        id: "f3",
        name: "Bridal car with premium decoration",
        description: "Elegant design",
      },
      { id: "f4", name: "Welcome signage", description: "Premium design" },
      { id: "f5", name: "Guest book", description: "Standard design" },
      { id: "f6", name: "Champagne toast", description: "For bride and groom" },
    ],
    hotelChoices: [
      "Marco Polo Hotel",
      "Seda Hotel",
      "Quest Hotel",
      "Waterfront Hotel",
    ],
  },
  {
    id: "premium",
    name: "Premium Package",
    price: 250000,
    basePrice: 250000,
    allocatedBudget: 180000,
    description: "Luxury wedding package for up to 200 guests",
    maxGuests: 200,
    features: [
      "Venue rental for 8 hours",
      "Premium sound system",
      "Special lighting effects",
      "Elegant decoration",
      "Gourmet buffet menu for 200 guests",
      "Complete photo and video coverage",
      "Live band or string quartet",
    ],
    inclusions: [
      {
        category: "Venue",
        items: [
          "Grand ballroom for 8 hours",
          "Premium sound system",
          "Special lighting effects",
          "Round tables and chairs",
          "Luxury table setup",
          "Designer chair covers with sash",
          "Red carpet entrance",
        ],
      },
      {
        category: "Food",
        items: [
          "Gourmet buffet menu (5 main dishes, 4 sides, dessert and cheese station)",
          "Free flowing iced tea, soda, and juice",
          "Free corkage on 5 lechon",
          "Custom wedding cake (5 tiers)",
          "Champagne toast",
        ],
      },
      {
        category: "Services",
        items: [
          "Professional waiters and dedicated event coordinator",
          "Buffet serving",
          "2 complimentary suites for the couple and family",
          "Complete photo and video coverage with same-day edit",
          "Bridal car with premium flower decoration",
          "Live band or string quartet for 3 hours",
          "Photobooth for 3 hours",
        ],
      },
    ],
    freebies: [
      {
        id: "f7",
        name: "Luxury bridal car",
        description: "Premium decoration",
      },
      {
        id: "f8",
        name: "Custom welcome signage",
        description: "Luxury design",
      },
      { id: "f9", name: "Premium guest book", description: "Personalized" },
      { id: "f10", name: "Champagne tower", description: "For toast ceremony" },
      { id: "f11", name: "Dove release", description: "During ceremony" },
      { id: "f12", name: "Fireworks display", description: "3-minute show" },
    ],
    hotelChoices: [
      "Shangri-La Hotel",
      "Radisson Blu",
      "dusitD2 Hotel",
      "Bai Hotel",
    ],
  },
  {
    id: "pearlmont-wedding",
    name: "Pearlmont Wedding Package",
    price: 120000,
    basePrice: 120000,
    allocatedBudget: 90000,
    description: "Complete wedding package for 100 persons at Pearlmont Hotel",
    maxGuests: 100,
    features: [
      "Function room and sound system",
      "White seat covers with motif",
      "Bridal car with flower decoration",
      "Buffet menu for 100 guests",
      "Complimentary room for the couple",
    ],
    inclusions: [
      {
        category: "Venue",
        items: [
          "Function room for reception",
          "Sound system",
          "White seat covers with motif",
          "Skirted cake table",
          "Signature frame stand",
        ],
      },
      {
        category: "Food",
        items: [
          "Buffet menu (Beef with Mushroom, Sweet and Sour Pork, Buttered Chicken, Fish Fillet with Tausi, Pancit Canton)",
          "Rice",
          "Fruit Salad",
          "Softdrinks",
          "Free corkage on 3 lechon",
        ],
      },
      {
        category: "Services",
        items: [
          "Standby waiters",
          "Buffet serving",
          "1 room for overnight stay for the couple",
          "Complimentary breakfast in bed for the couple",
          "Free room for bridal shower",
          "Bridal car with flower decoration",
          "Free use of van for the entourage (Hotel-Church-Hotel)",
        ],
      },
      {
        category: "Extras",
        items: [
          "Coins & candies",
          "Champagne for the bride and groom",
          "Dove",
          "Guest book",
        ],
      },
    ],
    freebies: [
      { id: "f13", name: "Bridal car", description: "With flower decoration" },
      { id: "f14", name: "Champagne", description: "For bride and groom" },
      { id: "f15", name: "Dove release", description: "During ceremony" },
      { id: "f16", name: "Guest book", description: "Standard design" },
    ],
    hotelChoices: ["Pearlmont Inn"],
  },
];

// Function to convert a wedding package to components for the event builder
export function convertPackageToComponents(packageId: string) {
  const selectedPackage = weddingPackages.find((pkg) => pkg.id === packageId);
  if (!selectedPackage) return [];

  // Use allocatedBudget if present, otherwise price
  const budget = selectedPackage.allocatedBudget || selectedPackage.price;

  const components = [];
  let componentId = 1;

  // Add venue component
  const venueInclusions = selectedPackage.inclusions.find(
    (inc) => inc.category === "Venue"
  );
  if (venueInclusions) {
    components.push({
      id: `component-${componentId++}`,
      name: "Venue & Setup",
      category: "venue" as ComponentCategory,
      price: budget * 0.4, // Allocate 40% of budget to venue
      included: true,
      description: "Venue rental and setup",
      inclusions: venueInclusions.items,
      isVenueInclusion: true, // Mark as venue inclusion
      isRemovable: false,
      subComponents: venueInclusions.items.map((item, idx) => ({
        id: `venue-inclusion-${idx}`,
        name: item,
        quantity: 1,
        unitPrice: 0,
      })),
    });
  }

  // Add food component
  const foodInclusions = selectedPackage.inclusions.find(
    (inc) => inc.category === "Food"
  );
  if (foodInclusions) {
    components.push({
      id: `component-${componentId++}`,
      name: "Food & Beverages",
      category: "food" as ComponentCategory,
      price: budget * 0.3, // Allocate 30% of budget to food
      included: true,
      description: "Catering and beverages",
      inclusions: foodInclusions.items,
      isVenueInclusion: true, // Mark as venue inclusion
      isRemovable: false,
      subComponents: foodInclusions.items.map((item, idx) => ({
        id: `food-inclusion-${idx}`,
        name: item,
        quantity: 1,
        unitPrice: 0,
      })),
    });
  }

  // Add services component
  const serviceInclusions = selectedPackage.inclusions.find(
    (inc) => inc.category === "Services"
  );
  if (serviceInclusions) {
    components.push({
      id: `component-${componentId++}`,
      name: "Services",
      category: "services" as ComponentCategory,
      price: budget * 0.2, // Allocate 20% of budget to services
      included: true,
      description: "Staff and service inclusions",
      inclusions: serviceInclusions.items,
      isVenueInclusion: true, // Mark as venue inclusion
      isRemovable: false,
      subComponents: serviceInclusions.items.map((item, idx) => ({
        id: `service-inclusion-${idx}`,
        name: item,
        quantity: 1,
        unitPrice: 0,
      })),
    });
  }

  // Add extras component
  const extraInclusions = selectedPackage.inclusions.find(
    (inc) => inc.category === "Extras"
  );
  if (extraInclusions) {
    components.push({
      id: `component-${componentId++}`,
      name: "Extras",
      category: "extras" as ComponentCategory,
      price: budget * 0.1, // Allocate 10% of budget to extras
      included: true,
      description: "Additional inclusions",
      inclusions: extraInclusions.items,
      isVenueInclusion: true, // Mark as venue inclusion
      isRemovable: true,
      subComponents: extraInclusions.items.map((item, idx) => ({
        id: `extra-inclusion-${idx}`,
        name: item,
        quantity: 1,
        unitPrice: 0,
      })),
    });
  }

  // Add Noreen components (customizable)
  components.push({
    id: `component-${componentId++}`,
    name: "Wedding Coordination",
    category: "coordination" as ComponentCategory,
    price: 25000,
    included: true,
    description: "Professional wedding coordination services",
    isVenueInclusion: false, // Mark as Noreen component (customizable)
    isRemovable: false,
    subComponents: [],
  });

  components.push({
    id: `component-${componentId++}`,
    name: "Photography",
    category: "media" as ComponentCategory,
    price: 20000,
    included: true,
    description: "Professional photography coverage",
    isVenueInclusion: false, // Mark as Noreen component (customizable)
    isRemovable: true,
    subComponents: [],
  });

  components.push({
    id: `component-${componentId++}`,
    name: "Videography",
    category: "media" as ComponentCategory,
    price: 25000,
    included: true,
    description: "Professional video coverage",
    isVenueInclusion: false, // Mark as Noreen component (customizable)
    isRemovable: true,
    subComponents: [],
  });

  return components;
}
