import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

/**
 * Package browser extension into a zip file
 * Excludes node_modules, .git, and other unnecessary files
 */
export async function packageExtension(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Use process.cwd() to get project root, then navigate to browser-extension
    const projectRoot = process.cwd();
    const extensionDir = path.join(projectRoot, 'browser-extension');
    
    // Check if extension directory exists
    if (!fs.existsSync(extensionDir)) {
      reject(new Error(`Browser extension directory not found at: ${extensionDir}`));
      return;
    }

    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    const chunks: Buffer[] = [];
    
    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    archive.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });

    archive.on('error', (err: Error) => {
      reject(err);
    });

    // Add manifest.json
    const manifestPath = path.join(extensionDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      archive.file(manifestPath, { name: 'manifest.json' });
    }

    // Add directories (excluding node_modules, .git, etc.)
    const directoriesToInclude = ['src', 'public', 'icons', 'logo'];
    
    directoriesToInclude.forEach(dir => {
      const dirPath = path.join(extensionDir, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        archive.directory(dirPath, dir);
      }
    });

    // Add README if exists
    const readmePath = path.join(extensionDir, 'README.md');
    if (fs.existsSync(readmePath)) {
      archive.file(readmePath, { name: 'README.md' });
    }

    // Finalize the archive
    archive.finalize();
  });
}

