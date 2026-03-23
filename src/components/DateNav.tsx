import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addDays, subDays } from "date-fns";
import { ReactNode } from "react";

interface DateNavProps {
  date: Date;
  onDateChange: (date: Date) => void;
  view: "calendar" | "timeline";
  onViewChange: (view: "calendar" | "timeline") => void;
  children?: ReactNode;
}

export function DateNav({ date, onDateChange, view, onViewChange, children }: DateNavProps) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => onDateChange(subDays(date, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <button
          onClick={() => onViewChange("calendar")}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
        >
          {format(date, "EEE, MMM d")}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => onDateChange(addDays(date, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex rounded-lg bg-muted p-0.5">
        <button
          onClick={() => onViewChange("calendar")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "calendar"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Calendar
        </button>
        <button
          onClick={() => onViewChange("timeline")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "timeline"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Timeline
        </button>
      </div>
    </div>
  );
}
