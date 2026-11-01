# usage: python3 projsim.py <in.png> <out.png> [black=0.06] [gamma=1.0] [blur=1.2]
# A rough projector in a lit room: black lifted to `black` (6% by default, ambient spill), contrast squashed by it,
# a slight softening (Gaussian blur, px at 1920 wide) and a touch of desaturation. Only for judging dark frames.
import sys
from PIL import Image, ImageFilter, ImageEnhance
src, dst = sys.argv[1], sys.argv[2]
black = float(sys.argv[3]) if len(sys.argv) > 3 else .06
gamma = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
blur = float(sys.argv[5]) if len(sys.argv) > 5 else 1.2
im = Image.open(src).convert('RGB')
im = im.filter(ImageFilter.GaussianBlur(blur * im.width / 1920))
im = ImageEnhance.Color(im).enhance(.88)
lut = [round(255 * (black + (1 - black) * ((v / 255) ** gamma) * .92)) for v in range(256)]
im = im.point(lut * 3)
im.save(dst); print(dst)
