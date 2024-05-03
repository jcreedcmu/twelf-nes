import * as fs from 'fs';
import * as assert from 'assert';

function leftPad(x, c, n) {
  while (x.length < n) { x = c + x; }
  return x;
}

export function twelfImage() {
  const toks = fs.readFileSync('twelf-a2e.pgm', 'utf8').replace(/#.*/g, '').split(/\s+/).filter(x => x.length);
  const [header, width, height, maxcolor] = toks.splice(0,4);
  assert.equal(header, 'P2');
  let pixels = [];
  for (let tok of toks) {
	 if (tok == '255')
		pixels.push('white');
	 else if (tok == '0')
		pixels.push('black');
	 else
		pixels.push('green');
  }
  assert.equal(pixels.length, 140 * 192);

  // This is a flattened 280 x 192 grid. The even columns are purple, the odd columns are green.
  let dots = [];
  for (let x = 0; x < 280; x++) {
	 for (let y = 0; y < 192; y++) {
		const srcx = Math.floor(x/2);
		const srci = y * 140 + srcx;
		const dsti = y * 280 + x;
		const src = pixels[srci];
		switch (src) {
		case 'white': dots[dsti] = 1; break;
 		case 'black': dots[dsti] = 0; break;
		case 'green': dots[dsti] = (x % 2 == 1) && ((srcx + y) % 2 == 1) ? 1 : 0; break;
		default: throw new Error(`unexpected color ${src} at ${x}, ${y}`);
		}
	 }
  }

  // This is a flattened 40 x 192 grid.
  let bytes = [];
  for (let x = 0; x < 40; x++) {
	 for (let y = 0; y < 192; y++) {
		const srcx = Math.floor(x*7);
		const srci = y * 280 + srcx;
		const dsti = y * 40 + x;
		let dst = 0;
		for (let b = 0; b < 7; b++) {
		  dst += (dots[srci+b] << b);
		}
		bytes[dsti] = dst;
	 }
  }

  // DEBUG VIEW

  // for (let y = 0; y < 192; y++) {
  // 	 for (let x = 0; x < 40; x++) {
  // 		const srci = y * 40 + x;
  // 		process.stdout.write(leftPad(bytes[srci].toString(16), '0', 2) + ' ');
  // 	 }
  // 	 process.stdout.write('\n');
  // }

  return bytes;
}


twelfImage();
