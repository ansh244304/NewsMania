import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import api from "../../api/api";

const inputClass =
  "h-11 w-full rounded-[10px] border border-line bg-bg px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25";

const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted";

const emptyForm = {
  question: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  explanation: "",
  difficulty: "Medium",
  category: "Current Affairs"
};

const difficultyClass = (level) => {
  const value = (level || "").toLowerCase();

  if (value === "easy") return "bg-success/10 text-success";
  if (value === "hard") return "bg-danger/10 text-danger";
  return "bg-primary-soft text-primary";
};

export default function AdminMCQ() {
  const [tab, setTab] = useState("manual");

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="mb-5 font-display text-3xl font-extrabold tracking-tight text-ink">
          MCQs
        </h1>

        <div className="mb-6 flex flex-wrap gap-1 rounded-[12px] border border-line bg-card p-1">
          {[
            ["manual", "Write Manually"],
            ["ai", "AI Generator"]
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex h-10 flex-1 items-center justify-center rounded-[9px] px-4 text-sm font-semibold transition duration-150 sm:flex-none ${
                tab === key
                  ? "bg-primary text-primary-fg"
                  : "text-muted hover:bg-primary-soft hover:text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "manual" ? <ManualMCQ /> : <AIGenerator />}
      </div>
    </div>
  );
}

/* ============================================================
   MANUAL MCQ WRITER
   ============================================================ */

function ManualMCQ() {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(true);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setOption = (index, value) =>
    setForm((f) => {
      const options = [...f.options];
      const previous = options[index];
      options[index] = value;

      const correctAnswer =
        f.correctAnswer === previous ? value : f.correctAnswer;

      return { ...f, options, correctAnswer };
    });

  const loadManual = () =>
    api
      .get("/admin/mcqs", { params: { source: "manual", limit: 50 } })
      .then(({ data }) => setMcqs(data.data?.mcqs || []))
      .catch(() => setMcqs([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadManual();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setOk("");

    try {
      await api.post("/admin/mcqs", form);

      setForm(emptyForm);
      setOk("MCQ saved. It will be mixed into the daily quiz.");

      await loadManual();
    } catch (x) {
      setErr(x.response?.data?.message || "Could not save the MCQ.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this MCQ?")) return;

    try {
      await api.delete(`/admin/mcqs/${id}`);
      setMcqs((list) => list.filter((item) => item._id !== id));
    } catch (x) {
      setErr(x.response?.data?.message || "Could not delete the MCQ.");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <form
        onSubmit={save}
        className="space-y-4 rounded-2xl border border-line bg-card p-5 sm:p-6"
      >
        <h2 className="font-display text-lg font-bold text-ink">
          Write an MCQ
        </h2>

        <label className="block">
          <span className={labelClass}>Question</span>
          <textarea
            rows={3}
            value={form.question}
            onChange={(e) => set("question", e.target.value)}
            className={`${inputClass} h-auto py-2.5`}
            placeholder="Which body released the latest GDP figures?"
          />
        </label>

        <div className="space-y-3">
          <span className={labelClass}>Options</span>

          {form.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2.5">
              <input
                type="radio"
                name="correctAnswer"
                aria-label={`Mark option ${index + 1} correct`}
                checked={form.correctAnswer === option && option !== ""}
                onChange={() => set("correctAnswer", option)}
                disabled={!option}
                className="h-4 w-4 shrink-0 accent-[rgb(var(--primary))]"
              />

              <input
                value={option}
                onChange={(e) => setOption(index, e.target.value)}
                className={inputClass}
                placeholder={`Option ${index + 1}`}
              />
            </div>
          ))}

          <p className="text-xs text-muted">
            Select the radio button next to the correct option.
          </p>
        </div>

        <label className="block">
          <span className={labelClass}>Explanation</span>
          <textarea
            rows={2}
            value={form.explanation}
            onChange={(e) => set("explanation", e.target.value)}
            className={`${inputClass} h-auto py-2.5`}
            placeholder="Shown to the user after submitting."
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Difficulty</span>
            <select
              value={form.difficulty}
              onChange={(e) => set("difficulty", e.target.value)}
              className={inputClass}
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Category</span>
            <input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        {err && (
          <div
            role="alert"
            className="rounded-[14px] border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
          >
            {err}
          </div>
        )}

        {ok && (
          <div className="rounded-[14px] border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
            {ok}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-fg transition duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save MCQ"}
        </button>
      </form>

      <div className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink">
          Manual MCQs
          <span className="ml-2 text-sm font-semibold text-muted">
            {mcqs.length}
          </span>
        </h2>

        {loading && <p className="text-sm text-muted">Loading...</p>}

        {!loading && mcqs.length === 0 && (
          <p className="rounded-2xl border border-line bg-card p-5 text-sm text-muted">
            No manual MCQs yet. Write one to feed the daily quiz.
          </p>
        )}

        {mcqs.map((x) => (
          <div
            key={x._id}
            className="rounded-2xl border border-line bg-card p-5"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${difficultyClass(
                  x.difficulty
                )}`}
              >
                {x.difficulty}
              </span>

              <span className="rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-bold text-muted">
                {x.category}
              </span>

              <button
                type="button"
                onClick={() => remove(x._id)}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-muted transition hover:bg-danger/10 hover:text-danger"
                aria-label="Delete MCQ"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <h3 className="font-bold leading-6 text-ink">{x.question}</h3>

            <div className="mt-3 space-y-2">
              {x.options.map((o) => (
                <div
                  key={o}
                  className={`rounded-[10px] border px-3.5 py-2.5 text-sm ${
                    o === x.correctAnswer
                      ? "border-success/40 bg-success/10 font-semibold text-success"
                      : "border-line bg-bg text-ink"
                  }`}
                >
                  {o}
                </div>
              ))}
            </div>

            {x.explanation && (
              <p className="mt-3 text-sm text-muted">{x.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   AI GENERATOR
   ============================================================ */

function AIGenerator() {
  const [n, setN] = useState([]);
  const [id, setId] = useState("");
  const [q, setQ] = useState([]);
  const [num, setNum] = useState(5);
  const [difficulty, setDifficulty] = useState("Medium");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get("/news", { params: { page: 1, limit: 100 } })
      .then(({ data }) => setN(data.news || data.data || []))
      .catch(() => setN([]));
  }, []);

  const load = () =>
    id &&
    api
      .get(`/mcq/news/${id}`)
      .then(({ data }) => setQ(data.data?.mcqs || []));

  const gen = async () => {
    setBusy(true);
    setErr("");

    try {
      await api.post(`/mcq/news/${id}/generate`, {
        numberOfQuestions: num,
        difficulty,
        regenerate: true
      });

      await load();
    } catch (x) {
      setErr(x.response?.data?.message || "Could not generate MCQs.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-line bg-card p-5 sm:grid-cols-3 sm:p-6">
        <label className="block sm:col-span-3">
          <span className={labelClass}>News</span>
          <select
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setQ([]);
            }}
            className={inputClass}
          >
            <option value="">Select news</option>
            {n.map((x) => (
              <option key={x._id} value={x._id}>
                {x.title.slice(0, 70)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelClass}>Questions</span>
          <input
            type="number"
            min="1"
            max="10"
            value={num}
            onChange={(e) => setNum(+e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className={inputClass}
          >
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-fg transition duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!id || busy}
            onClick={gen}
          >
            {busy ? "Generating..." : "Generate MCQs"}
          </button>
        </div>
      </div>

      {err && (
        <div
          role="alert"
          className="mt-4 rounded-[14px] border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
        >
          {err}
        </div>
      )}

      <div className="mt-5 space-y-4">
        {q.map((x, i) => (
          <div
            className="rounded-2xl border border-line bg-card p-5"
            key={x._id}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
                Question {i + 1}
              </span>

              {x.difficulty && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${difficultyClass(
                    x.difficulty
                  )}`}
                >
                  {x.difficulty}
                </span>
              )}
            </div>

            <h3 className="font-bold leading-6 text-ink">{x.question}</h3>

            <div className="mt-3 space-y-2">
              {x.options.map((o) => (
                <div
                  className="rounded-[10px] border border-line bg-bg px-3.5 py-2.5 text-sm text-ink"
                  key={o}
                >
                  {o}
                </div>
              ))}
            </div>

            {x.explanation && (
              <p className="mt-3 text-sm text-muted">{x.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
