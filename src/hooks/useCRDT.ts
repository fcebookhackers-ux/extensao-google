import { useCallback, useEffect, useState } from "react";
import { CRDTDocument } from "@/lib/crdt";

type CRDTType = "contact" | "automation";

export function useCRDT<T extends Record<string, any>>(id: string, type: CRDTType) {
  const [doc] = useState(() => new CRDTDocument<T>(id, type));
  const [data, setData] = useState<T>(doc.data);

  useEffect(() => {
    const unsubscribe = doc.onUpdate(setData);
    return () => {
      unsubscribe();
      doc.destroy();
    };
  }, [doc]);

  const update = useCallback(
    (partial: Partial<T>) => {
      doc.update(partial);
    },
    [doc],
  );

  return { data, update, isLoaded: true };
}
