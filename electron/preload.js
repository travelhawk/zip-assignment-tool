/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronHotkey", {
  get: () => ipcRenderer.invoke("search-hotkey:get"),
  set: (value) => ipcRenderer.invoke("search-hotkey:set", value),
});

contextBridge.exposeInMainWorld("electronDesktop", {
  startMicrosoftLogin: () => ipcRenderer.invoke("desktop-auth:start"),
});
