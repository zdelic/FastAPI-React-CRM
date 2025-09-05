// src/utils/calendarAT.ts

// ---------- DATUMI (lokalni, bez UTC shift-a) ----------
export const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

// FullCalendar .end je ekskluzivan u dnevnim pogledima (resourceTimeline bez vremena)
export const endExclusiveToInclusiveYMD = (endExclusive: Date) => {
  const inc = new Date(endExclusive);
  inc.setDate(inc.getDate() - 1);
  return toYMD(inc);
};

// ---------- USKRS i pokretni praznici ----------
export const easterSunday = (year: number): Date => {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

export const austrianHolidaysYear = (year: number) => {
  const E  = easterSunday(year);
  const OM = addDays(E, 1);   // Ostermontag
  const CH = addDays(E, 39);  // Christi Himmelfahrt
  const PM = addDays(E, 50);  // Pfingstmontag
  const FL = addDays(E, 60);  // Fronleichnam

  const fixed = [
    { date: new Date(year, 0, 1),  title: "Neujahr" },
    { date: new Date(year, 0, 6),  title: "Heilige Drei Könige" },
    { date: new Date(year, 4, 1),  title: "Staatsfeiertag" },
    { date: new Date(year, 7, 15), title: "Mariä Himmelfahrt" },
    { date: new Date(year, 9, 26), title: "Nationalfeiertag" },
    { date: new Date(year, 10, 1), title: "Allerheiligen" },
    { date: new Date(year, 11, 8), title: "Mariä Empfängnis" },
    { date: new Date(year, 11, 25), title: "Christtag" },
    { date: new Date(year, 11, 26), title: "Stefanitag" },
  ];

  const moveable = [
    { date: OM, title: "Ostermontag" },
    { date: CH, title: "Christi Himmelfahrt" },
    { date: PM, title: "Pfingstmontag" },
    { date: FL, title: "Fronleichnam" },
    // možeš lako dodati i Karfreitag (E - 2), Ostersonntag (E), itd.
  ];

  return [...fixed, ...moveable];
};

// ---------- Background eventi (praznici & vikendi) ----------
export type BgEvent = {
  id: string;
  title: string;
  start: string; // "YYYY-MM-DD"
  end: string;   // "YYYY-MM-DD" (exclusive)
  display: "background";
  color?: string;
  editable?: boolean;
};

export const makeHolidayEventsForRange = (
  rangeStart: Date,
  rangeEnd: Date,
  options?: { color?: string }
): BgEvent[] => {
  const startY = rangeStart.getFullYear();
  const endY = rangeEnd.getFullYear();
  const color = options?.color ?? "#ef4444";
  const out: BgEvent[] = [];

  for (let y = startY; y <= endY; y++) {
    for (const { date, title } of austrianHolidaysYear(y)) {
      if (date >= addDays(rangeStart, -1) && date <= addDays(rangeEnd, 1)) {
        const s = toYMD(date);
        const e = toYMD(addDays(date, 1)); // exclusive end
        out.push({
          id: `at-hol-${s}`,
          title,
          start: s,
          end: e,
          display: "background",
          color,
          editable: false,
        });
      }
    }
  }
  return out;
};

export const makeWeekendEventsForRange = (
  rangeStart: Date,
  rangeEnd: Date,
  options?: { color?: string }
): BgEvent[] => {
  const color = options?.color ?? "#64748b"; // sivo
  const out: BgEvent[] = [];
  const cur = new Date(rangeStart);

  while (cur <= rangeEnd) {
    const dow = cur.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) {
      const s = toYMD(cur);
      const e = toYMD(addDays(cur, 1));
      out.push({
        id: `wknd-${s}`,
        title: dow === 6 ? "Samstag" : "Sonntag",
        start: s,
        end: e,
        display: "background",
        color,
        editable: false,
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

// ---------- Provjere preklapanja za eventAllow ----------
const parseYMD = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// [startInc, endInc] (inkluizivno) naspram background [hsInc, heExc)
export const overlapsBackground = (
  startInc: string,
  endInc: string,
  background: Pick<BgEvent, "start" | "end">[]
) => {
  const s = parseYMD(startInc);
  const e = parseYMD(endInc);
  for (const bg of background) {
    const hs = parseYMD(bg.start);
    const heExc = parseYMD(bg.end); // exclusive
    const heInc = addDays(heExc, -1);
    // presjek postoji ako nisu disjunktni
    const disjoint = e < hs || s > heInc;
    if (!disjoint) return true;
  }
  return false;
};
