"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  Star,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Clock,
  DollarSign,
  User,
  Building,
  Camera,
  Utensils,
  Music,
  Palette,
  Car,
  Home,
  Sparkles,
} from "lucide-react";

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
  supplier_address?: string;
  supplier_rating?: number;
  supplier_profile_picture?: string;
  supplier_description?: string;
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

interface SupplierSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  onSelectSupplier: (supplier: Supplier, selectedTier?: any) => void;
}

export function SupplierSelectionModal({
  isOpen,
  onClose,
  suppliers,
  onSelectSupplier,
}: SupplierSelectionModalProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSuppliers, setFilteredSuppliers] =
    useState<Supplier[]>(suppliers);

  // Debug modal props
  useEffect(() => {
    console.log("🔍 SupplierSelectionModal props:", {
      isOpen,
      suppliersCount: suppliers.length,
      suppliers: suppliers.slice(0, 2), // Log first 2 suppliers
    });
  }, [isOpen, suppliers]);

  // Filter suppliers based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredSuppliers(suppliers);
    } else {
      const filtered = suppliers.filter(
        (supplier) =>
          supplier.supplier_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          supplier.supplier_category
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          supplier.supplier_email
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
      setFilteredSuppliers(filtered);
    }
  }, [searchTerm, suppliers]);

  const handleSupplierSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSelectedTier(null);
  };

  const handleTierSelect = (tier: any) => {
    setSelectedTier(tier);
  };

  const handleConfirmSelection = () => {
    if (selectedSupplier) {
      onSelectSupplier(selectedSupplier, selectedTier);
      setSelectedSupplier(null);
      setSelectedTier(null);
      setSearchTerm("");
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedSupplier(null);
    setSelectedTier(null);
    setSearchTerm("");
    onClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes("photo") || categoryLower.includes("video"))
      return <Camera className="h-4 w-4 text-blue-600" />;
    if (categoryLower.includes("food") || categoryLower.includes("catering"))
      return <Utensils className="h-4 w-4 text-orange-600" />;
    if (
      categoryLower.includes("music") ||
      categoryLower.includes("entertainment")
    )
      return <Music className="h-4 w-4 text-purple-600" />;
    if (categoryLower.includes("decor") || categoryLower.includes("decoration"))
      return <Palette className="h-4 w-4 text-pink-600" />;
    if (categoryLower.includes("transport"))
      return <Car className="h-4 w-4 text-green-600" />;
    if (categoryLower.includes("venue"))
      return <Home className="h-4 w-4 text-indigo-600" />;
    return <Sparkles className="h-4 w-4 text-gray-600" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden p-6">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <User className="h-6 w-6 text-blue-600" />
            Select Your Supplier
          </DialogTitle>
          <p className="text-gray-600">
            Choose a supplier and their service tier for your event
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
          {/* Search & Supplier List */}
          <div className="lg:col-span-2 space-y-4 overflow-hidden">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search suppliers by name, category, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>

            {/* Supplier Grid */}
            <div className="overflow-y-auto space-y-3 pr-2">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((supplier) => (
                  <Card
                    key={supplier.supplier_id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedSupplier?.supplier_id === supplier.supplier_id
                        ? "border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200"
                        : "hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => handleSupplierSelect(supplier)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={supplier.supplier_profile_picture}
                            alt={supplier.supplier_name}
                          />
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                            {getInitials(supplier.supplier_name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Supplier Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg">
                                {supplier.supplier_name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                {getCategoryIcon(supplier.supplier_category)}
                                <Badge variant="secondary" className="text-xs">
                                  {supplier.supplier_category}
                                </Badge>
                                <Badge
                                  variant={
                                    supplier.supplier_status === "active"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className={`text-xs ${
                                    supplier.supplier_status === "active"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {supplier.supplier_status}
                                </Badge>
                              </div>
                            </div>
                            {selectedSupplier?.supplier_id ===
                              supplier.supplier_id && (
                              <CheckCircle className="h-6 w-6 text-blue-600" />
                            )}
                          </div>

                          {/* Contact Info */}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">
                                {supplier.supplier_email}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{supplier.supplier_phone}</span>
                            </div>
                          </div>

                          {/* Rating & Pricing Info */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-1">
                              {supplier.supplier_rating && (
                                <>
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                  <span className="text-sm font-medium">
                                    {supplier.supplier_rating.toFixed(1)}
                                  </span>
                                </>
                              )}
                            </div>
                            {supplier.offers && supplier.offers.length > 0 && (
                              <div className="flex items-center gap-1 text-sm text-green-600">
                                <DollarSign className="h-3 w-3" />
                                <span>
                                  {supplier.offers.length} offer(s) available
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No suppliers found
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting your search terms
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tier Selection Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="sticky top-0 bg-white pb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Service Offers
              </h3>
              {selectedSupplier ? (
                <div className="space-y-3">
                  {/* Selected Supplier Info */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={selectedSupplier.supplier_profile_picture}
                            alt={selectedSupplier.supplier_name}
                          />
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {getInitials(selectedSupplier.supplier_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-blue-900">
                            {selectedSupplier.supplier_name}
                          </h4>
                          <p className="text-sm text-blue-700">
                            {selectedSupplier.supplier_category}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Offer Selection */}
                  {selectedSupplier.offers &&
                  selectedSupplier.offers.length > 0 ? (
                    <div className="space-y-3">
                      {selectedSupplier.offers.map((offer, index) => (
                        <Card
                          key={index}
                          className={`cursor-pointer transition-all duration-200 ${
                            selectedTier === offer
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                              : "hover:border-gray-300 hover:bg-gray-50"
                          }`}
                          onClick={() => handleTierSelect(offer)}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900 mb-1">
                                  {offer.offer_title}
                                </h5>
                                <p className="text-2xl font-bold text-blue-600 mb-2">
                                  {typeof offer.price_min === "number" &&
                                  typeof offer.price_max === "number"
                                    ? offer.price_min === offer.price_max
                                      ? formatCurrency(offer.price_min)
                                      : `${formatCurrency(offer.price_min)} - ${formatCurrency(offer.price_max)}`
                                    : `${offer.price_min} - ${offer.price_max}`}
                                </p>
                                <p className="text-sm text-gray-600 mb-2">
                                  {offer.offer_description}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>Tier Level: {offer.tier_level}</span>
                                </div>
                              </div>
                              {selectedTier === offer && (
                                <CheckCircle className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <Building className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            No offers available
                          </span>
                        </div>
                        <p className="text-xs text-yellow-700 mt-1">
                          Default price of ₱0.00 will be used
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-6">
                    <Button
                      onClick={handleConfirmSelection}
                      disabled={!selectedSupplier}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Add to Event
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="px-6 h-11"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-300">
                  <CardContent className="text-center py-16 px-6">
                    <User className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                    <h3 className="text-lg font-medium text-gray-700 mb-3">
                      Select a Supplier
                    </h3>
                    <p className="text-gray-500">
                      Choose a supplier from the list to view their service
                      offers
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
