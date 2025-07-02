"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface WeddingPartyMember {
  name: string;
  size: string;
}

interface WeddingFormData {
  // Basic Info
  nuptial: string;
  motif: string;

  // Main Couple
  bride_name: string;
  bride_gown_size: string;
  groom_name: string;
  groom_attire_size: string;

  // Parents
  mothers_attire_name: string;
  mothers_attire_size: string;
  fathers_attire_name: string;
  fathers_attire_size: string;

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

  // Wedding Party Arrays
  bridesmaids: WeddingPartyMember[];
  groomsmen: WeddingPartyMember[];
  junior_groomsmen: WeddingPartyMember[];
  flower_girls: WeddingPartyMember[];
  bearers: WeddingPartyMember[];

  // Wedding Items Quantities
  cushions_quantity: number;
  headdress_for_bride_quantity: number;
  shawls_quantity: number;
  veil_cord_quantity: number;
  basket_quantity: number;
  petticoat_quantity: number;
  neck_bowtie_quantity: number;
  garter_leg_quantity: number;
  fitting_form_quantity: number;
  robe_quantity: number;

  // Processing Info
  prepared_by: string;
  received_by: string;
  pick_up_date: string;
  return_date: string;
  customer_signature: string;
}

interface WeddingFormStepProps {
  eventId?: number;
  initialData?: Partial<WeddingFormData>;
  onUpdate?: (data: WeddingFormData) => void;
  onNext?: () => void;
}

export function WeddingFormStep({
  eventId,
  initialData,
  onUpdate,
  onNext,
}: WeddingFormStepProps) {
  const [formData, setFormData] = useState<WeddingFormData>({
    nuptial: "",
    motif: "",
    bride_name: "",
    bride_gown_size: "",
    groom_name: "",
    groom_attire_size: "",
    mothers_attire_name: "",
    mothers_attire_size: "",
    fathers_attire_name: "",
    fathers_attire_size: "",
    maid_of_honor_name: "",
    maid_of_honor_size: "",
    best_man_name: "",
    best_man_size: "",
    little_bride_name: "",
    little_bride_size: "",
    little_groom_name: "",
    little_groom_size: "",
    bridesmaids: [],
    groomsmen: [],
    junior_groomsmen: [],
    flower_girls: [],
    bearers: [],
    cushions_quantity: 0,
    headdress_for_bride_quantity: 0,
    shawls_quantity: 0,
    veil_cord_quantity: 0,
    basket_quantity: 0,
    petticoat_quantity: 0,
    neck_bowtie_quantity: 0,
    garter_leg_quantity: 0,
    fitting_form_quantity: 0,
    robe_quantity: 0,
    prepared_by: "",
    received_by: "",
    pick_up_date: "",
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

  const loadWeddingDetails = async () => {
    try {
      const response = await fetch(
        `/app/api/admin.php?operation=getWeddingDetails&event_id=${eventId}`
      );
      const data = await response.json();

      if (data.status === "success" && data.wedding_details) {
        setFormData((prev) => ({ ...prev, ...data.wedding_details }));
      }
    } catch (error) {
      console.error("Error loading wedding details:", error);
    }
  };

  const updateFormData = (field: keyof WeddingFormData, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onUpdate?.(newData);
  };

  const addPartyMember = (
    arrayName: keyof Pick<
      WeddingFormData,
      | "bridesmaids"
      | "groomsmen"
      | "junior_groomsmen"
      | "flower_girls"
      | "bearers"
    >
  ) => {
    const currentArray = formData[arrayName] as WeddingPartyMember[];
    const newArray = [...currentArray, { name: "", size: "" }];
    updateFormData(arrayName, newArray);
  };

  const removePartyMember = (
    arrayName: keyof Pick<
      WeddingFormData,
      | "bridesmaids"
      | "groomsmen"
      | "junior_groomsmen"
      | "flower_girls"
      | "bearers"
    >,
    index: number
  ) => {
    const currentArray = formData[arrayName] as WeddingPartyMember[];
    const newArray = currentArray.filter((_, i) => i !== index);
    updateFormData(arrayName, newArray);
  };

  const updatePartyMember = (
    arrayName: keyof Pick<
      WeddingFormData,
      | "bridesmaids"
      | "groomsmen"
      | "junior_groomsmen"
      | "flower_girls"
      | "bearers"
    >,
    index: number,
    field: keyof WeddingPartyMember,
    value: string
  ) => {
    const currentArray = formData[arrayName] as WeddingPartyMember[];
    const newArray = [...currentArray];
    newArray[index] = { ...newArray[index], [field]: value };
    updateFormData(arrayName, newArray);
  };

  const saveWeddingDetails = async () => {
    if (!eventId) {
      toast({
        title: "Error",
        description: "Event ID is required to save wedding details",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      console.log("🔍 Wedding Form Debug:");
      console.log("Event ID:", eventId);
      console.log("Form Data:", formData);

      const payload = {
        operation: "saveWeddingDetails",
        event_id: eventId,
        ...formData,
      };

      console.log("📤 Sending payload:", payload);

      const response = await fetch("/app/api/admin.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", response.headers);

      const data = await response.json();
      console.log("📥 Response data:", data);

      if (data.status === "success") {
        toast({
          title: "Success",
          description: "Wedding details saved successfully",
        });
        return true;
      } else {
        console.error("❌ Server error:", data.message);
        toast({
          title: "Error",
          description: data.message || "Failed to save wedding details",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("❌ Network/JS error:", error);
      toast({
        title: "Error",
        description: "Failed to save wedding details - Network Error",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    const saved = await saveWeddingDetails();
    if (saved) {
      onNext?.();
    }
  };

  const renderPartySection = (
    title: string,
    arrayName: keyof Pick<
      WeddingFormData,
      | "bridesmaids"
      | "groomsmen"
      | "junior_groomsmen"
      | "flower_girls"
      | "bearers"
    >,
    icon: React.ReactNode
  ) => {
    const members = formData[arrayName] as WeddingPartyMember[];

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Name</Label>
                <Input
                  value={member.name}
                  onChange={(e) =>
                    updatePartyMember(arrayName, index, "name", e.target.value)
                  }
                  placeholder="Enter name"
                />
              </div>
              <div className="w-24">
                <Label>Size</Label>
                <Input
                  value={member.size}
                  onChange={(e) =>
                    updatePartyMember(arrayName, index, "size", e.target.value)
                  }
                  placeholder="Size"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removePartyMember(arrayName, index)}
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
            onClick={() => addPartyMember(arrayName)}
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
          coordination
        </p>
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
              <Label htmlFor="bride_gown_size">Bride Gown Size</Label>
              <Input
                id="bride_gown_size"
                value={formData.bride_gown_size}
                onChange={(e) =>
                  updateFormData("bride_gown_size", e.target.value)
                }
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
              <Label htmlFor="groom_attire_size">Groom Attire Size</Label>
              <Input
                id="groom_attire_size"
                value={formData.groom_attire_size}
                onChange={(e) =>
                  updateFormData("groom_attire_size", e.target.value)
                }
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
            <div>
              <Label htmlFor="mothers_attire_name">Mother's Name</Label>
              <Input
                id="mothers_attire_name"
                value={formData.mothers_attire_name}
                onChange={(e) =>
                  updateFormData("mothers_attire_name", e.target.value)
                }
                placeholder="Enter mother's name"
              />
            </div>
            <div>
              <Label htmlFor="mothers_attire_size">Mother's Attire Size</Label>
              <Input
                id="mothers_attire_size"
                value={formData.mothers_attire_size}
                onChange={(e) =>
                  updateFormData("mothers_attire_size", e.target.value)
                }
                placeholder="Enter attire size"
              />
            </div>
            <div>
              <Label htmlFor="fathers_attire_name">Father's Name</Label>
              <Input
                id="fathers_attire_name"
                value={formData.fathers_attire_name}
                onChange={(e) =>
                  updateFormData("fathers_attire_name", e.target.value)
                }
                placeholder="Enter father's name"
              />
            </div>
            <div>
              <Label htmlFor="fathers_attire_size">Father's Attire Size</Label>
              <Input
                id="fathers_attire_size"
                value={formData.fathers_attire_size}
                onChange={(e) =>
                  updateFormData("fathers_attire_size", e.target.value)
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
                <Label htmlFor="cushions_quantity">Cushions</Label>
                <Input
                  id="cushions_quantity"
                  type="number"
                  min="0"
                  value={formData.cushions_quantity}
                  onChange={(e) =>
                    updateFormData(
                      "cushions_quantity",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="headdress_for_bride_quantity">
                  Headdress for Bride
                </Label>
                <Input
                  id="headdress_for_bride_quantity"
                  type="number"
                  min="0"
                  value={formData.headdress_for_bride_quantity}
                  onChange={(e) =>
                    updateFormData(
                      "headdress_for_bride_quantity",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="shawls_quantity">Shawls</Label>
                <Input
                  id="shawls_quantity"
                  type="number"
                  min="0"
                  value={formData.shawls_quantity}
                  onChange={(e) =>
                    updateFormData(
                      "shawls_quantity",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="veil_cord_quantity">Veil & Cord</Label>
                <Input
                  id="veil_cord_quantity"
                  type="number"
                  min="0"
                  value={formData.veil_cord_quantity}
                  onChange={(e) =>
                    updateFormData(
                      "veil_cord_quantity",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="basket_quantity">Basket</Label>
                <Input
                  id="basket_quantity"
                  type="number"
                  min="0"
                  value={formData.basket_quantity}
                  onChange={(e) =>
                    updateFormData(
                      "basket_quantity",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="petticoat_quantity">Petticoat</Label>
                <Input
                  id="petticoat_quantity"
                  type="number"
                  min="0"
                  value={formData.petticoat_quantity}
                  onChange={(e) =>
                    updateFormData(
                      "petticoat_quantity",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="neck_bowtie_quantity">Neck/Bowtie</Label>
                <Input
                  id="neck_bowtie_quantity"
                  type="number"
                  min="0"
                  value={formData.neck_bowtie_quantity}
                  onChange={(e) =>
                    updateFormData(
                      "neck_bowtie_quantity",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="garter_leg_quantity">Garter Leg</Label>
                <Input
                  id="garter_leg_quantity"
                  type="number"
                  min="0"
                  value={formData.garter_leg_quantity}
                  onChange={(e) =>
                    updateFormData(
                      "garter_leg_quantity",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="fitting_form_quantity">Fitting Form</Label>
                <Input
                  id="fitting_form_quantity"
                  type="number"
                  min="0"
                  value={formData.fitting_form_quantity}
                  onChange={(e) =>
                    updateFormData(
                      "fitting_form_quantity",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="robe_quantity">Robe</Label>
                <Input
                  id="robe_quantity"
                  type="number"
                  min="0"
                  value={formData.robe_quantity}
                  onChange={(e) =>
                    updateFormData(
                      "robe_quantity",
                      parseInt(e.target.value) || 0
                    )
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
          "bridesmaids",
          <Users className="h-5 w-5" />
        )}
        {renderPartySection(
          "Groomsmen",
          "groomsmen",
          <Users className="h-5 w-5" />
        )}
        {renderPartySection(
          "Junior Groomsmen",
          "junior_groomsmen",
          <User className="h-5 w-5" />
        )}
        {renderPartySection(
          "Flower Girls",
          "flower_girls",
          <User className="h-5 w-5" />
        )}
        {renderPartySection("Bearers", "bearers", <User className="h-5 w-5" />)}
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
              <Label htmlFor="pick_up_date">Pick Up Date</Label>
              <Input
                id="pick_up_date"
                type="date"
                value={formData.pick_up_date}
                onChange={(e) => updateFormData("pick_up_date", e.target.value)}
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
            <Textarea
              id="customer_signature"
              value={formData.customer_signature}
              onChange={(e) =>
                updateFormData("customer_signature", e.target.value)
              }
              placeholder="Customer signature or notes"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WeddingFormStep;
