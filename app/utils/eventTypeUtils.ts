export const getEventTypeIdFromName = (typeName: string): number => {
  const eventTypeMap: Record<string, number> = {
    wedding: 1,
    anniversary: 2,
    birthday: 3,
    corporate: 4,
    other: 5,
    others: 5,
    baptism: 10,
    "baby-shower": 11,
    reunion: 12,
    festival: 13,
    engagement: 14,
    christmas: 15,
    "new-year": 16,
  };

  const eventTypeId = eventTypeMap[typeName.toLowerCase()] || 5; // Default to "Others" (5) if not found
  console.log(`Event type "${typeName}" mapped to ID: ${eventTypeId}`);
  return eventTypeId;
};

export const mapEventType = (eventTypeName: string): string => {
  if (!eventTypeName) return "other";

  const typeMap: Record<string, string> = {
    wedding: "wedding",
    anniversary: "anniversary",
    birthday: "birthday",
    "corporate event": "corporate",
    others: "other",
    baptism: "baptism",
    "baby shower": "baby-shower",
    reunion: "reunion",
    festival: "festival",
    "engagement party": "engagement",
    "christmas party": "christmas",
    "new year's party": "new-year",
  };

  const normalizedType = eventTypeName.toLowerCase().trim();
  return typeMap[normalizedType] || "other";
};
