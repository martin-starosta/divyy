#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fixImportsInFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    
    // Fix relative imports that don't have .js extension
    const fixedContent = content.replace(
      /from ["'](\.\.[\/\\][^"']+|\.\/[^"']+)["']/g, 
      (match, importPath) => {
        if (importPath.endsWith('.js')) return match;
        return match.replace(importPath, importPath + '.js');
      }
    );
    
    if (content !== fixedContent) {
      await writeFile(filePath, fixedContent);
      console.log(`Fixed imports in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error);
  }
}

async function fixImportsRecursively(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await fixImportsRecursively(fullPath);
      } else if (entry.name.endsWith('.js')) {
        await fixImportsInFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error);
  }
}

// Fix imports in the dist directory
const distPath = join(__dirname, 'dist');
fixImportsRecursively(distPath);