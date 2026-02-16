import { useMemo } from "react";

export function useEmptyState<T>(data: T[] | undefined, isLoading: boolean, searchQuery?: string) {
  return useMemo(() => {
    if (isLoading) {
      return { isEmpty: false, isSearchEmpty: false, showEmpty: false };
    }

    const isEmpty = !data || data.length === 0;
    const isSearchEmpty = isEmpty && !!searchQuery && searchQuery.trim().length > 0;
    const showEmpty = isEmpty && !isLoading;

    return {
      isEmpty,
      isSearchEmpty,
      showEmpty,
      hasData: !isEmpty,
    };
  }, [data, isLoading, searchQuery]);
}
