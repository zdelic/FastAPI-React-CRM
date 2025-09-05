import React from "react";
import { useLoading } from "../context/LoadingContext";

const LoadingOverlay: React.FC = () => {
  const { activeCount } = useLoading();
  if (activeCount <= 0) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* zatamnjena/blur pozadina */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      {/* centrirani spinner + poruka */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-white/40 border-t-white animate-spin" />
        <span className="text-white/90 text-sm">Laden…</span>
      </div>
    </div>
  );
};

export default LoadingOverlay;
