import { useRef, useEffect } from "react";
import {
  TABLES,
  TIME_SLOTS,
  SLOT_WIDTH,
  getBookingLeft,
  getBookingWidth,
  timeToMinutes,
  Booking,
} from "@/lib/booking-data";
import { format } from "date-fns";

const HEADER_HEIGHT = 32; // time header row height in px
const TABLE_COL_WIDTH = 56;

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
  const left = getBookingLeft(booking.start_time);
  const width = getBookingWidth(booking.start_time, booking.end_time);

  const statusClasses: Record<string, string> = {
    confirmed: "bg-booking-confirmed text-booking-confirmed-foreground",
    pending: "bg-booking-pending text-booking-pending-foreground",
    conflict: "bg-booking-conflict text-booking-conflict-foreground",
  };

  return (
    <button
      onClick={onClick}
      className={`absolute rounded-lg px-2 py-0.5 text-left shadow-sm transition-transform active:scale-[0.98] overflow-hidden ${statusClasses[booking.status]} ${!isFirst ? "pointer-events-none opacity-0" : ""}`}
      style={{
        left,
        width: Math.max(width, SLOT_WIDTH),
        top: 2,
        height: isFirst
          ? `calc(${spanCount} * ${rowHeight} - 4px)`
          : `calc(${rowHeight} - 4px)`,
        zIndex: isFirst ? 5 : 0,
      }}
    >
      {isFirst && (
        <>
          <div className="truncate text-[11px] font-semibold leading-tight">{booking.customer_name}</div>
          <div className="truncate text-[9px] opacity-90">
            {booking.number_of_people}p · {booking.start_time}–{booking.end_time}
          </div>
          {booking.table_ids.length > 1 && (
            <div className="truncate text-[9px] opacity-75">
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
  const totalWidth = TIME_SLOTS.length * SLOT_WIDTH;

  // Each row takes equal share of remaining height after header
  const rowHeight = `calc((60dvh - ${HEADER_HEIGHT}px) / ${TABLES.length})`;

  const now = new Date();
  const isToday = format(now, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const showNowLine = isToday && nowMins >= timeToMinutes("17:00") && nowMins <= timeToMinutes("22:00");
  const nowLeft = showNowLine
    ? ((nowMins - timeToMinutes("17:00")) / 30) * SLOT_WIDTH
    : 0;

  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = showNowLine ? nowLeft - 100 : 0;
      scrollRef.current.scrollLeft = Math.max(0, scrollTo);
    }
  }, [date]);

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "60dvh" }}>
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="relative" style={{ minWidth: TABLE_COL_WIDTH + totalWidth }}>
          {/* Time header row - sticky top */}
          <div className="sticky top-0 z-20 flex bg-timeline-header border-b border-border" style={{ height: HEADER_HEIGHT }}>
            <div
              className="sticky left-0 z-10 flex-shrink-0 bg-timeline-header border-r border-border"
              style={{ width: TABLE_COL_WIDTH }}
            />
            <div className="flex">
              {TIME_SLOTS.map((slot) => (
                <div
                  key={slot}
                  className="flex-shrink-0 border-r border-border px-1 flex items-center justify-center text-[10px] font-medium text-muted-foreground"
                  style={{ width: SLOT_WIDTH }}
                >
                  {slot}
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
                className="relative flex border-b border-border"
                style={{ height: rowHeight }}
              >
                {/* Sticky table label */}
                <div
                  className="sticky left-0 z-10 flex flex-shrink-0 flex-col items-center justify-center border-r border-border bg-card"
                  style={{ width: TABLE_COL_WIDTH }}
                >
                  <span className="text-[11px] font-bold text-foreground">{table.id}</span>
                  <span className="text-[9px] text-muted-foreground">{table.capacity}p</span>
                </div>

                {/* Grid background */}
                <div className="relative flex">
                  {TIME_SLOTS.map((slot) => (
                    <div
                      key={slot}
                      className="flex-shrink-0 border-r border-timeline-grid"
                      style={{ width: SLOT_WIDTH, height: rowHeight }}
                    />
                  ))}

                  {/* Bookings */}
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

          {/* Now indicator */}
          {showNowLine && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-destructive"
              style={{ left: TABLE_COL_WIDTH + nowLeft }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
