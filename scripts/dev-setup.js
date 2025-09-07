#!/usr/bin/env node

/**
 * Development setup script - prepares the workspace for development
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Setting up development environment...\n');

const steps = [
  {
    name: 'Install dependencies',
    command: 'npm install',
    description: 'Installing all workspace dependencies'
  },
  {
    name: 'Build core packages',
    command: 'turbo build --filter=@repo/core --filter=@repo/utils --filter=@repo/eslint-config --filter=@repo/typescript-config --filter=@repo/tailwind-config',
    description: 'Building shared packages'
  },
  {
    name: 'Type check all packages',
    command: 'turbo type-check',
    description: 'Running TypeScript checks'
  },
  {
    name: 'Lint all packages',
    command: 'turbo lint',
    description: 'Running ESLint checks'
  }
];

let completedSteps = 0;

for (const step of steps) {
  try {
    console.log(`📋 ${step.description}...`);
    execSync(step.command, { stdio: 'pipe' });
    console.log(`✅ ${step.name} completed`);
    completedSteps++;
  } catch (error) {
    console.error(`❌ ${step.name} failed`);
    console.error(`Command: ${step.command}`);
    console.error(`Error: ${error.message}`);
    break;
  }
}

console.log(`\n📊 Setup complete: ${completedSteps}/${steps.length} steps successful`);

if (completedSteps === steps.length) {
  console.log('\n🎉 Development environment ready!');
  console.log('\n🔧 Available commands:');
  console.log('  npm run dev:web     - Start web app in development');
  console.log('  npm run dev:cli     - Watch CLI changes');
  console.log('  npm run dev:all     - Start all packages in watch mode');
  console.log('  npm run divvy AAPL  - Run CLI tool with a ticker');
  console.log('  npm run build       - Build all packages');
  console.log('  npm run test        - Run all tests');
} else {
  console.log('\n⚠️  Setup incomplete. Please fix errors and run again.');
  process.exit(1);
}