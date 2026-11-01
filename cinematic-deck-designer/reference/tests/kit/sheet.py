# usage: python3 sheet.py <out.png> <img...> [--cols N] [--w W] [--sort]
# Contact sheet, three across by default (tiles W px wide, 640 by default), each tile labelled with its file name.
# Tiles keep the order given; --sort orders them naturally (m-x-2 before m-x-10, f-x-200 before f-x-1800).
# Needs PIL from the user site: run with plain python3 (not -I).
import sys, os
from PIL import Image, ImageDraw, ImageFont
args = sys.argv[1:]; cols, tw = 3, 640
if '--cols' in args: i = args.index('--cols'); cols = int(args[i + 1]); del args[i:i + 2]
if '--w' in args: i = args.index('--w'); tw = int(args[i + 1]); del args[i:i + 2]
srt = '--sort' in args
if srt: args.remove('--sort')
out, files = args[0], args[1:]
import re
if srt: files.sort(key=lambda f: [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', os.path.basename(f))])
if not files: sys.exit('no inputs')
ims = [Image.open(f).convert('RGB') for f in files]
hs = [round(tw * im.height / im.width) for im in ims]; lab = 26
try: font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
except Exception: font = ImageFont.load_default()
rows = (len(ims) + cols - 1) // cols
rh = [max(hs[r * cols:(r + 1) * cols]) for r in range(rows)]   # each row as tall as its tallest tile
ys = [6 + sum(rh[:r]) + r * (lab + 6) for r in range(rows)]
sheet = Image.new('RGB', (cols * tw + (cols + 1) * 6, ys[-1] + rh[-1] + lab + 6), (24, 24, 28))
d = ImageDraw.Draw(sheet)
for k, (f, im) in enumerate(zip(files, ims)):
    x = 6 + (k % cols) * (tw + 6); y = ys[k // cols]
    sheet.paste(im.resize((tw, hs[k]), Image.LANCZOS), (x, y + lab)); d.text((x + 4, y + 3), os.path.basename(f), fill=(230, 230, 230), font=font)
sheet.save(out); print(out, sheet.size)
