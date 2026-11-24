import api, { API_BASE_URL } from "./api";

export const STATIC_GK_SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "General Science",
  "Environment",
  "Art & Culture",
  "Schemes",
  "International Relations",
  "Defence",
  "Miscellaneous"
];

export const STATIC_GK_EXAMS = [
  "UPSC",
  "SSC",
  "Banking",
  "Railway",
  "Defence",
  "State PCS"
];

export const STATIC_GK_SORTS = [
  { value: "latest", label: "Latest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "title", label: "Title A-Z" },
  { value: "popular", label: "Most Downloaded" }
];

export const STATIC_GK_MAX_FILE_MB = Number(
  import.meta.env.VITE_STATIC_GK_MAX_FILE_MB || 25
);

export const formatFileSize = (bytes) => {
  const value = Number(bytes);

  if (!Number.isFinite(value) || value <= 0) return "Size unknown";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatResourceDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

export const staticGkAssetUrl = (path) => {
  if (!path) return "";

  return `${API_BASE_URL.replace(/\/$/, "")}${
    path.startsWith("/") ? path : `/${path}`
  }`;
};

export const fetchStaticGkResources = async (params = {}, config = {}) => {
  const { data } = await api.get("/static-gk", { params, ...config });
  return data;
};

export const fetchStaticGkResource = async (id) => {
  const { data } = await api.get(`/static-gk/${id}`);
  return data;
};

export const fetchStaticGkBookmarks = async () => {
  const { data } = await api.get("/static-gk/bookmarks");
  return data;
};

export const addStaticGkBookmark = (id) =>
  api.post(`/static-gk/${id}/bookmark`);

export const removeStaticGkBookmark = (id) =>
  api.delete(`/static-gk/${id}/bookmark`);

export const uploadStaticGk = (formData, onUploadProgress) =>
  api.post("/static-gk/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress
  });

export const updateStaticGk = (id, payload) =>
  api.put(`/static-gk/${id}`, payload);

export const deleteStaticGk = (id) => api.delete(`/static-gk/${id}`);

export const fetchStaticGkFileBlob = async (id, download = false) => {
  const { data } = await api.get(`/static-gk/${id}/file`, {
    params: download ? { download: 1 } : {},
    responseType: "blob"
  });

  return data;
};

export const downloadStaticGkResource = async (resource) => {
  const id = resource._id || resource.id;
  const blob = await fetchStaticGkFileBlob(id, true);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName =
    resource.originalFileName ||
    `${String(resource.title || "static-gk-notes")
      .replace(/[^\w.-]+/g, "-")
      .slice(0, 80)}.pdf`;

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
};
