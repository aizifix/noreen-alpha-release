/**
 * Axios API Configuration for Next.js 15 Frontend
 *
 * This file provides a configured Axios instance for communicating with the Namecheap backend.
 * It includes proper error handling, CORS configuration, and example functions.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Get the API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://noreen-events.online/noreen-events';

// Create Axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for logging and adding auth tokens
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) {
      console.log('📤 Request Data:', config.data);
    }
    if (config.params) {
      console.log('🔍 Request Params:', config.params);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    console.log('📥 Response Data:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Generic API response type
export interface ApiResponse<T = any> {
  status: string;
  message?: string;
  data?: T;
  error?: string;
}

// Generic error response type
export interface ApiError {
  status: string;
  error: string;
  message?: string;
}

/**
 * Generic GET request function with error handling
 */
export async function apiGet<T = any>(
  endpoint: string,
  params?: Record<string, any>,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.get<ApiResponse<T>>(endpoint, {
      params,
      ...config,
    });
    return response.data;
  } catch (error: any) {
    console.error('GET request failed:', error);
    return {
      status: 'error',
      error: error.response?.data?.error || error.message || 'Network error occurred',
    };
  }
}

/**
 * Generic POST request function with error handling
 */
export async function apiPost<T = any, D = any>(
  endpoint: string,
  data: D,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.post<ApiResponse<T>>(endpoint, data, config);
    return response.data;
  } catch (error: any) {
    console.error('POST request failed:', error);
    return {
      status: 'error',
      error: error.response?.data?.error || error.message || 'Network error occurred',
    };
  }
}

/**
 * Example: Get package details from client.php
 */
export async function getPackageDetails(packageId: string | number): Promise<ApiResponse<any>> {
  try {
    console.log(`📦 Fetching package details for ID: ${packageId}`);

    const response = await apiGet('/client.php', {
      operation: 'getPackageDetails',
      package_id: packageId,
    });

    if (response.status === 'success') {
      console.log('✅ Package details fetched successfully');
    } else {
      console.error('❌ Failed to fetch package details:', response.error);
    }

    return response;
  } catch (error) {
    console.error('❌ Error in getPackageDetails:', error);
    return {
      status: 'error',
      error: 'Failed to fetch package details',
    };
  }
}

/**
 * Example: POST request to organizer.php with JSON payload
 */
export async function createOrganizerEvent(eventData: {
  event_name: string;
  event_date: string;
  venue_id: number;
  guest_count: number;
  [key: string]: any;
}): Promise<ApiResponse<any>> {
  try {
    console.log('🎉 Creating organizer event:', eventData);

    const response = await apiPost('/organizer.php', {
      operation: 'createEvent',
      ...eventData,
    });

    if (response.status === 'success') {
      console.log('✅ Event created successfully');
    } else {
      console.error('❌ Failed to create event:', response.error);
    }

    return response;
  } catch (error) {
    console.error('❌ Error in createOrganizerEvent:', error);
    return {
      status: 'error',
      error: 'Failed to create organizer event',
    };
  }
}

/**
 * Example: Update organizer event
 */
export async function updateOrganizerEvent(
  eventId: string | number,
  updateData: Record<string, any>
): Promise<ApiResponse<any>> {
  try {
    console.log(`🔄 Updating organizer event ${eventId}:`, updateData);

    const response = await apiPost('/organizer.php', {
      operation: 'updateEvent',
      event_id: eventId,
      ...updateData,
    });

    if (response.status === 'success') {
      console.log('✅ Event updated successfully');
    } else {
      console.error('❌ Failed to update event:', response.error);
    }

    return response;
  } catch (error) {
    console.error('❌ Error in updateOrganizerEvent:', error);
    return {
      status: 'error',
      error: 'Failed to update organizer event',
    };
  }
}

/**
 * Example: Get organizer events list
 */
export async function getOrganizerEvents(organizerId?: string | number): Promise<ApiResponse<any>> {
  try {
    console.log(`📋 Fetching organizer events${organizerId ? ` for organizer ${organizerId}` : ''}`);

    const params: Record<string, any> = {
      operation: 'getEvents',
    };

    if (organizerId) {
      params.organizer_id = organizerId;
    }

    const response = await apiGet('/organizer.php', params);

    if (response.status === 'success') {
      console.log('✅ Organizer events fetched successfully');
    } else {
      console.error('❌ Failed to fetch organizer events:', response.error);
    }

    return response;
  } catch (error) {
    console.error('❌ Error in getOrganizerEvents:', error);
    return {
      status: 'error',
      error: 'Failed to fetch organizer events',
    };
  }
}

// Export the configured Axios instance for direct use if needed
export { apiClient };
export default apiClient;
