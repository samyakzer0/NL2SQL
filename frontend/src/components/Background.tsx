"use client";

import { useEffect, useRef } from "react";

export const Background = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      containerRef.current.style.setProperty("--mouse-x", `${e.clientX}px`);
      containerRef.current.style.setProperty("--mouse-y", `${e.clientY}px`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      style={{
        ["--mouse-x" as any]: "50vw",
        ["--mouse-y" as any]: "30vh",
      }}
    >
      {/* Ambient background dot grid */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Mouse hover spotlight illumination that reveals & highlights the grid */}
      <div
        className="absolute inset-0 opacity-100 transition-opacity duration-300"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.45) 1.5px, transparent 1.5px)`,
          backgroundSize: "28px 28px",
          maskImage: `radial-gradient(380px circle at var(--mouse-x) var(--mouse-y), black 0%, transparent 80%)`,
          WebkitMaskImage: `radial-gradient(380px circle at var(--mouse-x) var(--mouse-y), black 0%, transparent 80%)`,
        }}
      />

      {/* Subtle radial ambient glow following cursor */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(550px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.04), transparent 70%)`,
        }}
      />
    </div>
  );
};

export default Background;
