/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color, #6366f1)',
        secondary: 'var(--secondary-color, #4f46e5)',
      },
      fontFamily: {
        sans: ['var(--font-family, Inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: 'var(--border-radius, 0.375rem)',
      },
      boxShadow: {
        button: 'var(--button-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06))',
      },
      backgroundColor: {
        header: 'var(--header-background, #ffffff)',
        sidebar: 'var(--sidebar-background, #f9fafb)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}