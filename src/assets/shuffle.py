# -*- coding: utf-8 -*-

import sys
import json
import random

name = sys.argv[1]

fin = open(name, encoding='utf-8')
rows = json.load(fin)
random.shuffle(rows)

fin.close()

fout = open(name, 'w', encoding='utf-8')
json.dump(rows, fout, indent=2, ensure_ascii=False)
fout.close()
