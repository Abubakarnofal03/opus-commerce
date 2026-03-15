/**
 * Returns true when the app is running inside a Capacitor native shell (Android/iOS).
 * Returns false when running as a regular web app in the browser.
 */
export const isCapacitor = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
};
