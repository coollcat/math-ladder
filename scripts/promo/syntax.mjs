/* 抽出宣传片里的内联脚本做语法检查（不执行）。
   用法：  node scripts/promo/syntax.mjs            :: 完整版 static/promo/full/index.html
           node scripts/promo/syntax.mjs short      :: 快闪版 static/promo/short/index.html
   改完成片先跑这个，一秒出结果。                                              */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const HERE = import.meta.dirname;
const FILM = (process.argv[2] || 'full').replace(/[^a-z]/g, '');
const FILE = path.resolve(HERE, '../../static/promo', FILM, 'index.html');
const html = readFileSync(FILE, 'utf8');
const i = html.indexOf('<script>');
const j = html.lastIndexOf('</script>');
if (i < 0 || j < 0) { console.error('找不到内联脚本'); process.exit(1); }
const js = html.slice(i + 8, j);
mkdirSync(path.join(HERE, 'shots'), { recursive: true });
writeFileSync(path.join(HERE, 'shots', FILM + '-inline.js'), js);
try {
  new vm.Script(js, { filename: FILM + '-inline.js' });
  console.log(FILM + ' 语法 OK · ' + js.length + ' 字符 · ' + js.split('\n').length + ' 行 · ' + FILE);
} catch (e) {
  console.error('语法错误: ' + e.message);
  const m = /inline\.js:(\d+)/.exec(e.stack || '');
  if (m) {
    const ln = +m[1], lines = js.split('\n');
    for (let k = Math.max(0, ln - 4); k < Math.min(lines.length, ln + 3); k++) {
      console.error((k + 1) + (k + 1 === ln ? ' >> ' : '    ') + lines[k]);
    }
  }
  process.exit(1);
}
