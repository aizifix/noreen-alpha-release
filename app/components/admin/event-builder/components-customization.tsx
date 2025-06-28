"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, Edit, Trash, Lock, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  eventPackages,
  type PackageComponent as DataPackageComponent,
  ComponentCategory,
} from "@/data/packages";
import { convertPackageToComponents } from "@/data/wedding-packages";
import { venueList } from "@/data/venues";
import { type VenuePackage } from "@/app/types/index";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { type PackageComponent as AppPackageComponent } from "@/app/types/event-types";
import type { ComponentCustomizationProps } from "@/app/types/event-builder";

// Union type to accept both types of PackageComponent
type AnyPackageComponent = DataPackageComponent | AppPackageComponent;

// Helper function to create venue component (no subComponents)
const createVenueComponent = (
  selectedVenue: { name: string },
  venuePackage: VenuePackage,
  venueCost: number,
  venueId: string
): DataPackageComponent => ({
  id: `venue-${venueId}`,
  name: `${selectedVenue.name} - ${venuePackage.name}`,
  description: venuePackage.description,
  price: venueCost,
  category: "venue" as ComponentCategory,
  included: true,
  isVenueInclusion: true,
  isRemovable: false,
  isExpanded: false,
  // No subComponents
});

// Add type for custom categories
type ExtendedComponentCategory = ComponentCategory | string;

export function ComponentCustomization({
  components: initialComponents,
  selectedVenue,
  onUpdate,
  onNext,
}: ComponentCustomizationProps & { selectedVenue: any }) {
  const [componentList, setComponentList] = useState<DataPackageComponent[]>(
    initialComponents as DataPackageComponent[]
  );
  const [venueComponents, setVenueComponents] = useState<
    DataPackageComponent[]
  >([]);
  const [guestCount, setGuestCount] = useState<number>(100);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("noreen-components");
  const [editingComponent, setEditingComponent] =
    useState<DataPackageComponent | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentPrice, setNewComponentPrice] = useState(0);
  const [newComponentCategory, setNewComponentCategory] =
    useState<ExtendedComponentCategory>("extras");
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Update components when initialComponents change
  useEffect(() => {
    if (initialComponents.length > 0) {
      setComponentList(initialComponents as DataPackageComponent[]);
    }
  }, [initialComponents]);

  // Load venue components when venueId changes
  useEffect(() => {
    if (selectedVenue) {
      // Convert inclusions to components
      const venueInclusions = (selectedVenue.inclusions || []).map(
        (inclusion: any, idx: number) => ({
          id: `venue-inclusion-${inclusion.inclusion_id || idx}`,
          name: inclusion.inclusion_name,
          price: parseFloat(inclusion.inclusion_price) || 0,
          category: "venue",
          included: true,
          isVenueInclusion: true,
          isRemovable: false,
          isExpanded: false,
        })
      );
      setVenueComponents(venueInclusions);
    } else {
      setVenueComponents([]);
    }
  }, [selectedVenue]);

  const handleComponentListChange = (updatedList: DataPackageComponent[]) => {
    onUpdate([...venueComponents, ...updatedList]);
    setComponentList(updatedList);
  };

  const toggleComponentInclusion = (componentId: string) => {
    handleComponentListChange(
      componentList.map((component) => {
        if (component.id === componentId) {
          return { ...component, included: !component.included };
        }
        return component;
      })
    );
  };

  const toggleComponentExpansion = (componentId: string) => {
    setComponentList((prevComponents) =>
      prevComponents.map((component) => {
        if (component.id === componentId) {
          return { ...component, isExpanded: !component.isExpanded };
        }
        return component;
      })
    );
  };

  const handleEditComponent = (component: DataPackageComponent) => {
    setEditingComponent(component);
    setShowEditDialog(true);
  };

  const saveEditedComponent = () => {
    if (!editingComponent) return;
    handleComponentListChange(
      componentList.map((component) => {
        if (component.id === editingComponent.id) {
          return {
            ...editingComponent,
            isCustom: true,
          };
        }
        return component;
      })
    );
    setShowEditDialog(false);
    setEditingComponent(null);
  };

  const addNewComponent = () => {
    const newComponent: DataPackageComponent = {
      id: `custom-${Date.now()}`,
      name: newComponentName,
      description: newComponentName,
      price: newComponentPrice,
      category: newComponentCategory as ComponentCategory,
      included: true,
      isCustom: true,
      isRemovable: true,
      isExpanded: false,
    };
    handleComponentListChange([...componentList, newComponent]);
    setShowAddDialog(false);
    setNewComponentName("");
    setNewComponentPrice(0);
    setNewComponentCategory("extras");
  };

  const deleteComponent = (componentId: string) => {
    handleComponentListChange(
      componentList.filter((component) => component.id !== componentId)
    );
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    let total = 0;
    componentList.forEach((component) => {
      if (component.included) {
        total += component.price;
      }
    });

    return total;
  };

  // Calculate venue price
  const calculateVenuePrice = () => {
    return venueComponents
      .filter((component) => component.included !== false)
      .reduce((sum, component) => sum + component.price, 0);
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

  // Filter out venue inclusions from customizable components
  const customizableComponentList = componentList.filter(
    (comp) => !(comp.category === "venue" && comp.isVenueInclusion)
  );

  // Group customizable components by category (excluding venue inclusions)
  const componentsByCategory = customizableComponentList.reduce(
    (acc, component) => {
      if (!acc[component.category]) {
        acc[component.category] = [];
      }
      acc[component.category].push(component);
      return acc;
    },
    {} as Record<string, DataPackageComponent[]>
  );

  const handleVenuePackageLoad = (venuePackage: VenuePackage) => {
    const components: DataPackageComponent[] = [
      {
        id: venuePackage.id,
        name: venuePackage.name,
        description: venuePackage.description,
        price: venuePackage.price,
        category: "venue" as ComponentCategory,
        included: true,
        isVenueInclusion: true,
        isRemovable: false,
        isExpanded: false,
        inclusions: venuePackage.inclusions,
      },
    ];
    setComponentList(components);
    onUpdate(components);
  };

  // Update the category change handler
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditingComponent((prev) =>
      prev ? { ...prev, category: e.target.value as ComponentCategory } : null
    );
  };

  // Handle next step
  const handleNext = () => {
    if (onNext) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-green-700">
          Customize Components
        </h2>
        <p className="text-muted-foreground">
          Customize the components included in your event package.
        </p>
      </div>

      <Alert className="border-green-500 bg-green-50">
        <AlertDescription className="flex items-center">
          <Info className="h-4 w-4 mr-2 text-green-600" />
          <span>
            <strong>Venue inclusions</strong> are fixed and come with your
            selected venue package.
            <strong> Noreen components</strong> can be added, removed, or
            customized to adjust your total budget.
          </span>
        </AlertDescription>
      </Alert>

      <Alert>
        <AlertDescription className="flex items-center">
          <Lock className="h-4 w-4 mr-2" />
          <span>
            These items are included with your venue package and cannot be
            modified. The price is calculated based on your selected guest count
            ({guestCount} guests).
          </span>
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="venue-inclusions">
            <Lock className="h-4 w-4 mr-2 text-green-600" />
            Venue Inclusions
          </TabsTrigger>
          <TabsTrigger value="noreen-components">
            <Edit className="h-4 w-4 mr-2 text-green-600" />
            Noreen Components
          </TabsTrigger>
        </TabsList>

        {/* Venue Inclusions Tab */}
        <TabsContent value="venue-inclusions" className="space-y-4">
          {venueComponents.length > 0 ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>Venue Package</span>
                    <span>{formatCurrency(calculateVenuePrice())}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {venueComponents.map((component) => (
                      <div key={component.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="font-medium">
                              {component.name}
                            </span>
                          </div>
                          {component.price > 0 && (
                            <span className="font-medium">
                              {formatCurrency(component.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">No venue selected.</p>
              <p className="mt-2">
                Please select a venue in the previous step.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Noreen Components Tab */}
        <TabsContent value="noreen-components" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-green-700">
              Customizable Components
            </h3>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          </div>

          {Object.entries(componentsByCategory).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(componentsByCategory).map(
                ([category, categoryComponents]) => (
                  <div
                    key={category}
                    className="bg-white rounded-lg border border-green-200 p-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-semibold text-green-700">
                        {getCategoryName(category)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {categoryComponents.length} items
                      </span>
                    </div>
                    <div className="space-y-4">
                      <Accordion type="multiple" className="space-y-2">
                        {categoryComponents.map((component) => (
                          <AccordionItem
                            key={component.id}
                            value={component.id}
                            className="border-b last:border-b-0 border-green-100 pb-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`component-${component.id}`}
                                  checked={component.included !== false}
                                  onCheckedChange={() =>
                                    toggleComponentInclusion(component.id)
                                  }
                                  className="accent-green-600 border-green-400 focus:ring-green-600"
                                />
                                <AccordionTrigger className="flex items-center gap-2 p-0 bg-transparent border-0 shadow-none hover:bg-transparent">
                                  <span
                                    className={`font-medium ${
                                      component.included === false
                                        ? "text-muted-foreground line-through"
                                        : "text-green-900"
                                    }`}
                                  >
                                    {component.name}
                                  </span>
                                </AccordionTrigger>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-green-700">
                                  {formatCurrency(component.price)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditComponent(component)}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {component.isCustom && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      deleteComponent(component.id)
                                    }
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </div>
                )
              )}
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg mt-4">
                <span className="font-medium text-green-700">
                  Total Components Price:
                </span>
                <span className="font-bold text-green-900">
                  {formatCurrency(calculateTotalPrice())}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">No components available.</p>
              <p className="mt-2">
                Please select a package in the previous step or add custom
                components.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Component Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Component</DialogTitle>
            <DialogDescription>
              Modify the details of this component.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="component-name">Component Name</Label>
              <Input
                id="component-name"
                value={editingComponent?.name || ""}
                onChange={(e) =>
                  setEditingComponent((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="component-price">Price</Label>
              <Input
                id="component-price"
                type="number"
                value={editingComponent?.price || 0}
                onChange={(e) =>
                  setEditingComponent((prev) =>
                    prev
                      ? {
                          ...prev,
                          price: Number.parseFloat(e.target.value) || 0,
                        }
                      : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="component-category">Category</Label>
              <select
                id="component-category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                value={editingComponent?.category || "extras"}
                onChange={handleCategoryChange}
              >
                <option value="coordination">Coordination</option>
                <option value="venue">Venue & Food</option>
                <option value="attire">Attire</option>
                <option value="decor">Decoration</option>
                <option value="media">Photo & Video</option>
                <option value="extras">Extras</option>
                <option value="hotel">Hotel & Accommodation</option>
                <option value="entertainment">Entertainment</option>
                <option value="transportation">Transportation</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditedComponent}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Component Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Component</DialogTitle>
            <DialogDescription>
              Add a custom component to your event. You can select or create a
              new inclusion/category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-component-name">Component Name</Label>
              <Input
                id="new-component-name"
                value={newComponentName}
                onChange={(e) => setNewComponentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-component-price">Price</Label>
              <Input
                id="new-component-price"
                type="number"
                value={newComponentPrice}
                onChange={(e) =>
                  setNewComponentPrice(Number.parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-component-category">
                Category (Inclusion)
              </Label>
              <select
                id="new-component-category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                value={newComponentCategory}
                onChange={(e) => setNewComponentCategory(e.target.value)}
              >
                <option value="food">Food & Beverages</option>
                <option value="drinks">Drinks</option>
                <option value="desserts">Desserts</option>
                <option value="appetizers">Appetizers</option>
                <option value="attire">Attire</option>
                <option value="decor">Decoration</option>
                <option value="media">Photo & Video</option>
                <option value="extras">Extras</option>
                <option value="hotel">Hotel & Accommodation</option>
                <option value="entertainment">Entertainment</option>
                <option value="transportation">Transportation</option>
                <option value="equipment">Equipment</option>
                <option value="custom">(Create New...)</option>
              </select>
              {newComponentCategory === "custom" && (
                <Input
                  className="mt-2"
                  placeholder="Enter new category name"
                  value={
                    newComponentCategory === "custom"
                      ? ""
                      : newComponentCategory
                  }
                  onChange={(e) => setNewComponentCategory(e.target.value)}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addNewComponent} disabled={!newComponentName}>
              Add Component
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex justify-end mt-6">
        <Button onClick={handleNext}>Next Step</Button>
      </div>
    </div>
  );
}
