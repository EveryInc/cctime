import { SessionFile } from './types.js';

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  longestStreakStart?: Date;
  longestStreakEnd?: Date;
  totalDaysUsed: number;
}

export function calculateStreaks(sessions: SessionFile[]): StreakInfo {
  if (sessions.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDaysUsed: 0
    };
  }

  // Get unique days when Claude was used
  const daysUsed = new Set<string>();
  const sessionDates: Date[] = [];
  
  for (const session of sessions) {
    const dateKey = session.lastModified.toISOString().split('T')[0];
    daysUsed.add(dateKey);
    sessionDates.push(session.lastModified);
  }

  // Sort dates
  const sortedDays = Array.from(daysUsed).sort();
  const sortedDates = sortedDays.map(d => new Date(d));

  let currentStreak = 0;
  let longestStreak = 0;
  let longestStreakStart: Date | undefined;
  let longestStreakEnd: Date | undefined;
  let tempStreakStart: Date | undefined;
  let tempStreak = 0;

  // Check if today is in the list for current streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toISOString().split('T')[0];
  const hasToday = daysUsed.has(todayKey);

  // Calculate streaks
  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = sortedDates[i];
    
    if (i === 0) {
      tempStreak = 1;
      tempStreakStart = currentDate;
    } else {
      const prevDate = sortedDates[i - 1];
      const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Consecutive day
        tempStreak++;
      } else {
        // Gap in days - check if this streak is the longest
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
          longestStreakStart = tempStreakStart;
          longestStreakEnd = prevDate;
        }
        // Start new streak
        tempStreak = 1;
        tempStreakStart = currentDate;
      }
    }
  }

  // Check final streak
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
    longestStreakStart = tempStreakStart;
    longestStreakEnd = sortedDates[sortedDates.length - 1];
  }

  // Calculate current streak
  if (hasToday || (sortedDates.length > 0 && isYesterday(sortedDates[sortedDates.length - 1]))) {
    // Count backwards from today/yesterday to find current streak
    currentStreak = 1;
    let checkDate = new Date(sortedDates[sortedDates.length - 1]);
    
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const daysDiff = Math.floor((checkDate.getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        currentStreak++;
        checkDate = sortedDates[i];
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    longestStreak,
    longestStreakStart,
    longestStreakEnd,
    totalDaysUsed: daysUsed.size
  };
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate.getTime() === yesterday.getTime();
}

export function formatStreakMessage(streakInfo: StreakInfo): string {
  if (streakInfo.longestStreak === 0) {
    return 'No usage streak found';
  }

  const messages: string[] = [];

  // Format longest streak
  const longestStreakText = streakInfo.longestStreak === 1 
    ? '1 day' 
    : `${streakInfo.longestStreak} days`;

  if (streakInfo.longestStreakStart && streakInfo.longestStreakEnd) {
    const start = streakInfo.longestStreakStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = streakInfo.longestStreakEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (start === end) {
      messages.push(`🔥 Longest streak: ${longestStreakText} (${start})`);
    } else {
      messages.push(`🔥 Longest streak: ${longestStreakText} (${start} - ${end})`);
    }
  } else {
    messages.push(`🔥 Longest streak: ${longestStreakText}`);
  }

  // Add current streak if it's active and different from longest
  if (streakInfo.currentStreak > 0 && streakInfo.currentStreak !== streakInfo.longestStreak) {
    const currentStreakText = streakInfo.currentStreak === 1 
      ? '1 day' 
      : `${streakInfo.currentStreak} days`;
    messages.push(`📈 Current streak: ${currentStreakText}`);
  }

  return messages.join('\n');
}