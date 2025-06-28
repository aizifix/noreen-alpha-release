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

      // Redirect based on role if on auth pages
      if (window.location.pathname.startsWith("/auth")) {
        const role = userData.user_role.toLowerCase();
        if (role === "admin") {
          window.location.href = "/admin/dashboard";
        } else if (role === "vendor") {
          window.location.href = "/vendor/dashboard";
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
        window.location.href = "/admin/dashboard";
      } else if (role === "vendor") {
        window.location.href = "/vendor/dashboard";
      }
    }
  }
};
