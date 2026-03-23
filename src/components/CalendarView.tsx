import { useRef, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Download, Loader2, X } from "lucide-react";
import html2canvas from "html2canvas";

interface CalendarViewProps {
  date: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
  datesWithBookings: Set<string>;
}

export function CalendarView({ date, onSelectDate, onClose, datesWithBookings }: CalendarViewProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!calendarRef.current) return;
    setExporting(true);
    try {
      const wrapper = calendarRef.current;
      const prevStyle = wrapper.style.cssText;
      wrapper.style.maxHeight = "none";
      wrapper.style.overflow = "visible";
      await new Promise((r) => setTimeout(r, 100));
      const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: null, useCORS: true });
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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-black/40 animate-in fade-in" onClick={onClose} />

      {/* Popup panel */}
      <div className="fixed inset-x-0 top-0 z-40 flex justify-center pt-14">
        <div
          className="w-full max-w-sm mx-3 rounded-2xl border border-border bg-card shadow-xl animate-in slide-in-from-top-4 fade-in duration-200"
          style={{ maxHeight: "50dvh", overflow: "auto" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar */}
          <div ref={calendarRef} className="flex items-center justify-center px-4 pb-4">
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
