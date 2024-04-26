import * as fs from 'fs';
import * as assert from 'node:assert';

const args = process.argv;
args.splice(0,2);
const file = args[0];
const toks = fs.readFileSync(file, 'utf8').replace(/#.*/g, '').split(/\s+/);
const header = toks.splice(0,4);
const [type, width, height, colormax] = header;
assert.equal(type, 'P2'); // pgm
assert.equal(width, 128); // 16 sprites wide
assert.equal(height, 128); // 16 sprites high
assert.equal(colormax, 255);
const pixels = [];
for (let y = 0; y < height; y++) {
  const row = [];
  pixels.push(row);
  for (let x = 0; x < width; x++) {
	 const color = Math.round(3 * parseInt(toks[width * y + x]) / colormax);
	 row.push(color);
  }
}

const bytes = [];

function emit_plane(cx, cy, bit_to_test) {
  for (let row = 0; row < 8; row++) {
	 let a = 0;
	 for (let col = 0; col < 8; col++) {
		a = 2 * a + ((pixels[8 * cy + row][8 * cx + col] & bit_to_test) ? 1 : 0);
	 }
	 bytes.push(a);
  }
}

for (let cy = 0; cy < 16; cy++) {
  for (let cx = 0; cx < 16; cx++) {
	 emit_plane(cx, cy, 1);
	 emit_plane(cx, cy, 2);
  }
}


fs.writeFileSync('Alpha.chr', new Uint8Array(bytes));
