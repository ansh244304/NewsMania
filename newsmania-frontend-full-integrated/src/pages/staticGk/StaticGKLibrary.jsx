import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Filter,
  Library,
  Search,
  SlidersHorizontal,
  Upload,
  X
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  STATIC_GK_EXAMS,
  STATIC_GK_SORTS,
  STATIC_GK_SUBJECTS,
  fetchStaticGkBookmarks,
  fetchStaticGkResources
} from "../../api/staticGk";
import StaticGKSidebar from "../../components/staticGk/StaticGKSidebar";
import StaticGKResourceCard from "../../components/staticGk/StaticGKResourceCard";
import StaticGKUploadModal from "../../components/staticGk/StaticGKUploadModal";
import Pagination from "../../components/common/Pagination";
import EmptyState from "../../components/ui/EmptyState";

const LIMIT = 12;

const chipClass = (active) =>
  `shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
    active
      ? "border-primary bg-primary text-primary-fg"
      : "border-line bg-card text-muted hover:border-primary/60 hover:text-primary"
  }`;

export default function StaticGKLibrary() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("");
  const [sort, setSort] = useState("latest");

  const [bookmarkedIds, setBookmarkedIds] = useState(() => new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  const activeFilters = Boolean(search || subject || exam || sort !== "latest");

  const loadBookmarks = useCallback(async () => {
    if (!isAuthenticated) {
      setBookmarkedIds(new Set());
      return;
    }

    try {
      const data = await fetchStaticGkBookmarks();
      setBookmarkedIds(
        new Set((data.resources || []).map((item) => item._id || item.id))
      );
    } catch {
      setBookmarkedIds(new Set());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchStaticGkResources(
          {
            page,
            limit: LIMIT,
            q: debouncedSearch || undefined,
            subject: subject || undefined,
            exam: exam || undefined,
            sort
          },
          { signal: controller.signal }
        );

        if (cancelled) return;

        setResources(data.resources || []);
        setTotal(data.total || 0);
        setTotalPages(Math.max(1, data.totalPages || 1));
      } catch (requestError) {
        if (cancelled || requestError.code === "ERR_CANCELED") return;

        setError(
          requestError.response?.data?.message ||
            "Could not load the Static GK library."
        );
        setResources([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, debouncedSearch, subject, exam, sort, refreshKey]);

  const handleBookmarkChange = (id, saved) => {
    setBookmarkedIds((current) => {
      const next = new Set(current);
      if (saved) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSubject("");
    setExam("");
    setSort("latest");
    setPage(1);
  };

  const changeSubject = (value) => {
    setSubject(value);
    setPage(1);
  };

  const changeExam = (value) => {
    setExam(value);
    setPage(1);
  };

  const notifySaved = () => {
    setRefreshKey((current) => current + 1);
    loadBookmarks();
  };

  const featuredCount = useMemo(
    () => resources.filter((item) => item.featured).length,
    [resources]
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
          <StaticGKSidebar
            subject={subject}
            onSubjectChange={changeSubject}
            isAdmin={isAdmin}
            onUpload={() => setUploadOpen(true)}
          />

          <div className="min-w-0">
            <section className="relative overflow-hidden rounded-2xl border border-[#1D2A49] bg-[#0B1327] p-5 text-white sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#2347E8]/30 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#4E6BFF]/15 blur-3xl"
              />

              <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#AFC2FF]">
                    <Library size={12} />
                    Newsmania study library
                  </span>

                  <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    Static GK Library
                  </h1>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#B8C3DE]">
                    Your complete collection of notes for competitive exams
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#D6DEF4]">
                    <span className="rounded-full bg-white/8 px-2.5 py-1">
                      {total} resources
                    </span>
                    <span className="rounded-full bg-white/8 px-2.5 py-1">
                      {STATIC_GK_SUBJECTS.length} subjects
                    </span>
                    <span className="rounded-full bg-white/8 px-2.5 py-1">
                      {STATIC_GK_EXAMS.length} exam tracks
                    </span>
                    {featuredCount > 0 && (
                      <span className="rounded-full bg-[#2347E8] px-2.5 py-1 text-white">
                        {featuredCount} featured
                      </span>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setUploadOpen(true)}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#2347E8] px-4 text-sm font-bold text-white transition hover:bg-[#1B38C0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1327]"
                  >
                    <Upload size={16} />
                    Upload PDF Notes
                  </button>
                )}
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-line bg-card p-4 sm:p-5">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title, subject, topic or keyword..."
                  aria-label="Search Static GK resources"
                  className="h-12 w-full rounded-[11px] border border-line bg-bg pl-11 pr-11 text-sm text-ink outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[7px] text-muted transition hover:bg-primary-soft hover:text-primary"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                    <Filter size={12} />
                    Subject
                  </span>

                  {activeFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  <button
                    type="button"
                    onClick={() => changeSubject("")}
                    className={chipClass(!subject)}
                  >
                    All Subjects
                  </button>

                  {STATIC_GK_SUBJECTS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => changeSubject(name)}
                      className={chipClass(subject === name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 border-t border-line pt-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  Exam
                </div>

                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  <button
                    type="button"
                    onClick={() => changeExam("")}
                    className={chipClass(!exam)}
                  >
                    All Exams
                  </button>

                  {STATIC_GK_EXAMS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => changeExam(name)}
                      className={chipClass(exam === name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-muted">
                  {loading
                    ? "Loading resources..."
                    : `${total} resource${total === 1 ? "" : "s"} found`}
                </p>

                <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                  <SlidersHorizontal size={13} />
                  <span className="sr-only">Sort resources</span>
                  <select
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value);
                      setPage(1);
                    }}
                    aria-label="Sort resources"
                    className="h-9 rounded-[8px] border border-line bg-bg px-2.5 text-xs font-semibold text-ink outline-none focus:border-primary"
                  >
                    {STATIC_GK_SORTS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <div className="mt-5">
              {loading && !resources.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="overflow-hidden rounded-2xl border border-line bg-card"
                    >
                      <div className="aspect-[16/9] animate-pulse bg-line" />
                      <div className="space-y-3 p-4">
                        <div className="h-3 w-20 animate-pulse rounded bg-line" />
                        <div className="h-5 w-full animate-pulse rounded bg-line" />
                        <div className="h-5 w-2/3 animate-pulse rounded bg-line" />
                        <div className="h-10 w-full animate-pulse rounded bg-line" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-danger/40 bg-danger/8 p-8 text-center">
                  <h2 className="font-display text-lg font-bold text-ink">
                    The library could not be loaded
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => setRefreshKey((current) => current + 1)}
                    className="mt-5 inline-flex h-11 items-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-fg transition hover:brightness-110"
                  >
                    Try again
                  </button>
                </div>
              ) : resources.length ? (
                <>
                  <div
                    className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
                      loading ? "opacity-60 transition" : ""
                    }`}
                  >
                    {resources.map((resource) => {
                      const id = resource._id || resource.id;

                      return (
                        <StaticGKResourceCard
                          key={id}
                          resource={resource}
                          bookmarked={bookmarkedIds.has(id)}
                          compact
                          className={
                            resource.featured
                              ? "sm:col-span-2 xl:col-span-2"
                              : ""
                          }
                          onBookmarkChange={handleBookmarkChange}
                          onEdit={(item) => {
                            setEditingResource(item);
                            setUploadOpen(true);
                          }}
                          onDeleted={notifySaved}
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
                  title={
                    activeFilters
                      ? "No notes match these filters"
                      : "No PDF notes published yet"
                  }
                  text={
                    activeFilters
                      ? "Try a broader search, a different subject or another exam track."
                      : isAdmin
                        ? "Upload the first PDF to start building the library."
                        : "New study material will appear here as soon as it is published."
                  }
                  action={
                    activeFilters ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex h-11 items-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-fg transition hover:brightness-110"
                      >
                        Clear filters
                      </button>
                    ) : isAdmin ? (
                      <button
                        type="button"
                        onClick={() => setUploadOpen(true)}
                        className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-fg transition hover:brightness-110"
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
          notifySaved();
          setEditingResource(null);
        }}
      />
    </div>
  );
}
