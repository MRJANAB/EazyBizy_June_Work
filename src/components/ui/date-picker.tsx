import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  /** ISO date string yyyy-MM-dd */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** earliest / latest selectable year (defaults sensible for KYC) */
  fromYear?: number;
  toYear?: number;
  /** disable dates after today (e.g. Date of Birth) */
  disableFuture?: boolean;
  className?: string;
  /** style trigger for dark cards */
  dark?: boolean;
}

const toDate = (v?: string): Date | undefined => {
  if (!v) return undefined;
  const d = parseISO(v);
  return isValid(d) ? d : undefined;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  fromYear = 1940,
  toYear = new Date().getFullYear() + 10,
  disableFuture = false,
  className,
  dark = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = toDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 text-left font-normal transition-colors",
            !selected && "text-muted-foreground",
            dark &&
              "border-white/15 bg-[#080d17] text-slate-100 hover:bg-[#0b1220] hover:text-white",
            className,
          )}
        >
          <CalendarIcon className={cn("h-4 w-4 shrink-0", dark ? "text-[#37DED6]" : "text-primary")} />
          {selected ? format(selected, "dd MMM yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown-buttons"
          fromYear={fromYear}
          toYear={toYear}
          disabled={disableFuture ? { after: new Date() } : undefined}
          onSelect={(d) => {
            if (d) onChange(format(d, "yyyy-MM-dd"));
            setOpen(false);
          }}
          // react-day-picker's default stylesheet isn't loaded, so scope the
          // dropdown-caption styling here (hide the sr-only labels + duplicate
          // caption text, style the native month/year selects).
          classNames={{
            caption_dropdowns: "flex justify-center gap-2",
            vhidden: "sr-only",
            caption_label: "sr-only",
            dropdown:
              "rounded-md border border-input bg-background px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-ring",
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
