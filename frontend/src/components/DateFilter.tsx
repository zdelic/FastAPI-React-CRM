import React from "react";

interface DateFilterProps {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  onReset: () => void;
}

const DateFilter: React.FC<DateFilterProps> = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onReset,
}) => {
  return (
    <div className="flex flex-col gap-4 mb-4 text-sm">
      <div className="flex gap-4 items-center text-sm">
        <label className="text-sm text-gray-700">
          Start:
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="ml-2 border px-2 py-1 rounded"
          />
        </label>
        <label className="text-sm text-gray-700">
          Ende:
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="ml-2 border px-2 py-1 rounded"
          />
        </label>
      </div>

      <button
        className="w-fit px-4 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        onClick={onReset}
      >
        Datum Reset
      </button>
    </div>
  );
};

export default DateFilter;
