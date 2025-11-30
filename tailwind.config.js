/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'brand-navy': '#112B3F',
        'brand-red': '#C43A3A',
        'brand-red-2': '#B02F2F',
        'brand-cream': '#F2EBD9',
        'brand-gold': '#D4A64A',
        'brand-gold-2': '#E0B85C',
        'brand-charcoal': '#1A1A1A',
        surface: {
          light: '#FFFFFF',
          dark: '#102E47',
        },
        background: {
          light: '#F2EBD9',
          dark: '#0C2A3A',
        },
        text: {
          light: '#1A1A1A',
          dark: '#F2EBD9',
        },
        muted: {
          light: '#163C5C',
          dark: '#D4A64A',
        },
      },
    },
  },
  plugins: [],
};
