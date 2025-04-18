const { Monitor } = require("node-screenshots");
const WebSocket = require("ws");
const { sleep } = require('./utils');
const { IP } = require('./constants');

const robot = require("robotjs");
// const robot = {
//   keyTap: () => { },
//   keyToggle: () => { },
//   typeString: () => { },
//   moveMouse: () => { },
//   dragMouse: () => { },
//   mouseToggle: () => { },
// }

const monitors = Monitor.all();

let mousePressed = false;
const ignoreKeys = ['Meta'];
const mappedKeys = {
  'ArrowRight': 'right',
  'ArrowLeft': 'left',
  'ArrowUp': 'up',
  'ArrowDown': 'down',
};

function start() {
  connectToWebsocket();
  robot.setKeyboardDelay(1);
}

function connectToWebsocket() {

  const URL = `ws://${IP}:8090`

  const wsCommands = new WebSocket(URL);

  wsCommands.on('message', async (data) => {
    const message = JSON.parse(data);
    handleKeyInput(message);
  });

  wsCommands.on('open', () => {
    sendConfig(wsCommands);
  });

  onWsError(wsCommands);
}

function sendConfig(ws) {
  const monitorConfig = [];

  monitors.forEach((item) => {
    monitorConfig.push({
      id: item.id,
      name: item.name,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation,
      scaleFactor: item.scaleFactor,
      frequency: item.frequency,
      isPrimary: item.isPrimary
    });
  });
  const config = {
    type: 'config',
    monitors: monitorConfig,
  };

  ws.send('[JSON]' + JSON.stringify(config));
}

async function handleKeyInput(message) {

  let { key, type } = message;

  if (key in mappedKeys) {
    key = mappedKeys[key];
  }

  if (type === 'key-down') {
    if (ignoreKeys.includes(key)) {
      return;
    }
    if (key.length === 1) {
      robot.typeString(key);
    } else {
      robot.keyToggle(key.toLowerCase(), 'down');
    }
  }

  if (type === 'key-up') {
    if (key.length === 1 || ignoreKeys.includes(key)) {
      return;
    }
    robot.keyToggle(key.toLowerCase(), 'up');
  }

  if (['mouse-move', 'mouse-down', 'mouse-up'].includes(type)) {
    const { x, y } = message;
    if (mousePressed) {
      robot.dragMouse(x, y);
    } else {
      robot.moveMouse(x, y);
    }
  }

  if (type === 'mouse-down') {
    await sleep(10);
    const { button } = message;
    mousePressed = true;
    robot.mouseToggle('down', button); // 'left', 'right', 'middle'
    console.log(`Mouse button ${button} pressed down`);
  }

  if (type === 'mouse-up') {
    await sleep(10);
    const { button } = message;
    mousePressed = false;
    robot.mouseToggle('up', button);
    console.log(`Mouse button ${button} released`);
  }
}


function onWsError(ws) {
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

start();

