import React from "react";
import "../../styles/loaderAgenda.css";

const LoaderAgenda: React.FC = () => {
  return (
    <div className="loader-container">
      <div className="typewriter">
        <div className="slide">
          <i />
        </div>
        <div className="paper" />
        <div className="keyboard" />
      </div>

      <p className="loading-text">Cargando agenda...</p>
    </div>
  );
};

export default LoaderAgenda;
