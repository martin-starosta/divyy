// For Next.js apps - simplified version
module.exports = {
  extends: [
    "./index.js"
  ],
  env: {
    browser: true,
    node: true,
    es2022: true
  },
  ignorePatterns: [
    "node_modules/**",
    ".next/**",
    "out/**", 
    "build/**",
    "next-env.d.ts"
  ],
  rules: {
    // Next.js specific rules
    "@next/next/no-html-link-for-pages": "off",
    "react/no-unescaped-entities": "off",
    
    // Allow console in development
    "no-console": process.env.NODE_ENV === "production" ? "error" : "warn"
  }
};