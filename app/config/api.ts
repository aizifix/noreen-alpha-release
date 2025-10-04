/**
 * API Configuration File
 *
 * This file contains the base API URL configuration for all HTTP requests in the application.
 * It uses environment variables when available, with a fallback to the Namecheap backend.
 *
 * IMPORTANT: Always use NEXT_PUBLIC_API_URL environment variable.
 * Never fall back to localhost - always use the remote backend.
 */

// Base API URL - Always use the Namecheap backend
// This ensures consistent behavior between development and production
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://noreen-events.online/noreen-events";

// Validate that the environment variable is set
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL environment variable is not set. Using default Namecheap backend.');
}

// Specific API endpoints
export const endpoints = {
  admin: `${API_URL}/admin.php`,
  client: `${API_URL}/client.php`,
  auth: `${API_URL}/auth.php`,
  organizer: `${API_URL}/organizer.php`,
  notifications: `${API_URL}/notifications.php`,
  vendor: `${API_URL}/vendor.php`,
  supplier: `${API_URL}/supplier.php`,
  staff: `${API_URL}/staff.php`,
  serveImage: `${API_URL}/serve-image.php`,
};

// API wrapper with methods
import axios from "axios";

export const api = {
  auth: {
    login: async (formData: FormData) => {
      return await axios.post(endpoints.auth, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    requestOtp: async (formData: FormData) => {
      return await axios.post(endpoints.auth, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    verifyOtp: async (formData: FormData) => {
      return await axios.post(endpoints.auth, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    signup: async (formData: FormData) => {
      return await axios.post(endpoints.auth, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
  },
  client: {
    getAllPackages: async () => {
      return await axios.get(`${endpoints.client}?operation=getAllPackages`);
    },
    getPackageDetails: async (packageId: number) => {
      return await axios.get(`${endpoints.client}?operation=getPackageDetails&package_id=${packageId}`);
    },
  },
  admin: {
    // Add admin methods as needed
  },
  organizer: {
    // Add organizer methods as needed
  },
};
