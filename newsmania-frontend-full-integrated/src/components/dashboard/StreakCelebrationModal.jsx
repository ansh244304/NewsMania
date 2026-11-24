import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Flame,
  Sparkles,
  Trophy
} from "lucide-react";
import Modal from "../ui/Modal";
import { BADGE_LADDER } from "./StreakCard";
import { formatLongDate } from "../../utils/format";

const CONFETTI_COLORS = [
  "rgb(var(--streak))",
  "rgb(var(--primary))",
  "rgb(var(--success))",
  "#fbbf24",
  "#f472b6"
];

// The pieces are generated once so the animation does not restart
// on every re-render of the page behind the popup.
const buildConfetti = (count = 26) =>
  Array.from({ length: count }, (_, index) => ({
    id: index,
    left: Math.round(((index * 37) % 100) + Math.random() * 4),
    delay: Math.round(Math.random() * 900),
    duration: 1600 + Math.round(Math.random() * 1400),
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    size: 5 + Math.round(Math.random() * 5),
    round: index % 3 === 0
  }));

/**
 * The popup a user sees the moment a streak milestone is reached.
 * badges: the badges earned on this activity, newest first.
 */
export default function StreakCelebrationModal({
  open,
  onClose,
  badges = [],
  streak = 0,
  longest = 0
}) {
  const confetti = useMemo(() => buildConfetti(), []);

  const badge = badges[0];

  if (!open || !badge) return null;

  const Icon =
    BADGE_LADDER.find((item) => item.id === badge.id)?.icon ||
    Trophy;

  const days = badge.days || streak || 0;
  const flames = Math.min(days, 7);

  // The badge is judged on the longest run, so a user who comes back
  // after a break can unlock it without the streak being that long.
  const reachedToday = streak === days;

  const headline = reachedToday
    ? `You kept a ${days} day streak alive. The ${badge.name} badge is yours.`
    : `Your ${longest || days} day best run earned you the ${badge.name} badge.`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      showClose={false}
      ariaLabel="Streak milestone celebration"
      className="max-w-[420px] p-0"
    >
      {/* ================= HERO ================= */}

      <div className="relative overflow-hidden bg-linear-to-b from-primary-soft to-card px-6 pb-7 pt-8 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          {confetti.map((piece) => (
            <span
              key={piece.id}
              className="absolute top-0 block animate-celebrate-confetti"
              style={{
                left: `${piece.left}%`,
                width: `${piece.size}px`,
                height: `${Math.round(piece.size * 1.7)}px`,
                backgroundColor: piece.color,
                borderRadius: piece.round ? "9999px" : "2px",
                animationDelay: `${piece.delay}ms`,
                animationDuration: `${piece.duration}ms`
              }}
            />
          ))}
        </div>

        <div className="relative">
          <div className="relative mx-auto grid h-28 w-28 place-items-center">
            <span className="absolute inset-0 rounded-full bg-streak/25 animate-celebrate-ring" />

            <span className="relative grid h-24 w-24 place-items-center rounded-full bg-streak text-white shadow-lg animate-celebrate-pop">
              <Icon size={44} />
            </span>
          </div>

          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-streak/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-streak">
            <Sparkles size={12} />
            {badges.length > 1
              ? `${badges.length} new badges`
              : "Milestone reached"}
          </p>

          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
            Congratulations!
          </h2>

          <p className="mt-1.5 text-sm text-muted">
            {headline}
          </p>

          <div className="mt-4 flex items-center justify-center gap-1">
            {Array.from({ length: flames }).map((_, index) => (
              <Flame
                key={index}
                size={20}
                className="animate-celebrate-rise text-streak"
                style={{ animationDelay: `${140 + index * 70}ms` }}
              />
            ))}
          </div>

          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
            {days} day streak
          </p>
        </div>
      </div>

      {/* ================= BADGE ================= */}

      <div className="px-6 pb-6">
        <div className="flex items-center gap-4 rounded-2xl border border-streak/40 bg-streak/10 p-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-streak text-white">
            <Icon size={28} />
          </span>

          <div className="min-w-0 text-left">
            <p className="font-display text-base font-bold text-streak">
              {badge.name}
            </p>

            <p className="mt-0.5 text-xs text-muted">
              {badge.description}
            </p>

            {badge.earnedAt && (
              <p className="mt-1 text-[11px] font-semibold text-muted">
                Earned on {formatLongDate(badge.earnedAt)}
              </p>
            )}
          </div>
        </div>

        {badges.length > 1 && (
          <div className="mt-2.5 space-y-2">
            {badges.slice(1).map((extra) => {
              const ExtraIcon =
                BADGE_LADDER.find((item) => item.id === extra.id)
                  ?.icon || Trophy;

              return (
                <div
                  key={extra.id}
                  className="flex items-center gap-3 rounded-[14px] border border-line bg-bg px-3 py-2.5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-streak text-white">
                    <ExtraIcon size={17} />
                  </span>

                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-bold text-ink">
                      {extra.name}
                    </p>

                    <p className="truncate text-[11px] font-semibold text-muted">
                      {extra.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link
            to="/profile"
            onClick={onClose}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-fg transition duration-150 hover:brightness-110"
          >
            <Trophy size={16} />
            View my badges
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-[10px] border border-line bg-card px-5 text-sm font-semibold text-ink transition duration-150 hover:border-primary hover:text-primary"
          >
            Continue
          </button>
        </div>
      </div>
    </Modal>
  );
}
