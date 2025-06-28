import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface BreakdownItem {
  name: string;
  price: number;
  percent: number;
}

interface ComponentPieChartProps {
  breakdown: BreakdownItem[];
  COLORS: string[];
}

const ComponentPieChart: React.FC<ComponentPieChartProps> = ({
  breakdown,
  COLORS,
}) => (
  <div className="flex items-center justify-center h-64 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={breakdown}
          dataKey="price"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={50}
          fill="#22c55e"
          label={({ name, percent }) =>
            `${name} (${(percent * 100).toFixed(0)}%)`
          }
          isAnimationActive={true}
        >
          {breakdown.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) =>
            typeof value === "number" ? formatCurrency(value) : value
          }
        />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export default ComponentPieChart;
