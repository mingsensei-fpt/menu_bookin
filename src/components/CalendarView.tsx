import { useRef, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { X } from "lucide-react";

interface CalendarViewProps {
  date: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
  datesWithBookings: Set<string>;
}

export function CalendarView({ date, onSelectDate, onClose, datesWithBookings }: CalendarViewProps) {
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40 animate-in fade-in" onClick={onClose} />

      <div className="fixed inset-x-0 top-0 z-40 flex justify-center pt-14">
        <div
          className="w-full max-w-sm mx-3 rounded-2xl border border-border bg-card shadow-xl animate-in slide-in-from-top-4 fade-in duration-200"
          style={{ maxHeight: "50dvh", overflow: "auto" }}
        >
          <div className="flex items-center justify-end px-4 pt-3 pb-1">
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-center px-4 pb-4">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && onSelectDate(d)}
              className={cn("p-3 pointer-events-auto")}
              modifiers={{
                hasBooking: (day) => datesWithBookings.has(format(day, "yyyy-MM-dd")),
              }}
              modifiersClassNames={{
                hasBooking:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
