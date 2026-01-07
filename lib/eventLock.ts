import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Check if an event should be locked based on its event date
 * Events are locked when the current Eastern Time >= event date/time
 * Both dates are compared in Eastern Time
 */
export function shouldEventBeLocked(eventDate: Date): boolean {
  if (!eventDate || !(eventDate instanceof Date)) {
    return false;
  }
  
  const now = new Date();
  
  // Get current time components in Eastern Time
  const nowETParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);
  
  // Get event date components in Eastern Time
  const eventETParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(eventDate);
  
  // Helper to get part value
  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) => 
    parseInt(parts.find(p => p.type === type)?.value || '0');
  
  // Compare year, month, day, hour, minute
  const nowYear = getPart(nowETParts, 'year');
  const nowMonth = getPart(nowETParts, 'month');
  const nowDay = getPart(nowETParts, 'day');
  const nowHour = getPart(nowETParts, 'hour');
  const nowMinute = getPart(nowETParts, 'minute');
  
  const eventYear = getPart(eventETParts, 'year');
  const eventMonth = getPart(eventETParts, 'month');
  const eventDay = getPart(eventETParts, 'day');
  const eventHour = getPart(eventETParts, 'hour');
  const eventMinute = getPart(eventETParts, 'minute');
  
  // Compare chronologically
  if (nowYear !== eventYear) return nowYear > eventYear;
  if (nowMonth !== eventMonth) return nowMonth > eventMonth;
  if (nowDay !== eventDay) return nowDay > eventDay;
  if (nowHour !== eventHour) return nowHour > eventHour;
  return nowMinute >= eventMinute;
}

/**
 * Auto-lock an event if it's time has passed
 * Returns true if the event was locked, false otherwise
 */
export async function autoLockEventIfNeeded(eventId: string, eventDate: Date, currentLockStatus: boolean): Promise<boolean> {
  if (currentLockStatus) {
    // Already locked, no need to check
    return false;
  }
  
  if (shouldEventBeLocked(eventDate)) {
    try {
      await updateDoc(doc(db, 'events', eventId), {
        isLocked: true
      });
      const nowET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
      console.log(`Event ${eventId} automatically locked at ${nowET} Eastern Time`);
      return true;
    } catch (error) {
      console.error(`Error auto-locking event ${eventId}:`, error);
      return false;
    }
  }
  
  return false;
}

