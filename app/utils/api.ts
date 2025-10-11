/**
 * API Utility Functions
 *
 * This file provides utility functions for making HTTP requests using axios.
 * It centralizes API call patterns and provides typed responses.
 */

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { API_URL, endpoints } from "../config/api";

// Generic API response type
export interface ApiResponse<T = any> {
  status: string;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Get request helper function
 */
export async function apiGet<T = any>(
  endpoint: string,
  params?: Record<string, any>,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  try {
    console.log("🌐 Making GET request to:", endpoint, "with params:", params);
    const response = await axios.get<ApiResponse<T>>(endpoint, {
      params,
      validateStatus: () => true,
      ...config,
    });

    console.log("📡 Raw API Response:", response.data);

    // Handle different response structures
    if (response.data && typeof response.data === 'object') {
      return response.data;
    } else {
      return {
        status: "error",
        error: "Invalid response format from server",
      };
    }
  } catch (error: any) {
    console.error("❌ API GET Error:", error);
    // Network error or request setup error
    return {
      status: "error",
      error: error?.response?.data?.message || error?.message || "Unknown error occurred",
    };
  }
}

/**
 * Post request helper function
 */
export async function apiPost<T = any, D = any>(
  endpoint: string,
  data: D,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  try {
    const response = await axios.post<ApiResponse<T>>(endpoint, data, {
      validateStatus: () => true,
      ...config,
    });

    // Handle potential double-encoded JSON from PHP
    let responseData = response.data;

    // If the response is a string, try to parse it as JSON
    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData);
        console.log("Successfully parsed JSON string response:", responseData);
      } catch (parseError) {
        console.warn("Failed to parse response as JSON:", parseError);
        console.warn("Raw response string:", responseData);
        // Return the string as is if parsing fails
        return {
          status: "success",
          data: responseData as T,
          message: "Response received as string"
        };
      }
    }

    // Handle empty response objects (common with PHP APIs that return empty JSON)
    if (responseData && typeof responseData === 'object' && (Object.keys(responseData).length === 0 || JSON.stringify(responseData) === '{}')) {
      console.log("Empty response object detected - treating as success");
      return {
        status: "success",
        data: responseData as T,
        message: "Assignment completed successfully"
      };
    }

    // Enhanced debugging for response structure
    console.log("API Response received:", responseData);
    console.log("Response type:", typeof responseData);
    console.log("Response status:", responseData?.status);

    return responseData;
  } catch (error) {
    // Enhanced error logging for debugging
    console.error("API Post Error:", error);
    console.error("Error type:", typeof error);
    console.error("Error details:", error instanceof Error ? error.message : error);

    // Network error or request setup error
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
      message: error instanceof Error ? error.message : "Network or request error",
    };
  }
}

/**
 * Helper functions for specific API endpoints
 */

// Admin API helpers
export const adminApi = {
  get: <T = any>(params?: Record<string, any>, config?: AxiosRequestConfig) =>
    apiGet<T>(endpoints.admin, params, config),
  post: <T = any, D = any>(data: D, config?: AxiosRequestConfig) =>
    apiPost<T, D>(endpoints.admin, data, config),
};

// Client API helpers
export const clientApi = {
  get: async <T = any>(params?: Record<string, any>, config?: AxiosRequestConfig) => {
    try {
      const response = await apiGet<T>(endpoints.client, params, config);
      console.log("🔍 Client API GET Response:", response);
      return response;
    } catch (error) {
      console.error("❌ Client API GET Error:", error);
      return {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
  post: <T = any, D = any>(data: D, config?: AxiosRequestConfig) =>
    apiPost<T, D>(endpoints.client, data, config),
};

// Auth API helpers
export const authApi = {
  get: <T = any>(params?: Record<string, any>, config?: AxiosRequestConfig) =>
    apiGet<T>(endpoints.auth, params, config),
  post: <T = any, D = any>(data: D, config?: AxiosRequestConfig) =>
    apiPost<T, D>(endpoints.auth, data, config),
};

// Organizer API helpers
export const organizerApi = {
  get: <T = any>(params?: Record<string, any>, config?: AxiosRequestConfig) =>
    apiGet<T>(endpoints.organizer, params, config),
  post: <T = any, D = any>(data: D, config?: AxiosRequestConfig) =>
    apiPost<T, D>(endpoints.organizer, data, config),
};

// Notifications API helpers
export const notificationsApi = {
  get: <T = any>(params?: Record<string, any>, config?: AxiosRequestConfig) =>
    apiGet<T>(endpoints.notifications, params, config),
  post: <T = any, D = any>(data: D, config?: AxiosRequestConfig) =>
    apiPost<T, D>(endpoints.notifications, data, config),
};

// Custom endpoint helper (for any other endpoints not covered above)
export function createCustomApi(endpoint: string) {
  return {
    get: <T = any>(params?: Record<string, any>, config?: AxiosRequestConfig) =>
      apiGet<T>(endpoint, params, config),
    post: <T = any, D = any>(data: D, config?: AxiosRequestConfig) =>
      apiPost<T, D>(endpoint, data, config),
  };
}
