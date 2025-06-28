import { type VenuePackage } from "./index";

declare module "@/data/venues" {
  export interface Venue {
    id: string;
    name: string;
    location: string;
    description: string;
    image: string;
    packages: VenuePackage[];
  }

  export const venues: Venue[];
}

declare module "@/data/suppliers" {
  export interface Supplier {
    id: string;
    name: string;
    category: string;
    rating: number;
    contact: string;
  }

  export function getSuppliersByCategory(category: string): Supplier[];
}

declare module "@/data/themes" {
  export interface EventTheme {
    id: string;
    name: string;
    description: string;
    colors: string[];
    image: string;
  }

  export const eventThemes: EventTheme[];
}

declare module "@/data/package-components" {
  import { PackageComponent } from "@/types";
  export const packageComponents: PackageComponent[];
}

declare module "@/types/event-types" {
  export interface EventDetails {
    title: string;
    type: string;
    date: string;
    capacity: number;
    notes: string;
    venue: string;
    package: string;
  }
}
