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
    requestForgotPassword: async (email: string) => {
      const fd = new FormData();
      fd.append("operation", "request_forgot_password");
      fd.append("email", email);
      return await axios.post(endpoints.auth, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    resetPasswordWithOtp: async (params: { email: string; otp: string; newPassword: string; confirmPassword: string }) => {
      const fd = new FormData();
      fd.append("operation", "reset_password_with_otp");
      fd.append("email", params.email);
      fd.append("otp", params.otp);
      fd.append("new_password", params.newPassword);
      fd.append("confirm_password", params.confirmPassword);
      return await axios.post(endpoints.auth, fd, {
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
    createEvent: async (eventData: any) => {
      return await axios.post(endpoints.admin, eventData, {
        headers: { "Content-Type": "application/json" },
      });
    },
    getAllOrganizers: async (page = 1, limit = 20, search = '') => {
      return await axios.get(`${endpoints.admin}?operation=getAllOrganizers&page=${page}&limit=${limit}&search=${search}`);
    },
    assignOrganizerToEvent: async (eventId: number, organizerId: number, assignedBy: number, notes?: string) => {
      const data = {
        operation: "assignOrganizerToEvent",
        event_id: eventId,
        organizer_id: organizerId,
        assigned_by: assignedBy,
        notes
      };
      return await axios.post(endpoints.admin, data, {
        headers: { "Content-Type": "application/json" },
      });
    },
    getEventOrganizerDetails: async (eventId: number) => {
      return await axios.get(`${endpoints.admin}?operation=getEventOrganizerDetails&event_id=${eventId}`);
    },
  },
  organizer: {
    getOrganizerProfile: async (organizerId: number) => {
      return await axios.get(`${endpoints.organizer}?operation=getOrganizerProfile&organizer_id=${organizerId}`);
    },
    updateAssignmentStatus: async (data: {
      event_id?: number;
      organizer_id: number;
      assignment_id?: number;
      status: 'accepted' | 'rejected' | 'pending';
    }) => {
      return await axios.post(endpoints.organizer, {
        ...data,
        operation: "updateAssignmentStatus"
      }, {
        headers: { "Content-Type": "application/json" },
      });
    },
  },
  // Helper function to get serve image URL
  getServeImageUrl: (imagePath: string) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;

    // Handle case where imagePath might be a JSON object instead of just a file path
    let actualPath = imagePath;
    try {
      // Try to parse as JSON - if it's a JSON object, extract the filename
      const parsed = JSON.parse(imagePath);
      if (parsed && typeof parsed === 'object') {
        // Handle different JSON structures
        if (parsed.filename) {
          actualPath = parsed.filename;
        } else if (parsed.filePath) {
          actualPath = parsed.filePath;
        } else if (parsed.path) {
          actualPath = parsed.path;
        }
      }
    } catch (e) {
      // If parsing fails, it's not JSON, so use the original path
      actualPath = imagePath;
    }

    // Ensure the path starts with uploads/ if it doesn't already
    if (!actualPath.startsWith("uploads/") && !actualPath.startsWith("http")) {
      actualPath = `uploads/${actualPath}`;
    }

    return `${endpoints.serveImage}?path=${encodeURIComponent(actualPath)}`;
  },
};
