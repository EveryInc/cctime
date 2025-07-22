# cctime - Claude Code Response Time Analyzer

Analyze response times from Claude Code sessions to understand performance patterns and optimize your AI-assisted development workflow.

## Features

- 📊 **Daily Response Time Analytics**: Track how long Claude takes to respond to your messages
- 📈 **Trend Visualization**: ASCII charts showing response time trends over time
- 🗂️ **Session Analysis**: Break down response times by individual sessions
- 📊 **Statistical Insights**: Percentiles (P50, P90, P99), averages, and totals
- 💾 **Multiple Export Formats**: JSON, CSV, and Markdown reports
- 🎨 **Interactive Terminal UI**: Built with Ink (React for CLIs)
- ⚡ **Real-time Updates**: Watch mode for monitoring active sessions

## Installation

```bash
# Clone the repository
git clone https://github.com/EveryInc/cctime.git
cd cctime

# Install dependencies with Bun
bun install

# Run the CLI
bun run src/cli.tsx
```

## Usage

### Interactive Mode (default)
```bash
# Launch interactive dashboard
bun run src/cli.tsx

# Navigate with keyboard:
# - ↑/↓: Navigate table rows
# - Tab: Switch between table and chart
# - Enter: View details for selected date
# - s: Cycle sort options
# - e: Export data
# - q: Quit
```

### Command Line Options
```bash
# Analyze specific date range
bun run src/cli.tsx --from 2024-01-01 --to 2024-01-31

# Export directly without interactive mode
bun run src/cli.tsx --no-interactive --export report.json --export-format json

# Export as CSV
bun run src/cli.tsx --no-interactive --export report.csv --export-format csv

# Export as Markdown report
bun run src/cli.tsx --no-interactive --export report.md --export-format markdown
```

## How It Works

cctime analyzes the JSONL transcript files that Claude Code stores locally:
- Location: `~/.claude/projects/{project-path}/{sessionId}.jsonl`
- Calculates time between user messages and Claude's responses
- Aggregates data by day, session, and overall statistics
- Provides insights into Claude's response patterns

## Export Formats

### JSON Export
Complete data structure with all metrics, suitable for further analysis.

### CSV Export
Tabular format with daily breakdowns, perfect for spreadsheet analysis.

### Markdown Export
Human-readable report with tables and statistics, great for documentation.

## Architecture

Built using a parallel development approach with 5 independent streams:

1. **Data Processing**: JSONL parsing and response time calculation
2. **File System**: Session discovery and caching
3. **UI Components**: Ink-based terminal UI components
4. **State Management**: React-style state handling
5. **CLI & Config**: Command-line interface and configuration

## Core Modules

- `src/parser/`: JSONL file parsing
- `src/calculator.ts`: Response time calculations
- `src/aggregator.ts`: Data aggregation and statistics
- `src/finder.ts`: Claude session file discovery
- `src/components/`: Ink UI components
- `src/export/`: Export functionality

## Development

```bash
# Run tests
bun test

# Run demo with sample data
bun run demo.ts

# Test core functionality
bun run test-minimal.ts
```

## Configuration

Create `~/.cctime/config.json`:
```json
{
  "theme": {
    "primaryColor": "cyan",
    "successColor": "green",
    "errorColor": "red"
  },
  "analysis": {
    "outlierThresholdMs": 300000,
    "defaultDateRangeDays": 30
  },
  "export": {
    "defaultPath": "./exports",
    "includeDetailedStats": true
  }
}
```

## License

MIT