import { Booking } from "@/lib/booking-data";
import { MessageSquare, Users, Clock } from "lucide-react";

interface ReservationListProps {
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
}

export function ReservationList({ bookings, onBookingClick }: ReservationListProps) {
  const sorted = [...bookings].sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No reservations for this day
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {sorted.map((booking) => (
        <button
          key={booking.id}
          onClick={() => onBookingClick(booking)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 active:bg-accent"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">
                {booking.customer_name}
              </span>
              <span
                className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${
                  booking.status === "confirmed"
                    ? "bg-booking-confirmed"
                    : booking.status === "conflict"
                    ? "bg-booking-conflict"
                    : "bg-booking-pending"
                }`}
              />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {booking.start_time} – {booking.end_time}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {booking.number_of_people}
              </span>
              <span className="text-muted-foreground/70">
                {booking.table_ids.join(", ")}
              </span>
            </div>
            {booking.note && (
              <div className="flex items-start gap-1 mt-1 text-xs text-muted-foreground/80">
                <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="truncate">{booking.note}</span>
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
