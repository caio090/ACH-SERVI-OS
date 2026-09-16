import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff4ed",
          100: "#ffe4d3",
          200: "#ffc4a6",
          300: "#ff9c6e",
          400: "#ff6a2f",
          500: "#f9490c",
          600: "#ea3306",
          700: "#c22308",
          800: "#9a1d0e",
          900: "#7c1c0f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
