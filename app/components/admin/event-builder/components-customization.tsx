"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Minus,
  Edit,
  Trash,
  Lock,
  Info,
  User,
  Building,
} from "lucide-react";
import { endpoints } from "@/app/config/api";
import { formatCurrency } from "@/lib/utils";
import {
  eventPackages,
  type PackageComponent as DataPackageComponent,
  ComponentCategory,
  type VenueChoice,
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
import { SupplierSelectionModal } from "./supplier-selection-modal";

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

// Supplier interface - matching package details structure
interface Supplier {
  supplier_id: number;
  supplier_name: string;
  supplier_category: string;
  supplier_email: string;
  supplier_phone: string;
  supplier_status: string;
  is_verified: boolean;
  created_at: string;
  offers: SupplierOffer[];
  services?: Service[];
}

interface SupplierOffer {
  offer_id: number;
  offer_title: string;
  offer_description: string;
  price_min: number | string;
  price_max: number | string;
  tier_level: number;
  is_customizable?: boolean;
  offer_attachments: any[];
}

interface Service {
  service_id: number;
  service_name: string;
  service_description: string | null;
  service_price: number | string;
}

// Extended component with supplier assignment
export interface ComponentWithSupplier extends DataPackageComponent {
  assignedSupplier?: Supplier;
  supplierPrice?: number;
  supplier_id?: number;
  offer_id?: number;
}

export function ComponentCustomization({
  components: initialComponents,
  selectedVenue,
  onUpdate,
  eventDetails,
  isStartFromScratch = false,
  selectedPackageId,
  venueBufferFee,
  originalPackagePrice,
}: ComponentCustomizationProps & { selectedVenue?: any }) {
  const [componentList, setComponentList] = useState<DataPackageComponent[]>(
    initialComponents as DataPackageComponent[]
  );
  const [venueComponents, setVenueComponents] = useState<
    DataPackageComponent[]
  >([]);
  const [guestCount, setGuestCount] = useState<number>(100);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("noreen-components");
  const [editingComponent, setEditingComponent] =
    useState<DataPackageComponent | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentPrice, setNewComponentPrice] = useState(0);
  const [newComponentCategory, setNewComponentCategory] =
    useState<ExtendedComponentCategory>("extras");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<number>>(
    new Set()
  );

  // Supplier selection modal state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedComponentForSupplier, setSelectedComponentForSupplier] =
    useState<DataPackageComponent | null>(null);

  // Debug modal state changes
  useEffect(() => {
    console.log("🔄 Supplier modal state changed:", showSupplierModal);
  }, [showSupplierModal]);

  // Venue choice selection state
  const [selectedVenueChoice, setSelectedVenueChoice] =
    useState<VenueChoice | null>(null);

  // Ref to track unique ID counter
  const uniqueIdCounter = useRef(0);

  // Update components when initialComponents change
  useEffect(() => {
    if (initialComponents.length > 0) {
      // Filter out venue components from initialComponents to prevent duplicates
      // Venue components will be handled separately by the venue useEffect
      const nonVenueComponents = initialComponents.filter(
        (comp) => !(comp.category === "venue" && comp.isVenueInclusion)
      ) as DataPackageComponent[];

      setComponentList(nonVenueComponents);
    }
  }, [initialComponents]);

  // Fetch inclusions from API whenever a package is selected/changes
  useEffect(() => {
    const fetchPackageComponents = async (pkgId: string) => {
      try {
        const response = await axios.get(endpoints.admin, {
          params: {
            operation: "getPackageDetails",
            package_id: pkgId,
          },
        });

        if (response.data?.status === "success") {
          const packageData = response.data.package;
          const inclusions = packageData?.inclusions || [];

          const mapped: DataPackageComponent[] = inclusions.map(
            (inc: any, incIndex: number) => ({
              id: `inc-${String(pkgId)}-${incIndex}`,
              name: inc.name,
              price: parseFloat(inc.price) || 0,
              description: inc.name,
              category: "package" as ComponentCategory,
              included: true,
              isCustom: false,
              isExpanded: false,
              subComponents:
                (inc.components || []).map((comp: any, compIndex: number) => ({
                  id: `inc-${String(pkgId)}-${incIndex}-comp-${compIndex}`,
                  name: comp.name,
                  quantity: 1,
                  // Do not double-count nested items in totals; show detail only
                  unitPrice: 0,
                  description: Array.isArray(comp.subComponents)
                    ? comp.subComponents.map((sc: any) => sc.name).join(", ")
                    : undefined,
                })) || [],
            })
          );

          setComponentList(mapped);
          onUpdate([...venueComponents, ...mapped]);
        }
      } catch (error) {
        console.error("Failed to fetch package components:", error);
      }
    };

    if (selectedPackageId) {
      fetchPackageComponents(String(selectedPackageId));
    }
  }, [selectedPackageId]);

  // Load venue as a single component when venueId changes
  useEffect(() => {
    // Check if venue component already exists in the main components array
    const existingVenueComponent = initialComponents.find(
      (comp) => comp.category === "venue" && comp.isVenueInclusion
    );

    if (existingVenueComponent) {
      // Use existing venue component
      setVenueComponents([existingVenueComponent]);
    } else if (selectedVenue) {
      // Calculate venue cost using NEW FORMULA
      const venueRate = parseFloat(selectedVenue.extra_pax_rate) || 0;
      const clientPax = parseInt(eventDetails?.capacity?.toString() || "100");

      // Calculate actual venue cost: VenueRate × ClientPax
      const actualVenueCost = venueRate * clientPax;

      // For start-from-scratch events, use the actual venue cost
      // For package-based events, this will be handled by the excess payment calculation
      const totalVenuePrice = actualVenueCost;

      // Create a single venue component (not broken down into inclusions)
      const venueComponent = {
        id: `venue-${selectedVenue.venue_id}`,
        name: selectedVenue.venue_title || selectedVenue.venue_name,
        description: `Venue: ${selectedVenue.venue_title || selectedVenue.venue_name} (₱${venueRate.toLocaleString()} × ${clientPax} guests = ₱${actualVenueCost.toLocaleString()})`,
        price: totalVenuePrice,
        category: "venue" as ComponentCategory,
        included: true,
        isVenueInclusion: true,
        isRemovable: false,
        isExpanded: false,
        venueInclusions: selectedVenue.inclusions || [], // Store for display only
      };
      setVenueComponents([venueComponent]);
    } else {
      // No venue selected yet
      setVenueComponents([]);
    }
  }, [
    selectedVenue?.venue_id,
    selectedVenue?.venue_title,
    selectedVenue?.venue_name,
    selectedVenue?.venue_price,
    selectedVenue?.extra_pax_rate,
    eventDetails?.capacity,
    initialComponents,
  ]);

  // Fetch suppliers from backend using the same approach as package details
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setIsLoadingSuppliers(true);
        console.log("🔍 Fetching suppliers for event builder...");

        const response = await axios.post(
          endpoints.admin,
          {
            operation: "getSuppliersForPackage", // Use same operation as package details
          },
          { headers: { "Content-Type": "application/json" } }
        );

        console.log("📡 Supplier API Response:", response.data);

        if (response.data && response.data.status === "success") {
          const suppliersData = response.data.suppliers || [];
          console.log(
            "✅ Suppliers loaded:",
            suppliersData.length,
            "suppliers"
          );
          console.log("📋 Sample supplier:", suppliersData[0]);
          setSuppliers(suppliersData);
        } else {
          console.error(
            "❌ Failed to fetch suppliers:",
            response.data?.message
          );
          // Add test suppliers for development
          const testSuppliers = [
            {
              supplier_id: 1,
              supplier_name: "Test Photography Studio",
              supplier_category: "Photography",
              supplier_email: "test@photography.com",
              supplier_phone: "+1234567890",
              supplier_status: "active",
              is_verified: true,
              created_at: new Date().toISOString(),
              supplier_rating: 4.8,
              offers: [
                {
                  offer_id: 1,
                  offer_title: "Basic Package",
                  offer_description: "4 hours of photography coverage",
                  price_min: 5000,
                  price_max: 5000,
                  tier_level: 1,
                  is_customizable: true,
                  offer_attachments: [],
                },
                {
                  offer_id: 2,
                  offer_title: "Premium Package",
                  offer_description: "8 hours of photography with editing",
                  price_min: 8000,
                  price_max: 8000,
                  tier_level: 2,
                  is_customizable: true,
                  offer_attachments: [],
                },
              ],
            },
            {
              supplier_id: 2,
              supplier_name: "Test Catering Service",
              supplier_category: "Catering",
              supplier_email: "test@catering.com",
              supplier_phone: "+1234567891",
              supplier_status: "active",
              is_verified: true,
              created_at: new Date().toISOString(),
              supplier_rating: 4.5,
              offers: [
                {
                  offer_id: 3,
                  offer_title: "Standard Menu",
                  offer_description: "Buffet style catering for 100 guests",
                  price_min: 15000,
                  price_max: 15000,
                  tier_level: 1,
                  is_customizable: true,
                  offer_attachments: [],
                },
              ],
            },
          ];
          console.log("🧪 Using test suppliers:", testSuppliers.length);
          setSuppliers(testSuppliers);
        }
      } catch (err) {
        console.error("❌ Error fetching suppliers:", err);
        // Add test suppliers for development
        const testSuppliers = [
          {
            supplier_id: 1,
            supplier_name: "Test Photography Studio",
            supplier_category: "Photography",
            supplier_email: "test@photography.com",
            supplier_phone: "+1234567890",
            supplier_status: "active",
            is_verified: true,
            created_at: new Date().toISOString(),
            supplier_rating: 4.8,
            offers: [
              {
                offer_id: 1,
                offer_title: "Basic Package",
                offer_description: "4 hours of photography coverage",
                price_min: 5000,
                price_max: 5000,
                tier_level: 1,
                is_customizable: true,
                offer_attachments: [],
              },
              {
                offer_id: 2,
                offer_title: "Premium Package",
                offer_description: "8 hours of photography with editing",
                price_min: 8000,
                price_max: 8000,
                tier_level: 2,
                is_customizable: true,
                offer_attachments: [],
              },
            ],
          },
          {
            supplier_id: 2,
            supplier_name: "Test Catering Service",
            supplier_category: "Catering",
            supplier_email: "test@catering.com",
            supplier_phone: "+1234567891",
            supplier_status: "active",
            is_verified: true,
            created_at: new Date().toISOString(),
            supplier_rating: 4.5,
            offers: [
              {
                offer_id: 3,
                offer_title: "Standard Menu",
                offer_description: "Buffet style catering for 100 guests",
                price_min: 15000,
                price_max: 15000,
                tier_level: 1,
                is_customizable: true,
                offer_attachments: [],
              },
            ],
          },
        ];
        console.log("🧪 Using test suppliers (catch):", testSuppliers.length);
        setSuppliers(testSuppliers);
      } finally {
        setIsLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, []);

  const handleComponentListChange = (updatedList: ComponentWithSupplier[]) => {
    // Filter out any venue components from updatedList to prevent duplicates
    const nonVenueComponents = updatedList.filter(
      (comp) => !(comp.category === "venue" && comp.isVenueInclusion)
    );

    // Calculate total price for logging
    const totalPrice = nonVenueComponents.reduce((sum, comp) => {
      if (comp.included !== false) {
        const price = Number(comp.supplierPrice ?? comp.price ?? 0) || 0;
        return sum + price;
      }
      return sum;
    }, 0);

    console.log(
      `💰 Component list updated - Total price: ₱${totalPrice.toLocaleString()}`
    );
    console.log(
      `📋 Components included: ${nonVenueComponents.filter((c) => c.included !== false).length}/${nonVenueComponents.length}`
    );

    // Combine venue components with non-venue components, ensuring no duplicates
    const combinedComponents = [...venueComponents, ...nonVenueComponents];

    onUpdate(combinedComponents);
    setComponentList(nonVenueComponents);
  };

  const toggleComponentInclusion = (componentId: string) => {
    console.log(`🔄 Toggling component inclusion for ID: ${componentId}`);

    const updatedComponents = componentList.map(
      (component: ComponentWithSupplier) => {
        if (component.id === componentId) {
          const newIncluded = !component.included;
          const componentPrice =
            Number(component.supplierPrice ?? component.price ?? 0) || 0;

          console.log(`📊 Component "${component.name}" toggled:`, {
            id: component.id,
            category: component.category,
            included: newIncluded,
            price: componentPrice,
            supplierPrice: component.supplierPrice,
            isExternal:
              component.category === "extras" || component.supplierPrice,
          });

          return { ...component, included: newIncluded };
        }
        return component;
      }
    );

    handleComponentListChange(updatedComponents);
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
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  const addComponentFromSupplier = (
    supplier: Supplier,
    selectedOffer?: any
  ) => {
    // Check if supplier is already selected
    if (selectedSupplierIds.has(supplier.supplier_id)) {
      return; // Don't add if already selected
    }

    // Use selected offer or first offer if available, otherwise use a default price
    let selectedOfferData = selectedOffer;
    if (!selectedOfferData && supplier.offers && supplier.offers.length > 0) {
      selectedOfferData = supplier.offers[0];
    }

    const defaultPrice = selectedOfferData
      ? typeof selectedOfferData.price_min === "number"
        ? selectedOfferData.price_min
        : typeof selectedOfferData.price_min === "string"
          ? parseFloat(selectedOfferData.price_min) || 0
          : 0
      : 0;
    const offerName = selectedOfferData ? selectedOfferData.offer_title : "";

    console.log("💰 Price Debug:", {
      selectedOfferData,
      price_min: selectedOfferData?.price_min,
      price_max: selectedOfferData?.price_max,
      defaultPrice,
      offerName,
    });

    const newComponent: ComponentWithSupplier = {
      id: `supplier-${supplier.supplier_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${supplier.supplier_name}${offerName ? ` - ${offerName}` : ""}`,
      description: `${supplier.supplier_name} - ${supplier.supplier_category}${offerName ? ` (${offerName})` : ""}`,
      price: defaultPrice,
      category: supplier.supplier_category as ComponentCategory,
      included: true,
      isCustom: true,
      isRemovable: true,
      isExpanded: false,
      assignedSupplier: supplier,
      supplierPrice: defaultPrice,
      supplier_id: supplier.supplier_id,
      offer_id: selectedOfferData ? selectedOfferData.offer_id : null,
    };

    handleComponentListChange([...componentList, newComponent]);
    setSelectedSupplierIds((prev) => new Set([...prev, supplier.supplier_id]));
    setShowAddDialog(false);
  };

  const updateSupplierTier = (
    componentId: string,
    supplier: Supplier,
    selectedTier: any
  ) => {
    const updatedComponents = componentList.map((component) => {
      if (component.id === componentId) {
        const componentWithSupplier = component as ComponentWithSupplier;
        if (
          componentWithSupplier.assignedSupplier?.supplier_id ===
          supplier.supplier_id
        ) {
          return {
            ...componentWithSupplier,
            name: `${supplier.supplier_name}${selectedTier.tier_name ? ` - ${selectedTier.tier_name}` : ""}`,
            description: `${supplier.supplier_name} - ${supplier.supplier_category}${selectedTier.tier_name ? ` (${selectedTier.tier_name})` : ""}`,
            price: selectedTier.tier_price,
            supplierPrice: selectedTier.tier_price,
            offer_id: selectedTier.offer_id,
          };
        }
      }
      return component;
    });

    handleComponentListChange(updatedComponents);
  };

  const deleteComponent = (componentId: string) => {
    // Find the component being deleted
    const componentToDelete = componentList.find(
      (component) => component.id === componentId
    );

    // If it's a supplier component, remove from selected suppliers
    if (componentToDelete && "assignedSupplier" in componentToDelete) {
      const supplierComponent = componentToDelete as ComponentWithSupplier;
      if (supplierComponent.assignedSupplier) {
        setSelectedSupplierIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(supplierComponent.assignedSupplier!.supplier_id);
          return newSet;
        });
      }
    }

    handleComponentListChange(
      componentList.filter((component) => component.id !== componentId)
    );
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    let total = 0;
    componentList.forEach((component) => {
      if (component.included !== false) {
        // Use supplier price if assigned, otherwise use component price
        const componentWithSupplier = component as ComponentWithSupplier;
        const price = componentWithSupplier.supplierPrice || component.price;
        total += price;
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

  // Calculate supplier costs separately
  const calculateSupplierCosts = () => {
    return componentList
      .filter((comp) => (comp as ComponentWithSupplier).assignedSupplier)
      .filter((comp) => comp.included !== false)
      .reduce((sum, comp) => {
        const supplierComp = comp as ComponentWithSupplier;
        return sum + (supplierComp.supplierPrice || comp.price);
      }, 0);
  };

  // Calculate Noreen components (excluding suppliers)
  const calculateNoreenComponents = () => {
    return componentList
      .filter((comp) => !(comp as ComponentWithSupplier).assignedSupplier)
      .filter((comp) => comp.included !== false)
      .reduce((sum, comp) => {
        const componentWithSupplier = comp as ComponentWithSupplier;
        const price = componentWithSupplier.supplierPrice || comp.price;
        return sum + price;
      }, 0);
  };

  // Calculate complete total using new venue formula
  const calculateCompleteTotal = () => {
    // For package-based events, start with the package price
    if (!isStartFromScratch && originalPackagePrice) {
      let total = originalPackagePrice; // Start with package price

      // Apply component deltas (subtract if unchecked, add custom components)
      componentList.forEach((component) => {
        const componentWithSupplier = component as ComponentWithSupplier;
        const price = componentWithSupplier.supplierPrice || component.price;

        // Package components: subtract if unchecked
        if (component.category === ("package" as ComponentCategory)) {
          if (component.included === false) {
            total -= price;
          }
          return;
        }

        // Custom/supplier/extras: add if included (but not venue inclusions)
        if (component.category !== "venue" && component.included !== false) {
          total += price;
        }
      });

      // Add venue excess payment for package-based events using NEW FORMULA
      if (selectedVenue && venueBufferFee !== null) {
        // Use the venue's per-pax rate (extra_pax_rate) as the VenueRate
        const venueRate = parseFloat(selectedVenue.extra_pax_rate || 0) || 0;
        const clientPax = parseInt(eventDetails?.capacity?.toString() || "100");

        // Calculate actual venue cost: VenueRate × ClientPax
        const actualVenueCost = venueRate * clientPax;

        // Calculate excess payment: MAX(0, ActualVenueCost - VenueBuffer)
        const excessPayment = Math.max(
          0,
          actualVenueCost - (venueBufferFee || 0)
        );
        total += excessPayment;

        const noreenTotal = calculateNoreenComponents();
        const supplierTotal = calculateSupplierCosts();

        console.log(`🏢 ComponentCustomization Total Calculation (NEW FORMULA):
          - Package price: ₱${originalPackagePrice.toLocaleString()}
          - Noreen components: ₱${noreenTotal.toLocaleString()}
          - Supplier costs: ₱${supplierTotal.toLocaleString()}
          - Component adjustments: ₱${(total - originalPackagePrice - excessPayment).toLocaleString()}
          - Venue Rate: ₱${venueRate.toLocaleString()} per pax
          - Client Pax: ${clientPax}
          - Actual Venue Cost: ₱${venueRate.toLocaleString()} × ${clientPax} = ₱${actualVenueCost.toLocaleString()}
          - Venue Buffer: ₱${(venueBufferFee || 0).toLocaleString()} (included in package)
          - Excess Payment: MAX(0, ₱${actualVenueCost.toLocaleString()} - ₱${(venueBufferFee || 0).toLocaleString()}) = ₱${excessPayment.toLocaleString()}
          - Total: ₱${total.toLocaleString()}
        `);
      }

      return total;
    } else {
      // For start-from-scratch events, sum all components (including suppliers)
      let total = calculateNoreenComponents(); // Noreen components only
      total += calculateSupplierCosts(); // Add supplier costs
      total += calculateVenuePrice(); // Add venue price
      return total;
    }
  };

  // Get category display name
  const getCategoryName = (category: string) => {
    const key = (category || "").toLowerCase();
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
      package: "Package",
    };
    return names[key] || category;
  };

  // Filter out venue inclusions and suppliers from customizable components
  const customizableComponentList = componentList.filter(
    (comp) =>
      !(comp.category === "venue" && comp.isVenueInclusion) &&
      !(comp as ComponentWithSupplier).assignedSupplier
  );

  // Group customizable components by category (excluding venue inclusions and suppliers)
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

  // Render helper: if description contains commas, show as a bullet list instead of a single paragraph
  const renderDescriptionAsList = (description?: string) => {
    if (!description) return null;
    const parts = description
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      return (
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {parts.map((item, idx) => (
            <li key={`desc-item-${idx}`}>{item}</li>
          ))}
        </ul>
      );
    }
    return <p className="text-sm text-muted-foreground">{description}</p>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-green-700">
          {isStartFromScratch ? "Add Event Components" : "Customize Components"}
        </h2>
        <p className="text-muted-foreground">
          {isStartFromScratch
            ? "Add and customize components for your custom event."
            : "Customize the components included in your event package."}
        </p>
      </div>

      {isStartFromScratch ? (
        <Alert className="border-blue-500 bg-blue-50">
          <AlertDescription className="flex items-center">
            <Info className="h-4 w-4 mr-2 text-blue-600" />
            <span>
              <strong>Custom Event Mode:</strong> You're building your event
              from scratch. Add components individually to create your perfect
              event package.
            </span>
          </AlertDescription>
        </Alert>
      ) : (
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
      )}

      <Alert>
        <AlertDescription className="flex items-center">
          <Lock className="h-4 w-4 mr-2" />
          <span>
            These items are included with your venue Package and cannot be
            modified. The price is calculated based on your selected guest count
            ({guestCount} guests).
          </span>
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="venue-inclusions">
            <Lock className="h-4 w-4 mr-2 text-green-600" />
            {isStartFromScratch ? "Selected Venue" : "Venue Inclusions"}
          </TabsTrigger>
          <TabsTrigger value="noreen-components">
            <Edit className="h-4 w-4 mr-2 text-green-600" />
            {isStartFromScratch ? "Event Components" : "Noreen Components"}
          </TabsTrigger>
          <TabsTrigger value="supplier-inclusions">
            <User className="h-4 w-4 mr-2 text-blue-600" />
            Supplier Inclusions
            {componentList.filter(
              (comp) => (comp as ComponentWithSupplier).assignedSupplier
            ).length > 0 && (
              <Badge className="ml-2 bg-blue-500 text-white">
                {
                  componentList.filter(
                    (comp) => (comp as ComponentWithSupplier).assignedSupplier
                  ).length
                }
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Venue Inclusions Tab */}
        <TabsContent value="venue-inclusions" className="space-y-4">
          {venueComponents.length > 0 ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>
                      {isStartFromScratch ? "Selected Venue" : "Venue Package"}
                    </span>
                    <span>{formatCurrency(calculateVenuePrice())}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {venueComponents.map((component, index) => {
                      // Use venue buffer fee from package, fallback to venue price for start from scratch
                      const displayVenueBufferFee = isStartFromScratch
                        ? selectedVenue
                          ? parseFloat(selectedVenue.venue_price || 0)
                          : 0
                        : venueBufferFee || 0;
                      const venueRate = selectedVenue
                        ? parseFloat(selectedVenue.extra_pax_rate || 0)
                        : 0;
                      const clientPax = parseInt(
                        eventDetails?.capacity?.toString() || "100"
                      );

                      // Calculate actual venue cost: VenueRate × ClientPax
                      const actualVenueCost = venueRate * clientPax;

                      // Calculate excess payment: MAX(0, ActualVenueCost - VenueBuffer)
                      const excessPayment = Math.max(
                        0,
                        actualVenueCost - displayVenueBufferFee
                      );

                      return (
                        <div
                          key={`venue-${component.id}-${index}`}
                          className="space-y-2"
                        >
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

                          {/* Venue Buffer Fee Breakdown */}
                          <div className="ml-6 bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-green-800 font-medium">
                                  Venue Buffer Fee:
                                </span>
                                <span className="text-sm text-green-800 font-medium">
                                  {formatCurrency(displayVenueBufferFee)}
                                </span>
                              </div>
                              <div className="text-xs text-green-700">
                                Included in package price
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-sm text-blue-800 font-medium">
                                  Actual Venue Cost:
                                </span>
                                <span className="text-sm text-blue-800 font-medium">
                                  {formatCurrency(actualVenueCost)}
                                </span>
                              </div>
                              <div className="text-xs text-blue-700">
                                {clientPax} guests × {formatCurrency(venueRate)}{" "}
                                per guest
                              </div>

                              {excessPayment > 0 && (
                                <>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-orange-800 font-medium">
                                      Excess Payment:
                                    </span>
                                    <span className="text-sm text-orange-800 font-medium">
                                      +{formatCurrency(excessPayment)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-orange-700">
                                    ₱{actualVenueCost.toLocaleString()} - ₱
                                    {displayVenueBufferFee.toLocaleString()} = ₱
                                    {excessPayment.toLocaleString()}
                                  </div>
                                </>
                              )}

                              {excessPayment === 0 && (
                                <div className="text-xs text-green-700">
                                  No additional charges (covered by buffer)
                                </div>
                              )}

                              <div className="flex justify-between items-center pt-2 border-t border-green-300">
                                <span className="text-sm font-bold text-green-900">
                                  Total Venue Cost:
                                </span>
                                <span className="text-sm font-bold text-green-900">
                                  {formatCurrency(actualVenueCost)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {component.description && (
                            <div className="ml-6">
                              {renderDescriptionAsList(component.description)}
                            </div>
                          )}
                          {Array.isArray((component as any).venueInclusions) &&
                            (component as any).venueInclusions.length > 0 && (
                              <div className="ml-6">
                                <Accordion
                                  type="multiple"
                                  className="space-y-2"
                                >
                                  {(component as any).venueInclusions.map(
                                    (inc: any, incIdx: number) => (
                                      <AccordionItem
                                        key={`venue-inc-${String(
                                          inc.inclusion_id ?? inc.id ?? inc.name
                                        )}-${incIdx}`}
                                        value={`venue-inc-${String(
                                          inc.inclusion_id ?? inc.id ?? inc.name
                                        )}-${incIdx}`}
                                        className="border-b last:border-b-0"
                                      >
                                        <AccordionTrigger className="p-0 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                              {inc.inclusion_name ?? inc.name}
                                            </span>
                                            {typeof inc.inclusion_price ===
                                              "number" && (
                                              <Badge
                                                variant="outline"
                                                className="ml-2"
                                              >
                                                {formatCurrency(
                                                  inc.inclusion_price || 0
                                                )}
                                              </Badge>
                                            )}
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          {(inc.inclusion_description ||
                                            inc.description) && (
                                            <p className="text-xs text-muted-foreground">
                                              {inc.inclusion_description ||
                                                inc.description}
                                            </p>
                                          )}
                                        </AccordionContent>
                                      </AccordionItem>
                                    )
                                  )}
                                </Accordion>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">No venue selected yet.</p>
              <p className="mt-2">You will select a venue in the next step.</p>
              <p className="mt-2">
                The venue you select will determine what additional
                venue-specific inclusions are available.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Noreen Components Tab */}
        <TabsContent value="noreen-components" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-green-700">
                {isStartFromScratch
                  ? "Event Components"
                  : "Customizable Components"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Add or customize Noreen's event components
              </p>
            </div>
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
                        {categoryComponents.map((component, idx) => (
                          <AccordionItem
                            key={`${component.category}-${component.id}-${idx}-${component.name?.replace(/\s+/g, "-") || "unnamed"}`}
                            value={`${component.category}-${component.id}-${idx}`}
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
                                  {formatCurrency(
                                    (component as ComponentWithSupplier)
                                      .supplierPrice || component.price
                                  )}
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
                            <AccordionContent className="pl-8">
                              {component.description && (
                                <div className="mb-2">
                                  {renderDescriptionAsList(
                                    component.description
                                  )}
                                </div>
                              )}
                              {Array.isArray(component.subComponents) &&
                                component.subComponents.length > 0 && (
                                  <div className="space-y-1">
                                    {component.subComponents.map(
                                      (sub, subIdx) => (
                                        <div
                                          key={`${component.id}-sub-${sub.id}-${subIdx}`}
                                          className="flex items-center justify-between text-sm"
                                        >
                                          <span className="text-gray-700">
                                            {sub.name}
                                          </span>
                                          <span className="text-gray-900">
                                            {formatCurrency(sub.unitPrice || 0)}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </div>
                )
              )}
              {/* Budget Breakdown */}
              <div className="bg-green-50 rounded-lg p-4 mt-4 space-y-3 border border-green-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700">Noreen Components:</span>
                  <span className="font-medium text-green-900">
                    {formatCurrency(calculateNoreenComponents())}
                  </span>
                </div>
                {calculateSupplierCosts() > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-700">Supplier Inclusions:</span>
                    <span className="font-medium text-blue-900">
                      {formatCurrency(calculateSupplierCosts())}
                    </span>
                  </div>
                )}
                <div className="border-t border-green-300 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-green-700">
                      Total Event Cost:
                    </span>
                    <span className="font-bold text-green-900 text-lg">
                      {formatCurrency(calculateCompleteTotal())}
                    </span>
                  </div>
                </div>
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

        {/* Supplier Inclusions Tab */}
        <TabsContent value="supplier-inclusions" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-blue-700">
                Supplier Inclusions
              </h3>
              <p className="text-sm text-muted-foreground">
                External suppliers added to enhance your event
              </p>
            </div>
            <Button
              onClick={() => {
                console.log("🖱️ Add Supplier button clicked");
                console.log("📊 Current suppliers:", suppliers.length);
                console.log("⏳ Loading state:", isLoadingSuppliers);
                setShowSupplierModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoadingSuppliers}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>

          {componentList.filter(
            (comp) => (comp as ComponentWithSupplier).assignedSupplier
          ).length > 0 ? (
            <div className="space-y-4">
              {/* Group suppliers by category */}
              {(() => {
                const supplierComponents = componentList.filter(
                  (comp) => (comp as ComponentWithSupplier).assignedSupplier
                );
                const suppliersByCategory = supplierComponents.reduce(
                  (acc, component) => {
                    const category = component.category;
                    if (!acc[category]) {
                      acc[category] = [];
                    }
                    acc[category].push(component);
                    return acc;
                  },
                  {} as Record<string, DataPackageComponent[]>
                );

                return Object.entries(suppliersByCategory).map(
                  ([category, categoryComponents]) => (
                    <div
                      key={`supplier-category-${category}`}
                      className="bg-white rounded-lg border border-blue-200 p-4"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold text-blue-700">
                          {getCategoryName(category)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {categoryComponents.length} supplier(s)
                        </span>
                      </div>
                      <div className="space-y-3">
                        {categoryComponents.map((component, idx) => {
                          const supplierComp =
                            component as ComponentWithSupplier;
                          return (
                            <Card
                              key={`supplier-${component.id}-${idx}`}
                              className="border-blue-100 bg-blue-50/30"
                            >
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Checkbox
                                        id={`supplier-${component.id}`}
                                        checked={component.included !== false}
                                        onCheckedChange={() =>
                                          toggleComponentInclusion(component.id)
                                        }
                                        className="accent-blue-600 border-blue-400"
                                      />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`font-medium ${
                                              component.included === false
                                                ? "text-muted-foreground line-through"
                                                : "text-blue-900"
                                            }`}
                                          >
                                            {component.name}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="bg-blue-100 text-blue-700 border-blue-300"
                                          >
                                            <User className="h-3 w-3 mr-1" />
                                            {
                                              supplierComp.assignedSupplier
                                                ?.supplier_name
                                            }
                                          </Badge>
                                        </div>
                                        {component.description && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {component.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <span className="font-bold text-blue-700 text-lg">
                                      {formatCurrency(
                                        supplierComp.supplierPrice ||
                                          component.price
                                      )}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleEditComponent(component)
                                      }
                                      className="text-blue-600 hover:bg-blue-50"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
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
                                  </div>
                                </div>

                                {/* Show supplier details */}
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                    <div>
                                      <span className="font-medium">
                                        Email:
                                      </span>{" "}
                                      {
                                        supplierComp.assignedSupplier
                                          ?.supplier_email
                                      }
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        Phone:
                                      </span>{" "}
                                      {
                                        supplierComp.assignedSupplier
                                          ?.supplier_phone
                                      }
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )
                );
              })()}

              {/* Supplier Total */}
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-200 mt-4">
                <span className="font-medium text-blue-700">
                  Total Supplier Costs:
                </span>
                <span className="font-bold text-blue-900 text-lg">
                  {formatCurrency(
                    componentList
                      .filter(
                        (comp) =>
                          (comp as ComponentWithSupplier).assignedSupplier
                      )
                      .filter((comp) => comp.included !== false)
                      .reduce((sum, comp) => {
                        const supplierComp = comp as ComponentWithSupplier;
                        return sum + (supplierComp.supplierPrice || comp.price);
                      }, 0)
                  )}
                </span>
              </div>
            </div>
          ) : (
            <Card className="border-dashed border-2 border-blue-200">
              <CardContent className="text-center py-12">
                <User className="h-12 w-12 text-blue-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  No Suppliers Added Yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add external suppliers to enhance your event with additional
                  services.
                </p>
                <Button
                  onClick={() => {
                    console.log("🖱️ Add Your First Supplier button clicked");
                    console.log("📊 Current suppliers:", suppliers.length);
                    console.log("⏳ Loading state:", isLoadingSuppliers);
                    setShowSupplierModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoadingSuppliers}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Supplier
                </Button>
              </CardContent>
            </Card>
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
                value={
                  (editingComponent as ComponentWithSupplier)?.supplierPrice ||
                  editingComponent?.price ||
                  0
                }
                onChange={(e) =>
                  setEditingComponent((prev) =>
                    prev
                      ? {
                          ...prev,
                          price: Number.parseFloat(e.target.value) || 0,
                          ...((prev as ComponentWithSupplier)
                            .assignedSupplier && {
                            supplierPrice:
                              Number.parseFloat(e.target.value) || 0,
                          }),
                        }
                      : null
                  )
                }
              />
              {(editingComponent as ComponentWithSupplier)
                ?.assignedSupplier && (
                <p className="text-sm text-muted-foreground">
                  Supplier:{" "}
                  {
                    (editingComponent as ComponentWithSupplier).assignedSupplier
                      ?.supplier_name
                  }
                </p>
              )}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Component</DialogTitle>
            <DialogDescription>
              Add a custom component or select from available suppliers.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="custom" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="custom">Custom Component</TabsTrigger>
            </TabsList>

            <TabsContent value="custom" className="space-y-4">
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
                      setNewComponentPrice(
                        Number.parseFloat(e.target.value) || 0
                      )
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
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={addNewComponent} disabled={!newComponentName}>
                  Add Custom Component
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Supplier Selection Modal */}
      <SupplierSelectionModal
        isOpen={showSupplierModal}
        onClose={() => {
          console.log("❌ Closing supplier modal");
          setShowSupplierModal(false);
        }}
        suppliers={suppliers.filter((s) => s.supplier_status === "active")}
        onSelectSupplier={(supplier, tier) => {
          console.log("✅ Supplier selected:", supplier, tier);
          addComponentFromSupplier(supplier, tier);
        }}
      />
    </div>
  );
}
