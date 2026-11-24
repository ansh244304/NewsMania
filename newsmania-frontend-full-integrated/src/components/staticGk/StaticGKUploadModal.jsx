import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  ImagePlus,
  RefreshCw,
  UploadCloud,
  X
} from "lucide-react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Label from "../ui/Label";
import ProgressBar from "../ui/ProgressBar";
import {
  STATIC_GK_EXAMS,
  STATIC_GK_MAX_FILE_MB,
  STATIC_GK_SUBJECTS,
  formatFileSize,
  updateStaticGk,
  uploadStaticGk
} from "../../api/staticGk";

const emptyForm = {
  title: "",
  description: "",
  subject: "Polity",
  topic: "",
  targetExams: [],
  tags: "",
  published: true,
  featured: false
};

const inputClass =
  "h-11 w-full rounded-[10px] border border-line bg-bg px-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/25";

const validatePdfFile = (file) => {
  if (!file) return "Choose a PDF file to upload.";

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return "Only PDF files are supported.";
  }

  if (file.size > STATIC_GK_MAX_FILE_MB * 1024 * 1024) {
    return `PDF must be ${STATIC_GK_MAX_FILE_MB} MB or smaller.`;
  }

  if (file.size === 0) return "The selected PDF is empty.";

  return "";
};

const validateThumbnail = (file) => {
  if (!file) return "";

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return "Thumbnail must be a PNG, JPEG or WebP image.";
  }

  if (file.size > 2 * 1024 * 1024) {
    return "Thumbnail must be 2 MB or smaller.";
  }

  return "";
};

export default function StaticGKUploadModal({
  open,
  onClose,
  onSaved,
  resource = null
}) {
  const editMode = Boolean(resource?._id || resource?.id);
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const lockRef = useRef(false);

  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!open) return;

    setForm(
      resource
        ? {
            title: resource.title || "",
            description: resource.description || "",
            subject: resource.subject || "Polity",
            topic: resource.topic || "",
            targetExams: resource.targetExams || [],
            tags: Array.isArray(resource.tags)
              ? resource.tags.join(", ")
              : "",
            published: resource.published !== false,
            featured: Boolean(resource.featured)
          }
        : emptyForm
    );

    setFile(null);
    setThumbnail(null);
    setThumbnailPreview("");
    setErrors({});
    setError("");
    setSuccess("");
    setProgress(0);
    setUploading(false);
    lockRef.current = false;

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  }, [open, resource]);

  useEffect(() => {
    if (!thumbnail) {
      setThumbnailPreview("");
      return undefined;
    }

    const url = URL.createObjectURL(thumbnail);
    setThumbnailPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [thumbnail]);

  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const choosePdf = (selected) => {
    const message = validatePdfFile(selected);

    if (message) {
      setFile(null);
      setErrors((current) => ({ ...current, file: message }));

      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selected);
    setErrors((current) => ({ ...current, file: "" }));
    setError("");
    setSuccess("");
  };

  const chooseThumbnail = (selected) => {
    const message = validateThumbnail(selected);

    if (message) {
      setThumbnail(null);
      setErrors((current) => ({ ...current, thumbnail: message }));

      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
      return;
    }

    setThumbnail(selected);
    setErrors((current) => ({ ...current, thumbnail: "" }));
  };

  const toggleExam = (exam) => {
    setForm((current) => ({
      ...current,
      targetExams: current.targetExams.includes(exam)
        ? current.targetExams.filter((item) => item !== exam)
        : [...current.targetExams, exam]
    }));
  };

  const close = () => {
    if (uploading) return;
    onClose?.();
  };

  const validateForm = async () => {
    const next = {};

    if (form.title.trim().length < 3) {
      next.title = "Title must be at least 3 characters.";
    }

    if (!form.subject) {
      next.subject = "Choose a subject.";
    }

    if (!editMode) {
      const fileError = validatePdfFile(file);

      if (fileError) {
        next.file = fileError;
      } else {
        const header = await file
          .slice(0, 1024)
          .text()
          .catch(() => "");

        if (!header.includes("%PDF-")) {
          next.file = "This file does not look like a valid PDF.";
        }
      }
    }

    const thumbnailError = validateThumbnail(thumbnail);

    if (thumbnailError) next.thumbnail = thumbnailError;

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (lockRef.current) return;

    setError("");
    setSuccess("");

    const valid = await validateForm();

    if (!valid) return;

    lockRef.current = true;
    setUploading(true);
    setProgress(0);

    try {
      let response;

      if (editMode) {
        const id = resource._id || resource.id;
        response = await updateStaticGk(id, {
          title: form.title,
          description: form.description,
          subject: form.subject,
          topic: form.topic,
          targetExams: form.targetExams,
          tags: form.tags,
          published: form.published,
          featured: form.featured
        });
      } else {
        const body = new FormData();
        body.append("file", file);
        body.append("title", form.title);
        body.append("description", form.description);
        body.append("subject", form.subject);
        body.append("topic", form.topic);
        body.append("tags", form.tags);
        body.append("published", String(form.published));
        body.append("featured", String(form.featured));

        form.targetExams.forEach((exam) => {
          body.append("targetExams", exam);
        });

        if (thumbnail) body.append("thumbnail", thumbnail);

        response = await uploadStaticGk(body, (event) => {
          if (!event.total) return;

          setProgress(
            Math.min(99, Math.round((event.loaded / event.total) * 100))
          );
        });
      }

      setProgress(100);
      setSuccess(
        editMode
          ? "Resource details updated."
          : "PDF notes uploaded and published."
      );
      lockRef.current = false;
      onSaved?.(response.data.resource);
    } catch (requestError) {
      const details = requestError.response?.data?.errors;

      if (Array.isArray(details) && details.length) {
        setErrors(
          Object.fromEntries(
            details.map((item) => [item.field, item.message])
          )
        );
      }

      setError(
        requestError.response?.data?.message ||
          "The upload failed. Check your connection and try again."
      );
      lockRef.current = false;
    } finally {
      setUploading(false);
    }
  };

  const submitForm = (event) => {
    event.preventDefault();
    submit();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      showClose={!uploading}
      title={editMode ? "Edit PDF notes" : "Upload PDF notes"}
      className="max-w-[760px] p-5 sm:p-6"
      footer={
        success ? (
          <button
            type="button"
            onClick={close}
            className="inline-flex h-11 items-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-fg transition hover:brightness-110"
          >
            Done
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={close}
              disabled={uploading}
              className="inline-flex h-11 items-center rounded-[10px] border border-line bg-card px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="static-gk-upload-form"
              disabled={uploading}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-fg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg/30 border-t-primary-fg" />
              )}
              {uploading
                ? editMode
                  ? "Saving..."
                  : `Uploading ${progress}%`
                : editMode
                  ? "Save changes"
                  : "Upload PDF"}
            </button>
          </>
        )
      }
    >
      <form
        id="static-gk-upload-form"
        onSubmit={submitForm}
        className="space-y-4"
      >
        {!editMode && (
          <div>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                choosePdf(event.dataTransfer.files?.[0]);
              }}
              className={`rounded-xl border-2 border-dashed px-5 py-6 text-center transition ${
                dragging
                  ? "border-primary bg-primary-soft"
                  : errors.file
                    ? "border-danger/50 bg-danger/5"
                    : "border-line bg-bg hover:border-primary/50"
              }`}
            >
              <input
                ref={fileInputRef}
                id="static-gk-pdf"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(event) => choosePdf(event.target.files?.[0])}
              />

              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
                    <FileText size={22} />
                  </span>

                  <div>
                    <p className="break-all text-sm font-bold text-ink">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted">
                      {formatFileSize(file.size)} &middot; PDF ready to upload
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-danger"
                  >
                    <X size={13} />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
                    <UploadCloud size={22} />
                  </span>

                  <p className="text-sm font-bold text-ink">
                    Drag &amp; drop your PDF here
                  </p>

                  <p className="text-xs text-muted">
                    Up to {STATIC_GK_MAX_FILE_MB} MB, PDF only
                  </p>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 inline-flex h-9 items-center rounded-[8px] border border-line bg-card px-3 text-xs font-bold text-ink transition hover:border-primary hover:text-primary"
                  >
                    Browse files
                  </button>
                </div>
              )}
            </div>

            {errors.file && (
              <p className="mt-1.5 text-xs font-semibold text-danger">
                {errors.file}
              </p>
            )}

            {uploading && (
              <div className="mt-3">
                <ProgressBar value={progress} />
                <p className="mt-1.5 text-right text-[11px] font-semibold text-muted">
                  {progress}%
                </p>
              </div>
            )}
          </div>
        )}

        {editMode && (
          <div className="flex items-start gap-3 rounded-xl border border-line bg-bg p-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px] bg-primary-soft text-primary">
              <FileText size={18} />
            </span>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">
                {resource.originalFileName || "Stored PDF"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Metadata editing only. Delete and re-upload to replace the
                stored file.
              </p>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="static-gk-title">Title</Label>
          <Input
            id="static-gk-title"
            value={form.title}
            error={Boolean(errors.title)}
            onChange={(event) => set("title", event.target.value)}
            placeholder="e.g. Indian Polity — Constitutional Bodies"
            maxLength={180}
          />
          {errors.title && (
            <p className="mt-1.5 text-xs font-semibold text-danger">
              {errors.title}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="static-gk-description">Description</Label>
          <textarea
            id="static-gk-description"
            rows={3}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={3000}
            placeholder="What does this resource cover?"
            className={`${inputClass} h-auto resize-y py-2.5`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="static-gk-subject">Subject</Label>
            <select
              id="static-gk-subject"
              value={form.subject}
              onChange={(event) => set("subject", event.target.value)}
              className={inputClass}
            >
              {STATIC_GK_SUBJECTS.map((subject) => (
                <option key={subject}>{subject}</option>
              ))}
            </select>
            {errors.subject && (
              <p className="mt-1.5 text-xs font-semibold text-danger">
                {errors.subject}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="static-gk-topic">Topic or chapter</Label>
            <Input
              id="static-gk-topic"
              value={form.topic}
              onChange={(event) => set("topic", event.target.value)}
              placeholder="e.g. Fundamental Rights"
              maxLength={160}
            />
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
            Target exams
          </legend>

          <div className="flex flex-wrap gap-2">
            {STATIC_GK_EXAMS.map((exam) => {
              const selected = form.targetExams.includes(exam);

              return (
                <button
                  key={exam}
                  type="button"
                  onClick={() => toggleExam(exam)}
                  aria-pressed={selected}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                    selected
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-line bg-bg text-muted hover:border-primary hover:text-primary"
                  }`}
                >
                  {exam}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <Label htmlFor="static-gk-tags">Tags and keywords</Label>
          <Input
            id="static-gk-tags"
            value={form.tags}
            onChange={(event) => set("tags", event.target.value)}
            placeholder="constitution, articles, revision (comma separated)"
          />
        </div>

        {!editMode && (
          <div>
            <Label htmlFor="static-gk-thumbnail">Thumbnail (optional)</Label>

            <div className="flex items-center gap-3">
              <input
                ref={thumbnailInputRef}
                id="static-gk-thumbnail"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) =>
                  chooseThumbnail(event.target.files?.[0])
                }
              />

              {thumbnailPreview ? (
                <img
                  src={thumbnailPreview}
                  alt="Selected thumbnail preview"
                  className="h-16 w-24 rounded-[9px] border border-line object-cover"
                />
              ) : (
                <span className="grid h-16 w-24 place-items-center rounded-[9px] border border-dashed border-line bg-bg text-muted">
                  <ImagePlus size={20} />
                </span>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="inline-flex h-9 items-center rounded-[8px] border border-line bg-card px-3 text-xs font-bold text-ink transition hover:border-primary hover:text-primary"
                >
                  {thumbnail ? "Change image" : "Choose image"}
                </button>

                {thumbnail && (
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnail(null);
                      if (thumbnailInputRef.current) {
                        thumbnailInputRef.current.value = "";
                      }
                    }}
                    className="ml-2 text-xs font-bold text-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {errors.thumbnail && (
              <p className="mt-1.5 text-xs font-semibold text-danger">
                {errors.thumbnail}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) => set("published", event.target.checked)}
              className="h-4 w-4 accent-[rgb(var(--primary))]"
            />
            Published
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => set("featured", event.target.checked)}
              className="h-4 w-4 accent-[rgb(var(--primary))]"
            />
            Featured resource
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-[12px] border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={submit}
              disabled={uploading}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-[7px] border border-danger/40 px-2.5 text-xs font-bold disabled:opacity-50"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-[12px] border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success"
          >
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}
      </form>
    </Modal>
  );
}
