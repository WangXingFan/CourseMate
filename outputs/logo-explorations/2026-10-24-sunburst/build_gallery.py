"""Build an offline review page from the saved logo brief."""

import html
import json
from pathlib import Path

root = Path(__file__).resolve().parent
spec = json.loads((root / "prompts.json").read_text(encoding="utf-8"))
cards = []
for concept in spec["concepts"]:
    c = {key: html.escape(str(value), quote=True) for key, value in concept.items()}
    cards.append(f'''
    <article class="card">
      <button class="art" type="button" data-id="{c['id']}" aria-label="放大 {c['name']}">
        <img src="{c['filename']}" alt="{c['name']} Logo 候选" width="1024" height="1024">
        <span class="zoom">↗</span>
      </button>
      <div class="details">
        <div class="heading"><span class="number">{c['id']}</span><h2>{c['name']}</h2></div>
        <p class="english">{c['english_name']}</p>
        <p class="description">{c['description']}</p>
        <a class="file" href="{c['filename']}" target="_blank" rel="noopener">查看原始 PNG <span>↗</span></a>
      </div>
    </article>''')

data = json.dumps(spec["concepts"], ensure_ascii=False).replace("</", "<\\/")
page = '''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>CourseMate · Logo 候选</title>
<style>
:root{color-scheme:light;--ink:#142b38;--muted:#65746e;--paper:#f2f4f0;--line:#dce2db;--teal:#087f8c}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:"Segoe UI","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1440px;margin:auto;padding:64px 44px 40px}header{border-top:2px solid var(--ink);padding-top:22px;margin-bottom:40px}
.eyebrow{display:flex;justify-content:space-between;gap:20px;font-size:12px;letter-spacing:.15em;font-weight:600;text-transform:uppercase;color:var(--muted)}
h1{font-size:clamp(40px,6vw,76px);line-height:1.08;letter-spacing:-.055em;margin:32px 0 18px;font-weight:650}h1 small{font-size:.42em;letter-spacing:-.025em;color:var(--muted);font-weight:450}
.intro{display:flex;align-items:flex-end;justify-content:space-between;gap:30px}.intro p{max-width:690px;font-size:16px;line-height:1.9;margin:0;color:var(--muted)}
.meta{white-space:nowrap;font-family:Consolas,monospace;font-size:12px;line-height:1.9;color:var(--teal);text-align:right}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.card{border:1px solid var(--line);background:white;overflow:hidden}
.art{position:relative;display:block;width:100%;aspect-ratio:1;background:white;padding:0;border:0;cursor:zoom-in}.art img{display:block;width:100%;height:100%;object-fit:contain}.zoom{position:absolute;right:18px;bottom:15px;color:#8a9690;font-size:21px;opacity:0;transition:opacity .15s}.art:hover .zoom,.art:focus-visible .zoom{opacity:1}
.details{padding:24px;border-top:1px solid #edf0eb}.heading{display:flex;gap:14px;align-items:center}.number{font:13px Consolas,monospace;color:var(--teal)}h2{font-size:21px;letter-spacing:-.03em;margin:0;font-weight:600}
.english{font-size:12px;color:var(--muted);letter-spacing:.04em;margin:8px 0 16px 32px}.description{font-size:14px;line-height:1.8;color:var(--muted);min-height:76px;margin:0 0 17px}.file{display:flex;justify-content:space-between;font-size:12px;text-decoration:none;color:var(--ink);padding-top:16px;border-top:1px solid var(--line)}.file:hover{color:var(--teal)}
footer{display:flex;justify-content:space-between;gap:20px;margin-top:32px;padding-top:22px;border-top:1px solid var(--line);font-size:12px;line-height:1.8;color:var(--muted)}footer a{color:var(--ink);text-underline-offset:4px}
dialog{border:1px solid var(--line);padding:0;max-width:1000px;width:calc(100% - 40px);max-height:92vh;background:#fff;color:var(--ink)}dialog::backdrop{background:#142b38b8;backdrop-filter:blur(5px)}.modal-grid{display:grid;grid-template-columns:1.5fr 1fr;align-items:center}.modal-image{width:100%;height:auto;display:block}.modal-copy{padding:36px}.modal-copy h2{font-size:28px;line-height:1.4}.modal-copy .description{margin-top:25px}.close{position:absolute;top:12px;right:14px;border:0;background:#f2f4f0;color:var(--ink);width:36px;height:36px;font-size:22px;cursor:pointer}.modal-nav{display:flex;gap:10px;margin-top:24px}.modal-nav button{background:white;border:1px solid var(--line);padding:9px 15px;color:var(--ink);cursor:pointer}button:focus-visible,a:focus-visible{outline:2px solid var(--teal);outline-offset:3px}
@media(max-width:1000px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.intro{display:block}.meta{text-align:left;margin-top:20px}.modal-grid{grid-template-columns:1fr 1fr}}
@media(max-width:600px){main{padding:30px 18px}.grid{grid-template-columns:1fr;gap:20px}.eyebrow{font-size:10px}h1{margin-top:26px}h1 small{display:block;margin-top:14px}.intro p{font-size:14px}.description{min-height:0}.modal-grid{display:block}.modal-image{max-height:48vh;object-fit:contain}.modal-copy{padding:22px}footer{display:block}footer span{display:block;margin:8px 0}}
</style>
</head>
<body><main>
<header><div class="eyebrow"><span>CourseMate / 课知伴</span><span>Identity exploration · 2026.10.24</span></div>
<h1>找到你的同频。<small>六个 Logo 方向</small></h1>
<div class="intro"><p>围绕信号与系统、探索式学习与 AI 陪伴，从六种不同符号出发。点击图片放大，比较形状、辨识度与品牌气质，再选择你最有感觉的一款。</p>
<div class="meta">gpt-image-2.5-sunburst<br>6 independent prompts · PNG</div></div></header>
<section class="grid" aria-label="六款 Logo 候选">__CARDS__</section>
<footer><span>所有候选图与提示词已保存在此文件夹。<br>白底位图概念稿；当前项目 Logo 保持原样。</span><span><a href="contact-sheet.jpg" target="_blank">六款总览</a> · <a href="prompts.json" target="_blank">完整提示词</a> · <a href="README.md" target="_blank">说明</a></span></footer>
</main>
<dialog id="preview" aria-label="Logo 放大预览"><button class="close" type="button" aria-label="关闭">×</button><div class="modal-grid"><img class="modal-image" alt=""><div class="modal-copy"><span class="number" id="modal-number"></span><h2 id="modal-title"></h2><p class="english" id="modal-english" style="margin-left:0"></p><p class="description" id="modal-description"></p><a class="file" id="modal-file" target="_blank" rel="noopener">查看原始 PNG <span>↗</span></a><div class="modal-nav"><button type="button" id="previous">← 上一款</button><button type="button" id="next">下一款 →</button></div></div></div></dialog>
<script>
const concepts=__DATA__;const modal=document.querySelector('#preview');let current=0;
function show(index){current=(index+concepts.length)%concepts.length;const c=concepts[current];document.querySelector('.modal-image').src=c.filename;document.querySelector('.modal-image').alt=c.name;document.querySelector('#modal-number').textContent=c.id+' / 06';document.querySelector('#modal-title').textContent=c.name;document.querySelector('#modal-english').textContent=c.english_name;document.querySelector('#modal-description').textContent=c.description;document.querySelector('#modal-file').href=c.filename;if(!modal.open)modal.showModal()}
document.querySelectorAll('.art').forEach((button,index)=>button.addEventListener('click',()=>show(index)));document.querySelector('.close').addEventListener('click',()=>modal.close());document.querySelector('#previous').addEventListener('click',()=>show(current-1));document.querySelector('#next').addEventListener('click',()=>show(current+1));modal.addEventListener('click',event=>{if(event.target===modal)modal.close()});document.addEventListener('keydown',event=>{if(!modal.open)return;if(event.key==='ArrowRight')show(current+1);if(event.key==='ArrowLeft')show(current-1)});
</script></body></html>
'''
(root / "index.html").write_text(page.replace("__CARDS__", "".join(cards)).replace("__DATA__", data), encoding="utf-8")
print(f"Saved offline gallery: {root / 'index.html'}")
