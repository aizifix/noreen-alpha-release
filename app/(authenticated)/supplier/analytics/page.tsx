"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  Star,
  DollarSign,
  Users,
  Clock,
  Award,
  Target,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    total_revenue: number;
    total_bookings: number;
    avg_rating: number;
    completion_rate: number;
    revenue_growth: number;
    booking_growth: number;
    rating_trend: number;
  };
  monthly_data: Array<{
    month: string;
    revenue: number;
    bookings: number;
    avg_rating: number;
  }>;
  offer_performance: Array<{
    offer_title: string;
    tier_name: string;
    bookings_count: number;
    total_revenue: number;
    avg_rating: number;
    conversion_rate: number;
  }>;
  status_breakdown: {
    pending: number;
    confirmed: number;
    delivered: number;
    cancelled: number;
  };
  recent_feedback: Array<{
    client_name: string;
    event_title: string;
    rating: number;
    feedback_text: string;
    created_at: string;
  }>;
}

export default function SupplierAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("6_months");

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const userId = 1; // This should come from authentication

      const response = await fetch(
        `http://localhost/events-api/supplier.php?operation=getAnalytics&user_id=${userId}&time_range=${timeRange}`
      );
      const data = await response.json();

      if (data.status === "success") {
        setAnalyticsData(data.analytics);
      } else {
        console.error("Failed to fetch analytics:", data.message);
        // Set mock data for demonstration
        setAnalyticsData(getMockAnalyticsData());
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Set mock data for demonstration
      setAnalyticsData(getMockAnalyticsData());
    } finally {
      setLoading(false);
    }
  };

  const getMockAnalyticsData = (): AnalyticsData => ({
    overview: {
      total_revenue: 125000,
      total_bookings: 48,
      avg_rating: 4.7,
      completion_rate: 92,
      revenue_growth: 15.3,
      booking_growth: 8.2,
      rating_trend: 0.3,
    },
    monthly_data: [
      { month: "Jan 2024", revenue: 18000, bookings: 6, avg_rating: 4.5 },
      { month: "Feb 2024", revenue: 22000, bookings: 8, avg_rating: 4.6 },
      { month: "Mar 2024", revenue: 19500, bookings: 7, avg_rating: 4.8 },
      { month: "Apr 2024", revenue: 25000, bookings: 9, avg_rating: 4.7 },
      { month: "May 2024", revenue: 21000, bookings: 8, avg_rating: 4.9 },
      { month: "Jun 2024", revenue: 19500, bookings: 10, avg_rating: 4.6 },
    ],
    offer_performance: [
      {
        offer_title: "Premium Wedding Package",
        tier_name: "Premium",
        bookings_count: 15,
        total_revenue: 75000,
        avg_rating: 4.9,
        conversion_rate: 85,
      },
      {
        offer_title: "Corporate Event Catering",
        tier_name: "Standard",
        bookings_count: 12,
        total_revenue: 36000,
        avg_rating: 4.6,
        conversion_rate: 78,
      },
      {
        offer_title: "Birthday Party Package",
        tier_name: "Basic",
        bookings_count: 21,
        total_revenue: 14000,
        avg_rating: 4.5,
        conversion_rate: 92,
      },
    ],
    status_breakdown: {
      pending: 5,
      confirmed: 8,
      delivered: 32,
      cancelled: 3,
    },
    recent_feedback: [
      {
        client_name: "Maria Santos",
        event_title: "Wedding Reception",
        rating: 5,
        feedback_text:
          "Outstanding service! The food was exceptional and the presentation was beautiful.",
        created_at: "2024-01-15T10:30:00Z",
      },
      {
        client_name: "John Dela Cruz",
        event_title: "Corporate Meeting",
        rating: 4,
        feedback_text:
          "Great food quality and timely delivery. Professional service throughout.",
        created_at: "2024-01-12T14:20:00Z",
      },
    ],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const renderStarsRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Analytics Data
          </h3>
          <p className="text-gray-600">
            Unable to load analytics data at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Track your performance and business insights
            </p>
          </div>
          <div className="flex gap-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="1_month">Last Month</option>
              <option value="3_months">Last 3 Months</option>
              <option value="6_months">Last 6 Months</option>
              <option value="1_year">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analyticsData.overview.total_revenue)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {analyticsData.overview.revenue_growth >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    analyticsData.overview.revenue_growth >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatPercent(analyticsData.overview.revenue_growth)}
                </span>
                <span className="text-sm text-gray-500">vs last period</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.overview.total_bookings}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {analyticsData.overview.booking_growth >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    analyticsData.overview.booking_growth >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatPercent(analyticsData.overview.booking_growth)}
                </span>
                <span className="text-sm text-gray-500">vs last period</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.overview.avg_rating.toFixed(1)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {analyticsData.overview.rating_trend >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    analyticsData.overview.rating_trend >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatPercent(analyticsData.overview.rating_trend)}
                </span>
                <span className="text-sm text-gray-500">vs last period</span>
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.overview.completion_rate}%
              </p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${analyticsData.overview.completion_rate}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "overview", label: "Overview", icon: Activity },
              {
                id: "performance",
                label: "Offer Performance",
                icon: BarChart3,
              },
              { id: "status", label: "Booking Status", icon: PieChart },
              { id: "feedback", label: "Client Feedback", icon: Star },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Revenue Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Revenue Trend
            </h3>
            <div className="space-y-4">
              {analyticsData.monthly_data.map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{month.month}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(month.revenue)}
                    </span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-brand-600 h-2 rounded-full"
                        style={{
                          width: `${(month.revenue / Math.max(...analyticsData.monthly_data.map((m) => m.revenue))) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Bookings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Bookings
            </h3>
            <div className="space-y-4">
              {analyticsData.monthly_data.map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{month.month}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">
                      {month.bookings} bookings
                    </span>
                    <div className="flex items-center">
                      {renderStarsRating(month.avg_rating)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Offer Performance
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Performance metrics for your different offers
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Offer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.offer_performance.map((offer, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {offer.offer_title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          offer.tier_name === "Premium"
                            ? "bg-purple-100 text-purple-800"
                            : offer.tier_name === "Standard"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {offer.tier_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {offer.bookings_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(offer.total_revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStarsRating(offer.avg_rating)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">
                          {offer.conversion_rate}%
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${offer.conversion_rate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "status" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Status Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Booking Status Distribution
            </h3>
            <div className="space-y-4">
              {Object.entries(analyticsData.status_breakdown).map(
                ([status, count]) => {
                  const total = Object.values(
                    analyticsData.status_breakdown
                  ).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  const statusColors = {
                    pending: "bg-yellow-500",
                    confirmed: "bg-blue-500",
                    delivered: "bg-green-500",
                    cancelled: "bg-red-500",
                  };

                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${statusColors[status as keyof typeof statusColors]}`}
                        ></div>
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-900">{count}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${statusColors[status as keyof typeof statusColors]}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500 w-12 text-right">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Performance Summary
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      Completion Rate
                    </p>
                    <p className="text-sm text-green-700">
                      Successfully delivered events
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-900">
                  {analyticsData.overview.completion_rate}%
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Client Satisfaction
                    </p>
                    <p className="text-sm text-blue-700">
                      Average rating from clients
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-900">
                  {analyticsData.overview.avg_rating.toFixed(1)}/5
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-900">Response Time</p>
                    <p className="text-sm text-purple-700">
                      Average confirmation time
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-purple-900">2.3h</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Client Feedback
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Latest reviews and ratings from your clients
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {analyticsData.recent_feedback.map((feedback, index) => (
              <div key={index} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-medium text-gray-900">
                        {feedback.client_name}
                      </div>
                      <span className="text-sm text-gray-500">•</span>
                      <div className="text-sm text-gray-600">
                        {feedback.event_title}
                      </div>
                      <span className="text-sm text-gray-500">•</span>
                      <div className="text-sm text-gray-500">
                        {new Date(feedback.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mb-3">
                      {renderStarsRating(feedback.rating)}
                    </div>
                    <p className="text-gray-700">{feedback.feedback_text}</p>
                  </div>
                </div>
              </div>
            ))}
            {analyticsData.recent_feedback.length === 0 && (
              <div className="p-6 text-center">
                <Star className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No recent feedback available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
