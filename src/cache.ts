import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { ProcessedData, SessionFile } from './types.js';

interface CacheEntry {
  data: ProcessedData;
  timestamp: number;
  fileHashes: Map<string, string>;
}

/**
 * Cache Manager - Handles caching of processed session data
 */
export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheDir: string;
  private readonly ttl: number;
  private readonly useFileCache: boolean;

  constructor(options: {
    cacheDir?: string;
    ttl?: number;
    useFileCache?: boolean;
  } = {}) {
    this.cacheDir = options.cacheDir || path.join(os.tmpdir(), 'cctime-cache');
    this.ttl = options.ttl || 3600000; // 1 hour default
    this.useFileCache = options.useFileCache ?? true;
  }

  /**
   * Initialize cache directory
   */
  private async ensureCacheDir(): Promise<void> {
    if (this.useFileCache) {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate a cache key from session files
   */
  private generateCacheKey(sessionFiles: SessionFile[]): string {
    const sortedPaths = sessionFiles
      .map(f => f.filePath)
      .sort()
      .join(':');
    return crypto.createHash('md5').update(sortedPaths).digest('hex');
  }

  /**
   * Calculate file hash for change detection
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Check if cached data is still valid
   */
  private async isValidCache(entry: CacheEntry, sessionFiles: SessionFile[]): Promise<boolean> {
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      return false;
    }

    // Check if any files have changed
    for (const file of sessionFiles) {
      const currentHash = await this.calculateFileHash(file.filePath);
      const cachedHash = entry.fileHashes.get(file.filePath);
      
      if (!cachedHash || cachedHash !== currentHash) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get cached data if available and valid
   */
  async get(sessionFiles: SessionFile[]): Promise<ProcessedData | null> {
    const cacheKey = this.generateCacheKey(sessionFiles);

    // Check in-memory cache first
    const memoryEntry = this.cache.get(cacheKey);
    if (memoryEntry && await this.isValidCache(memoryEntry, sessionFiles)) {
      return memoryEntry.data;
    }

    // Check file cache if enabled
    if (this.useFileCache) {
      try {
        await this.ensureCacheDir();
        const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
        const cacheContent = await fs.readFile(cachePath, 'utf-8');
        const fileEntry = JSON.parse(cacheContent);
        
        // Reconstruct the entry with proper types
        const entry: CacheEntry = {
          data: this.deserializeProcessedData(fileEntry.data),
          timestamp: fileEntry.timestamp,
          fileHashes: new Map(fileEntry.fileHashes)
        };

        if (await this.isValidCache(entry, sessionFiles)) {
          // Update in-memory cache
          this.cache.set(cacheKey, entry);
          return entry.data;
        }
      } catch {
        // Cache file doesn't exist or is corrupted
      }
    }

    return null;
  }

  /**
   * Store processed data in cache
   */
  async set(sessionFiles: SessionFile[], data: ProcessedData): Promise<void> {
    const cacheKey = this.generateCacheKey(sessionFiles);
    
    // Calculate file hashes
    const fileHashes = new Map<string, string>();
    for (const file of sessionFiles) {
      const hash = await this.calculateFileHash(file.filePath);
      fileHashes.set(file.filePath, hash);
    }

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      fileHashes
    };

    // Store in memory
    this.cache.set(cacheKey, entry);

    // Store on disk if enabled
    if (this.useFileCache) {
      try {
        await this.ensureCacheDir();
        const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
        const serialized = {
          data: this.serializeProcessedData(data),
          timestamp: entry.timestamp,
          fileHashes: Array.from(entry.fileHashes.entries())
        };
        await fs.writeFile(cachePath, JSON.stringify(serialized));
      } catch (error) {
        // Log error but don't fail - cache is optional
        console.error('Failed to write cache file:', error);
      }
    }
  }

  /**
   * Invalidate cache for specific session files
   */
  async invalidate(sessionFiles?: SessionFile[]): Promise<void> {
    if (!sessionFiles) {
      // Clear all cache
      this.cache.clear();
      if (this.useFileCache) {
        try {
          await this.ensureCacheDir();
          const files = await fs.readdir(this.cacheDir);
          await Promise.all(
            files.map(f => fs.unlink(path.join(this.cacheDir, f)))
          );
        } catch {
          // Ignore errors during cleanup
        }
      }
    } else {
      // Invalidate specific cache entry
      const cacheKey = this.generateCacheKey(sessionFiles);
      this.cache.delete(cacheKey);
      
      if (this.useFileCache) {
        try {
          const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
          await fs.unlink(cachePath);
        } catch {
          // File might not exist
        }
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<void> {
    // Clean memory cache
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }

    // Clean file cache
    if (this.useFileCache) {
      try {
        await this.ensureCacheDir();
        const files = await fs.readdir(this.cacheDir);
        
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          
          const filePath = path.join(this.cacheDir, file);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const entry = JSON.parse(content);
            
            if (now - entry.timestamp > this.ttl) {
              await fs.unlink(filePath);
            }
          } catch {
            // Remove corrupted cache files
            await fs.unlink(filePath);
          }
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Serialize ProcessedData for storage
   */
  private serializeProcessedData(data: ProcessedData): any {
    return {
      daily: Array.from(data.daily.entries()).map(([key, value]) => ({
        key,
        value: {
          ...value,
          sessions: Array.from(value.sessions)
        }
      })),
      sessions: Array.from(data.sessions.entries()),
      summary: data.summary
    };
  }

  /**
   * Deserialize ProcessedData from storage
   */
  private deserializeProcessedData(serialized: any): ProcessedData {
    const daily = new Map<string, any>();
    for (const entry of serialized.daily) {
      daily.set(entry.key, {
        ...entry.value,
        sessions: new Set(entry.value.sessions)
      });
    }

    return {
      daily,
      sessions: new Map(serialized.sessions),
      summary: serialized.summary
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryEntries: number;
    totalSize: number;
  } {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      // Rough estimation of memory usage
      totalSize += JSON.stringify(entry).length;
    }

    return {
      memoryEntries: this.cache.size,
      totalSize
    };
  }
}

// Default export with sensible defaults
export default new CacheManager();