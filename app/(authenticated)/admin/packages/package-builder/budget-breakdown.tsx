import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface Component {
  name: string;
  price: number;
}

interface Venue {
  venue_id: number;
  venue_title: string;
  total_price: number;
}

interface BudgetBreakdownProps {
  packagePrice: number;
  selectedVenue: Venue | null;
  components: Component[];
  freebies: string[];
}

const COLORS = [
  "#0088FE", // Venue
  "#00C49F", // Components
  "#FFBB28", // Remaining
  "#FF8042", // Component 1
  "#8884D8", // Component 2
  "#82CA9D", // Component 3
  "#FFC658", // Component 4
  "#FF7C7C", // Additional colors for more components
  "#9F7AEA",
  "#68D391",
];

export const BudgetBreakdown: React.FC<BudgetBreakdownProps> = ({
  packagePrice,
  selectedVenue,
  components,
  freebies,
}) => {
  // Calculate total component cost
  const totalComponentCost = components.reduce(
    (sum, component) => sum + component.price,
    0
  );

  // Calculate remaining budget
  const venueCost = selectedVenue?.total_price || 0;
  const remainingBudget = packagePrice - venueCost - totalComponentCost;

  // Prepare data for pie chart
  const data = [
    {
      name: "Venue",
      value: venueCost,
      color: COLORS[0],
    },
    ...components.map((component, index) => ({
      name: component.name,
      value: component.price,
      color: COLORS[(index + 1) % COLORS.length],
    })),
    {
      name: "Remaining",
      value: remainingBudget,
      color: COLORS[components.length + 1] || "#CCCCCC",
    },
  ].filter((item) => item.value > 0); // Only show items with value > 0

  // Custom legend component
  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    const total = payload.reduce(
      (sum: number, entry: any) => sum + entry.payload.value,
      0
    );

    return (
      <div className="flex flex-col gap-1 mt-4 max-h-[200px] overflow-y-auto">
        {payload.map((entry: any, index: number) => {
          const percentage = ((entry.payload.value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">
                {entry.value} - ₱{entry.payload.value.toLocaleString()} (
                {percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-6">Budget Breakdown</h3>

        {/* Pie Chart */}
        <div className="h-[450px] mb-4 mt-8">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="40%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    strokeWidth={0}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [
                  `₱${(value || 0).toLocaleString()}`,
                  "Amount",
                ]}
                labelStyle={{ color: "#374151" }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend
                content={renderCustomLegend}
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Summary */}
        <div className="mt-6 space-y-3 border-t pt-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium">
              Total Package Budget:
            </span>
            <span className="font-bold text-lg text-gray-900">
              ₱{(packagePrice || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Venue Cost:</span>
            <span className="font-semibold text-blue-600">
              ₱{(venueCost || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Component Cost:</span>
            <span className="font-semibold text-green-600">
              ₱{(totalComponentCost || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-t">
            <span className="text-gray-600 font-medium">Remaining Budget:</span>
            <span
              className={`font-bold text-lg ${
                remainingBudget < 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              ₱{(remainingBudget || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Freebies Section */}
        {freebies.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-3 text-gray-900 flex items-center">
              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
              Freebies (No Cost)
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {freebies.map((freebie, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 text-sm"
                >
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-700">{freebie}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
