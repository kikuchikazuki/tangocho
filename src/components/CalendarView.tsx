import { useState } from "react";
import { getMonthDays, hasCompletionOnDate, isPageCompleted } from "../domain/calendar";
import type { CompletionRecord, Page } from "../domain/types";

type CalendarViewProps = {
  pages: Page[];
  completionRecords: CompletionRecord[];
  today: string;
  onToggleCompletion: (date: string, pageId: string) => void;
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarView({
  pages,
  completionRecords,
  today,
  onToggleCompletion,
}: CalendarViewProps) {
  const [displayMonth, setDisplayMonth] = useState(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  }));
  const [selectedDate, setSelectedDate] = useState(today);

  const changeMonth = (offset: number) => {
    setDisplayMonth(({ year, month }) => {
      const nextMonth = month + offset;
      return {
        year: year + Math.floor(nextMonth / 12),
        month: ((nextMonth % 12) + 12) % 12,
      };
    });
  };

  const selectDate = (date: string, inMonth: boolean) => {
    setSelectedDate(date);
    if (!inMonth) {
      setDisplayMonth({
        year: Number(date.slice(0, 4)),
        month: Number(date.slice(5, 7)) - 1,
      });
    }
  };

  const selectedYear = Number(selectedDate.slice(0, 4));
  const selectedMonth = Number(selectedDate.slice(5, 7));
  const selectedDay = Number(selectedDate.slice(8, 10));

  return (
    <section className="calendar" aria-label="カレンダー">
      <div className="calendar-header">
        <button type="button" onClick={() => changeMonth(-1)}>
          前の月
        </button>
        <h2>{displayMonth.year}年{displayMonth.month + 1}月</h2>
        <button type="button" onClick={() => changeMonth(1)}>
          次の月
        </button>
      </div>
      <div className="calendar-grid">
        {weekdays.map((weekday) => (
          <div className="calendar-weekday" key={weekday}>{weekday}</div>
        ))}
        {getMonthDays(displayMonth.year, displayMonth.month).map((day) => (
          <button
            type="button"
            key={day.date}
            aria-label={`${day.date}${hasCompletionOnDate(completionRecords, day.date) ? " 学習完了" : ""}`}
            data-date={day.date}
            aria-pressed={day.date === selectedDate}
            className={[
              "calendar-day",
              hasCompletionOnDate(completionRecords, day.date) && "has-completion",
              !day.inMonth && "outside-month",
              day.date === selectedDate && "selected",
            ].filter(Boolean).join(" ")}
            onClick={() => selectDate(day.date, day.inMonth)}
          >
            {day.day}
          </button>
        ))}
      </div>
      <div className="completion-editor">
        <h3>{selectedYear}年{selectedMonth}月{selectedDay}日</h3>
        <div className="completion-list">
          {pages.map((page) => {
            const completed = isPageCompleted(completionRecords, selectedDate, page.id);
            return (
              <button
                type="button"
                key={page.id}
                className={`completion-toggle${completed ? " completed" : ""}`}
                aria-pressed={completed}
                onClick={() => onToggleCompletion(selectedDate, page.id)}
              >
                {page.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
