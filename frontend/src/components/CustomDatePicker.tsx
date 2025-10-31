import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { de } from "date-fns/locale";
import { getAustriaHolidays, getWeekends } from "../utils/atHolidays";


const CalendarInput = React.forwardRef<
  HTMLInputElement,
  {
    value?: string;
    onClick?: () => void;
    placeholder?: string;
    disabled?: boolean;
    label?: string;
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  }
>(({ value, onClick, placeholder, disabled, label, onKeyDown }, ref) => {
  const hasValue = !!value && value.trim().length > 0;

  return (
    <div className="relative inline-flex items-center">
      {/* floating label */}
      {label ? (
        <span
          className={[
            "pointer-events-none absolute left-3 top-1",
            "text-[10px] leading-none tracking-wide",
            disabled ? "text-slate-500" : "text-slate-400",
          ].join(" ")}
        >
          {label}
        </span>
      ) : null}

      <input
        ref={ref}
        value={value}
        onClick={onClick}
        onKeyDown={onKeyDown}
        readOnly
        placeholder={label ? undefined : placeholder}
        disabled={disabled}
        className={[
          "w-[170px]",
          "bg-slate-800/60 text-slate-100 placeholder-slate-400",
          "border border-slate-600 rounded-md",
          "px-3 py-1.5 pr-9",
          label ? "pt-4" : "", // 👈 ostavi prostor za label
          "focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        ].join(" ")}
      />

      <button
        type="button"
        onClick={onClick}
        className="absolute right-2 text-slate-300 hover:text-slate-100 disabled:opacity-50"
        disabled={disabled}
        aria-label="Kalender öffnen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9ZM5 7h14a1 1 0 0 1 1 1v1H4V8a1 1 0 0 1 1-1Z" />
        </svg>
      </button>
    </div>
  );
});
CalendarInput.displayName = "CalendarInput";

  


type Props = {
  value: string | null;
  onChange: (isoDateOrNull: string | null) => void;
  disabled?: boolean;
  label?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

function parseISO(d?: string | null): Date | null {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}
function toDates(arr: string[]): Date[] {
  return arr.map((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  });
}

const CustomDatePicker: React.FC<Props> = ({
  value,
  onChange,
  disabled,
  label,
  onKeyDown,
}) => {
  const selected = parseISO(value);
  const year = (selected ?? new Date()).getFullYear();

  const { weekends, holidayDates, holidayNames } = React.useMemo(() => {
    const holiMap = getAustriaHolidays(year);
    const holidayDates = Object.keys(holiMap).sort();
    return {
      weekends: getWeekends(year),
      holidayDates,
      holidayNames: holiMap,
    };
  }, [year]);

  const highlightDates = React.useMemo(
    () => [
      { "react-datepicker__day--weekend": toDates(weekends) },
      { "react-datepicker__day--holiday": toDates(holidayDates) },
    ],
    [weekends, holidayDates]
  );

  const handleChange = (d: Date | null) => {
    if (!d) return onChange(null);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${day}`);
  };

  const renderDay = (day: number, date?: Date) => {
    if (!date) return <span>{day}</span>;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    const title = holidayNames[key];
    return <span title={title ? `📅 ${title}` : undefined}>{day}</span>;
  };

  return (
    <DatePicker
      locale={de}
      selected={selected}
      onChange={handleChange}
      highlightDates={highlightDates}
      dateFormat="dd.MM.yyyy"
      customInput={<CalendarInput label={label} onKeyDown={onKeyDown} />}
      wrapperClassName="inline-block"
      calendarClassName="dp-eu"
      disabled={!!disabled}
      renderDayContents={renderDay}
      isClearable
      clearButtonTitle="Datum löschen"
      className="my-datepicker"
    />
  );
};

export default CustomDatePicker;
export { CustomDatePicker };
