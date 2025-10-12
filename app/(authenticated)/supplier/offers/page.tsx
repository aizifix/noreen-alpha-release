"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Star,
  DollarSign,
  Users,
  Package,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface Offer {
  offer_id: number;
  offer_title: string;
  tier_name: string;
  tier_level: number;
  offer_description: string;
  price_min: number;
  price_max: number;
  service_category: string;
  package_size: string;
  max_guests: number;
  setup_fee: number;
  delivery_timeframe: string;
  terms_conditions: string;
  cancellation_policy: string;
  is_featured: boolean;
  is_active: boolean;
  times_booked: number;
  avg_rating: number;
  rating_count: number;
  subcomponents: SubComponent[];
}

interface SubComponent {
  subcomponent_id?: number;
  component_title: string;
  component_description: string;
  is_customizable: boolean;
  display_order: number;
}

export default function SupplierOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [newOffer, setNewOffer] = useState({
    offer_title: "",
    tier_name: "",
    tier_level: 1,
    offer_description: "",
    price_min: 0,
    price_max: 0,
    service_category: "",
    package_size: "",
    max_guests: 0,
    setup_fee: 0,
    delivery_timeframe: "",
    terms_conditions: "",
    cancellation_policy: "",
    is_featured: false,
    subcomponents: [] as SubComponent[],
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const userId = 1; // This should come from authentication

      const response = await axios.get(
        `${endpoints.supplier}?operation=getOffers&user_id=${userId}`
      );
      const data = response.data;

      if (data.status === "success") {
        setOffers(data.offers);
      } else {
        console.error("Failed to fetch offers:", data.message);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    try {
      const userId = 1; // This should come from authentication

      const response = await axios.post(
        endpoints.supplier,
        { operation: "createOffer", user_id: userId, ...newOffer },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = response.data;

      if (data.status === "success") {
        await fetchOffers();
        setShowCreateModal(false);
        resetNewOffer();
        toast.success("Offer created successfully!");
      } else {
        toast.error("Failed to create offer: " + data.message);
      }
    } catch (error) {
      console.error("Error creating offer:", error);
      toast.error("Error creating offer");
    }
  };

  const handleEditOffer = async () => {
    if (!editingOffer) return;

    try {
      const userId = 1; // This should come from authentication

      const response = await axios.post(
        endpoints.supplier,
        {
          operation: "updateOffer",
          user_id: userId,
          offer_id: editingOffer.offer_id,
          ...editingOffer,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = response.data;

      if (data.status === "success") {
        await fetchOffers();
        setEditingOffer(null);
        toast.success("Offer updated successfully!");
      } else {
        toast.error("Failed to update offer: " + data.message);
      }
    } catch (error) {
      console.error("Error updating offer:", error);
      toast.error("Error updating offer");
    }
  };

  const handleDeleteOffer = async (offerId: number) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;

    try {
      const userId = 1; // This should come from authentication

      const response = await axios.post(
        endpoints.supplier,
        { operation: "deleteOffer", user_id: userId, offer_id: offerId },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = response.data;

      if (data.status === "success") {
        await fetchOffers();
        toast.success("Offer deleted successfully!");
      } else {
        toast.error("Failed to delete offer: " + data.message);
      }
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Error deleting offer");
    }
  };

  const resetNewOffer = () => {
    setNewOffer({
      offer_title: "",
      tier_name: "",
      tier_level: 1,
      offer_description: "",
      price_min: 0,
      price_max: 0,
      service_category: "",
      package_size: "",
      max_guests: 0,
      setup_fee: 0,
      delivery_timeframe: "",
      terms_conditions: "",
      cancellation_policy: "",
      is_featured: false,
      subcomponents: [],
    });
  };

  const addSubComponent = (offer: any, setOffer: any) => {
    const newSubcomponent: SubComponent = {
      component_title: "",
      component_description: "",
      is_customizable: false,
      display_order: offer.subcomponents.length + 1,
    };

    setOffer({
      ...offer,
      subcomponents: [...offer.subcomponents, newSubcomponent],
    });
  };

  const updateSubComponent = (
    index: number,
    field: keyof SubComponent,
    value: any,
    offer: any,
    setOffer: any
  ) => {
    const updatedSubcomponents = [...offer.subcomponents];
    updatedSubcomponents[index] = {
      ...updatedSubcomponents[index],
      [field]: value,
    };

    setOffer({
      ...offer,
      subcomponents: updatedSubcomponents,
    });
  };

  const removeSubComponent = (index: number, offer: any, setOffer: any) => {
    const updatedSubcomponents = offer.subcomponents.filter(
      (_: any, i: number) => i !== index
    );
    setOffer({
      ...offer,
      subcomponents: updatedSubcomponents,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const getTierBadgeColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-yellow-100 text-yellow-800";
      case 2:
        return "bg-blue-100 text-blue-800";
      case 3:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderOfferForm = (offer: any, setOffer: any, isEdit = false) => (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="offer_title">Offer Title *</Label>
            <Input
              id="offer_title"
              value={offer.offer_title}
              onChange={(e) =>
                setOffer({ ...offer, offer_title: e.target.value })
              }
              placeholder="Premium Wedding Catering"
            />
          </div>

          <div>
            <Label htmlFor="tier_name">Tier Name</Label>
            <Input
              id="tier_name"
              value={offer.tier_name}
              onChange={(e) =>
                setOffer({ ...offer, tier_name: e.target.value })
              }
              placeholder="Premium Package"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="tier_level">Tier Level</Label>
            <Select
              value={offer.tier_level.toString()}
              onValueChange={(value) =>
                setOffer({ ...offer, tier_level: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Premium</SelectItem>
                <SelectItem value="2">2 - Standard</SelectItem>
                <SelectItem value="3">3 - Basic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="package_size">Package Size</Label>
            <Select
              value={offer.package_size}
              onValueChange={(value) =>
                setOffer({ ...offer, package_size: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (1-50 guests)</SelectItem>
                <SelectItem value="medium">Medium (51-150 guests)</SelectItem>
                <SelectItem value="large">Large (151+ guests)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="max_guests">Max Guests</Label>
            <Input
              id="max_guests"
              type="number"
              value={offer.max_guests}
              onChange={(e) =>
                setOffer({
                  ...offer,
                  max_guests: parseInt(e.target.value) || 0,
                })
              }
              placeholder="200"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="offer_description">Description</Label>
          <Textarea
            id="offer_description"
            value={offer.offer_description}
            onChange={(e) =>
              setOffer({ ...offer, offer_description: e.target.value })
            }
            placeholder="Detailed description of your offer..."
            rows={3}
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Pricing</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="price_min">Minimum Price *</Label>
            <Input
              id="price_min"
              type="number"
              value={offer.price_min}
              onChange={(e) =>
                setOffer({
                  ...offer,
                  price_min: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="50000"
            />
          </div>

          <div>
            <Label htmlFor="price_max">Maximum Price</Label>
            <Input
              id="price_max"
              type="number"
              value={offer.price_max}
              onChange={(e) =>
                setOffer({
                  ...offer,
                  price_max: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="100000"
            />
          </div>

          <div>
            <Label htmlFor="setup_fee">Setup Fee</Label>
            <Input
              id="setup_fee"
              type="number"
              value={offer.setup_fee}
              onChange={(e) =>
                setOffer({
                  ...offer,
                  setup_fee: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="5000"
            />
          </div>
        </div>
      </div>

      {/* Service Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Service Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="service_category">Service Category</Label>
            <Input
              id="service_category"
              value={offer.service_category}
              onChange={(e) =>
                setOffer({ ...offer, service_category: e.target.value })
              }
              placeholder="Catering"
            />
          </div>

          <div>
            <Label htmlFor="delivery_timeframe">Delivery Timeframe</Label>
            <Input
              id="delivery_timeframe"
              value={offer.delivery_timeframe}
              onChange={(e) =>
                setOffer({ ...offer, delivery_timeframe: e.target.value })
              }
              placeholder="2-3 days preparation"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="terms_conditions">Terms & Conditions</Label>
          <Textarea
            id="terms_conditions"
            value={offer.terms_conditions}
            onChange={(e) =>
              setOffer({ ...offer, terms_conditions: e.target.value })
            }
            placeholder="Payment terms, requirements, etc..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="cancellation_policy">Cancellation Policy</Label>
          <Textarea
            id="cancellation_policy"
            value={offer.cancellation_policy}
            onChange={(e) =>
              setOffer({ ...offer, cancellation_policy: e.target.value })
            }
            placeholder="Cancellation terms and refund policy..."
            rows={2}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_featured"
            checked={offer.is_featured}
            onCheckedChange={(checked: boolean) =>
              setOffer({ ...offer, is_featured: checked })
            }
          />
          <Label htmlFor="is_featured">Mark as Featured Offer</Label>
        </div>
      </div>

      {/* Subcomponents */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Included Components</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addSubComponent(offer, setOffer)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Component
          </Button>
        </div>

        {offer.subcomponents.map(
          (subcomponent: SubComponent, index: number) => (
            <Card key={`supplier-offer-subcomponent-${index}`}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label>Component Title</Label>
                        <Input
                          value={subcomponent.component_title}
                          onChange={(e) =>
                            updateSubComponent(
                              index,
                              "component_title",
                              e.target.value,
                              offer,
                              setOffer
                            )
                          }
                          placeholder="Welcome cocktail service"
                        />
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={subcomponent.component_description}
                          onChange={(e) =>
                            updateSubComponent(
                              index,
                              "component_description",
                              e.target.value,
                              offer,
                              setOffer
                            )
                          }
                          placeholder="Pre-ceremony cocktail reception..."
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={subcomponent.is_customizable}
                          onCheckedChange={(checked: boolean) =>
                            updateSubComponent(
                              index,
                              "is_customizable",
                              checked,
                              offer,
                              setOffer
                            )
                          }
                        />
                        <Label>Client can customize this component</Label>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSubComponent(index, offer, setOffer)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        )}

        {offer.subcomponents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No components added yet</p>
            <p className="text-sm">
              Add components to describe what's included in this offer
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Offers</h1>
          <p className="text-gray-600 mt-1">
            Manage your service offerings and packages
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Offer
        </Button>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <Card
            key={offer.offer_id}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">
                    {offer.offer_title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {offer.tier_name && (
                      <Badge className={getTierBadgeColor(offer.tier_level)}>
                        {offer.tier_name}
                      </Badge>
                    )}
                    {offer.is_featured && (
                      <Badge variant="secondary">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingOffer(offer)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteOffer(offer.offer_id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Price Range</span>
                  <span className="font-medium">
                    {formatCurrency(offer.price_min)} -{" "}
                    {formatCurrency(offer.price_max)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Times Booked</span>
                  <span className="font-medium">{offer.times_booked}</span>
                </div>

                {offer.avg_rating > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">
                        {offer.avg_rating.toFixed(1)}
                      </span>
                      <span className="text-gray-500">
                        ({offer.rating_count})
                      </span>
                    </div>
                  </div>
                )}

                {offer.max_guests > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Max Guests</span>
                    <span className="font-medium">{offer.max_guests}</span>
                  </div>
                )}
              </div>

              {offer.subcomponents.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Includes ({offer.subcomponents.length} components):
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {offer.subcomponents.slice(0, 3).map((sub, index) => (
                      <li
                        key={`supplier-offer-subcomponent-list-${index}`}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {sub.component_title}
                      </li>
                    ))}
                    {offer.subcomponents.length > 3 && (
                      <li className="text-gray-500">
                        +{offer.subcomponents.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${offer.is_active ? "bg-green-500" : "bg-gray-400"}`}
                  ></div>
                  <span className="text-xs text-gray-600">
                    {offer.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {offers.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No offers yet
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first service offer to start getting bookings
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Offer
          </Button>
        </div>
      )}

      {/* Create Offer Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Offer</DialogTitle>
            <DialogDescription>
              Create a new service offering for your clients to choose from
            </DialogDescription>
          </DialogHeader>

          {renderOfferForm(newOffer, setNewOffer)}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOffer}>Create Offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Offer Modal */}
      <Dialog open={!!editingOffer} onOpenChange={() => setEditingOffer(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Offer</DialogTitle>
            <DialogDescription>
              Update your service offering details
            </DialogDescription>
          </DialogHeader>

          {editingOffer && renderOfferForm(editingOffer, setEditingOffer, true)}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOffer(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditOffer}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
