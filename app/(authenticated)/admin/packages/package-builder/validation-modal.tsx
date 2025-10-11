"use client";
import React from "react";
import { AlertTriangle, DollarSign, X, Check } from "lucide-react";

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  validationType: "overage" | "price_reduction" | "budget_warning";
  data: {
    packagePrice?: number;
    inclusionsTotal?: number;
    overageAmount?: number;
    currentPrice?: number;
    attemptedPrice?: number;
    bufferAmount?: number;
    marginPercentage?: number;
  };
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  validationType,
  data,
}) => {
  if (!isOpen) return null;

  const renderOverageWarning = () => (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">
            Budget Overage Detected
          </h3>
          <p className="text-sm text-gray-500">
            Your inclusions exceed the package price
          </p>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Package Price:</span>
            <span className="font-medium">
              ₱{data.packagePrice?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Inclusions Total:</span>
            <span className="font-medium text-red-600">
              ₱{data.inclusionsTotal?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="font-medium text-red-700">Overage Amount:</span>
            <span className="font-bold text-red-700">
              ₱{data.overageAmount?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-700 mb-6">
        <p className="mb-3">
          <strong>What this means:</strong> Your internal costs exceed the
          package price. This overage will come out of your coordinator
          margin/profit.
        </p>

        <p className="mb-3">
          <strong>Your options:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Remove or reduce some inclusions to stay within budget</li>
          <li>
            Increase the package price to ₱
            {data.inclusionsTotal?.toLocaleString()} or more
          </li>
          <li>Accept the overage and absorb the extra cost</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel & Revise
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Accept Overage
        </button>
      </div>
    </div>
  );

  const renderPriceReductionError = () => (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <X className="w-6 h-6 text-red-600" />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">
            Price Reduction Not Allowed
          </h3>
          <p className="text-sm text-gray-500">
            Package prices are locked and cannot be reduced
          </p>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current Locked Price:</span>
            <span className="font-medium">
              ₱{data.currentPrice?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Attempted Price:</span>
            <span className="font-medium text-red-600">
              ₱{data.attemptedPrice?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-700 mb-6">
        <p className="mb-3">
          <strong>Why this is blocked:</strong> Package prices are locked once
          created to ensure consistent pricing for clients and prevent
          accidental profit loss.
        </p>

        <p className="mb-3">
          <strong>What you can do:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            Keep the current price of ₱{data.currentPrice?.toLocaleString()}
          </li>
          <li>
            Increase the price to ₱{data.attemptedPrice?.toLocaleString()} or
            higher
          </li>
          <li>Adjust inclusions to manage your budget instead</li>
        </ul>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onClose}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Understood
        </button>
      </div>
    </div>
  );

  const renderBudgetWarning = () => (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 w-10 h-10 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-yellow-600" />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">
            Budget Status Update
          </h3>
          <p className="text-sm text-gray-500">
            Review your package budget changes
          </p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Package Price:</span>
            <span className="font-medium">
              ₱{data.packagePrice?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Inclusions Total:</span>
            <span className="font-medium">
              ₱{data.inclusionsTotal?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="font-medium text-green-700">
              Buffer Available:
            </span>
            <span className="font-bold text-green-700">
              ₱{data.bufferAmount?.toLocaleString()}
            </span>
          </div>
          {data.marginPercentage && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Margin Percentage:</span>
              <span>{data.marginPercentage.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-700 mb-6">
        <p className="mb-3">
          <strong>Good news!</strong> Your inclusions are within budget. The
          remaining amount becomes your coordinator margin/profit.
        </p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onConfirm}
          className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {validationType === "overage" && "Budget Overage"}
            {validationType === "price_reduction" && "Price Lock Error"}
            {validationType === "budget_warning" && "Budget Update"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {validationType === "overage" && renderOverageWarning()}
        {validationType === "price_reduction" && renderPriceReductionError()}
        {validationType === "budget_warning" && renderBudgetWarning()}
      </div>
    </div>
  );
};
