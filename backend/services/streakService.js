import User from "../models/user.js";

// The product is India focused, so a "day" is a day in IST and not the
// day of whatever server happens to be deployed on.
const IST_OFFSET_MINUTES = 330;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Streak milestones. A badge is awarded the first time the streak
// reaches the given number of consecutive days.
export const STREAK_BADGES = [
  {
    id: "streak_7",
    days: 7,
    name: "7-Day Streak",
    description:
      "Seven days of daily quizzes in a row. Habit formed."
  },
  {
    id: "streak_30",
    days: 30,
    name: "30-Day Streak",
    description:
      "A full month of daily quizzes. Unbroken."
  },
  {
    id: "streak_100",
    days: 100,
    name: "100-Day Streak",
    description:
      "One hundred days without a single miss."
  }
];

// Calendar day in IST as "YYYY-MM-DD"
export const getDayKey = (date = new Date()) => {
  return new Date(
    date.getTime() + IST_OFFSET_MINUTES * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);
};

// The IST day window every "today" query shares, so the streak,
// the briefing and the daily quiz never disagree on what day it is
export const getIstDayRange = (date = new Date()) => {
  const key = getDayKey(date);

  const start = new Date(`${key}T00:00:00+05:30`);
  const end = new Date(start.getTime() + DAY_IN_MS);

  return { key, start, end };
};

// Difference in days between two "YYYY-MM-DD" keys
export const daysBetween = (fromKey, toKey) => {
  return Math.round(
    (Date.parse(`${toKey}T00:00:00Z`) -
      Date.parse(`${fromKey}T00:00:00Z`)) /
      DAY_IN_MS
  );
};

export const getGreeting = (date = new Date()) => {
  // hourCycle h23 keeps midnight at 0 instead of 24
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hourCycle: "h23"
    }).format(date)
  );

  if (hour < 5) {
    return "Good night";
  }

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  if (hour < 22) {
    return "Good evening";
  }

  return "Good night";
};

// The next milestone the user has not earned yet
const getNextBadge = (longest) => {
  return (
    STREAK_BADGES.find(
      (badge) => badge.days > longest
    ) || null
  );
};

// Shape a user document into the payload the client renders
export const getStreakSnapshot = (user) => {
  const current = user.streak?.current || 0;
  const longest = user.streak?.longest || 0;
  const badges = user.badges || [];
  const nextBadge = getNextBadge(longest);

  // A streak is only alive on the day it was earned. Yesterday's
  // streak has not been broken yet, it simply is not secured yet.
  const todayKey = getDayKey();
  const lastDayKey = user.streak?.lastActivityAt
    ? getDayKey(user.streak.lastActivityAt)
    : null;
  const gap = lastDayKey
    ? daysBetween(lastDayKey, todayKey)
    : null;

  let status = "none";

  if (lastDayKey === todayKey) {
    status = "secured";
  } else if (gap === 1) {
    status = "at_risk";
  } else if (current > 0) {
    status = "broken";
  }

  return {
    current: status === "broken" ? 0 : current,
    longest,
    status,
    lastActivityAt:
      user.streak?.lastActivityAt || null,
    badges,
    nextBadge: nextBadge
      ? {
          id: nextBadge.id,
          name: nextBadge.name,
          days: nextBadge.days,
          remaining: Math.max(
            0,
            nextBadge.days - longest
          )
        }
      : null
  };
};

// Advance the streak for one calendar day. Safe to call more than
// once in a day, the streak only ever moves forward.
export const registerDailyActivity = async (
  userId
) => {
  const user = await User.findById(userId);

  if (!user) {
    return null;
  }

  const todayKey = getDayKey();
  const lastDayKey = user.streak?.lastActivityAt
    ? getDayKey(user.streak.lastActivityAt)
    : null;

  let current = user.streak?.current || 0;

  if (lastDayKey === todayKey) {
    // Already counted today, leave the streak as is
  } else if (
    lastDayKey &&
    daysBetween(lastDayKey, todayKey) === 1
  ) {
    // Consecutive day
    current += 1;
  } else {
    // First ever day, or the chain was already broken
    current = 1;
  }

  const longest = Math.max(
    user.streak?.longest || 0,
    current
  );

  const earned = user.badges || [];
  const earnedIds = new Set(
    earned.map((badge) => badge.id)
  );
  const newBadges = [];

  // Milestones are judged on the longest streak so a badge is
  // never taken back once the user breaks the chain.
  for (const badge of STREAK_BADGES) {
    if (
      longest >= badge.days &&
      !earnedIds.has(badge.id)
    ) {
      const earnedBadge = {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        days: badge.days,
        earnedAt: new Date()
      };

      earned.push(earnedBadge);
      newBadges.push(earnedBadge);
    }
  }

  user.streak = {
    current,
    longest,
    lastActivityAt: new Date()
  };
  user.badges = earned;

  await user.save();

  return {
    ...getStreakSnapshot(user),
    newBadges,
    alreadyCountedToday: lastDayKey === todayKey
  };
};

export default {
  STREAK_BADGES,
  getDayKey,
  getIstDayRange,
  daysBetween,
  getGreeting,
  getStreakSnapshot,
  registerDailyActivity
};
