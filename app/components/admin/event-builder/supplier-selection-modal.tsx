"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Supplier {
  supplier_id: string;
  supplier_name: string;
  supplier_category: string;
  supplier_email: string;
  supplier_phone: string;
  supplier_status: string;
  pricing_tiers?: Array<{
    tier_name: string;
    tier_price: number;
    tier_description: string;
    offer_id?: number;
  }>;
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

  const handleSupplierSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSelectedTier(null);
  };

  const handleTierSelect = (tierIndex: string) => {
    if (selectedSupplier && selectedSupplier.pricing_tiers) {
      const tier = selectedSupplier.pricing_tiers[parseInt(tierIndex)];
      setSelectedTier(tier);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedSupplier) {
      onSelectSupplier(selectedSupplier, selectedTier);
      setSelectedSupplier(null);
      setSelectedTier(null);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedSupplier(null);
    setSelectedTier(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Supplier & Tier</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supplier List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Suppliers</h3>
            <div className="space-y-3">
              {suppliers.map((supplier) => (
                <Card
                  key={supplier.supplier_id}
                  className={`cursor-pointer transition-colors ${
                    selectedSupplier?.supplier_id === supplier.supplier_id
                      ? "border-primary bg-primary/5"
                      : "hover:border-gray-300"
                  }`}
                  onClick={() => handleSupplierSelect(supplier)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {supplier.supplier_name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {supplier.supplier_category}
                      </Badge>
                      <Badge
                        variant={
                          supplier.supplier_status === "active"
                            ? "default"
                            : "destructive"
                        }
                        className="bg-green-500/20 text-green-700"
                      >
                        {supplier.supplier_status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 mb-2">
                      {supplier.supplier_email}
                    </p>
                    <p className="text-sm text-gray-600">
                      {supplier.supplier_phone}
                    </p>
                    {supplier.pricing_tiers &&
                      supplier.pricing_tiers.length > 0 && (
                        <p className="text-sm text-green-600 mt-2">
                          {supplier.pricing_tiers.length} pricing tier(s)
                          available
                        </p>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Tier Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pricing Tiers</h3>
            {selectedSupplier ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">
                    {selectedSupplier.supplier_name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedSupplier.supplier_category}
                  </p>
                </div>

                {selectedSupplier.pricing_tiers &&
                selectedSupplier.pricing_tiers.length > 0 ? (
                  <div className="space-y-3">
                    <Select onValueChange={handleTierSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a pricing tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedSupplier.pricing_tiers.map((tier, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {tier.tier_name} - {formatCurrency(tier.tier_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedTier && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {selectedTier.tier_name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-primary mb-2">
                            {formatCurrency(selectedTier.tier_price)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedTier.tier_description}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      No pricing tiers available for this supplier. A default
                      price of ₱0.00 will be used.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleConfirmSelection}
                    disabled={!selectedSupplier}
                    className="bg-[#028A75] text-white hover:bg-[#028A75]/80"
                  >
                    Add to Event
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>Select a supplier to view pricing tiers</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
