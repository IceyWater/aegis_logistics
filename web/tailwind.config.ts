import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1F3A",
        signal: "#F5A623",
        paper: "#F7F9FC",
        muted: "#626D7B",
        line: "#DFE4EA",
      },
      fontFamily: {
        display: ["Space Grotesk", "Arial", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
