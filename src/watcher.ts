import { watch, FSWatcher } from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';
import { SessionFile, WatchCallback, Watcher } from './types.js';
import { SessionFinder } from './finder.js';

interface WatcherOptions {
  projectsDir?: string;
  debounceMs?: number;
  pollInterval?: number;
}

/**
 * File Watcher - Monitors for new/updated Claude session files
 */
export class SessionWatcher extends EventEmitter implements Watcher {
  private readonly projectsDir: string;
  private readonly finder: SessionFinder;
  private readonly debounceMs: number;
  private readonly pollInterval: number;
  private watcher?: FSWatcher;
  private pollTimer?: NodeJS.Timeout;
  private knownFiles: Map<string, SessionFile> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: Set<WatchCallback> = new Set();

  constructor(options: WatcherOptions = {}) {
    super();
    this.projectsDir = options.projectsDir || path.join(os.homedir(), '.claude', 'projects');
    this.debounceMs = options.debounceMs || 500;
    this.pollInterval = options.pollInterval || 5000;
    this.finder = new SessionFinder(this.projectsDir);
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    // Initial scan
    await this.scanFiles();

    // Start file system watcher
    try {
      this.watcher = watch(this.projectsDir, { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.jsonl')) {
          this.handleFileChange(path.join(this.projectsDir, filename));
        }
      });
    } catch (error) {
      console.warn('File system watching not available, falling back to polling:', error);
    }

    // Start polling as a fallback or supplement
    this.pollTimer = setInterval(() => {
      this.scanFiles().catch(error => {
        this.emit('error', error);
      });
    }, this.pollInterval);
  }

  /**
   * Stop watching for file changes
   */
  close(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.callbacks.clear();
    this.knownFiles.clear();
    this.removeAllListeners();
  }

  /**
   * Add a callback for file changes
   */
  onFileChange(callback: WatchCallback): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Handle a file change event with debouncing
   */
  private handleFileChange(filePath: string): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(filePath);
      
      try {
        // Check if file was added, modified, or deleted
        const sessions = await this.finder.find();
        const session = sessions.find(s => s.filePath === filePath);
        
        const knownFile = this.knownFiles.get(filePath);
        
        if (session && !knownFile) {
          // File added
          this.knownFiles.set(filePath, session);
          this.notifyCallbacks('added', session);
        } else if (session && knownFile) {
          // File modified (check if actually changed)
          if (session.lastModified.getTime() !== knownFile.lastModified.getTime() ||
              session.size !== knownFile.size) {
            this.knownFiles.set(filePath, session);
            this.notifyCallbacks('modified', session);
          }
        } else if (!session && knownFile) {
          // File deleted
          this.knownFiles.delete(filePath);
          this.notifyCallbacks('deleted', knownFile);
        }
      } catch (error) {
        this.emit('error', error);
      }
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Scan all files and detect changes
   */
  private async scanFiles(): Promise<void> {
    try {
      const sessions = await this.finder.find();
      const currentFiles = new Map<string, SessionFile>();
      
      // Check for new or modified files
      for (const session of sessions) {
        currentFiles.set(session.filePath, session);
        
        const knownFile = this.knownFiles.get(session.filePath);
        if (!knownFile) {
          // New file
          this.knownFiles.set(session.filePath, session);
          this.notifyCallbacks('added', session);
        } else if (
          session.lastModified.getTime() !== knownFile.lastModified.getTime() ||
          session.size !== knownFile.size
        ) {
          // Modified file
          this.knownFiles.set(session.filePath, session);
          this.notifyCallbacks('modified', session);
        }
      }
      
      // Check for deleted files
      for (const [filePath, knownFile] of this.knownFiles.entries()) {
        if (!currentFiles.has(filePath)) {
          this.knownFiles.delete(filePath);
          this.notifyCallbacks('deleted', knownFile);
        }
      }
    } catch (error) {
      // Don't throw if projects directory doesn't exist yet
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Notify all callbacks of a file change
   */
  private notifyCallbacks(event: 'added' | 'modified' | 'deleted', file: SessionFile): void {
    // Emit event
    this.emit(event, file);
    
    // Call registered callbacks
    for (const callback of this.callbacks) {
      try {
        callback(event, file);
      } catch (error) {
        this.emit('error', error);
      }
    }
  }

  /**
   * Get current known files
   */
  getKnownFiles(): SessionFile[] {
    return Array.from(this.knownFiles.values());
  }

  /**
   * Force a rescan of all files
   */
  async rescan(): Promise<void> {
    await this.scanFiles();
  }
}

/**
 * Create a simple watcher instance
 */
export function createWatcher(callback: WatchCallback, options?: WatcherOptions): Watcher {
  const watcher = new SessionWatcher(options);
  watcher.onFileChange(callback);
  watcher.start().catch(error => {
    console.error('Failed to start watcher:', error);
  });
  return watcher;
}

// Default export
export default SessionWatcher;