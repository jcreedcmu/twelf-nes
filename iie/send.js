const fs = require('fs');
const tout = fs.createWriteStream('/dev/ttyUSB0');
const tin = fs.createReadStream('/dev/ttyUSB0');

const blockedReaders = [];
const readBuffer = [];

tin.onmessage = chunk => {
  readBuffer = [...readBuffer, ...chunk];
  console.log('debug:', readBuffer);
  if (blockedReaders.length > 0) {
	 const reader =	 blockedReaders.shift();
	 const value = readBuffer.shift();
	 reader(value);
  }
}

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

async function go() {
  await send_acked_byte(0x70);
  await send_acked_byte(0x00);
  await send_acked_byte(0xde);
}

go();

tin.resume();
