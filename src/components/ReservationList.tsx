import { Booking, timeToMinutes } from "@/lib/booking-data";
import { MessageSquare, Users, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState, useEffect } from "react";

interface ReservationListProps {
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
}

function getTimeStatus(booking: Booking, now: Date): "past" | "active" | "future" {
  const isToday = format(now, "yyyy-MM-dd") === booking.date;
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

export function ReservationList({ bookings, onBookingClick }: ReservationListProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const sorted = useMemo(
    () => [...bookings].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [bookings]
  );

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No reservations for this day
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {sorted.map((booking) => {
        const status = getTimeStatus(booking, now);
        const isActive = status === "active";
        const isPast = status === "past";

        return (
          <button
            key={booking.id}
            onClick={() => onBookingClick(booking)}
            className={`relative w-full rounded-xl border px-4 py-3 text-left shadow-sm transition-all duration-300 active:scale-[0.98] ${
              isActive
                ? "border-booking-past/50 bg-booking-past/15"
                : isPast
                ? "border-border/50 bg-muted/50 opacity-60"
                : booking.status === "conflict"
                ? "border-booking-conflict/30 bg-booking-conflict/5"
                : "border-border bg-card"
            }`}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-booking-past opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-booking-past" />
                </span>
                <span className="text-[10px] font-medium text-booking-past-foreground bg-booking-past/20 px-1.5 py-0.5 rounded">
                  Active
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-foreground truncate">
                {booking.customer_name}
              </span>
              <span
                className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${
                  isActive || isPast
                    ? "bg-booking-past"
                    : booking.status === "confirmed"
                    ? "bg-booking-confirmed"
                    : booking.status === "conflict"
                    ? "bg-booking-conflict"
                    : "bg-booking-pending"
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {booking.start_time} – {booking.end_time}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {booking.number_of_people}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {booking.table_ids.join(", ")}
              </span>
            </div>

            {booking.note && booking.note.trim() !== "" && (
              <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground/80 bg-muted/50 rounded-lg px-2.5 py-1.5">
                <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{booking.note}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
