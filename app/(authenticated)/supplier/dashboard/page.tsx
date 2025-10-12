"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import {
  Package,
  Star,
  Calendar,
  TrendingUp,
  Eye,
  Edit,
  Plus,
  FileText,
  Activity,
  BarChart3,
  DollarSign,
  Users,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SupplierDashboardData {
  supplier_info: {
    supplier_id: number;
    business_name: string;
    contact_person: string;
    specialty_category: string;
    rating_average: number;
    is_verified: boolean;
  };
  metrics: {
    total_offers: number;
    total_bookings: number;
    avg_rating: number;
    total_ratings: number;
    pending_bookings: number;
    confirmed_bookings: number;
    completed_bookings: number;
  };
  recent_bookings: Array<{
    event_component_id: number;
    event_title: string;
    event_date: string;
    component_title: string;
    component_price: number;
    supplier_status: string;
    user_firstName: string;
    user_lastName: string;
  }>;
  recent_ratings: Array<{
    rating: number;
    feedback: string;
    user_firstName: string;
    event_title: string;
    created_at: string;
  }>;
  monthly_performance: Array<{
    month: string;
    bookings_count: number;
    avg_rating: number;
  }>;
}

interface Offer {
  offer_id: number;
  offer_title: string;
  tier_name: string;
  tier_level: number;
  price_min: number;
  price_max: number;
  is_featured: boolean;
  times_booked: number;
  avg_rating: number;
  rating_count: number;
  subcomponents: Array<{
    component_title: string;
    component_description: string;
    is_customizable: boolean;
  }>;
}

export default function SupplierDashboard() {
  const [dashboardData, setDashboardData] =
    useState<SupplierDashboardData | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDashboardData();
    fetchOffers();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // In a real implementation, get userId from auth context
      const userId = 1; // This should come from authentication

      const response = await axios.get(
        `${endpoints.supplier}?operation=getDashboard&user_id=${userId}`
      );
      const data = response.data;

      if (data.status === "success") {
        setDashboardData(data.dashboard);
      } else {
        console.error("Failed to fetch dashboard data:", data.message);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to Supplier Portal
          </h1>
          <p className="text-gray-600 mt-2">
            Unable to load dashboard data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {dashboardData.supplier_info.business_name}
          </h1>
          <p className="text-gray-600 mt-1">
            {dashboardData.supplier_info.specialty_category} •{" "}
            {dashboardData.supplier_info.contact_person}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant={
                dashboardData.supplier_info.is_verified
                  ? "default"
                  : "secondary"
              }
            >
              {dashboardData.supplier_info.is_verified
                ? "Verified"
                : "Pending Verification"}
            </Badge>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">
                {dashboardData.supplier_info.rating_average.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
        <Button onClick={() => setActiveTab("offers")}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Offer
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Offers
                </p>
                <p className="text-2xl font-bold">
                  {dashboardData.metrics.total_offers}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold">
                  {dashboardData.metrics.total_bookings}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Average Rating
                </p>
                <p className="text-2xl font-bold">
                  {dashboardData.metrics.avg_rating
                    ? dashboardData.metrics.avg_rating.toFixed(1)
                    : "0.0"}
                </p>
                <p className="text-xs text-gray-500">
                  {dashboardData.metrics.total_ratings} reviews
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Orders
                </p>
                <p className="text-2xl font-bold">
                  {dashboardData.metrics.pending_bookings}
                </p>
                <p className="text-xs text-gray-500">
                  {dashboardData.metrics.confirmed_bookings} confirmed
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="offers">My Offers</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recent_bookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.event_component_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{booking.event_title}</p>
                        <p className="text-sm text-gray-600">
                          {booking.component_title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {booking.user_firstName} {booking.user_lastName} •{" "}
                          {formatDate(booking.event_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(booking.component_price)}
                        </p>
                        <Badge
                          className={getStatusColor(booking.supplier_status)}
                        >
                          {booking.supplier_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Ratings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Recent Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recent_ratings
                    .slice(0, 5)
                    .map((rating, index) => (
                      <div
                        key={`supplier-dashboard-rating-${index}`}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= rating.rating
                                      ? "text-yellow-500 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">
                              {rating.user_firstName}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(rating.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {rating.feedback}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {rating.event_title}
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="offers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">My Offers</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Offer
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <Card
                key={offer.offer_id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {offer.offer_title}
                      </CardTitle>
                      {offer.tier_name && (
                        <Badge className="mt-1">{offer.tier_name}</Badge>
                      )}
                    </div>
                    {offer.is_featured && (
                      <Badge variant="secondary">Featured</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Price Range</span>
                      <span className="font-medium">
                        {formatCurrency(offer.price_min)} -{" "}
                        {formatCurrency(offer.price_max)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Times Booked
                      </span>
                      <span className="font-medium">{offer.times_booked}</span>
                    </div>

                    {offer.avg_rating > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Rating</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">
                            {offer.avg_rating.toFixed(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({offer.rating_count})
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <p className="text-sm text-gray-600 mb-2">Includes:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {offer.subcomponents.slice(0, 3).map((sub, index) => (
                          <li
                            key={`supplier-dashboard-subcomponent-${index}`}
                            className="flex items-center gap-1"
                          >
                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
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

                    <div className="flex gap-2 pt-3">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Booking Management</h2>
            <div className="flex gap-2">
              <Button variant="outline">All</Button>
              <Button variant="outline">Pending</Button>
              <Button variant="outline">Confirmed</Button>
              <Button variant="outline">Delivered</Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="text-left p-4">Event</th>
                      <th className="text-left p-4">Component</th>
                      <th className="text-left p-4">Client</th>
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Amount</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recent_bookings.map((booking) => (
                      <tr
                        key={booking.event_component_id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{booking.event_title}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm">{booking.component_title}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm">
                            {booking.user_firstName} {booking.user_lastName}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm">
                            {formatDate(booking.event_date)}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">
                            {formatCurrency(booking.component_price)}
                          </p>
                        </td>
                        <td className="p-4">
                          <Badge
                            className={getStatusColor(booking.supplier_status)}
                          >
                            {booking.supplier_status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Button variant="outline" size="sm">
                            Update Status
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <h2 className="text-2xl font-bold">Performance Analytics</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.monthly_performance.map((month, index) => (
                    <div
                      key={`supplier-dashboard-monthly-${index}`}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm">{month.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                          {month.bookings_count} bookings
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">
                            {month.avg_rating?.toFixed(1) || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Completion Rate
                    </span>
                    <span className="font-medium">
                      {dashboardData.metrics.total_bookings > 0
                        ? Math.round(
                            (dashboardData.metrics.completed_bookings /
                              dashboardData.metrics.total_bookings) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Confirmed Orders
                    </span>
                    <span className="font-medium">
                      {dashboardData.metrics.confirmed_bookings}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Completed Orders
                    </span>
                    <span className="font-medium">
                      {dashboardData.metrics.completed_bookings}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
