/**
 * API Configuration File
 *
 * This file contains the base API URL configuration for all HTTP requests in the application.
 * It uses environment variables when available, with a fallback to localhost for development.
 */

// Base API URL
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost/events-api";

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
