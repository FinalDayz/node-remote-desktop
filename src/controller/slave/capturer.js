const fs = require("fs");
const { Monitor } = require("node-screenshots");
const WebSocket = require("ws");
const robot = require("robotjs");
const sharp = require('sharp');
const { sleep } = require('./utils');
const { IP } = require('./constants');
const cp = require('child_process');


const monitors = Monitor.all();

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
    .jpeg({ quality: 70 })
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
  startKeystrokes();
  connectToWebsocket();
}

function startKeystrokes() {
  console.log(`node ${__dirname}/keystrokes.js`)
  const child = cp.spawn('node', ['keystrokes.js'], { cwd: `${__dirname}/` });

  child.stdout.on('data', (data) => {
    console.log(`[keystrokes] ${data}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`[keystrokes] ${data}`);
  });

  child.on('exit', function (code, signal) {
    console.log('child process exited with ' +
      `code ${code} and signal ${signal}`);

    process.exit(1);
  });
}

function connectToWebsocket() {

  const VIDEO_URL = `ws://${IP}:8040`
  const wsVideo = new WebSocket(VIDEO_URL);

  wsVideo.on('open', () => {
    sendImageLoop(wsVideo);
  });

  onWsError(wsVideo);
}

function onWsError(ws) {
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}


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

  let lastImage = null;

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

    if (lastImage !== null && lastImage.length === outputJPGBuffer.length && lastImage.equals(outputJPGBuffer)) {
      continue;
    }

    lastImage = outputJPGBuffer;

    ws.send(outputJPGBuffer, { binary: true });

    console.log(
      Math.round(outputJPGBuffer.length / 1024), ' KB] ',
      Date.now() - lastSend,
      'Sending image took:', Date.now() - beforeSend, 'ms'
    );
    lastSend = Date.now();
  }
}


start();