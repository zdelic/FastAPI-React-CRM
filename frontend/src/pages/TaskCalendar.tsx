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
import EditTaskModal from "../components/EditTaskModal";
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
  const [projectName, setProjectName] = useState<string>("");
  const [allGewerke, setAllGewerke] = useState<string[]>([]);
  const [selectedGewerke, setSelectedGewerke] = useState<string[]>([]);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
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


  const natCmp = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare;
  
  const loadTimeline = async () => {
      
      try {
        const res = await api.get(`/projects/${id}/tasks-timeline`, { meta: { showLoader: true } });
        const data = res.data;
        const allPMValues = Array.from(
          new Set<string>(data.map((t: any) => t.process_model).filter(Boolean) as string[])
        );
        setAllProcessModels(allPMValues);
        setAllTasks(data);
        const allTopValues    = Array.from(new Set<string>(data.map((t:any) => t.top).filter(Boolean))).sort(natCmp);
        const allEbeneValues  = Array.from(new Set<string>(data.map((t:any) => t.ebene).filter(Boolean))).sort(natCmp);
        const allStiegeValues = Array.from(new Set<string>(data.map((t:any) => t.stiege).filter(Boolean))).sort(natCmp);
        const allBauteilValues= Array.from(new Set<string>(data.map((t:any) => t.bauteil).filter(Boolean))).sort(natCmp);



        setAllTops(allTopValues);
        setAllEbenen(allEbeneValues);
        setAllStiegen(allStiegeValues);
        setAllBauteile(allBauteilValues);

        const allActivityValues = Array.from(new Set<string>(
          data.map((t: any) => t.task).filter(Boolean)
        ));
        setAllActivities(allActivityValues);


        const today = new Date();

        // 📅 Filter po datumu
        const filteredByDate = data.filter((task: any) => {
          const taskStart = new Date(task.start_soll);
          const taskEnd = new Date(task.end_soll);

          const start = startDateFilter ? new Date(startDateFilter) : null;
          const end = endDateFilter ? new Date(endDateFilter) : null;

          if (start && taskEnd < start) return false;
          if (end && taskStart > end) return false;

          return true;
        });

        // 🛠 Filter po gewerke
        const filteredData = selectedGewerke.length > 0
          ? filteredByDate.filter((t: any) => selectedGewerke.includes(t.gewerk_name))
          : filteredByDate;
        
          // 🗂 Filter po statusu
        const filteredByStatus = filteredData.filter((task: any) => {
          const isDone = !!task.end_ist;
          const isInProgress = !!task.start_ist && !task.end_ist;
          const isOffen = !task.start_ist && !task.end_ist;

          if (statusFilter.length === 0) return true;

          if (statusFilter.includes("Erledigt") && isDone) return true;
          if (statusFilter.includes("In Bearbeitung") && isInProgress) return true;
          if (statusFilter.includes("Offen") && isOffen) return true;

          return false;
        });
        // 🔍 Filter po Verzug
        const finalFiltered = showOnlyDelayed
          ? filteredByStatus.filter((task: any) => {
              const isDone = !!task.end_ist;
              //const isInProgress = !!task.start_ist && !task.end_ist;
              const endIstOrToday = isDone ? new Date(task.end_ist) : new Date();

              const verzug = Math.max(
                0,
                Math.ceil((endIstOrToday.getTime() - new Date(task.end_soll).getTime()) / (1000 * 3600 * 24))
              );

              return verzug > 0;
            })
          : filteredByStatus;
        // 🔍 Filter po task name
        const finalTaskList = taskNameFilter
          ? finalFiltered.filter((task: any) =>
              task.task?.toLowerCase().includes(taskNameFilter.toLowerCase())
            )
          : finalFiltered;
        // 🏗️ Filter po strukturi
        const filteredByStructure = finalTaskList.filter((task: any) => {
          const topOk = selectedTops.length === 0 || selectedTops.includes(task.top);
          const ebeneOk = selectedEbenen.length === 0 || selectedEbenen.includes(task.ebene);
          const stiegeOk = selectedStiegen.length === 0 || selectedStiegen.includes(task.stiege);
          const bauteilOk = selectedBauteile.length === 0 || selectedBauteile.includes(task.bauteil);
          return topOk && ebeneOk && stiegeOk && bauteilOk;
        });

        // 🏃‍♂️ Filter po aktivnosti
        const filteredByActivity = selectedActivities.length > 0
          ? filteredByStructure.filter((t: any) => selectedActivities.includes(t.task))
          : filteredByStructure;
          
        // 🏭 Filter po procesnim modelima
        const filteredByProcessModel = selectedProcessModels.length > 0
          ? filteredByActivity.filter((t: any) => selectedProcessModels.includes(getProcessModelName(t)))
          : filteredByActivity;



        // 🔄 Gewerke lista
        const uniqueGewerke: string[] = Array.from(new Set(data.map((t: any) => t.gewerk_name || "Allgemein")));
        setAllGewerke(uniqueGewerke);

        const uniqueWohnungen = Array.from(
          new Set<string>(
            filteredByProcessModel
              .map((t: any) => t.wohnung)
              .filter((v: unknown): v is string => typeof v === "string" && v.length > 0)
          )
        ).sort(natCmp);


        const resList = uniqueWohnungen.map((wohnung) => {
        const row =
          filteredByProcessModel.find((t: any) => t.wohnung === wohnung) ??
          allTasks.find((t: any) => t.wohnung === wohnung);

        return {
          id: wohnung,
          title: wohnung,
          extendedProps: {
            bauteil: row?.bauteil ?? "",
            stiege: row?.stiege ?? "",
            ebene: row?.ebene ?? "",
          },
          gewerk: filteredByProcessModel.find((t: any) => t.wohnung === wohnung)?.gewerk_name || "Allgemein",
        };
      });

        const eventList = filteredByActivity
          .map((task: any) => {
            if (!task.id) {              
              return null; // neće biti dodan u kalendar
            }

            //const isInProgress = !!task.start_ist && !task.end_ist;
            const isDone = !!task.end_ist;
            const endIstOrToday = isDone ? new Date(task.end_ist) : today;

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
                stiege:  task.stiege  ?? "",
                ebene:   task.ebene   ?? "",
                top:     task.top ?? task.wohnung ?? "",
                top_id: task.top_id,                       // broj!
                process_step_id: task.process_step_id,     // broj!
                project_id: task.project_id,  
              },
            };
          })
          .filter(Boolean); // uklanja sve null (taskove bez id)
        

        setResources(resList);
        setEvents(eventList);
      } catch (err) {
        console.error("Fehler beim Laden der Timeline:", err);
      }
    };



  
  useEffect(() => {
    if (!id) return;

    const loadProjectName = async () => {
      try {
        const res = await api.get(`/projects/${id}`, { meta: { showLoader: true } });
        setProjectName(res.data.name);
      } catch (err) {
        console.error("Fehler beim Laden des Projektnamens:", err);
      }
    };

    loadProjectName();
    loadTimeline();
  }, [id, startDateFilter, endDateFilter, selectedGewerke, statusFilter, showOnlyDelayed, taskNameFilter, selectedTops, selectedEbenen, selectedStiegen, selectedBauteile, selectedActivities, selectedProcessModels]);

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
          "Reset alle Filter"
        ]}
      />


      {activeTab === "Filter nach Gewerke" && (
        <GewerkeFilter
          allGewerke={allGewerke}
          selectedGewerke={selectedGewerke}
          setSelectedGewerke={setSelectedGewerke}
        />
      )}

      {activeTab === "Filter nach Datum" && (
        <DateFilter
          startDate={startDateFilter}
          endDate={endDateFilter}
          setStartDate={setStartDateFilter}
          setEndDate={setEndDateFilter}
          onReset={() => {
            setStartDateFilter("");
            setEndDateFilter("");
          }}
        />
      )}

      {activeTab === "Filter nach Status" && (
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




      {activeTab === "Aktivität" && (
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


      {activeTab === "Reset alle Filter" && (
        <div className="mb-4">
          <button
            className="px-4 py-2 bg-red-500 text-white rounded shadow hover:bg-red-600"
            onClick={() => {
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
              setActiveTab(""); // Optional: zatvori filtere
            }}
          >
            🧹 Alle Filter zurücksetzen
          </button>
        </div>
      )}

      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={async (updated) => {
            await api.put(`/tasks/${updated.id}`, {
              start_soll: updated.start_soll,
              end_soll: updated.end_soll,
              start_ist: updated.start_ist,
              end_ist: updated.end_ist,
              status: updated.status,
              beschreibung: updated.beschreibung,
            });

            const verzug = computeVerzug(updated.end_soll, updated.end_ist);

            setEvents(prev =>
              prev.map(e =>
                e.id === String(updated.id)
                  ? { ...e, extendedProps: { ...e.extendedProps, ...updated, verzug } }
                  : e
              )
            );

            setSelectedTask(null);
          }}

          onDelete={async (id) => {
            await api.delete(`/tasks/${id}`);
            // ukloni iz kalendara i zatvori modal
            setEvents((prev) => prev.filter((e) => e.id !== String(id)));
            setSelectedTask(null);
          }}
        />

      )}

    
    <div className="print-area">
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
          const { bauteil, stiege, ebene } = (arg.resource.extendedProps || {}) as {
            bauteil?: string;
            stiege?: string;
            ebene?: string;
          };

          const parts = [
            bauteil && `Bauteil: ${bauteil}`,
            stiege && `Stiege: ${stiege}`,
            ebene && `Ebene: ${ebene}`,
          ].filter(Boolean);

          if (!parts.length) return;


          const txt = parts.join("\n");
          const target =
            (arg.el.querySelector(".fc-datagrid-cell-main") as HTMLElement) || arg.el;

          target.setAttribute("title", txt);
        }}
        eventSources={allSources}

        locale={deLocale}
        eventClick={(info) => {
          setSelectedTask({
            ...info.event.extendedProps,
            id: info.event.id,
            title: info.event.title,
          });
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
              <div style={{ fontSize: 10, whiteSpace: "nowrap", opacity: 0.85 }}>
                {weekday}{holiday ? ` • ${holiday}` : ""}
              </div>
            </div>
          );
        }}

        visibleRange={ printRange ?? defaultVisibleRange }

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
          await api.put(`/tasks/${ev.id}`, payload);
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
          

          const bgColor = arg.event.backgroundColor || "#60a5fa";
          const textColorClass = isColorDark(bgColor) ? "text-white" : "text-black";
          const borderColorClass = isDelayed ? "delayed-outline" : "";

          const bodyLines = [
            `${arg.event.id} 📌 -${arg.event.title}`,
            `🟢 Start soll: ${start_soll}`,
            `🔴 End soll: ${end_soll}`,
            `🟩 Start Ist: ${start_ist || "-"}`,
            `🟥 End Ist: ${end_ist || "-"}`,
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
  );
};

export default TaskCalendar;
