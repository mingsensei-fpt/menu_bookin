import { DeletedBooking } from "@/hooks/use-bookings";
import { Button } from "@/components/ui/button";
import { Clock, Users, MapPin, Globe, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useMemo } from "react";

interface DeletedBookingsListProps {
  bookings: DeletedBooking[];
  onRestore: (id: string) => void;
  canRestore: boolean;
}

export function DeletedBookingsList({ bookings, onRestore, canRestore }: DeletedBookingsListProps) {
  // Sort by deletion time, most recent first.
  const sorted = useMemo(
    () =>
      [...bookings].sort((a, b) =>
        (b.deleted_at || "").localeCompare(a.deleted_at || "")
      ),
    [bookings]
  );

  if (bookings.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No deleted bookings for this day
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-1">
        {bookings.length} deleted booking{bookings.length === 1 ? "" : "s"} on this day
      </div>
      {sorted.map((b) => (
        <div
          key={b.id}
          className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground truncate line-through opacity-80">
              {b.customer_name}
            </span>
            {canRestore && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => onRestore(b.id)}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Restore
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {b.start_time} – {b.end_time}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {b.number_of_people}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {b.table_ids.join(", ")}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80 border-t border-border/40 pt-2">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              IP: {b.deleted_by_ip || "unknown"}
            </span>
            <span>
              Deleted:{" "}
              {b.deleted_at
                ? format(new Date(b.deleted_at), "yyyy-MM-dd HH:mm")
                : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
