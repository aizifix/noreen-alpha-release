"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost/events-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/app/utils/apiWrapper";
import {
  Search,
  Users,
  Calendar,
  DollarSign,
  User,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface Client {
  user_id: number;
  user_firstName: string;
  user_lastName: string;
  user_email: string;
  user_contact: string;
  user_pfp: string;
  registration_date: string;
  total_events: number;
  total_bookings: number;
  total_payments: number;
  last_event_date: string;
}

interface FilterState {
  search: string;
  status: string;
  activity_level: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Filters and pagination
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    activity_level: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchClients = useCallback(
    async (searchTerm?: string) => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: "20",
          ...Object.fromEntries(
            Object.entries({
              ...filters,
              search: searchTerm !== undefined ? searchTerm : filters.search,
            }).filter(([, value]) => value)
          ),
        });

        const response = await fetch(
          `${API_URL}/admin.php?operation=getClients&${queryParams}`
        );
        const data = await response.json();

        if (data.status === "success") {
          setClients(data.clients || []);
          setTotalPages(data.pagination?.total_pages || 1);
        } else {
          console.error("API Error:", data.message);
          setError(data.message || "Failed to fetch clients");
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        setError("Failed to fetch clients");
      } finally {
        setLoading(false);
      }
    },
    [currentPage, filters.status, filters.activity_level]
  );

  // Effect for filters (immediate)
  useEffect(() => {
    if (filters.status || filters.activity_level) {
      fetchClients();
    }
  }, [filters.status, filters.activity_level, fetchClients]);

  // Effect for pagination
  useEffect(() => {
    fetchClients();
  }, [currentPage, fetchClients]);

  // Manual search function
  const handleSearch = () => {
    setCurrentPage(1);
    fetchClients(filters.search);
  };

  // Handle Enter key in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Filter handlers
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key !== "search") {
      setCurrentPage(1);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      activity_level: "",
    });
    setCurrentPage(1);
  };

  const getClientStatusColor = (client: Client) => {
    if (client.total_events > 0) return "bg-green-100 text-green-800";
    if (client.total_bookings > 0) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getClientStatus = (client: Client) => {
    if (client.total_events > 0) return "Active";
    if (client.total_bookings > 0) return "Pending";
    return "New";
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Checkbox handlers
  const handleSelectAll = (checked: boolean | string) => {
    const isChecked = checked === true;
    setSelectAll(isChecked);
    if (isChecked) {
      setSelectedClients(clients.map((client) => client.user_id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (clientId: number, checked: boolean | string) => {
    const isChecked = checked === true;
    if (isChecked) {
      setSelectedClients((prev) => [...prev, clientId]);
    } else {
      setSelectedClients((prev) => prev.filter((id) => id !== clientId));
    }
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedClients.length === 0) {
      toast({
        title: "No clients selected",
        description: "Please select clients to delete",
        variant: "destructive",
      });
      return;
    }
    // Implement bulk delete logic here
    toast({
      title: "Bulk delete",
      description: `Deleting ${selectedClients.length} clients...`,
    });
  };

  const handleBulkExport = () => {
    if (selectedClients.length === 0) {
      toast({
        title: "No clients selected",
        description: "Please select clients to export",
        variant: "destructive",
      });
      return;
    }
    // Implement bulk export logic here
    toast({
      title: "Bulk export",
      description: `Exporting ${selectedClients.length} clients...`,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#028A75] mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading clients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Client Management
          </h1>
          <p className="text-gray-600">
            Manage your event clients and their bookings
          </p>
        </div>
        <Button
          onClick={() => fetchClients()}
          className="bg-[#028A75] hover:bg-[#027a68] text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-[#028A75]" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Total Clients
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {clients.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clients.filter((client) => client.total_events > 0).length ||
                    0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clients.filter(
                    (client) =>
                      client.total_bookings > 0 && client.total_events === 0
                  ).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    clients.reduce(
                      (sum, client) =>
                        sum + parseFloat(client.total_payments.toString()),
                      0
                    )
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search clients... (Press Enter)"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75]"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="new">New</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Activity Level
              </label>
              <select
                value={filters.activity_level}
                onChange={(e) =>
                  handleFilterChange("activity_level", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#028A75] focus:border-[#028A75]"
              >
                <option value="">All Levels</option>
                <option value="high">High (&gt; 5 events)</option>
                <option value="medium">Medium (2-5 events)</option>
                <option value="low">Low (1 event)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedClients.length > 0 && (
        <Card className="border mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedClients.length} client(s) selected
              </span>
              <div className="flex space-x-2">
                <Button
                  onClick={handleBulkExport}
                  variant="outline"
                  className="border-[#028A75] text-[#028A75] hover:bg-[#028A75] hover:text-white"
                >
                  Export Selected
                </Button>
                <Button onClick={handleBulkDelete} variant="destructive">
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clients Table */}
      <Card className="border">
        <CardHeader>
          <CardTitle>Clients ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left py-3 px-4">Profile</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Phone</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Events</th>
                  <th className="text-left py-3 px-4">Revenue</th>
                  <th className="text-left py-3 px-4">Registered</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.user_id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <Checkbox
                        checked={selectedClients.includes(client.user_id)}
                        onCheckedChange={(checked: boolean | string) =>
                          handleSelectClient(client.user_id, checked)
                        }
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={
                            client.user_pfp
                              ? api.getServeImageUrl(client.user_pfp)
                              : undefined
                          }
                          alt={`${client.user_firstName} ${client.user_lastName}`}
                        />
                        <AvatarFallback>
                          {getInitials(
                            client.user_firstName,
                            client.user_lastName
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">
                        {client.user_firstName} {client.user_lastName}
                      </div>
                    </td>
                    <td className="py-3 px-4">{client.user_email}</td>
                    <td className="py-3 px-4">{client.user_contact}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${getClientStatusColor(client)}`}
                      >
                        {getClientStatus(client)}
                      </span>
                    </td>
                    <td className="py-3 px-4">{client.total_events}</td>
                    <td className="py-3 px-4">
                      {formatCurrency(
                        parseFloat(client.total_payments.toString())
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {formatDate(client.registration_date)}
                    </td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedClient(client);
                              setShowClientDetails(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Details Dialog */}
      <Dialog open={showClientDetails} onOpenChange={setShowClientDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedClient?.user_firstName}{" "}
              {selectedClient?.user_lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={
                      selectedClient.user_pfp
                        ? api.getServeImageUrl(selectedClient.user_pfp)
                        : undefined
                    }
                    alt={`${selectedClient.user_firstName} ${selectedClient.user_lastName}`}
                  />
                  <AvatarFallback className="text-lg">
                    {getInitials(
                      selectedClient.user_firstName,
                      selectedClient.user_lastName
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedClient.user_firstName}{" "}
                    {selectedClient.user_lastName}
                  </h3>
                  <Badge className={getClientStatusColor(selectedClient)}>
                    {getClientStatus(selectedClient)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="text-sm">{selectedClient.user_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Phone
                  </label>
                  <p className="text-sm">{selectedClient.user_contact}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Registration Date
                  </label>
                  <p className="text-sm">
                    {formatDate(selectedClient.registration_date)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Last Event
                  </label>
                  <p className="text-sm">
                    {selectedClient.last_event_date
                      ? formatDate(selectedClient.last_event_date)
                      : "No events yet"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="border">
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold">
                      {selectedClient.total_events}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Events
                    </div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold">
                      {selectedClient.total_bookings}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Bookings
                    </div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        parseFloat(selectedClient.total_payments.toString())
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Payments
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {clients.length === 0 && !loading && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No clients found</h3>
          <p className="text-muted-foreground">
            No clients have been registered yet.
          </p>
        </div>
      )}
    </div>
  );
}
