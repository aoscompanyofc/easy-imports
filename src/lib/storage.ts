export const getStorage = <T>(key: string, fallback: T): T => {
  const item = localStorage.getItem(key);
  if (!item) return fallback;
  try {
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    return fallback;
  }
};

export const setStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
};

export const removeStorage = (key: string): void => {
  localStorage.removeItem(key);
};

export const clearAllStorage = (): void => {
  localStorage.clear();
};
