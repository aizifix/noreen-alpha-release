"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";
import {
  VenueFormData,
  VenueInclusion,
  VenueComponent,
  VenueSubcomponent,
} from "./page";

interface VenueInclusionsProps {
  data: VenueFormData;
  onChange: (data: Partial<VenueFormData>) => void;
}

export function VenueInclusions({ data, onChange }: VenueInclusionsProps) {
  const [expandedInclusion, setExpandedInclusion] = useState<number | null>(
    null
  );
  const [expandedComponent, setExpandedComponent] = useState<{
    inclusion: number;
    component: number;
  } | null>(null);

  const addInclusion = () => {
    const newInclusion: VenueInclusion = {
      inclusion_name: "",
      inclusion_description: "",
      inclusion_price: 0,
      components: [],
    };
    onChange({
      inclusions: [...data.inclusions, newInclusion],
    });
    setExpandedInclusion(data.inclusions.length);
  };

  const updateInclusion = (index: number, updates: Partial<VenueInclusion>) => {
    const newInclusions = [...data.inclusions];
    newInclusions[index] = { ...newInclusions[index], ...updates };
    onChange({ inclusions: newInclusions });
  };

  const removeInclusion = (index: number) => {
    const newInclusions = data.inclusions.filter((_, i) => i !== index);
    onChange({ inclusions: newInclusions });
    if (expandedInclusion === index) {
      setExpandedInclusion(null);
    }
  };

  const addComponent = (inclusionIndex: number) => {
    const newComponent: VenueComponent = {
      component_name: "",
      component_description: "",
      subcomponents: [],
    };
    const newInclusions = [...data.inclusions];
    newInclusions[inclusionIndex].components.push(newComponent);
    onChange({ inclusions: newInclusions });
  };

  const updateComponent = (
    inclusionIndex: number,
    componentIndex: number,
    updates: Partial<VenueComponent>
  ) => {
    const newInclusions = [...data.inclusions];
    newInclusions[inclusionIndex].components[componentIndex] = {
      ...newInclusions[inclusionIndex].components[componentIndex],
      ...updates,
    };
    onChange({ inclusions: newInclusions });
  };

  const removeComponent = (inclusionIndex: number, componentIndex: number) => {
    const newInclusions = [...data.inclusions];
    newInclusions[inclusionIndex].components = newInclusions[
      inclusionIndex
    ].components.filter((_, i) => i !== componentIndex);
    onChange({ inclusions: newInclusions });
  };

  const addSubcomponent = (inclusionIndex: number, componentIndex: number) => {
    const newSubcomponent: VenueSubcomponent = {
      subcomponent_name: "",
      subcomponent_description: "",
    };
    const newInclusions = [...data.inclusions];
    newInclusions[inclusionIndex].components[componentIndex].subcomponents.push(
      newSubcomponent
    );
    onChange({ inclusions: newInclusions });
  };

  const updateSubcomponent = (
    inclusionIndex: number,
    componentIndex: number,
    subcomponentIndex: number,
    updates: Partial<VenueSubcomponent>
  ) => {
    const newInclusions = [...data.inclusions];
    newInclusions[inclusionIndex].components[componentIndex].subcomponents[
      subcomponentIndex
    ] = {
      ...newInclusions[inclusionIndex].components[componentIndex].subcomponents[
        subcomponentIndex
      ],
      ...updates,
    };
    onChange({ inclusions: newInclusions });
  };

  const removeSubcomponent = (
    inclusionIndex: number,
    componentIndex: number,
    subcomponentIndex: number
  ) => {
    const newInclusions = [...data.inclusions];
    newInclusions[inclusionIndex].components[componentIndex].subcomponents =
      newInclusions[inclusionIndex].components[
        componentIndex
      ].subcomponents.filter((_, i) => i !== subcomponentIndex);
    onChange({ inclusions: newInclusions });
  };

  return (
    <div className="space-y-6">
      {data.inclusions.map((inclusion, inclusionIndex) => (
        <Card key={inclusionIndex} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setExpandedInclusion(
                      expandedInclusion === inclusionIndex
                        ? null
                        : inclusionIndex
                    )
                  }
                >
                  {expandedInclusion === inclusionIndex ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Inclusion Name"
                    value={inclusion.inclusion_name}
                    onChange={(e) =>
                      updateInclusion(inclusionIndex, {
                        inclusion_name: e.target.value,
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={inclusion.inclusion_price}
                    onChange={(e) =>
                      updateInclusion(inclusionIndex, {
                        inclusion_price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeInclusion(inclusionIndex)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>

              {expandedInclusion === inclusionIndex && (
                <div className="pl-8 space-y-4">
                  <Textarea
                    placeholder="Inclusion Description"
                    value={inclusion.inclusion_description || ""}
                    onChange={(e) =>
                      updateInclusion(inclusionIndex, {
                        inclusion_description: e.target.value,
                      })
                    }
                  />

                  <div className="space-y-4">
                    <Label>Components</Label>
                    {inclusion.components.map((component, componentIndex) => (
                      <Card key={componentIndex} className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExpandedComponent(
                                  expandedComponent?.inclusion ===
                                    inclusionIndex &&
                                    expandedComponent?.component ===
                                      componentIndex
                                    ? null
                                    : {
                                        inclusion: inclusionIndex,
                                        component: componentIndex,
                                      }
                                )
                              }
                            >
                              {expandedComponent?.inclusion ===
                                inclusionIndex &&
                              expandedComponent?.component ===
                                componentIndex ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Input
                              placeholder="Component Name"
                              value={component.component_name}
                              onChange={(e) =>
                                updateComponent(
                                  inclusionIndex,
                                  componentIndex,
                                  {
                                    component_name: e.target.value,
                                  }
                                )
                              }
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                removeComponent(inclusionIndex, componentIndex)
                              }
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>

                          {expandedComponent?.inclusion === inclusionIndex &&
                            expandedComponent?.component === componentIndex && (
                              <div className="pl-8 space-y-4">
                                <Textarea
                                  placeholder="Component Description"
                                  value={component.component_description || ""}
                                  onChange={(e) =>
                                    updateComponent(
                                      inclusionIndex,
                                      componentIndex,
                                      {
                                        component_description: e.target.value,
                                      }
                                    )
                                  }
                                />

                                <div className="space-y-2">
                                  <Label>Subcomponents</Label>
                                  {component.subcomponents.map(
                                    (subcomponent, subcomponentIndex) => (
                                      <div
                                        key={subcomponentIndex}
                                        className="flex items-center gap-4"
                                      >
                                        <Input
                                          placeholder="Subcomponent Name"
                                          value={subcomponent.subcomponent_name}
                                          onChange={(e) =>
                                            updateSubcomponent(
                                              inclusionIndex,
                                              componentIndex,
                                              subcomponentIndex,
                                              {
                                                subcomponent_name:
                                                  e.target.value,
                                              }
                                            )
                                          }
                                        />
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() =>
                                            removeSubcomponent(
                                              inclusionIndex,
                                              componentIndex,
                                              subcomponentIndex
                                            )
                                          }
                                        >
                                          <Minus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      addSubcomponent(
                                        inclusionIndex,
                                        componentIndex
                                      )
                                    }
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Subcomponent
                                  </Button>
                                </div>
                              </div>
                            )}
                        </div>
                      </Card>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => addComponent(inclusionIndex)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Component
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}

      <Button onClick={addInclusion}>
        <Plus className="h-4 w-4 mr-2" />
        Add Inclusion
      </Button>
    </div>
  );
}
