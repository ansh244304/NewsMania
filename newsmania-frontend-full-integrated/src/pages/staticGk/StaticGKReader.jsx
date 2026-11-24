import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  Sparkles,
  Tag
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  addStaticGkBookmark,
  downloadStaticGkResource,
  fetchStaticGkFileBlob,
  fetchStaticGkResource,
  formatFileSize,
  formatResourceDate,
  removeStaticGkBookmark
} from "../../api/staticGk";
import PdfViewer from "../../components/staticGk/PdfViewer";
import Toast from "../../components/ui/Toast";

export default function StaticGKReader() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();

  const [resource, setResource] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");
    setResource(null);
    setPdfData(null);

    const load = async () => {
      try {
        const [detail, blob] = await Promise.all([
          fetchStaticGkResource(id),
          fetchStaticGkFileBlob(id)
        ]);

        if (cancelled) return;

        setResource(detail.resource);
        setBookmarked(Boolean(detail.resource?.bookmarked));
        setPdfData(
          new Uint8Array(await new Blob([blob]).arrayBuffer())
        );
      } catch (requestError) {
        if (cancelled) return;

        const status = requestError.response?.status;

        setError(
          status === 404
            ? "This resource does not exist or is no longer published."
            : status === 403
              ? "You do not have permission to open this resource."
              : "The PDF could not be loaded. Please try again."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const toggleBookmark = async () => {
    if (bookmarking) return;

    if (!isAuthenticated) {
      setToast("Log in to bookmark notes");
      return;
    }

    setBookmarking(true);

    try {
      if (bookmarked) {
        await removeStaticGkBookmark(id);
        setBookmarked(false);
        setToast("Removed from saved notes");
      } else {
        await addStaticGkBookmark(id);
        setBookmarked(true);
        setToast("Saved to your library");
      }
    } catch (requestError) {
      if (requestError.response?.status === 409) {
        setBookmarked(true);
      } else {
        setToast(
          requestError.response?.data?.message ||
            "Could not update bookmark"
        );
      }
    } finally {
      setBookmarking(false);
    }
  };

  const download = async () => {
    if (!resource || downloading) return;

    setDownloading(true);

    try {
      await downloadStaticGkResource(resource);
      setToast("Download started");
    } catch (requestError) {
      setToast(
        requestError.response?.data?.message ||
          "Could not download this PDF"
      );
    } finally {
      setDownloading(false);
    }
  };

  const openFallback = () => {
    if (!pdfData) return;

    const url = URL.createObjectURL(
      new Blob([pdfData], { type: "application/pdf" })
    );

    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-sm font-semibold text-muted">
          <Loader2 size={30} className="animate-spin text-primary" />
          Opening secure PDF reader...
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8 text-center">
          <h1 className="font-display text-xl font-bold text-ink">
            Unable to open this resource
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">{error}</p>

          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              to="/static-gk"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-fg transition hover:brightness-110"
            >
              <ArrowLeft size={15} />
              Back to library
            </Link>

            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="inline-flex h-11 items-center justify-center rounded-[10px] border border-line px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const exams = Array.isArray(resource.targetExams)
    ? resource.targetExams
    : [];

  const tags = Array.isArray(resource.tags) ? resource.tags : [];

  return (
    <div className="px-3 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <Link
          to="/static-gk"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition hover:text-primary"
        >
          <ArrowLeft size={14} />
          Back to Static GK Library
        </Link>

        <header className="mt-3 flex flex-col justify-between gap-4 border-b border-line pb-5 xl:flex-row xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                {resource.subject}
              </span>

              {resource.topic && (
                <span className="rounded-full bg-bg px-2.5 py-1 text-[10px] font-semibold text-muted">
                  {resource.topic}
                </span>
              )}

              {!resource.published && (
                <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-danger">
                  Draft
                </span>
              )}
            </div>

            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {resource.title}
            </h1>

            <p className="mt-1.5 text-xs font-semibold text-muted">
              {resource.pageCount
                ? `${resource.pageCount} pages`
                : "PDF notes"}{" "}
              &middot; {formatFileSize(resource.fileSize)}
              {resource.createdAt
                ? ` \u00b7 Added ${formatResourceDate(resource.createdAt)}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleBookmark}
              disabled={bookmarking}
              aria-pressed={bookmarked}
              className={`inline-flex h-11 items-center gap-2 rounded-[10px] border px-3.5 text-sm font-semibold transition disabled:opacity-60 ${
                bookmarked
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line bg-card text-ink hover:border-primary hover:text-primary"
              }`}
            >
              <Bookmark size={15} className={bookmarked ? "fill-current" : ""} />
              {bookmarked ? "Saved" : "Save"}
            </button>

            <button
              type="button"
              onClick={openFallback}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-line bg-card px-3.5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
            >
              <ExternalLink size={15} />
              Open
            </button>

            <button
              type="button"
              onClick={download}
              disabled={downloading}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-fg transition hover:brightness-110 disabled:opacity-60"
            >
              <Download size={15} />
              {downloading ? "Downloading..." : "Download PDF"}
            </button>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {pdfData ? (
              <PdfViewer
                data={pdfData}
                title={resource.title}
                onOpenFallback={openFallback}
              />
            ) : (
              <div className="rounded-2xl border border-line bg-card p-8 text-center text-sm text-muted">
                PDF data is unavailable.
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-line bg-card p-5">
              <h2 className="font-display text-sm font-bold text-ink">
                About this resource
              </h2>

              <p className="mt-2 text-[13px] leading-6 text-muted">
                {resource.description ||
                  "No description has been added for this resource."}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
                <div>
                  <dt className="flex items-center gap-1 font-semibold text-muted">
                    <Layers size={12} />
                    Pages
                  </dt>
                  <dd className="mt-0.5 font-bold text-ink">
                    {resource.pageCount || "—"}
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-1 font-semibold text-muted">
                    <FileText size={12} />
                    File size
                  </dt>
                  <dd className="mt-0.5 font-bold text-ink">
                    {formatFileSize(resource.fileSize)}
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-1 font-semibold text-muted">
                    <CalendarDays size={12} />
                    Uploaded
                  </dt>
                  <dd className="mt-0.5 font-bold text-ink">
                    {formatResourceDate(resource.createdAt) || "—"}
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-1 font-semibold text-muted">
                    <Download size={12} />
                    Downloads
                  </dt>
                  <dd className="mt-0.5 font-bold text-ink">
                    {resource.downloadCount || 0}
                  </dd>
                </div>
              </dl>
            </section>

            {exams.length > 0 && (
              <section className="rounded-2xl border border-line bg-card p-5">
                <h2 className="font-display text-sm font-bold text-ink">
                  Target exams
                </h2>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {exams.map((exam) => (
                    <span
                      key={exam}
                      className="rounded-full border border-line bg-bg px-2.5 py-1 text-[11px] font-bold text-muted"
                    >
                      {exam}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {tags.length > 0 && (
              <section className="rounded-2xl border border-line bg-card p-5">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
                  <Tag size={13} />
                  Keywords
                </h2>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-primary/25 bg-primary-soft p-5">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles size={15} />
                <h2 className="font-display text-sm font-bold">
                  AI study tools
                </h2>
              </div>

              <p className="mt-2 text-xs leading-5 text-muted">
                Chapter summaries, revision flashcards and source-grounded
                MCQs will be generated only after this PDF&apos;s text has been
                extracted and processed.
              </p>

              <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-primary">
                Status: {String(resource.ai?.status || "not_processed").replace("_", " ")}
              </p>
            </section>
          </aside>
        </div>
      </div>

      <Toast
        open={Boolean(toast)}
        message={toast}
        onClose={() => setToast("")}
      />
    </div>
  );
}
