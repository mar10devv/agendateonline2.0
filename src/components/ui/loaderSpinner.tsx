// src/components/ui/LoaderSpinner.tsx
import React from "react";
import "../../styles/loader-spinner.css";

type LoaderSpinnerProps = {
  size?: number;
  color?: string;
};

const LoaderSpinner: React.FC<LoaderSpinnerProps> = ({
  size = 40,
  color = "white",
}) => {
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="25 25 50 50"
        className="loader-svg"
        style={{ width: size, height: size }}
      >
        <circle
          r={20}
          cy={50}
          cx={50}
          className="loader-circle"
          stroke={color}
        />
      </svg>
    </div>
  );
};

export default LoaderSpinner;
