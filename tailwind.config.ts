import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#4F46E5', // A nice blue-purple
        secondary: '#6EE7B7', // A light green
        accent: '#FCD34D', // A warm yellow
        background: '#F9FAFB', // Light gray background
        card: '#FFFFFF', // White card background
        text: '#1F2937', // Dark gray text
        lightText: '#6B7280', // Lighter gray text
      },
      boxShadow: {
        'custom-light': '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)',
        'custom-medium': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
export default config;