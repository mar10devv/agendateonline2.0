import React, { useState, useRef, useEffect } from "react";

type Tab = {
  label: string;
  notification?: number;
};

type Props = {
  tabs: Tab[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
};

export default function TabsPill({ tabs, defaultIndex = 0, onChange }: Props) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const [gliderStyle, setGliderStyle] = useState({});
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = tabRefs.current[activeIndex];
    if (el) {
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement?.getBoundingClientRect();
      if (parentRect) {
        setGliderStyle({
          width: rect.width,
          height: rect.height,
          transform: `translate(${rect.left - parentRect.left}px, ${rect.top - parentRect.top}px)`,
        });
      }
    }
  }, [activeIndex, tabs]);

  const handleSelect = (index: number) => {
    setActiveIndex(index);
    if (onChange) onChange(index);
  };

  return (
    <div className="relative inline-flex flex-col md:flex-row bg-white shadow-md rounded-full p-1">
      {/* Glider dinámico */}
      <span
        className="absolute rounded-full bg-blue-100 transition-all duration-300"
        style={gliderStyle}
      />

      {tabs.map((tab, index) => (
        <button
          key={index}
          ref={(el) => (tabRefs.current[index] = el)}
          onClick={() => handleSelect(index)}
          className={`relative z-10 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full transition-colors ${
            activeIndex === index ? "text-blue-600" : "text-black"
          }`}
        >
          {tab.label}
          {tab.notification !== undefined && (
            <span
              className={`absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                activeIndex === index
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {tab.notification}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
