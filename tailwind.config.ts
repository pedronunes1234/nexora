import type { Config } from "tailwindcss";

// Tokens do design system Kinetic Obsidian (kinetic_obsidian/DESIGN.md)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0b0d11",
        surface: {
          DEFAULT: "#10131a",
          lowest: "#0b0e15",
          low: "#191c23",
          container: "#1d2027",
          high: "#272a31",
          highest: "#32353c",
          1: "#12151c",
          2: "#181c24",
          3: "#202632",
        },
        stroke: "#252b38",
        primary: { DEFAULT: "#8b5cf6", soft: "#d0bcff", strong: "#7c3aed", container: "#a078ff" },
        periwinkle: "#6366f1",
        emerald: { DEFAULT: "#10b981", soft: "#4edea3" },
        amber: { DEFAULT: "#f59e0b" },
        coral: { DEFAULT: "#ef4444", soft: "#ffb4ab" },
        ink: { DEFAULT: "#e0e2ec", dim: "#94a3b8", mute: "#64748b" },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"Space Grotesk"', "ui-monospace", "monospace"],
      },
      borderRadius: { lg: "1rem", xl: "1.5rem" },
      boxShadow: {
        glow: "0 0 16px rgba(139,92,246,.4)",
        l3: "0 0 0 1px rgba(139,92,246,.35), 0 20px 48px -12px rgba(0,0,0,.85)",
        dock: "0 12px 32px 0 rgba(0,0,0,.6)",
        card: "0 8px 24px -4px rgba(0,0,0,.45)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        flash: { "0%": { boxShadow: "0 0 0 0 rgba(16,185,129,.6)" }, "100%": { boxShadow: "0 0 0 10px rgba(16,185,129,0)" } },
      },
      animation: { rise: "rise .25s ease-out both", flash: "flash .5s ease-out" },
    },
  },
  plugins: [],
};
export default config;
