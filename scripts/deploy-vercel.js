#!/usr/bin/env node

/**
 * Vercel deployment script with Turborepo integration
 */

import { execSync } from 'child_process';
import fs from 'fs';

const ENVIRONMENT = process.env.NODE_ENV || 'production';
const IS_PRODUCTION = process.env.VERCEL_ENV === 'production' || process.argv.includes('--prod');

console.log(`🚀 Deploying to Vercel (${IS_PRODUCTION ? 'production' : 'preview'})...\n`);

const steps = [
  {
    name: 'Install dependencies',
    command: 'npm ci',
    description: 'Installing dependencies'
  },
  {
    name: 'Build core packages', 
    command: 'turbo build --filter=@repo/core --filter=@repo/utils --filter=@repo/eslint-config --filter=@repo/typescript-config --filter=@repo/tailwind-config',
    description: 'Building shared packages'
  },
  {
    name: 'Type check',
    command: 'turbo type-check --filter=@repo/web',
    description: 'Type checking web app'
  },
  {
    name: 'Lint',
    command: 'turbo lint --filter=@repo/web',
    description: 'Linting web app'
  },
  {
    name: 'Build web app',
    command: 'turbo build --filter=@repo/web',
    description: 'Building Next.js application'
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
    
    // Show more details for build failures
    if (error.stdout) {
      console.error('STDOUT:', error.stdout.toString());
    }
    if (error.stderr) {
      console.error('STDERR:', error.stderr.toString());
    }
    
    process.exit(1);
  }
}

console.log(`\n📊 Deployment build complete: ${completedSteps}/${steps.length} steps successful`);

// Verify build outputs
const webBuildOutput = 'apps/web/.next';
if (fs.existsSync(webBuildOutput)) {
  console.log('✅ Next.js build output found');
} else {
  console.error('❌ Next.js build output missing');
  process.exit(1);
}

// Log deployment info
console.log(`\n🎉 Ready for Vercel deployment!`);
console.log(`Environment: ${ENVIRONMENT}`);
console.log(`Production: ${IS_PRODUCTION}`);
console.log(`Web app build: ${webBuildOutput}`);

if (process.env.VERCEL_URL) {
  console.log(`Vercel URL: ${process.env.VERCEL_URL}`);
}