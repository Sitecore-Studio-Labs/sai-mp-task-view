import { differenceInHours, differenceInMinutes, format } from "date-fns";

export function formatCommentDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const mins = differenceInMinutes(now, date);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = differenceInHours(now, date);
  if (hrs < 24) return `${hrs} hours ago`;
  return format(date, "MMM d, yyyy h:mm a");
}
