/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0a0a',
          surface: '#1a1a1a',
          card: '#2a2a2a',
          border: '#404040',
          text: {
            primary: '#ffffff',
            secondary: '#b0b0b0',
            muted: '#808080',
          },
          accent: {
            blue: '#3b82f6',
            'blue-dark': '#1d4ed8',
          },
        },
      },
    },
  },
  plugins: [],
};
