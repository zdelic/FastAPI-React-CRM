import React from "react";

interface GewerkeFilterProps {
  allGewerke: string[];
  selectedGewerke: string[];
  setSelectedGewerke: (gewerke: string[]) => void;
}


const GewerkeFilter: React.FC<GewerkeFilterProps> = ({
  allGewerke,
  selectedGewerke,
  setSelectedGewerke,
}) => {
  return (
    <div>
      

      
        <div className="flex gap-4 flex-wrap mb-4 text-white text-sm">
          {allGewerke.map((g) => (
            <label key={g} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedGewerke.includes(g)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedGewerke([...selectedGewerke, g]);
                  } else {
                    setSelectedGewerke(selectedGewerke.filter((x) => x !== g));
                  }
                }}
              />
              <span className="whitespace-nowrap text-gray-800 dark:text-white text-sm">{g}</span>

            </label>
          ))}
        </div>
        <div className="mt-2">
          <button
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
            onClick={() => setSelectedGewerke([])}
          >
            Reset Gewerke
          </button>
        </div>

      
    </div>
  );
};

export default GewerkeFilter;
