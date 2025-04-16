let mousePressed = false;
const ignoreKeys = ['Meta'];
const mappedKeys = {
  'ArrowRight': 'right',
  'ArrowLeft': 'left',
  'ArrowUp': 'up',
  'ArrowDown': 'down',
};

async function handleKeyInput(message) {

  const { key, type } = message;

  if (key in mappedKeys) {
    key = mappedKeys[key];
  }

  if (message.type === 'key-down') {
    const { key } = message;
    if (ignoreKeys.includes(key)) {
      return;
    }
    if (key.length === 1) {
      robot.typeString(message.key);
    } else {
      robot.keyToggle(key.toLowerCase(), 'down');
    }
  }

  if (message.type === 'key-up') {
    const { key } = message;
    if (key.length === 1 || ignoreKeys.includes(key)) {
      return;
    }
    robot.keyToggle(key.toLowerCase(), 'up');
  }

  if (['mouse-move', 'mouse-down', 'mouse-up'].includes(message.type)) {
    const { x, y } = message;
    if (mousePressed) {
      robot.dragMouse(x, y);
    } else {
      robot.moveMouse(x, y);
    }
  }

  if (message.type === 'mouse-down') {
    await sleep(25);
    const { button } = message;
    mousePressed = true;
    robot.mouseToggle('down', button); // 'left', 'right', 'middle'
    console.log(`Mouse button ${button} pressed down`);
  }

  if (message.type === 'mouse-up') {
    await sleep(25);
    const { button } = message;
    mousePressed = false;
    robot.mouseToggle('up', button);
    console.log(`Mouse button ${button} released`);
  }
}

module.exports = handleKeyInput