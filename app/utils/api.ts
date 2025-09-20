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
    const response = await axios.get<ApiResponse<T>>(endpoint, {
      params,
      ...config,
    });
    return response.data;
  } catch (error) {
    console.error("API GET Error:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
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
    const response = await axios.post<ApiResponse<T>>(endpoint, data, config);
    return response.data;
  } catch (error) {
    console.error("API POST Error:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
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
  get: <T = any>(params?: Record<string, any>, config?: AxiosRequestConfig) =>
    apiGet<T>(endpoints.client, params, config),
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
