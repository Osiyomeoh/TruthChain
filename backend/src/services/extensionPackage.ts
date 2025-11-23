import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

/**
 * Package browser extension into a zip file
 * Excludes node_modules, .git, and other unnecessary files
 */
export async function packageExtension(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Try multiple possible locations for the browser-extension directory
    // __dirname is backend/src/services, so we need to go up to project root
    // backend/src/services -> backend/src -> backend -> project root
    const possiblePaths = [
      path.join(__dirname, '../../..', 'browser-extension'), // From backend/src/services -> project root
      path.join(process.cwd(), '../browser-extension'), // From backend directory -> project root
      path.join(process.cwd(), 'browser-extension'), // If already at project root
      path.join(__dirname, '../../browser-extension'), // Alternative: backend/browser-extension (unlikely)
    ];
    
    let extensionDir: string | null = null;
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        extensionDir = possiblePath;
        break;
      }
    }
    
    // Check if extension directory exists
    if (!extensionDir) {
      reject(new Error(`Browser extension directory not found. Searched in: ${possiblePaths.join(', ')}. Current working directory: ${process.cwd()}, __dirname: ${__dirname}`));
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

    // Add manifest.json (at root of browser-extension folder in ZIP)
    const manifestPath = path.join(extensionDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      archive.file(manifestPath, { name: 'browser-extension/manifest.json' });
    }

    // Add directories (excluding node_modules, .git, etc.)
    // Prefix all paths with 'browser-extension/' so they're in a folder when extracted
    const directoriesToInclude = ['src', 'public', 'icons', 'logo'];
    
    directoriesToInclude.forEach(dir => {
      const dirPath = path.join(extensionDir, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        archive.directory(dirPath, `browser-extension/${dir}`);
      }
    });

    // Add README if exists
    const readmePath = path.join(extensionDir, 'README.md');
    if (fs.existsSync(readmePath)) {
      archive.file(readmePath, { name: 'browser-extension/README.md' });
    }

    // Finalize the archive
    archive.finalize();
  });
}

