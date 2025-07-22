# Claude Code Transcript Processing Guide

## Overview

Claude Code stores conversation sessions as JSONL (JSON Lines) files. These files contain the complete transcript of interactions including messages, tool calls, responses, and usage metrics. This guide explains how to process and analyze these transcript files.

## File Locations

Claude Code stores session files in:
```
~/.claude/projects/{project-path-with-hyphens}/{sessionId}.jsonl
```

Where:
- `project-path-with-hyphens`: Your project path with slashes replaced by hyphens
  - Example: `/Users/alice/my-app` → `-Users-alice-my-app`
- `sessionId`: Unique identifier for each session

## JSONL File Structure

Each line in the JSONL file is a separate JSON object. Common object types include:

### 1. Session Summary (First Line)
```json
{
  "summary": "Session summary text",
  "sessionId": "unique-session-id",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. User Messages
```json
{
  "type": "user",
  "message": "User's message text",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. Assistant Messages
```json
{
  "type": "assistant",
  "message": "Assistant's response",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "usage": {
    "input_tokens": 1000,
    "output_tokens": 500,
    "cache_read_input_tokens": 200,
    "cache_write_input_tokens": 100
  }
}
```

### 4. Tool Results
```json
{
  "type": "tool_result",
  "tool": "bash",
  "result": "Command output...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 5. System Messages
```json
{
  "type": "system",
  "message": "System information",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Processing Techniques

### 1. Basic Reading and Parsing

```typescript
import { readFileSync } from 'fs';

function readTranscript(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (error) {
      console.warn('Failed to parse line:', line);
      return null;
    }
  }).filter(Boolean);
}
```

### 2. Extracting Messages

```typescript
function extractMessages(transcript: any[]) {
  return transcript.filter(entry => 
    entry.type === 'user' || 
    entry.type === 'assistant' || 
    entry.type === 'system'
  );
}
```

### 3. Token Usage Analysis

```typescript
function calculateTokenUsage(transcript: any[]) {
  const usage = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheWriteTokens: 0
  };

  transcript.forEach(entry => {
    if (entry.usage) {
      usage.totalInputTokens += entry.usage.input_tokens || 0;
      usage.totalOutputTokens += entry.usage.output_tokens || 0;
      usage.totalCacheReadTokens += entry.usage.cache_read_input_tokens || 0;
      usage.totalCacheWriteTokens += entry.usage.cache_write_input_tokens || 0;
    }
  });

  return usage;
}
```

### 4. Session Pruning

To reduce context usage while preserving recent conversation:

```typescript
function pruneSession(transcript: any[], keepLastN: number = 5) {
  // Always preserve the first line (session summary)
  const summary = transcript[0];
  
  // Find assistant messages
  const assistantIndices = [];
  transcript.forEach((entry, index) => {
    if (entry.type === 'assistant') {
      assistantIndices.push(index);
    }
  });
  
  // Find the Nth-to-last assistant message
  const cutoffIndex = assistantIndices.length > keepLastN 
    ? assistantIndices[assistantIndices.length - keepLastN]
    : 1;
  
  // Keep summary + everything from cutoff onwards
  return [summary, ...transcript.slice(cutoffIndex)];
}
```

### 5. Cost Calculation

```typescript
const PRICING = {
  'claude-3-opus': { input: 15, output: 75 }, // per 1M tokens
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 }
};

function calculateCost(usage: any, model: string) {
  const pricing = PRICING[model] || { input: 0, output: 0 };
  
  const inputCost = (usage.totalInputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.totalOutputTokens / 1_000_000) * pricing.output;
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost
  };
}
```

### 6. Daily Usage Aggregation

```typescript
function aggregateByDay(transcripts: any[]) {
  const dailyUsage = new Map();
  
  transcripts.forEach(entry => {
    if (entry.timestamp && entry.usage) {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      
      if (!dailyUsage.has(date)) {
        dailyUsage.set(date, {
          inputTokens: 0,
          outputTokens: 0,
          messages: 0
        });
      }
      
      const day = dailyUsage.get(date);
      day.inputTokens += entry.usage.input_tokens || 0;
      day.outputTokens += entry.usage.output_tokens || 0;
      day.messages += 1;
    }
  });
  
  return dailyUsage;
}
```

## Advanced Processing

### 1. Finding All Session Files

```typescript
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function findAllSessions(claudeDir: string = '~/.claude') {
  const projectsDir = join(claudeDir, 'projects');
  const sessions = [];
  
  // Iterate through all project directories
  const projects = readdirSync(projectsDir);
  
  projects.forEach(project => {
    const projectPath = join(projectsDir, project);
    if (statSync(projectPath).isDirectory()) {
      const files = readdirSync(projectPath);
      
      files.forEach(file => {
        if (file.endsWith('.jsonl')) {
          sessions.push({
            project,
            sessionId: file.replace('.jsonl', ''),
            path: join(projectPath, file)
          });
        }
      });
    }
  });
  
  return sessions;
}
```

### 2. Session Backup and Restore

```typescript
function backupSession(sessionPath: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${sessionPath}.${timestamp}`;
  
  const content = readFileSync(sessionPath);
  writeFileSync(backupPath, content);
  
  return backupPath;
}

function restoreSession(sessionPath: string, backupPath: string) {
  const backup = readFileSync(backupPath);
  writeFileSync(sessionPath, backup);
}
```

### 3. Cache Token Optimization

The "cache token hack" mentioned in cc-prune zeroes out the last non-zero cache read tokens to reduce the UI's context percentage display:

```typescript
function optimizeCacheTokens(transcript: any[]) {
  let lastCacheIndex = -1;
  
  // Find the last entry with cache tokens
  transcript.forEach((entry, index) => {
    if (entry.usage?.cache_read_input_tokens > 0) {
      lastCacheIndex = index;
    }
  });
  
  // Zero out the cache tokens for that entry
  if (lastCacheIndex >= 0) {
    transcript[lastCacheIndex].usage.cache_read_input_tokens = 0;
  }
  
  return transcript;
}
```

## Best Practices

1. **Always Backup**: Before modifying any session file, create a timestamped backup
2. **Validate JSON**: Use try-catch when parsing to handle malformed lines
3. **Preserve Structure**: Keep the session summary (first line) intact
4. **Test First**: Use dry-run modes when implementing pruning or modifications
5. **Handle Edge Cases**: Account for missing fields, empty files, and malformed data

## Common Use Cases

### 1. Reducing Context Usage
- Prune old messages while keeping recent context
- Zero out cache tokens to reduce UI percentage

### 2. Usage Analytics
- Track token usage over time
- Calculate costs per session or project
- Identify high-usage patterns

### 3. Session Management
- Backup important sessions
- Archive old sessions
- Merge or split sessions

### 4. Export and Conversion
- Convert to markdown for documentation
- Export to CSV for analysis
- Generate usage reports

## Example: Complete Processing Script

```typescript
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

class TranscriptProcessor {
  private claudeDir: string;
  
  constructor(claudeDir: string = '~/.claude') {
    this.claudeDir = claudeDir.replace('~', process.env.HOME || '');
  }
  
  loadSession(projectPath: string, sessionId: string) {
    const hyphenatedPath = projectPath.replace(/\//g, '-');
    const filePath = join(this.claudeDir, 'projects', hyphenatedPath, `${sessionId}.jsonl`);
    
    const content = readFileSync(filePath, 'utf-8');
    return content.trim().split('\n').map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }
  
  analyzeUsage(transcript: any[]) {
    const usage = {
      totalTokens: 0,
      totalCost: 0,
      messageCount: 0,
      toolCallCount: 0
    };
    
    transcript.forEach(entry => {
      if (entry.type === 'assistant' || entry.type === 'user') {
        usage.messageCount++;
      }
      
      if (entry.type === 'tool_result') {
        usage.toolCallCount++;
      }
      
      if (entry.usage) {
        const tokens = (entry.usage.input_tokens || 0) + (entry.usage.output_tokens || 0);
        usage.totalTokens += tokens;
        
        // Rough cost estimate (adjust based on model)
        usage.totalCost += (tokens / 1_000_000) * 10; // $10 per 1M tokens average
      }
    });
    
    return usage;
  }
  
  exportToMarkdown(transcript: any[]) {
    let markdown = '# Claude Code Session Transcript\n\n';
    
    transcript.forEach(entry => {
      if (entry.type === 'user') {
        markdown += `## User\n${entry.message}\n\n`;
      } else if (entry.type === 'assistant') {
        markdown += `## Assistant\n${entry.message}\n\n`;
        if (entry.usage) {
          markdown += `*Tokens: ${entry.usage.input_tokens} in, ${entry.usage.output_tokens} out*\n\n`;
        }
      } else if (entry.type === 'tool_result') {
        markdown += `### Tool Result (${entry.tool})\n\`\`\`\n${entry.result}\n\`\`\`\n\n`;
      }
    });
    
    return markdown;
  }
}

// Usage example
const processor = new TranscriptProcessor();
const transcript = processor.loadSession('/Users/alice/my-project', 'session-123');
const usage = processor.analyzeUsage(transcript);
const markdown = processor.exportToMarkdown(transcript);

console.log('Usage:', usage);
writeFileSync('session-export.md', markdown);
```

This guide provides a comprehensive overview of processing Claude Code transcripts, from basic reading to advanced analysis and manipulation.