import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '0.85rem',
        md: '1.7rem',
        lg: '3.4rem',
      },
    },
    fontSize: {
      xs: ['0.62rem', { lineHeight: '0.83rem' }],     // was 0.75rem
      sm: ['0.73rem', { lineHeight: '1rem' }],        // was 0.875rem
      base: ['0.83rem', { lineHeight: '1.25rem' }],   // was 1rem
      lg: ['0.93rem', { lineHeight: '1.42rem' }],     // was 1.125rem
      xl: ['1.04rem', { lineHeight: '1.58rem' }],     // was 1.25rem
      '2xl': ['1.25rem', { lineHeight: '1.67rem' }],  // was 1.5rem
      '3xl': ['1.56rem', { lineHeight: '2rem' }],     // was 1.875rem
      '4xl': ['1.88rem', { lineHeight: '2.25rem' }],  // was 2.25rem
      '5xl': ['2.5rem', { lineHeight: '1' }],         // was 3rem
      '6xl': ['3.12rem', { lineHeight: '1' }],        // was 3.75rem
      '7xl': ['3.94rem', { lineHeight: '1' }],         // was 4.5rem
      '8xl': ['5rem', { lineHeight: '1' }],           // was 6rem
      '9xl': ['6.67rem', { lineHeight: '1' }],        // was 8rem
    },
    spacing: {
      0: '0px',
      0.5: '0.125rem',   // was 0.125rem
      1: '0.25rem',      // was 0.25rem
      1.5: '0.375rem',   // was 0.375rem
      2: '0.5rem',       // was 0.5rem
      2.5: '0.625rem',  // was 0.625rem
      3: '0.75rem',      // was 0.75rem
      3.5: '0.875rem',   // was 0.875rem
      4: '1rem',         // was 1rem
      5: '1.25rem',      // was 1.25rem
      6: '1.5rem',       // was 1.5rem
      7: '1.75rem',      // was 1.75rem
      8: '2rem',         // was 2rem
      9: '2.25rem',      // was 2.25rem
      10: '2.5rem',      // was 2.5rem
      11: '2.75rem',     // was 2.75rem
      12: '3rem',        // was 3rem
      14: '3.5rem',      // was 3.5rem
      16: '4rem',        // was 4rem
      20: '5rem',        // was 5rem
      24: '6rem',        // was 6rem
      28: '7rem',        // was 7rem
      32: '8rem',        // was 8rem
      36: '9rem',        // was 9rem
      40: '10rem',       // was 10rem
      44: '11rem',       // was 11rem
      48: '12rem',       // was 12rem
      52: '13rem',       // was 13rem
      56: '14rem',       // was 14rem
      60: '15rem',       // was 15rem
      64: '16rem',       // was 16rem
      72: '18rem',       // was 18rem
      80: '20rem',       // was 20rem
      96: '24rem',       // was 24rem
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        opensans: ["Inter", "sans-serif"],
      },
      colors: {
        // Custom Brand Green Color Palette - #028A75
        brand: {
          50: "#f0fdfa", // Very light teal-green
          100: "#ccfbf1", // Light teal-green
          200: "#99f6e4", // Light teal-green
          300: "#5eead4", // Medium light teal-green
          400: "#2dd4bf", // Medium teal-green
          500: "#028A75", // Primary brand color
          600: "#0d9488", // Darker teal-green
          700: "#0f766e", // Dark teal-green
          800: "#115e59", // Very dark teal-green
          900: "#134e4a", // Darkest teal-green
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
