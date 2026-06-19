const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  startProxy: () => ipcRenderer.invoke("start-proxy"),
  stopProxy: () => ipcRenderer.invoke("stop-proxy"),
  getStatus: () => ipcRenderer.invoke("get-status"),
  onBackendLog: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("backend-log", listener);
    return () => ipcRenderer.removeListener("backend-log", listener);
  },
  onProxyStatus: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("proxy-status", listener);
    return () => ipcRenderer.removeListener("proxy-status", listener);
  },
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  runPlaywright: (url) => ipcRenderer.invoke("run-playwright", url),
});
