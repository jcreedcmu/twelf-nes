import * as fs from 'fs';
import { twelfImage } from './twelf-image.js';

const tout = fs.createWriteStream('/dev/ttyUSB0');
const tin = fs.createReadStream('/dev/ttyUSB0');

const blockedReaders = [];
let readBuffer = [];

tin.on('data', chunk => {
  // console.log('got chunk', chunk);
  readBuffer = [...readBuffer, ...chunk];
  // console.log('debug:', readBuffer);
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
  // console.log('writing byte', bb);
  tout.write(new Uint8Array([bb]), 'ascii');
  // console.log('waiting for ack...');
  const b =  await oneByte(tin);
  // console.log('got byte', b);
}

async function poke(addr, val) {
  console.log(`poking ${val} to address ${addr.toString(16)}`);
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

async function fill_screen_with_purple() {
  // width is 280 "dots", but 140 "pixels"
  // height is 192 "pixels"

  // 7 dots per byte (plus palette bit) so 40 bytes per line

  for (let q = 0; q < 3; q++) {
	 for (let k = 0; k < 8; k++) {
		for (let j = 0; j < 8; j++) {
		  for (let i = 0; i < 40; i++) {
			 await poke(0x2000 + 0x0400 * j + 0x080 * k + 0x0028 * q + i, i % 2 ? 0x2a : 0x55);
		  }
		}
	 }
  }
}

function offset_of_y(y) {
  const j = y % 8;
  const k = Math.floor(y / 8) % 8;
  const q = Math.floor(y / 64) % 3;
  return 0x0400 * j + 0x080 * k + 0x0028 * q;
}

// at even column:
// 0x2a green    P G P G P G P
// 0x55 purple   B Y B Y B Y B
// 0xaa yellow
// 0xd5 blue

// at odd column:
// 0x2a purple    G P G P G P G
// 0x55 green     Y B Y B Y B Y
// 0xaa blue
// 0xd5 yellow

async function draw_twelf_logo() {

  await poke(GRAPHICS_MODE, 1);
  await poke(FULL_SCREEN, 1);
  await poke(HIRES, 1);
  await poke(HIRES_PAGE1, 1);

  let img = twelfImage();
  for (let y = 0; y < 192; y++) {
	 for (let x = 0; x < 40; x++) {
	   const srci = y * 40 + x;
		await poke(0x2000 + x + offset_of_y(y), img[srci] );
	 }
  }
}

async function draw_white_line() {
  await poke(GRAPHICS_MODE, 1);
  await poke(FULL_SCREEN, 1);
  await poke(HIRES, 1);
  await poke(HIRES_PAGE1, 1);
  for (let x = 0; x < 40; x++) {
	 await poke(0x2000 + x, 0xff );
  }
}

async function send_raw_program() {
  let addr = 0x6000;
  for (const c of fs.readFileSync('raw.bin')) {
	 await poke(addr, c);
	 addr++;
  }
  // This causes the program in display_string.s to terminate its
  // serial-read-and-poke loop and jump to 0x6000, where we've
  // put our program
  await poke(0x0063, 0x00);
}

async function debug() {
//  await draw_white_line();
 // await poke(0x2001, 0x00);
  await send_raw_program();
}

async function go() {
  await debug();
  process.exit(0);
}

go();

tin.resume();
