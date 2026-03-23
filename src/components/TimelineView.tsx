import { useRef, useEffect, useState } from "react";
import {
  TABLES,
  TIME_SLOTS,
  getBookingLeft,
  getBookingWidth,
  timeToMinutes,
  Booking,
} from "@/lib/booking-data";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

const SLOT_W = 48; // smaller slot width
const HEADER_HEIGHT = 28;
const TABLE_COL_WIDTH = 48;

// Override position helpers to use local SLOT_W
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

interface TimelineViewProps {
  date: Date;
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
}

function BookingBlock({
  booking,
  onClick,
  isFirst,
  spanCount,
  rowHeight,
}: {
  booking: Booking;
  onClick: () => void;
  isFirst: boolean;
  spanCount: number;
  rowHeight: string;
}) {
  const left = localGetLeft(booking.start_time);
  const width = localGetWidth(booking.start_time, booking.end_time);

  const statusClasses: Record<string, string> = {
    confirmed: "bg-booking-confirmed text-booking-confirmed-foreground",
    pending: "bg-booking-pending text-booking-pending-foreground",
    conflict: "bg-booking-conflict text-booking-conflict-foreground",
  };

  return (
    <button
      onClick={onClick}
      data-block
      data-span={isFirst ? spanCount : undefined}
      className={`absolute rounded-md px-1.5 py-0.5 text-left shadow-sm transition-transform active:scale-[0.98] overflow-hidden ${statusClasses[booking.status]} ${!isFirst ? "pointer-events-none opacity-0" : ""}`}
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
          <div className="truncate text-[10px] font-semibold leading-tight">{booking.customer_name}</div>
          <div className="truncate text-[8px] opacity-90">
            {booking.number_of_people}p · {booking.start_time}–{booking.end_time}
          </div>
          {booking.table_ids.length > 1 && (
            <div className="truncate text-[8px] opacity-75">
              {booking.table_ids.join(", ")}
            </div>
          )}
        </>
      )}
    </button>
  );
}

export function TimelineView({ date, bookings, onBookingClick }: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const totalWidth = TIME_SLOTS.length * SLOT_W;

  const rowHeight = `calc((60dvh - ${HEADER_HEIGHT}px) / ${TABLES.length})`;

  const now = new Date();
  const isToday = format(now, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
  const nowMins = now.getHours() * 60 + now.getMinutes();
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

  const handleExport = async () => {
    if (!timelineRef.current) return;
    setExporting(true);
    try {
      // Clone the timeline into an offscreen container for clean capture
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

      // Remove the now-indicator (red line)
      const nowLines = clone.querySelectorAll<HTMLElement>("[data-now-line]");
      nowLines.forEach((line) => line.remove());

      // Reset all rows to fixed height for export
      const rows = clone.querySelectorAll<HTMLElement>("[data-row]");
      rows.forEach((row) => {
        row.style.height = `${EXPORT_ROW}px`;
      });

      // Fix grid cells too
      const gridCells = clone.querySelectorAll<HTMLElement>("[data-grid-cell]");
      gridCells.forEach((cell) => {
        cell.style.height = `${EXPORT_ROW}px`;
      });

      // Fix booking blocks for export layout
      const blocks = clone.querySelectorAll<HTMLElement>("[data-block]");
      blocks.forEach((block) => {
        const span = parseInt(block.getAttribute("data-span") || "1");
        block.style.height = `${span * EXPORT_ROW - 6}px`;
        block.style.padding = "8px 10px";
        block.style.boxSizing = "border-box";
        block.style.display = "flex";
        block.style.flexDirection = "column";
        block.style.justifyContent = "center";
        block.style.gap = "3px";
        block.style.overflow = "hidden";
        block.style.whiteSpace = "normal";
        block.style.alignItems = "flex-start";

        const textLines = block.querySelectorAll<HTMLElement>("div");
        textLines.forEach((line, index) => {
          line.style.overflow = "visible";
          line.style.textOverflow = "clip";
          line.style.whiteSpace = "nowrap";
          line.style.lineHeight = index === 0 ? "1.35" : "1.4";
          line.style.fontSize = index === 0 ? "11px" : "9px";
          line.style.minHeight = index === 0 ? "15px" : "13px";
          line.style.display = "block";
        });
      });

      // Remove sticky positioning for clean render
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

  // Only show label for full hours, half hours get empty label
  const getSlotLabel = (slot: string) => {
    return slot.endsWith(":00") ? slot : "";
  };

  return (
    <div className="flex flex-col">
      <div className="overflow-hidden" style={{ height: "60dvh" }}>
        <div ref={scrollRef} className="h-full overflow-x-auto overflow-y-hidden">
          <div ref={timelineRef} className="relative" style={{ minWidth: TABLE_COL_WIDTH + totalWidth }}>
            {/* Time header */}
            <div className="sticky top-0 z-20 flex bg-timeline-header border-b border-border" style={{ height: HEADER_HEIGHT }}>
              <div
                className="sticky left-0 z-10 flex-shrink-0 bg-timeline-header border-r border-border"
                style={{ width: TABLE_COL_WIDTH }}
              />
              <div className="flex">
                {TIME_SLOTS.map((slot) => (
                  <div
                    key={slot}
                    className="flex-shrink-0 border-r border-border flex items-center justify-center text-[9px] font-medium text-muted-foreground"
                    style={{ width: SLOT_W }}
                  >
                    {getSlotLabel(slot)}
                  </div>
                ))}
              </div>
            </div>

            {/* Table rows */}
            {TABLES.map((table) => {
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
                      className={`flex-shrink-0 border-r ${slot.endsWith(":00") ? "border-border" : "border-timeline-grid"}`}
                      style={{ width: SLOT_W, height: rowHeight }}
                    />
                    ))}

                    {tableBookings.map((booking) => {
                      const sortedTables = [...booking.table_ids].sort();
                      const firstTable = sortedTables[0];
                      const isFirst = table.id === firstTable;
                      const spanCount = sortedTables.length;

                      return (
                        <BookingBlock
                          key={booking.id}
                          booking={booking}
                          onClick={() => onBookingClick(booking)}
                          isFirst={isFirst}
                          spanCount={spanCount}
                          rowHeight={rowHeight}
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

      {/* Export button below timeline */}
      <div className="flex justify-center py-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:opacity-60"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export Timeline as PNG
        </button>
      </div>
    </div>
  );
}
