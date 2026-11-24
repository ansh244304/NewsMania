import { Link, NavLink } from "react-router-dom";
import {
  Bookmark,
  BookOpen,
  LayoutDashboard,
  Newspaper,
  Shield,
  Trophy,
  Upload
} from "lucide-react";
import { STATIC_GK_SUBJECTS } from "../../api/staticGk";

const quickLinks = [
  { to: "/news", label: "Current Affairs", icon: Newspaper },
  { to: "/daily-quiz", label: "Daily Quiz", icon: Trophy },
  { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
];

const linkClass = ({ isActive }) =>
  `flex h-10 items-center gap-2.5 rounded-[9px] px-3 text-sm font-semibold transition ${
    isActive
      ? "bg-primary-soft text-primary"
      : "text-muted hover:bg-bg hover:text-ink"
  }`;

export default function StaticGKSidebar({
  subject,
  onSubjectChange,
  isAdmin,
  onUpload
}) {
  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-5">
          <div className="rounded-2xl border border-line bg-card p-3">
            <Link
              to="/static-gk"
              className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5"
            >
              <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-primary text-primary-fg">
                <BookOpen size={18} />
              </span>

              <span>
                <span className="block font-display text-sm font-bold text-ink">
                  Study Library
                </span>
                <span className="block text-[11px] font-medium text-muted">
                  {STATIC_GK_SUBJECTS.length} subjects
                </span>
              </span>
            </Link>

            <nav aria-label="Static GK" className="mt-2 space-y-0.5">
              <button
                type="button"
                onClick={() => onSubjectChange("")}
                className={`flex h-10 w-full items-center gap-2.5 rounded-[9px] px-3 text-sm font-semibold transition ${
                  !subject
                    ? "bg-primary-soft text-primary"
                    : "text-muted hover:bg-bg hover:text-ink"
                }`}
              >
                <BookOpen size={16} />
                All notes
              </button>

              <Link to="/bookmarks#static-gk" className={linkClass({ isActive: false })}>
                <Bookmark size={16} />
                Saved notes
              </Link>
            </nav>
          </div>

          <div className="rounded-2xl border border-line bg-card p-3">
            <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Subjects
            </p>

            <nav aria-label="Subjects" className="space-y-0.5">
              {STATIC_GK_SUBJECTS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSubjectChange(name)}
                  aria-pressed={subject === name}
                  className={`flex min-h-9 w-full items-center rounded-[8px] px-3 py-1.5 text-left text-[13px] font-semibold leading-5 transition ${
                    subject === name
                      ? "bg-primary text-primary-fg"
                      : "text-muted hover:bg-bg hover:text-ink"
                  }`}
                >
                  {name}
                </button>
              ))}
            </nav>
          </div>

          <div className="rounded-2xl border border-line bg-card p-3">
            <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Continue learning
            </p>

            <nav aria-label="Quick links" className="space-y-0.5">
              {quickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={linkClass}
                  >
                    <Icon size={16} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {isAdmin && (
            <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4">
              <div className="flex items-center gap-2 text-primary">
                <Shield size={16} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Admin
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-muted">
                Publish new notes and keep the library current.
              </p>

              <button
                type="button"
                onClick={onUpload}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[8px] bg-primary px-3 text-xs font-bold text-primary-fg transition hover:brightness-110"
              >
                <Upload size={14} />
                Upload PDF
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onSubjectChange("")}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              !subject
                ? "border-primary bg-primary text-primary-fg"
                : "border-line bg-card text-muted"
            }`}
          >
            All
          </button>

          {STATIC_GK_SUBJECTS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onSubjectChange(name)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                subject === name
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-line bg-card text-muted"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
