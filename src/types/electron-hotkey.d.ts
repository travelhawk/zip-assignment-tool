export {};

declare global {
  interface Window {
    electronDesktop?: {
      startMicrosoftLogin: (url: string) => Promise<void>;
    };
    electronHotkey?: {
      get: () => Promise<string>;
      set: (value: string) => Promise<string>;
    };
  }
}
