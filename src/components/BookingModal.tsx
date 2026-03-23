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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TABLES, Booking, addHours } from "@/lib/booking-data";
import { Trash2 } from "lucide-react";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Booking, "id" | "status">) => { conflict: boolean } | void;
  onDelete?: (id: string) => void;
  booking?: Booking | null;
  date: string;
}

export function BookingModal({ open, onClose, onSave, onDelete, booking, date }: BookingModalProps) {
  const [form, setForm] = useState({
    customer_name: "",
    number_of_people: 2,
    table_id: "T1",
    start_time: "18:00",
    end_time: "",
    note: "",
  });
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    if (booking) {
      setForm({
        customer_name: booking.customer_name,
        number_of_people: booking.number_of_people,
        table_id: booking.table_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        note: booking.note,
      });
    } else {
      setForm({
        customer_name: "",
        number_of_people: 2,
        table_id: "T1",
        start_time: "18:00",
        end_time: "",
        note: "",
      });
    }
    setWarning(false);
  }, [booking, open]);

  const handleSubmit = () => {
    if (!form.customer_name.trim()) return;
    const endTime = form.end_time || addHours(form.start_time, 2);
    const data = { ...form, end_time: endTime, date };
    const result = onSave(data);
    if (result?.conflict) {
      setWarning(true);
    }
    onClose();
  };

  const update = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{booking ? "Edit Booking" : "New Booking"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div>
            <Label htmlFor="name">Customer Name</Label>
            <Input
              id="name"
              value={form.customer_name}
              onChange={(e) => update("customer_name", e.target.value)}
              placeholder="Enter name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="people">Guests</Label>
              <Input
                id="people"
                type="number"
                min={1}
                max={20}
                value={form.number_of_people}
                onChange={(e) => update("number_of_people", parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>Table</Label>
              <Select value={form.table_id} onValueChange={(v) => update("table_id", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TABLES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.id} ({t.capacity}p)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                type="time"
                value={form.start_time}
                onChange={(e) => update("start_time", e.target.value)}
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
            />
          </div>

          {warning && (
            <p className="text-xs text-booking-conflict font-medium">
              ⚠ This booking conflicts with another. It was saved but marked in red.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {booking && onDelete && (
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
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {booking ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
