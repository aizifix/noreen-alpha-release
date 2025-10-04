"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { weddingPackages } from "@/data/wedding-packages";
import { formatCurrency } from "@/lib/utils";
import { Check, Loader } from "lucide-react";

interface PackageDetailsProps {
  packageId: string;
}

interface DbPackage {
  package_id: string;
  package_title: string;
  package_description: string;
  package_price: string;
  guest_capacity: number;
  components: Array<{
    component_name: string;
    component_description: string;
    component_price: string;
    subcomponents?: Array<{
      subcomponent_name: string;
      subcomponent_description: string;
    }>;
  }>;
  freebies: Array<{
    freebie_name: string;
    freebie_description: string;
  }>;
  event_types: Array<{
    event_name: string;
  }>;
}

export function PackageDetails({ packageId }: PackageDetailsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [apiPackage, setApiPackage] = useState<DbPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if packageId is numeric (from database)
  const isNumericId = !isNaN(Number(packageId));

  // First check static data
  const staticPackage = weddingPackages.find((pkg) => pkg.id === packageId);

  useEffect(() => {
    const fetchPackageDetails = async () => {
      // Don't fetch if we found a match in static data
      if (staticPackage || !isNumericId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get("/admin.php", {
          params: {
            operation: "getPackageById",
            package_id: packageId,
          },
        });

        if (response.status === "success") {
          setApiPackage(response.data.package);
        } else {
          console.error(
            "Error fetching package details:",
            response.data.message
          );
          setError("Failed to load package details");
        }
      } catch (error) {
        console.error("API error:", error);
        setError("Failed to connect to server");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackageDetails();
  }, [packageId, staticPackage, isNumericId]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader className="h-6 w-6 animate-spin text-green-500 mr-2" />
          <p>Loading package details...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-red-500">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Static package data
  if (staticPackage) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-center">
            <span>{staticPackage.name}</span>
            <span className="text-rose-600">
              {formatCurrency(staticPackage.price)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inclusions">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inclusions">Inclusions</TabsTrigger>
              <TabsTrigger value="freebies">Freebies</TabsTrigger>
              <TabsTrigger value="hotels">Hotel Choices</TabsTrigger>
            </TabsList>

            <TabsContent value="inclusions" className="space-y-4 pt-4">
              <div className="space-y-4">
                {staticPackage.inclusions &&
                  staticPackage.inclusions.map((inclusion, index) => (
                    <div key={index} className="space-y-2">
                      <h3 className="font-medium capitalize">
                        {inclusion.category}
                      </h3>
                      <ul className="space-y-2">
                        {Array.isArray(inclusion.items) &&
                          inclusion.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="pl-5 relative">
                              <Check
                                size={16}
                                className="absolute left-0 top-1 text-green-500"
                              />
                              <div className="font-medium">{item}</div>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="freebies" className="pt-4">
              <div className="space-y-2">
                <h3 className="font-medium">Promo Freebies</h3>
                <ul className="space-y-2">
                  {Array.isArray(staticPackage.freebies) ? (
                    staticPackage.freebies.map((item, index) => (
                      <li key={index} className="pl-5 relative">
                        <Check
                          size={16}
                          className="absolute left-0 top-1 text-green-500"
                        />
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground">
                            {item.description}
                          </div>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">
                      No freebies available for this package
                    </li>
                  )}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="hotels" className="pt-4">
              <div className="space-y-2">
                <h3 className="font-medium">Hotel Choices</h3>
                <ul className="space-y-2">
                  {Array.isArray(staticPackage.hotelChoices) ? (
                    staticPackage.hotelChoices.map((hotel, index) => (
                      <li key={index} className="pl-5 relative">
                        <Check
                          size={16}
                          className="absolute left-0 top-1 text-green-500"
                        />
                        <div className="font-medium">{hotel}</div>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">
                      No hotel choices available for this package
                    </li>
                  )}
                </ul>
                <p className="text-sm text-muted-foreground mt-4">
                  Rates are subject to change without prior notice. Corkage and
                  additional charges are not included.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // API package data
  if (apiPackage) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-start">
            <span>{apiPackage.package_title}</span>
            <div className="text-right">
              <div className="text-rose-600 font-bold text-lg">
                {formatCurrency(parseFloat(apiPackage.package_price))}
              </div>
              <div className="text-xs text-muted-foreground">
                Package price only
              </div>
              <div className="text-xs text-green-600 mt-1">
                + Venue selection required
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inclusions">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inclusions">Components</TabsTrigger>
              <TabsTrigger value="freebies">Freebies</TabsTrigger>
              <TabsTrigger value="events">Event Types</TabsTrigger>
            </TabsList>

            <TabsContent value="inclusions" className="space-y-4 pt-4">
              <div className="space-y-4">
                {Array.isArray(apiPackage.components) &&
                apiPackage.components.length > 0 ? (
                  <ul className="space-y-3">
                    {apiPackage.components.map((comp, index) => (
                      <li key={index} className="space-y-1">
                        <div className="pl-5 relative">
                          <Check
                            size={16}
                            className="absolute left-0 top-1 text-green-500"
                          />
                          <div className="font-medium">
                            {comp.component_name}
                          </div>
                          {comp.component_description && (
                            <div className="text-sm text-muted-foreground">
                              {comp.component_description}
                            </div>
                          )}
                        </div>

                        {comp.subcomponents &&
                          comp.subcomponents.length > 0 && (
                            <ul className="pl-10 mt-1 space-y-1">
                              {comp.subcomponents.map((subcomp, subIdx) => (
                                <li key={subIdx} className="text-sm">
                                  • {subcomp.subcomponent_name}
                                </li>
                              ))}
                            </ul>
                          )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    No components available for this package
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="freebies" className="pt-4">
              <div className="space-y-2">
                <h3 className="font-medium">Freebies</h3>
                <ul className="space-y-2">
                  {Array.isArray(apiPackage.freebies) &&
                  apiPackage.freebies.length > 0 ? (
                    apiPackage.freebies.map((freebie, index) => (
                      <li key={index} className="pl-5 relative">
                        <Check
                          size={16}
                          className="absolute left-0 top-1 text-green-500"
                        />
                        <div className="font-medium">
                          {freebie.freebie_name}
                        </div>
                        {freebie.freebie_description && (
                          <div className="text-sm text-muted-foreground">
                            {freebie.freebie_description}
                          </div>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">
                      No freebies available for this package
                    </li>
                  )}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="events" className="pt-4">
              <div className="space-y-2">
                <h3 className="font-medium">Suitable For</h3>
                <ul className="space-y-2">
                  {Array.isArray(apiPackage.event_types) &&
                  apiPackage.event_types.length > 0 ? (
                    apiPackage.event_types.map((eventType, index) => (
                      <li key={index} className="pl-5 relative">
                        <Check
                          size={16}
                          className="absolute left-0 top-1 text-green-500"
                        />
                        <div className="font-medium">
                          {eventType.event_name}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">
                      No event types specified for this package
                    </li>
                  )}
                </ul>
                <p className="text-sm text-muted-foreground mt-4">
                  Rates are subject to change without prior notice. Corkage and
                  additional charges are not included.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // Not found
  return <div>Package not found</div>;
}
