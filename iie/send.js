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
async function go() {
  await poke(0x0070, 0xcd);

  // terminate command loop
  await poke(0x0063, 0x00);
}

go();

tin.resume();
