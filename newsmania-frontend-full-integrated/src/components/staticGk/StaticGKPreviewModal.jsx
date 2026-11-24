import { useEffect, useState } from "react";
import { Download, ExternalLink, FileWarning } from "lucide-react";
import Modal from "../ui/Modal";
import Toast from "../ui/Toast";
import {
  downloadStaticGkResource,
  fetchStaticGkFileBlob,
  formatFileSize
} from "../../api/staticGk";

export default function StaticGKPreviewModal({
  resource,
  open,
  onClose
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState("");

  const id = resource?._id || resource?.id;

  useEffect(() => {
    if (!open || !id) return;

    let cancelled = false;
    let objectUrl = "";

    setLoading(true);
    setError("");
    setUrl("");

    fetchStaticGkFileBlob(id)
      .then((blob) => {
        if (cancelled) return;

        objectUrl = URL.createObjectURL(
          new Blob([blob], { type: "application/pdf" })
        );
        setUrl(objectUrl);
      })
      .catch((requestError) => {
        if (cancelled) return;

        setError(
          requestError.response?.data?.message ||
            "This PDF could not be previewed."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, id]);

  const download = async () => {
    if (!resource || downloading) return;

    setDownloading(true);

    try {
      await downloadStaticGkResource(resource);
      setToast("Download started");
    } catch (requestError) {
      setToast(
        requestError.response?.data?.message ||
          "Could not download this PDF."
      );
    } finally {
      setDownloading(false);
    }
  };

  const openInNewTab = () => {
    if (!url) return;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={resource?.title || "PDF preview"}
        className="max-w-[980px] p-4 sm:p-5"
        footer={
          <>
            <button
              type="button"
              onClick={openInNewTab}
              disabled={!url}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-line bg-card px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExternalLink size={15} />
              Open in new tab
            </button>

            <button
              type="button"
              onClick={download}
              disabled={downloading}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-fg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={15} />
              {downloading ? "Downloading..." : "Download PDF"}
            </button>
          </>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
          {resource?.subject && (
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-primary">
              {resource.subject}
            </span>
          )}

          {resource?.pageCount ? <span>{resource.pageCount} pages</span> : null}
          {resource?.fileSize ? (
            <span>{formatFileSize(resource.fileSize)}</span>
          ) : null}
        </div>

        {loading && (
          <div className="flex h-[60vh] items-center justify-center rounded-xl border border-line bg-bg">
            <div className="flex flex-col items-center gap-3 text-sm font-semibold text-muted">
              <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-primary" />
              Preparing secure preview...
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-6 text-center">
            <FileWarning size={30} className="text-danger" />
            <p className="text-sm font-semibold text-danger">{error}</p>
            <p className="max-w-sm text-xs leading-5 text-muted">
              You can still download the PDF or open the reader page and try
              again.
            </p>
          </div>
        )}

        {!loading && !error && url && (
          <iframe
            src={`${url}#toolbar=1&navpanes=0&view=FitH`}
            title={`Preview of ${resource?.title || "PDF"}`}
            className="h-[60vh] w-full rounded-xl border border-line bg-white"
          />
        )}
      </Modal>

      <Toast
        open={Boolean(toast)}
        message={toast}
        onClose={() => setToast("")}
      />
    </>
  );
}
