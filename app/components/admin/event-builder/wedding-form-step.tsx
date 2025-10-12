"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Minus,
  Calendar,
  User,
  Users,
  Shirt,
  Package,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface WeddingFormData {
  // Basic Info
  nuptial: string;
  motif: string;
  wedding_time: string;
  church: string;
  address: string;

  // Main Couple
  bride_name: string;
  bride_size: string; // Changed from bride_gown_size to match DB
  groom_name: string;
  groom_size: string; // Changed from groom_attire_size to match DB

  // Parents - Bride's Side
  mother_bride_name: string; // Changed from mothers_attire_name to match DB
  mother_bride_size: string; // Changed from mothers_attire_size to match DB
  father_bride_name: string; // Changed from fathers_attire_name to match DB
  father_bride_size: string; // Changed from fathers_attire_size to match DB

  // Parents - Groom's Side
  mother_groom_name: string;
  mother_groom_size: string;
  father_groom_name: string;
  father_groom_size: string;

  // Principal Sponsors
  maid_of_honor_name: string;
  maid_of_honor_size: string;
  best_man_name: string;
  best_man_size: string;

  // Children
  little_bride_name: string;
  little_bride_size: string;
  little_groom_name: string;
  little_groom_size: string;

  // Wedding Party Quantities and Names (matching DB structure)
  bridesmaids_qty: number;
  bridesmaids_names: string[];
  groomsmen_qty: number;
  groomsmen_names: string[];
  junior_groomsmen_qty: number;
  junior_groomsmen_names: string[];
  flower_girls_qty: number;
  flower_girls_names: string[];
  ring_bearer_qty: number;
  ring_bearer_names: string[];
  bible_bearer_qty: number;
  bible_bearer_names: string[];
  coin_bearer_qty: number;
  coin_bearer_names: string[];

  // Wedding Items Quantities (matching DB column names)
  cushions_qty: number;
  headdress_qty: number;
  shawls_qty: number;
  veil_cord_qty: number;
  basket_qty: number;
  petticoat_qty: number;
  neck_bowtie_qty: number;
  garter_leg_qty: number;
  fitting_form_qty: number;
  robe_qty: number;

  // Processing Info
  prepared_by: string;
  received_by: string;
  pickup_date: string; // Changed from pick_up_date to match DB
  return_date: string;
  customer_signature: string;
}

interface WeddingFormStepProps {
  eventId?: number;
  initialData?: Partial<WeddingFormData>;
  onUpdate?: (data: WeddingFormData) => void;
  onNext?: () => void;
  adminName?: string;
  clientName?: string;
}

export function WeddingFormStep({
  eventId,
  initialData,
  onUpdate,
  onNext,
  adminName,
  clientName,
}: WeddingFormStepProps) {
  const [formData, setFormData] = useState<WeddingFormData>({
    nuptial: "",
    motif: "",
    wedding_time: "",
    church: "",
    address: "",
    bride_name: "",
    bride_size: "",
    groom_name: "",
    groom_size: "",
    mother_bride_name: "",
    mother_bride_size: "",
    father_bride_name: "",
    father_bride_size: "",
    mother_groom_name: "",
    mother_groom_size: "",
    father_groom_name: "",
    father_groom_size: "",
    maid_of_honor_name: "",
    maid_of_honor_size: "",
    best_man_name: "",
    best_man_size: "",
    little_bride_name: "",
    little_bride_size: "",
    little_groom_name: "",
    little_groom_size: "",
    bridesmaids_qty: 0,
    bridesmaids_names: [],
    groomsmen_qty: 0,
    groomsmen_names: [],
    junior_groomsmen_qty: 0,
    junior_groomsmen_names: [],
    flower_girls_qty: 0,
    flower_girls_names: [],
    ring_bearer_qty: 0,
    ring_bearer_names: [],
    bible_bearer_qty: 0,
    bible_bearer_names: [],
    coin_bearer_qty: 0,
    coin_bearer_names: [],
    cushions_qty: 0,
    headdress_qty: 0,
    shawls_qty: 0,
    veil_cord_qty: 0,
    basket_qty: 0,
    petticoat_qty: 0,
    neck_bowtie_qty: 0,
    garter_leg_qty: 0,
    fitting_form_qty: 0,
    robe_qty: 0,
    prepared_by: "",
    received_by: "",
    pickup_date: "",
    return_date: "",
    customer_signature: "",
    ...initialData,
  });

  const [loading, setLoading] = useState(false);

  // Load existing wedding details if eventId is provided
  useEffect(() => {
    if (eventId) {
      loadWeddingDetails();
    }
  }, [eventId]);

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Initialize form data on mount and notify parent
  useEffect(() => {
    // Notify parent of initial form data
    console.log("🚀 WeddingFormStep mounted, sending initial data:", formData);
    onUpdate?.(formData);
  }, []); // Only run on mount

  const loadWeddingDetails = async () => {
    try {
      console.log("🔍 Loading wedding details for event:", eventId);
      const response = await axios.get(
        `${endpoints.admin}?operation=getWeddingDetails&event_id=${eventId}`
      );
      const data = response.data;

      console.log("📡 Wedding details response:", data);

      if (data.status === "success" && data.wedding_details) {
        console.log("✅ Wedding details loaded:", data.wedding_details);
        setFormData((prev) => ({ ...prev, ...data.wedding_details }));
      } else {
        console.log("❌ No wedding details found or error:", data);
      }
    } catch (error) {
      console.error("❌ Error loading wedding details:", error);
    }
  };

  const updateFormData = (field: keyof WeddingFormData, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    // Always call onUpdate with the complete form data
    console.log("🔄 WeddingFormStep updating field:", field, "value:", value);
    console.log("📤 WeddingFormStep sending to parent:", newData);
    onUpdate?.(newData);
  };

  const addPartyMember = (
    partyType: keyof Pick<
      WeddingFormData,
      | "bridesmaids_names"
      | "groomsmen_names"
      | "junior_groomsmen_names"
      | "flower_girls_names"
      | "ring_bearer_names"
      | "bible_bearer_names"
      | "coin_bearer_names"
    >
  ) => {
    const currentNames = formData[partyType];
    const newNames = [...currentNames, ""];
    updateFormData(partyType, newNames);

    // Also update the quantity
    const qtyField = partyType.replace(
      "_names",
      "_qty"
    ) as keyof WeddingFormData;
    updateFormData(qtyField, newNames.length);
  };

  const removePartyMember = (
    partyType: keyof Pick<
      WeddingFormData,
      | "bridesmaids_names"
      | "groomsmen_names"
      | "junior_groomsmen_names"
      | "flower_girls_names"
      | "ring_bearer_names"
      | "bible_bearer_names"
      | "coin_bearer_names"
    >,
    index: number
  ) => {
    const currentNames = formData[partyType];
    const newNames = currentNames.filter((_, i) => i !== index);
    updateFormData(partyType, newNames);

    // Also update the quantity
    const qtyField = partyType.replace(
      "_names",
      "_qty"
    ) as keyof WeddingFormData;
    updateFormData(qtyField, newNames.length);
  };

  const updatePartyMember = (
    partyType: keyof Pick<
      WeddingFormData,
      | "bridesmaids_names"
      | "groomsmen_names"
      | "junior_groomsmen_names"
      | "flower_girls_names"
      | "ring_bearer_names"
      | "bible_bearer_names"
      | "coin_bearer_names"
    >,
    index: number,
    value: string
  ) => {
    const currentNames = formData[partyType];
    const newNames = [...currentNames];
    newNames[index] = value;
    updateFormData(partyType, newNames);
  };

  const handleNext = () => {
    // In Event Builder context, we don't save here - the parent handles saving
    // Just validate and proceed to next step
    if (!formData.bride_name || !formData.groom_name) {
      toast.error("Error", {
        description: "Bride and groom names are required",
      });
      return;
    }
    onNext?.();
  };

  const renderPartySection = (
    title: string,
    namesField: keyof Pick<
      WeddingFormData,
      | "bridesmaids_names"
      | "groomsmen_names"
      | "junior_groomsmen_names"
      | "flower_girls_names"
      | "ring_bearer_names"
      | "bible_bearer_names"
      | "coin_bearer_names"
    >,
    icon: React.ReactNode
  ) => {
    const names = formData[namesField];

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {names.map((name, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) =>
                    updatePartyMember(namesField, index, e.target.value)
                  }
                  placeholder="Enter name"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removePartyMember(namesField, index)}
                className="mb-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addPartyMember(namesField)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {title.slice(0, -1)}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Wedding Details Form</h2>
        <p className="text-muted-foreground">
          Please fill out the wedding-specific information for proper
          coordination and attire preparation
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-800">
            <Package className="h-5 w-5" />
            <span className="font-medium">Important:</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            This information helps us prepare the correct attire sizes and
            coordinate with all wedding party members. Please provide accurate
            measurements and contact information.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nuptial">Nuptial</Label>
              <Input
                id="nuptial"
                value={formData.nuptial}
                onChange={(e) => updateFormData("nuptial", e.target.value)}
                placeholder="Enter nuptial details"
              />
            </div>
            <div>
              <Label htmlFor="motif">Motif</Label>
              <Input
                id="motif"
                value={formData.motif}
                onChange={(e) => updateFormData("motif", e.target.value)}
                placeholder="Enter wedding motif"
              />
            </div>
            <div>
              <Label htmlFor="wedding_time">Wedding Time</Label>
              <Input
                id="wedding_time"
                type="time"
                value={formData.wedding_time}
                onChange={(e) => updateFormData("wedding_time", e.target.value)}
                placeholder="Select wedding time"
              />
            </div>
            <div>
              <Label htmlFor="church">Church/Venue</Label>
              <Input
                id="church"
                value={formData.church}
                onChange={(e) => updateFormData("church", e.target.value)}
                placeholder="Enter church or venue name"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => updateFormData("address", e.target.value)}
                placeholder="Enter full address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bride & Groom */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Bride & Groom
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bride_name">Bride Name</Label>
              <Input
                id="bride_name"
                value={formData.bride_name}
                onChange={(e) => updateFormData("bride_name", e.target.value)}
                placeholder="Enter bride's full name"
              />
            </div>
            <div>
              <Label htmlFor="bride_size">Bride Gown Size</Label>
              <Input
                id="bride_size"
                value={formData.bride_size}
                onChange={(e) => updateFormData("bride_size", e.target.value)}
                placeholder="Enter gown size"
              />
            </div>
            <div>
              <Label htmlFor="groom_name">Groom Name</Label>
              <Input
                id="groom_name"
                value={formData.groom_name}
                onChange={(e) => updateFormData("groom_name", e.target.value)}
                placeholder="Enter groom's full name"
              />
            </div>
            <div>
              <Label htmlFor="groom_size">Groom Attire Size</Label>
              <Input
                id="groom_size"
                value={formData.groom_size}
                onChange={(e) => updateFormData("groom_size", e.target.value)}
                placeholder="Enter attire size"
              />
            </div>
          </CardContent>
        </Card>

        {/* Parents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Bride's Parents
            </div>
            <div>
              <Label htmlFor="mother_bride_name">Mother's Name</Label>
              <Input
                id="mother_bride_name"
                value={formData.mother_bride_name}
                onChange={(e) =>
                  updateFormData("mother_bride_name", e.target.value)
                }
                placeholder="Enter mother's name"
              />
            </div>
            <div>
              <Label htmlFor="mother_bride_size">Mother's Attire Size</Label>
              <Input
                id="mother_bride_size"
                value={formData.mother_bride_size}
                onChange={(e) =>
                  updateFormData("mother_bride_size", e.target.value)
                }
                placeholder="Enter attire size"
              />
            </div>
            <div>
              <Label htmlFor="father_bride_name">Father's Name</Label>
              <Input
                id="father_bride_name"
                value={formData.father_bride_name}
                onChange={(e) =>
                  updateFormData("father_bride_name", e.target.value)
                }
                placeholder="Enter father's name"
              />
            </div>
            <div>
              <Label htmlFor="father_bride_size">Father's Attire Size</Label>
              <Input
                id="father_bride_size"
                value={formData.father_bride_size}
                onChange={(e) =>
                  updateFormData("father_bride_size", e.target.value)
                }
                placeholder="Enter attire size"
              />
            </div>

            <Separator className="my-4" />
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Groom's Parents
            </div>

            <div>
              <Label htmlFor="mother_groom_name">Groom's Mother Name</Label>
              <Input
                id="mother_groom_name"
                value={formData.mother_groom_name}
                onChange={(e) =>
                  updateFormData("mother_groom_name", e.target.value)
                }
                placeholder="Enter groom's mother name"
              />
            </div>
            <div>
              <Label htmlFor="mother_groom_size">
                Groom's Mother Attire Size
              </Label>
              <Input
                id="mother_groom_size"
                value={formData.mother_groom_size}
                onChange={(e) =>
                  updateFormData("mother_groom_size", e.target.value)
                }
                placeholder="Enter attire size"
              />
            </div>
            <div>
              <Label htmlFor="father_groom_name">Groom's Father Name</Label>
              <Input
                id="father_groom_name"
                value={formData.father_groom_name}
                onChange={(e) =>
                  updateFormData("father_groom_name", e.target.value)
                }
                placeholder="Enter groom's father name"
              />
            </div>
            <div>
              <Label htmlFor="father_groom_size">
                Groom's Father Attire Size
              </Label>
              <Input
                id="father_groom_size"
                value={formData.father_groom_size}
                onChange={(e) =>
                  updateFormData("father_groom_size", e.target.value)
                }
                placeholder="Enter attire size"
              />
            </div>
          </CardContent>
        </Card>

        {/* Principal Sponsors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Principal Sponsors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="maid_of_honor_name">Maid of Honor</Label>
              <Input
                id="maid_of_honor_name"
                value={formData.maid_of_honor_name}
                onChange={(e) =>
                  updateFormData("maid_of_honor_name", e.target.value)
                }
                placeholder="Enter maid of honor's name"
              />
            </div>
            <div>
              <Label htmlFor="maid_of_honor_size">Maid of Honor Size</Label>
              <Input
                id="maid_of_honor_size"
                value={formData.maid_of_honor_size}
                onChange={(e) =>
                  updateFormData("maid_of_honor_size", e.target.value)
                }
                placeholder="Enter dress size"
              />
            </div>
            <div>
              <Label htmlFor="best_man_name">Best Man</Label>
              <Input
                id="best_man_name"
                value={formData.best_man_name}
                onChange={(e) =>
                  updateFormData("best_man_name", e.target.value)
                }
                placeholder="Enter best man's name"
              />
            </div>
            <div>
              <Label htmlFor="best_man_size">Best Man Size</Label>
              <Input
                id="best_man_size"
                value={formData.best_man_size}
                onChange={(e) =>
                  updateFormData("best_man_size", e.target.value)
                }
                placeholder="Enter suit size"
              />
            </div>
          </CardContent>
        </Card>

        {/* Little Bride & Groom */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Little Bride & Groom
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="little_bride_name">Little Bride Name</Label>
              <Input
                id="little_bride_name"
                value={formData.little_bride_name}
                onChange={(e) =>
                  updateFormData("little_bride_name", e.target.value)
                }
                placeholder="Enter little bride's name"
              />
            </div>
            <div>
              <Label htmlFor="little_bride_size">Little Bride Size</Label>
              <Input
                id="little_bride_size"
                value={formData.little_bride_size}
                onChange={(e) =>
                  updateFormData("little_bride_size", e.target.value)
                }
                placeholder="Enter dress size"
              />
            </div>
            <div>
              <Label htmlFor="little_groom_name">Little Groom Name</Label>
              <Input
                id="little_groom_name"
                value={formData.little_groom_name}
                onChange={(e) =>
                  updateFormData("little_groom_name", e.target.value)
                }
                placeholder="Enter little groom's name"
              />
            </div>
            <div>
              <Label htmlFor="little_groom_size">Little Groom Size</Label>
              <Input
                id="little_groom_size"
                value={formData.little_groom_size}
                onChange={(e) =>
                  updateFormData("little_groom_size", e.target.value)
                }
                placeholder="Enter suit size"
              />
            </div>
          </CardContent>
        </Card>

        {/* Wedding Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Wedding Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cushions_qty">Cushions</Label>
                <Input
                  id="cushions_qty"
                  type="number"
                  min="0"
                  value={formData.cushions_qty}
                  onChange={(e) =>
                    updateFormData(
                      "cushions_qty",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="headdress_qty">Headdress for Bride</Label>
                <Input
                  id="headdress_qty"
                  type="number"
                  min="0"
                  value={formData.headdress_qty}
                  onChange={(e) =>
                    updateFormData(
                      "headdress_qty",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="shawls_qty">Shawls</Label>
                <Input
                  id="shawls_qty"
                  type="number"
                  min="0"
                  value={formData.shawls_qty}
                  onChange={(e) =>
                    updateFormData("shawls_qty", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label htmlFor="veil_cord_qty">Veil & Cord</Label>
                <Input
                  id="veil_cord_qty"
                  type="number"
                  min="0"
                  value={formData.veil_cord_qty}
                  onChange={(e) =>
                    updateFormData(
                      "veil_cord_qty",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="basket_qty">Basket</Label>
                <Input
                  id="basket_qty"
                  type="number"
                  min="0"
                  value={formData.basket_qty}
                  onChange={(e) =>
                    updateFormData("basket_qty", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label htmlFor="petticoat_qty">Petticoat</Label>
                <Input
                  id="petticoat_qty"
                  type="number"
                  min="0"
                  value={formData.petticoat_qty}
                  onChange={(e) =>
                    updateFormData(
                      "petticoat_qty",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="neck_bowtie_qty">Neck/Bowtie</Label>
                <Input
                  id="neck_bowtie_qty"
                  type="number"
                  min="0"
                  value={formData.neck_bowtie_qty}
                  onChange={(e) =>
                    updateFormData(
                      "neck_bowtie_qty",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="garter_leg_qty">Garter Leg</Label>
                <Input
                  id="garter_leg_qty"
                  type="number"
                  min="0"
                  value={formData.garter_leg_qty}
                  onChange={(e) =>
                    updateFormData(
                      "garter_leg_qty",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="fitting_form_qty">Fitting Form</Label>
                <Input
                  id="fitting_form_qty"
                  type="number"
                  min="0"
                  value={formData.fitting_form_qty}
                  onChange={(e) =>
                    updateFormData(
                      "fitting_form_qty",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="robe_qty">Robe</Label>
                <Input
                  id="robe_qty"
                  type="number"
                  min="0"
                  value={formData.robe_qty}
                  onChange={(e) =>
                    updateFormData("robe_qty", parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wedding Party Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderPartySection(
          "Bridesmaids",
          "bridesmaids_names",
          <Users className="h-5 w-5" />
        )}
        {renderPartySection(
          "Groomsmen",
          "groomsmen_names",
          <Users className="h-5 w-5" />
        )}
        {renderPartySection(
          "Junior Groomsmen",
          "junior_groomsmen_names",
          <User className="h-5 w-5" />
        )}
        {renderPartySection(
          "Flower Girls",
          "flower_girls_names",
          <User className="h-5 w-5" />
        )}
        {renderPartySection(
          "Ring Bearers",
          "ring_bearer_names",
          <User className="h-5 w-5" />
        )}
        {renderPartySection(
          "Bible Bearers",
          "bible_bearer_names",
          <User className="h-5 w-5" />
        )}
        {renderPartySection(
          "Coin Bearers",
          "coin_bearer_names",
          <User className="h-5 w-5" />
        )}
      </div>

      {/* Processing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Processing Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prepared_by">Prepared By</Label>
              <Input
                id="prepared_by"
                value={formData.prepared_by}
                onChange={(e) => updateFormData("prepared_by", e.target.value)}
                placeholder="Enter preparer's name"
              />
            </div>
            <div>
              <Label htmlFor="received_by">Received By</Label>
              <Input
                id="received_by"
                value={formData.received_by}
                onChange={(e) => updateFormData("received_by", e.target.value)}
                placeholder="Enter receiver's name"
              />
            </div>
            <div>
              <Label htmlFor="pickup_date">Pickup Date</Label>
              <Input
                id="pickup_date"
                type="date"
                value={formData.pickup_date}
                onChange={(e) => updateFormData("pickup_date", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="return_date">Return Date</Label>
              <Input
                id="return_date"
                type="date"
                value={formData.return_date}
                onChange={(e) => updateFormData("return_date", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="customer_signature">Customer Signature</Label>
            <Input
              id="customer_signature"
              value={formData.customer_signature}
              onChange={(e) =>
                updateFormData("customer_signature", e.target.value)
              }
              placeholder="Enter customer signature or name"
            />
          </div>
        </CardContent>
      </Card>

      {/* Next Button for Event Builder Flow */}
      {onNext && (
        <div className="flex justify-end mt-6">
          <Button onClick={handleNext} disabled={loading} className="px-8">
            {loading ? "Processing..." : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default WeddingFormStep;
