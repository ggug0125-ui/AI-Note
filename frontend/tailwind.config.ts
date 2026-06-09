import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#F8F4EC",
        coral: "#EF4444",
        ink: "#111111"
      },
      boxShadow: {
        soft: "0 24px 70px rgba(111, 64, 40, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
