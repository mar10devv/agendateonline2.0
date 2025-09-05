// src/lib/animaciones.ts
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// 👇 Registrar solo en cliente (no en SSR)
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// 👇 animación contador con scroll
export function animateCounterOnScroll(el: HTMLElement, final: number, duration: number = 2) {
  if (!el) return;

  gsap.fromTo(
    el,
    { innerText: 0 },
    {
      innerText: final,
      duration,
      ease: "power1.out",
      snap: { innerText: 1 },
      onUpdate: function () {
        el.innerText = Math.floor(Number(el.innerText)).toLocaleString();
      },
      scrollTrigger: {
        trigger: el,
        start: "top 80%", // empieza cuando entra en viewport
        once: true,       // solo una vez
      },
    }
  );
}

// Animaciones CSS (Animate.css)
export const cssAnimaciones = {
  fadeIn: "animate__animated animate__fadeIn",
  rubberBand: "animate__animated animate__rubberBand",
};

