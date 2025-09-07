// For Node.js packages and CLI apps
module.exports = {
  extends: ["./index.js"],
  env: {
    node: true,
    es2022: true
  },
  rules: {
    // Allow console for CLI applications
    "no-console": "off",
    
    // Node.js specific rules
    "no-process-exit": "error",
    "no-process-env": "off"
  }
};