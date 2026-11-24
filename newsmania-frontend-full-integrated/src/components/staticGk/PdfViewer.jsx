import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileWarning,
  Loader2,
  Maximize2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc;

function PageThumbnail({ pdfDocument, pageNumber, active, onSelect }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask = null;

    const render = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);

        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
          scale: Math.max(0.12, 124 / base.width)
        });
        const canvas = canvasRef.current;

        if (!canvas) return;

        const context = canvas.getContext("2d");
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

        renderTask = page.render({
          canvasContext: context,
          viewport,
          transform:
            pixelRatio !== 1
              ? [pixelRatio, 0, 0, pixelRatio, 0, 0]
              : undefined
        });

        await renderTask.promise;
      } catch (error) {
        if (error?.name !== "RenderingCancelledException") {
          console.error("Thumbnail render error:", error);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDocument, pageNumber]);

  return (
    <button
      type="button"
      onClick={() => onSelect(pageNumber)}
      aria-label={`Go to page ${pageNumber}`}
      aria-current={active ? "page" : undefined}
      className={`w-full rounded-[8px] border p-1.5 transition ${
        active
          ? "border-primary bg-primary-soft"
          : "border-transparent hover:border-line hover:bg-bg"
      }`}
    >
      <canvas
        ref={canvasRef}
        className="mx-auto block h-auto max-w-full rounded-[5px] bg-white shadow-sm"
      />
      <span
        className={`mt-1 block text-center text-[10px] font-bold ${
          active ? "text-primary" : "text-muted"
        }`}
      >
        {pageNumber}
      </span>
    </button>
  );
}

export default function PdfViewer({ data, title, onOpenFallback }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pdfDocument, setPdfDocument] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState(100);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width || 0;
      setContainerWidth(Math.max(240, width - 32));
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!data) return undefined;

    let cancelled = false;
    let documentTask = null;

    setLoading(true);
    setError("");
    setPdfDocument(null);
    setNumPages(0);
    setPageNumber(1);
    setPageInput("1");
    setZoom(100);

    const load = async () => {
      try {
        documentTask = getDocument({ data: data.slice() });
        const document = await documentTask.promise;

        if (cancelled) {
          document.destroy();
          return;
        }

        setPdfDocument(document);
        setNumPages(document.numPages);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.name === "PasswordException"
              ? "This PDF is password protected and cannot be previewed."
              : "This PDF could not be rendered in the browser."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      documentTask?.destroy();
    };
  }, [data]);

  useEffect(() => {
    if (!pdfDocument) return undefined;

    let cancelled = false;
    setRendering(true);

    const render = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);

        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        const availableWidth = containerWidth || 720;
        const fitScale = availableWidth / base.width;
        const scale = Math.max(0.2, fitScale * (zoom / 100));
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;

        if (!canvas) return;

        const context = canvas.getContext("2d", { alpha: false });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport,
          transform:
            pixelRatio !== 1
              ? [pixelRatio, 0, 0, pixelRatio, 0, 0]
              : undefined
        });

        await renderTaskRef.current.promise;

        if (!cancelled) setRendering(false);
      } catch (renderError) {
        if (
          renderError?.name !== "RenderingCancelledException" &&
          !cancelled
        ) {
          setError("This page could not be rendered.");
          setRendering(false);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfDocument, pageNumber, zoom, containerWidth]);

  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  useEffect(() => {
    const onKey = (event) => {
      const tag = event.target?.tagName?.toLowerCase();

      if (["input", "textarea", "select"].includes(tag)) return;

      if (event.key === "ArrowLeft") {
        setPageNumber((current) => Math.max(1, current - 1));
      }

      if (event.key === "ArrowRight") {
        setPageNumber((current) => Math.min(numPages || 1, current + 1));
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [numPages]);

  const goToPage = (nextPage) => {
    if (!numPages) return;
    setPageNumber(Math.min(numPages, Math.max(1, nextPage)));
  };

  const jumpToPage = (event) => {
    event.preventDefault();
    goToPage(Number(pageInput) || 1);
  };

  const setZoomValue = (value) =>
    setZoom(Math.min(250, Math.max(50, value)));

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-2xl border border-danger/30 bg-card px-6 text-center">
        <FileWarning size={34} className="text-danger" />
        <h2 className="font-display text-lg font-bold text-ink">
          Preview unavailable
        </h2>
        <p className="max-w-md text-sm leading-6 text-muted">{error}</p>

        {onOpenFallback && (
          <button
            type="button"
            onClick={onOpenFallback}
            className="mt-2 inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-fg transition hover:brightness-110"
          >
            <ExternalLink size={15} />
            Open PDF in a new tab
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-card px-3 py-2.5">
        <button
          type="button"
          onClick={() => goToPage(pageNumber - 1)}
          disabled={pageNumber <= 1}
          aria-label="Previous page"
          className="grid h-9 w-9 place-items-center rounded-[8px] border border-line text-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>

        <form onSubmit={jumpToPage} className="flex items-center gap-1.5">
          <input
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            aria-label="Current page"
            inputMode="numeric"
            className="h-9 w-12 rounded-[7px] border border-line bg-bg text-center text-xs font-bold text-ink outline-none focus:border-primary"
          />
          <span className="text-xs font-semibold text-muted">
            / {numPages || "—"}
          </span>
        </form>

        <button
          type="button"
          onClick={() => goToPage(pageNumber + 1)}
          disabled={!numPages || pageNumber >= numPages}
          aria-label="Next page"
          className="grid h-9 w-9 place-items-center rounded-[8px] border border-line text-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>

        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomValue(zoom - 15)}
            disabled={zoom <= 50}
            aria-label="Zoom out"
            className="grid h-9 w-9 place-items-center rounded-[8px] border border-line text-muted transition hover:border-primary hover:text-primary disabled:opacity-40"
          >
            <ZoomOut size={15} />
          </button>

          <span className="w-11 text-center text-xs font-bold text-ink">
            {zoom}%
          </span>

          <button
            type="button"
            onClick={() => setZoomValue(zoom + 15)}
            disabled={zoom >= 250}
            aria-label="Zoom in"
            className="grid h-9 w-9 place-items-center rounded-[8px] border border-line text-muted transition hover:border-primary hover:text-primary disabled:opacity-40"
          >
            <ZoomIn size={15} />
          </button>

          <button
            type="button"
            onClick={() => setZoom(100)}
            aria-label="Fit page to width"
            title="Fit to width"
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line px-2.5 text-[11px] font-bold text-muted transition hover:border-primary hover:text-primary"
          >
            <Maximize2 size={13} />
            Fit
          </button>
        </div>

        <span className="ml-auto hidden text-[11px] font-semibold text-muted lg:block">
          {title}
        </span>
      </div>

      <div className="flex max-h-[78vh] min-h-[62vh]">
        <aside
          aria-label="Page thumbnails"
          className="hidden w-[150px] shrink-0 overflow-y-auto border-r border-line bg-bg p-2 md:block"
        >
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin text-primary" />
            </div>
          )}

          {pdfDocument &&
            Array.from({ length: numPages }).map((_, index) => (
              <PageThumbnail
                key={index + 1}
                pdfDocument={pdfDocument}
                pageNumber={index + 1}
                active={pageNumber === index + 1}
                onSelect={goToPage}
              />
            ))}
        </aside>

        <div
          ref={containerRef}
          className="relative min-w-0 flex-1 overflow-auto bg-[#E9ECF3] p-4 dark:bg-[#0A0D15]"
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#E9ECF3]/90 text-sm font-semibold text-muted dark:bg-[#0A0D15]/90">
              <Loader2 size={28} className="animate-spin text-primary" />
              Loading PDF...
            </div>
          )}

          <div className="mx-auto w-fit">
            <canvas
              ref={canvasRef}
              className={`block bg-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] ${
                rendering ? "opacity-70" : "opacity-100"
              } transition-opacity`}
            />

            {!loading && !pdfDocument && (
              <div className="grid h-[60vh] w-full place-items-center text-sm text-muted">
                No pages available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
