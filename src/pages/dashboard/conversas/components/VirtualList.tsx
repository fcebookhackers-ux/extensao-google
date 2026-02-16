import * as React from "react";

export function VirtualList<T>({
  items,
  rowHeight,
  overscan = 6,
  className,
  renderRow,
}: {
  items: T[];
  rowHeight: number;
  overscan?: number;
  className?: string;
  renderRow: (item: T, index: number) => React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [height, setHeight] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const totalHeight = items.length * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(items.length, Math.ceil((scrollTop + height) / rowHeight) + overscan);

  return (
    <div
      ref={ref}
      className={className}
      style={{ overflow: "auto" }}
      onScroll={(e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${start * rowHeight}px)` }}>
          {items.slice(start, end).map((item, i) => (
            <div key={start + i} style={{ height: rowHeight }}>
              {renderRow(item, start + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
