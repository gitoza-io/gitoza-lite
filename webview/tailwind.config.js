import { vscodeColors } from "./tailwind.vscode-colors.js";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: vscodeColors,
      borderRadius: {
        ui: "6px",
        listItem: "0",
        card: "6px",
      },
    },
  },
  plugins: [],
};
