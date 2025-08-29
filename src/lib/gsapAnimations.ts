// src/lib/gsapAnimations.ts
import gsap from "gsap";

// 👉 Llamar a esto una sola vez desde tus componentes con useEffect
export const registerGsapPlugins = async () => {
  if (typeof window !== "undefined") {
    const { MotionPathPlugin } = await import("gsap/MotionPathPlugin");
    const { ScrollTrigger } = await import("gsap/ScrollTrigger");
    gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);
  }
};


/* ===============================
   🔹 Animaciones SVG
   =============================== */

/** ✏️ Dibujo de línea (paths SVG) */
export const animateDrawPath = (
  element: string | Element | NodeListOf<Element>,
  duration = 2
) => {
  // 👇 detecta qué tipo de valor nos pasaron
  const paths =
    typeof element === "string"
      ? document.querySelectorAll<SVGPathElement>(element)
      : element instanceof Element
      ? [element as SVGPathElement]
      : element;

  paths.forEach((path) => {
    const length = (path as SVGPathElement).getTotalLength();
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
    });
    gsap.to(path, {
      strokeDashoffset: 0,
      duration,
      ease: "power2.inOut",
    });
  });
};


/** 🚗 Mover elemento a lo largo de un path SVG */
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

/** 🌊 Pulso (latido) */
export const animatePulse = (element: string | Element, duration = 1.2) => {
  gsap.to(element, {
    scale: 1.2,
    transformOrigin: "center",
    repeat: -1,
    yoyo: true,
    duration,
    ease: "power1.inOut",
  });
};

/** 🔄 Rotación infinita */
export const animateRotate = (element: string | Element, duration = 4) => {
  gsap.to(element, {
    rotate: 360,
    repeat: -1,
    ease: "linear",
    duration,
    transformOrigin: "center",
  });
};

/* ===============================
   🔹 Animaciones de Texto
   =============================== */

/** ✨ Fade-in desde abajo */
export const animateTextFadeIn = (element: string | Element, delay = 0) => {
  gsap.from(element, {
    opacity: 0,
    y: 40,
    duration: 1,
    delay,
    ease: "power3.out",
  });
};

/** ⌨️ Texto letra por letra */
export const animateTextTyping = (element: string | Element, speed = 0.05) => {
  const el = typeof element === "string" ? document.querySelector(element) : element;
  if (!el) return;
  const text = el.textContent || "";
  el.textContent = "";
  gsap.to({}, {
    duration: text.length * speed,
    onUpdate: () => {
      const progress = Math.floor((gsap.getProperty({}, "time") as number) / speed);
      el.textContent = text.substring(0, progress);
    },
  });
};

/** 💥 Texto con rebote */
export const animateTextBounce = (element: string | Element) => {
  gsap.from(element, {
    scale: 0,
    duration: 0.8,
    ease: "bounce.out",
  });
};

/* ===============================
   🔹 Animaciones de Botones
   =============================== */

/** 🎯 Hover con escala */
export const animateButtonHover = (element: string | Element) => {
  const el = typeof element === "string" ? document.querySelector(element) : element;
  if (!el) return;
  el.addEventListener("mouseenter", () => {
    gsap.to(el, { scale: 1.1, duration: 0.3, ease: "power2.out" });
  });
  el.addEventListener("mouseleave", () => {
    gsap.to(el, { scale: 1, duration: 0.3, ease: "power2.out" });
  });
};

/** 🕶️ Hover con sombra */
export const animateButtonShadow = (element: string | Element) => {
  const el = typeof element === "string" ? document.querySelector(element) : element;
  if (!el) return;
  el.addEventListener("mouseenter", () => {
    gsap.to(el, { boxShadow: "0px 4px 20px rgba(0,0,0,0.3)", duration: 0.3 });
  });
  el.addEventListener("mouseleave", () => {
    gsap.to(el, { boxShadow: "0px 0px 0px rgba(0,0,0,0)", duration: 0.3 });
  });
};

/** ⚡ Click con rebote */
export const animateButtonClick = (element: string | Element) => {
  const el = typeof element === "string" ? document.querySelector(element) : element;
  if (!el) return;
  el.addEventListener("click", () => {
    gsap.fromTo(el, { scale: 0.9 }, { scale: 1, duration: 0.2, ease: "back.out(2)" });
  });
};

/* ===============================
   🔹 Animaciones Scroll (extras)
   =============================== */

/** 👀 Aparecer al hacer scroll */
export const animateOnScroll = (element: string | Element) => {
  gsap.from(element, {
    opacity: 0,
    y: 50,
    duration: 1,
    scrollTrigger: {
      trigger: element,
      start: "top 80%",
    },
  });
};

/** 🚀 Bounce-in de íconos al entrar la sección */
export const animateBounceInOnScroll = (element: string, container: string) => {
  gsap.from(element, {
    scale: 0,
    opacity: 0,
    duration: 0.8,
    ease: "bounce.out",
    stagger: 0.15,
    scrollTrigger: {
      trigger: container,   // 👈 usa el contenedor
      start: "top 80%",
    },
  });
};


/** 🃏 Animar cards en cascada: icono + texto juntos */
export const animateCardsCascadeOnScroll = (cardSelector: string, iconSelector = ".servicio-icon", duration = 0.8) => {
  const cards = document.querySelectorAll<HTMLElement>(cardSelector);

  cards.forEach((card, i) => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: card,
        start: "top 85%", // cuando la card entra en viewport
      },
    });

    // Animar icono
    const icon = card.querySelector(iconSelector);
    if (icon) {
      tl.from(icon, {
        scale: 0,
        opacity: 0,
        duration,
        ease: "bounce.out",
      });
    }

    // Animar textos después del ícono
    const texts = card.querySelectorAll("h3, p, button");
    tl.from(texts, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      stagger: 0.1,
      ease: "power3.out",
    }, "-=0.2"); // se solapa un poco con el icono
  });
};


/** 📸 Aparición progresiva (fade + slide) de imágenes */
export const animateSobreNosotrosImages = (selector = ".sobre-nosotros-img") => {
  if (typeof window === "undefined") return;
  gsap.from(selector, {
    opacity: 0,
    y: 50,
    duration: 0.8,
    stagger: 0.4, // 👉 cada imagen aparece con desfase
    ease: "power3.out",
    scrollTrigger: {
      trigger: selector,
      start: "top 85%", // cuando entra al viewport
    },
  });
};

