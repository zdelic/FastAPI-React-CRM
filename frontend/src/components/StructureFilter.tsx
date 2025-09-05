import React from "react";

interface Task {
  bauteil: string;
  stiege: string;
  ebene: string;
  top: string;
}

interface StructureFilterProps {
  tasks: Task[];

  selectedTops: string[];
  setSelectedTops: (val: string[]) => void;
}

const StructureFilter: React.FC<StructureFilterProps> = ({
  tasks,
  selectedTops,
  setSelectedTops,
}) => {
  // Kreiraj hijerarhiju: Bauteil > Stiege > Ebene > Top
  const structure = tasks.reduce((acc: any, task) => {
    const { bauteil, stiege, ebene, top } = task;

    if (!acc[bauteil]) acc[bauteil] = {};
    if (!acc[bauteil][stiege]) acc[bauteil][stiege] = {};
    if (!acc[bauteil][stiege][ebene]) acc[bauteil][stiege][ebene] = [];

    if (!acc[bauteil][stiege][ebene].includes(top)) {
      acc[bauteil][stiege][ebene].push(top);
    }

    return acc;
  }, {});

  const handleToggle = (top: string, checked: boolean) => {
    if (checked) {
      setSelectedTops([...selectedTops, top]);
    } else {
      setSelectedTops(selectedTops.filter((t) => t !== top));
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {Object.entries(structure).map(([bauteil, stiegen]) => (
        <div key={bauteil}>
          <h3 className="font-bold text-cyan-700 mb-1">🏗 {bauteil}</h3>

          {Object.entries(stiegen as any).map(([stiege, ebenen]) => (
            <div key={stiege} className="ml-4">
              <h4 className="text-cyan-600 font-semibold mb-1">🧱 {stiege}</h4>

              {Object.entries(ebenen as any).map(([ebene, tops]) => (
                <div key={ebene} className="ml-6">
                  <h5 className="text-cyan-500 font-medium mb-1">🏢 {ebene}</h5>

                  <div className="ml-4 flex flex-wrap gap-4">
                    {(tops as string[]).map((top) => (
                      <label key={top} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedTops.includes(top)}
                          onChange={(e) => handleToggle(top, e.target.checked)}
                        />
                        <span>{top}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      <div className="mt-4">
        <button
          className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
          onClick={() => setSelectedTops([])}
        >
          Reset Struktur
        </button>
      </div>
    </div>
  );
};

export default StructureFilter;
