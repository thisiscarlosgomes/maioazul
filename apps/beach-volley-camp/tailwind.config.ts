import type { Config } from "tailwindcss";

// eslint-disable-next-line import/no-default-export
export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "scan-line": {
          "0%": { top: "0%" },
          "100%": { top: "100%" },
        },
        subtleBounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "80%": { transform: "translateY(-2px)" },
        },
        wheelSpin: {
          "0%, 24%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(90deg)" },
          "45%": { transform: "rotate(180deg)" },
          "50%": { transform: "rotate(90deg)" },
          "70%": { transform: "rotate(270deg)" },
          "75%": { transform: "rotate(180deg)" },
          "95%": { transform: "rotate(270deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "scan-line": "scan-line 3s ease-in-out infinite",
        subtleBounce: "subtleBounce 1.2s infinite",
        slowSpin: "spin 2s linear infinite",
        wheelSpin: "wheelSpin 3s ease-in-out infinite",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        mat: {
          DEFAULT: "var(--mat)",
        },
        well: {
          DEFAULT: "var(--well)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        active: {
          DEFAULT: "var(--active)",
          foreground: "var(--active-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        action: {
          DEFAULT: "var(--action)",
          foreground: "var(--action-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 5px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 3px)",
        sm: "calc(var(--radius) - 2px)",
      },
      fontFamily: {
        sans: [
          '"SF Pro Text"',
          '"SF Pro Display"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Inter"',
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
} satisfies Config;
