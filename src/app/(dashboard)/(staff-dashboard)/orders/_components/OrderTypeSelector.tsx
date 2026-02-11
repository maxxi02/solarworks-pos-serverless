"use client";

import { Button } from "@/components/ui/button";

type OrderTypeSelectorProps = {
  value: "Pickup" | "Delivery" | "Dine In";
  onChange: (value: "Pickup" | "Delivery" | "Dine In") => void;
};

export default function OrderTypeSelector({
  value,
  onChange,
}: OrderTypeSelectorProps) {
  return (
    <div className="p-4 border-b bg-slate-50">
      <div className="flex gap-2">
        <Button
          variant={value === "Pickup" ? "default" : "outline"}
          className="flex-1"
          onClick={() => onChange("Pickup")}
        >
          Pickup
        </Button>
        <Button
          variant={value === "Delivery" ? "default" : "outline"}
          className="flex-1"
          onClick={() => onChange("Delivery")}
        >
          Delivery
        </Button>
        <Button
          variant={value === "Dine In" ? "default" : "outline"}
          className="flex-1"
          onClick={() => onChange("Dine In")}
        >
          Dine In
        </Button>
      </div>
    </div>
  );
}
