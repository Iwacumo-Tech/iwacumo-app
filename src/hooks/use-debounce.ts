import { useEffect, useState } from "react";

/**
 * useDebounce Hook
 * Delays updating a value until a specified delay has passed.
 * Used for search inputs and real-time validation to reduce API calls.
 */
export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay || 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}