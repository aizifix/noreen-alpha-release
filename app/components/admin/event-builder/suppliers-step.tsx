"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getSuppliersByCategory } from "../../../../data/suppliers";
import { formatCurrency } from "@/lib/utils";

interface Supplier {
  id: string;
  name: string;
  rating: number;
}

interface Component {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface SupplierAssignment {
  supplierId: string;
  supplierName: string;
  status: "pending" | "confirmed" | "in-progress" | "completed";
  notes: string;
}

interface SupplierAssignments {
  [key: string]: SupplierAssignment;
}

interface SuppliersStepProps {
  data: SupplierAssignments;
  components: Component[];
  updateData: (assignments: SupplierAssignments) => void;
}

export function SuppliersStep({
  data,
  components,
  updateData,
}: SuppliersStepProps) {
  const [supplierAssignments, setSupplierAssignments] =
    useState<SupplierAssignments>(data || {});

  // Initialize supplier assignments if empty
  useEffect(() => {
    if (
      components.length > 0 &&
      Object.keys(supplierAssignments).length === 0
    ) {
      const initialAssignments: SupplierAssignments = {};
      components.forEach((component) => {
        initialAssignments[component.id] = {
          supplierId: "",
          supplierName: "",
          status: "pending",
          notes: "",
        };
      });
      setSupplierAssignments(initialAssignments);
      updateData(initialAssignments);
    }
  }, [components]);

  // Update a supplier assignment
  const updateSupplierAssignment = (
    componentId: string,
    field: keyof SupplierAssignment,
    value: string
  ) => {
    // If updating supplierId, also update supplierName
    const updatedValue: Partial<SupplierAssignment> = { [field]: value };
    if (field === "supplierId" && value) {
      const suppliers = getSuppliersByCategory(
        components.find((c) => c.id === componentId)?.category || ""
      );
      const selectedSupplier = suppliers.find((s: Supplier) => s.id === value);
      if (selectedSupplier) {
        updatedValue.supplierName = selectedSupplier.name;
      }
    }

    const updatedAssignments = {
      ...supplierAssignments,
      [componentId]: {
        ...supplierAssignments[componentId],
        ...updatedValue,
      },
    };

    setSupplierAssignments(updatedAssignments);
    updateData(updatedAssignments);
  };

  // Get status badge color
  const getStatusBadge = (status: SupplierAssignment["status"]) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case "completed":
        return (
          <Badge className="bg-purple-100 text-purple-800">Completed</Badge>
        );
      default:
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
    }
  };

  if (components.length === 0) {
    return (
      <div className="text-center p-6">
        <p>No components selected. Please add components first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Supplier Assignments</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Assign suppliers to each component and track their status.
        </p>
      </div>

      {components.map((component) => {
        const assignment = supplierAssignments[component.id] || {
          supplierId: "",
          supplierName: "",
          status: "pending",
          notes: "",
        };

        const suppliers = getSuppliersByCategory(component.category);

        return (
          <Card key={component.id} className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{component.name}</h4>
                    <p className="text-sm text-muted-foreground capitalize">
                      {component.category} • {formatCurrency(component.price)}
                    </p>
                  </div>
                  {getStatusBadge(assignment.status)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`supplier-${component.id}`}>
                      Assign Supplier
                    </Label>
                    <Select
                      value={assignment.supplierId}
                      onValueChange={(value) =>
                        updateSupplierAssignment(
                          component.id,
                          "supplierId",
                          value
                        )
                      }
                    >
                      <SelectTrigger id={`supplier-${component.id}`}>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier: Supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name} ({supplier.rating}★)
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">
                          + Add Custom Supplier
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {assignment.supplierId === "custom" && (
                    <div className="space-y-2">
                      <Label htmlFor={`custom-supplier-${component.id}`}>
                        Custom Supplier Name
                      </Label>
                      <Input
                        id={`custom-supplier-${component.id}`}
                        value={assignment.supplierName}
                        onChange={(e) =>
                          updateSupplierAssignment(
                            component.id,
                            "supplierName",
                            e.target.value
                          )
                        }
                        placeholder="Enter supplier name"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor={`status-${component.id}`}>Status</Label>
                    <Select
                      value={assignment.status}
                      onValueChange={(value) =>
                        updateSupplierAssignment(component.id, "status", value)
                      }
                    >
                      <SelectTrigger id={`status-${component.id}`}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`notes-${component.id}`}>Notes</Label>
                  <Input
                    id={`notes-${component.id}`}
                    value={assignment.notes}
                    onChange={(e) =>
                      updateSupplierAssignment(
                        component.id,
                        "notes",
                        e.target.value
                      )
                    }
                    placeholder="Add notes about this supplier"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
