import { useRef, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

interface CalendarViewProps {
  date: Date;
  onSelectDate: (date: Date) => void;
  datesWithBookings: Set<string>;
}

export function CalendarView({ date, onSelectDate, datesWithBookings }: CalendarViewProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!calendarRef.current) return;
    setExporting(true);

    try {
      const wrapper = calendarRef.current;
      const prevStyle = wrapper.style.cssText;
      wrapper.style.height = "auto";
      wrapper.style.maxHeight = "none";
      wrapper.style.overflow = "visible";

      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      wrapper.style.cssText = prevStyle;

      const link = document.createElement("a");
      link.download = `calendar-${format(date, "yyyy-MM")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "50dvh", minHeight: 320 }}>
      <div className="flex justify-end px-4 pt-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:opacity-60"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export as Image
        </button>
      </div>

      <div
        ref={calendarRef}
        className="flex flex-1 items-center justify-center p-4"
        style={{ maxHeight: "calc(50dvh - 48px)", overflow: "hidden" }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onSelectDate(d)}
          className={cn("p-3 pointer-events-auto rounded-xl border border-border bg-card shadow-sm")}
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
  );
}
