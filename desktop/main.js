/**
 * Verk desktop shell. A native window around your Verk site: same app, same account, with a
 * persistent login, a real menu, and external links opening in the default browser.
 *
 *   cd desktop && npm install && VERK_URL=https://your-verk.example npm start
 *
 * It loads only the origin in VERK_URL. Navigation anywhere else is sent to the system browser, and
 * the window has no Node access (contextIsolation on, nodeIntegration off, sandbox on).
 */
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

const START_URL = process.env.VERK_URL || "https://verk.rejisterjack.com";
const ORIGIN = new URL(START_URL).origin;

function isInApp(url) {
  try {
    return new URL(url).origin === ORIGIN;
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "Verk",
    backgroundColor: "#faf9f6",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // A separate, persistent profile so you stay signed in between launches.
      partition: "persist:verk",
    },
  });

  win.loadURL(START_URL);

  // Links to other sites open in the browser, never inside this window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInApp(url)) return { action: "allow" };
    if (/^https?:/i.test(url)) void shell.openExternal(url);

    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!isInApp(url)) {
      event.preventDefault();
      if (/^https?:/i.test(url)) void shell.openExternal(url);
    }
  });

  return win;
}

function buildMenu(getWindow) {
  const go = (pathname) => () => {
    const win = getWindow();

    if (win) void win.loadURL(`${ORIGIN}${pathname}`);
  };

  return Menu.buildFromTemplate([
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "Go",
      submenu: [
        { label: "My issues", accelerator: "CmdOrCtrl+1", click: go("/t/go?to=mine") },
        { label: "Inbox", accelerator: "CmdOrCtrl+2", click: go("/t/go?to=inbox") },
        { label: "New issue", accelerator: "CmdOrCtrl+N", click: go("/t/go?to=new") },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ]);
}

app.whenReady().then(() => {
  let main = createWindow();

  Menu.setApplicationMenu(buildMenu(() => main));
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) main = createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// One window per app: a second launch focuses the first.
if (!app.requestSingleInstanceLock()) app.quit();