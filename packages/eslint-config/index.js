// Base ESLint configuration for all packages
module.exports = {
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  env: {
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  ignorePatterns: [
    "dist/",
    "build/",
    "coverage/",
    "node_modules/",
    "*.d.ts"
  ],
  rules: {
    // TypeScript specific overrides
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    
    // General code quality
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
};