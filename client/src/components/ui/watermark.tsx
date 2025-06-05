import React, { ReactNode } from "react";

interface WatermarkProps {
  children: ReactNode;
  text?: string;
}

export function Watermark({ children, text = "PIC'store" }: WatermarkProps) {
  return (
    <div className="relative overflow-hidden">
      {children}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="text-white text-opacity-70 text-2xl font-bold transform rotate-[-45deg] text-center"
          style={{ textShadow: "1px 1px 3px rgba(0, 0, 0, 0.5)" }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
