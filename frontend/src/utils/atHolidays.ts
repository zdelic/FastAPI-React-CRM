function easterSunday(year: number): Date {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function getAustriaHolidays(year: number): Record<string, string> {
  const res: Record<string, string> = {};
  const easter = easterSunday(year);

  // Fiksni:
  res[`${year}-01-01`] = "Neujahr";
  res[`${year}-01-06`] = "Heilige Drei Könige";
  res[`${year}-05-01`] = "Staatsfeiertag";
  res[`${year}-08-15`] = "Mariä Himmelfahrt";
  res[`${year}-10-26`] = "Nationalfeiertag";
  res[`${year}-11-01`] = "Allerheiligen";
  res[`${year}-12-08`] = "Mariä Empfängnis";
  res[`${year}-12-25`] = "Christtag";
  res[`${year}-12-26`] = "Stefanitag";

  // Pomični:
  const easterMon = addDays(easter, 1);
  const ascension = addDays(easter, 39);
  const whitMon = addDays(easter, 50);
  const corpusChristi = addDays(easter, 60);

  res[ymd(easterMon)] = "Ostermontag";
  res[ymd(ascension)] = "Christi Himmelfahrt";
  res[ymd(whitMon)] = "Pfingstmontag";
  res[ymd(corpusChristi)] = "Fronleichnam";
  return res;
}
export function getWeekends(year: number): string[] {
  const out: string[] = [];
  const d = new Date(year, 0, 1);
  while (d.getFullYear() === year) {
    if (d.getDay() === 0 || d.getDay() === 6) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      out.push(`${y}-${m}-${day}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}
