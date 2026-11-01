// usage: node jscheck.js <deck.html>
// Syntax-checks every inline <script> that is JavaScript (skips JSON and src= scripts) with vm.Script. Exit 1 on any error.
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(process.argv[2], 'utf8');
const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi; let m, n = 0, bad = 0;
while ((m = re.exec(html))) {
  const attrs = m[1], code = m[2];
  if (/\bsrc\s*=/.test(attrs)) continue;
  const type = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
  if (type && !/^(text|application)\/(javascript|ecmascript)$|^module$/i.test(type)) continue;
  n++; const line = html.slice(0, m.index).split('\n').length, id = (attrs.match(/\bid\s*=\s*["']?([^"'\s>]+)/) || [])[1] || '';
  try { new vm.Script(code, { filename: `script#${n}${id ? ' ' + id : ''} (html line ${line})` }); }
  catch (e) { bad++; const st = (e.stack || '').split('\n').slice(0, 4).join('\n'); console.log(`FAIL script #${n} ${id} at html line ${line}: ${e.message}\n${st}`); }
}
console.log(`${n} scripts checked, ${bad} with errors`);
process.exit(bad ? 1 : 0);
