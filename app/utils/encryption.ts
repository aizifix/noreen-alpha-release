import CryptoJS from "crypto-js";

// This should be a secure key, preferably from environment variables
const ENCRYPTION_KEY =
  process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "your-secret-key-here";

const isValidJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

const sanitizeData = (data: any): any => {
  if (!data) return null;

  try {
    // If it's already a string, try to parse it
    if (typeof data === "string") {
      const parsed = JSON.parse(data);
      return parsed;
    }

    // If it's an object, ensure it can be properly stringified
    const jsonString = JSON.stringify(data);
    const parsed = JSON.parse(jsonString);

    // Validate required fields for user data
    if (parsed && typeof parsed === "object" && "user_role" in parsed) {
      parsed.user_role = String(parsed.user_role); // Ensure user_role is a string
    }

    return parsed;
  } catch (e) {
    console.error("Data sanitization error:", e);
    return null;
  }
};

export const encryptData = (data: any): string => {
  try {
    const sanitizedData = sanitizeData(data);
    if (!sanitizedData) {
      throw new Error("Invalid data format");
    }

    const jsonString = JSON.stringify(sanitizedData);
    const encrypted = CryptoJS.AES.encrypt(
      jsonString,
      ENCRYPTION_KEY
    ).toString();

    // Verify encryption worked
    try {
      const test = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      const testStr = test.toString(CryptoJS.enc.Utf8);
      if (!testStr) throw new Error("Encryption verification failed");
    } catch (e) {
      throw new Error("Encryption verification failed");
    }

    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
};

export const decryptData = (encryptedData: string): any => {
  try {
    if (!encryptedData) {
      console.error("No data to decrypt");
      return null;
    }

    // First, try to decrypt the data
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    // Verify the decrypted data is valid JSON
    if (!decryptedString || !isValidJSON(decryptedString)) {
      console.error("Invalid decrypted data format");
      return null;
    }

    // Parse and sanitize the decrypted data
    const parsedData = sanitizeData(decryptedString);
    if (!parsedData) {
      console.error("Failed to sanitize decrypted data");
      return null;
    }

    return parsedData;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};

export const secureStorage = {
  setItem: (key: string, data: any) => {
    try {
      if (!data) {
        console.error("Cannot store null or undefined data");
        return;
      }

      // Sanitize data before encryption
      const sanitizedData = sanitizeData(data);
      if (!sanitizedData) {
        console.error("Invalid data format");
        return;
      }

      const encryptedData = encryptData(sanitizedData);
      localStorage.setItem(key, encryptedData);

      // Verify storage worked
      const verify = localStorage.getItem(key);
      if (verify !== encryptedData) {
        throw new Error("Storage verification failed");
      }
    } catch (error) {
      console.error("Error storing encrypted data:", error);
      // Clear potentially corrupted data
      localStorage.removeItem(key);
    }
  },

  getItem: (key: string) => {
    try {
      const encryptedData = localStorage.getItem(key);
      if (!encryptedData) {
        return null;
      }
      const decryptedData = decryptData(encryptedData);
      if (!decryptedData) {
        // If decryption fails, clean up the corrupted data
        localStorage.removeItem(key);
      }
      return decryptedData;
    } catch (error) {
      console.error("Error retrieving encrypted data:", error);
      // Clean up potentially corrupted data
      localStorage.removeItem(key);
      return null;
    }
  },

  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing data:", error);
    }
  },

  // Helper method to clear all secure storage
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  },
};
