"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  DollarSign,
  Check,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import axios from "axios";

// Types
interface Component {
  component_id: number;
  component_name: string;
  component_description: string | null;
  component_price: number;
  display_order: number;
}

interface ComponentsStepProps {
  packageId: number | null;
  packageComponents: Component[];
  customComponents: Component[];
  removedComponents: Component[];
  onAddComponent: (component: Component) => void;
  onRemoveComponent: (componentId: number) => void;
  onRestoreComponent: (componentId: number) => void;
  totalPrice: number;
}

export default function ComponentsStep({
  packageId,
  packageComponents,
  customComponents,
  removedComponents,
  onAddComponent,
  onRemoveComponent,
  onRestoreComponent,
  totalPrice,
}: ComponentsStepProps) {
  // State
  const [availableComponents, setAvailableComponents] = useState<Component[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadingPackageComponents, setLoadingPackageComponents] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  // Format price with proper formatting
  const formatPrice = (amount: number): string => {
    return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch data on mount
  useEffect(() => {
    fetchAvailableComponents();
  }, []);

  // Fetch available components
  const fetchAvailableComponents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: { operation: "getAllPackageComponents" },
        }
      );

      if (response.data.status === "success") {
        setAvailableComponents(response.data.components || []);
      }
    } catch (err) {
      console.error("Error fetching components:", err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle description expansion
  const toggleExpand = (id: number) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter((expandedId) => expandedId !== id));
    } else {
      setExpandedIds([...expandedIds, id]);
    }
  };

  // Check if component is already added
  const isComponentAdded = (componentId: number): boolean => {
    // Check if it's in package components but not removed
    const isPackageComponent = packageComponents.some(
      (comp) => comp.component_id === componentId
    );
    const isRemoved = removedComponents.some(
      (comp) => comp.component_id === componentId
    );

    // Check if it's in custom components
    const isCustomComponent = customComponents.some(
      (comp) => comp.component_id === componentId
    );

    return (isPackageComponent && !isRemoved) || isCustomComponent;
  };

  // Filter components based on search
  const filteredComponents = availableComponents.filter((component) => {
    // Filter by search query
    const matchesSearch =
      component.component_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (component.component_description &&
        component.component_description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeSlideIn">
      {/* Current Components Summary */}
      <Card className="bg-[#028A75]/5 border-[#028A75]/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-[#028A75]">Current Components</h3>
              <p className="text-sm text-gray-600">
                {packageComponents.length -
                  removedComponents.length +
                  customComponents.length}{" "}
                components selected
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Total Value</div>
              <div className="text-xl font-bold text-[#028A75]">
                {formatPrice(totalPrice)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingPackageComponents && (
        <div className="flex justify-center items-center py-6">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#028A75]"></div>
          <span className="ml-3 text-gray-600">
            Loading package components...
          </span>
        </div>
      )}

      {/* Tabs for Current vs Available */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="current">Current Components</TabsTrigger>
          <TabsTrigger value="available">Add Components</TabsTrigger>
        </TabsList>

        {/* Current Components Tab */}
        <TabsContent value="current" className="space-y-4 mt-4">
          {/* Combined Components List */}
          {(packageComponents.length > 0 || customComponents.length > 0) && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                Event Components
              </h3>
              <div className="space-y-2">
                {[...packageComponents, ...customComponents].map(
                  (component) => {
                    const isRemoved = removedComponents.some(
                      (comp) => comp.component_id === component.component_id
                    );
                    const isCustom = customComponents.some(
                      (comp) => comp.component_id === component.component_id
                    );

                    return (
                      <Card
                        key={component.component_id}
                        className={`transition-all duration-200 ${
                          isCustom ? "border-[#028A75]/20 bg-[#028A75]/5" : ""
                        }`}
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Checkbox
                                  id={`comp-${component.component_id}`}
                                  checked={!isRemoved}
                                  onCheckedChange={() => {
                                    if (isRemoved) {
                                      onRestoreComponent(
                                        component.component_id
                                      );
                                    } else {
                                      onRemoveComponent(component.component_id);
                                    }
                                  }}
                                  className="mr-3"
                                />
                                <div
                                  className={`font-medium ${
                                    isRemoved ? "text-gray-500" : ""
                                  }`}
                                >
                                  {component.component_name}
                                </div>
                              </div>
                              <div
                                className={`text-sm font-medium ${
                                  isRemoved ? "text-gray-400" : "text-[#028A75]"
                                }`}
                              >
                                {formatPrice(component.component_price)}
                              </div>
                            </div>
                            {component.component_description && (
                              <p
                                className={`text-xs mt-1 line-clamp-1 ml-7 ${
                                  isRemoved ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                {component.component_description}
                              </p>
                            )}
                            {isRemoved && (
                              <div className="ml-7 text-xs text-gray-400 mt-1">
                                Not included in booking
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {packageComponents.length === 0 && customComponents.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-600">No components added yet</p>
              <p className="text-sm text-gray-500">
                Add components from the "Add Components" tab
              </p>
            </div>
          )}

          {/* No Package Selected */}
          {!packageId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-yellow-800">
                You are creating a custom booking without a pre-selected
                package. Add any components you need from the "Add Components"
                tab.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Available Components Tab */}
        <TabsContent value="available" className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="h-4 w-4 text-gray-500 absolute left-3 top-3" />
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#028A75]"></div>
                <p className="text-sm text-gray-500 mt-2">
                  Loading components...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Components List */}
              <div className="space-y-2">
                {filteredComponents.length > 0 ? (
                  filteredComponents.map((component) => (
                    <Card
                      key={`available-${component.component_id}`}
                      className={`transition-all duration-200 ${
                        isComponentAdded(component.component_id)
                          ? "border-[#028A75] bg-[#028A75]/5"
                          : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium flex items-center">
                                {component.component_name}
                              </div>
                              <div className="font-semibold text-[#028A75]">
                                {formatPrice(component.component_price)}
                              </div>
                            </div>

                            {/* Description */}
                            {component.component_description && (
                              <div className="relative">
                                <p
                                  className={`text-sm text-gray-600 ${
                                    expandedIds.includes(component.component_id)
                                      ? ""
                                      : "line-clamp-2"
                                  }`}
                                >
                                  {component.component_description}
                                </p>
                                {component.component_description.length >
                                  120 && (
                                  <button
                                    onClick={() =>
                                      toggleExpand(component.component_id)
                                    }
                                    className="text-xs text-blue-600 mt-1 flex items-center"
                                  >
                                    {expandedIds.includes(
                                      component.component_id
                                    ) ? (
                                      <>
                                        <ChevronUp className="h-3 w-3 mr-1" />
                                        Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                        Show more
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="ml-4 flex items-start">
                            <Checkbox
                              id={`add-comp-${component.component_id}`}
                              checked={isComponentAdded(component.component_id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  onAddComponent(component);
                                } else {
                                  onRemoveComponent(component.component_id);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-600">No components found</p>
                    <p className="text-sm text-gray-500">
                      Try adjusting your search terms
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                      }}
                      className="mt-4"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" /> Clear Search
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Footer */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Total Selections</h3>
              <p className="text-sm text-gray-600">
                {packageComponents.length -
                  removedComponents.length +
                  customComponents.length}{" "}
                components
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Total Value</div>
              <div className="text-xl font-bold text-[#028A75] flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                {formatPrice(totalPrice)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
