// Utility script to clear corrupted localStorage data
// Run this in the browser console if you encounter UTF-8 errors

console.log("Clearing corrupted localStorage data...");

try {
  // Clear all localStorage
  localStorage.clear();
  console.log("✓ localStorage cleared");

  // Clear all authentication cookies
  document.cookie =
    "user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
  document.cookie =
    "user_admin=; path=/admin; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
  document.cookie =
    "user_organizer=; path=/organizer; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
  document.cookie =
    "user_client=; path=/client; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
  console.log("✓ Authentication cookies cleared");

  // Redirect to login page
  window.location.href = "/auth/login";
  console.log("✓ Redirecting to login page");
} catch (error) {
  console.error("Error clearing data:", error);
}
