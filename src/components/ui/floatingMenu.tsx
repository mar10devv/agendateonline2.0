import React, { useState } from "react";
import styled from "styled-components";
import ModalAgendarse from "../agendaVirtual/modales/modalAgendarse";
import CalendarIcon from "../../assets/calendario-svg.svg?url"; // 👈 Import del SVG

const FloatingButton = ({ negocio }: { negocio: any }) => {
  const [modalAgendarseAbierto, setModalAgendarseAbierto] = useState(false);

  return (
    <StyledWrapper>
      {/* ✅ Botón flotante */}
      <button
        className="menu-open-button"
        onClick={() => setModalAgendarseAbierto(true)}
      >
        <img
          src={CalendarIcon}
          alt="Agendarse"
          className="w-7 h-7" // 👈 tamaño del ícono dentro del botón
        />
      </button>

      {/* ✅ Modal Agendarse */}
      {modalAgendarseAbierto && (
        <ModalAgendarse
          abierto={modalAgendarseAbierto}
          onClose={() => setModalAgendarseAbierto(false)}
          negocio={negocio}
        />
      )}
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  position: fixed;
  bottom: 40px;
  right: 40px;
  z-index: 1000;

  @media (min-width: 769px) {
    display: none;
  }

  .menu-open-button {
    border-radius: 100%;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff; /* ✅ botón pasa a blanco */
    color: #000; /* 👈 por si el SVG no tiene color */
    cursor: pointer;
    box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.25);
    transition: 0.3s;
  }

  .menu-open-button:hover {
    background: #f0f0f0; /* 👈 hover gris claro */
  }
`;

export default FloatingButton;
