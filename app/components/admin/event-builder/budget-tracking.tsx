"use client";

import type React from "react";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Calculator, PieChart, ListChecks, DollarSign } from "lucide-react";
import { BudgetPieChart } from "./budget-pie-chart";
import { BudgetBreakdown } from "./budget-breakdown";

interface BudgetTrackingProps {
  components: any[];
  totalBudget: number;
  downPayment: number;
  originalPackagePrice: number | null;
  guestCount?: number;
  onDownPaymentChange: (amount: number) => void;
}

export function BudgetTracking({
  components,
  totalBudget,
  downPayment,
  originalPackagePrice,
  guestCount = 100,
  onDownPaymentChange,
}: BudgetTrackingProps) {
  const [customDownPayment, setCustomDownPayment] = useState(
    downPayment || totalBudget * 0.5
  );
  const [activeTab, setActiveTab] = useState("summary");

  const handleDownPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setCustomDownPayment(value);
      onDownPaymentChange(value);
    }
  };

  const handlePercentageClick = (percentage: number) => {
    const amount = totalBudget * percentage;
    setCustomDownPayment(amount);
    onDownPaymentChange(amount);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary" className="flex items-center">
            <Calculator className="mr-2 h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center">
            <ListChecks className="mr-2 h-4 w-4" />
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center">
            <PieChart className="mr-2 h-4 w-4" />
            Chart
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Budget Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label>Total Budget</Label>
                      <span className="text-lg font-bold">
                        {formatCurrency(totalBudget)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-green-600 h-2.5 rounded-full w-full"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label>Down Payment</Label>
                      <span className="text-lg font-bold">
                        {formatCurrency(customDownPayment)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{
                          width: `${Math.min((customDownPayment / totalBudget) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label>Balance</Label>
                      <span className="text-lg font-bold">
                        {formatCurrency(totalBudget - customDownPayment)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-amber-500 h-2.5 rounded-full"
                        style={{
                          width: `${Math.min(((totalBudget - customDownPayment) / totalBudget) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Label htmlFor="custom-down-payment">
                      Custom Down Payment
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="custom-down-payment"
                        type="number"
                        value={customDownPayment}
                        onChange={handleDownPaymentChange}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePercentageClick(0.5)}
                      >
                        50%
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePercentageClick(0.3)}
                      >
                        30%
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePercentageClick(0.7)}
                      >
                        70%
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>{/* Removed BudgetPieChart component */}</div>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4 pt-4">
          <BudgetBreakdown
            components={components}
            originalPackagePrice={originalPackagePrice}
            calculatedTotal={totalBudget}
          />
        </TabsContent>

        <TabsContent value="chart" className="space-y-4 pt-4">
          <BudgetPieChart components={components} totalBudget={totalBudget} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
