"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";
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
import { toast } from "@/components/ui/use-toast";
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
  user_address: string;
  user_city: string;
  user_state: string;
  user_zipcode: string;
  user_country: string;
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Filters and pagination
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    activity_level: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  const fetchClients = useCallback(
    async (searchTerm?: string) => {
      try {
        setLoading(true);
        setError(null);
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          ...Object.fromEntries(
            Object.entries({
              ...filters,
              search: searchTerm !== undefined ? searchTerm : filters.search,
            }).filter(([, value]) => value)
          ),
        });

        const response = await axios.get(
          `${endpoints.admin}?operation=getClients&${queryParams}`
        );
        const data = response.data;

        if (data.status === "success") {
          setClients(data.clients || []);
          setTotalPages(data.pagination?.total_pages || 1);
        } else {
          console.error("API Error:", data.message);
          setError(data.message || "Failed to fetch clients");
        }
      } catch (error: any) {
        console.error("Error fetching clients:", error);
        if (error.code === "ERR_NETWORK") {
          setError(
            "Network error: Unable to connect to server. Please check your connection and try again."
          );
        } else if (error.response?.status === 500) {
          setError("Server error: Please try again later or contact support.");
        } else {
          setError("Failed to fetch clients. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [currentPage, itemsPerPage, filters.status, filters.activity_level]
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

  // Delete client function
  const handleDeleteClient = async (client: Client) => {
    try {
      setIsDeleting(true);
      const response = await axios.post(
        `${endpoints.admin}?operation=deleteClient`,
        {
          client_id: client.user_id,
        }
      );

      const data = response.data;
      if (data.status === "success") {
        toast({
          title: "Success",
          description: data.message || "Client deleted successfully",
        });
        // Remove client from the list
        setClients((prev) => prev.filter((c) => c.user_id !== client.user_id));
        // Remove from selected clients if it was selected
        setSelectedClients((prev) =>
          prev.filter((id) => id !== client.user_id)
        );
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete client",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error deleting client:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to delete client";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setClientToDelete(null);
    }
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedClients.length === 0) {
      toast({
        title: "Error",
        description: "No clients selected - Please select clients to delete",
        variant: "destructive",
      });
      return;
    }
    setBulkDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await axios.post(
        `${endpoints.admin}?operation=deleteClients`,
        {
          client_ids: selectedClients,
        }
      );

      const data = response.data;
      if (data.status === "success") {
        toast({
          title: "Success",
          description:
            data.message ||
            `Successfully deleted ${data.deleted_count} client(s)`,
        });
        // Remove deleted clients from the list
        setClients((prev) =>
          prev.filter((c) => !selectedClients.includes(c.user_id))
        );
        // Clear selected clients
        setSelectedClients([]);
        setSelectAll(false);
        // Refresh the list to get updated data
        fetchClients();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete clients",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error deleting clients:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to delete clients";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setBulkDeleteConfirmOpen(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedClients.length === 0) {
      toast({
        title: "Error",
        description: "No clients selected - Please select clients to export",
        variant: "destructive",
      });
      return;
    }
    // Implement bulk export logic here
    toast({
      title: "Success",
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

      {/* Error Display */}
      {error && (
        <Card className="border border-red-200 bg-red-50 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Clients
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={() => fetchClients()}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  placeholder="Search clients, email, phone, or address... (Press Enter)"
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
                <Button
                  onClick={handleBulkDelete}
                  variant="destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clients Table */}
      <Card className="border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Clients ({clients.length})</CardTitle>
          <div className="flex items-center gap-3">
            <Label htmlFor="clientsPageSize" className="text-sm text-gray-600">
              Rows per page
            </Label>
            <select
              id="clientsPageSize"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-28 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="overflow-x-auto overflow-y-visible"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#d1d5db #f3f4f6",
            }}
          >
            <style jsx>{`
              div::-webkit-scrollbar {
                height: 8px;
              }
              div::-webkit-scrollbar-track {
                background: #f3f4f6;
                border-radius: 4px;
              }
              div::-webkit-scrollbar-thumb {
                background: #d1d5db;
                border-radius: 4px;
              }
              div::-webkit-scrollbar-thumb:hover {
                background: #9ca3af;
              }
            `}</style>
            <table className="w-full text-sm" style={{ minWidth: "1400px" }}>
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left py-3 px-4 w-16 min-w-[64px]">
                    Profile
                  </th>
                  <th className="text-left py-3 px-4 w-48 min-w-[192px]">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 w-56 min-w-[224px]">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 w-40 min-w-[160px]">
                    Phone
                  </th>
                  <th className="text-left py-3 px-4 w-80 min-w-[320px]">
                    Address
                  </th>
                  <th className="text-left py-3 px-4 w-32 min-w-[128px]">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 w-24 min-w-[96px]">
                    Events
                  </th>
                  <th className="text-left py-3 px-4 w-32 min-w-[128px]">
                    Revenue
                  </th>
                  <th className="text-left py-3 px-4 w-32 min-w-[128px]">
                    Registered
                  </th>
                  <th className="text-left py-3 px-4 w-24 min-w-[96px]">
                    Actions
                  </th>
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
                              ? `${endpoints.serveImage}?path=${client.user_pfp}`
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
                      <div className="font-medium whitespace-nowrap">
                        {client.user_firstName} {client.user_lastName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div
                        className="truncate max-w-[200px]"
                        title={client.user_email}
                      >
                        {client.user_email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="whitespace-nowrap">
                        {client.user_contact}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm max-w-[300px]">
                        {client.user_address && (
                          <div
                            className="font-medium truncate"
                            title={client.user_address}
                          >
                            {client.user_address}
                          </div>
                        )}
                        {(client.user_city ||
                          client.user_state ||
                          client.user_zipcode) && (
                          <div
                            className="text-gray-600 truncate"
                            title={[
                              client.user_city,
                              client.user_state,
                              client.user_zipcode,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          >
                            {[
                              client.user_city,
                              client.user_state,
                              client.user_zipcode,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                        {client.user_country && (
                          <div
                            className="text-gray-500 text-xs truncate"
                            title={client.user_country}
                          >
                            {client.user_country}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${getClientStatusColor(client)}`}
                      >
                        {getClientStatus(client)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-center whitespace-nowrap">
                        {client.total_events}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="whitespace-nowrap">
                        {formatCurrency(
                          parseFloat(client.total_payments.toString())
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="whitespace-nowrap">
                        {formatDate(client.registration_date)}
                      </div>
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
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setClientToDelete(client);
                              setDeleteConfirmOpen(true);
                            }}
                          >
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
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between pt-2">
              <div className="text-xs text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                  className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                  aria-label="First page"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {(() => {
                  const pages: number[] = [];
                  const total = totalPages;
                  const current = currentPage;
                  const add = (n: number) => {
                    if (!pages.includes(n) && n >= 1 && n <= total)
                      pages.push(n);
                  };
                  add(1);
                  add(current - 1);
                  add(current);
                  add(current + 1);
                  add(total);
                  const uniqueSorted = [...new Set(pages)].sort(
                    (a, b) => a - b
                  );
                  const items: (number | string)[] = [];
                  uniqueSorted.forEach((n, i) => {
                    if (i > 0 && n - (uniqueSorted[i - 1] as number) > 1)
                      items.push("...");
                    items.push(n);
                  });
                  return items.map((p, i) =>
                    typeof p === "number" ? (
                      <button
                        key={`clients-page-${p}-${i}`}
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1 border rounded hover:bg-gray-50 ${
                          p === current ? "bg-gray-100 font-semibold" : ""
                        }`}
                      >
                        {p}
                      </button>
                    ) : (
                      <span
                        key={`clients-gap-${i}`}
                        className="px-2 text-gray-500"
                      >
                        {p}
                      </span>
                    )
                  );
                })()}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                  aria-label="Next page"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                  aria-label="Last page"
                >
                  »
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
                        ? `${endpoints.serveImage}?path=${selectedClient.user_pfp}`
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

              {/* Address Section */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Address Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Street Address
                    </label>
                    <p className="text-sm">
                      {selectedClient.user_address || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      City
                    </label>
                    <p className="text-sm">
                      {selectedClient.user_city || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      State/Province
                    </label>
                    <p className="text-sm">
                      {selectedClient.user_state || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      ZIP/Postal Code
                    </label>
                    <p className="text-sm">
                      {selectedClient.user_zipcode || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Country
                    </label>
                    <p className="text-sm">
                      {selectedClient.user_country || "Not provided"}
                    </p>
                  </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              {clientToDelete
                ? `${clientToDelete.user_firstName} ${clientToDelete.user_lastName}`
                : "this client"}
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setClientToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                clientToDelete && handleDeleteClient(clientToDelete)
              }
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Selected Clients</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedClients.length} selected
              client(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setBulkDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedClients.length} Client(s)
                </>
              )}
            </Button>
          </div>
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
