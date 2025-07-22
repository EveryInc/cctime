# CLI Configuration Guide

## Command Line Options

```bash
cctime [options]
```

### Options

- `-f, --file <path>` - Path to claude transcript file
- `-d, --dir <path>` - Directory containing multiple transcript files
- `-o, --output <format>` - Output format: json, csv, or table (default: table)
- `-e, --export <path>` - Export results to file without interactive mode
- `--no-interactive` - Disable interactive mode
- `--config <path>` - Path to config file (default: ~/.cctime/config.json)
- `-h, --help` - Display help information
- `-V, --version` - Display version number

### Examples

```bash
# Analyze a single transcript file
cctime -f transcript.txt

# Analyze all files in a directory
cctime -d ./transcripts

# Export results as JSON without interactive mode
cctime -f transcript.txt -o json -e results.json --no-interactive

# Use custom config file
cctime --config ./my-config.json -f transcript.txt
```

## Configuration File

The configuration file is located at `~/.cctime/config.json` by default.

### Configuration Options

```json
{
  "defaultOutputFormat": "table",      // Default output format: "json", "csv", or "table"
  "defaultExportPath": "./cctime-export", // Default export directory
  "theme": {
    "primaryColor": "cyan",            // Primary color for UI
    "accentColor": "yellow",           // Accent color for highlights
    "chartStyle": "line"               // Chart style: "line" or "bar"
  },
  "analysis": {
    "includeSystemMessages": false,    // Include system messages in analysis
    "groupBySession": true,            // Group results by session
    "timeFormat": "24h"                // Time format: "12h" or "24h"
  },
  "export": {
    "includeMetadata": true,           // Include metadata in exports
    "prettyPrint": true                // Pretty print JSON exports
  }
}
```

## Environment Variables

cctime supports configuration through environment variables:

- `CCTIME_OUTPUT_FORMAT` - Default output format
- `CCTIME_EXPORT_PATH` - Default export path
- `CCTIME_THEME_PRIMARY` - Primary theme color
- `CCTIME_THEME_ACCENT` - Accent theme color
- `CCTIME_TIME_FORMAT` - Time display format

Environment variables take precedence over config file settings.

### Example

```bash
export CCTIME_OUTPUT_FORMAT=json
export CCTIME_TIME_FORMAT=12h
cctime -f transcript.txt
```

## Config File Management

The ConfigManager class provides methods to:

- Load configuration from file
- Merge environment variables
- Validate configuration
- Save configuration changes
- Access individual config values

```typescript
// Example usage in code
const config = await loadConfig();
const configManager = new ConfigManager(config);

// Get config value
const format = configManager.get('defaultOutputFormat');

// Update config value
configManager.set('defaultOutputFormat', 'json');

// Save changes
await configManager.save();
```