import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: "h-6 w-6", text: "text-lg" },
  md: { icon: "h-8 w-8", text: "text-xl" },
  lg: { icon: "h-12 w-12", text: "text-3xl" },
};

export function Logo({
  size = "md",
  showText = true,
  className = "",
}: LogoProps) {
  const sizeConfig = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center justify-center rounded-lg bg-green-500 ${sizeConfig.icon}`}
      >
        <span className="font-bold text-white">F</span>
      </div>
      {showText && (
        <span className={`font-bold text-gray-900 ${sizeConfig.text}`}>
          FreshSheet
        </span>
      )}
    </div>
  );
}
