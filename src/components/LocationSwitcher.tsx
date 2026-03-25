import { Location } from "@/hooks/use-locations";

interface LocationSwitcherProps {
  locations: Location[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function LocationSwitcher({ locations, selectedId, onChange }: LocationSwitcherProps) {
  if (locations.length === 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-card px-3 py-1.5">
      {locations.map((loc) => (
        <button
          key={loc.id}
          onClick={() => onChange(loc.id)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
            selectedId === loc.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          {loc.name}
        </button>
      ))}
    </div>
  );
}
