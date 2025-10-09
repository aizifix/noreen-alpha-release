"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  ChevronsUpDown,
  Check,
  PlusCircle,
  Eye,
  EyeOff,
  Search,
  X,
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  Pencil,
  User,
  Mail,
  Phone,
  MapPin as AddressIcon,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import type {
  ClientData,
  ClientDetailsStepProps,
  EventDetails,
} from "@/app/types/event-builder";

// Interface for client data from API
interface DbClient {
  user_id: number;
  user_firstName: string;
  user_lastName: string;
  user_email: string;
  user_contact: string;
  user_address?: string; // Address field now available in database
  user_pfp?: string;
  user_birthdate?: string;
  user_username?: string;
  registration_date?: string;
  total_events?: number;
  total_bookings?: number;
  total_payments?: number;
  last_event_date?: string;
  [key: string]: any; // Allow for additional fields
}

// Sample client data for demonstration
const existingClients = [
  {
    id: "client-001",
    name: "Maria Santos",
    email: "maria.santos@example.com",
    phone: "+63 912 345 6789",
    address: "123 Main St, Makati City",
  },
  {
    id: "client-002",
    name: "Acme Technologies",
    email: "events@acmetech.com",
    phone: "+63 923 456 7890",
    address: "456 Corporate Ave, Taguig City",
  },
  {
    id: "client-003",
    name: "Carlos Garcia",
    email: "carlos.garcia@example.com",
    phone: "+63 934 567 8901",
    address: "789 Residential Blvd, Quezon City",
  },
  {
    id: "client-004",
    name: "Future Electronics",
    email: "marketing@futureelectronics.com",
    phone: "+63 945 678 9012",
    address: "101 Business Park, Pasig City",
  },
  {
    id: "client-005",
    name: "Juan Mendoza",
    email: "juan.mendoza@example.com",
    phone: "+63 956 789 0123",
    address: "202 Subdivision St, Parañaque City",
  },
];

// Sample booking data
const bookings = [
  {
    id: "BK-001",
    clientId: "client-001",
    clientName: "Maria Santos",
    clientEmail: "maria.santos@example.com",
    clientPhone: "+63 912 345 6789",
    clientAddress: "123 Main St, Makati City",
    eventType: "wedding",
    eventDate: "2025-06-15",
    guestCount: 150,
    notes: "Prefers a garden venue",
    venue: "Garden Paradise Resort",
    package: "Gold Package",
  },
  {
    id: "BK-002",
    clientId: "client-002",
    clientName: "Acme Technologies",
    clientEmail: "events@acmetech.com",
    clientPhone: "+63 923 456 7890",
    clientAddress: "456 Corporate Ave, Taguig City",
    eventType: "corporate",
    eventDate: "2025-05-22",
    guestCount: 80,
    notes: "Annual company meeting",
    venue: "Business Center Conference Room",
    package: "Executive Package",
  },
  {
    id: "BK-003",
    clientId: "client-003",
    clientName: "Carlos Garcia",
    clientEmail: "carlos.garcia@example.com",
    clientPhone: "+63 934 567 8901",
    clientAddress: "789 Residential Blvd, Quezon City",
    eventType: "birthday",
    eventDate: "2025-07-10",
    guestCount: 50,
    notes: "50th birthday celebration",
    venue: "Rooftop Lounge",
    package: "Premium Package",
  },
];

interface BookingData {
  booking_id: number;
  booking_reference: string;
  user_id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  event_type_id: number;
  event_type_name: string;
  event_name: string;
  event_date: string;
  event_time: string;
  guest_count: number;
  venue_id: number | null;
  venue_name: string | null;
  package_id: number | null;
  package_name: string | null;
  notes: string | null;
  booking_status:
    | "pending"
    | "confirmed"
    | "converted"
    | "cancelled"
    | "completed";
  created_at: string;
  converted_event_id?: number | null;
}

interface BookingListItemProps {
  booking: BookingData;
  onAccept: (booking: BookingData) => void;
  onEdit?: () => void;
}

function BookingListItem({ booking, onAccept, onEdit }: BookingListItemProps) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium">{booking.client_name}</h3>
            <p className="text-sm text-muted-foreground">
              Ref: {booking.booking_reference}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={cn(
                "px-2 py-1 text-xs rounded-full",
                booking.booking_status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : booking.booking_status === "confirmed"
                    ? "bg-green-100 text-green-800"
                    : booking.booking_status === "converted"
                      ? "bg-blue-100 text-blue-800"
                      : booking.booking_status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
              )}
            >
              {booking.booking_status
                ? booking.booking_status.charAt(0).toUpperCase() +
                  booking.booking_status.slice(1)
                : "Pending"}
            </span>
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
              {booking.event_type_name
                ? booking.event_type_name.charAt(0).toUpperCase() +
                  booking.event_type_name.slice(1)
                : "Event"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {new Date(booking.event_date).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {booking.event_time || "12:00 PM"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {booking.guest_count} guests
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {booking.venue_name || "TBD"}
            </div>
          </div>
        </div>
        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onEdit?.()}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button className="w-full" onClick={() => onAccept(booking)}>
            Accept Booking
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClientDetailsStep({
  initialData,
  onUpdate,
  onNext,
}: ClientDetailsStepProps) {
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newClientData, setNewClientData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [clients, setClients] = useState<ClientData[]>(existingClients);
  const [isLoading, setIsLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedClientForView, setSelectedClientForView] =
    useState<ClientData | null>(null);

  // Fetch clients from the database
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching clients from admin endpoint");

        const response = await axios.get(endpoints.admin, {
          params: {
            operation: "getClients",
          },
        });

        console.log("API response:", response.data);
        console.log("Raw client data from API:", response.data.clients);

        if (response.data.status === "success") {
          // Log the first client to see all available fields
          if (response.data.clients.length > 0) {
            console.log(
              "First client fields:",
              Object.keys(response.data.clients[0])
            );
            console.log("First client data:", response.data.clients[0]);
          }

          // Transform client data to match our ClientData interface
          const transformedClients = response.data.clients.map(
            (client: DbClient) => ({
              id: client.user_id.toString(),
              name: `${client.user_firstName} ${client.user_lastName}`,
              email: client.user_email,
              phone: client.user_contact,
              address: client.user_address || "", // Now includes address from database
              pfp: client.user_pfp || "", // Include profile picture path
            })
          );

          console.log("Transformed clients:", transformedClients);
          setClients(transformedClients);
        } else {
          console.error("Error fetching clients:", response.data.message);
          // Keep using existingClients as fallback
        }
      } catch (error) {
        console.error("API error:", error);
        // Keep using existingClients as fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Fetch all bookings

  // Helper function to get client initials
  const getClientInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to get profile image URL
  const getProfileImageUrl = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);

    console.log(`Getting profile image for client ${clientId}:`, {
      client,
      pfp: client?.pfp,
    });

    // If client has a profile picture, use the image serving endpoint
    if (client?.pfp) {
      const imageUrl = `${endpoints.serveImage}?path=${encodeURIComponent(client.pfp)}`;
      console.log(`Using database profile image: ${imageUrl}`);
      return imageUrl;
    }

    // Fallback to UI Avatars service
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(client?.name || "Client")}&background=028A75&color=fff&size=40`;
    console.log(`Using fallback avatar: ${fallbackUrl}`);
    return fallbackUrl;
  };

  // Helper function to map event type names from database to dropdown values
  const mapEventType = (eventTypeName: string): string => {
    const normalizedType = eventTypeName.toLowerCase().trim();

    // Map common event type variations
    const typeMapping: { [key: string]: string } = {
      wedding: "wedding",
      corporate: "corporate",
      "corporate event": "corporate",
      birthday: "birthday",
      "birthday party": "birthday",
      anniversary: "anniversary",
      baptism: "baptism",
      "baby shower": "baby-shower",
      reunion: "reunion",
      festival: "festival",
      engagement: "engagement",
      "engagement party": "engagement",
      christmas: "christmas",
      "christmas party": "christmas",
      "new year": "new-year",
      "new year party": "new-year",
      "new years party": "new-year",
    };

    return typeMapping[normalizedType] || "other";
  };

  // Handle booking selection
  const handleBookingSelect = (booking: BookingData) => {
    console.log("Selected booking:", booking); // Debug log
    setBookingData(booking);

    // Update client data
    onUpdate({
      id: booking.user_id.toString(),
      name: booking.client_name,
      email: booking.client_email,
      phone: booking.client_phone,
      address: "", // Address might not be available in booking data
    });

    // Extract package ID from the package ID field
    const packageId = booking.package_id?.toString() || "";
    console.log("Extracted package ID:", packageId); // Debug log

    // Parse time properly - handle different time formats
    const parseTime = (timeStr: string) => {
      if (!timeStr) return "10:00";

      // Handle "HH:mm:ss" format
      if (timeStr.includes(":")) {
        const parts = timeStr.split(":");
        return `${parts[0]}:${parts[1]}`;
      }

      // Handle "HH:mm - HH:mm" format
      if (timeStr.includes(" - ")) {
        return timeStr.split(" - ")[0] || "10:00";
      }

      return timeStr;
    };

    // Map the event type to match dropdown values
    const mappedEventType = mapEventType(booking.event_type_name);
    console.log(
      "Event type mapping:",
      booking.event_type_name,
      "->",
      mappedEventType
    );

    // Create comprehensive event details with booking metadata
    const eventDetails: EventDetails = {
      title: booking.event_name || "",
      type: mappedEventType,
      date: booking.event_date,
      startTime: parseTime(booking.event_time),
      endTime: booking.event_time?.includes(" - ")
        ? booking.event_time.split(" - ")[1] || "18:00"
        : "18:00",
      capacity: booking.guest_count,
      notes: booking.notes || "",
      venue: booking.venue_name || "",
      package: packageId || "",
      // Add booking metadata for reference
      bookingReference: booking.booking_reference,
      venueId: booking.venue_id?.toString() || "",
    };

    console.log("Sending event details with booking data:", eventDetails);

    // Show success toast
    toast({
      title: "Booking Selected",
      description: `Booking ${booking.booking_reference} has been loaded. All fields have been populated automatically.`,
    });

    onNext(eventDetails);
  };

  // Handle client selection
  const handleClientSelect = (client: ClientData) => {
    setIsNewClient(false);
    onUpdate(client);
  };

  // Handle view client details
  const handleViewClient = (client: ClientData) => {
    setSelectedClientForView(client);
    setViewModalOpen(true);
  };

  // Handle new client input changes
  const handleNewClientChange = (field: string, value: string) => {
    setNewClientData({
      ...newClientData,
      [field]: value,
    });

    // Clear password error when either password field changes
    if (field === "password" || field === "confirmPassword") {
      setPasswordError("");
    }
  };

  // Handle create client
  const handleCreateClient = async () => {
    // Validate passwords match
    if (newClientData.password !== newClientData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    // Validate password strength (simple example)
    if (newClientData.password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    try {
      // Call the API to create the client
      const response = await axios.post(endpoints.admin, {
        operation: "createClient",
        firstName: newClientData.firstName,
        lastName: newClientData.lastName,
        email: newClientData.email,
        contact: newClientData.phone,
        address: newClientData.address,
        password: newClientData.password,
      });

      if (response.data.status === "success") {
        // Create client object for the parent component
        const fullName =
          `${newClientData.firstName} ${newClientData.lastName}`.trim();
        const newClient = {
          id: response.data.client_id.toString(),
          name: fullName,
          email: newClientData.email,
          phone: newClientData.phone,
          address: newClientData.address,
        };

        // Update the client data in the parent component
        onUpdate(newClient);

        // Add the new client to the local clients list
        setClients((prevClients) => [...prevClients, newClient]);

        // Show success toast
        toast({
          title: "Client Created",
          description: "New client has been created successfully.",
        });

        // Reset the new client form and state
        setIsNewClient(false);
        setNewClientData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          address: "",
          password: "",
          confirmPassword: "",
        });
      } else {
        // Show error toast
        toast({
          title: "Error",
          description: response.data.message || "Failed to create client",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating client:", error);
      toast({
        title: "Error",
        description: "Failed to create client. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Client Selection or Creation */}
      {!bookingData && (
        <>
          <div className="space-y-2">
            <Label htmlFor="client-name">Client Name</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {initialData?.name ? initialData.name : "Select client..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Search clients..." />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup heading="Existing Clients">
                      {isLoading ? (
                        <CommandItem key="loading" disabled>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Loading clients...
                        </CommandItem>
                      ) : clients.length === 0 ? (
                        <CommandItem key="no-clients" disabled>
                          No clients found. Please add a new client.
                        </CommandItem>
                      ) : (
                        clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              handleClientSelect(client);
                              setOpen(false);
                            }}
                            className="flex items-center justify-between p-3"
                          >
                            <div className="flex items-center gap-3">
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  initialData?.id === client.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="relative">
                                <img
                                  src={getProfileImageUrl(client.id)}
                                  alt={`${client.name}'s profile`}
                                  className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    const fallback = e.currentTarget
                                      .nextElementSibling as HTMLElement;
                                    if (fallback) {
                                      fallback.classList.remove("hidden");
                                      fallback.classList.add("flex");
                                    }
                                  }}
                                />
                                <div className="w-8 h-8 bg-gradient-to-br from-[#028A75] to-[#027a65] rounded-full items-center justify-center hidden">
                                  <span className="text-white font-medium text-xs">
                                    {getClientInitials(client.name)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {client.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {client.email}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewClient(client);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </CommandList>
                  <div className="border-t p-2 bg-gray-50">
                    <CommandItem
                      key="create-new-client"
                      onSelect={() => {
                        setIsNewClient(true);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create new client
                    </CommandItem>
                  </div>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Existing Client Details */}
          {initialData?.id && !isNewClient && (
            <Card className="mt-2">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Name:</p>
                    <p>{initialData.name}</p>
                  </div>
                  <div>
                    <p className="font-medium">Email:</p>
                    <p>{initialData.email}</p>
                  </div>
                  <div>
                    <p className="font-medium">Phone:</p>
                    <p>{initialData.phone}</p>
                  </div>
                  <div>
                    <p className="font-medium">Address:</p>
                    <p>{initialData.address || "Not specified"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Booking Details */}
          {bookingData !== null && (
            <Card className="mt-4 bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      <h3 className="font-semibold text-green-800">
                        Booking Loaded:{" "}
                        {(bookingData as BookingData).booking_reference}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBookingData(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                  <p className="text-sm text-green-700">
                    ✅ All event details have been automatically populated from
                    this booking.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Event Type:</p>
                      <p className="capitalize">
                        {(bookingData as BookingData).event_type_name}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Date:</p>
                      <p>
                        {new Date(
                          (bookingData as BookingData).event_date
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Time:</p>
                      <p>
                        {(bookingData as BookingData).event_time ||
                          "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Guests:</p>
                      <p>{(bookingData as BookingData).guest_count}</p>
                    </div>
                    <div>
                      <p className="font-medium">Venue:</p>
                      <p>
                        {(bookingData as BookingData).venue_name ||
                          "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Package:</p>
                      <p>
                        {(bookingData as BookingData).package_name ||
                          "Not specified"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-medium">Notes:</p>
                      <p>{(bookingData as BookingData).notes || "No notes"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Client Form */}
          {isNewClient && (
            <div className="space-y-4 mt-4 p-4 border rounded-md">
              <h3 className="font-medium text-lg">Create New Client</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-client-first-name">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="new-client-first-name"
                    value={newClientData.firstName}
                    onChange={(e) =>
                      handleNewClientChange("firstName", e.target.value)
                    }
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-client-last-name">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="new-client-last-name"
                    value={newClientData.lastName}
                    onChange={(e) =>
                      handleNewClientChange("lastName", e.target.value)
                    }
                    placeholder="Enter last name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-client-email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="new-client-email"
                    type="email"
                    value={newClientData.email}
                    onChange={(e) =>
                      handleNewClientChange("email", e.target.value)
                    }
                    placeholder="Enter client email"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-client-phone">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="new-client-phone"
                    value={newClientData.phone}
                    onChange={(e) =>
                      handleNewClientChange("phone", e.target.value)
                    }
                    placeholder="Enter client phone"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-client-address">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="new-client-address"
                    value={newClientData.address}
                    onChange={(e) =>
                      handleNewClientChange("address", e.target.value)
                    }
                    placeholder="Enter client address"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-client-password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-client-password"
                      type={showPassword ? "text" : "password"}
                      value={newClientData.password}
                      onChange={(e) =>
                        handleNewClientChange("password", e.target.value)
                      }
                      placeholder="Enter password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-client-confirm-password">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="new-client-confirm-password"
                    type="password"
                    value={newClientData.confirmPassword}
                    onChange={(e) =>
                      handleNewClientChange("confirmPassword", e.target.value)
                    }
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>

              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNewClient(false);
                    setNewClientData({
                      firstName: "",
                      lastName: "",
                      email: "",
                      phone: "",
                      address: "",
                      password: "",
                      confirmPassword: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateClient}
                  disabled={
                    !newClientData.firstName ||
                    !newClientData.lastName ||
                    !newClientData.email ||
                    !newClientData.phone ||
                    !newClientData.password ||
                    !newClientData.confirmPassword
                  }
                >
                  Create Client
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Display Client and Booking Information */}
      {bookingData && (
        <div className="space-y-4">
          {/* Client Information Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Client Information</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBookingData(null);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Selection
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Name:</p>
                  <p>{(bookingData as BookingData).client_name}</p>
                </div>
                <div>
                  <p className="font-medium">Email:</p>
                  <p>{(bookingData as BookingData).client_email}</p>
                </div>
                <div>
                  <p className="font-medium">Phone:</p>
                  <p>{(bookingData as BookingData).client_phone}</p>
                </div>
                <div>
                  <p className="font-medium">Address:</p>
                  <p>Not specified</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details Card */}
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4">Booking Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Booking Reference:</p>
                  <p>{(bookingData as BookingData).booking_reference}</p>
                </div>
                <div>
                  <p className="font-medium">Event Type:</p>
                  <p className="capitalize">
                    {(bookingData as BookingData).event_type_name}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Event Date:</p>
                  <p>
                    {new Date(
                      (bookingData as BookingData).event_date
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Event Time:</p>
                  <p>
                    {(bookingData as BookingData).event_time || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Guest Count:</p>
                  <p>{(bookingData as BookingData).guest_count} guests</p>
                </div>
                <div>
                  <p className="font-medium">Status:</p>
                  <p className="capitalize">
                    {(bookingData as BookingData).booking_status}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Venue:</p>
                  <p>
                    {(bookingData as BookingData).venue_name || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Package:</p>
                  <p>
                    {(bookingData as BookingData).package_name ||
                      "Not specified"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="font-medium">Notes:</p>
                  <p>{(bookingData as BookingData).notes || "No notes"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Client View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="relative">
                {selectedClientForView && (
                  <>
                    <img
                      src={getProfileImageUrl(selectedClientForView.id)}
                      alt={`${selectedClientForView.name}'s profile`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget
                          .nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.classList.remove("hidden");
                          fallback.classList.add("flex");
                        }
                      }}
                    />
                    <div className="w-12 h-12 bg-gradient-to-br from-[#028A75] to-[#027a65] rounded-full items-center justify-center hidden">
                      <span className="text-white font-medium text-sm">
                        {getClientInitials(selectedClientForView.name)}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {selectedClientForView?.name}
                </h2>
                <p className="text-sm text-muted-foreground">Client Details</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedClientForView && (
            <div className="space-y-6">
              {/* Contact Information */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedClientForView.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Phone</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedClientForView.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <AddressIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Address</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedClientForView.address || "Not specified"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Event History
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">0</p>
                      <p className="text-sm text-blue-600">Total Events</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">0</p>
                      <p className="text-sm text-green-600">Completed</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">0</p>
                      <p className="text-sm text-yellow-600">Upcoming</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setViewModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleClientSelect(selectedClientForView);
                    setViewModalOpen(false);
                  }}
                >
                  Select This Client
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
