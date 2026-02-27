import { format, differenceInMinutes, differenceInHours } from 'date-fns';

// Format a date string to display relative times:
// Just now - for under one minute
// X minutes ago / X hours ago - for under 24h
// Full date/time for older entries
export function formatCommentDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const mins = differenceInMinutes(now, date);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = differenceInHours(now, date);
  if (hrs < 24) return `${hrs} hours ago`;
  return format(date, 'MMM d, yyyy h:mm a');
}
