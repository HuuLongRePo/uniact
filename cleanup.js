#!/usr/bin/env node

/**
 * UniAct System Cleanup Script
 * 
 * Removes:
 * - Build artifacts (.next, dist, build outputs)
 * - Test logs and temp files
 * - Node module cache
 * - OS temp files (.DS_Store, thumbs.db, etc.)
 * - Development temp files (.env.local, *.pid, *.tmp)
 * 
 * Preserves:
 * - Source code (src/, scripts/, public/)
 * - Version control (.git/)
 * - Package management (package.json, package-lock.json)
 * - Configuration files (.env.example, etc.)
 * 
 * Usage: node cleanup.js [--dry-run] [--no-nodemodules]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const skipNodeModules = args.includes('--no-nodemodules');

const rootDir = process.cwd();

// Globs of files/folders to remove
const cleanupPatterns = [
  // Build artifacts
  '.next',
  '.next-integration',
  'dist',
  'build',
  'out',
  'tsconfig.tsbuildinfo',
  '.tsconfig.release.effective.json',
  
  // Test outputs
  'TEST_*.log',
  'test-results',
  'coverage',
  '.nyc_output',
  
  // Development temp
  '.tmp',
  '*.tmp',
  '.env.local',
  '.env.*.local',
  '*.pid',
  '.vscode/settings.json.tmp',
  
  // OS artifacts
  '.DS_Store',
  'Thumbs.db',
  '*.swp',
  '*.swo',
  '*~',
  '.idea',
  '.vscode/launch.json.tmp',
  
  // Cache
  '.cache',
  '.eslintcache',
  'node_path.log',
  
  // Build logs (keep git, but clean build logs)
  'build*.log',
  'build_*.log',
  'quick_test.log',
  'node_path.log',
  
  // Temporary test files
  'TEST_BUILD_SERVER.log',
  'TEST_DEV_SERVER.log',
  'TEST_RESULTS_2026.log',
  'TEST_SEED_QA.log',
  
  // Specific patterns
  '.turbo',
  '.next-build.exit',
  'artifacts/tmp',
  'backups/*.tmp',
];

function patternToRegex(pattern) {
  // Convert glob pattern to regex
  const escaped = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

function shouldDelete(filePath) {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(rootDir, filePath);
  
  // Never delete critical directories
  if (['src', 'scripts', 'public', '.git', 'node_modules', 'docs', 'migrations', 'de-tai'].some(dir => 
    relativePath.startsWith(dir + path.sep) || relativePath === dir
  )) {
    return false;
  }

  // Check against cleanup patterns
  return cleanupPatterns.some(pattern => {
    const regex = patternToRegex(pattern);
    return regex.test(fileName) || regex.test(relativePath);
  });
}

function deleteRecursive(filePath, dryRun = false) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  let deletedCount = 0;
  const stats = fs.statSync(filePath);

  if (stats.isDirectory()) {
    try {
      const files = fs.readdirSync(filePath);
      for (const file of files) {
        deletedCount += deleteRecursive(path.join(filePath, file), dryRun);
      }
      
      // Delete empty directory
      if (fs.readdirSync(filePath).length === 0) {
        if (!dryRun) {
          fs.rmdirSync(filePath);
        }
        console.log(`  [DIR ] ${path.relative(rootDir, filePath)}`);
        deletedCount++;
      }
    } catch (error) {
      console.error(`  [ERR ] Failed to process ${filePath}: ${error.message}`);
    }
  } else {
    if (!dryRun) {
      fs.unlinkSync(filePath);
    }
    console.log(`  [FILE] ${path.relative(rootDir, filePath)}`);
    deletedCount++;
  }

  return deletedCount;
}

function getDirectorySize(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        size += getDirectorySize(filePath);
      } else {
        size += stats.size;
      }
    }
  } catch {
    // Ignore errors
  }
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function cleanup() {
  console.log('\n🧹 UniAct System Cleanup\n');
  console.log('Options:', {
    dryRun: isDryRun,
    skipNodeModules: skipNodeModules,
  });
  console.log('\n' + (isDryRun ? '📋 DRY RUN - No files will be deleted\n' : '⚠️  LIVE RUN - Files will be deleted\n'));

  let totalDeleted = 0;
  let totalSize = 0;

  // Process node_modules separately
  if (!skipNodeModules && fs.existsSync(path.join(rootDir, 'node_modules'))) {
    console.log('📦 Cleaning node_modules...');
    const nmSize = getDirectorySize(path.join(rootDir, 'node_modules'));
    totalSize += nmSize;
    if (isDryRun) {
      console.log(`  Would remove: ${formatBytes(nmSize)}`);
    } else {
      try {
        execSync('rm -rf node_modules', { cwd: rootDir, stdio: 'pipe' });
        console.log(`  ✓ Removed ${formatBytes(nmSize)}`);
        totalDeleted++;
      } catch {
        console.log('  (Use: npm install to restore)');
      }
    }
    console.log();
  }

  // Process cleanup patterns
  console.log('🗑️  Cleaning up artifacts and logs...');
  const items = fs.readdirSync(rootDir);

  for (const item of items) {
    const itemPath = path.join(rootDir, item);
    if (shouldDelete(itemPath)) {
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        const dirSize = getDirectorySize(itemPath);
        totalSize += dirSize;
      } else {
        totalSize += stats.size;
      }
      totalDeleted += deleteRecursive(itemPath, isDryRun);
    }
  }

  console.log(`\n✅ Cleanup complete`);
  console.log(`   Files/Folders removed: ${totalDeleted}`);
  console.log(`   Space freed: ${formatBytes(totalSize)}`);

  if (isDryRun) {
    console.log('\n💡 Tip: Run without --dry-run to actually delete files');
  }

  if (skipNodeModules && fs.existsSync(path.join(rootDir, 'node_modules'))) {
    console.log('\n💡 Tip: Add node_modules to cleanup by removing --no-nodemodules flag');
  }

  console.log();
}

cleanup().catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
