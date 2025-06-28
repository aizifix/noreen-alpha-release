"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface TimelineItem {
  id: string;
  startTime: string;
  componentName: string;
  location?: string;
  supplierName?: string;
}

interface Component {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface Supplier {
  supplierName?: string;
  status: "pending" | "confirmed" | "in-progress" | "completed";
}

interface ReviewStepData {
  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  event: {
    title: string;
    type: string;
    date: string;
    package: string;
    venue: string;
    capacity: number;
  };
  organizers: Array<{
    name: string;
    role: string;
    status: string;
  }>;
  components: {
    included: Component[];
    removed: Component[];
  };
  suppliers: Record<string, Supplier>;
  payment: {
    total: number;
    downPayment: number;
    balance: number;
    downPaymentMethod: string;
    paymentStatus: string;
    referenceNumber?: string;
  };
  timeline: TimelineItem[];
}

interface ReviewStepProps {
  data: ReviewStepData;
}

export function ReviewStep({ data }: ReviewStepProps) {
  // Get package name from ID
  const getPackageName = (packageId: string): string => {
    // This would normally fetch from a database
    const packageMap = {
      "pkg-001": "Gold Package",
      "pkg-002": "Silver Package",
      "pkg-003": "Premium Package",
      "pkg-004": "Standard Package",
      "pkg-005": "Executive Package",
      "pkg-006": "Standard Package",
    };
    return packageMap[packageId as keyof typeof packageMap] || packageId;
  };

  // Get venue name from ID
  const getVenueName = (venueId: string): string => {
    // This would normally fetch from a database
    const venueMap = {
      "venue-001": "Grand Ballroom, Luxury Hotel",
      "venue-002": "Garden Paradise Resort",
      "venue-003": "Beachfront Villa",
      "venue-004": "Party Hall",
      "venue-005": "Rooftop Lounge",
      "venue-006": "Restaurant Private Room",
      "venue-007": "Business Center Conference Room",
      "venue-008": "Hotel Meeting Space",
      "venue-009": "Executive Boardroom",
    };
    return venueMap[venueId as keyof typeof venueMap] || venueId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Event Summary</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Review all details before creating the event.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Client Information</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="text-sm font-medium">{data.client.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm">{data.client.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Phone:</span>
                <span className="text-sm">{data.client.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Address:</span>
                <span className="text-sm">{data.client.address}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Event Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Title:</span>
                <span className="text-sm font-medium">{data.event.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type:</span>
                <span className="text-sm capitalize">{data.event.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date:</span>
                <span className="text-sm">
                  {data.event.date
                    ? format(new Date(data.event.date), "MMMM d, yyyy")
                    : "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Package:</span>
                <span className="text-sm">
                  {getPackageName(data.event.package)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Venue:</span>
                <span className="text-sm">
                  {getVenueName(data.event.venue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Guests:</span>
                <span className="text-sm">{data.event.capacity} people</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Organizers</h4>
          <div className="space-y-2">
            {data.organizers && data.organizers.length > 0 ? (
              data.organizers.map((organizer, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-1 border-b"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {organizer.name}
                    </span>
                    <p className="text-xs text-muted-foreground capitalize">
                      {organizer.role}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                    {organizer.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex justify-between items-center py-1 border-b">
                <div>
                  <span className="text-sm font-medium">Noreen Lagdamin</span>
                  <p className="text-xs text-muted-foreground capitalize">
                    Default Organizer
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Components</h4>
          <div className="space-y-4">
            {data.components.included.length > 0 ? (
              <div className="grid gap-2">
                {data.components.included.map((component) => (
                  <div
                    key={component.id}
                    className="flex justify-between items-center py-1 border-b"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {component.name}
                      </span>
                      <p className="text-xs text-muted-foreground capitalize">
                        {component.category}
                      </p>
                    </div>
                    <span className="text-sm">
                      {formatCurrency(component.price)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No components selected
              </p>
            )}

            {data.components.removed.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Removed Components</h5>
                <div className="grid gap-2">
                  {data.components.removed.map((component) => (
                    <div
                      key={component.id}
                      className="flex justify-between items-center py-1 border-b text-muted-foreground"
                    >
                      <div>
                        <span className="text-sm">{component.name}</span>
                        <p className="text-xs capitalize">
                          {component.category}
                        </p>
                      </div>
                      <span className="text-sm line-through">
                        {formatCurrency(component.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Supplier Assignments</h4>
          <div className="space-y-4">
            {Object.keys(data.suppliers).length > 0 ? (
              <div className="grid gap-2">
                {Object.entries(data.suppliers).map(
                  ([componentId, assignment]) => {
                    const component = data.components.included.find(
                      (c) => c.id === componentId
                    );
                    if (!component) return null;

                    return (
                      <div
                        key={componentId}
                        className="flex justify-between items-center py-1 border-b"
                      >
                        <div>
                          <span className="text-sm font-medium">
                            {component.name}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {assignment.supplierName || "No supplier assigned"}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          {assignment.status === "pending"
                            ? "Pending"
                            : assignment.status === "confirmed"
                              ? "Confirmed"
                              : assignment.status === "in-progress"
                                ? "In Progress"
                                : assignment.status === "completed"
                                  ? "Completed"
                                  : "Pending"}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No suppliers assigned
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Payment Details</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-lg font-bold">
                {formatCurrency(data.payment.total)}
              </span>
            </div>

            <Separator />

            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">Down Payment:</span>
                  <p className="text-xs text-muted-foreground capitalize">
                    via {data.payment.downPaymentMethod.replace("-", " ")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">
                    {formatCurrency(data.payment.downPayment)}
                  </span>
                  <p className="text-xs px-2 py-0.5 rounded-full bg-muted inline-block ml-2">
                    {data.payment.paymentStatus}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">Balance:</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">
                    {formatCurrency(data.payment.balance)}
                  </span>
                </div>
              </div>
            </div>

            {data.payment.referenceNumber && (
              <div className="mt-2">
                <span className="text-sm text-muted-foreground">
                  Reference Number:
                </span>
                <span className="text-sm ml-2">
                  {data.payment.referenceNumber}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Timeline</h4>
          <div className="space-y-2">
            {data.timeline.length > 0 ? (
              data.timeline.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start space-x-3 py-2 border-b"
                >
                  <div className="flex-shrink-0 w-16 text-sm text-muted-foreground">
                    {item.startTime}
                  </div>
                  <div>
                    <span className="text-sm font-medium">
                      {item.componentName}
                    </span>
                    {item.location && (
                      <p className="text-xs text-muted-foreground">
                        Location: {item.location}
                      </p>
                    )}
                    {item.supplierName && (
                      <p className="text-xs text-muted-foreground">
                        Supplier: {item.supplierName}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No timeline items</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
