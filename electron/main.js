/**
 * electron/main.js — Electron entry point.
 * Manages the Python backend process lifecycle, IPC interactions, and proxy settings.
 */

const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

// ─── Config ──────────────────────────────────────────────────────────────────
const IS_DEV = process.env.NODE_ENV === "development";
const PYTHON_EXE = IS_DEV
  ? "python"                           // dev: use system python
  : path.join(process.resourcesPath, "core_engine", "core_engine.exe"); // prod: bundled

const PYTHON_SCRIPT = IS_DEV
  ? path.join(__dirname, "..", "backend", "main.py")
  : null; // prod: exe is self-contained

let mainWindow = null;
let pythonProcess = null;
let proxyActive = false;

// ─── Python Backend ──────────────────────────────────────────────────────────

function startBackend() {
  const args = PYTHON_SCRIPT ? [PYTHON_SCRIPT] : [];
  
  // Set cwd to the backend folder so it runs isolated
  const cwdDir = IS_DEV ? path.join(__dirname, "..", "backend") : undefined;

  pythonProcess = spawn(PYTHON_EXE, args, {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: cwdDir,
  });

  pythonProcess.stdout.on("data", (data) => {
    const line = data.toString().trim();
    console.log(`[backend] ${line}`);
    if (mainWindow) {
      mainWindow.webContents.send("backend-log", line);
    }
    if (line.includes("mitmproxy running")) {
      proxyActive = true;
      mainWindow?.webContents.send("proxy-status", { active: true });
    }
  });

  pythonProcess.stderr.on("data", (data) => {
    const line = data.toString().trim();
    console.error(`[backend:err] ${line}`);
    if (mainWindow) {
      mainWindow.webContents.send("backend-log", `[ERR] ${line}`);
    }
    if (line.includes("mitmproxy running")) {
      proxyActive = true;
      mainWindow?.webContents.send("proxy-status", { active: true });
    }
  });

  pythonProcess.on("exit", (code) => {
    console.log(`[backend] Exited with code ${code}`);
    proxyActive = false;
    mainWindow?.webContents.send("proxy-status", { active: false });
    pythonProcess = null;
  });
}

function stopBackend() {
  if (pythonProcess) {
    pythonProcess.kill("SIGTERM");
    // Fallback: force kill after 3s if SIGTERM didn't work
    setTimeout(() => {
      if (pythonProcess) {
        pythonProcess.kill("SIGKILL");
        pythonProcess = null;
      }
    }, 3000);
  }
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0d0d0f",
    frame: false,          // custom title bar in React
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "..", "assets", "icon.png"),
  });

  Menu.setApplicationMenu(null);

  if (IS_DEV) {
    mainWindow.loadURL("http://localhost:5173");
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── IPC handlers ────────────────────────────────────────────────────────────

ipcMain.handle("start-proxy", () => {
  if (!pythonProcess) {
    startBackend();
    return { ok: true };
  }
  return { ok: false, reason: "Already running" };
});

ipcMain.handle("stop-proxy", () => {
  stopBackend();
  return { ok: true };
});

ipcMain.handle("get-status", () => ({
  active: proxyActive,
  pid: pythonProcess?.pid ?? null,
}));

ipcMain.on("window-minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  mainWindow?.close();
});

ipcMain.handle("run-playwright", (event, url) => {
  return new Promise((resolve) => {
    const pwScript = path.join(__dirname, "..", "backend", "pw_capture.py");
    const cwdDir = path.join(__dirname, "..", "backend");

    const pwProcess = spawn("python", [pwScript, url], {
      cwd: cwdDir,
    });

    pwProcess.stdout.on("data", (data) => {
      const line = data.toString().trim();
      console.log(`[playwright] ${line}`);
      if (mainWindow) {
        mainWindow.webContents.send("backend-log", `[Playwright] ${line}`);
      }
    });

    pwProcess.stderr.on("data", (data) => {
      const line = data.toString().trim();
      console.error(`[playwright:err] ${line}`);
      if (mainWindow) {
        mainWindow.webContents.send("backend-log", `[Playwright:ERR] ${line}`);
      }
    });

    pwProcess.on("exit", (code) => {
      console.log(`[playwright] Exited with code ${code}`);
      if (mainWindow) {
        mainWindow.webContents.send("backend-log", `[Playwright] Finished execution (code: ${code})`);
      }
      resolve({ ok: code === 0 });
    });
  });
});

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  // Auto-start backend is disabled to stay inactive on load
});

// ─── CRITICAL FAILSAFE ───────────────────────────────────────────────────────
app.on("will-quit", (event) => {
  if (pythonProcess) {
    event.preventDefault();          // hold the quit until cleanup done
    stopBackend();
    setTimeout(() => app.quit(), 1500);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
