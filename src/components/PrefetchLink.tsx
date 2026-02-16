import type { MouseEvent, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

import { usePrefetchOnHover } from "@/hooks/usePrefetch";

interface PrefetchLinkProps extends LinkProps {
  prefetchType?: "automation" | "contact";
  prefetchId?: string;
  children: ReactNode;
}

export function PrefetchLink({
  prefetchType,
  prefetchId,
  children,
  onMouseEnter,
  ...props
}: PrefetchLinkProps) {
  const { handleAutomationHover, handleContactHover } = usePrefetchOnHover();

  const handleEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    onMouseEnter?.(event);

    if (!prefetchType || !prefetchId) return;

    if (prefetchType === "automation") {
      handleAutomationHover(prefetchId);
    } else if (prefetchType === "contact") {
      handleContactHover(prefetchId);
    }
  };

  return (
    <Link {...props} onMouseEnter={handleEnter}>
      {children}
    </Link>
  );
}
