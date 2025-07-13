import { secureStorage } from "./encryption";

export interface UserData {
  user_id: number;
  user_firstName: string;
  user_lastName: string;
  user_role: string;
  user_email: string;
  user_pfp?: string;
  profilePicture?: string;
  [key: string]: any;
}

export const userDataHelper = {
  // Validate user data structure
  validateUserData: (userData: any): boolean => {
    if (!userData || typeof userData !== "object") {
      console.error("Invalid user data: not an object");
      return false;
    }

    const requiredFields = ["user_id", "user_firstName", "user_lastName", "user_role", "user_email"];
    for (const field of requiredFields) {
      if (!userData[field]) {
        console.error(`Invalid user data: missing ${field}`);
        return false;
      }
    }

    return true;
  },

  // Safely update user data in secure storage
  updateUserData: (updates: Partial<UserData>): boolean => {
    try {
      const currentUser = secureStorage.getItem("user");
      if (!currentUser || !userDataHelper.validateUserData(currentUser)) {
        console.error("Cannot update: invalid current user data");
        return false;
      }

      const updatedUser = {
        ...currentUser,
        ...updates
      };

      if (!userDataHelper.validateUserData(updatedUser)) {
        console.error("Cannot update: invalid updated user data");
        return false;
      }

      secureStorage.setItem("user", updatedUser);

      // Dispatch custom event to notify layout of user data change
      window.dispatchEvent(new CustomEvent("userDataChanged"));

      return true;
    } catch (error) {
      console.error("Error updating user data:", error);
      return false;
    }
  },

  // Get user data safely
  getUserData: (): UserData | null => {
    try {
      const userData = secureStorage.getItem("user");
      if (userData && userDataHelper.validateUserData(userData)) {
        return userData as UserData;
      }
      return null;
    } catch (error) {
      console.error("Error getting user data:", error);
      return null;
    }
  },

  // Debug user data
  debugUserData: (): void => {
    const userData = secureStorage.getItem("user");
    console.log("Current user data:", userData);
    console.log("Is valid:", userDataHelper.validateUserData(userData));
  }
};
