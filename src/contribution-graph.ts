import chalk from 'chalk';
import { SessionFile } from './types.js';

interface DayData {
  date: Date;
  count: number;
  level: number; // 0-4 for intensity
}

export function generateContributionGraph(sessions: SessionFile[]): string {
  if (sessions.length === 0) return '';

  // Find date range
  const dates = sessions.map(s => s.lastModified);
  const oldestDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const today = new Date();
  
  // Reset to start of day
  oldestDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Count sessions by day
  const sessionsByDay = new Map<string, number>();
  for (const session of sessions) {
    const dateKey = session.lastModified.toISOString().split('T')[0];
    sessionsByDay.set(dateKey, (sessionsByDay.get(dateKey) || 0) + 1);
  }

  // Calculate max sessions for scaling
  const maxSessions = Math.max(...Array.from(sessionsByDay.values()));

  // Generate grid data
  const grid: DayData[][] = [];
  
  // Limit to last 52 weeks (1 year) or since oldest date, whichever is more recent
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const startDate = oldestDate > oneYearAgo ? oldestDate : oneYearAgo;
  const currentDate = new Date(startDate);
  
  // Start from the Sunday before the start date
  const startDay = currentDate.getDay();
  currentDate.setDate(currentDate.getDate() - startDay);

  let week: DayData[] = [];
  
  while (currentDate <= today) {
    const dateKey = currentDate.toISOString().split('T')[0];
    const count = sessionsByDay.get(dateKey) || 0;
    
    // Calculate level (0-4)
    let level = 0;
    if (count > 0) {
      if (maxSessions <= 4) {
        level = count;
      } else {
        level = Math.ceil((count / maxSessions) * 4);
      }
      level = Math.min(level, 4);
    }

    week.push({
      date: new Date(currentDate),
      count,
      level
    });

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);

    // Start new week on Sunday
    if (currentDate.getDay() === 0 && week.length > 0) {
      grid.push(week);
      week = [];
    }
  }

  // Add remaining days
  if (week.length > 0) {
    grid.push(week);
  }

  // Render the graph
  return renderGraph(grid, startDate, today, sessions.length);
}

function renderGraph(grid: DayData[][], startDate: Date, endDate: Date, totalSessions: number): string {
  const lines: string[] = [];
  
  // Define colors for different levels
  const colors = [
    chalk.gray('▪'), // 0 - no activity
    chalk.hex('#9be9a8')('▪'), // 1 - light green
    chalk.hex('#40c463')('▪'), // 2 - medium green
    chalk.hex('#30a14e')('▪'), // 3 - dark green
    chalk.hex('#216e39')('▪'), // 4 - darkest green
  ];

  // Month labels
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabels: string[] = [];
  let lastMonth = -1;
  
  // Build month label row - ensure we have enough spacing
  for (let col = 0; col < grid.length; col++) {
    if (grid[col] && grid[col].length > 0) {
      const month = grid[col][0].date.getMonth();
      if (month !== lastMonth && col % 4 === 0) { // Show month every 4 weeks
        while (monthLabels.length < col) {
          monthLabels.push('  ');
        }
        monthLabels.push(months[month].padEnd(3));
        lastMonth = month;
      }
    }
  }

  // Pad to full width and add month labels if we have enough weeks
  if (grid.length > 4) {
    lines.push('    ' + monthLabels.join(' '));
  }

  // Render each day row (no day labels)
  for (let row = 0; row < 7; row++) {
    let line = '    '; // Just indentation, no day labels
    
    for (let col = 0; col < grid.length; col++) {
      if (grid[col] && grid[col][row]) {
        const day = grid[col][row];
        line += colors[day.level] + ' ';
      } else {
        line += '  ';
      }
    }
    
    lines.push(line);
  }

  // Add legend with spacing
  lines.push('');
  lines.push('    ' + chalk.gray('Less ') + colors[0] + colors[1] + colors[2] + colors[3] + colors[4] + chalk.gray(' More'));
  
  // Add date range info
  const formatDate = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };
  
  const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  lines.push('');
  lines.push(chalk.gray(`    ${totalSessions} sessions since ${formatDate(startDate)}`));

  return lines.join('\n');
}