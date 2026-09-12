import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cinema: {
          950: "#060709",
          900: "#0D1117",
          850: "#131722",
          800: "#1A202C",
          700: "#2D3748",
          600: "#4A5568",
          gold: "#F59E0B",
          neonRed: "#EF4444",
          neonCyan: "#06B6D4",
          purple: "#8B5CF6",
          emerald: "#10B981",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "cinema-screen": "linear-gradient(to bottom, rgba(56, 189, 248, 0.4), rgba(56, 189, 248, 0))",
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(245, 158, 11, 0.3)",
        "screen-glow": "0 10px 40px -10px rgba(56, 189, 248, 0.5)",
        "seat-glow": "0 0 12px 2px rgba(16, 185, 129, 0.6)",
      },
      animation: {
        pulseGlow: "pulseGlow 2.5s infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 10px rgba(245, 158, 11, 0.5))" },
          "50%": { opacity: "0.7", filter: "drop-shadow(0 0 4px rgba(245, 158, 11, 0.2))" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
