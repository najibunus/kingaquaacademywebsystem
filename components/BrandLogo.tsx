import React from "react";

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
  textColor?: string;
  className?: string;
}

export default function BrandLogo({
  size = 36,
  showText = true,
  textSize = "1.05rem",
  textColor,
  className = "",
}: BrandLogoProps) {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}
      >
        <img
          src="/logo.png"
          alt="Kingaqua Academy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
      {showText && (
        <span
          style={{
            fontFamily: "var(--font-display, sans-serif)",
            fontWeight: 700,
            fontSize: textSize,
            color: textColor || "inherit",
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
            lineHeight: 1.2,
          }}
        >
          Kingaqua Academy
        </span>
      )}
    </div>
  );
}
