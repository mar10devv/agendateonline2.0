// src/lib/gsapAnimations.ts
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

/**
 * ✏️ Efecto "dibujado" de línea SVG
 */
export const animateDrawPath = (path: SVGPathElement, duration = 3) => {
  const length = path.getTotalLength();
  gsap.set(path, {
    strokeDasharray: length,
    strokeDashoffset: length,
  });
  gsap.to(path, {
    strokeDashoffset: 0,
    duration,
    ease: "power2.inOut",
  });
};

/**
 * 🚗 Mover un elemento siguiendo un path SVG
 */
export const animateMotionPath = (
  element: string | Element,
  path: string,
  duration = 5
) => {
  gsap.to(element, {
    duration,
    repeat: -1,
    ease: "none",
    motionPath: {
      path,
      align: path,
      alignOrigin: [0.5, 0.5],
    },
  });
};

/**
 * 🌊 Animación de "latido" o pulso en SVG
 */
export const animatePulse = (
  element: string | Element,
  duration = 1.2
) => {
  gsap.to(element, {
    scale: 1.2,
    transformOrigin: "center",
    repeat: -1,
    yoyo: true,
    duration,
    ease: "power1.inOut",
  });
};
