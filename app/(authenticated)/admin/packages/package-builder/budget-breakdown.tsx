import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { AlertTriangle, Lock, CheckCircle, DollarSign } from "lucide-react";

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
  venueFeeBuffer?: number | null; // Add venue fee buffer, can be null
  profitMargin?: number | null; // Add profit margin, admin-only
  actualVenueCost?: number; // Add actual venue cost calculation
  remainingVenueBudget?: number; // Add remaining venue budget
  clientAdditionalPayment?: number; // Add client additional payment
  isPackageLocked?: boolean;
  originalPrice?: number;
  onOverageWarning?: (overage: number) => void;
  onVenueFeeBufferChange?: (value: number | null) => void; // Add onChange handler
}

const COLORS = [
  "#0088FE", // Venue
  "#00C49F", // Components
  "#FFBB28", // Remaining/Buffer
  "#FF8042", // Overage (red for warning)
  "#8884D8", // Component colors
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
  "#9F7AEA",
  "#68D391",
];

export const BudgetBreakdown: React.FC<BudgetBreakdownProps> = ({
  packagePrice,
  selectedVenue,
  components,
  freebies,
  venueFeeBuffer = null,
  profitMargin = null,
  actualVenueCost = 0,
  remainingVenueBudget = 0,
  clientAdditionalPayment = 0,
  isPackageLocked = false,
  originalPrice,
  onOverageWarning,
  onVenueFeeBufferChange,
}) => {
  // Calculate total component cost (excluding venue fee buffer)
  const nonVenueComponents = (components || []).filter(
    (component) => component?.name !== "Venue Fee"
  );
  const totalNonVenueComponentCost = nonVenueComponents.reduce(
    (sum, component) => sum + (component?.price || 0),
    0
  );

  // Calculate venue fee buffer cost
  const venueFeeComponent = (components || []).find(
    (component) => component?.name === "Venue Fee"
  );
  const venueFeeCost = venueFeeComponent?.price || venueFeeBuffer || 0;

  // Calculate profit margin cost (admin-only)
  const profitMarginCost = profitMargin || 0;

  // Calculate remaining budget or overage
  // Package Price = Venue Fee Buffer + Profit Margin + Inclusions + Remaining Buffer
  const totalInclusionsCost =
    totalNonVenueComponentCost + venueFeeCost + profitMarginCost;
  const budgetDifference = packagePrice - totalInclusionsCost;

  // Determine budget status
  const isOverBudget = budgetDifference < 0;
  const isExactBudget = budgetDifference === 0;
  const bufferAmount = budgetDifference > 0 ? budgetDifference : 0;
  const overageAmount = budgetDifference < 0 ? Math.abs(budgetDifference) : 0;

  // Trigger overage warning callback
  React.useEffect(() => {
    if (isOverBudget && onOverageWarning) {
      onOverageWarning(overageAmount);
    }
  }, [isOverBudget, overageAmount, onOverageWarning]);

  // Prepare data for pie chart - use total package price as base minus venue buffer, profit margin, and remaining inclusion buffer
  const chartData = [
    // Venue Fee Buffer (allocated budget for venue costs)
    ...(venueFeeCost > 0
      ? [
          {
            name: "Venue Fee Buffer",
            value: venueFeeCost,
            color: "#0088FE",
            category: "venue_buffer",
          },
        ]
      : []),
    // Profit Margin (admin-only, reserved profit)
    ...(profitMarginCost > 0
      ? [
          {
            name: "Profit Margin",
            value: profitMarginCost,
            color: "#10B981", // Green for profit
            category: "profit_margin",
          },
        ]
      : []),
    // Non-venue components
    ...nonVenueComponents.map((component, index) => ({
      name: component?.name || "Unknown",
      value: component?.price || 0,
      color: COLORS[(index + 2) % COLORS.length], // Shift index to account for profit margin
      category: "inclusion",
    })),
    // Remaining inclusion buffer (available for admin to add components)
    ...(bufferAmount > 0
      ? [
          {
            name: "Remaining Buffer",
            value: bufferAmount,
            color: "#FFBB28",
            category: "buffer",
          },
        ]
      : []),
  ].filter((item) => item.value > 0);

  // Calculate margin percentage
  const marginPercentage =
    packagePrice > 0 ? (budgetDifference / packagePrice) * 100 : 0;

  // Custom legend component
  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    const total = packagePrice; // Use package price as total, not sum of components

    return (
      <div className="flex flex-col gap-1 mt-4 max-h-[200px] overflow-y-auto">
        {payload.map((entry: any, index: number) => {
          const percentage = (
            ((entry?.payload?.value || 0) / total) *
            100
          ).toFixed(1);
          const isBufferItem = entry?.payload?.category === "buffer";
          const isVenueBufferItem = entry?.payload?.category === "venue_buffer";
          const isProfitMarginItem =
            entry?.payload?.category === "profit_margin";
          const isInclusionItem = entry?.payload?.category === "inclusion";

          return (
            <div
              key={index}
              className={`flex items-center gap-2 text-xs ${
                isBufferItem
                  ? "text-green-600 font-medium"
                  : isVenueBufferItem
                    ? "text-blue-600 font-medium"
                    : isProfitMarginItem
                      ? "text-green-700 font-medium"
                      : isInclusionItem
                        ? "text-gray-600"
                        : "text-gray-600"
              }`}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="flex-1">
                {entry?.value || "Unknown"} - ₱
                {(entry?.payload?.value || 0).toLocaleString()} ({percentage}%)
              </span>
              {isBufferItem && (
                <CheckCircle className="w-3 h-3 text-green-500" />
              )}
              {isVenueBufferItem && (
                <DollarSign className="w-3 h-3 text-blue-500" />
              )}
              {isProfitMarginItem && (
                <DollarSign className="w-3 h-3 text-green-600" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Package Price Lock Status */}
      {isPackageLocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Package Price is Locked
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            This package price cannot be reduced. It can only be increased or
            remain the same.
            {originalPrice && originalPrice !== packagePrice && (
              <span className="block mt-1">
                Original price: ₱{originalPrice.toLocaleString()}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Budget Status Alert */}
      {isOverBudget && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">
              Budget Overage Warning
            </span>
          </div>
          <p className="text-sm text-red-700 mb-4">
            Inclusions exceed package price by ₱
            {(overageAmount || 0).toLocaleString()}. Consider removing
            inclusions or increasing the package price.
          </p>

          {/* Detailed Overage Breakdown */}
          <div className="bg-white rounded-lg border border-red-200 p-3 space-y-2">
            <h5 className="font-medium text-gray-900 text-sm border-b pb-1">
              Overage Breakdown
            </h5>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Package Price:</span>
                <span className="font-medium">
                  ₱{(packagePrice || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Inclusions:</span>
                <span className="font-medium text-red-600">
                  ₱{(totalInclusionsCost || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-gray-600 font-medium">Overage:</span>
                <span className="font-bold text-red-600">
                  ₱{(overageAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="text-center pt-1">
                <span className="text-gray-500">
                  {((overageAmount / packagePrice) * 100).toFixed(1)}% over
                  budget
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {bufferAmount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Buffer Available
            </span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            ₱{(bufferAmount || 0).toLocaleString()} available as coordinator
            margin/buffer ({(marginPercentage || 0).toFixed(1)}% of package
            price).
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-6">Budget Breakdown</h3>

        {/* Chart Section */}
        {chartData.length > 0 ? (
          <div className="h-[450px] mb-4 mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="40%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      strokeWidth={0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `₱${(value || 0).toLocaleString()}.00`,
                    props?.payload?.category === "venue_buffer"
                      ? "Venue Fee Buffer"
                      : props?.payload?.category === "profit_margin"
                        ? "Profit Margin (Admin)"
                        : props?.payload?.category === "buffer"
                          ? "Remaining Buffer"
                          : props?.payload?.category === "inclusion"
                            ? "Inclusion Cost"
                            : "Component Cost",
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
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-500">
            <p>No inclusions added yet</p>
          </div>
        )}

        {/* Budget Summary */}
        <div className="mt-6 space-y-3 border-t pt-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium flex items-center gap-2">
              Package Price:
              {isPackageLocked && <Lock className="w-3 h-3 text-blue-500" />}
            </span>
            <span className="font-bold text-lg text-gray-900">
              ₱{(packagePrice || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Venue Fee Buffer:</span>
            {onVenueFeeBufferChange ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">₱</span>
                </div>
                <input
                  type="text"
                  value={
                    venueFeeBuffer === null
                      ? ""
                      : venueFeeBuffer.toLocaleString()
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    // Remove commas and parse as number
                    const cleanValue = value.replace(/,/g, "");
                    if (cleanValue === "") {
                      onVenueFeeBufferChange(null);
                    } else {
                      const numValue = parseFloat(cleanValue);
                      if (!isNaN(numValue) && numValue >= 0) {
                        onVenueFeeBufferChange(numValue);
                      }
                    }
                  }}
                  placeholder="Enter amount"
                  className="w-32 border rounded pl-6 pr-2 py-1 text-sm font-semibold text-blue-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <span className="font-semibold text-blue-600">
                {venueFeeBuffer !== null
                  ? `₱${(venueFeeBuffer || 0).toLocaleString()}`
                  : "Not set"}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Profit Margin:</span>
            <span className="font-semibold text-green-600">
              {profitMarginCost > 0
                ? `₱${(profitMarginCost || 0).toLocaleString()}`
                : "Not set"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Other Inclusions:</span>
            <span className="font-semibold text-gray-600">
              ₱{(totalNonVenueComponentCost || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-gray-600 font-medium">
              Total Inclusions Cost:
            </span>
            <span className="font-semibold text-blue-600">
              ₱{(totalInclusionsCost || 0).toLocaleString()}
            </span>
          </div>

          {isOverBudget || bufferAmount > 0 ? (
            <div className="py-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">
                  {isOverBudget ? "Overage:" : "Buffer/Margin:"}
                </span>
                <span
                  className={`font-bold text-lg flex items-center gap-1 ${
                    isOverBudget ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {isOverBudget && <AlertTriangle className="w-4 h-4" />}
                  {bufferAmount > 0 && <CheckCircle className="w-4 h-4" />}₱
                  {Math.abs(budgetDifference || 0).toLocaleString()}
                </span>
              </div>
              {isOverBudget && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        In-House Inclusions:
                      </span>
                      <span className="font-medium">
                        {
                          nonVenueComponents.filter(
                            (c) => !c.name.includes("[Supplier]")
                          ).length
                        }{" "}
                        items
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Supplier Inclusions:
                      </span>
                      <span className="font-medium">
                        {
                          nonVenueComponents.filter((c) =>
                            c.name.includes("[Supplier]")
                          ).length
                        }{" "}
                        items
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-gray-600 font-medium">
                        Total Items:
                      </span>
                      <span className="font-semibold text-red-600">
                        {nonVenueComponents.length} inclusions
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Additional Info */}
          {marginPercentage !== 0 && (
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              {isOverBudget
                ? `${Math.abs(marginPercentage || 0).toFixed(1)}% over budget`
                : `${(marginPercentage || 0).toFixed(1)}% margin`}
            </div>
          )}
        </div>

        {/* Freebies Section */}
        {freebies && freebies.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-3 text-gray-900 flex items-center">
              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
              Freebies (No Cost Impact)
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {freebies.map((freebie, index) => (
                <div
                  key={`freebie-display-${index}`}
                  className="flex items-center space-x-2 text-sm text-gray-600"
                >
                  <span className="w-1 h-1 bg-yellow-400 rounded-full"></span>
                  <span>{freebie || "Unknown"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
