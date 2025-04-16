const robot = require("robotjs");
const { sleep } = require('./utils');

let mousePressed = false;
const ignoreKeys = ['Meta'];
const mappedKeys = {
  'ArrowRight': 'right',
  'ArrowLeft': 'left',
  'ArrowUp': 'up',
  'ArrowDown': 'down',
};

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
      console.log('🍔 ~ handleKeyInput ~ key.toLowerCase():', key.toLowerCase())
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

module.exports = handleKeyInput