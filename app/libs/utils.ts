import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parsePrice(price: string | number): number {
  if (typeof price === 'number') {
    return price;
  }

  if (typeof price === 'string') {
    // Remove commas, spaces, and currency symbols, then parse
    const cleanPrice = price.replace(/[,\s₱$]/g, '');
    const parsed = parseFloat(cleanPrice);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

export function formatPrice(price: number): string {
  return `₱${price.toLocaleString()}`;
}
