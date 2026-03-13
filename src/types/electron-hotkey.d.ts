export {};

declare global {
  interface Window {
    electronHotkey?: {
      get: () => Promise<string>;
      set: (value: string) => Promise<string>;
    };
  }
}
