import dns from "node:dns";
import dotenv from "dotenv";

dotenv.config();

// The system resolver refuses SRV queries in this environment, which breaks
// mongodb+srv resolution. Point lookups at a public resolver instead so the
// hostname (and therefore TLS SNI) is preserved.
const patchedResolver = new dns.promises.Resolver();
patchedResolver.setServers(["8.8.8.8", "1.1.1.1"]);

dns.promises.resolveSrv = (name) =>
  patchedResolver.resolveSrv(name);
dns.promises.resolveTxt = (name) =>
  patchedResolver.resolveTxt(name);

const mongoose = (await import("mongoose")).default;

const User = (await import("../models/user.js")).default;
const {
  registerDailyActivity,
  getDayKey
} = await import("../services/streakService.js");

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const has = (flag) => process.argv.includes(flag);
const valueOf = (name) => {
  const match = process.argv.find((arg) =>
    arg.startsWith(`--${name}=`)
  );

  return match ? match.split("=")[1] : null;
};

const email = process.argv[2];
const days = Number(valueOf("days") || 6);

await mongoose.connect(process.env.MONGO_URI);

const printUser = (user) => {
  console.log(`\n  email      ${user.email}`);
  console.log(
    `  streak     current=${user.streak?.current || 0} longest=${
      user.streak?.longest || 0
    } lastActivityAt=${
      user.streak?.lastActivityAt
        ? getDayKey(user.streak.lastActivityAt)
        : "never"
    }`
  );
  console.log(
    `  badges     [${
      (user.badges || [])
        .map((badge) => `${badge.id}(${badge.days}d)`)
        .join(", ") || "none"
    }]`
  );
};

// No email, just list who is available to test with
if (!email || has("--list")) {
  const users = await User.find({})
    .select("email streak badges")
    .sort({ createdAt: -1 })
    .limit(20);

  console.log(`\nUsers (${users.length}):`);

  for (const user of users) {
    printUser(user);
  }

  console.log(
    "\nUsage:\n  node scripts/streakDevTool.js <email> [--set-streak --days=N --last-activity=YYYY-MM-DD] [--clear-badges] [--reset] [--simulate] [--show]\n"
  );

  await mongoose.disconnect();
  process.exit(0);
}

const user = await User.findOne({ email: email.toLowerCase() });

if (!user) {
  console.log(`No user with email ${email}`);
  await mongoose.disconnect();
  process.exit(1);
}

console.log(`\nBEFORE`);
printUser(user);

// Push the streak to the day before the milestone so the next daily
// quiz submit lands exactly on it.
if (has("--set-streak")) {
  const lastActivity = valueOf("last-activity");

  user.streak = {
    current: days,
    longest: days,
    // Yesterday, so the next quiz counts as the following day
    lastActivityAt: lastActivity
      ? new Date(`${lastActivity}T09:00:00+05:30`)
      : new Date(Date.now() - DAY_IN_MS)
  };

  await user.save();

  console.log(
    `\nSet streak to ${days} day(s), last activity ${
      lastActivity || "yesterday"
    }`
  );
}

// Wipes the streak and the badges, for a clean run
if (has("--reset")) {
  user.streak = {
    current: 0,
    longest: 0,
    lastActivityAt: null
  };

  user.badges = [];
  await user.save();

  console.log("Reset the streak and every badge");
}

// Badges are never revoked by the app, so they have to be removed
// by hand to make the popup fire a second time.
if (has("--clear-badges")) {
  user.badges = [];
  await user.save();

  console.log("Cleared every badge");
}

// Runs the exact same call the daily quiz endpoint makes
if (has("--simulate")) {
  const result = await registerDailyActivity(user._id);

  console.log(`\nSIMULATED DAILY QUIZ SUBMIT`);
  console.log(`  current      ${result.current}`);
  console.log(`  longest      ${result.longest}`);
  console.log(`  status       ${result.status}`);
  console.log(
    `  newBadges    [${
      result.newBadges.map((badge) => badge.id).join(", ") || "none"
    }]`
  );
  console.log(
    `  newBadgeText ${
      result.newBadges
        .map((badge) => `"${badge.name}"`)
        .join(", ") || "none"
    }`
  );
}

const after = await User.findById(user._id);

console.log(`\nAFTER`);
printUser(after);

await mongoose.disconnect();
