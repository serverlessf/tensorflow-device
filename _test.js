const Docker = require('dockerode');
const device = require('./src/device');
const image = require('./src/image');
const container = require('./src/container');

const docker = new Docker();

async function testDevice() {
  console.log('testDevice()');
  console.log('\nstate():');
  console.log(device.state());
  console.log('\nstatus():');
  console.log(await device.status());
  console.log();
}
async function testImage() {
  console.log('testImage()');
  console.log('\nls():');
  var is = await image.ls();
  console.log(is);
  console.log('\nstatus():');
  console.log(await image.status(is[0].id));
  console.log();
}
async function test() {
  await testDevice();
  await testImage();
}
test();
