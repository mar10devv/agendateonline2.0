import React from "react";
import styled from "styled-components";

const Button = () => {
  return (
    <StyledWrapper>
      <nav className="menu">
        <input
          id="menu-open"
          name="menu-open"
          className="menu-open"
          type="checkbox"
        />
        <label htmlFor="menu-open" className="menu-open-button">
          <i className="fa fa-bars" /> {/* ✅ Botón principal azul */}
        </label>

        {/* ✅ Botones desplegables con íconos */}
        <a className="menu-item location" href="#">
          <i className="fa fa-map-marker-alt" /> {/* 📍 Ubicación */}
        </a>
        <a className="menu-item calendar" href="#">
          <i className="fa fa-calendar" /> {/* 📅 Agenda */}
        </a>
        <a className="menu-item whatsapp" href="#">
          <i className="fa fa-whatsapp" /> {/* 💬 WhatsApp */}
        </a>
      </nav>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;

  /* 🔹 Ocultar en escritorio, mostrar solo en pantallas hasta 768px */
  @media (min-width: 769px) {
    display: none;
  }

  .menu-item,
  .menu-open-button {
    border-radius: 100%;
    width: 60px;
    height: 60px;
    margin-left: -20px;
bottom: 50px;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    transition: transform ease-out 200ms;
    box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.25);
  }

  .menu-open {
    display: none;
  }

  .menu {
    margin: auto;
    position: relative;
    width: 80px;
    height: 80px;
    text-align: center;
    font-size: 26px;
  }

  /* ✅ Tus coordenadas NO se tocan */
  .menu-open:checked ~ .menu-item.location {
    transform: translate3d(0, -90px, 0); /* Arriba */
  }
  .menu-open:checked ~ .menu-item.calendar {
    transform: translate3d(-75px, 32px, 0); /* Izquierda */
  }
  .menu-open:checked ~ .menu-item.whatsapp {
    transform: translate3d(-70px, -52px, 0); /* Derecha */
  }

  /* ✅ Botón central azul */
  .menu-open-button {
    background: #007bff;
    color: #fff;
    z-index: 2;
    cursor: pointer;
    transition: 0.3s;
  }
  .menu-open-button:hover {
    background: #0056b3;
  }

  /* ✅ Colores e íconos en blanco */
  .location {
    background-color: #17a2b8; /* celeste */
    color: white;
  }
  .calendar {
    background-color: #6f42c1; /* violeta agenda */
    color: white;
  }
  .whatsapp {
    background-color: #25d366; /* verde WhatsApp */
    color: white;
  }
`;

export default Button;
