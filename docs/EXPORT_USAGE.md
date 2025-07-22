# Export Functionality Guide

The cctime tool provides comprehensive export functionality for analyzing Claude Code transcript response times. Data can be exported in multiple formats with various options.

## Export Formats

### JSON Export
- **Format**: Pretty-printed JSON with proper indentation
- **Content**: Complete data structure including daily metrics, session details, and summary statistics
- **Use Case**: Integration with other tools, data analysis, archiving

### CSV Export
- **Format**: Comma-separated values with headers
- **Content**: Daily metrics table with summary statistics
- **Use Case**: Spreadsheet analysis, graphing, reporting

### Markdown Export
- **Format**: Human-readable markdown with tables
- **Content**: Formatted report with summary, daily metrics, and top sessions
- **Use Case**: Documentation, reports, sharing results

## Interactive Mode

When running `cctime` in interactive mode, press `e` to enter the export dialog:

```bash
# Run interactive mode
cctime

# Press 'e' to open export dialog
# Follow the prompts to:
# 1. Select export format
# 2. Choose export options
# 3. Specify output path (optional)
```

### Export Options

- **Include detailed statistics**: Adds session-level details to the export
- **Copy to clipboard**: Prepares data for clipboard (requires system integration)
- **Custom output path**: Specify where to save the exported file

## Non-Interactive Mode

Export directly from the command line without entering interactive mode:

```bash
# Export to JSON (default)
cctime --export output.json --no-interactive

# Export to CSV
cctime --export report.csv --export-format csv --no-interactive

# Export to Markdown
cctime --export analysis.md --export-format markdown --no-interactive

# Export from specific directory
cctime -d /path/to/transcripts --export summary.json --no-interactive
```

## Export Content

### Summary Statistics
All exports include:
- Total response time across all sessions
- Total number of responses
- Average response time
- Number of unique sessions
- Date range of the data

### Daily Metrics
- Date
- Total response time for the day
- Average response time
- Number of responses
- Number of active sessions
- Percentiles (P50, P90, P99)

### Session Details (when enabled)
- Session ID
- Project path
- Number of responses
- Total and average response times
- First and last message timestamps

## File Naming

If no output path is specified, files are saved with timestamps:
- Pattern: `cctime-export-YYYY-MM-DD-HH-mm-ss.{ext}`
- Location: Current working directory

## Examples

### Basic JSON Export
```bash
cctime --export metrics.json --no-interactive
```

### Detailed CSV Report
```bash
cctime -d ~/claude-transcripts --export report.csv --export-format csv --no-interactive
```

### Markdown Summary for Documentation
```bash
cctime --export README-metrics.md --export-format markdown --no-interactive
```

### Interactive Export with Custom Path
```bash
cctime
# Press 'e'
# Select format
# Enable "Custom output path"
# Enter: /Users/me/reports/claude-metrics.json
```

## Error Handling

The export functionality includes robust error handling:
- Creates directories if they don't exist
- Validates data before export
- Provides clear error messages
- Handles file system permissions gracefully

## Integration Tips

1. **Automated Reports**: Use cron to generate daily/weekly reports
   ```bash
   0 9 * * 1 cctime --export weekly-report.md --export-format markdown --no-interactive
   ```

2. **Data Pipeline**: Export JSON for processing with other tools
   ```bash
   cctime --export - --no-interactive | jq '.summary'
   ```

3. **Version Control**: Track metrics over time
   ```bash
   cctime --export metrics/$(date +%Y-%m-%d).json --no-interactive
   git add metrics/
   git commit -m "Daily metrics update"
   ```