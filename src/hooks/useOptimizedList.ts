import { useMemo } from "react";

export function useOptimizedList<T>(
  items: T[],
  searchQuery: string,
  filterFn?: (item: T, query: string) => boolean,
) {
  const filteredItems = useMemo(() => {
    if (!searchQuery || !filterFn) return items;
    return items.filter((item) => filterFn(item, searchQuery));
  }, [items, searchQuery, filterFn]);

  const stats = useMemo(
    () => ({
      total: items.length,
      filtered: filteredItems.length,
      hidden: items.length - filteredItems.length,
    }),
    [items.length, filteredItems.length],
  );

  return {
    items: filteredItems,
    stats,
  };
}
