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

// Define category colors with a more professional and cohesive color palette
const CATEGORY_COLORS = {
  coordination: "#4F46E5", // Indigo
  venue: "#0EA5E9", // Sky blue
  attire: "#10B981", // Emerald
  decor: "#F59E0B", // Amber
  media: "#8B5CF6", // Purple
  extras: "#EC4899", // Pink
  hotel: "#6366F1", // Indigo
  food: "#14B8A6", // Teal
  services: "#06B6D4", // Cyan
  default: "#64748B", // Slate
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
    .reduce(
      (acc, component) => {
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
      },
      {} as Record<CategoryKey, any>
    );

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
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Budget Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="chart">Visual Chart</TabsTrigger>
            <TabsTrigger value="breakdown">Detailed Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-6">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={false}
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: "13px",
                      lineHeight: "24px",
                      right: 20,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "180px",
                    }}
                    formatter={(value, entry, index) => {
                      const item = chartData[index];
                      return (
                        <div className="flex flex-col text-sm">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-gray-700">{value}</span>
                            <span className="text-gray-500">
                              {formatCurrency(item.value)} ({item.percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">
                Total Budget:
              </span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(totalBudget)}
              </span>
            </div>
          </TabsContent>

          <TabsContent value="breakdown">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chartData.map((category, index) => {
                const Icon = category.icon;
                return (
                  <div
                    key={index}
                    className="relative overflow-hidden border rounded-lg p-4 transition-all duration-200 hover:shadow-md"
                    style={{
                      borderLeftColor: category.color,
                      borderLeftWidth: "4px",
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <h3 className="font-medium flex-1">{category.name}</h3>
                      <span className="text-sm font-semibold px-2 py-1 bg-gray-100 rounded-full">
                        {category.percentage}%
                      </span>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(category.value)}
                    </p>
                    <div className="mt-2 text-sm text-gray-500">
                      {category.components.length} component
                      {category.components.length !== 1 ? "s" : ""}
                    </div>
                    <div
                      className="absolute top-0 right-0 h-full w-1 opacity-20"
                      style={{ backgroundColor: category.color }}
                    />
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
