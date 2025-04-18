const fs = require("fs");
const { Monitor } = require("node-screenshots");
const WebSocket = require("ws");
const robot = require("robotjs");
const sharp = require('sharp');
const handleKeyInput = require('./keystrokes');
const { sleep } = require('./utils');
console.log('🍔 ~ handleKeyInput:', handleKeyInput)


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
  const image1 = monitor.captureImageSync();
  const rawImg2 = image1.toRawSync();
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


  const outputJPGBuffer = await sharp(rawImg1, {
    raw: {
      width: monitor.width * monitor.scaleFactor,
      height: monitor.height * monitor.scaleFactor,
      channels: 4
    }
  })
    .jpeg({ quality: 50 })
    // .removeAlpha()
    // .resize({
    //   width: 1920,
    // })
    .toBuffer();

  console.log('took', (Date.now() - start) + 'ms to execute. Output size: ', outputJPGBuffer.length / 1024);
  console.log('Direct JPEG output size:', image1.toJpegSync().length / 1024);
  fs.writeFileSync("output.jpg", outputJPGBuffer);
}

function start() {
  // tinker();
  connectToWebsocket();
}

function connectToWebsocket() {

  const IP = '127.0.0.1';
  // const IP = '192.168.178.251';

  const URL = `ws://${IP}:8090`
  const VIDEO_URL = `ws://${IP}:8040`

  // Connect to the WebSocket server
  const wsCommands = new WebSocket(URL);
  const wsVideo = new WebSocket(VIDEO_URL);

  wsCommands.on('message', async (data) => {
    const message = JSON.parse(data);
    // console.log('🍔 ~ ws.on ~ message:', message)
    handleKeyInput(message);
  });

  wsVideo.on('open', () => {
    sendImageLoop(wsVideo);
  });

  wsCommands.on('open', () => {
    // sendImageLoop(wsCommands);
    sendConfig(wsCommands);
  });

  onWsError(wsVideo);
  onWsError(wsCommands);
}

function onWsError(ws) {
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

start();

async function sendImageLoop(ws) {
  const monitor = monitors.find(monitor => monitor.isPrimary);
  let lastSend = Date.now();
  const sharpConfig = {
    raw: {
      width: monitor.width * monitor.scaleFactor,
      height: monitor.height * monitor.scaleFactor,
      channels: 4
    }
  }

  while (true) {
    await new Promise(resolve => setTimeout(resolve, 50));

    const beforeSend = Date.now();

    const image = monitor.captureImageSync();

    // const outputJPGBuffer = image.toJpegSync();
    // ws.send(outputJPGBuffer, { binary: true });

    const outputJPGBuffer = await sharp(image.toRawSync(), sharpConfig)
      .jpeg({ quality: 50 })
      .resize({ width: 1920, })
      .toBuffer();

    ws.send(outputJPGBuffer, { binary: true });

    console.log(
      Math.round(outputJPGBuffer.length / 1024), ' KB] ',
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
