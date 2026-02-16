import * as React from "react";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";

interface InfiniteScrollContainerProps {
  children: React.ReactNode;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

export function InfiniteScrollContainer({
  children,
  onLoadMore,
  hasMore,
  isLoading,
}: InfiniteScrollContainerProps) {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  });

  React.useEffect(() => {
    if (inView && hasMore && !isLoading) onLoadMore();
  }, [inView, hasMore, isLoading, onLoadMore]);

  return (
    <>
      {children}

      {hasMore && (
        <div ref={ref} className="py-6">
          {isLoading && (
            <div className="mx-auto flex w-fit items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando mais...</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
