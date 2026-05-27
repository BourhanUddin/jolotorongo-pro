import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        bangla: ["Hind Siliguri", "sans-serif"],
        sans: ["Hind Siliguri", "Inter", "sans-serif"],
      },
      colors: {
        primary: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
      },
      borderRadius: {
        DEFAULT: "12px",
      },
      screens: {
        xs: "375px",
        sm: "480px",
        md: "768px",
      },
    },
  },
  plugins: [],
};

export default config;
