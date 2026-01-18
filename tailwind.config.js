/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./data/*.md",
    "./assets/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ffcd54',
        'red-custom': '#a20000',
      },
    },
  },
  plugins: [],
}
