import { useEffect, useState } from "react";
import { BookOpen, Search, Upload } from "lucide-react";
import {
  fetchStaticGkResources,
  formatFileSize
} from "../../api/staticGk";
import StaticGKResourceCard from "../../components/staticGk/StaticGKResourceCard";
import StaticGKUploadModal from "../../components/staticGk/StaticGKUploadModal";
import Pagination from "../../components/common/Pagination";
import EmptyState from "../../components/ui/EmptyState";

const LIMIT = 12;

export default function AdminStaticGK() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    fetchStaticGkResources({
      page,
      limit: LIMIT,
      q: query || undefined,
      sort: "latest",
      includeUnpublished: true
    })
      .then((data) => {
        if (cancelled) return;

        setResources(data.resources || []);
        setTotal(data.total || 0);
        setTotalPages(Math.max(1, data.totalPages || 1));
      })
      .catch((requestError) => {
        if (cancelled) return;

        setError(
          requestError.response?.data?.message ||
            "Could not load Static GK resources."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, query, refreshKey]);

  const published = resources.filter((item) => item.published).length;
  const drafts = resources.length - published;
  const storage = resources.reduce(
    (sum, item) => sum + Number(item.fileSize || 0),
    0
  );

  const refresh = () => setRefreshKey((current) => current + 1);

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Admin
            </span>

            <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-ink">
              Static GK Library
            </h1>

            <p className="mt-1.5 text-sm text-muted">
              Upload PDF notes, manage metadata and control what students can
              see.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingResource(null);
              setUploadOpen(true);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-fg transition hover:brightness-110"
          >
            <Upload size={16} />
            Upload PDF Notes
          </button>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Total", total],
            ["Published (page)", published],
            ["Drafts (page)", drafts],
            ["PDF storage (page)", formatFileSize(storage)]
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[14px] border border-line bg-card p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                {label}
              </p>
              <p className="mt-1 font-display text-xl font-extrabold text-ink">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-card p-4">
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search admin resources..."
              aria-label="Search resources"
              className="h-11 w-full rounded-[10px] border border-line bg-bg pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="mt-5">
          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-danger/40 bg-danger/10 p-6 text-sm text-danger"
            >
              <p className="font-semibold">{error}</p>

              <button
                type="button"
                onClick={refresh}
                className="mt-3 inline-flex h-9 items-center rounded-[8px] border border-danger/40 px-3 text-xs font-bold"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-80 animate-pulse rounded-2xl border border-line bg-line/60"
                />
              ))}
            </div>
          ) : resources.length ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {resources.map((resource) => {
                  const id = resource._id || resource.id;

                  return (
                    <StaticGKResourceCard
                      key={id}
                      resource={resource}
                      compact
                      onEdit={(item) => {
                        setEditingResource(item);
                        setUploadOpen(true);
                      }}
                      onDeleted={refresh}
                    />
                  );
                })}
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          ) : (
            <EmptyState
              icon={<BookOpen size={22} />}
              title="No resources found"
              text={
                query
                  ? "Try a different search term."
                  : "Upload the first PDF to start the library."
              }
              action={
                !query ? (
                  <button
                    type="button"
                    onClick={() => setUploadOpen(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-fg"
                  >
                    <Upload size={15} />
                    Upload PDF Notes
                  </button>
                ) : undefined
              }
            />
          )}
        </div>
      </div>

      <StaticGKUploadModal
        open={uploadOpen}
        resource={editingResource}
        onClose={() => {
          setUploadOpen(false);
          setEditingResource(null);
        }}
        onSaved={() => {
          refresh();
          setEditingResource(null);
        }}
      />
    </div>
  );
}
