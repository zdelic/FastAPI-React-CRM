import React, { useEffect, useMemo, useState } from "react";

interface DateFilterProps {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  onReset: () => void;
}

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
const addWeeks = (d: Date, w: number) => addDays(d, w * 7);

// Monday (ISO) start of week
const startOfISOWeek = (d: Date) => {
  const r = new Date(d);
  const day = r.getDay(); // 0=Sun,1=Mon,...6=Sat
  const diffToMon = (day + 6) % 7;
  r.setHours(0, 0, 0, 0);
  return addDays(r, -diffToMon);
};

// ⇩ ZADRŽI SAMO OVU VARIJANTU (izvan komponente)
const weekSpanFromRange = (startISO: string, endISO: string) => {
  if (!startISO || !endISO) return 2;
  const s = fromISO(startISO);
  const e = fromISO(endISO);
  const days = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1; // inclusive
  return Math.max(1, Math.ceil(days / 7)); // ceil da 6W ostane 6
};

const DateFilter: React.FC<DateFilterProps> = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onReset,
}) => {
  const [weeksSpan, setWeeksSpan] = useState<number>(() =>
    weekSpanFromRange(startDate, endDate)
  );

  useEffect(() => {
    setWeeksSpan(weekSpanFromRange(startDate, endDate));
  }, [startDate, endDate]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Preset iz “danas”: ukupno tačno `span` sedmica
  // (1 sedmica prije + (span-2) poslije, do nedjelje)
  const applyPresetFromToday = (span: number) => {
    const thisWeekMon = startOfISOWeek(today);
    const start = addWeeks(thisWeekMon, -1);                 // jedna sedmica prije
    const end = addDays(addWeeks(thisWeekMon, span - 2), 6); // do nedjelje
    setWeeksSpan(span);
    setStartDate(toISO(start));
    setEndDate(toISO(end));
  };

  // Strelice: pomjeri za aktivni "weeksSpan"
  const shiftBySpan = (direction: -1 | 1) => {
    if (!startDate || !endDate) return;
    const newStart = addWeeks(fromISO(startDate), direction * weeksSpan);
    const newEnd = addWeeks(fromISO(endDate), direction * weeksSpan);
    setStartDate(toISO(newStart));
    setEndDate(toISO(newEnd));
  };

  return (
    <div className="flex flex-col gap-3 mb-4 text-sm">
      <div className="flex gap-4 items-center text-sm">
        <label className="text-sm text-gray-700">
          Start:
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="ml-2 border px-2 py-1 rounded"
          />
        </label>
        <label className="text-sm text-gray-700">
          Ende:
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="ml-2 border px-2 py-1 rounded"
          />
        </label>

        <button
          className="ml-2 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          onClick={onReset}
        >
          Filter Reset
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1 rounded border hover:bg-gray-100"
          title={`Verschieben durch ${weeksSpan} Wochen`}
          onClick={() => shiftBySpan(-1)}
        >
          ←
        </button>

        <div className="flex gap-2">
          {[3, 4, 6].map((span) => (
            <button
              key={span}
              className={
                "px-3 py-1 rounded border text-xs " +
                (weeksSpan === span
                  ? "bg-blue-600 text-white border-blue-600"
                  : "hover:bg-gray-100")
              }
              onClick={() => applyPresetFromToday(span)}
              title={`${span} Wochen anzeigen (1 davor, ${span - 2} danach)`}
            >
              {span}W
            </button>
          ))}
        </div>

        <button
          className="px-3 py-1 rounded border hover:bg-gray-100"
          title={`Verschieben durch ${weeksSpan} Wochen`}
          onClick={() => shiftBySpan(1)}
        >
          →
        </button>

        <span className="ml-2 text-xs text-gray-500">
          Zeitraum: {weeksSpan} Wochen
        </span>
      </div>
    </div>
  );
};

export default DateFilter;
