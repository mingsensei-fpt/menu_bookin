import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
  TIME_SLOTS,
  timeToMinutes,
  Booking,
  Table,
} from "@/lib/booking-data";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

const SLOT_W = 48;
const HEADER_HEIGHT = 28;
const TABLE_COL_WIDTH = 48;

function localGetLeft(startTime: string): number {
  const startMins = timeToMinutes(startTime);
  const originMins = timeToMinutes("17:00");
  return ((startMins - originMins) / 30) * SLOT_W;
}

function localGetWidth(startTime: string, endTime: string): number {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  return ((endMins - startMins) / 30) * SLOT_W;
}

function getBookingTimeStatus(booking: Booking, date: Date, now: Date): "past" | "active" | "future" {
  const isToday = format(now, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
  if (!isToday) {
    const bookingDate = new Date(booking.date + "T00:00:00");
    return bookingDate < new Date(format(now, "yyyy-MM-dd") + "T00:00:00") ? "past" : "future";
  }
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = timeToMinutes(booking.start_time);
  const endMins = timeToMinutes(booking.end_time);
  if (nowMins >= startMins && nowMins < endMins) return "active";
  if (nowMins >= endMins) return "past";
  return "future";
}

function formatTimeLabel(slot: string): string {
  const [hStr, mStr] = slot.split(":");
  let h = parseInt(hStr);
  const m = parseInt(mStr);
  const suffix = h >= 12 ? "pm" : "am";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  if (m === 0) return `${h}${suffix}`;
  return `${h}:${mStr}${suffix}`;
}

export interface TimelineViewHandle {
  handleExport: () => Promise<void>;
  exporting: boolean;
}

interface TimelineViewProps {
  date: Date;
  bookings: Booking[];
  tables: Table[];
  onBookingClick: (booking: Booking) => void;
  loading?: boolean;
}

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function BookingBlock({
  booking,
  onClick,
  isFirst,
  spanCount,
  rowHeight,
  timeStatus,
}: {
  booking: Booking;
  onClick: () => void;
  isFirst: boolean;
  spanCount: number;
  rowHeight: string;
  timeStatus: "past" | "active" | "future";
}) {
  const left = localGetLeft(booking.start_time);
  const width = localGetWidth(booking.start_time, booking.end_time);

  const statusClasses: Record<string, string> = {
    confirmed: "bg-booking-confirmed text-booking-confirmed-foreground",
    pending: "bg-booking-pending text-booking-pending-foreground",
    conflict: "bg-booking-conflict text-booking-conflict-foreground",
  };

  const colorClass = timeStatus === "active" || timeStatus === "past"
    ? "bg-booking-past text-booking-past-foreground"
    : statusClasses[booking.status];

  const sortedTableIds = [...booking.table_ids].sort(naturalSort);

  return (
    <button
      onClick={onClick}
      data-block
      data-span={isFirst ? spanCount : undefined}
      className={`absolute rounded-md px-1.5 py-0.5 text-left shadow-sm transition-colors duration-500 active:scale-[0.98] overflow-hidden ${colorClass} ${!isFirst ? "pointer-events-none opacity-0" : ""}`}
      style={{
        left,
        width: Math.max(width, SLOT_W),
        top: 2,
        height: isFirst
          ? `calc(${spanCount} * ${rowHeight} - 4px)`
          : `calc(${rowHeight} - 4px)`,
        zIndex: isFirst ? 5 : 0,
      }}
    >
      {isFirst && (
        <>
          <div className="flex items-baseline gap-1 truncate">
            <span className="truncate text-[10px] font-semibold leading-tight">{booking.customer_name}</span>
            {booking.note && booking.note.trim() !== "" && (
              <span className="shrink-0 rounded px-0.5 text-[8px] font-medium italic bg-yellow-200 text-yellow-900">
                {booking.note}
              </span>
            )}
          </div>
          <div className="truncate text-[8px] opacity-90">
            {booking.number_of_people}p · {booking.start_time}–{booking.end_time}
          </div>
          {sortedTableIds.length > 1 && (
            <div className="truncate text-[8px] opacity-75">
              {sortedTableIds.join(", ")}
            </div>
          )}
        </>
      )}
    </button>
  );
}

export const TimelineView = forwardRef<TimelineViewHandle, TimelineViewProps>(function TimelineView({ date, bookings, tables, onBookingClick, loading }, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const totalWidth = TIME_SLOTS.length * SLOT_W;

  // Update current time every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const tableCount = tables.length || 1;
  const rowHeight = `calc((60dvh - ${HEADER_HEIGHT}px) / ${tableCount})`;

  const isToday = format(currentTime, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
  const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const showNowLine = isToday && nowMins >= timeToMinutes("17:00") && nowMins <= timeToMinutes("22:00");
  const nowLeft = showNowLine
    ? ((nowMins - timeToMinutes("17:00")) / 30) * SLOT_W
    : 0;

  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = showNowLine ? nowLeft - 100 : 0;
      scrollRef.current.scrollLeft = Math.max(0, scrollTo);
    }
  }, [date]);

  useImperativeHandle(ref, () => ({
    handleExport: async () => { await handleExport(); },
    exporting,
  }));

  const handleExport = async () => {
    if (!timelineRef.current) return;
    setExporting(true);
    try {
      const el = timelineRef.current;
      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.width = `${TABLE_COL_WIDTH + totalWidth}px`;
      clone.style.height = "auto";
      clone.style.overflow = "visible";
      clone.style.background = "#ffffff";

      const EXPORT_ROW = 64;

      const nowLines = clone.querySelectorAll<HTMLElement>("[data-now-line]");
      nowLines.forEach((line) => line.remove());

      const rows = clone.querySelectorAll<HTMLElement>("[data-row]");
      rows.forEach((row) => { row.style.height = `${EXPORT_ROW}px`; });

      const gridCells = clone.querySelectorAll<HTMLElement>("[data-grid-cell]");
      gridCells.forEach((cell) => { cell.style.height = `${EXPORT_ROW}px`; });

      const blocks = clone.querySelectorAll<HTMLElement>("[data-block]");
      blocks.forEach((block) => {
        const span = parseInt(block.getAttribute("data-span") || "1");
        block.style.height = `${span * EXPORT_ROW - 6}px`;
        block.style.padding = "6px 8px";
        block.style.boxSizing = "border-box";
        block.style.display = "flex";
        block.style.flexDirection = "column";
        block.style.justifyContent = "center";
        block.style.gap = "2px";
        block.style.overflow = "hidden";
        block.style.alignItems = "flex-start";

        // Fix the name+note row (first div with flex items-baseline)
        const rows = block.querySelectorAll<HTMLElement>(":scope > div");
        rows.forEach((row, index) => {
          row.style.overflow = "visible";
          row.style.textOverflow = "clip";
          row.style.whiteSpace = "nowrap";
          row.style.lineHeight = "1.4";
          row.style.display = "flex";
          row.style.alignItems = "baseline";
          row.style.gap = "4px";
          row.style.width = "100%";

          if (index === 0) {
            row.style.fontSize = "11px";
            row.style.minHeight = "15px";
          } else {
            row.style.fontSize = "9px";
            row.style.minHeight = "12px";
          }

          // Fix individual spans inside rows
          const spans = row.querySelectorAll<HTMLElement>("span");
          spans.forEach((s) => {
            s.style.overflow = "visible";
            s.style.textOverflow = "clip";
            s.style.whiteSpace = "nowrap";
          });
        });
      });

      const stickyEls = clone.querySelectorAll<HTMLElement>(".sticky");
      stickyEls.forEach((s) => {
        s.style.position = "relative";
        s.style.left = "0";
        s.style.top = "0";
      });

      document.body.appendChild(clone);
      await new Promise((r) => setTimeout(r, 200));

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        width: TABLE_COL_WIDTH + totalWidth,
      });

      document.body.removeChild(clone);

      const link = document.createElement("a");
      link.download = `timeline-${format(date, "yyyy-MM-dd")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  };

  const getSlotLabel = (slot: string) => {
    return slot.endsWith(":00") ? formatTimeLabel(slot) : "";
  };

  return (
    <div className="relative flex flex-col flex-1">
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div className="overflow-hidden flex-1" style={{ minHeight: "60dvh" }}>
        <div ref={scrollRef} className="h-full overflow-x-auto overflow-y-hidden">
          <div ref={timelineRef} className="relative" style={{ minWidth: TABLE_COL_WIDTH + totalWidth }}>
            {/* Time header */}
            <div className="sticky top-0 z-20 flex bg-timeline-header border-b border-border" style={{ height: HEADER_HEIGHT }}>
              <div
                className="sticky left-0 z-10 flex-shrink-0 bg-timeline-header"
                style={{ width: TABLE_COL_WIDTH }}
              />
              <div className="relative flex">
                {TIME_SLOTS.map((slot, idx) => {
                  const label = getSlotLabel(slot);
                  const isFirstSlot = idx === 0;
                  return (
                    <div
                      key={slot}
                      className="flex-shrink-0 flex items-center text-muted-foreground relative border-r border-transparent"
                      style={{ width: SLOT_W }}
                    >
                      {label && (
                        <span
                          className="absolute text-[11px] font-bold z-10 whitespace-nowrap"
                          style={{
                            left: 0,
                            top: '50%',
                            transform: isFirstSlot
                              ? 'translate(0, -50%)'
                              : 'translate(-50%, -50%)',
                          }}
                        >
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table rows */}
            {tables.map((table) => {
              const tableBookings = bookings.filter((b) => b.table_ids.includes(table.id));
              return (
                <div
                  key={table.id}
                  data-row
                  className="relative flex border-b border-border"
                  style={{ height: rowHeight }}
                >
                  <div
                    className="sticky left-0 z-10 flex flex-shrink-0 flex-col items-center justify-center border-r border-border bg-card"
                    style={{ width: TABLE_COL_WIDTH }}
                  >
                    <span className="text-[10px] font-bold text-foreground">{table.id}</span>
                    <span className="text-[8px] text-muted-foreground">{table.capacity}p</span>
                  </div>

                  <div className="relative flex">
                    {TIME_SLOTS.map((slot) => (
                      <div
                        key={slot}
                        data-grid-cell
                        className={`flex-shrink-0 border-r ${slot.endsWith(":30") ? "border-foreground/20" : "border-timeline-grid"} ${slot.endsWith(":00") ? "border-l border-l-foreground/20" : ""}`}
                        style={{ width: SLOT_W, height: rowHeight }}
                      />
                    ))}

                    {tableBookings.map((booking) => {
                      const sortedTables = [...booking.table_ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
                      const firstTable = sortedTables[0];
                      const isFirst = table.id === firstTable;
                      const spanCount = sortedTables.length;
                      const timeStatus = getBookingTimeStatus(booking, date, currentTime);

                      return (
                        <BookingBlock
                          key={booking.id}
                          booking={booking}
                          onClick={() => onBookingClick(booking)}
                          isFirst={isFirst}
                          spanCount={spanCount}
                          rowHeight={rowHeight}
                          timeStatus={timeStatus}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {showNowLine && (
              <div
                data-now-line
                className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-destructive"
                style={{ left: TABLE_COL_WIDTH + nowLeft }}
              />
            )}
          </div>
        </div>
      </div>

    </div>
  );
});
