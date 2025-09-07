#!/usr/bin/env node

/**
 * Production build script - optimized for deployment
 */

import { execSync } from 'child_process';

console.log('🏗️  Starting production build...\n');

const commands = [
  {
    name: 'Clean previous builds',
    cmd: 'turbo clean'
  },
  {
    name: 'Install dependencies',
    cmd: 'npm ci'
  },
  {
    name: 'Build all packages',
    cmd: 'turbo build'
  },
  {
    name: 'Run all tests',
    cmd: 'turbo test'
  },
  {
    name: 'Type check all packages',
    cmd: 'turbo type-check'
  },
  {
    name: 'Lint all packages',
    cmd: 'turbo lint'
  }
];

let success = true;

for (const { name, cmd } of commands) {
  try {
    console.log(`📋 ${name}...`);
    execSync(cmd, { 
      stdio: 'inherit',
      env: { 
        ...process.env, 
        NODE_ENV: 'production',
        CI: 'true'
      }
    });
    console.log(`✅ ${name} completed\n`);
  } catch (error) {
    console.error(`❌ ${name} failed`);
    success = false;
    break;
  }
}

if (success) {
  console.log('🎉 Production build completed successfully!');
  console.log('\n📦 Build outputs:');
  console.log('   - apps/cli/dist/');
  console.log('   - apps/web/.next/');
  console.log('   - packages/core/dist/');
  console.log('   - packages/utils/dist/');
} else {
  console.error('💥 Production build failed!');
  process.exit(1);
}