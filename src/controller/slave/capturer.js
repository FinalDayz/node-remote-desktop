const fs = require("fs");
const { Monitor } = require("node-screenshots");
const WebSocket = require("ws");
const robot = require("robotjs");
const sharp = require('sharp');
const handleKeyInput = require('./keystrokes');



const monitors = Monitor.all();

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

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);

      // await sleep(3500);

      console.log('🍔 ~ ws.on ~ message:', message)

      handleKeyInput(message.key, message.code);

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
    sendConfig(ws);
    sendImageEverySecond(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

}


start();

async function sendImageEverySecond(ws) {
  const monitor = monitors.find(monitor => monitor.isPrimary);
  let lastSend = Date.now();

  while (true) {
    await new Promise(resolve => setTimeout(resolve, 250));

    const beforeSend = Date.now();
    // Capture the screenshot again
    const image = monitor.captureImageSync();
    const pngImageBuffer = image.toJpegSync();
    const base64Image = pngImageBuffer.toString('base64');
    ws.send(`[IMAGE]data:image/jpeg;base64,${base64Image}`);

    console.log(
      Math.round(base64Image.length / 1024) + ' KB ] Image sent to WebSocket server total:',
      Date.now() - lastSend,
      'Sending image took:', Date.now() - beforeSend, 'ms'
    );
    lastSend = Date.now();
  }
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


// const buffer = image.toRawSync();

// console.log(Array.from(buffer.values()), buffer.length);


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
