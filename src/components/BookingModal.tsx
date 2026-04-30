import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Booking, Table, addHours } from "@/lib/booking-data";
import { Trash2, Lock, Unlock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Booking, "id" | "status">) => Promise<{ conflict: boolean }> | { conflict: boolean } | void;
  onDelete?: (id: string) => void;
  onToggleSeal?: (id: string, seal: boolean) => Promise<boolean> | void;
  booking?: Booking | null;
  date: string;
  tables: Table[];
}

export function BookingModal({ open, onClose, onSave, onDelete, onToggleSeal, booking, date, tables }: BookingModalProps) {
  const { isSuperAdmin } = useAuth();
  const defaultTableId = tables.length > 0 ? tables[0].id : "T1";

  const [form, setForm] = useState({
    customer_name: "",
    number_of_people: 2,
    table_ids: [defaultTableId] as string[],
    start_time: "18:00",
    end_time: "",
    note: "",
  });
  const [warning, setWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sealing, setSealing] = useState(false);

  const sealed = !!booking?.is_sealed;
  // Non-super admin cannot edit a sealed booking
  const readOnly = sealed && !isSuperAdmin;

  useEffect(() => {
    if (booking) {
      setForm({
        customer_name: booking.customer_name,
        number_of_people: booking.number_of_people,
        table_ids: booking.table_ids,
        start_time: booking.start_time,
        end_time: booking.end_time,
        note: booking.note,
      });
    } else {
      setForm({
        customer_name: "",
        number_of_people: 2,
        table_ids: [tables.length > 0 ? tables[0].id : "T1"],
        start_time: "18:00",
        end_time: "",
        note: "",
      });
    }
    setWarning(false);
  }, [booking, open, tables]);

  const handleSubmit = async () => {
    if (submitting || readOnly) return;
    if (!form.customer_name.trim() || form.table_ids.length === 0) return;
    setSubmitting(true);
    try {
      const endTime = form.end_time || addHours(form.start_time, 2);
      const data = { ...form, end_time: endTime, date };
      const result = await onSave(data);
      if (result && 'conflict' in result && result.conflict) {
        setWarning(true);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSealToggle = async () => {
    if (!booking || !onToggleSeal || sealing) return;
    setSealing(true);
    try {
      await onToggleSeal(booking.id, !sealed);
      onClose();
    } finally {
      setSealing(false);
    }
  };

  const toggleTable = (tableId: string) => {
    if (readOnly) return;
    setForm((f) => {
      const ids = f.table_ids.includes(tableId)
        ? f.table_ids.filter((id) => id !== tableId)
        : [...f.table_ids, tableId];
      return { ...f, table_ids: ids };
    });
  };

  const update = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canShowSealButton = !!booking && !!onToggleSeal && (!sealed || isSuperAdmin);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] rounded-xl sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {booking ? "Edit Booking" : "New Booking"}
            {sealed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                <Lock className="h-3 w-3" /> Sealed
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div>
            <Label htmlFor="name">Customer Name</Label>
            <Input
              id="name"
              value={form.customer_name}
              onChange={(e) => update("customer_name", e.target.value)}
              placeholder="Enter name"
              disabled={readOnly}
            />
          </div>

          <div>
            <Label htmlFor="people">Guests</Label>
            <Input
              id="people"
              type="number"
              min={1}
              value={form.number_of_people}
              onChange={(e) => update("number_of_people", parseInt(e.target.value) || 1)}
              disabled={readOnly}
            />
          </div>

          <div>
            <Label>Tables (each seats 2)</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {tables.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  } ${
                    form.table_ids.includes(t.id)
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <Checkbox
                    checked={form.table_ids.includes(t.id)}
                    onCheckedChange={() => toggleTable(t.id)}
                    disabled={readOnly}
                    className="h-3.5 w-3.5"
                  />
                  {t.id}
                </label>
              ))}
            </div>
            {form.table_ids.length === 0 && !readOnly && (
              <p className="mt-1 text-xs text-destructive">Select at least one table</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                type="time"
                value={form.start_time}
                onChange={(e) => update("start_time", e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="end">End Time</Label>
              <Input
                id="end"
                type="time"
                value={form.end_time}
                onChange={(e) => update("end_time", e.target.value)}
                placeholder="Auto: +2h"
                disabled={readOnly}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              placeholder="Special requests..."
              rows={2}
              disabled={readOnly}
            />
          </div>

          {warning && (
            <p className="text-xs text-booking-conflict font-medium">
              ⚠ This booking conflicts with another. It was saved but marked in red.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {booking && onDelete && !readOnly && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(booking.id);
                onClose();
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          )}
          {canShowSealButton && (
            <Button
              variant={sealed ? "outline" : "secondary"}
              size="sm"
              onClick={handleSealToggle}
              disabled={sealing}
              className={sealed ? "border-amber-500/40 text-amber-700 dark:text-amber-400" : ""}
            >
              {sealed ? (
                <>
                  <Unlock className="mr-1 h-4 w-4" /> Huỷ phong ấn
                </>
              ) : (
                <>
                  <Lock className="mr-1 h-4 w-4" /> Phong ấn
                </>
              )}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button onClick={handleSubmit} disabled={form.table_ids.length === 0 || submitting}>
              {submitting ? (booking ? "Updating..." : "Creating...") : (booking ? "Update" : "Create")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
