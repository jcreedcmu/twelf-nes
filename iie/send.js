const fs = require('fs');
const tout = fs.createWriteStream('/dev/ttyUSB0');
const tin = fs.createReadStream('/dev/ttyUSB0');

const blockedReaders = [];
let readBuffer = [];

tin.on('data', chunk => {
  console.log('got chunk', chunk);
  readBuffer = [...readBuffer, ...chunk];
  console.log('debug:', readBuffer);
  if (blockedReaders.length > 0) {
	 const reader =	 blockedReaders.shift();
	 const value = readBuffer.shift();
	 reader(value);
  }
});

function oneByte() {
  if (readBuffer.length > 0) {
	 const value = readBuffer.shift();
	 return value;
  }
  else {
	 return new Promise((res, rej) => {
		blockedReaders.push(res);
	 });
  }
}

async function send_acked_byte(bb) {
  console.log('writing byte', bb);
  tout.write(new Uint8Array([bb]), 'ascii');
  console.log('waiting for ack...');
  const b =  await oneByte(tin);
  console.log('got byte', b);
}

async function poke(addr, val) {
  await send_acked_byte(addr & 255);
  await send_acked_byte(addr >> 8);
  await send_acked_byte(val);

}
const GRAPHICS_MODE = 0xC050;
const TEXT_MODE = 0xC051;
const FULL_SCREEN = 0xC052;
const MIXED = 0xC053;
const HIRES_PAGE1 = 0xC054;
const HIRES_PAGE2 = 0xC055;
const LOWRES = 0xC056;
const HIRES = 0xC057;

async function go() {

  await poke(GRAPHICS_MODE, 1);
  await poke(FULL_SCREEN, 1);
  await poke(HIRES, 1);
  await poke(HIRES_PAGE1, 1);

  process.exit(0);
  // terminate command loop
  // await poke(0x0063, 0x00);
}

go();

tin.resume();
