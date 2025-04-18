const { app, BrowserWindow } = require('electron');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { ipcMain } = require('electron');

let win;
let lastMouseMove = 0;
let monitorConfig = {};

function sendMouseEvent(type, args) {
  args.x *= monitorConfig.width + monitorConfig.x;
  args.y *= monitorConfig.height + monitorConfig.y;
  sendToAllClients({
    type: type,
    button: args.button,
    x: Math.round(args.x),
    y: Math.round(args.y),
  });
}

function sendToAllClients(message) {
  wsCommand.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

ipcMain.on('mouse-move', (_, args) => {
  if (Date.now() - lastMouseMove < 50) {
    return;
  }
  lastMouseMove = Date.now();
  sendMouseEvent('mouse-move', args);
});

ipcMain.on('mouse-down', (event, args) => {
  sendMouseEvent('mouse-down', args);
});

ipcMain.on('mouse-up', (event, args) => {
  sendMouseEvent('mouse-up', args);
});

ipcMain.on('key-down', (event, args) => {
  sendToAllClients({
    type: 'key-down',
    key: args.key,
    code: args.code
  });
});

ipcMain.on('key-up', (event, args) => {
  sendToAllClients({
    type: 'key-up',
    key: args.key,
    code: args.code
  });
});

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');
  win.on("ready-to-show", () => {
    win.webContents.openDevTools();
  });
}

app.on('ready', createWindow);

// Set up WebSocket server
const wsVideo = new WebSocket.Server({ port: 8040 });
const wsCommand = new WebSocket.Server({ port: 8090 });

function handleJSONMessage(messageStr) {
  const data = JSON.parse(messageStr);

  // monitorConfig = data.find((item) => item.type === 'config');
  if (data.type === 'config') {
    monitorConfig = data.monitors.find(monitor => monitor.isPrimary);
    console.log('Monitor config:', monitorConfig);
  }
}

function handleRawImage(imageBuffer) {
  const filePath = path.join(__dirname, 'image.jpg');
  fs.writeFile(filePath, imageBuffer, (err) => {
    if (err) {
      console.error('Failed to save image:', err);
      return;
    }

    // Send the file path to the renderer process
    win.webContents.send('update-image', filePath);
  });
}

function handleImageMessage(messageStr) {
  // Assuming message is a base64 encoded JPG
  const base64Data = messageStr.replace(/^data:image\/jpeg;base64,/, "");
  const filePath = path.join(__dirname, 'image.jpg');

  fs.writeFile(filePath, base64Data, 'base64', (err) => {
    if (err) {
      console.error('Failed to save image:', err);
      return;
    }

    // Send the file path to the renderer process
    win.webContents.send('update-image', filePath);
  });
}

wsCommand.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Convert the Buffer to a string

    if (message.length > 1000) {
      handleRawImage(message);
      return;
    }

    const messageStr = message.toString('utf8');
    if (messageStr.startsWith('[JSON]')) {
      console.log('🍔 ~ ws.on ~ messageStr:', messageStr)
      handleJSONMessage(messageStr.substring(6));
    }
  });
});

wsVideo.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Convert the Buffer to a string

    handleRawImage(message);
    // if (messageStr.startsWith('[IMAGE]')) {
    //   handleImageMessage(messageStr.substring(7));
    // }
  });
});
