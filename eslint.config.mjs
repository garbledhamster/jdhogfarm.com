import globals from "globals";
import html from "eslint-plugin-html";

export default [
  {
    files: ["**/*.html"],
    plugins: {
      html
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        firebase: "readonly",
        marked: "readonly",
        DOMPurify: "readonly",
        gtag: "writable",
        dataLayer: "writable"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "semi": ["error", "always"],
      "quotes": ["error", "single", { "avoidEscape": true, "allowTemplateLiterals": true }]
    }
  }
];
