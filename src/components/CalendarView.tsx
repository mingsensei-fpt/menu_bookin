import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CalendarViewProps {
  date: Date;
  onSelectDate: (date: Date) => void;
  datesWithBookings: Set<string>;
}

export function CalendarView({ date, onSelectDate, datesWithBookings }: CalendarViewProps) {
  return (
    <div className="flex flex-1 items-start justify-center p-4">
      <Calendar
        mode="single"
        selected={date}
        onSelect={(d) => d && onSelectDate(d)}
        className={cn("p-3 pointer-events-auto rounded-xl border border-border bg-card shadow-sm")}
        modifiers={{
          hasBooking: (day) => datesWithBookings.has(format(day, "yyyy-MM-dd")),
        }}
        modifiersClassNames={{
          hasBooking: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
        }}
      />
    </div>
  );
}
