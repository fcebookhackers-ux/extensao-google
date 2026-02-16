import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  arrow,
  FloatingArrow,
} from "@floating-ui/react";
import React, { useState, useRef } from "react";
import { HelpCircle } from "lucide-react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  showIcon?: boolean;
  maxWidth?: number;
}

export function Tooltip({
  content,
  children,
  placement = "top",
  showIcon = false,
  maxWidth = 300,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef<SVGSVGElement | null>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({
        fallbackAxisSideDirection: "start",
      }),
      shift({ padding: 5 }),
      arrow({ element: arrowRef }),
    ],
  });

  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const reference = (
    <span
      ref={refs.setReference}
      {...getReferenceProps()}
      className={
        showIcon
          ? "inline-flex items-center gap-1 cursor-help text-muted-foreground"
          : undefined
      }
    >
      {children}
      {showIcon && (
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      )}
    </span>
  );

  return (
    <>
      {reference}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              maxWidth,
              zIndex: 50,
            }}
            {...getFloatingProps()}
            className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
          >
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="fill-popover stroke-border"
            />
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
