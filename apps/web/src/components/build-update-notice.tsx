"use client";

const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE;
const DISPLAY_DAYS = 90;

function getRelativeLabel(buildDate: Date): string {
  const diffMs = Date.now() - buildDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "updated today";
  if (diffDays === 1) return "updated yesterday";
  if (diffDays < 7) return `updated ${diffDays} days ago`;
  if (diffDays < 14) return "updated last week";
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `updated ${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `updated ${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
}

export function BuildUpdateNotice() {
  if (!BUILD_DATE) return null;

  const buildDate = new Date(BUILD_DATE);
  if (isNaN(buildDate.getTime())) return null;

  const ageMs = Date.now() - buildDate.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays > DISPLAY_DAYS) return null;

  return (
    <span className="text-xs theme-text-muted" title={`Last deployed: ${buildDate.toLocaleDateString()}`}>
      · {getRelativeLabel(buildDate)}
    </span>
  );
}
