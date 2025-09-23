import React, { useEffect, useState, useRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin from "@fullcalendar/interaction";
import deLocale from "@fullcalendar/core/locales/de";
import api from "../api/axios";
import { useNavigate, useParams } from "react-router-dom";
import "./TaskCalendar.css";
import GewerkeFilter from "../components/GewerkeFilter";
import DateFilter from "../components/DateFilter";
import TabMenu from "../components/TabMenu";
import StatusFilter from "../components/StatusFilter";
import TaskNameFilter from "../components/TaskNameFilter";
import StructureFilter from "../components/StructureFilter";
import ActivityFilter from "../components/ActivityFilter";
import ProcessModelFilter from "../components/ProcessModelFilter";
import EditTaskModal, { type EditTaskModalTask } from "../components/EditTaskModal";
import {
  makeHolidayEventsForRange,
  makeWeekendEventsForRange,
  overlapsBackground,
  toYMD,              
  endExclusiveToInclusiveYMD
} from "../utils/calendarAT";
import { type BgEvent } from "../utils/calendarAT";



function addDays(dateStr: string, days: number): string {
  if (!dateStr) return dateStr;
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0]; // yyyy-mm-dd
}


const TaskCalendar = () => {
  const controllerRef = useRef<AbortController | null>(null); // za otkazivanje fetch-a
  const projectFetchedRef = useRef(false);                     // spriječi dupli fetch naziva u StrictMode
  const [pageLoading, setPageLoading] = useState(true);
  const [holidayEvents, setHolidayEvents] = useState<BgEvent[]>([]);
  const [weekendEvents, setWeekendEvents] = useState<BgEvent[]>([]);
  const navigate = useNavigate();
  const calRef = useRef<FullCalendar | null>(null);
  const prevSlotMinRef = useRef<number | undefined>(undefined);
  const prevResourceWidthRef = useRef<string | number | undefined>(undefined);
  const lastRangeRef = useRef<{ start: string; end: string } | null>(null);
  const [printRange, setPrintRange] = useState<{ start: string; end: string } | null>(null);
  const [pendingPrint, setPendingPrint] = useState(false);
  function iso(d: Date) { return d.toISOString().split("T")[0]; }

  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [totalProjectCount, setTotalProjectCount] = useState<number | null>(null);
  const filteredCount = useMemo(() => events.filter(e => e.display !== 'background').length, [events]);
  const resourceCount = useMemo(() => resources.length, [resources]);

  // SUB (bulk dodavanje)
  const [subOpen, setSubOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<number | null>(null);
  const [subOptions, setSubOptions] = useState<{id:number; label:string}[]>([]);


  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/subs`, { meta: { showLoader: false } });
        if (!alive) return;
        // pretvorimo u {id, label}
        const opts = (Array.isArray(r.data) ? r.data : []).map((u: any) => ({
          id: u.id,
          label: u.name || u.email || `Sub #${u.id}`,
        }));
        setSubOptions(opts);
      } catch (e) {
        setSubOptions([]);
      }
    })();
    return () => { alive = false; };
  }, []);
  


  const [projectName, setProjectName] = useState<string>("");
  const [allGewerke, setAllGewerke] = useState<string[]>([]);
  const [selectedGewerke, setSelectedGewerke] = useState<string[]>([]);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  // === AUTO/MANUAL datum mod ===
  const [autoDateMode, setAutoDateMode] = useState(true);

  const setStartDateFilterManual = (d: string) => {
    setAutoDateMode(false);
    setStartDateFilter(d);
  };
  const setEndDateFilterManual = (d: string) => {
    setAutoDateMode(false);
    setEndDateFilter(d);
  };
  const resetDateFilter = () => {
    setStartDateFilter("");
    setEndDateFilter("");
    setAutoDateMode(true);
  };
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showOnlyDelayed, setShowOnlyDelayed] = useState(false);
  const [taskNameFilter, setTaskNameFilter] = useState("");
  const [selectedTops, setSelectedTops] = useState<string[]>([]);
  const [selectedEbenen, setSelectedEbenen] = useState<string[]>([]);
  const [selectedStiegen, setSelectedStiegen] = useState<string[]>([]);
  const [selectedBauteile, setSelectedBauteile] = useState<string[]>([]);
  const [selectedProcessModels, setSelectedProcessModels] = useState<string[]>([]);
  const [allProcessModels, setAllProcessModels] = useState<string[]>([]);
  const [allTops, setAllTops] = useState<string[]>([]);
  const [allEbenen, setAllEbenen] = useState<string[]>([]);
  const [allStiegen, setAllStiegen] = useState<string[]>([]);
  const [allBauteile, setAllBauteile] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [allActivities, setAllActivities] = useState<string[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const isGewerkeFiltered = selectedGewerke.length > 0;
  const isDateFiltered = startDateFilter !== "" || endDateFilter !== "";
  const isStatusFiltered = statusFilter.length > 0 || showOnlyDelayed;
  const isTaskFiltered = taskNameFilter.trim() !== "";
  const isStructureFiltered =
    selectedTops.length > 0 || selectedEbenen.length > 0 || selectedStiegen.length > 0 || selectedBauteile.length > 0;
    const isActivityFiltered = selectedActivities.length > 0;
  const isProcessModelFiltered = selectedProcessModels.length > 0;

  const toDateOnly = (d?: string | null) => (d ? d : null);

  function mapToApiPayload(u: EditTaskModalTask) {
    // prilagodi nazive polja ako backend očekuje drugačije ključeve
    return {
      title: u.title ?? "",
      beschreibung: u.beschreibung ?? "",
      status: u.status ?? "offen",
      start_soll: toDateOnly(u.start_soll),
      end_soll:   toDateOnly(u.end_soll),
      start_ist:  toDateOnly(u.start_ist),
      end_ist:    toDateOnly(u.end_ist),
    };
  }
    
  const getProcessModelName = (t: any): string =>
  t.process_model || "";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
  }, [navigate]);

  const handlePrintA3 = () => {
    const api = calRef.current?.getApi();
    if (!api || allTasks.length === 0) return;

    // validni datumi iz SVIH taskova projekta
    const dates = allTasks
      .map(t => ({
        s: new Date(t.start_soll),
        e: new Date(addDays(t.end_soll, 1)) // FC end je ekskluzivan
      }))
      .filter(x => !isNaN(x.s.getTime()) && !isNaN(x.e.getTime()));
    if (dates.length === 0) return;

    const start = new Date(Math.min(...dates.map(x => x.s.getTime())));
    const end   = new Date(Math.max(...dates.map(x => x.e.getTime())));
    const days  = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));

    // zapamti trenutne opcije
    prevSlotMinRef.current = api.getOption("slotMinWidth") as number | undefined;
    prevResourceWidthRef.current = api.getOption("resourceAreaWidth") as any;

    // suzi resurs-kolonu za print (više mjesta vremenskoj osi)
    const PRINT_RES_WIDTH = 80; // px
    api.setOption("resourceAreaWidth", `${PRINT_RES_WIDTH}px`);

    // korisna širina A3 (landscape) – uzmi marže + res kolonu u obzir
    const A3_WIDTH_PX = 1400;              // po potrebi dotjeraj 1300–1600
    const usableWidth = Math.max(600, A3_WIDTH_PX - PRINT_RES_WIDTH - 24);
    const dayWidth = Math.max(1, Math.floor(usableWidth / days));
    api.setOption("slotMinWidth", dayWidth);

    // postavi puni raspon i čekaj render
    setPrintRange({ start: iso(start), end: iso(end) });
    setPendingPrint(true);
    document.body.classList.add("print-a3");

    // prisili recalculation prije printa
    requestAnimationFrame(() => api.updateSize());
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/projects/${id}/tasks-count`, { meta: { showLoader: false } });
        if (alive) setTotalProjectCount(Number(r.data?.total ?? 0));
      } catch {
        if (alive) setTotalProjectCount(null);
      }
    })();
    return () => { alive = false; };
  }, [id]);
  

  useEffect(() => {
    const restore = () => {
      const api = calRef.current?.getApi();
      if (api) {
        if (prevSlotMinRef.current !== undefined) {
          api.setOption("slotMinWidth", prevSlotMinRef.current);
        }
        if (prevResourceWidthRef.current !== undefined) {
          api.setOption("resourceAreaWidth", prevResourceWidthRef.current);
        }
        api.updateSize();
      }
      setPrintRange(null);
      setPendingPrint(false);
      document.body.classList.remove("print-a3");
    };
    window.addEventListener("afterprint", restore);
    return () => window.removeEventListener("afterprint", restore);
  }, []);

  const withPageLoading = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setPageLoading(true);
    try {
      return await fn();
    } finally {
      setPageLoading(false);
    }
  };

  const natCmp = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare;
  
  const loadTimeline = async () => {
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    setPageLoading(true);

    try {
      // Prikupi sve filtere i pošalji ih backendu
      const params = new URLSearchParams();
      
      // Dodaj filtere u params
      selectedGewerke.forEach(g => params.append('gewerk', g));
      if (startDateFilter) params.append('startDate', startDateFilter);
      if (endDateFilter) params.append('endDate', endDateFilter);
      statusFilter.forEach(s => params.append('status', s));
      if (showOnlyDelayed) params.append('delayed', 'true');
      if (taskNameFilter) params.append('taskName', taskNameFilter);
      selectedTops.forEach(t => params.append('top', t));
      selectedEbenen.forEach(e => params.append('ebene', e));
      selectedStiegen.forEach(s => params.append('stiege', s));
      selectedBauteile.forEach(b => params.append('bauteil', b));
      selectedActivities.forEach(a => params.append('activity', a));
      selectedProcessModels.forEach(p => params.append('processModel', p));

      const res = await api.get(`/projects/${id}/tasks-timeline?${params}`, {
        signal: ctrl.signal,
        meta: { showLoader: false }
      });

      let allData = res.data;

      // Ako dataset >1000 i još smo u auto modu, otvori DateFilter tab
      if (Array.isArray(allData)) {
        const totalCount = allData.length;

        if (totalCount > 1000 && autoDateMode) {
          // 1) otvori panel
          if (!activeTab || !activeTab.startsWith("Filter nach Datum")) {
            setActiveTab("Filter nach Datum");
          }

          // 2) prvi put postavi −1 / +4 sedmice i prekini (refetch će odmah krenuti)
          if (!startDateFilter && !endDateFilter) {
            const today = new Date();
            const start = new Date(today); start.setDate(start.getDate() - 7);
            const end   = new Date(today); end.setDate(end.getDate() + 28);

            setStartDateFilter(toYMD(start));
            setEndDateFilter(toYMD(end));

            if (controllerRef.current === ctrl) setPageLoading(false);
            return;
          }
        }
      }


      // --- AUTO RANGE (samo inicijalno, bez ručnog raspona) ----------------
      const totalCount = Array.isArray(allData) ? allData.length : 0;
      if (totalCount > 1000 && autoDateMode && !startDateFilter && !endDateFilter) {
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 7);   // -1 sedmica
        const end   = new Date(today);
        end.setDate(end.getDate() + 28);      // +4 sedmice

        setStartDateFilter(toYMD(start));
        setEndDateFilter(toYMD(end));

        if (controllerRef.current === ctrl) setPageLoading(false);
        return; // pusti useEffect da refetcha sa novim datumima
      }
      // ---------------------------------------------------------------------

      // Fallback: ako server s datumima vrati 0, povuci bez datuma pa filtriraj klijentski
      if ((startDateFilter || endDateFilter) && totalCount === 0) {
        const paramsNoDates = new URLSearchParams(params);
        paramsNoDates.delete("startDate");
        paramsNoDates.delete("endDate");

        const refetch = await api.get(`/projects/${id}/tasks-timeline?${paramsNoDates}`, {
          signal: ctrl.signal,
          meta: { showLoader: false }
        });
        allData = refetch.data;
      }

      

      let data = allData;
      if (startDateFilter || endDateFilter) {
        const start = startDateFilter ? new Date(startDateFilter) : null;
        const endInc = endDateFilter ? new Date(endDateFilter) : null;
        if (endInc) endInc.setDate(endInc.getDate() + 1); // kraj ekskluzivan
      
        data = data.filter((t: any) => {
          // računamo preklapanje [start_soll, end_soll+1) sa [start, endInc)
          const s = new Date(t.start_soll);
          const eExc = new Date(t.end_soll);
          eExc.setDate(eExc.getDate() + 1);
      
          if (start && eExc <= start) return false; // završava prije raspona
          if (endInc && s >= endInc) return false;  // počinje poslije raspona
          return true;                               // ima preklapanje
        });
      }

     
      // Ovdje samo ažuriraj stanja koja su potrebna za filtere
      const allPMValues = Array.from(
        new Set<string>(data.map((t: any) => t.process_model).filter(Boolean) as string[])
      );
      setAllProcessModels(allPMValues);
      setAllTasks(data);

      const allTopValues = Array.from(new Set<string>(data.map((t: any) => t.top).filter(Boolean))).sort(natCmp);
      const allEbeneValues = Array.from(new Set<string>(data.map((t: any) => t.ebene).filter(Boolean))).sort(natCmp);
      const allStiegeValues = Array.from(new Set<string>(data.map((t: any) => t.stiege).filter(Boolean))).sort(natCmp);
      const allBauteilValues = Array.from(new Set<string>(data.map((t: any) => t.bauteil).filter(Boolean))).sort(natCmp);

      setAllTops(allTopValues);
      setAllEbenen(allEbeneValues);
      setAllStiegen(allStiegeValues);
      setAllBauteile(allBauteilValues);

      const allActivityValues = Array.from(new Set<string>(data.map((t: any) => t.task).filter(Boolean)));
      setAllActivities(allActivityValues);

      const uniqueGewerke: string[] = Array.from(new Set(data.map((t: any) => t.gewerk_name || "Allgemein")));
      setAllGewerke(uniqueGewerke);

      // RESOURCES
      const uniqueWohnungen = Array.from(
        new Set<string>(
          data
            .map((t: any) => t.wohnung)
            .filter((v: unknown): v is string => typeof v === "string" && v.length > 0)
        )
      ).sort(natCmp);

      const resList = uniqueWohnungen.map((wohnung) => {
        const row = data.find((t: any) => t.wohnung === wohnung);
        return {
          id: wohnung,
          title: wohnung,
          extendedProps: {
            bauteil: row?.bauteil ?? "",
            stiege: row?.stiege ?? "",
            ebene: row?.ebene ?? "",
            sub_id: row?.sub_id ?? null,
            sub_name: row?.sub_name ?? "",
          },
          gewerk: row?.gewerk_name || "Allgemein",
        };
      });

      // EVENTS
      const eventList = data
        .map((task: any) => {
          if (!task.id) return null;
          const isDone = !!task.end_ist;
          const endIstOrToday = isDone ? new Date(task.end_ist) : new Date();
          const verzug = Math.max(
            0,
            Math.ceil((endIstOrToday.getTime() - new Date(task.end_soll).getTime()) / (1000 * 3600 * 24))
          );
          return {
            id: task.id.toString(),
            title: task.task,
            start: task.start_soll,
            end: addDays(task.end_soll, 1),
            resourceId: task.wohnung,
            backgroundColor: task.farbe || "#60a5fa",
            borderColor: "#1e3a8a",
            extendedProps: {
              status: task.status,
              verzug,
              beschreibung: task.beschreibung,
              gewerk: task.gewerk_name || "Allgemein",
              start_soll: task.start_soll,
              end_soll: task.end_soll,
              start_ist: task.start_ist,
              end_ist: task.end_ist,
              bauteil: task.bauteil ?? "",
              stiege: task.stiege ?? "",
              ebene: task.ebene ?? "",
              top: task.top ?? task.wohnung ?? "",
              top_id: task.top_id,
              process_step_id: task.process_step_id,
              project_id: task.project_id,
              sub_id: task.sub_id ?? null,
              sub_name: task.sub_name ?? "",
            },
          };
        })
        .filter(Boolean) as any[];

      setResources(resList);
      setEvents(eventList);
      if (controllerRef.current === ctrl) setPageLoading(false);
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") {
        // spusti spinner SAMO ako je još uvijek ovaj zahtjev aktivni
        if (controllerRef.current === ctrl) setPageLoading(false);
        return;
      }
      console.error("Fehler beim Laden der Timeline:", err);
      if (controllerRef.current === ctrl) setPageLoading(false);
    }
  };


  
  // 3a) Naziv projekta – učitaj JEDNOM po id-u
  useEffect(() => {
    if (!id) return;
    if (projectFetchedRef.current) return;  // ↩️ spriječi drugi poziv (StrictMode)
    projectFetchedRef.current = true;

    (async () => {
      try {
        const res = await api.get(`/projects/${id}`, { meta: { showLoader: false } });
        setProjectName(res.data.name);
      } catch (err) {
        console.error("Fehler beim Laden des Projektnamens:", err);
      }
    })();
  }, [id]);

  // 3b) Timeline – koliko često želiš (server-side filteri)
  useEffect(() => {
    if (!id) return;
    loadTimeline();
  }, [
    id,
    startDateFilter, endDateFilter,
    selectedGewerke,
    statusFilter, showOnlyDelayed,
    taskNameFilter,
    selectedTops, selectedEbenen, selectedStiegen, selectedBauteile,
    selectedActivities, selectedProcessModels
  ]);

  const startDates = events.map((e) => new Date(e.start));
  const endDates = events.map((e) => new Date(e.end));
  const minDate = startDates.length ? new Date(Math.min(...startDates.map(d => d.getTime()))) : new Date();
  const maxDate = endDates.length ? new Date(Math.max(...endDates.map(d => d.getTime()))) : new Date();
  const rangeStart = new Date(minDate);
  const rangeEnd = new Date(maxDate);
  rangeStart.setDate(rangeStart.getDate() - 7);
  rangeEnd.setDate(rangeEnd.getDate() + 60);
  const initialDate = new Date().toISOString().split("T")[0];
  

  function isColorDark(hex: string): boolean {
    if (!hex) return false;
    hex = hex.replace("#", "");

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Perceptual luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
        return luminance < 160; // granica: manja = tamno → bela slova
  }

    const toLocalYMD = (d: Date | null) => {
      if (!d) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    // Timeline koristi “end” kao granicu intervala. Ako radiš s dnevnom granularnošću
    // (bez vremena), tretiraj ga kao ekskluzivan -> pretvori u inkluzivan -1 dan.
    const endExclusiveToInclusiveLocal = (end: Date | null, allDayLike: boolean) => {
      if (!end) return null;
      const e = new Date(end);
      if (allDayLike) e.setDate(e.getDate() - 1);
      return toLocalYMD(e);
    };

    const defaultVisibleRange = useMemo(() => {
      const start = rangeStart.toISOString().split("T")[0];
      const end   = rangeEnd.toISOString().split("T")[0];
      return { start, end };
    }, [rangeStart.getTime(), rangeEnd.getTime()]);

    const fcVisibleRange = useMemo(() => {
      if (startDateFilter || endDateFilter) {
        const start = startDateFilter || defaultVisibleRange.start;
        const end   = endDateFilter   || defaultVisibleRange.end;
        return { start, end };
      }
      return defaultVisibleRange;
    }, [startDateFilter, endDateFilter, defaultVisibleRange.start, defaultVisibleRange.end]);
    

    const bgSources = useMemo(() => ([
      { id: "at-holidays", events: holidayEvents },
      { id: "weekends",    events: weekendEvents },
    ]), [holidayEvents, weekendEvents]);

    const allSources = useMemo(
      () => [
        { id: "tasks",     events },           // ⬅ tvoji taskovi
        { id: "at-holidays", events: holidayEvents },
        { id: "weekends",    events: weekendEvents },
      ],
      [events, holidayEvents, weekendEvents]
    );

    const holidayMap = useMemo(() => {
      const m = new Map<string, string>();
      for (const h of holidayEvents) {
        if (h.title) m.set(h.start, h.title); // start je "YYYY-MM-DD"
      }
      return m;
    }, [holidayEvents]);

    function computeVerzug(end_soll?: string | null, end_ist?: string | null) {
      if (!end_soll) return 0;
      const today = new Date();
      const isDone = !!end_ist;
      const endIstOrToday = isDone ? new Date(end_ist as string) : today;
      return Math.max(
        0,
        Math.ceil(
          (endIstOrToday.getTime() - new Date(end_soll).getTime()) / (1000 * 3600 * 24)
        )
      );
    }

    const resetFilters = () => {
      setSelectedGewerke([]);
      setStartDateFilter("");
      setEndDateFilter("");
      setStatusFilter([]);
      setShowOnlyDelayed(false);
      setTaskNameFilter("");
      setSelectedTops([]);
      setSelectedEbenen([]);
      setSelectedStiegen([]);
      setSelectedBauteile([]);
      setSelectedActivities([]);
      setSelectedProcessModels([]);
      setAutoDateMode(true);
    };

    // (reset na klik taba)
    useEffect(() => {
      if (activeTab === "Reset alle Filter") {
        resetFilters();
        setActiveTab("Filter nach Datum");
      }
    }, [activeTab]);



  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cyan-400">
          🗓 Timeline: <span className="text-black">{projectName}</span>
        </h2>
        {/* dugme */}
        <div className="mb-2 flex items-center gap-2">
          <button
            className="px-3 py-2 rounded bg-gray-200 text-gray-900 hover:bg-gray-300"
            onClick={() => navigate("/dashboard")}
          >
            ◀ Zurück zum Dashboard
          </button>

          <button
            onClick={() => navigate(`/projekt/${id}`)}  
            className="px-3 py-2 rounded bg-gray-200 text-gray-900 hover:bg-gray-300"
          >
            ◀ Zurück zum Projekt
          </button>
          <button onClick={handlePrintA3} className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-black">
            📄 Drucken
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <TabMenu
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={[
            isGewerkeFiltered ? "Filter nach Gewerke ●" : "Filter nach Gewerke",
            isDateFiltered ? "Filter nach Datum ●" : "Filter nach Datum",
            isStatusFiltered ? "Filter nach Status ●" : "Filter nach Status",
            isTaskFiltered ? "Task-Suche ●" : "Task-Suche",
            isStructureFiltered ? "Strukturfilter ●" : "Strukturfilter",
            isActivityFiltered ? "Aktivität ●" : "Aktivität",
            isProcessModelFiltered ? "Prozessmodell ●" : "Prozessmodell",
            "Reset alle Filter",
          ]}
        />

      {/* desna strana: ➕ Sub + brojači (modern look) */}
      <div className="ml-4 flex items-center gap-3 print:hidden">
        <button
          className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-3 py-1.5 text-white text-sm font-medium shadow-sm ring-1 ring-cyan-700/30 hover:bg-cyan-700 active:bg-cyan-800 transition"
          onClick={() => setSubOpen(true)}
          title="Sub zu allen aktuell gefilterten Aktivitäten hinzufügen"
          aria-label="Sub hinzufügen"
        >
          <span className="text-base leading-none">➕</span>
          <span>Sub</span>
        </button>

        <span className="h-5 w-px bg-slate-200" aria-hidden />

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-200 shadow-sm"
            title="Gefilterte / Gesamtanzahl der Tasks im Projekt"
          >
            <span className="text-base leading-none">🗂️</span>
            <span>
              {filteredCount.toLocaleString("de-AT")}
              <span className="opacity-60"> / </span>
              {(totalProjectCount ?? 0).toLocaleString("de-AT")}
            </span>
            <span className="opacity-70">Tasks</span>
          </span>

          <span
            className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 shadow-sm"
            title="Anzahl der Ressourcen/Zeilen"
          >
            <span className="text-base leading-none">🏠</span>
            <span>{resourceCount.toLocaleString("de-AT")}</span>
            <span className="opacity-70">Whg.</span>
          </span>
        </div>
      </div>

      </div>





      {activeTab.startsWith("Filter nach Gewerke") && (
        <GewerkeFilter
          allGewerke={allGewerke}
          selectedGewerke={selectedGewerke}
          setSelectedGewerke={setSelectedGewerke}
        />
      )}

      {activeTab.startsWith("Filter nach Datum") && (

        <DateFilter
          startDate={startDateFilter}
          endDate={endDateFilter}
          setStartDate={setStartDateFilterManual}
          setEndDate={setEndDateFilterManual}
          onReset={resetDateFilter}
        />
        
      )}

      {activeTab.startsWith("Filter nach Status") && (
        <StatusFilter
          selectedStatus={statusFilter}
          setSelectedStatus={setStatusFilter}
          showOnlyDelayed={showOnlyDelayed}
          setShowOnlyDelayed={setShowOnlyDelayed}
        />
      )}

      {activeTab === "Task-Suche" && (
        <TaskNameFilter taskName={taskNameFilter} setTaskName={setTaskNameFilter} />
      )}

      {activeTab.startsWith("Strukturfilter") && (
        <StructureFilter
          tasks={allTasks}
          selectedTops={selectedTops}
          setSelectedTops={setSelectedTops}
        />
      )}




      {activeTab.startsWith("Aktivität") && (
        <ActivityFilter
          allActivities={allActivities}
          selectedActivities={selectedActivities}
          setSelectedActivities={setSelectedActivities}
        />
      )}

      {activeTab.startsWith("Prozessmodell") && (
        <ProcessModelFilter
          allProcessModels={allProcessModels}
          selectedProcessModels={selectedProcessModels}
          setSelectedProcessModels={setSelectedProcessModels}
        />
      )}
      
      {subOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 grid place-items-center">
          <div className="bg-white rounded-lg shadow p-4 w-[420px]">
            <h3 className="font-semibold text-lg mb-3">➕ Subunternehmen</h3>

            <label className="block text-sm mb-3">
              Subunternehmen (Dropdown-Menü)
              <select
                className="mt-1 w-full border rounded px-2 py-1"
                value={selectedSub ?? ""}
                onChange={(e) => setSelectedSub(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— auswählen —</option>
                {subOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>

            </label>

            <div className="text-xs text-red-500 mb-4 animate-[blink_1s_steps(1,end)_infinite]">
              Zu {filteredCount.toLocaleString("de-AT")} aktuell gefilterten Aktivitäten hinzufügen.
            </div>

            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 text-sm rounded border" onClick={() => setSubOpen(false)}>
                Abbrechen
              </button>
              <button
                className="px-3 py-1 text-sm rounded bg-blue-600 text-white disabled:opacity-60"
                disabled={!selectedSub || filteredCount === 0}
                onClick={async () => {
                  // možeš zatvoriti modal prije ili poslije — ja ga zatvaram poslije (u finally)
                  try {
                    await withPageLoading(async () => {
                      // 1) PATCH (možeš isključiti global loader da ne duplira spinnere)
                      await api.patch(
                        `/projects/${id}/tasks/bulk`,
                        {
                          filters: {
                            gewerk: selectedGewerke,
                            status: statusFilter,
                            startDate: startDateFilter || null,
                            endDate: endDateFilter || null,
                            delayed: showOnlyDelayed || null,
                            taskName: taskNameFilter || null,
                            tops: selectedTops,
                            ebenen: selectedEbenen,
                            stiegen: selectedStiegen,
                            bauteile: selectedBauteile,
                            activities: selectedActivities,
                            processModels: selectedProcessModels,
                          },
                          update: { sub_id: selectedSub },
                        },
                        { meta: { showLoader: false }, timeout: 120000 } // 👈 izbjegni dupli loader
                      );
                
                      // 2) Refresh timeline — OBAVEZNO čekaj da završi
                      await loadTimeline();
                    });
                  } catch (err) {
                    console.error("bulk sub error:", err);
                    alert("Fehler beim Bulk-Update (Sub).");
                  } finally {
                    setSubOpen(false); // zatvori modal u svakom slučaju
                  }
                }}
                
              >
                Anwenden
              </button>
            </div>

            <div className="mt-2 text-xs text-gray-500">
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}

          onSave={async (u) => {
            try {
              // iskoristi helper ako ga već imaš
              const payload = mapToApiPayload ? mapToApiPayload(u) : {
                task: u.title ?? "",
                beschreibung: u.beschreibung ?? "",
                status: u.status ?? "offen",
                start_soll: u.start_soll ?? null,
                end_soll:   u.end_soll ?? null,
                start_ist:  u.start_ist ?? null,
                end_ist:    u.end_ist ?? null,
              };
          
              await api.put(`/tasks/${u.id}`, payload, { meta: { showLoader: false } });
          
              // osvježi SAMO taj event u kalendaru (bez setEvents([...]))
              const apiCal = calRef.current?.getApi();
              const ev = apiCal?.getEventById(String(u.id));
              if (ev) {
                if (u.title) ev.setProp("title", u.title);
                ev.setExtendedProp("start_soll", u.start_soll);
                ev.setExtendedProp("end_soll",   u.end_soll);
                ev.setExtendedProp("start_ist",  u.start_ist);
                ev.setExtendedProp("end_ist",    u.end_ist);
                ev.setExtendedProp("beschreibung", u.beschreibung);
                ev.setExtendedProp("status", u.status);
                // ev.setDates(...) samo ako želiš i pomjeriti trak; nije obavezno
              }
          
              // lokalni cache (po ID-u)
              setAllTasks(prev => {
                const i = prev.findIndex(t => String(t.id) === String(u.id));
                if (i < 0) return prev;
                const copy = prev.slice();
                copy[i] = { ...copy[i], ...u };
                return copy;
              });
            } catch (err) {
              console.error("PUT /tasks error:", err);
              alert("Speichern fehlgeschlagen.");
            }
          }}
          

          onDelete={async (id) => {
            try {
              await api.delete(`/tasks/${id}`, { meta: { showLoader: false } });
          
              const apiCal = calRef.current?.getApi();
              apiCal?.getEventById(String(id))?.remove();
          
              setAllTasks(prev => prev.filter(t => String(t.id) !== String(id)));
              setSelectedTask(null);
            } catch (err) {
              console.error("DELETE /tasks error:", err);
              alert("Löschen fehlgeschlagen.");
            }
          }}
          
          

        />
      )}




   {pageLoading && (
      <div className="fixed inset-0 z-40 grid place-items-center bg-white/60">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-gray-700" />
      </div>
    )}

    <div className={pageLoading ? "pointer-events-none opacity-50" : ""}>
    
    <div className="print-area">
    <div className="hidden print:block text-center mb-4">
      <h2 className="text-2xl font-bold text-cyan-400">
        🗓 Timeline: <span className="text-black">{projectName}</span>
      </h2>
    </div>

      <FullCalendar
        timeZone="local" 
        ref={calRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimeline"
        resourceAreaHeaderContent="Top"
        resources={resources}
        resourceOrder={(a: any, b: any) =>
          natCmp(String(a.title ?? a.id), String(b.title ?? b.id))
        }
        resourceLabelDidMount={(arg) => {          
          const { bauteil, stiege, ebene } = (arg.resource.extendedProps || {}) as any;
          const el = arg.el as HTMLElement;
          const parts: string[] = [];
          if (bauteil) parts.push(`Bauteil: ${bauteil}`);
          if (stiege)  parts.push(`Stiege: ${stiege}`);
          if (ebene)   parts.push(`Ebene: ${ebene}`);
          el.title = parts.join("\n");   // samo tooltip, nema dodatnog DOM-a
        }}



        eventSources={allSources}

        locale={deLocale}
        eventClick={(info) => {
          const p: any = info.event.extendedProps || {};
          const lean = {
            id: info.event.id,
            title: info.event.title ?? "",
            beschreibung: p.beschreibung ?? "",
            status: p.status ?? "offen",
            start_soll: p.start_soll ?? null,
            end_soll:   p.end_soll ?? null,
            start_ist:  p.start_ist ?? null,
            end_ist:    p.end_ist ?? null,
          };
          setSelectedTask(lean);
        }}

        



        eventAllow={() => true}

        height="auto"
        contentHeight="auto"
        resourceAreaWidth="140px"
        expandRows={true}
        slotMinWidth={40}
        initialDate={initialDate}
        slotLabelFormat={[
          { year: "numeric", month: "long" }, // gornji red
          { day: "2-digit" }                  // donji red (broj)
        ]}

        slotLabelContent={(arg) => {
          // gornji red (mjesec/godina) – pusti default (vrati plain string)
          if (!/^\d+$/.test(arg.text)) {
            return arg.text; // ✅ string, ne objekt { text: ... }
          }

          // donji red: broj + (dan/praznik)
          const d = arg.date;
          const ymd = toYMD(d); // iz utils/calendarAT: lokalni "YYYY-MM-DD"
          const weekday = d.toLocaleDateString("de-AT", { weekday: "short" }); // Mo/Di/Mi...
          const holiday = holidayMap.get(ymd);

          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }} title={holiday || undefined}>
              <div style={{ fontWeight: 600 }}>{arg.text}</div>
              <div
                style={{
                  fontSize: holiday ? 8 : 11,
                  whiteSpace: "nowrap",
                  opacity: 0.85,
                  textAlign: "left",      // ⬅ ne centriraj
                  width: "100%",          // ⬅ da textAlign ima efekat
                  alignSelf: "flex-start" // ⬅ u slučaju da je parent flex
                }}
              >
                {weekday}
                {holiday && (
                  <span style={{ marginLeft: 4, color: "#8b0000", fontWeight: 700 }}>
                    • {holiday}
                  </span>
                )}
              </div>

            </div>
          );
        }}

        visibleRange={ printRange ?? fcVisibleRange }

        datesSet={(arg) => {
          if (pendingPrint) {
            requestAnimationFrame(() => window.print());
          }

          const startStr = arg.startStr.slice(0, 10);
          const endStr   = arg.endStr.slice(0, 10);
          
          
          // ažuriraj samo ako se raspon promijenio
          const last = lastRangeRef.current;
          if (!last || last.start !== startStr || last.end !== endStr) {
            lastRangeRef.current = { start: startStr, end: endStr };
            
            const rangeStart = new Date(startStr);
            const rangeEnd   = new Date(endStr);
            
            setHolidayEvents(makeHolidayEventsForRange(rangeStart, rangeEnd));
            setWeekendEvents(makeWeekendEventsForRange(rangeStart, rangeEnd));
            }
          }}

        headerToolbar={{
          left: "",
          center: "",
          right: "",
        }}
        footerToolbar={false}
        editable={true}
        eventChange={async (info) => {
        await withPageLoading(async () => {
        const ev = info.event;
        // tretiramo timeline kao “all-day-like” (dnevni koraci)
        const allDayLike = true;

        const startISO = toLocalYMD(ev.start);
        const endISO   = endExclusiveToInclusiveLocal(ev.end, allDayLike);

        // ako nema stvarne promjene, ne zovi backend
        const prev = info.oldEvent;
        const prevStart = toLocalYMD(prev.start);
        const prevEnd   = endExclusiveToInclusiveLocal(prev.end, allDayLike);
        if (startISO === prevStart && endISO === prevEnd) return;

        const payload: Record<string, any> = {};
        if (startISO) payload.start_soll = startISO;
        if (endISO)   payload.end_soll   = endISO;

        try {
          await api.put(`/tasks/${ev.id}`, payload, { meta: { showLoader: false } });
          // lokalno osvježi extendedProps za tooltipe
          ev.setExtendedProp("start_soll", startISO);
          ev.setExtendedProp("end_soll", endISO);
          const newVerzug = computeVerzug(endISO, ev.extendedProps.end_ist);
          ev.setExtendedProp("verzug", newVerzug);
        } catch (err: any) {
          console.error("PUT /tasks error:", err?.response?.data ?? err);
          info.revert(); // vrati vizuelno na staro ako fail
          alert("Speichern fehlgeschlagen.");
        }
      });
      }}


        eventContent={(arg) => {
          if (arg.event.display === "background") {
            return { domNodes: [] }; // ili samo: return null;
          }
          const {
            verzug,
            status,
            beschreibung,
            start_soll,
            end_soll,
            start_ist,
            end_ist,
            bauteil,
            stiege,
            ebene,
            top: topCode,
          } = arg.event.extendedProps;

          const { sub_name } = arg.event.extendedProps;
          const today = new Date();
          const isDone = !!end_ist && new Date(end_ist) <= today;
          const isInProgress = !!start_ist && !end_ist;
          const isDelayed =
            (isDone && verzug > 0) ||
            (isInProgress && new Date(end_soll) < today);
          // naziv TOP-a iz resource kolone, ako želiš da se poklopi sa levom listom
          const resourceTopTitle = arg.event.getResources?.()[0]?.title ?? "";
          const shownTop = topCode || resourceTopTitle;

          const headerLines = [
            bauteil && `🏗 Bauteil: ${bauteil}`,
            stiege  && `🪜 Stiege: ${stiege}`,
            ebene   && `🏢 Ebene: ${ebene}`,
            shownTop && `🚪 Top: ${shownTop}`,
          ].filter(Boolean).join("\n");
          
          const toDMY = (v?: string | null) => {
            if (!v) return "-";
            const ymd = v.includes("T") ? v.split("T")[0] : v; // uzmi datum dio
            const [y, m, d] = ymd.split("-");
            return y && m && d ? `${d}.${m}.${y}` : v;
          };
          const bgColor = arg.event.backgroundColor || "#60a5fa";
          const textColorClass = isColorDark(bgColor) ? "text-white" : "text-black";
          const borderColorClass = isDelayed ? "delayed-outline" : "";

          const bodyLines = [
            `${arg.event.id} 📌 -${arg.event.title}`,
            sub_name ? `👷 SUB: ${sub_name}` : "SUB: nicht ausgewählt",
            `🟢 Start soll: ${toDMY(start_soll)}`,
            `🔴 End soll: ${toDMY(end_soll)}`,
            `🟩 Start Ist: ${toDMY(start_ist)}`,
            `🟥 End Ist: ${toDMY(end_ist)}`,
            `⏳ Verzug: ${verzug} Tage`,
            beschreibung ? `📝 ${beschreibung}` : "",
          ].filter(Boolean).join("\n");


          const tooltip = [headerLines, bodyLines].filter(Boolean).join("\n\n");
        
          return (
            <div
              className={`relative px-2 py-1 text-sm font-medium ${textColorClass} rounded-sm ${borderColorClass} overflow-visible`}
              title={tooltip}
            > 
            {/* ⬇️ (Opcionalno) prikaži info iznad naslova */}
              {/* {(bauteil || stiege || ebene || shownTop) && (
                <div className="text-[10px] leading-tight opacity-80 mb-0.5 truncate">
                  {[bauteil, stiege, ebene, shownTop].filter(Boolean).join(" / ")}
                </div>
              )}    */}
              <div className="flex justify-between items-center">
                <span className="truncate">{arg.event.title}</span>

                {isDelayed && (
                  <span
                    className="ml-2 px-1.5 rounded border text-xs font-bold bg-red-600 border-red-1100 text-white"
                    title={`${verzug} Tage Verzug`}
                  >
                    {verzug}
                  </span>
                )}
              </div>

              {isDone && (
                <div className="task-x-overlay">
                  <div className={`task-x-line ${isDelayed ? "red" : "white"} task-x-diagonal-1`} />
                  <div className={`task-x-line ${isDelayed ? "red" : "white"} task-x-diagonal-2`} />
                </div>
              )}


            </div>
          );
        }}



      />
    </div>
    </div>
      

    </div>
  );
};

export default TaskCalendar;
