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
    },
    ...components.map((component) => ({
      name: component.name,
      value: component.price,
    })),
    {
      name: "Remaining",
      value: remainingBudget,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Budget Breakdown</h3>

        {/* Pie Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) =>
                  `${name}: ₱${(value || 0).toLocaleString()}`
                }
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) =>
                  `₱${(value || 0).toLocaleString()}`
                }
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Summary */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between">
            <span>Total Package Budget:</span>
            <span className="font-semibold">
              ₱{(packagePrice || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Venue Cost:</span>
            <span className="font-semibold">
              ₱{(venueCost || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total Component Cost:</span>
            <span className="font-semibold">
              ₱{(totalComponentCost || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Remaining Budget:</span>
            <span
              className={`font-semibold ${
                remainingBudget < 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              ₱{(remainingBudget || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Freebies Section */}
        {freebies.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Freebies (No Cost)</h4>
            <ul className="list-disc list-inside space-y-1">
              {freebies.map((freebie, index) => (
                <li key={index} className="text-gray-600">
                  {freebie}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
