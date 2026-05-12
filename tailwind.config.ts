import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "720px" },
    },
    extend: {
      colors: {
        parchment: {
          50: "#fdfaf3",
          100: "#fbf8f3",
          200: "#f3ede0",
          300: "#e7dcc4",
        },
        ink: {
          900: "#1a1612",
          800: "#2a241d",
          700: "#3d3528",
          500: "#5f5340",
          400: "#7c6f59",
          300: "#a1947b",
        },
        accent: {
          DEFAULT: "#6b4226",
          dark: "#4a2d18",
          muted: "#8e6a4a",
        },
      },
      fontFamily: {
        serif: [
          "'EB Garamond'",
          "Garamond",
          "'Iowan Old Style'",
          "'Apple Garamond'",
          "Georgia",
          "serif",
        ],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      typography: {
        DEFAULT: {
          css: {
            "max-width": "none",
          },
        },
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
