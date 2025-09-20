const isServer = typeof window === "undefined";

export const saveToLocalStorage = (key: string, data: any) => {
  if (isServer) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving to local storage:", error);
  }
};

export const loadFromLocalStorage = (key: string) => {
  if (isServer) return null;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Error loading from local storage:", error);
    return null;
  }
};

export const clearLocalStorage = (key: string) => {
  if (isServer) return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error clearing local storage:", error);
  }
};
