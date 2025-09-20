export const parseTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return "";
  // Handle both "HH:mm:ss" and "HH:mm" formats
  const parts = timeStr.split(":");
  return `${parts[0]}:${parts[1]}`;
};
