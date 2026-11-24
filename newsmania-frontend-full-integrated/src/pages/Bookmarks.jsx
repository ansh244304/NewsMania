import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookOpen, Sparkles } from "lucide-react";
import api from "../api/api";
import { fetchStaticGkBookmarks } from "../api/staticGk";
import Loading from "../components/common/Loading";
import NewsCard from "../components/news/NewsCard";
import StaticGKResourceCard from "../components/staticGk/StaticGKResourceCard";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/ui/EmptyState";

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [gkBookmarks, setGkBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookmarks = async () => {
    setLoading(true);

    const [newsResult, gkResult] = await Promise.allSettled([
      api.get("/bookmark"),
      fetchStaticGkBookmarks()
    ]);

    if (newsResult.status === "fulfilled") {
      const payload =
        newsResult.value.data.bookmarks ||
        newsResult.value.data.data ||
        [];
      setBookmarks(Array.isArray(payload) ? payload : []);
      setError("");
    } else {
      setError(
        newsResult.reason?.response?.data?.message ||
          "Could not load your saved articles"
      );
    }

    if (gkResult.status === "fulfilled") {
      setGkBookmarks(gkResult.value.resources || []);
    } else {
      setGkBookmarks([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
              <Sparkles size={12} />
              Saved
            </span>

            <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              My Bookmarks
            </h1>

            <p className="mt-1.5 text-sm text-muted">
              Articles and PDF notes you saved for later revision.
            </p>
          </div>

          {!loading && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Bookmark size={14} />
              {bookmarks.length + gkBookmarks.length} saved item
              {bookmarks.length + gkBookmarks.length === 1 ? "" : "s"}
            </span>
          )}
        </header>

        {error && <ErrorMessage message={error} onRetry={loadBookmarks} />}

        {loading ? (
          <Loading />
        ) : bookmarks.length || gkBookmarks.length ? (
          <div className="space-y-10">
            {bookmarks.length > 0 && (
              <section>
                <h2 className="mb-4 font-display text-lg font-bold text-ink">
                  Current Affairs
                </h2>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {bookmarks.map((item) => (
                    <NewsCard key={item._id} news={item.newsId || item} />
                  ))}
                </div>
              </section>
            )}

            {gkBookmarks.length > 0 && (
              <section id="static-gk" className="scroll-mt-24">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                    <BookOpen size={18} className="text-primary" />
                    Static GK Notes
                  </h2>

                  <Link
                    to="/static-gk"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Browse library
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {gkBookmarks.map((resource) => {
                    const id = resource._id || resource.id;

                    return (
                      <StaticGKResourceCard
                        key={id}
                        resource={resource}
                        bookmarked
                        compact
                        onBookmarkChange={(resourceId, saved) => {
                          if (!saved) {
                            setGkBookmarks((current) =>
                              current.filter(
                                (item) =>
                                  (item._id || item.id) !== resourceId
                              )
                            );
                          }
                        }}
                        onDeleted={(resourceId) =>
                          setGkBookmarks((current) =>
                            current.filter(
                              (item) =>
                                (item._id || item.id) !== resourceId
                            )
                          )
                        }
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        ) : (
          !error && (
            <EmptyState
              icon={<Bookmark size={22} />}
              title="Nothing saved yet"
              text="Save any article or PDF note while reading and it will show up here for quick revision."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    to="/news"
                    className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-fg transition duration-150 hover:brightness-110"
                  >
                    Browse Current Affairs
                  </Link>

                  <Link
                    to="/static-gk"
                    className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-line px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                  >
                    <BookOpen size={15} />
                    Browse Static GK
                  </Link>
                </div>
              }
            />
          )
        )}
      </div>
    </div>
  );
}
