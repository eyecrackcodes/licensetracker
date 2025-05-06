/** @type {import('tailwindcss').Config} */
module.exports = {
  purge: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
  safelist: [
    "bg-red-100",
    "text-red-800",
    "bg-yellow-100",
    "text-yellow-800",
    "bg-green-100",
    "text-green-800",
    "bg-blue-100",
    "text-blue-800",
    "bg-red-50",
    "bg-yellow-50",
    "bg-green-50",
    "text-red-700",
    "text-yellow-700",
    "text-green-700",
    "text-red-600",
    "text-yellow-600",
    "text-green-600",
    "text-red-800",
    "text-yellow-800",
    "text-green-800",
  ],
};
