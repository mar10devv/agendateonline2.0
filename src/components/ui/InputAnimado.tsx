import React, { useRef, useEffect } from "react";
import styled from "styled-components";

type InputAnimadoProps = {
  label: string;
  id?: string;
  value?: string | number; // ✅ ahora acepta números también
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

const InputAnimado: React.FC<InputAnimadoProps> = ({
  label,
  id = "input",
  value = "",
  onChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 🔹 Autoajustar altura del textarea (solo si aplica)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const isMultiline = ["descripción", "descripcion", "bio"].some((p) =>
    label.toLowerCase().includes(p)
  );

  return (
    <StyledWrapper>
      <div className="form-control">
        {isMultiline ? (
          <textarea
            ref={textareaRef}
            id={id}
            required
            value={value}
            onChange={onChange}
            rows={2}
            maxLength={200}
          />
        ) : (
          <input
            type="text"
            id={id}
            required
            value={value}
            onChange={onChange}
          />
        )}

        <label htmlFor={id}>
          {label.split("").map((char, i) => (
            <span key={i} style={{ transitionDelay: `${i * 35}ms` }}>
              {char}
            </span>
          ))}
        </label>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;

  .form-control {
    position: relative;
    width: 100%;
    max-width: 420px; /* 🔹 centrado visual en modales medianos */
    margin: 12px auto;
  }

  .form-control input,
  .form-control textarea {
    background-color: transparent;
    border: 0;
    border-bottom: 2px solid #fff;
    display: block;
    width: 100%;
    padding: 14px 0 8px;
    font-size: 17px;
    color: #fff;
    resize: none;
    min-height: 42px; /* 🔹 altura base fija */
    transition: border-color 0.3s ease;
  }

  .form-control input:focus,
  .form-control textarea:focus {
    outline: 0;
    border-bottom-color: #38bdf8;
  }

  .form-control label {
    position: absolute;
    top: 15px;
    left: 0;
    pointer-events: none;
    transition: all 0.3s ease;
  }

  .form-control label span {
    display: inline-block;
    font-size: 17px;
    min-width: 5px;
    color: #ddd;
    transition: 0.25s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .form-control input:focus + label span,
  .form-control input:valid + label span,
  .form-control textarea:focus + label span,
  .form-control textarea:valid + label span {
    color: #38bdf8;
    transform: translateY(-28px); /* 🔹 sube el label */
  }

  /* 🔹 Cuando hay contenido largo, mantiene el label arriba */
  .form-control textarea:not(:placeholder-shown) + label span {
    transform: translateY(-28px);
  }
`;

export default InputAnimado;
