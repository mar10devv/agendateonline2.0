// src/components/ui/BlobEffect.tsx
import React from "react";

type Props = {
  color?: string; // Tailwind class, ej: "bg-red-500"
};

export default function BlobEffect({ color = "bg-red-500" }: Props) {
  return (
    <div className="absolute -inset-10 z-0">
      <div className={`blob ${color}`} />
      <style>{`
        .blob {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          opacity: 0.6;
          filter: blur(60px);
          animation: blob-bounce 12s infinite ease-in-out;
        }

        @keyframes blob-bounce {
          0% {
            transform: translate(-140%, -50%) translate(0%, 0%);
          }
          25% {
            transform: translate(-90%, -90%) translate(120%, 0%);
          }
          50% {
            transform: translate(-50%, -50%) translate(120%, 120%);
          }
          75% {
            transform: translate(-50%, -50%) translate(0%, 120%);
          }
          100% {
            transform: translate(-90%, -90%) translate(0%, 0%);
          }
        }
      `}</style>
    </div>
  );
}
