import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { getRoleFromToken } from "../utils/auth";

type LogRow = {
    id: number;
    ts: string;
    user_id: number | null;
    action: string;
    object_type: string | null;
    object_id: number | null;
    object_ids: string | null;
    success: number;
    status_code: number | null;
    ip: string | null;
    user_agent: string | null;
    method: string | null;
    path: string | null;
    request_id: string | null;
    meta: string | null;
  
    // ⬇️ polja koja dodaje backend u /audit-logs
    user_name?: string | null;
    project_name?: string | null;
    task_title?: string | null;
    task_structure?: string | null;
  };
  

export default function Protokoll() {
  const isAdmin = getRoleFromToken() === "admin";
  const [items, setItems] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sort, setSort] = useState("-ts");
  const [loading, setLoading] = useState(false);

  // filteri
  const [f, setF] = useState({
    user_id: "",
    action: "",
    method: "",
    path: "",
    success: "all", // all/ok/fail
    object_type: "",
    object_id: "",
    request_id: "",
    status_min: "",
    status_max: "",
    date_from: "",
    date_to: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: pageSize,
        sort,
      };
      if (f.user_id) params.user_id = Number(f.user_id);
      if (f.action) params.action = f.action;
      if (f.method) params.method = f.method;
      if (f.path) params.path = f.path;
      if (f.success === "ok") params.success = true;
      if (f.success === "fail") params.success = false;
      if (f.object_type) params.object_type = f.object_type;
      if (f.object_id) params.object_id = Number(f.object_id);
      if (f.request_id) params.request_id = f.request_id;
      if (f.status_min) params.status_min = Number(f.status_min);
      if (f.status_max) params.status_max = Number(f.status_max);
      if (f.date_from) params.date_from = f.date_from;
      if (f.date_to) params.date_to = f.date_to;

      const r = await api.get("/audit-logs", { params, meta: { showLoader: false } });
      setItems(r.data.items ?? []);
      setTotal(r.data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sort]); // filtere ručno “Apply”

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Protokoll</h1>
        <div className="mt-4 rounded border bg-red-50 text-red-700 p-4">
          Kein Zugriff. Nur Administratoren dürfen diese Seite sehen.
        </div>
      </div>
    );
  }

  const fromToStr = total > 0
    ? `${(page-1)*pageSize+1}–${Math.min(page*pageSize, total)} von ${total.toLocaleString("de-AT")}`
    : "0";

  const badge = (ok: number) => (
    <span className={`px-2 py-0.5 rounded-full text-xs ${ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}>
      {ok ? "OK" : "Fehler"}
    </span>
  );

  const downloadCsv = async () => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k,v]) => {
      if (!v || v === "all") return;
      params.append(k === "path" ? "path" : k, String(v));
    });
    params.append("sort", sort);
    params.append("page", "1");
    params.append("page_size", String(pageSize));
    params.append("format", "csv");
    const url = `/audit-logs?${params.toString()}`;
    const r = await api.get(url, { responseType: "blob" });
    const blob = new Blob([r.data], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "audit.csv";
    a.click();
  };

  const fmt = (iso: string) => {
    // "2025-09-22 13:03:12" ili ISO → "22.09.2025 13:03:12"
    const s = iso?.replace("T"," ").slice(0,19);
    const [d,t] = s.split(" ");
    const [Y,M,D] = d.split("-");
    return `${D}.${M}.${Y} ${t}`;
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Protokoll</h1>
        <div className="text-sm text-slate-600">{fromToStr}</div>
      </div>

      {/* Filteri */}
      <div className="grid md:grid-cols-4 lg:grid-cols-6 gap-2 mb-3">
        <input className="border rounded px-2 py-1" placeholder="User-ID"      value={f.user_id} onChange={e=>setF({...f,user_id:e.target.value})} />
        <input className="border rounded px-2 py-1" placeholder="Action"       value={f.action} onChange={e=>setF({...f,action:e.target.value})} />
        <select className="border rounded px-2 py-1" value={f.method} onChange={e=>setF({...f,method:e.target.value})}>
          <option value="">Methode</option>
          {["GET","POST","PUT","PATCH","DELETE"].map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <input className="border rounded px-2 py-1" placeholder="Pfad enthält" value={f.path} onChange={e=>setF({...f,path:e.target.value})} />
        <select className="border rounded px-2 py-1" value={f.success} onChange={e=>setF({...f,success:e.target.value})}>
          <option value="all">Alle</option>
          <option value="ok">Nur OK</option>
          <option value="fail">Nur Fehler</option>
        </select>
        <input className="border rounded px-2 py-1" placeholder="Objekt-Typ"   value={f.object_type} onChange={e=>setF({...f,object_type:e.target.value})} />
        <input className="border rounded px-2 py-1" placeholder="Objekt-ID"    value={f.object_id} onChange={e=>setF({...f,object_id:e.target.value})} />
        <input className="border rounded px-2 py-1" placeholder="Request-ID"   value={f.request_id} onChange={e=>setF({...f,request_id:e.target.value})} />
        <input type="date" className="border rounded px-2 py-1" value={f.date_from} onChange={e=>setF({...f,date_from:e.target.value})} />
        <input type="date" className="border rounded px-2 py-1" value={f.date_to}   onChange={e=>setF({...f,date_to:e.target.value})} />
        <input className="border rounded px-2 py-1" placeholder="Status ≥"     value={f.status_min} onChange={e=>setF({...f,status_min:e.target.value})} />
        <input className="border rounded px-2 py-1" placeholder="Status ≤"     value={f.status_max} onChange={e=>setF({...f,status_max:e.target.value})} />
        <button className="rounded bg-sky-600 text-white px-3 py-1" onClick={()=>{ setPage(1); fetchData(); }}>Filtern</button>
        <button className="rounded border px-3 py-1" onClick={()=>{ setF({user_id:"",action:"",method:"",path:"",success:"all",object_type:"",object_id:"",request_id:"",status_min:"",status_max:"",date_from:"",date_to:""}); setPage(1); fetchData(); }}>Reset</button>
        <button className="rounded border px-3 py-1" onClick={downloadCsv}>CSV</button>
      </div>

      {/* Tablica */}
      <div className="overflow-auto border rounded">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 border-b">
            <tr className="[&>th]:px-2 [&>th]:py-2 text-left">
              {[
                ["ts","Zeit"],
                ["user_id","User (Name)"],
                ["action","Action"],
                ["details","Details"],
                ["object_type","Obj-Typ"],
                ["object_id","Obj-ID"],
                ["success","Ergebnis"],
                ["status_code","Status"],
                ["method","Methode"],
                ["path","Pfad"],
                ["request_id","ReqID"],
                ["ip","IP"],
              ].map(([k,label]) => (
                <th key={k}>
                  <button
                    className="flex items-center gap-1 hover:underline"
                    onClick={()=> setSort(s => (s===k ? `-${k}` : (s===`-${k}` ? k : k)))}
                    title="Sortieren"
                  >
                    {label}
                    {sort.includes(k) && <span className="text-slate-400">{sort.startsWith("-")?"↓":"↑"}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-slate-50/40">
            {items.map(r=>(
              <tr key={r.id} className="[&>td]:px-2 [&>td]:py-2">
                <td className="whitespace-nowrap">{fmt(r.ts)}</td>
                <td>
                {r.user_id ?? "–"}
                {r.user_name ? <span className="text-slate-500"> — {r.user_name}</span> : null}
                </td>
                <td className="max-w-[320px] truncate" title={r.action}>{r.action}</td>
                {/* <td className="max-w-[420px] truncate" title={r.user_agent ?? ""}>{r.user_agent}</td> */}
                <td className="max-w-[480px] truncate" title={
                    [r.project_name, r.task_title, r.task_structure].filter(Boolean).join(" — ")
                    }>
                {/* Projekat */}
                {r.project_name && <span className="mr-2 rounded bg-sky-50 ring-1 ring-sky-200 px-2 py-0.5 text-xs text-sky-700">
                    {r.project_name}
                </span>}
                {/* Task */}
                {r.task_title && <span className="mr-2 rounded bg-amber-50 ring-1 ring-amber-200 px-2 py-0.5 text-xs text-amber-700">
                    {r.task_title}
                </span>}
                {/* Struktura */}
                {r.task_structure && <span className="rounded bg-slate-50 ring-1 ring-slate-200 px-2 py-0.5 text-xs text-slate-700">
                    {r.task_structure}
                </span>}
                {(!r.project_name && !r.task_title && !r.task_structure) && "–"}
                </td>
                <td>{r.object_type ?? "–"}</td>
                <td>{r.object_id ?? "–"}</td>
                <td>{badge(r.success)}</td>
                <td>{r.status_code ?? "–"}</td>
                <td>{r.method}</td>
                <td className="max-w-[380px] truncate" title={r.path ?? ""}>{r.path}</td>
                <td className="font-mono text-xs">
                {r.request_id}
                {r.request_id && (
                    <button className="ml-2 text-sky-700 hover:underline"
                    onClick={()=>navigator.clipboard.writeText(r.request_id!)}>kopieren</button>
                )}
                </td>
                <td className="whitespace-nowrap">{r.ip}</td>
                

              </tr>
            ))}
            {!loading && items.length===0 && (
              <tr><td colSpan={12} className="text-center py-8 text-slate-500">Keine Daten</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginacija */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">{fromToStr}</div>
        <div className="flex items-center gap-2">
          <button className="rounded border px-2 py-1" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Zurück</button>
          <span className="text-sm">Seite {page}</span>
          <button className="rounded border px-2 py-1" disabled={page*pageSize>=total} onClick={()=>setPage(p=>p+1)}>Weiter</button>
          <select className="border rounded px-2 py-1" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value)); setPage(1);}}>
            {[25,50,100,200,500].map(n=><option key={n} value={n}>{n}/Seite</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
