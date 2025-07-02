import { secureStorage } from "./encryption";

export const protectRoute = () => {
  if (typeof window !== "undefined") {
    // Check if user is authenticated
    const userData = secureStorage.getItem("user");
    if (userData?.user_role) {
      // Prevent using the back button to go to login/auth pages
      window.history.pushState(null, "", window.location.href);
      window.onpopstate = function () {
        window.history.pushState(null, "", window.location.href);
      };

      // Only redirect if on auth pages to avoid loops
      if (window.location.pathname.startsWith("/auth")) {
        const role = userData.user_role.toLowerCase();
        if (role === "admin") {
          window.location.replace("/admin/dashboard");
        } else if (role === "vendor" || role === "organizer") {
          window.location.replace("/organizer/dashboard");
        } else if (role === "client") {
          window.location.replace("/client/dashboard");
        }
      }
    }
  }
};

export const redirectIfAuthenticated = () => {
  if (typeof window !== "undefined") {
    const userData = secureStorage.getItem("user");
    if (userData?.user_role) {
      const role = userData.user_role.toLowerCase();
      if (role === "admin") {
        window.location.replace("/admin/dashboard");
      } else if (role === "vendor" || role === "organizer") {
        window.location.replace("/organizer/dashboard");
      } else if (role === "client") {
        window.location.replace("/client/dashboard");
      }
    }
  }
};
