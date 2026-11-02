/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Sora", "sans-serif"],
      },
      colors: {
        bg: {
          primary: "#09090B",
          secondary: "#111113",
          card: "#18181B",
          hover: "#1E1E24",
        },
        border: {
          DEFAULT: "#27272A",
          subtle: "#1E1E24",
        },
        violet: {
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
        rose: {
          400: "#FB7185",
          500: "#F43F5E",
        },
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #7C3AED 0%, #F43F5E 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(244,63,94,0.05) 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(20px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        scaleIn: { from: { opacity: 0, transform: "scale(0.95)" }, to: { opacity: 1, transform: "scale(1)" } },
        shimmer: { "0%, 100%": { opacity: 0.5 }, "50%": { opacity: 1 } },
      },
    },
  },
  plugins: [],
};
