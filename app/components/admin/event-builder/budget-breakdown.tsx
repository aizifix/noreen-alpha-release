"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Lock } from "lucide-react";
import { PackageComponent } from "@/data/packages";

interface BudgetBreakdownProps {
  components: PackageComponent[];
  originalPackagePrice?: number | null;
  calculatedTotal?: number;
  selectedVenue?: any;
  venueCost?: number;
  className?: string;
}

export function BudgetBreakdown({
  components,
  originalPackagePrice,
  calculatedTotal = 0,
  selectedVenue,
  venueCost = 0,
}: BudgetBreakdownProps) {
  // Separate venue inclusions from Noreen components
  const venueInclusions = components.filter(
    (component) => component.included !== false && component.isVenueInclusion
  );

  const noreenComponents = components.filter(
    (component) => component.included !== false && !component.isVenueInclusion
  );

  // Group Noreen components by category
  const componentsByCategory = noreenComponents.reduce(
    (acc, component) => {
      if (!acc[component.category]) {
        acc[component.category] = [];
      }
      acc[component.category].push(component);
      return acc;
    },
    {} as Record<string, PackageComponent[]>
  );

  // Calculate category totals for Noreen components
  const categoryTotals = Object.entries(componentsByCategory).reduce(
    (acc, [category, components]) => {
      acc[category] = components.reduce(
        (sum: number, component: PackageComponent) => sum + component.price,
        0
      );
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate total budget
  const totalFromComponents = Object.values(categoryTotals).reduce(
    (sum, total) => sum + total,
    0
  );

  // Calculate total budget including venue cost
  const packagePrice =
    originalPackagePrice !== null && originalPackagePrice !== undefined
      ? originalPackagePrice
      : totalFromComponents;
  const totalBudget = packagePrice + venueCost;

  // If we have an original package price that's different from the calculated total,
  // we need to adjust the displayed prices to reflect the correct proportions
  const getAdjustedPrice = (price: number) => {
    if (
      originalPackagePrice !== null &&
      originalPackagePrice !== totalFromComponents &&
      totalFromComponents > 0
    ) {
      return price * ((originalPackagePrice ?? 0) / totalFromComponents);
    }
    return price;
  };

  // Get category display name
  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      coordination: "Coordination",
      venue: "Venue & Food",
      attire: "Attire",
      decor: "Decoration",
      media: "Photo & Video",
      extras: "Extras",
      hotel: "Hotel & Accommodation",
      entertainment: "Entertainment",
      transportation: "Transportation",
      equipment: "Equipment",
      decoration: "Decoration",
    };
    return names[category] || category;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Budget Breakdown</span>
          <span className="text-green-600">
            {formatCurrency(totalBudget || 0)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {/* Package Base Price Section */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">Package Base Price</div>
              <div className="text-right">
                <div className="font-medium text-green-600">
                  {formatCurrency(packagePrice)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Core package cost
                </div>
              </div>
            </div>
          </div>

          {/* Venue Cost Section */}
          {selectedVenue && venueCost > 0 && (
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium flex items-center">
                  <span>Venue Cost</span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-blue-600">
                    {formatCurrency(venueCost)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedVenue.venue_title}
                  </div>
                </div>
              </div>

              {selectedVenue.inclusions &&
                selectedVenue.inclusions.length > 0 && (
                  <div className="space-y-1 mt-3">
                    <div className="text-xs font-medium text-muted-foreground">
                      Includes:
                    </div>
                    {selectedVenue.inclusions.map(
                      (inclusion: any, index: number) => (
                        <div
                          key={index}
                          className="flex justify-between items-start text-xs text-muted-foreground"
                        >
                          <span>{inclusion.inclusion_name}</span>
                          <span>
                            {formatCurrency(
                              parseFloat(inclusion.inclusion_price) || 0
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          )}

          {/* Venue Inclusions Section */}
          {venueInclusions.length > 0 && (
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  Venue Inclusions
                </div>
                <Badge variant="outline">Fixed</Badge>
              </div>

              <div className="space-y-2 mt-3">
                {venueInclusions.map((inclusion) => (
                  <div
                    key={inclusion.id}
                    className="flex justify-between items-start text-sm"
                  >
                    <div className="flex-1">
                      <div>{inclusion.name}</div>
                    </div>
                    <div className="text-right ml-4">Included</div>
                  </div>
                ))}
              </div>

              <Separator className="my-2" />
            </div>
          )}

          {/* Noreen Components Section */}
          {Object.entries(componentsByCategory).map(
            ([category, components]) => {
              const categoryTotal = categoryTotals[category];
              const adjustedCategoryTotal = getAdjustedPrice(categoryTotal);
              const percentage =
                (totalBudget || 0) > 0
                  ? (adjustedCategoryTotal / (totalBudget || 0)) * 100
                  : 0;

              return (
                <div key={category} className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">
                      {getCategoryName(category)}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(adjustedCategoryTotal)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}% of total
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-3">
                    {components.map((component: PackageComponent) => {
                      const adjustedPrice = getAdjustedPrice(component.price);

                      return (
                        <div
                          key={component.id}
                          className="flex justify-between items-start text-sm"
                        >
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span>{component.name}</span>
                              {component.isCustom && (
                                <Badge className="ml-2 bg-primary text-xs">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            {component.subComponents &&
                              component.subComponents.length > 0 && (
                                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                  {component.subComponents.map((sub: any) => (
                                    <li
                                      key={sub.id}
                                      className="flex justify-between"
                                    >
                                      <span>
                                        {sub.quantity > 1 &&
                                          `${sub.quantity}x `}
                                        {sub.name}
                                        {sub.option && ` (${sub.option})`}
                                      </span>
                                      <span>
                                        {formatCurrency(
                                          sub.quantity * sub.unitPrice
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                          </div>
                          <div className="text-right ml-4">
                            {formatCurrency(adjustedPrice)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          )}

          <div className="p-4">
            <div className="flex justify-between font-medium">
              <span>Total Budget</span>
              <span className="text-green-600">
                {formatCurrency(totalBudget || 0)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
