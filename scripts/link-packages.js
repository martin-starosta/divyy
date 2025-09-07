#!/usr/bin/env node

/**
 * Script to create proper symlinks for internal packages
 * Useful when npm workspaces aren't working correctly
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const packages = [
  { name: '@repo/core', path: 'packages/core' },
  { name: '@repo/utils', path: 'packages/utils' },
  { name: '@repo/eslint-config', path: 'packages/eslint-config' },
  { name: '@repo/typescript-config', path: 'packages/typescript-config' },
  { name: '@repo/tailwind-config', path: 'packages/tailwind-config' }
];

const apps = [
  { name: '@repo/cli', path: 'apps/cli' },
  { name: '@repo/web', path: 'apps/web' }
];

console.log('🔗 Setting up package links...\n');

// First, build all packages that need building
console.log('📦 Building packages...');
try {
  execSync('turbo build --filter=@repo/core --filter=@repo/utils', { stdio: 'inherit' });
  console.log('✅ Packages built successfully\n');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Link packages globally
for (const pkg of packages) {
  if (fs.existsSync(pkg.path)) {
    try {
      console.log(`🔗 Linking ${pkg.name}...`);
      execSync(`cd ${pkg.path} && npm link`, { stdio: 'pipe' });
      console.log(`✅ Linked ${pkg.name}`);
    } catch (error) {
      console.log(`⚠️  Could not link ${pkg.name}`);
    }
  }
}

// Link packages to apps
for (const app of apps) {
  if (fs.existsSync(app.path)) {
    const packageJsonPath = path.join(app.path, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      for (const depName of Object.keys(deps)) {
        if (depName.startsWith('@repo/')) {
          try {
            console.log(`🔗 Linking ${depName} to ${app.name}...`);
            execSync(`cd ${app.path} && npm link ${depName}`, { stdio: 'pipe' });
            console.log(`✅ Linked ${depName} to ${app.name}`);
          } catch (error) {
            console.log(`⚠️  Could not link ${depName} to ${app.name}`);
          }
        }
      }
    }
  }
}

console.log('\n✅ Package linking complete!');
console.log('💡 If you encounter issues, try: npm run reset');