#!/usr/bin/env node

/**
 * Script to check workspace health and dependencies
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const WORKSPACES = [
  'apps/cli',
  'apps/web', 
  'packages/core',
  'packages/utils',
  'packages/eslint-config',
  'packages/typescript-config',
  'packages/tailwind-config'
];

console.log('🔍 Checking workspace health...\n');

let issues = 0;

// Check if all workspace directories exist
for (const workspace of WORKSPACES) {
  if (!fs.existsSync(workspace)) {
    console.error(`❌ Missing workspace: ${workspace}`);
    issues++;
  } else {
    console.log(`✅ Workspace exists: ${workspace}`);
    
    // Check if package.json exists
    const packageJsonPath = path.join(workspace, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.error(`❌ Missing package.json: ${workspace}`);
      issues++;
    }
  }
}

// Check Turbo configuration
if (fs.existsSync('turbo.json')) {
  console.log('✅ turbo.json exists');
} else {
  console.error('❌ turbo.json missing');
  issues++;
}

// Check if build outputs exist for built packages
const builtPackages = ['packages/core', 'packages/utils'];
for (const pkg of builtPackages) {
  const distPath = path.join(pkg, 'dist');
  if (fs.existsSync(distPath)) {
    console.log(`✅ Build output exists: ${pkg}/dist`);
  } else {
    console.log(`⚠️  No build output (run 'npm run build'): ${pkg}/dist`);
  }
}

// Check dependencies
try {
  execSync('npm ls --workspaces --depth=0', { stdio: 'pipe' });
  console.log('✅ All dependencies are properly installed');
} catch (error) {
  console.error('❌ Dependency issues found. Run: npm install');
  issues++;
}

console.log(`\n${issues === 0 ? '🎉' : '⚠️'} Health check complete. Issues found: ${issues}`);

if (issues > 0) {
  console.log('\n💡 Suggested fixes:');
  console.log('   - Run: npm install');
  console.log('   - Run: npm run build');
  console.log('   - Check workspace configuration');
  process.exit(1);
}

process.exit(0);