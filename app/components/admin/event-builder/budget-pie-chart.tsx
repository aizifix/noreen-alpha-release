"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  BarChart3,
  PieChartIcon,
  DollarSign,
  Camera,
  Music,
  Utensils,
  MapPin,
  Users,
  Gift,
  Sparkles,
  Hotel,
} from "lucide-react";

// Define category colors
const CATEGORY_COLORS = {
  coordination: "#FF6384", // Red
  venue: "#36A2EB", // Blue
  attire: "#FFCE56", // Yellow
  decor: "#4BC0C0", // Teal
  media: "#9966FF", // Purple
  extras: "#FF9F40", // Orange
  hotel: "#C9CBCF", // Gray
  food: "#7CFC00", // Lime
  services: "#00BFFF", // Deep Sky Blue
  default: "#808080", // Default gray
} as const;

// Define category icons
const CATEGORY_ICONS = {
  coordination: Users,
  venue: MapPin,
  attire: Sparkles,
  decor: Gift,
  media: Camera,
  extras: Music,
  hotel: Hotel,
  food: Utensils,
  services: DollarSign,
  default: BarChart3,
} as const;

type CategoryKey = keyof typeof CATEGORY_COLORS;

interface BudgetPieChartProps {
  components: any[];
  totalBudget: number;
}

export function BudgetPieChart({
  components,
  totalBudget,
}: BudgetPieChartProps) {
  const [activeTab, setActiveTab] = useState("chart");

  // Group components by category and calculate totals
  const categoryData = components
    .filter((comp) => comp.included !== false)
    .reduce((acc, component) => {
      const category = (component.category || "default") as CategoryKey;

      if (!acc[category]) {
        acc[category] = {
          name: getCategoryName(category),
          value: 0,
          color: CATEGORY_COLORS[category] || CATEGORY_COLORS.default,
          icon: CATEGORY_ICONS[category] || CATEGORY_ICONS.default,
          components: [],
        };
      }

      acc[category].value += component.price;
      acc[category].components.push(component);

      return acc;
    }, {} as Record<CategoryKey, any>);

  // Convert to array and sort by value (descending)
  const chartData = Object.values(categoryData)
    .sort((a: any, b: any) => b.value - a.value)
    .map((item: any) => ({
      ...item,
      percentage:
        totalBudget > 0 ? ((item.value / totalBudget) * 100).toFixed(1) : 0,
    }));

  // Function to get formatted category name
  function getCategoryName(category: CategoryKey): string {
    const names: Record<CategoryKey, string> = {
      coordination: "Coordination",
      venue: "Venue",
      attire: "Attire",
      decor: "Decoration",
      media: "Media",
      extras: "Extras",
      hotel: "Accommodation",
      food: "Food & Beverages",
      services: "Services",
      default: "Other",
    };

    return (
      names[category] || category.charAt(0).toUpperCase() + category.slice(1)
    );
  }

  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{formatCurrency(data.value)}</p>
          <p className="text-xs text-muted-foreground">
            {data.percentage}% of budget
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart segments
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
    name,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show percentage for segments that are large enough
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <PieChartIcon className="mr-2 h-5 w-5" />
          Budget Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="chart">Visual Chart</TabsTrigger>
            <TabsTrigger value="breakdown">Detailed Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    formatter={(value, entry, index) => {
                      const item = chartData[index];
                      return (
                        <span className="text-sm">
                          {value} ({item.percentage}%)
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="text-sm text-center text-muted-foreground">
              Total Budget: {formatCurrency(totalBudget)}
            </div>
          </TabsContent>

          <TabsContent value="breakdown">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chartData.map((category, index) => {
                const Icon = category.icon;
                return (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <h3 className="font-medium flex items-center">
                        <Icon className="h-4 w-4 mr-1" />
                        {category.name}
                      </h3>
                      <span className="text-sm ml-auto font-medium">
                        {category.percentage}%
                      </span>
                    </div>
                    <p className="text-lg font-bold">
                      {formatCurrency(category.value)}
                    </p>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>
                        {category.components.length} component
                        {category.components.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
