const { app, BrowserWindow, Menu } = require("electron");
const path = require("node:path");

// Squirrel starts the app briefly while installing, updating and removing it.
// Handle those lifecycle invocations before creating the game window.
if (require("electron-squirrel-startup")) app.quit();

app.commandLine.appendSwitch("high-dpi-support", "1");
app.commandLine.appendSwitch("force-device-scale-factor", "1");

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: "#070817",
    show: false,
    autoHideMenuBar: true,
    title: "SPACECRAFT // 星航双子",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged
    }
  });

  Menu.setApplicationMenu(null);
  window.loadFile(path.join(__dirname, "..", "index.html"));
  window.once("ready-to-show", () => window.show());
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
