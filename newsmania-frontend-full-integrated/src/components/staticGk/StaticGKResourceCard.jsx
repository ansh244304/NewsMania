import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  BookOpen,
  Download,
  Eye,
  FileText,
  Pencil,
  Sparkles,
  Trash2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  addStaticGkBookmark,
  deleteStaticGk,
  downloadStaticGkResource,
  formatFileSize,
  formatResourceDate,
  removeStaticGkBookmark,
  staticGkAssetUrl
} from "../../api/staticGk";
import StaticGKPreviewModal from "./StaticGKPreviewModal";
import Toast from "../ui/Toast";

const coverTones = {
  Polity: "from-[#132B63] via-[#1B3D8F] to-[#0B1730]",
  History: "from-[#4A2A13] via-[#7A471E] to-[#1D1209]",
  Geography: "from-[#0F3D3E] via-[#17696A] to-[#071D1E]",
  Economy: "from-[#26320F] via-[#4D6421] to-[#111707]",
  "General Science": "from-[#2C1D4A] via-[#4A327A] to-[#150D24]",
  Environment: "from-[#10351F] via-[#1D6639] to-[#081A0F]",
  "Art & Culture": "from-[#4A1736] via-[#7A2657] to-[#220A19]",
  Schemes: "from-[#3A2B08] via-[#6F5715] to-[#1B1404]",
  "International Relations": "from-[#0C2E4A] via-[#175E91] to-[#061725]",
  Defence: "from-[#3D1B1B] via-[#6B2C2C] to-[#1C0B0B]",
  Miscellaneous: "from-[#242A3A] via-[#3A4358] to-[#11141C]"
};

export default function StaticGKResourceCard({
  resource = {},
  bookmarked = false,
  compact = false,
  className = "",
  onBookmarkChange,
  onEdit,
  onDeleted
}) {
  const { user, isAuthenticated } = useAuth();
  const id = resource._id || resource.id;
  const featured = Boolean(resource.featured);

  const [saved, setSaved] = useState(Boolean(bookmarked));
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setSaved(Boolean(bookmarked));
  }, [bookmarked]);

  const toggleBookmark = async () => {
    if (saving) return;

    if (!isAuthenticated) {
      setToast("Log in to bookmark notes");
      return;
    }

    setSaving(true);

    try {
      if (saved) {
        await removeStaticGkBookmark(id);
        setSaved(false);
        onBookmarkChange?.(id, false);
        setToast("Removed from saved notes");
      } else {
        await addStaticGkBookmark(id);
        setSaved(true);
        onBookmarkChange?.(id, true);
        setToast("Saved to your library");
      }
    } catch (error) {
      if (error.response?.status === 409) {
        setSaved(true);
        onBookmarkChange?.(id, true);
        setToast("Already in your saved notes");
      } else {
        setToast(
          error.response?.data?.message || "Could not update bookmark"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    if (downloading) return;

    setDownloading(true);

    try {
      await downloadStaticGkResource(resource);
      setToast("Download started");
    } catch (error) {
      setToast(
        error.response?.data?.message || "Could not download this PDF"
      );
    } finally {
      setDownloading(false);
    }
  };

  const remove = async () => {
    if (deleting) return;
    if (!window.confirm("Delete this resource and its stored PDF?")) return;

    setDeleting(true);

    try {
      await deleteStaticGk(id);
      setToast("Resource deleted");
      onDeleted?.(id);
    } catch (error) {
      setToast(error.response?.data?.message || "Could not delete resource");
    } finally {
      setDeleting(false);
    }
  };

  const exams = Array.isArray(resource.targetExams)
    ? resource.targetExams
    : [];
  const tone = coverTones[resource.subject] || coverTones.Miscellaneous;

  return (
    <>
      <article
        className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition duration-150 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[0_14px_35px_-20px_rgba(35,71,232,0.55)] ${
          featured ? "border-primary/40" : "border-line"
        } ${className}`}
      >
        <div
          className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${tone}`}
        >
          {resource.thumbnailUrl ? (
            <img
              src={staticGkAssetUrl(resource.thumbnailUrl)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="relative flex h-full w-full flex-col justify-between p-4">
              <div
                aria-hidden="true"
                className="absolute -right-6 -top-8 h-32 w-32 rounded-full border border-white/15"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-10 -left-4 h-28 w-28 rounded-full border border-white/10"
              />

              <div className="relative flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-white/12 text-white backdrop-blur">
                  <FileText size={16} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
                  Static GK
                </span>
              </div>

              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                  {resource.subject || "Study notes"}
                </p>
                <p className="mt-1 line-clamp-2 font-display text-lg font-extrabold leading-snug text-white">
                  {resource.topic || resource.title || "PDF notes"}
                </p>
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0B1730] shadow-sm">
                <Sparkles size={11} />
                Featured
              </span>
            )}

            {!resource.published && (
              <span className="rounded-full bg-[#7A1E1E] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
                Draft
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={toggleBookmark}
            disabled={saving}
            aria-pressed={saved}
            aria-label={saved ? "Remove bookmark" : "Bookmark this resource"}
            title={saved ? "Remove bookmark" : "Bookmark"}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur transition hover:bg-black/45 disabled:opacity-60"
          >
            <Bookmark size={16} className={saved ? "fill-current" : ""} />
          </button>
        </div>

        <div className={`flex flex-1 flex-col ${compact ? "p-4" : "p-5"}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              {resource.subject || "Static GK"}
            </span>

            {resource.topic && (
              <span className="max-w-[55%] truncate rounded-full bg-bg px-2.5 py-0.5 text-[10px] font-semibold text-muted">
                {resource.topic}
              </span>
            )}
          </div>

          <h3
            className={`mt-2 font-display font-bold leading-snug text-ink ${
              compact ? "text-[15px]" : "text-[17px]"
            }`}
          >
            <Link
              to={`/static-gk/${id}`}
              className="line-clamp-2 block transition hover:text-primary"
            >
              {resource.title || "Untitled resource"}
            </Link>
          </h3>

          {!compact && (
            <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-5 text-muted">
              {resource.description ||
                "Concise, exam-ready notes with a clean reading experience."}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted">
            <span className="inline-flex items-center gap-1">
              <FileText size={12} />
              {resource.pageCount ? `${resource.pageCount} pages` : "PDF notes"}
            </span>
            <span>{formatFileSize(resource.fileSize)}</span>
            {resource.createdAt && (
              <span>{formatResourceDate(resource.createdAt)}</span>
            )}
          </div>

          {exams.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {exams.slice(0, 3).map((exam) => (
                <span
                  key={exam}
                  className="rounded-[5px] border border-line bg-bg px-1.5 py-0.5 text-[10px] font-bold text-muted"
                >
                  {exam}
                </span>
              ))}

              {exams.length > 3 && (
                <span className="rounded-[5px] border border-line bg-bg px-1.5 py-0.5 text-[10px] font-bold text-muted">
                  +{exams.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="mt-auto flex items-center gap-2 border-t border-line pt-3.5">
            <Link
              to={`/static-gk/${id}`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-primary px-3 text-xs font-bold text-primary-fg transition hover:brightness-110"
            >
              <BookOpen size={14} />
              Read now
            </Link>

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              aria-label="Preview PDF"
              title="Preview PDF"
              className="grid h-10 w-10 place-items-center rounded-[9px] border border-line text-muted transition hover:border-primary hover:text-primary"
            >
              <Eye size={16} />
            </button>

            <button
              type="button"
              onClick={download}
              disabled={downloading}
              aria-label="Download PDF"
              title="Download PDF"
              className="grid h-10 w-10 place-items-center rounded-[9px] border border-line text-muted transition hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <Download
                size={16}
                className={downloading ? "animate-bounce" : ""}
              />
            </button>
          </div>

          {user?.role === "admin" && (
            <div className="mt-2 flex items-center justify-end gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(resource)}
                  className="inline-flex h-8 items-center gap-1 rounded-[7px] px-2 text-[11px] font-bold text-muted transition hover:bg-primary-soft hover:text-primary"
                >
                  <Pencil size={12} />
                  Edit
                </button>
              )}

              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="inline-flex h-8 items-center gap-1 rounded-[7px] px-2 text-[11px] font-bold text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
              >
                <Trash2 size={12} />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          )}
        </div>
      </article>

      <StaticGKPreviewModal
        resource={resource}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />

      <Toast
        open={Boolean(toast)}
        message={toast}
        onClose={() => setToast("")}
      />
    </>
  );
}
