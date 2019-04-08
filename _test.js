const Docker = require('dockerode');
const image = require('./src/image');
const container = require('./src/container');

const docker = new Docker();

async function testImage() {
  console.log(await image.config('hlo_con'));
}
testImage();
