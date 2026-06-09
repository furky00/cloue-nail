// NOTE: This project uses Tailwind CSS v4 which is configured via CSS (@theme in globals.css).
// Brand colors are defined in app/globals.css under @theme inline and :root.
// This file is kept for reference only.
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#2D3B6B",
          pink: "#E8185A",
          "pink-light": "#F4A0B5",
          "pink-medium": "#E85A8A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
