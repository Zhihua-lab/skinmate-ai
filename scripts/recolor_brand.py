import re

p = "public/brand-fuji.svg"
s = open(p, encoding="utf-8").read()
# keep the little decorative star pink, make every other stroke a solid dark brown
s = s.replace('fill="#fa9093"', 'fill="@@SPARK@@"')
s = re.sub(r'fill="#[0-9a-fA-F]{6}"', 'fill="#43302e"', s)
s = s.replace('@@SPARK@@', '#ef7d9d')
open(p, "w", encoding="utf-8").write(s)
print("done")
