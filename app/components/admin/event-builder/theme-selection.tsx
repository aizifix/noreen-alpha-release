"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface EventTheme {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  colors: string[];
}

// Temporary mock data until @/data/themes is created
const eventThemes: EventTheme[] = [
  {
    id: "1",
    name: "Classic Elegance",
    description: "Timeless and sophisticated design",
    imageUrl: "/placeholder.svg?height=200&width=400",
    price: 1000,
    colors: ["#FFFFFF", "#000000", "#C0C0C0"]
  },
  // Add more themes as needed
];

interface ThemeSelectionProps {
  onSelect: (themeId: string | null) => void;
  selectedThemeId?: string | null;
}

export function ThemeSelection({
  onSelect,
  selectedThemeId,
}: ThemeSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select a Theme</h2>
        <p className="text-muted-foreground">
          Choose a theme for your event or skip to use a custom theme.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {eventThemes.map((theme: EventTheme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={selectedThemeId === theme.id}
            onSelect={() => onSelect(theme.id)}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => onSelect(null)}
          className={!selectedThemeId ? "border-primary text-primary" : ""}
        >
          No Theme / Custom Theme
        </Button>
      </div>
    </div>
  );
}

interface ThemeCardProps {
  theme: EventTheme;
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeCard({ theme, isSelected, onSelect }: ThemeCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <div className="relative h-48 w-full">
        <Image
          src={theme.imageUrl || "/placeholder.svg?height=200&width=400"}
          alt={theme.name}
          fill
          className="object-cover"
        />
      </div>
      <CardHeader>
        <CardTitle>{theme.name}</CardTitle>
        <CardDescription>{theme.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <span>Price:</span>
          <span className="font-medium">{formatCurrency(theme.price)}</span>
        </div>
        <div className="flex gap-2">
          {theme.colors.map((color: string, index: number) => (
            <div
              key={index}
              className="w-6 h-6 rounded-full border"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={isSelected ? "default" : "outline"}
          onClick={onSelect}
        >
          {isSelected ? "Selected" : "Select Theme"}
        </Button>
      </CardFooter>
    </Card>
  );
}
