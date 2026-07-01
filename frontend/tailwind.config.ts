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
        app: "rgb(var(--ai-bg) / <alpha-value>)",
        surface: "rgb(var(--ai-surface) / <alpha-value>)",
        card: "rgb(var(--ai-card) / <alpha-value>)",
        panel: "rgb(var(--ai-panel) / <alpha-value>)",
        border: "rgb(var(--ai-border) / <alpha-value>)",
        primary: "rgb(var(--ai-primary) / <alpha-value>)",
        gold: "rgb(var(--ai-gold) / <alpha-value>)",
        title: "rgb(var(--ai-title) / <alpha-value>)",
        body: "rgb(var(--ai-body) / <alpha-value>)",
        muted: "rgb(var(--ai-muted) / <alpha-value>)",
        ivory: "rgb(var(--ai-bg) / <alpha-value>)",
        coral: "rgb(var(--ai-primary) / <alpha-value>)",
        ink: "rgb(var(--ai-title) / <alpha-value>)"
      },
      boxShadow: {
        soft: "var(--ai-shadow-soft)"
      }
    }
  },
  plugins: []
};

export default config;
