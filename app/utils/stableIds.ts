/**
 * Utility for generating stable IDs that don't cause hydration mismatches
 */

// Counter that increments for each ID generated in the session
let counter = 0;

// Generate a stable ID with a prefix
export function generateStableId(prefix: string = "id"): string {
  // Use a counter instead of random values or timestamps
  counter += 1;
  return `${prefix}-${counter}`;
}

// Generate a more complex ID for components that need uniqueness
// Uses a hash of the input string for consistency
export function generateStableHashId(
  input: string,
  prefix: string = "id"
): string {
  // Simple string hash function for consistency
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use absolute value and format as hex
  const hashString = Math.abs(hash).toString(16);
  return `${prefix}-${hashString}`;
}

// For cases where we need a predictable temporary ID (like in forms)
export function generateTempId(index: number, prefix: string = "temp"): string {
  return `${prefix}-${index}`;
}
