import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { SessionFile, FindOptions } from './types.js';

/**
 * Session Finder - Scans ~/.claude/projects directory for session files
 */
export class SessionFinder {
  private readonly projectsDir: string;

  constructor(projectsDir?: string) {
    this.projectsDir = projectsDir || path.join(os.homedir(), '.claude', 'projects');
    
    if (global.DEBUG_MODE) {
      console.log(`🔍 SessionFinder initialized with projects directory: ${this.projectsDir}`);
    }
  }

  /**
   * Convert project path to hyphenated format used in Claude's directory structure
   */
  private pathToHyphenated(projectPath: string): string {
    // Replace path separators with hyphens and remove special characters
    return projectPath
      .replace(/^\//, '') // Remove leading slash
      .replace(/\//g, '-') // Replace slashes with hyphens
      .replace(/[^a-zA-Z0-9-]/g, '-') // Replace special chars with hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .toLowerCase();
  }

  /**
   * Check if a file falls within the date range
   */
  private isWithinDateRange(file: SessionFile, options: FindOptions): boolean {
    if (!options.from && !options.to) return true;
    
    const fileDate = file.lastModified;
    
    if (options.from && fileDate < options.from) return false;
    if (options.to && fileDate > options.to) return false;
    
    return true;
  }

  /**
   * Parse session ID from filename
   */
  private parseSessionId(filename: string): string | null {
    // Session files are named like: session_abcd1234.jsonl
    const match = filename.match(/^session_([a-zA-Z0-9]+)\.jsonl$/);
    return match ? match[1] : null;
  }

  /**
   * Find all session files matching the given criteria
   */
  async find(options: FindOptions = {}): Promise<SessionFile[]> {
    const sessionFiles: SessionFile[] = [];

    if (global.DEBUG_MODE) {
      console.log(`📂 Scanning for transcript files in: ${this.projectsDir}`);
    }

    try {
      // Check if projects directory exists
      await fs.access(this.projectsDir);
      if (global.DEBUG_MODE) {
        console.log('✅ Projects directory exists and is accessible');
      }
    } catch (error) {
      // Projects directory doesn't exist yet
      if (global.DEBUG_MODE) {
        console.log('❌ Projects directory does not exist or is not accessible');
        console.log(`   Error: ${error.message}`);
      }
      return sessionFiles;
    }

    // Get all project directories
    const projectDirs = await fs.readdir(this.projectsDir);

    if (global.DEBUG_MODE) {
      console.log(`📁 Found ${projectDirs.length} items in projects directory: [${projectDirs.join(', ')}]`);
    }

    for (const projectDir of projectDirs) {
      const projectDirPath = path.join(this.projectsDir, projectDir);
      
      // Skip if not a directory
      const stat = await fs.stat(projectDirPath);
      if (!stat.isDirectory()) continue;

      // Reconstruct original project path from hyphenated format
      // This is a simplified reverse mapping - may need adjustment based on actual Claude behavior
      const projectPath = '/' + projectDir.replace(/-/g, '/');

      // Skip if filtering by project and this doesn't match
      if (options.projectPath && !projectPath.includes(options.projectPath)) {
        continue;
      }

      // Get all .jsonl files in this project directory
      const files = await fs.readdir(projectDirPath);
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

      if (global.DEBUG_MODE) {
        console.log(`  📁 Project: ${projectPath} (${projectDir})`);
        console.log(`     Found ${jsonlFiles.length} .jsonl files: [${jsonlFiles.join(', ')}]`);
      }

      for (const file of jsonlFiles) {
        const filePath = path.join(projectDirPath, file);
        const fileStat = await fs.stat(filePath);
        
        const sessionId = this.parseSessionId(file);
        if (!sessionId) {
          // For now, use the filename without extension as session ID
          const fallbackId = file.replace('.jsonl', '');
          const sessionFile: SessionFile = {
            sessionId: fallbackId,
            projectPath,
            filePath,
            lastModified: fileStat.mtime,
            size: fileStat.size,
          };
          
          if (this.isWithinDateRange(sessionFile, options)) {
            sessionFiles.push(sessionFile);
          }
          continue;
        }

        const sessionFile: SessionFile = {
          sessionId,
          projectPath,
          filePath,
          lastModified: fileStat.mtime,
          size: fileStat.size
        };

        // Check date range
        if (this.isWithinDateRange(sessionFile, options)) {
          sessionFiles.push(sessionFile);
        }
      }
    }

    if (global.DEBUG_MODE) {
      console.log(`🎯 Total found: ${sessionFiles.length} session files`);
      if (sessionFiles.length > 0) {
        console.log(`   Most recent: ${sessionFiles[0]?.sessionId} (${sessionFiles[0]?.lastModified.toISOString()})`);
      }
    }

    // Sort by last modified date (newest first)
    return sessionFiles.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  /**
   * Find a specific session file by ID
   */
  async findById(sessionId: string): Promise<SessionFile | null> {
    const allSessions = await this.find();
    return allSessions.find(s => s.sessionId === sessionId) || null;
  }

  /**
   * Get all unique project paths
   */
  async getProjects(): Promise<string[]> {
    const sessions = await this.find();
    const projects = new Set(sessions.map(s => s.projectPath));
    return Array.from(projects).sort();
  }
}

// Default export for convenience
export default new SessionFinder();