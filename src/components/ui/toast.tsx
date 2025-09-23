// src/components/ui/Toast.tsx
import React, { useEffect } from "react";

type ToastProps = {
  mensaje: string;
  visible: boolean;
  onClose: () => void;
  duracion?: number; // en ms
};

const Toast: React.FC<ToastProps> = ({ mensaje, visible, onClose, duracion = 4000 }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, duracion);
      return () => clearTimeout(timer);
    }
  }, [visible, duracion, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-lg bg-blue-600 text-white px-4 py-3 shadow-lg animate-fade-in">
      <span className="text-lg">🔔</span>
      <p className="font-medium">{mensaje}</p>
      <button
        onClick={onClose}
        className="ml-3 text-sm bg-white/20 hover:bg-white/30 rounded px-2 py-1"
      >
        ✖
      </button>
    </div>
  );
};

export default Toast;
