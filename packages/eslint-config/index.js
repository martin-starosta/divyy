// Base ESLint configuration for all packages
module.exports = {
  extends: [
    "eslint:recommended"
  ],
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
    // General code quality
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error"
  },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
      extends: [
        "eslint:recommended",
        "@typescript-eslint/recommended"
      ],
      rules: {
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-explicit-any": "warn"
      }
    }
  ]
};