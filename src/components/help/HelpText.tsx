import { Tooltip } from "./Tooltip";
import { InfoIcon } from "lucide-react";

interface HelpTextProps {
  children: string;
  placement?: "top" | "bottom" | "left" | "right";
}

export function HelpText({ children, placement = "top" }: HelpTextProps) {
  return (
    <Tooltip content={children} placement={placement} showIcon maxWidth={320}>
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <InfoIcon className="h-3 w-3" aria-hidden="true" />
        <span>Ajuda</span>
      </span>
    </Tooltip>
  );
}
