import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordField({
  value,
  onChange,
  placeholder,
  className,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className={cn("relative", className)}>
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}
