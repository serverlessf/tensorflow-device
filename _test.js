const Docker = require('dockerode');
const image = require('./src/image');
const container = require('./src/container');

const docker = new Docker();

async function testImage() {
  var cs = await docker.getContainer('4b9fe19c5539').inspect();
  console.log(JSON.stringify(cs));
}
testImage();
