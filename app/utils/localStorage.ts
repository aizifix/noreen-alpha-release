// Use isClientSide check to maintain backward compatibility, but now safely
let isClientSide = false;

// Will be set to true only on the client side after hydration
if (typeof window !== "undefined") {
  try {
    // Check if window object is fully available
    isClientSide = !!(window.localStorage && window.document);
  } catch (e) {
    console.warn(
      "Browser environment detected but localStorage not accessible"
    );
    isClientSide = false;
  }
}

export const saveToLocalStorage = (key: string, data: any) => {
  if (!isClientSide) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving to local storage:", error);
  }
};

export const loadFromLocalStorage = (key: string) => {
  if (!isClientSide) return null;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Error loading from local storage:", error);
    return null;
  }
};

export const clearLocalStorage = (key: string) => {
  if (!isClientSide) return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error clearing local storage:", error);
  }
};
