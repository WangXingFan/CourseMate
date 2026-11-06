"""Import the four Chaoxing Word exports. Run with uv --with olefile --with beautifulsoup4.

Usage: uv run --with olefile --with beautifulsoup4 python scripts/import-homework-bank.py SOURCE
Formula-only raster images were transcribed and checked against the originals.
The remaining waveform diagrams are copied into the web assets.
"""
import base64
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

import olefile
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
FORMULAS = {
    '1-6': r'\int_{-4}^{4}(t^2+3t+2)[\delta(t)+2\delta(t-2)]\,dt',
    '1-7': r'\int_{-\infty}^{+\infty}[t^2+\sin(\frac{\pi t}{4})]\delta(t+2)\,dt',
    '1-8': r'f_1(k)=\cos(\frac{3\pi}{5}k)',
    '1-9': r'f_3(t)=3\cos t+2\sin(\pi t)',
    '2-9': r'\cos(5t)*\delta(t)=',
    '2-10': r'\sin(9t)*\delta^{\prime}(t)=',
    '2-11': r'y(t)=t^2x(t-1)',
    '2-12': r'f(t)*\delta(t)=f(t)',
    '2-13': r'\varepsilon(t)*\varepsilon(t)=t\varepsilon(t)',
    '2-14': r'f_1(t)=f_2(t)=e^{-2t}\varepsilon(t)',
    '2-15': r'f_1(t)*f_2(t)=te^{-2t}\varepsilon(t)',
    '2-16': r'\int_{-\infty}^{\infty}f(t)\delta^{\prime}(t)\,dt=f^{\prime}(0)',
    '2-18': r't\varepsilon(t-1)',
    '3-3': r'F(j\omega)',
    '3-4': r'-\frac{1}{2}F(j\frac{1}{2}\omega)e^{-j2\omega}',
    '3-5': r'\frac{1}{2}F(j\frac{1}{2}\omega)e^{-j2\omega}',
    '3-6': r'\frac{1}{2}F(j\frac{1}{2}\omega)e^{-j\frac{1}{2}\omega}',
    '3-7': r'2F(j2\omega)e^{j2\omega}',
    '4-6': r'f(t)=\int_{-\infty}^{t-2}\delta(x)\,dx',
    # The embedded formula metadata contains mojibake; the rendered source is clear.
    '4-15': r'e^{-2(t-1)}\varepsilon(t-1)',
    '4-18': r'e^{-2(t-2)}\varepsilon(t-2)',
}


def plain(fragment):
    soup = BeautifulSoup(fragment, 'html.parser')
    for node in soup.find_all(['sup', 'sub']):
        marker = '^' if node.name == 'sup' else '_'
        node.replace_with('$' + marker + '{' + node.get_text('', strip=True) + '}$')
    # Whitespace in the export comes from source formatting, not word boundaries.
    return re.sub(r'\s+', ' ', soup.get_text('', strip=True)).strip()


def main():
    source = Path(sys.argv[1])
    assets = ROOT / 'apps/web/public/learning/homework'
    assets.mkdir(parents=True, exist_ok=True)
    bank = []
    formula_count = diagram_count = 0
    for number in range(1, 5):
        path = source / f'作业{number}.doc'
        with olefile.OleFileIO(path) as doc:
            html = doc.openstream('WordDocument').read().decode('utf-8')
        soup = BeautifulSoup(html, 'html.parser')
        for index, img in enumerate(soup.find_all('img'), 1):
            label = f'{number}-{index}'
            formula = FORMULAS.get(label)
            if not formula and img.get('data'):
                formula = json.loads(unquote(img['data']))['formula']
            if formula:
                img.replace_with(f' ${formula}$ ')
                formula_count += 1
            else:
                data = base64.b64decode(img['src'].split(',', 1)[1])
                (assets / f'{label}.png').write_bytes(data)
                img.replace_with(f'\n\n![波形图 {label}](/learning/homework/{label}.png)\n\n')
                diagram_count += 1
        sections = re.split(r'<h6[^>]*>', str(soup))[1:]
        questions = []
        for section in sections:
            heading, section = section.split('</h6>', 1)
            kind = 'single' if '单选题' in heading else 'blank' if '填空题' in heading else 'true_false'
            count, points = map(int, re.search(r'共(\d+)题[，,](\d+)分', plain(heading)).groups())
            blocks = re.split(r'<p class="mrt20"[^>]*>', section)[1:]
            assert len(blocks) == count
            for block in blocks:
                question_html, answers_html = block.split('<span>正确答案：</span>', 1)
                opts = []
                q = BeautifulSoup(question_html, 'html.parser')
                for option in q.find_all('div'):
                    content = plain(str(option))
                    if re.match(r'^[A-F]、', content):
                        opts.append(content[2:])
                        option.decompose()
                prompt = re.sub(r'^\d+、', '', plain(str(q))).strip()
                correct = plain(answers_html).split('解析：')[0].strip()
                if kind == 'single':
                    accepted = [[str(ord(correct) - ord('A'))]]
                elif kind == 'true_false':
                    opts = ['正确', '错误']
                    accepted = [[str(opts.index(correct))]]
                else:
                    accepted = [[s.strip() for s in answer.split(';')] for answer in re.split(r'第\d+空:', correct)[1:]]
                questions.append({'id': f'hw{number}-q{len(questions)+1}', 'kind': kind,
                                  'prompt': prompt, 'options': opts, 'points': points // count,
                                  'accepted': accepted})
        assert len(questions) == 10 and sum(q['points'] for q in questions) == 100
        bank.append({'id': f'homework-{number}', 'title': f'作业{number}', 'source': path.name,
                     'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'questions': questions})
    # Preserve superscripts/subscripts as complete math expressions for accessible rendering.
    bank[0]['questions'][2]['options'][3] = '$e^t$ 为能量信号'
    bank[0]['questions'][3]['options'] = ['$f(t-t_0)$', '$f(k-k_0)$', '$f(at)$', '$f(-t)$']
    bank[3]['questions'][0]['prompt'] = r'已知系统的冲激响应 $h(t)=8e^{-3t}\varepsilon(t)$，则系统函数 $H(s)$ 为（ ）。'
    bank[3]['questions'][1]['prompt'] = r'如图所示的信号，其单边拉普拉斯变换分别为 $F_1(s),F_2(s),F_3(s)$，则（ ）。 ![波形图 4-5](/learning/homework/4-5.png)'
    bank[3]['questions'][1]['options'] = [r'$F_1(s)=F_2(s)\ne F_3(s)$', r'$F_1(s)\ne F_2(s)=F_3(s)$', r'$F_1(s)\ne F_2(s)\ne F_3(s)$', r'$F_1(s)=F_2(s)=F_3(s)$']
    bank[3]['questions'][5]['options'] = [r'$sF(s)$', r'$sF(s)-f(0^-)$', r'$sF(s)+f(0^-)$']
    # Common equivalent placements of multiplication in the two expression blanks.
    bank[1]['questions'][2]['accepted'][0].extend(['cos(5*t)', 'cos(t*5)', r'\cos 5t'])
    bank[1]['questions'][3]['accepted'][0].extend(['9*cos(9*t)', 'cos(9*t)*9', r'9\cos 9t'])
    destination = ROOT / 'backend/internal/domain/classroom/content/homework-bank.json'
    # Keep reviewed explanations only when the question and grading key are unchanged.
    if destination.exists():
        previous = {q['id']: q for paper in json.loads(destination.read_text('utf-8'))
                    for q in paper['questions']}
        for paper in bank:
            for question in paper['questions']:
                old = previous.get(question['id'], {})
                if all(old.get(key) == question[key] for key in ('kind', 'prompt', 'options', 'accepted')) and old.get('explanation'):
                    question['explanation'] = old['explanation']
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(f'Imported {len(bank)} papers / 40 questions / {formula_count} formulas / {diagram_count} diagrams')


if __name__ == '__main__':
    main()
