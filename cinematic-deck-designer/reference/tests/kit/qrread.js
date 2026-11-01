// usage: node qrread.js <image.png> [x,y,w,h]   decodes a QR code with jsqr (optionally inside a crop); prints the text, exit 1 if none
const fs = require('fs'), { PNG } = require('pngjs'), jsQR = require('jsqr');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
let { width: w, height: h, data } = png;
if (process.argv[3]) {
  const [x, y, cw, ch] = process.argv[3].split(',').map(Number), out = Buffer.alloc(cw * ch * 4);
  for (let r = 0; r < ch; r++) data.copy(out, r * cw * 4, ((y + r) * w + x) * 4, ((y + r) * w + x + cw) * 4);
  data = out; w = cw; h = ch;
}
const code = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), w, h, { inversionAttempts: 'attemptBoth' });
if (!code) { console.log('no QR found'); process.exit(1); }
console.log(code.data);
