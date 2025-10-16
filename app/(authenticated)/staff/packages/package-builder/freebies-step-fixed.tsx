import React, { useCallback } from "react";
import { Plus, X } from "lucide-react";

interface Freebie {
  freebie_name: string;
  freebie_description?: string;
  freebie_value?: number;
}

interface FreebiesStepFixedProps {
  freebies: Freebie[];
  setFreebies: React.Dispatch<React.SetStateAction<Freebie[]>>;
}

export const FreebiesStepFixed: React.FC<FreebiesStepFixedProps> = ({
  freebies,
  setFreebies,
}) => {
  const addFreebie = useCallback(() => {
    setFreebies((prev: Freebie[]) => [...prev, { freebie_name: "" }]);
  }, [setFreebies]);

  const updateFreebie = useCallback(
    (index: number, value: string) => {
      setFreebies((prev: Freebie[]) =>
        prev.map((freebie: Freebie, i: number) =>
          i === index ? { ...freebie, freebie_name: value } : freebie
        )
      );
    },
    [setFreebies]
  );

  const removeFreebie = useCallback(
    (index: number) => {
      setFreebies((prev: Freebie[]) =>
        prev.filter((_: Freebie, i: number) => i !== index)
      );
    },
    [setFreebies]
  );

  const isStepValid = useCallback(() => {
    return freebies.some((f) => f.freebie_name.trim() !== "");
  }, [freebies]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Package Freebies</h3>
        <p className="text-gray-600 mb-6">
          Add freebies that come with this package at no additional cost
        </p>

        <div className="space-y-4">
          {freebies.map((freebie, index) => (
            <div
              key={`freebie-${index}`}
              className="flex items-start gap-4 p-4 border rounded-lg"
            >
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Freebie Name
                </label>
                <input
                  type="text"
                  value={freebie.freebie_name}
                  onChange={(e) => updateFreebie(index, e.target.value)}
                  placeholder="E.g., Complimentary bottle of champagne"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <button
                onClick={() => removeFreebie(index)}
                className="mt-6 p-2 text-gray-400 hover:text-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addFreebie}
          className="mt-4 w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Another Freebie
        </button>

        {freebies.length > 0 && !isStepValid() && (
          <p className="text-red-500 text-sm mt-2">
            Please enter at least one freebie name
          </p>
        )}
      </div>
    </div>
  );
};
