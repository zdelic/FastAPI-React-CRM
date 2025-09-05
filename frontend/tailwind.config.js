// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    'w-[2px]', 'h-[200%]', 'top-[-50%]', 'rotate-45', '-rotate-45',
    'bg-red-600', 'bg-white', 'origin-top'
  ],

};

