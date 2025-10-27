import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  Check,
  X,
} from "lucide-react";

/* =========================
   TYPES
========================= */
export type AuditLog = {
  id: number;
  timestamp: string | null;
  user_id: string | null;
  user_name?: string | null;
  action: string;
  ok: boolean;
  method: string | null;
  path: string | null;
  status_code: number | null;
  ip: string | null;
  user_agent: string | null;
  details: unknown | null; // JSON or string
};

export type AuditListResponse = {
  items: AuditLog[];
  total: number;
};

/* =========================
   CONFIG
========================= */
// Podesi na svoj FastAPI endpoint
const API_URL = "http://127.0.0.1:8000/api/audit-logs";

/* =========================
   UTILS
========================= */
// Prikaži lokalno vrijeme. Ako ISO nema Z/offset, tretiramo ga kao UTC.
const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const hasTZ = /[zZ]|[+\-]\d\d:\d\d$/.test(iso);
  const s = hasTZ ? iso : iso + "Z";
  const d = new Date(s);
  return d.toLocaleString();
};

function useDebouncedValue<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function tryStringify(v: unknown) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState] as const;
}

function getProjectName(details: unknown): string | undefined {
  if (!details) return undefined;
  let obj: any = details;
  if (typeof obj === "string") {
    try { obj = JSON.parse(obj); } catch { return undefined; }
  }
  if (!obj || typeof obj !== "object") return undefined;
  if (obj.project_name) return obj.project_name as string;
  if (obj.project_id != null) return `#${obj.project_id}`;
  return undefined;
}



/* =========================
   UI HELPERS
========================= */
function StatusBadge({ code }: { code?: number | null }) {
  if (code == null) return null;
  const c = Number(code);
  let cls = "text-gray-700 bg-gray-100 border-gray-200";
  if (c >= 200 && c < 300) cls = "text-emerald-700 bg-emerald-50 border-emerald-200";
  else if (c >= 400 && c < 500)
    cls = "text-amber-700 bg-amber-50 border-amber-200";
  else if (c >= 500) cls = "text-rose-700 bg-rose-50 border-rose-200";
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${cls}`}>{c}</span>
  );
}

// Mapiranje tehničkog action koda u njemački opis
function actionLabel(action: string) {
  const MAP: Record<string, string> = {
    "auth.login": "Benutzeranmeldung",
    "auth.logout": "Benutzer abgemeldet",
    "task.create": "Task angelegt",
    "task.update": "Task aktualisiert",
    "task.delete": "Task gelöscht",
    "task.bulk.assign_sub": "Subunternehmen den Aufgaben zugewiesen",
    "processmodel.update": "Prozessmodell aktualisiert",
    "user.create": "Benutzer angelegt",
    "user.update": "Benutzer aktualisiert",
    "user.delete": "Benutzer gelöscht",
  };
  if (MAP[action]) return MAP[action];
  // fallback: tehnički kod „uljepšaj”
  return action
    .replace(/\./g, " → ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function DetailsCell({ value }: { value: unknown }) {
  if (value == null) return null;

  let obj: any = value;
  if (typeof value === "string") {
    try { obj = JSON.parse(value); } catch { /* raw string */ }
  }

  if (typeof obj !== "object" || obj === null) {
    return (
      <details>
        <summary className="cursor-pointer select-none text-xs text-gray-600">Rohdaten</summary>
        <pre className="bg-gray-50 p-2 rounded border overflow-auto max-h-64 whitespace-pre-wrap text-xs">
          {String(value)}
        </pre>
      </details>
    );
  }

  const loc = obj.location as any;
  const locStr = loc
    ? [loc?.bauteil, loc?.stiege, loc?.ebene, loc?.top].filter(Boolean).join(" • ")
    : null;

  const subName = obj.sub_name as string | undefined;
  const subId = obj.sub_id as number | string | undefined;
  const tasks: Array<{id:number|string; name?:string; location?:string}> = Array.isArray(obj.tasks) ? obj.tasks : [];

  const changes = (obj.changes as Record<string, any>) || undefined;

  const labelMap: Record<string, string> = {
    start_soll: "Start (Soll)",
    end_soll: "Ende (Soll)",
    start_ist: "Start (Ist)",
    end_ist: "Ende (Ist)",
    status: "Status",
    beschreibung: "Beschreibung",
  };
  const show = (val: any) =>
    val === null || val === undefined || val === "" ? "–" :
    typeof val === "object" ? tryStringify(val) : String(val);

  // „ostatak“ RAW-a (osim polja koja posebno renderamo)
  const known = new Set(["task_id", "task_name", "location", "changes"]);
  const restEntries = Object.entries(obj).filter(([k]) => !known.has(k));

  return (
    <div className="space-y-2">
      {(obj.task_id || obj.task_name) && (
        <div className="text-xs">
          <span className="text-gray-500">Task:</span>{" "}
          <b>{obj.task_id}</b>
          {obj.task_name ? <span> — {obj.task_name}</span> : null}
          {locStr ? <span> ({locStr})</span> : null}
        </div>
      )}

      {/* Sve pripremljene (strukturirane) detalje skupimo u padajući blok */}
      {(changes || restEntries.length > 0) && (
        <details>
          <summary className="cursor-pointer select-none text-xs text-gray-600">
            Strukturierte Details
          </summary>
          {(subId || subName) && (
            <div className="text-xs border rounded p-2 bg-white">
              <span className="text-gray-500">Subunternehmen:</span>{" "}
              <b>{subName || "—"}</b>
              {subId ? <span className="text-gray-400"> (#{subId})</span> : null}
            </div>
          )}

          {tasks.length > 0 && (
            <div className="text-xs border rounded p-2 bg-white">
              <div className="mb-1 text-gray-500">Zugewiesene Aufgaben:</div>
              <div className="space-y-1">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <code className="text-[11px] bg-gray-50 border rounded px-1">{t.id}</code>
                    <span className="font-medium">{t.name || ""}</span>
                    {t.location ? <span className="text-gray-500">({t.location})</span> : null}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-1 space-y-2">
            {changes && (
              <div className="text-xs bg-gray-50 border rounded p-2 max-h-48 overflow-auto">
                {Object.entries(changes).map(([k, v]) => {
                  const prettyKey = labelMap[k] ?? k;
                  const isObj = v !== null && typeof v === "object";
                  const hasDiffKeys = isObj && ("old" in (v as any) || "new" in (v as any));
                  if (hasDiffKeys) {
                    const oldVal = (v as any).old;
                    const newVal = (v as any).new;
                    const changed = show(oldVal) !== show(newVal);
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <code className="text-[11px] px-1 rounded bg-white border min-w-[120px] text-right">
                          {prettyKey}
                        </code>
                        <span className="line-through opacity-70">{show(oldVal)}</span>
                        <span>→</span>
                        <b className={changed ? "text-rose-700" : ""}>{show(newVal)}</b>
                      </div>
                    );
                  }
                  // fallback: backend šalje samo NOVU vrijednost => ne znamo da li je zaista promijenjeno
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <code className="text-[11px] px-1 rounded bg-white border min-w-[120px] text-right">
                          {prettyKey}
                        </code>
                        <span>→</span>
                        <b>{show(v)}</b>
                      </div>
                    );
                  
                })}
              </div>
            )}

            {restEntries.length > 0 && (
              <div className="border rounded bg-gray-50 max-h-64 overflow-auto">
                <table className="w-full text-[11px]">
                  <tbody>
                    {restEntries.map(([k, v]) => (
                      <tr key={k} className="border-b last:border-0">
                        <td className="px-2 py-1 align-top text-gray-500 whitespace-nowrap">{k}</td>
                        <td className="px-2 py-1">
                          {typeof v === "object" ? (
                            <pre className="whitespace-pre-wrap">{tryStringify(v)}</pre>
                          ) : (
                            String(v)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>
      )}

      {/* RAW JSON kao zaseban padajući blok sa stručnijim nazivom */}
      <details>
        <summary className="cursor-pointer select-none text-xs text-gray-600">Rohdaten</summary>
        <pre className="bg-gray-50 p-2 rounded border overflow-auto max-h-64 whitespace-pre-wrap text-[11px]">
          {tryStringify(obj)}
        </pre>
      </details>
    </div>
  );
}



/* =========================
   MAIN
========================= */
export default function AuditLogViewer() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useLocalStorage<number>(
    "audit.pageSize",
    20
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Filters
  const [method, setMethod] = useLocalStorage<string>("audit.method", "");
  const [path, setPath] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [action, setAction] = useLocalStorage<string>("audit.action", "");
  const [userId, setUserId] = useState<string>("");
  const [ok, setOk] = useLocalStorage<string>("audit.ok", ""); // "", "true", "false"

  const debouncedQ = useDebouncedValue(q);
  const debouncedPath = useDebouncedValue(path);
  const debouncedAction = useDebouncedValue(action);
  const debouncedUser = useDebouncedValue(userId);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("page_size", String(pageSize));
    if (method) p.set("method", method);
    if (debouncedPath) p.set("path", debouncedPath);
    if (status) p.set("status_code", status);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (debouncedQ) p.set("q", debouncedQ);
    if (debouncedAction) p.set("action", debouncedAction);
    if (debouncedUser) p.set("user_id", debouncedUser);
    if (ok) p.set("ok", ok);
    return p.toString();
  }, [
    page,
    pageSize,
    method,
    debouncedPath,
    status,
    from,
    to,
    debouncedQ,
    debouncedAction,
    debouncedUser,
    ok,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function fetchData(signal?: AbortSignal) {
    setLoading(true);
    setError(undefined);
    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("auth_token") || undefined;
      const res = await fetch(`${API_URL}?${query}`, {
        signal,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AuditListResponse = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
        setError(e?.message || "Unbekannter Fehler");
      }
    } finally {
      setLoading(false);
    }
  }

  // initial + on query change
  useEffect(() => {
    const ctrl = new AbortController();
    fetchData(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      const ctrl = new AbortController();
      fetchData(ctrl.signal);
      // safety cut-off
      setTimeout(() => ctrl.abort(), 14000);
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  function resetFilters() {
    setMethod("");
    setPath("");
    setStatus("");
    setFrom("");
    setTo("");
    setQ("");
    setAction("");
    setUserId("");
    setOk("");
    setPage(1);
  }

  async function exportCSV() {
    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("auth_token") || undefined;

      // 1) Preuzmi sve redove unutar razumne granice (prilagodi po potrebi)
      const p = new URLSearchParams(query);
      p.set("page", "1");
      p.set("page_size", "10000");

      const res = await fetch(`${API_URL}?${p.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: AuditListResponse = await res.json();
      const rows = data.items ?? [];

      // Dodali smo user_name u CSV
      const headers = [
        "id",
        "timestamp",
        "user_id",
        "user_name",
        "action",
        "ok",
        "method",
        "path",
        "status_code",
        "ip",
        "user_agent",
        "details",
      ] as const;

      // 2) CSV build (CRLF; escape dvostruke navodnike)
      const lines: string[] = [];
      lines.push(headers.join(","));
      for (const r of rows) {
        const cols = headers.map((h) => {
          // @ts-ignore
          let v = r[h as keyof AuditLog] as any;
          if (h === "timestamp") v = fmtDate(r.timestamp);
          if (h === "details") v = tryStringify(r.details);
          if (typeof v === "boolean") v = v ? "true" : "false";
          if (v == null) v = "";
          const s = String(v).replaceAll('"', '""');
          return `"${s}"`;
        });
        lines.push(cols.join(","));
      }
      const csv = "\ufeff" + lines.join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_logs_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("CSV Export fehlgeschlagen.");
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Audit-Protokoll</h1>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-2xl shadow hover:shadow-md border">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-Refresh
              </label>

              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-2xl shadow hover:shadow-md border"
                title="CSV exportieren"
              >
                <Download size={16} />
                CSV
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="bg-white border rounded-2xl shadow-sm">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Filter size={16} />
                <span className="text-sm font-medium">Filter</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const ctrl = new AbortController();
                    fetchData(ctrl.signal);
                    setTimeout(() => ctrl.abort(), 10000);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-2xl shadow hover:shadow-md border"
                  title="Neu laden"
                >
                  <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                  Reload
                </button>
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 bg-white rounded-2xl shadow hover:shadow-md border"
                  title="Filter zurücksetzen"
                >
                  Zurücksetzen
                </button>
              </div>
            </div>
            <div className="p-3 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Suchen</label>
                <div className="flex items-center gap-2 border rounded-xl px-2">
                  <Search size={16} className="text-gray-400" />
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Pfad, Benutzer…"
                    className="w-full py-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Aktion</label>
                <input
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setPage(1);
                  }}
                  className="border rounded-xl px-2 py-2 w-full"
                  placeholder="z.B. task.update"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">User ID</label>
                <input
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    setPage(1);
                  }}
                  className="border rounded-xl px-2 py-2 w-full"
                  placeholder="z.B. 42"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">OK / ERR</label>
                <select
                  value={ok}
                  onChange={(e) => {
                    setOk(e.target.value);
                    setPage(1);
                  }}
                  className="border rounded-xl px-2 py-2 w-full"
                >
                  <option value="">Alle</option>
                  <option value="true">OK</option>
                  <option value="false">ERR</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500">Methode</label>
                <select
                  value={method}
                  onChange={(e) => {
                    setMethod(e.target.value);
                    setPage(1);
                  }}
                  className="border rounded-xl px-2 py-2 w-full"
                >
                  <option value="">Alle</option>
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500">Statuscode</label>
                <input
                  type="number"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="border rounded-xl px-2 py-2 w-full"
                  placeholder="z.B. 200"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Pfad</label>
                <input
                  value={path}
                  onChange={(e) => {
                    setPath(e.target.value);
                    setPage(1);
                  }}
                  className="border rounded-xl px-2 py-2 w-full"
                  placeholder="/api/tasks/…"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Von</label>
                <input
                  type="datetime-local"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                  className="border rounded-xl px-2 py-2 w-full"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Bis</label>
                <input
                  type="datetime-local"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                  className="border rounded-xl px-2 py-2 w-full"
                />
              </div>
            </div>

            {error && (
              <div className="px-3 pb-3">
                <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-xl p-3 text-sm">
                  Fehler: {error}
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white border rounded-2xl shadow-sm overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Datum/Uhrzeit</th>
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Aktion</th>
                  <th className="text-left p-3 font-medium">Projekt</th>
                  <th className="text-left p-3 font-medium">OK</th>
                  <th className="text-left p-3 font-medium">Methode</th>
                  <th className="text-left p-3 font-medium">Pfad</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">IP</th>
                  <th className="text-left p-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-3 whitespace-nowrap">
                      {fmtDate(r.timestamp)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {r.user_name || r.user_id || ""}
                    </td>

                    {/* NOVO: 2 linije – kod + opis */}
                    <td className="p-3 whitespace-nowrap" title={r.action}>
                      <div className="leading-tight">
                        <div className="font-mono text-sm">{r.action}</div>
                        <div className="text-xs text-gray-500">
                          {actionLabel(r.action)}
                        </div>
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {getProjectName(r.details) || "–"}
                    </td>


                    <td className="p-3 whitespace-nowrap">
                      {r.ok ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <Check size={14} />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600">
                          <X size={14} />
                          ERR
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">{r.method}</td>
                    <td className="p-3">{r.path}</td>
                    <td className="p-3 whitespace-nowrap">
                      <StatusBadge code={r.status_code ?? undefined} />
                    </td>
                    <td className="p-3 whitespace-nowrap">{r.ip ?? ""}</td>

                    <td className="p-3">
                      <DetailsCell value={r.details} />
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-gray-500">
                      Keine Daten
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Footer / Pagination */}
            <div className="p-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                {loading && <RefreshCcw size={16} className="animate-spin" />}
                <span className="text-xs">
                  {total} Einträge • Seite {page} / {totalPages}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border rounded-xl px-2 py-2"
                  title="Seitengröße"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} / Seite
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-2 px-3 py-2 bg-white rounded-2xl shadow hover:shadow-md border disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-sm">
                    {page} / {totalPages}
                  </div>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-2 px-3 py-2 bg-white rounded-2xl shadow hover:shadow-md border disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
