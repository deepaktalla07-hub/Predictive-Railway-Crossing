/**
 * Time manipulation and temporal window overlap algorithms.
 */

export interface TimeInterval {
  start: Date;
  end: Date;
}

/**
 * Calculates overlap duration between two time windows in seconds.
 * Overlap = max(0, min(endA, endB) - max(startA, startB))
 */
export function calculateTimeOverlapSeconds(
  intervalA: { start: Date; end: Date },
  intervalB: { start: Date; end: Date }
): number {
  const overlapStart = Math.max(intervalA.start.getTime(), intervalB.start.getTime());
  const overlapEnd = Math.min(intervalA.end.getTime(), intervalB.end.getTime());

  if (overlapEnd <= overlapStart) {
    return 0;
  }

  return Math.floor((overlapEnd - overlapStart) / 1000);
}

/**
 * Converts HH:mm or HH:mm:ss string to a Date on a given base date.
 */
export function parseTimeToDate(timeString: string, baseDate: Date = new Date()): Date {
  const parts = timeString.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
  return result;
}

/**
 * Formats a Date object to ISO-8601 string safely.
 */
export function toIsoStringSafe(date: Date | string | number): string {
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }
  if (typeof date === 'number') {
    return new Date(date).toISOString();
  }
  return date.toISOString();
}

/**
 * Adds seconds to a base Date.
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}
