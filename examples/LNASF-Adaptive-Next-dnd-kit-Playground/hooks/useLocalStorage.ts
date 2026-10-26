import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        const parsed = JSON.parse(item, (property, value: unknown) => {
          if (property === "createdAt" && typeof value === "string") {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) return date;
          }
          return value;
        }) as T;
        setStoredValue(parsed);
      }
    } catch {
      // Keep the initial value if browser storage is unavailable or malformed.
    }
  }, [key]);

  const setValue = useCallback((value: T) => {
    setStoredValue(value);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // In-memory state remains usable when storage is unavailable or full.
    }
  }, [key]);

  return [storedValue, setValue];
}
