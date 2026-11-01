/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hunter: {
          bg: "#0d0f12",
          card: "#16191f",
          border: "#262b36",
          accent: "#f59e0b",
          gold: "#eab308",
          text: "#f3f4f6",
          muted: "#9ca3af"
        }
      }
    },
  },
  plugins: [],
};
