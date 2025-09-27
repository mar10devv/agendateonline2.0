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
          <span className="lines line-1" />
          <span className="lines line-2" />
          <span className="lines line-3" />
        </label>

        {/* ✅ Solo dejamos estos 3 */}
        <a className="menu-item purple" href="#">
          <i className="fa fa-microphone" />
        </a>
        <a className="menu-item lightblue" href="#">
          <i className="fa fa-diamond" />
        </a>
        <a className="menu-item orange" href="#">
          <i className="fa fa-star" />
        </a>
      </nav>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .menu-item,
  .menu-open-button {
    background: #eeeeee;
    border-radius: 100%;
    width: 80px;
    height: 80px;
    margin-left: -40px;
    position: absolute;
    color: #ffffff;
    text-align: center;
    line-height: 80px;
    transition: transform ease-out 200ms;
  }

  .menu-open {
    display: none;
  }

  .lines {
    width: 25px;
    height: 3px;
    background: #596778;
    display: block;
    position: absolute;
    top: 50%;
    left: 50%;
    margin-left: -12.5px;
    margin-top: -1.5px;
  }
  .line-1 {
    transform: translate3d(0, -8px, 0);
  }
  .line-2 {
    transform: translate3d(0, 0, 0);
  }
  .line-3 {
    transform: translate3d(0, 8px, 0);
  }

  .menu {
    margin: auto;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 80px;
    height: 80px;
    text-align: center;
    font-size: 26px;
  }

  /* 👉 Mantener posiciones exactas */
  .menu-open:checked ~ .menu-item.purple {
    transform: translate3d(0, -105px, 0); /* Arriba */
  }
  .menu-open:checked ~ .menu-item.lightblue {
    transform: translate3d(-95px, 32px, 0); /* Izquierda */
  }
  .menu-open:checked ~ .menu-item.orange {
    transform: translate3d(-95px, -72px, 0); /* Derecha */
  }

  .menu-open-button {
    z-index: 2;
    transition: 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    transform: scale(1.1);
    cursor: pointer;
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.14);
  }

  /* Colores */
  .purple {
    background-color: #b908ff;
  }
  .lightblue {
    background-color: #62c2e4;
  }
  .orange {
    background-color: #fc913a;
  }
`;

export default Button;
