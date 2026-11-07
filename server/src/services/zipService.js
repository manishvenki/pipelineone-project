import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { analyzeStaticProject } from './projectDetectionService.js';
import logger from '../utils/logger.js';

const MAX_UNCOMPRESSED_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB
const MAX_FILE_COUNT = 3000;

/**
 * Safely extracts a ZIP archive into target directory preventing Zip Slip and Zip Bombs
 */
export const safelyExtractZip = async (zipFilePath, targetDir) => {
  if (!fs.existsSync(zipFilePath)) {
    throw new Error('ZIP file does not exist');
  }

  const zip = new AdmZip(zipFilePath);
  const zipEntries = zip.getEntries();

  if (zipEntries.length > MAX_FILE_COUNT) {
    throw new Error(`Archive contains too many files (${zipEntries.length} > ${MAX_FILE_COUNT})`);
  }

  let totalUncompressedSize = 0;
  const resolvedTarget = path.resolve(targetDir);

  // First pass: Validate security constraints
  for (const entry of zipEntries) {
    totalUncompressedSize += entry.header.size;
    if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE_BYTES) {
      throw new Error('Archive exceeds maximum uncompressed size limit (Zip Bomb protection)');
    }

    // Zip Slip check: explicitly reject directory traversal characters and escape attempts
    const normalizedEntry = entry.entryName.replace(/\\/g, '/');
    if (normalizedEntry.includes('../') || normalizedEntry.includes('/..') || normalizedEntry === '..' || path.isAbsolute(entry.entryName)) {
      throw new Error(`Malicious path detected in archive: ${entry.entryName} (Zip Slip attempt)`);
    }

    const destPath = path.resolve(resolvedTarget, entry.entryName);
    if (!destPath.startsWith(resolvedTarget + path.sep) && destPath !== resolvedTarget) {
      throw new Error(`Malicious path detected in archive: ${entry.entryName} (Zip Slip attempt)`);
    }
  }

  // Ensure target folder exists
  fs.mkdirSync(resolvedTarget, { recursive: true });

  // Second pass: Safe extraction
  const extractedFiles = [];
  let packageJsonContent = null;

  for (const entry of zipEntries) {
    const destPath = path.resolve(resolvedTarget, entry.entryName);

    if (entry.isDirectory) {
      fs.mkdirSync(destPath, { recursive: true });
    } else {
      // Ensure parent directory exists
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, entry.getData());
      extractedFiles.push(entry.entryName);

      // Check if this is package.json
      if (entry.entryName.toLowerCase() === 'package.json' || entry.entryName.toLowerCase().endsWith('/package.json')) {
        try {
          packageJsonContent = entry.getData().toString('utf8');
        } catch {
          // Ignore parse errors here
        }
      }
    }
  }

  // Analyze the static project structure
  const analysis = analyzeStaticProject(extractedFiles, packageJsonContent);

  // Generate lightweight file tree for preview
  const fileTree = buildFileTreePreview(extractedFiles);

  return {
    extractedFilesCount: extractedFiles.length,
    extractedFiles: extractedFiles.slice(0, 100), // Preview sample
    fileTree,
    analysis,
    storagePath: resolvedTarget,
  };
};

/**
 * Builds a nested tree structure for frontend visualization
 */
const buildFileTreePreview = (files, maxNodes = 60) => {
  const root = { name: 'root', type: 'directory', children: [] };

  for (const file of files.slice(0, maxNodes)) {
    const parts = file.replace(/\\/g, '/').split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      let existing = current.children.find((c) => c.name === part);
      if (!existing) {
        existing = {
          name: part,
          type: isFile ? 'file' : 'directory',
          ...(isFile ? {} : { children: [] }),
        };
        current.children.push(existing);
      }
      current = existing;
    }
  }

  return root.children;
};

export default {
  safelyExtractZip,
};
