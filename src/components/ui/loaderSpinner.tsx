// src/components/ui/LoaderSpinner.tsx
import React from "react";
import "../../styles/loader-spinner.css";

const LoaderSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <svg viewBox="25 25 50 50" className="loader-svg">
        <circle r={20} cy={50} cx={50} className="loader-circle" />
      </svg>
    </div>
  );
};

export default LoaderSpinner;
