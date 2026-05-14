import { useState } from 'react';
import { getStorage, setStorage } from '../lib/storage';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return getStorage<T>(key, initialValue);
  });

  const setValue = (value: T | ((val: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    setStorage(key, valueToStore);
  };

  return [storedValue, setValue] as const;
}
