// src/components/ui/Tabs.tsx
import React from "react";

const Tabs = () => {
  return (
    <div className="radio-inputs relative flex w-[90%] rounded-md bg-[#70c489] px-4 pt-4 text-sm">
      {/* HTML */}
      <label className="radio relative">
        <input
          type="radio"
          name="radio"
          defaultChecked
          className="peer hidden"
        />
        <span
          className="
            name relative flex cursor-pointer items-center justify-center
            rounded-t-md px-3 py-2 transition-all
            peer-checked:bg-[#e8e8e8] peer-checked:font-semibold
            hover:text-white peer-checked:hover:text-[#1d1d29]
          "
        >
          HTML
          {/* ::before / ::after */}
          <span className="absolute -right-2 bottom-0 hidden h-2.5 w-2.5 bg-[#70c489] rounded-bl-full shadow-[-3px_3px_0px_3px_#e8e8e8] peer-checked:block"></span>
          <span className="absolute -left-2 bottom-0 hidden h-2.5 w-2.5 bg-[#70c489] rounded-br-full shadow-[3px_3px_0px_3px_#e8e8e8] peer-checked:block"></span>
        </span>
      </label>

      {/* React */}
      <label className="radio relative">
        <input type="radio" name="radio" className="peer hidden" />
        <span
          className="
            name relative flex cursor-pointer items-center justify-center
            rounded-t-md px-3 py-2 transition-all
            peer-checked:bg-[#e8e8e8] peer-checked:font-semibold
            hover:text-white peer-checked:hover:text-[#1d1d29]
          "
        >
          React
          <span className="absolute -right-2 bottom-0 hidden h-2.5 w-2.5 bg-[#70c489] rounded-bl-full shadow-[-3px_3px_0px_3px_#e8e8e8] peer-checked:block"></span>
          <span className="absolute -left-2 bottom-0 hidden h-2.5 w-2.5 bg-[#70c489] rounded-br-full shadow-[3px_3px_0px_3px_#e8e8e8] peer-checked:block"></span>
        </span>
      </label>

      {/* Vue */}
      <label className="radio relative">
        <input type="radio" name="radio" className="peer hidden" />
        <span
          className="
            name relative flex cursor-pointer items-center justify-center
            rounded-t-md px-3 py-2 transition-all
            peer-checked:bg-[#e8e8e8] peer-checked:font-semibold
            hover:text-white peer-checked:hover:text-[#1d1d29]
          "
        >
          Vue
          <span className="absolute -right-2 bottom-0 hidden h-2.5 w-2.5 bg-[#70c489] rounded-bl-full shadow-[-3px_3px_0px_3px_#e8e8e8] peer-checked:block"></span>
          <span className="absolute -left-2 bottom-0 hidden h-2.5 w-2.5 bg-[#70c489] rounded-br-full shadow-[3px_3px_0px_3px_#e8e8e8] peer-checked:block"></span>
        </span>
      </label>
    </div>
  );
};

export default Tabs;
