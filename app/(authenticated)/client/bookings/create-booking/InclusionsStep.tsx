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
  Gift,
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
  inclusion_id: number | string;
  inclusion_name: string;
  inclusion_description: string | null;
  inclusion_price: number;
  display_order: number;
  category?: string;
  is_venue_inclusion?: boolean;
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

// Freebie type (from package details)
interface Freebie {
  freebie_id: number | string;
  freebie_name: string;
  freebie_description?: string | null;
  freebie_value?: number | null;
  display_order?: number | null;
}

interface InclusionsStepProps {
  packageId: number | null;
  venueId: number | null; // Add venueId to props
  packageInclusions: Inclusion[];
  customInclusions: Inclusion[];
  removedInclusions: Inclusion[];
  supplierServices: Inclusion[];
  externalCustomizations: CustomInclusion[];
  guestCount: number;
  venueTitle?: string | null;
  venuePriceEstimate?: number;
  onAddInclusion: (inclusion: Inclusion) => void;
  onRemoveInclusion: (inclusionId: number | string) => void;
  onRestoreInclusion: (inclusionId: number | string) => void;
  onAddSupplierService: (service: Inclusion) => void;
  onRemoveSupplierService: (serviceId: number | string) => void;
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
  guestCount,
  venueTitle,
  venuePriceEstimate,
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
  // Removed price/notes overrides per supplier tier - not required
  const [packageFreebies, setPackageFreebies] = useState<Freebie[]>([]);
  const [venueBasePrice, setVenueBasePrice] = useState<number | null>(null);
  const [venueExtraPaxRate, setVenueExtraPaxRate] = useState<number | null>(
    null
  );

  // Format price with proper formatting
  const formatPrice = (amount: number): string => {
    return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch only package-related inclusions and suppliers on mount
  useEffect(() => {
    fetchAvailableInclusions();
    fetchSuppliers();
    if (venueId) {
      fetchVenueInclusions(venueId);
    } else {
      setVenueInclusions([]);
      setVenueInclusionsPrice(0);
    }
    // Fetch freebies for selected package
    if (packageId) {
      fetchPackageFreebies(packageId);
    } else {
      setPackageFreebies([]);
    }
    // Fetch venue pricing details (base + extra pax rate) when both are present
    if (packageId && venueId) {
      fetchVenuePricingDetails(packageId, venueId, guestCount);
    } else {
      setVenueBasePrice(null);
      setVenueExtraPaxRate(null);
    }
  }, [venueId, packageId]);

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

  // Fetch available inclusions (package-only)
  const fetchAvailableInclusions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: {
            operation: "getPackageComponents",
            package_id: packageId ?? 0,
          },
        }
      );

      if (response.data.status === "success") {
        const raw = response.data.inclusions || response.data.components || [];
        const mapped: Inclusion[] = raw.map((item: any) => ({
          inclusion_id:
            item.inclusion_id ?? item.component_id ?? item.id ?? Math.random(),
          inclusion_name:
            item.inclusion_name ?? item.component_name ?? item.name ?? "",
          inclusion_description:
            item.inclusion_description ??
            item.component_description ??
            item.description ??
            null,
          inclusion_price:
            Number(
              item.inclusion_price ?? item.component_price ?? item.price ?? 0
            ) || 0,
          display_order: Number(item.display_order ?? 0) || 0,
        }));
        setAvailableInclusions(mapped);
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
      // Fetch suppliers with offers (primary) and admin suppliers (for registration_docs fallback) in parallel
      const [clientRes, adminRes] = await Promise.all([
        axios.get("http://localhost/events-api/client.php", {
          params: { operation: "getSuppliersWithTiers" },
        }),
        axios.get("http://localhost/events-api/admin.php", {
          params: {
            operation: "getAllSuppliers",
            page: 1,
            limit: 500,
            is_verified: 1,
          },
        }),
      ]);

      const clientOk = clientRes.data?.status === "success";
      const adminOk = adminRes.data?.status === "success";

      const clientSuppliers: Supplier[] = clientOk
        ? clientRes.data.suppliers || []
        : [];
      const adminSuppliers: any[] = adminOk
        ? adminRes.data.suppliers || []
        : [];

      // Build a map of fallback services from registration_docs.tiers
      const fallbackServicesBySupplier = new Map<number, Service[]>();
      for (const s of adminSuppliers) {
        const docs = s.registration_docs;
        let parsed: any = docs;
        try {
          if (typeof docs === "string") parsed = JSON.parse(docs);
        } catch {
          parsed = null;
        }
        const tiers =
          parsed && typeof parsed === "object" ? parsed.tiers : null;
        if (Array.isArray(tiers) && tiers.length > 0) {
          const services: Service[] = tiers
            .map((t: any, idx: number) => ({
              service_id: Number(`${s.supplier_id}000${idx}`),
              service_name: String(t.name ?? t.tier_name ?? "Unnamed Tier"),
              service_description: t.description ?? t.tier_description ?? null,
              service_price: Number(t.price ?? t.tier_price ?? 0) || 0,
            }))
            .filter((sv: Service) => !!sv.service_name);
          if (services.length > 0) {
            fallbackServicesBySupplier.set(Number(s.supplier_id), services);
          }
        }
      }

      // Merge: prefer offers from client endpoint; fallback to registration_docs tiers
      const mergedFromClient: Supplier[] = clientSuppliers.map((s) => {
        const services =
          Array.isArray(s.services) && s.services.length > 0
            ? s.services
            : fallbackServicesBySupplier.get(s.supplier_id) || [];
        return { ...s, services };
      });

      // Add any admin suppliers that are missing from client list but have tiers
      const presentIds = new Set(
        mergedFromClient.map((s) => Number(s.supplier_id))
      );
      const extras: Supplier[] = [];
      for (const s of adminSuppliers) {
        const sid = Number(s.supplier_id);
        if (presentIds.has(sid)) continue;
        const fallback = fallbackServicesBySupplier.get(sid) || [];
        if (fallback.length > 0) {
          extras.push({
            supplier_id: sid,
            supplier_name: String(
              s.business_name || s.supplier_name || "Supplier"
            ),
            supplier_category: String(
              s.specialty_category || s.supplier_category || ""
            ),
            services: fallback,
          });
        }
      }

      setSuppliers([...mergedFromClient, ...extras]);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  // Fetch freebies for the current package
  const fetchPackageFreebies = async (pkgId: number) => {
    try {
      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: {
            operation: "getPackageDetails",
            package_id: pkgId,
          },
        }
      );

      if (response.data.status === "success") {
        const freebies: Freebie[] = response.data?.package?.freebies || [];
        setPackageFreebies(freebies);
      } else {
        setPackageFreebies([]);
      }
    } catch (err) {
      console.error("Error fetching freebies:", err);
      setPackageFreebies([]);
    }
  };

  // Fetch venue base price and extra pax rate for breakdown
  const fetchVenuePricingDetails = async (
    pkgId: number,
    vId: number,
    guests: number
  ) => {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const response = await axios.get(
        "http://localhost/events-api/client.php",
        {
          params: {
            operation: "getVenuesByPackage",
            package_id: pkgId,
            event_date: dateStr,
            guest_count: guests,
          },
        }
      );

      if (response.data.status === "success") {
        const venues: any[] = response.data?.venues || [];
        const venue = venues.find((v) => Number(v.venue_id) === Number(vId));
        if (venue) {
          const base = parseFloat(String(venue.venue_price)) || 0;
          const rate =
            venue.extra_pax_rate !== undefined && venue.extra_pax_rate !== null
              ? parseFloat(String(venue.extra_pax_rate))
              : 0;
          setVenueBasePrice(base);
          setVenueExtraPaxRate(Number.isFinite(rate) ? rate : 0);
        } else {
          setVenueBasePrice(null);
          setVenueExtraPaxRate(null);
        }
      }
    } catch (err) {
      console.error("Error fetching venue pricing details:", err);
      setVenueBasePrice(null);
      setVenueExtraPaxRate(null);
    }
  };

  // Toggle inclusion status (included/excluded)
  const toggleInclusionStatus = (inclusionId: number | string) => {
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
    const isPackageInclusion = eventInclusionsOnly.some(
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

    // Enforce one tier per supplier: remove existing different tier
    const existingForSupplier = supplierServices.find(
      (inc) => inc.supplier_id === selectedSupplier.supplier_id
    );
    if (existingForSupplier) {
      if (existingForSupplier.inclusion_id === service.service_id) {
        // Already added
        toast({
          title: "Already added",
          description: `${service.service_name} is already selected for ${selectedSupplier.supplier_name}`,
        });
        return;
      }
      onRemoveSupplierService(existingForSupplier.inclusion_id);
    }

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
      title: existingForSupplier ? "Service replaced" : "Service added",
      description: `${service.service_name} for ${selectedSupplier.supplier_name}`,
    });
  };

  // Filter inclusions based on search
  const filteredInclusions = availableInclusions.filter((inclusion) => {
    const name = (inclusion?.inclusion_name ?? "").toString().toLowerCase();
    const desc = (inclusion?.inclusion_description ?? "")
      .toString()
      .toLowerCase();
    const q = (searchQuery ?? "").toString().toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  // Derive event inclusions only (exclude explicitly flagged venue ones)
  const eventInclusionsOnly: Inclusion[] = packageInclusions.filter(
    (inc) => inc.is_venue_inclusion !== true
  );

  // Also remove explicitly flagged venue entries from custom inclusions
  const eventCustomInclusionsOnly: Inclusion[] = customInclusions.filter(
    (inc) => inc.is_venue_inclusion !== true
  );

  // Calculate total inclusions using event-only items
  const totalInclusionsCount =
    eventInclusionsOnly.length -
    removedInclusions.length +
    eventCustomInclusionsOnly.length +
    supplierServices.length +
    externalCustomizations.length;

  // Get all current inclusions (event-only, custom and supplier)
  const getAllInclusions = () => {
    return [
      ...eventInclusionsOnly,
      ...eventCustomInclusionsOnly,
      ...supplierServices,
    ].map((inc) => ({ ...inc, isRemovable: true }));
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
      <Alert className="border-[#028A75]/50 bg-[#028A75]/10">
        <AlertDescription className="flex items-center">
          <Info className="h-4 w-4 mr-2 text-[#028A75]" />
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
              <TabsTrigger
                value="freebies"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#028A75]"
              >
                <Gift className="h-4 w-4 mr-2" />
                Freebies
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
                        {inclusions.map((inclusion, index) => {
                          const isRemoved = removedInclusions.some(
                            (inc) => inc.inclusion_id === inclusion.inclusion_id
                          );

                          return (
                            <div
                              key={`inclusion-${String(inclusion.inclusion_id)}-${index}`}
                              className="p-4 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    id={`inclusion-${inclusion.inclusion_id}`}
                                    checked={!isRemoved}
                                    onCheckedChange={(
                                      checked: boolean | "indeterminate"
                                    ) => {
                                      toggleInclusionStatus(
                                        inclusion.inclusion_id
                                      );
                                    }}
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

            {/* Venue Inclusions Tab (locked, read-only) */}
            <TabsContent value="venue" className="p-4 space-y-4">
              {/* Venue summary (price and pax) */}
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {venueTitle || "Selected Venue"}
                      </h3>
                      <p className="text-sm text-gray-600">Pax: {guestCount}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        Total (base + extra pax)
                      </div>
                      <div className="text-xl font-bold text-gray-800">
                        {formatPrice(
                          (() => {
                            const base = venueBasePrice ?? 0;
                            const rate = venueExtraPaxRate ?? 0;
                            const extras =
                              guestCount > 100 ? (guestCount - 100) * rate : 0;
                            const total =
                              base > 0 || rate > 0
                                ? base + extras
                                : venuePriceEstimate || 0;
                            return total;
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                  {(venueBasePrice !== null || venueExtraPaxRate !== null) && (
                    <div className="mt-2 text-xs text-gray-600">
                      <div>Base: {formatPrice(venueBasePrice ?? 0)}</div>
                      <div>
                        Extra pax: {guestCount > 100 ? guestCount - 100 : 0} ×{" "}
                        {formatPrice(venueExtraPaxRate ?? 0)} ={" "}
                        {formatPrice(
                          (guestCount > 100 ? guestCount - 100 : 0) *
                            (venueExtraPaxRate ?? 0)
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Includes the price + the extra pax rate (total)
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Venue inclusions list */}
              {venueInclusions.length > 0 ? (
                <div className="space-y-2">
                  {venueInclusions.map((inclusion, index) => (
                    <Card
                      key={`venue-inc-${String(inclusion.inclusion_id)}-${index}`}
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
                        {/* Price retained but not added into editable totals */}
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

            {/* Freebies Tab */}
            <TabsContent value="freebies" className="p-4 space-y-4">
              {packageFreebies.length > 0 ? (
                <div className="space-y-2">
                  {packageFreebies.map((freebie, index) => (
                    <Card
                      key={`freebie-${String(
                        (freebie as any)?.freebie_id ??
                          freebie.freebie_name ??
                          index
                      )}-${index}`}
                      className="bg-white border-gray-200"
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center">
                          <Gift className="h-4 w-4 mr-3 text-purple-500" />
                          <div>
                            <div className="font-medium text-gray-800">
                              {freebie.freebie_name}
                            </div>
                            {freebie.freebie_description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {freebie.freebie_description}
                              </p>
                            )}
                          </div>
                        </div>
                        {typeof freebie.freebie_value === "number" && (
                          <div className="text-sm font-medium text-gray-600">
                            {formatPrice(freebie.freebie_value || 0)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-600">No freebies for this package</p>
                  <p className="text-sm text-gray-500">
                    Freebies tied to the selected package will appear here.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Removed bottom Total Selections price to avoid duplicate pricing display */}

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
                    selectedSupplier.services.map((service) => {
                      const isSelected = supplierServices.some(
                        (s) =>
                          s.supplier_id === selectedSupplier.supplier_id &&
                          s.inclusion_id === service.service_id
                      );
                      const existingForSupplier = supplierServices.find(
                        (s) => s.supplier_id === selectedSupplier.supplier_id
                      );
                      return (
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
                              <div className="flex flex-col items-end gap-1">
                                {existingForSupplier && !isSelected && (
                                  <span className="text-[10px] text-gray-500">
                                    Currently added:{" "}
                                    {existingForSupplier.inclusion_name}
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleSelectSupplierService(service)
                                  }
                                  className={
                                    isSelected
                                      ? "bg-[#028A75] hover:bg-[#028A75]/90"
                                      : "bg-blue-600 hover:bg-blue-700"
                                  }
                                  disabled={isSelected}
                                >
                                  {isSelected ? (
                                    <>
                                      <Check className="h-4 w-4 mr-1" /> Added
                                    </>
                                  ) : existingForSupplier ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-1" />{" "}
                                      Replace
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-1" /> Add
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
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
