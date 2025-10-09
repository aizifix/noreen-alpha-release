/**
 * API Client for Client-side operations
 *
 * This file provides a configured axios instance for client API calls.
 * It follows the same pattern as the admin section but uses client endpoints.
 */

import axios from "axios";
import { endpoints } from "@/app/config/api";

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: endpoints.client,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging (optional)
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making API request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API response error:', error);
    if (error.response) {
      // Server responded with error status
      console.error('Error response:', error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
