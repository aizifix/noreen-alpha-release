import React from "react";

interface Freebie {
  freebie_name: string;
  freebie_description?: string;
  freebie_value?: number;
}

interface FreebiesStepProps {
  freebies: Freebie[];
  setFreebies: (freebies: Freebie[]) => void;
  onNext: () => void;
}

export const FreebiesStep: React.FC<FreebiesStepProps> = ({
  freebies,
  setFreebies,
  onNext,
}) => {
  const addFreebie = () => {
    setFreebies([...freebies, { freebie_name: "" }]);
  };

  const updateFreebie = (index: number, value: string) => {
    const newFreebies = [...freebies];
    newFreebies[index].freebie_name = value;
    setFreebies(newFreebies);
  };

  const removeFreebie = (index: number) => {
    const newFreebies = freebies.filter((_, i) => i !== index);
    setFreebies(newFreebies);
  };

  const isStepValid = () => {
    return freebies.some((f) => f.freebie_name.trim() !== "");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Add Freebies</h3>

        <div className="space-y-4">
          {freebies.map((freebie, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={freebie.freebie_name}
                  onChange={(e) => updateFreebie(index, e.target.value)}
                  placeholder="Enter freebie name"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => removeFreebie(index)}
                className="p-2 text-red-600 hover:text-red-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addFreebie}
          className="mt-4 flex items-center text-blue-600 hover:text-blue-700"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Another Freebie
        </button>

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => onNext()}
            disabled={!isStepValid()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
