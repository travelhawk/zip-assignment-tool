export {};

declare global {
  interface Window {
    electronDesktop?: {
      startMicrosoftLogin: () => Promise<void>;
    };
    electronHotkey?: {
      get: () => Promise<string>;
      set: (value: string) => Promise<string>;
    };
  }
}
