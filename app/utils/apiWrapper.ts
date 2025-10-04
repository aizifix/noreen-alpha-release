/**
 * API Wrapper - Centralized API calls with environment-based URLs
 *
 * This wrapper provides a clean interface for all API calls, automatically
 * using the correct base URL based on environment variables.
 */

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { API_URL } from "../config/api";

// Generic API response type
export interface ApiResponse<T = any> {
  status: string;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Base API client with automatic URL configuration
 */
class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  /**
   * Make a GET request
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await axios.get<ApiResponse<T>>(`${this.baseURL}${endpoint}`, {
        params,
        validateStatus: () => true,
        ...config,
      });
      return response.data;
    } catch (error) {
      return {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Make a POST request
   */
  async post<T = any, D = any>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await axios.post<ApiResponse<T>>(`${this.baseURL}${endpoint}`, data, {
        validateStatus: () => true,
        ...config,
      });
      return response.data;
    } catch (error) {
      return {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Make a PUT request
   */
  async put<T = any, D = any>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await axios.put<ApiResponse<T>>(`${this.baseURL}${endpoint}`, data, {
        validateStatus: () => true,
        ...config,
      });
      return response.data;
    } catch (error) {
      return {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await axios.delete<ApiResponse<T>>(`${this.baseURL}${endpoint}`, {
        validateStatus: () => true,
        ...config,
      });
      return response.data;
    } catch (error) {
      return {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get the full URL for an endpoint (useful for image URLs, etc.)
   */
  getFullUrl(endpoint: string): string {
    return `${this.baseURL}${endpoint}`;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Specific API endpoints for easy access
export const api = {
  // Client API
  client: {
    getAllPackages: () => apiClient.get("/client.php?operation=getAllPackages"),
    getPackageDetails: (packageId: number) =>
      apiClient.get(`/client.php?operation=getPackageDetails&package_id=${packageId}`),
    getBookings: (userId: number) =>
      apiClient.get(`/client.php?operation=getBookings&user_id=${userId}`),
    createBooking: (data: any) =>
      apiClient.post("/client.php?operation=createBooking", data),
  },

  // Admin API
  admin: {
    getUsers: () => apiClient.get("/admin.php?operation=getUsers"),
    createUser: (data: any) => apiClient.post("/admin.php?operation=createUser", data),
    updateUser: (data: any) => apiClient.post("/admin.php?operation=updateUser", data),
    deleteUser: (userId: number) =>
      apiClient.post("/admin.php?operation=deleteUser", { user_id: userId }),
  },

  // Organizer API
  organizer: {
    getEvents: (organizerId: number) =>
      apiClient.get(`/organizer.php?operation=getEvents&organizer_id=${organizerId}`),
    createEvent: (data: any) =>
      apiClient.post("/organizer.php?operation=createEvent", data),
    updateEvent: (data: any) =>
      apiClient.post("/organizer.php?operation=updateEvent", data),
  },

  // Supplier API
  supplier: {
    getSuppliers: () => apiClient.get("/supplier.php?operation=getSuppliers"),
    createSupplier: (data: any) =>
      apiClient.post("/supplier.php?operation=createSupplier", data),
    updateSupplier: (data: any) =>
      apiClient.post("/supplier.php?operation=updateSupplier", data),
  },

  // Notifications API
  notifications: {
    getRecent: (userId: number, since?: string) => {
      const params = since ? `&since=${encodeURIComponent(since)}` : "";
      return apiClient.get(`/notifications.php?operation=get_recent&user_id=${userId}${params}`);
    },
    getCounts: (userId: number) =>
      apiClient.get(`/notifications.php?operation=get_counts&user_id=${userId}`),
    markAsRead: (notificationId: number) =>
      apiClient.post("/notifications.php?operation=markAsRead", { notification_id: notificationId }),
  },

  // Auth API
  auth: {
    login: (data: { email: string; password: string }) =>
      apiClient.post("/auth.php?operation=login", data),
    register: (data: any) =>
      apiClient.post("/auth.php?operation=register", data),
    verifyOTP: (data: { email: string; otp: string }) =>
      apiClient.post("/auth.php?operation=verifyOTP", data),
  },

  // Utility functions
  getImageUrl: (imagePath: string) => {
    if (!imagePath) return null;

    // If the image path already contains a full URL, use it as is
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    // Use the serve-image.php script for proper image serving
    return apiClient.getFullUrl(`/serve-image.php?path=${encodeURIComponent(imagePath)}`);
  },
  getServeImageUrl: (imagePath: string) => apiClient.getFullUrl(`/serve-image.php?path=${encodeURIComponent(imagePath)}`),
};

// Export the base client for custom requests
export default apiClient;
