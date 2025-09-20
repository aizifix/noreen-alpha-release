"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  User,
  ExternalLink,
  Info,
  Lock,
  Edit,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";

// Types
interface Inclusion {
  inclusion_id: number;
  inclusion_name: string;
  inclusion_description: string | null;
  inclusion_price: number;
  display_order: number;
  is_supplier_service?: boolean;
  supplier_id?: number;
  supplier_name?: string;
  included?: boolean;
  isRemovable?: boolean;
}

interface Supplier {
  supplier_id: number;
  supplier_name: string;
  supplier_category: string;
  services: Service[];
}

interface Service {
  service_id: number;
  service_name: string;
  service_description: string | null;
  service_price: number;
}

interface CustomInclusion {
  name: string;
  description: string;
  price: number;
  is_external: boolean;
}

interface InclusionsStepProps {
  packageId: number | null;
  venueId: number | null; // Add venueId to props
  packageInclusions: Inclusion[];
  customInclusions: Inclusion[];
  removedInclusions: Inclusion[];
  supplierServices: Inclusion[];
  externalCustomizations: CustomInclusion[];
  onAddInclusion: (inclusion: Inclusion) => void;
  onRemoveInclusion: (inclusionId: number) => void;
  onRestoreInclusion: (inclusionId: number) => void;
  onAddSupplierService: (service: Inclusion) => void;
  onRemoveSupplierService: (serviceId: number) => void;
  onAddExternalCustomization: (customization: CustomInclusion) => void;
  onRemoveExternalCustomization: (index: number) => void;
  totalPrice: number;
}

export default function InclusionsStep({
  packageId,
  venueId, // Add venueId to props
  packageInclusions,
  customInclusions,
  removedInclusions,
  supplierServices,
  externalCustomizations,
  onAddInclusion,
  onRemoveInclusion,
  onRestoreInclusion,
  onAddSupplierService,
  onRemoveSupplierService,
  onAddExternalCustomization,
  onRemoveExternalCustomization,
  totalPrice,
}: InclusionsStepProps) {
  // State
  const [availableInclusions, setAvailableInclusions] = useState<Inclusion[]>(
    []
  );
  const [venueInclusions, setVenueInclusions] = useState<Inclusion[]>([]);
  const [venueInclusionsPrice, setVenueInclusionsPrice] = useState(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("current");
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [newCustomInclusion, setNewCustomInclusion] = useState<CustomInclusion>(
    {
      name: "",
      description: "",
      price: 0,
      is_external: true,
    }
  );
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );

  // Format price with proper formatting
  const formatPrice = (amount: number): string => {
    return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch data on mount
  useEffect(() => {
    fetchAvailableInclusions();
    fetchSuppliers();
    if (venueId) {
      fetchVenueInclusions(venueId);
    }
  }, [venueId]);

  // Fetch venue inclusions
  const fetchVenueInclusions = async (venueId: number) => {
    try {
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: {
            operation: "getVenueInclusions",
            venue_id: venueId,
          },
        }
      );

      if (response.data.status === "success") {
        const inclusions = response.data.inclusions || [];
        setVenueInclusions(inclusions);
        const total = inclusions.reduce(
          (sum: number, inc: Inclusion) => sum + inc.inclusion_price,
          0
        );
        setVenueInclusionsPrice(total);
      }
    } catch (err) {
      console.error("Error fetching venue inclusions:", err);
    }
  };

  // Fetch available inclusions
  const fetchAvailableInclusions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: { operation: "getAllInclusions" },
        }
      );

      if (response.data.status === "success") {
        setAvailableInclusions(response.data.inclusions || []);
      }
    } catch (err) {
      console.error("Error fetching inclusions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: { operation: "getSuppliersWithTiers" },
        }
      );

      if (response.data.status === "success") {
        setSuppliers(response.data.suppliers || []);
      }
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  // Toggle inclusion status (included/excluded)
  const toggleInclusionStatus = (inclusionId: number) => {
    const isRemoved = removedInclusions.some(
      (inc) => inc.inclusion_id === inclusionId
    );

    if (isRemoved) {
      onRestoreInclusion(inclusionId);
    } else {
      onRemoveInclusion(inclusionId);
    }
  };

  // Check if inclusion is already added
  const isInclusionAdded = (inclusionId: number): boolean => {
    // Check if it's in package inclusions but not removed
    const isPackageInclusion = packageInclusions.some(
      (inc) => inc.inclusion_id === inclusionId
    );
    const isRemoved = removedInclusions.some(
      (inc) => inc.inclusion_id === inclusionId
    );

    // Check if it's in custom inclusions
    const isCustomInclusion = customInclusions.some(
      (inc) => inc.inclusion_id === inclusionId
    );

    // Check if it's in supplier services
    const isSupplierService = supplierServices.some(
      (inc) => inc.inclusion_id === inclusionId
    );

    return (
      (isPackageInclusion && !isRemoved) ||
      isCustomInclusion ||
      isSupplierService
    );
  };

  // Add a custom external inclusion
  const handleAddCustomInclusion = () => {
    if (!newCustomInclusion.name) {
      toast({
        title: "Missing information",
        description: "Please provide a name for your custom inclusion",
        variant: "destructive",
      });
      return;
    }

    if (newCustomInclusion.price < 0) {
      toast({
        title: "Invalid price",
        description: "Price cannot be negative",
        variant: "destructive",
      });
      return;
    }

    onAddExternalCustomization(newCustomInclusion);
    setNewCustomInclusion({
      name: "",
      description: "",
      price: 0,
      is_external: true,
    });
    setShowCustomDialog(false);

    toast({
      title: "Custom inclusion added",
      description: "Your custom inclusion has been added to the booking",
    });
  };

  // Handle selecting a supplier service
  const handleSelectSupplierService = (service: Service) => {
    if (!selectedSupplier) return;

    const supplierService: Inclusion = {
      inclusion_id: service.service_id,
      inclusion_name: service.service_name,
      inclusion_description: service.service_description,
      inclusion_price: service.service_price,
      display_order: 0,
      is_supplier_service: true,
      supplier_id: selectedSupplier.supplier_id,
      supplier_name: selectedSupplier.supplier_name,
    };

    onAddSupplierService(supplierService);

    toast({
      title: "Service added",
      description: `Added ${service.service_name} from ${selectedSupplier.supplier_name}`,
    });
  };

  // Filter inclusions based on search
  const filteredInclusions = availableInclusions.filter((inclusion) => {
    // Filter by search query
    const matchesSearch =
      inclusion.inclusion_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (inclusion.inclusion_description &&
        inclusion.inclusion_description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // Calculate total inclusions
  const totalInclusionsCount =
    packageInclusions.length -
    removedInclusions.length +
    customInclusions.length +
    supplierServices.length +
    externalCustomizations.length;

  // Get all current inclusions (package, custom and supplier)
  const getAllInclusions = () => {
    return [...packageInclusions, ...customInclusions, ...supplierServices].map(
      (inc) => ({ ...inc, isRemovable: true })
    );
  };

  // Group inclusions by category
  const groupInclusionsByCategory = (inclusions: Inclusion[]) => {
    const categories: Record<string, Inclusion[]> = {};

    inclusions.forEach((inclusion) => {
      // Determine the category
      let category = inclusion.is_supplier_service ? "supplier" : "standard";

      // Create the category if it doesn't exist
      if (!categories[category]) {
        categories[category] = [];
      }

      // Add the inclusion to the category
      categories[category].push(inclusion);
    });

    return categories;
  };

  // Get category name
  const getCategoryName = (category: string): string => {
    const names: Record<string, string> = {
      standard: "Standard Inclusions",
      supplier: "Supplier Services",
      external: "External Customizations",
    };

    return names[category] || category;
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    if (category === "supplier")
      return <User className="h-4 w-4 text-blue-600" />;
    if (category === "external")
      return <ExternalLink className="h-4 w-4 text-purple-600" />;
    return <Package className="h-4 w-4 text-green-600" />;
  };

  return (
    <div className="space-y-6 animate-fadeSlideIn">
      {/* Inclusions Summary */}
      <Card className="bg-[#028A75]/5 border-[#028A75]/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-[#028A75]">Inclusions</h3>
              <p className="text-sm text-gray-600">
                {totalInclusionsCount} inclusions selected
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

      {/* Informational Alert */}
      <Alert className="border-green-500 bg-green-50">
        <AlertDescription className="flex items-center">
          <Info className="h-4 w-4 mr-2 text-green-600" />
          <span>
            <strong>Customize your event</strong> by selecting inclusions that
            match your needs. You can also add external customizations or
            supplier services.
          </span>
        </AlertDescription>
      </Alert>

      {/* Button Row for Adding Custom/Supplier */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setShowCustomDialog(true)}
          className="bg-[#028A75] hover:bg-[#028A75]/90 flex items-center"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Add External Customization
        </Button>

        <Button
          onClick={() => setShowSupplierDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"
        >
          <User className="h-4 w-4 mr-2" />
          Add Supplier Service
        </Button>
      </div>

      {/* Main Inclusions Area */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-lg text-[#028A75]">
            Event Inclusions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs
            defaultValue="current"
            className="w-full"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger
                value="current"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#028A75]"
              >
                <Package className="h-4 w-4 mr-2" />
                Event Inclusions
              </TabsTrigger>
              <TabsTrigger
                value="venue"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#028A75]"
              >
                <Lock className="h-4 w-4 mr-2" />
                Venue Inclusions
              </TabsTrigger>
            </TabsList>

            {/* Current Inclusions Tab */}
            <TabsContent value="current" className="p-4 space-y-6">
              {getAllInclusions().length > 0 ? (
                <div className="space-y-6">
                  {/* Group by categories */}
                  {Object.entries(
                    groupInclusionsByCategory(getAllInclusions())
                  ).map(([category, inclusions]) => (
                    <div
                      key={category}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                    >
                      <div className="bg-gray-50 border-b px-4 py-3 flex items-center gap-2">
                        {getCategoryIcon(category)}
                        <h3 className="font-medium">
                          {getCategoryName(category)}
                        </h3>
                        <Badge variant="outline" className="ml-2 bg-white">
                          {inclusions.length} items
                        </Badge>
                      </div>

                      <div className="divide-y">
                        {inclusions.map((inclusion) => {
                          const isRemoved = removedInclusions.some(
                            (inc) => inc.inclusion_id === inclusion.inclusion_id
                          );

                          return (
                            <div
                              key={`inclusion-${inclusion.inclusion_id}`}
                              className="p-4 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    id={`inclusion-${inclusion.inclusion_id}`}
                                    checked={!isRemoved}
                                    onCheckedChange={() =>
                                      toggleInclusionStatus(
                                        inclusion.inclusion_id
                                      )
                                    }
                                    className="mt-1"
                                  />
                                  <div>
                                    <div
                                      className={`font-medium ${isRemoved ? "text-gray-500" : ""}`}
                                    >
                                      {inclusion.inclusion_name}
                                    </div>
                                    {inclusion.inclusion_description && (
                                      <p
                                        className={`text-sm mt-1 ${isRemoved ? "text-gray-400" : "text-gray-600"}`}
                                      >
                                        {inclusion.inclusion_description}
                                      </p>
                                    )}
                                    {inclusion.supplier_name && (
                                      <Badge
                                        variant="outline"
                                        className="mt-2 bg-blue-50 text-blue-700 border-blue-200"
                                      >
                                        <User className="h-3 w-3 mr-1" />{" "}
                                        {inclusion.supplier_name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div
                                    className={`font-semibold ${isRemoved ? "text-gray-400" : "text-[#028A75]"}`}
                                  >
                                    {formatPrice(inclusion.inclusion_price)}
                                  </div>
                                  {isRemoved && (
                                    <span className="text-xs text-gray-500">
                                      (Not included)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* External Customizations (if any) */}
                  {externalCustomizations.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-purple-50 border-b px-4 py-3 flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-purple-600" />
                        <h3 className="font-medium">External Customizations</h3>
                        <Badge
                          variant="outline"
                          className="ml-2 bg-white text-purple-700 border-purple-200"
                        >
                          {externalCustomizations.length} items
                        </Badge>
                      </div>

                      <div className="divide-y">
                        {externalCustomizations.map((customization, index) => (
                          <div key={`external-${index}`} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-start gap-3">
                                <div className="w-5 flex justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() =>
                                      onRemoveExternalCustomization(index)
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {customization.name}
                                  </div>
                                  {customization.description && (
                                    <p className="text-sm mt-1 text-gray-600">
                                      {customization.description}
                                    </p>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="mt-2 bg-purple-50 text-purple-700 border-purple-200"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />{" "}
                                    External
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-purple-600">
                                  {formatPrice(customization.price)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-600">No inclusions selected</p>
                  <p className="text-sm text-gray-500">
                    Add inclusions from the "Available Inclusions" tab
                  </p>
                </div>
              )}

              {/* No Package Selected */}
              {!packageId && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-yellow-800">
                    You are creating a custom booking without a pre-selected
                    package. Add any inclusions you need from the "Available
                    Inclusions" tab.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Venue Inclusions Tab */}
            <TabsContent value="venue" className="p-4 space-y-4">
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">
                        Venue Inclusions Total
                      </h3>
                      <p className="text-sm text-gray-600">
                        {venueInclusions.length} items included with your venue
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-800">
                        {formatPrice(venueInclusionsPrice)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {venueInclusions.length > 0 ? (
                <div className="space-y-2">
                  {venueInclusions.map((inclusion) => (
                    <Card
                      key={`venue-inc-${inclusion.inclusion_id}`}
                      className="bg-gray-50 border-gray-200"
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center">
                          <Lock className="h-4 w-4 mr-3 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-800">
                              {inclusion.inclusion_name}
                            </div>
                            {inclusion.inclusion_description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {inclusion.inclusion_description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          {formatPrice(inclusion.inclusion_price)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-600">No venue-specific inclusions</p>
                  <p className="text-sm text-gray-500">
                    This venue does not have any locked inclusions.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Summary Footer */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Total Selections</h3>
              <p className="text-sm text-gray-600">
                {totalInclusionsCount} inclusions
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Total Value</div>
              <div className="text-xl font-bold text-[#028A75] flex items-center">
                {formatPrice(totalPrice)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* External Customization Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add External Customization</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-name">Name *</Label>
              <Input
                id="custom-name"
                value={newCustomInclusion.name}
                onChange={(e) =>
                  setNewCustomInclusion({
                    ...newCustomInclusion,
                    name: e.target.value,
                  })
                }
                placeholder="Enter customization name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-description">Description</Label>
              <Textarea
                id="custom-description"
                value={newCustomInclusion.description}
                onChange={(e) =>
                  setNewCustomInclusion({
                    ...newCustomInclusion,
                    description: e.target.value,
                  })
                }
                placeholder="Add details about this customization"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-price">Price</Label>
              <Input
                id="custom-price"
                type="number"
                min="0"
                value={newCustomInclusion.price}
                onChange={(e) =>
                  setNewCustomInclusion({
                    ...newCustomInclusion,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCustomDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#028A75] hover:bg-[#028A75]/90"
              onClick={handleAddCustomInclusion}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Customization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Services Dialog */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Supplier Services</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {/* Supplier List */}
            <div className="border-r pr-4">
              <h3 className="text-sm font-medium mb-3">Select Supplier</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.supplier_id}
                    className={`p-2 rounded-md cursor-pointer flex items-center gap-2 ${selectedSupplier?.supplier_id === supplier.supplier_id ? "bg-blue-100 border border-blue-300" : "hover:bg-gray-100 border border-gray-200"}`}
                    onClick={() => setSelectedSupplier(supplier)}
                  >
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">
                        {supplier.supplier_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {supplier.supplier_category}
                      </p>
                    </div>
                    {selectedSupplier?.supplier_id === supplier.supplier_id && (
                      <Check className="h-4 w-4 ml-auto text-blue-600" />
                    )}
                  </div>
                ))}
                {suppliers.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No suppliers available
                  </div>
                )}
              </div>
            </div>

            {/* Services List */}
            <div className="col-span-2">
              <h3 className="text-sm font-medium mb-3">Available Services</h3>
              {selectedSupplier ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {selectedSupplier.services?.length > 0 ? (
                    selectedSupplier.services.map((service) => (
                      <Card key={service.service_id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">
                                {service.service_name}
                              </h4>
                              {service.service_description && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {service.service_description}
                                </p>
                              )}
                              <p className="text-sm font-semibold text-blue-600 mt-1">
                                {formatPrice(service.service_price)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleSelectSupplierService(service)
                              }
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No services available from this supplier
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-gray-500">
                  <User className="h-12 w-12 mb-2 text-gray-300" />
                  <p>Please select a supplier to view available services</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSupplierDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
