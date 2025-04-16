const fs = require("fs");
const { Monitor } = require("node-screenshots");
const WebSocket = require("ws");
const robot = require("robotjs");
const sharp = require('sharp');



// const cv = require("opencv4nodejs");

// function toJPG(buffer, width, height) {
//   var jpegImageData = new Jpeg(buffer, width, height,);

//   return jpegImageData;
// }

async function tinker() {
  // Capture the screenshot
  let monitor = Monitor.fromPoint(0, 0);
  console.log(`height: ${monitor.height}, width: ${monitor.width}, scaleFactor: ${monitor.scaleFactor}`);

  const rawImg1 = monitor.captureImageSync().toRawSync();
  console.log('captured 1')

  await sleep(1000)
  const rawImg2 = monitor.captureImageSync().toRawSync();
  console.log('captured 2')

  const start1 = Date.now();
  const diff = Buffer.alloc(rawImg1.length);


  console.log('first 12 items of rawImg1: ', rawImg1.slice(0, 12))

  for (let i = 0; i < rawImg1.length; i++) {
    if (i % 4 === 3) {
      diff[i] = 255
    } else {
      diff[i] = Math.abs(rawImg2[i] - rawImg1[i]);
    }
  }

  console.log('took', (Date.now() - start1) + 'ms to diff')

  const start = Date.now();


  const outputJPGBuffer = await sharp(diff, {
    raw: {
      width: monitor.width * monitor.scaleFactor,
      height: monitor.height * monitor.scaleFactor,
      channels: 4
    }
  })
    .jpeg({ mozjpeg: true })
    .resize({
      width: 1920,
    })
    .toBuffer();


  console.log('took', (Date.now() - start) + 'ms to execute. Output size: ', outputJPGBuffer.length)


  fs.writeFileSync("output.jpg", outputJPGBuffer);

}

async function sleep(delay) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

function start() {
  // tinker();
  connectToWebsocket();
}

function connectToWebsocket() {

  // Connect to the WebSocket server
  const ws = new WebSocket('ws://192.168.178.251:8080');
  let mousePressed = false;
  const ignoreKeys = ['Meta'];

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);

      await sleep(3500);

      console.log('🍔 ~ ws.on ~ message:', message)

      if (message.type === 'key-down') {
        const { key, code } = message;
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
        const { key, code } = message;
        if (key.length === 1 || ignoreKeys.includes(key)) {
          return;
        }

        console.log(`Key ${key} released , code: ${code}`);
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

    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('open', () => {
    // // Convert the PNG buffer to a base64 string
    // const base64Image = pngImageBuffer.toString('base64');

    // // Send the base64 encoded image to the WebSocket server
    // ws.send(`data:image/png;base64,${base64Image}`);
    // console.log('Image sent to WebSocket server');
    sendConfig();
    sendImageEverySecond();
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

}


start();

async function sendImageEverySecond() {
  const monitor = Monitor.all().find(monitor => monitor.isPrimary)
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture the screenshot again
    image = monitor.captureImageSync();
    const pngImageBuffer = image.toPngSync();
    const base64Image = pngImageBuffer.toString('base64');
    ws.send(`[IMAGE]data:image/png;base64,${base64Image}`);
  }
}

function sendConfig() {
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


// const buffer = image.toRawSync();

// console.log(Array.from(buffer.values()), buffer.length);

// const monitors = Monitor.all();

// monitors.forEach((item) => {
//   console.log(
//     "Monitor:",
//     item.id,
//     item.name,
//     [item.x, item.y, item.width, item.height],
//     item.rotation,
//     item.scaleFactor,
//     item.frequency,
//     item.isPrimary
//   );
// });
