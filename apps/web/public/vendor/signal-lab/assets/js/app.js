(function () {
  'use strict';
  const L = window.SignalLab, R = L.records, e = L.escape, f = L.format;
  const ids = L.taskIds;
  let route, currentScene, cursor = null, cursorChart = 'main', hints = 0, animation = null, previousFrame = 0, toastTimer;
  const icons = {
    wave: '<path d="M2 13h4l4-9 5 17 4-8h3"/>',
    home: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    record: '<path d="M8 4H5v17h14V4h-3M9 3h6v4H9zM8 12h8M8 16h5"/>',
    book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
    arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    check: '<path d="m5 12 4 4L20 5"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
    play: '<path d="m8 4 12 8-12 8Z"/>',
    pause: '<path d="M8 4v16M16 4v16"/>',
    next: '<path d="m5 5 10 7-10 7ZM19 5v14"/>',
    print: '<path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7zM17 12h.1"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6ZM8 12l3 3 5-6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.wave}</svg>`;
  const button = (label, action, type = '', symbol = '') => `<button class="button ${type}" data-action="${action}">${symbol ? icon(symbol) : ''}${label}</button>`;
  const time = iso => new Date(iso).toLocaleString('zh-CN', { hour12: false });
  function notify(message, error = false) {
    const el = document.getElementById('toast');
    clearTimeout(toastTimer); el.textContent = message; el.className = 'visible' + (error ? ' error' : '');
    toastTimer = setTimeout(() => { el.className = ''; }, error ? 6500 : 3500);
  }
  function readRoute() {
    const parts = location.hash.slice(1).split('/');
    if (parts[0] === 'task' && ids.includes(parts[1])) return { page: 'task', id: parts[1] };
    if (parts[0] === 'course' && L.courses.some(c => c.id === parts[1])) return { page: 'course', id: parts[1] };
    if (['records', 'help'].includes(parts[0])) return { page: parts[0], course: ['L1','L2','L3'].includes(parts[1]) ? parts[1] : 'L1' };
    if (!location.hash && location.pathname.endsWith('experiment1.html')) return { page: 'course', id: 'L1' };
    if (!location.hash && location.pathname.endsWith('experiment2.html')) return { page: 'course', id: 'L2' };
    if (!location.hash && location.pathname.endsWith('experiment3.html')) return { page: 'course', id: 'L3' };
    return { page: 'home' };
  }
  function shell(content) {
    const activeCourse = route.page === 'task' ? route.id.slice(0, 2) : route.page === 'course' ? route.id : null;
    const active = key => route.page === key ? ' active' : '';
    const title = route.page === 'task' ? route.id : route.page === 'course' ? L.courses.find(c => c.id === route.id).short : { home: '课程总览', records: '我的实验记录', help: '使用指南' }[route.page];
    return `<aside class="sidebar"><a class="brand" href="#home" aria-label="信号实验室首页"><div class="brand-mark">${icon('wave')}</div><div><strong>信号实验室</strong><small>SIGNAL & SYSTEM</small></div></a>
      <nav aria-label="主要导航"><div class="side-nav"><a class="nav-item${active('home')}" href="#home">${icon('home')}<span>课程总览</span></a><a class="nav-item${active('records')}" href="#records">${icon('record')}<span>我的实验记录</span></a></div><div class="side-label">EXPERIMENTS / 实验</div><div class="side-nav">${L.courses.map(c => `<a class="nav-item${activeCourse === c.id ? ' active' : ''}" href="#course/${c.id}" title="${e(c.name)}"><span class="nav-num">${c.number}</span><span>${c.id === 'L1' ? '信号与时域系统' : c.id === 'L2' ? '频谱与滤波' : '拉普拉斯与响应'}</span></a>`).join('')}</div><div class="side-divider"></div><div class="side-label">RESOURCES / 资源</div><a class="nav-item${active('help')}" href="#help">${icon('book')}<span>使用指南</span></a></nav>
      <div class="sidebar-footer"><div class="offline"><i class="dot"></i>复用账号 · 自动同步记录</div><p class="side-note">先预测，再验证。<br>让每一条曲线都有解释。</p><p class="mono small" style="margin-top:20px;color:#829885;font-size:9px">CS3017 / v${L.version}</p></div></aside>
      <div class="workspace"><header class="topbar"><div class="breadcrumb"><a href="#home">CS3017 信号与系统</a><span>/</span><strong>${e(title)}</strong></div><div class="top-actions"><span class="offline muted"><i class="dot"></i>本机计算</span><span class="version">试用版</span><button class="text-button" data-action="import">${icon('upload')}导入记录</button></div></header><main id="main" class="main" tabindex="-1">${content}<footer class="page-footer"><span>信号与系统虚拟实验室 · CS3017</span><span>观察 / 测量 / 理解 &nbsp;—&nbsp; THE SCIENCE OF SIGNALS</span></footer></main></div>`;
  }
  function miniArt(id) {
    const grid = '<path d="M10 65h300M10 30h300M10 100h300M55 10v110M125 10v110M195 10v110M265 10v110" stroke="#d9dfcf" stroke-dasharray="2 5" fill="none"/>';
    const wave = id === 'L1' ? '<path d="M15 91h53l42-55 80 55h100" stroke="#577553" stroke-width="2"/><path d="M40 93h98l32-41 60 41h60" stroke="#b18a56" stroke-width="1.5" stroke-dasharray="4 4"/>' : id === 'L2' ? '<path d="M28 92V56m39 36V24m39 68V70m39 22V49m39 43V77m39 15V64m39 28V81" stroke="#72825a" stroke-width="2"/><path d="M20 92h270" stroke="#cad3bc"/>' : '<path d="M23 91h28v-47h113v47h124" stroke="#ad9164" stroke-width="1.5" stroke-dasharray="4 4"/><path d="M23 91h28C85 48 113 43 164 42c24 0 32 44 124 48" stroke="#748b6e" stroke-width="2"/>';
    return `<svg viewBox="0 0 320 120" aria-hidden="true">${grid}<g fill="none" stroke-linejoin="round">${wave}</g></svg>`;
  }
  function heroArt() {
    return `<div class="hero-art"><svg viewBox="0 0 530 310" aria-hidden="true"><defs><pattern id="hero-grid" width="19" height="19" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#c8cfbd"/></pattern><linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#87a476" stop-opacity=".19"/><stop offset="1" stop-color="#87a476" stop-opacity="0"/></linearGradient></defs><rect x="5" y="5" width="520" height="290" fill="url(#hero-grid)"/><circle cx="287" cy="147" r="103" fill="none" stroke="#d7ddcb"/><circle cx="287" cy="147" r="131" fill="none" stroke="#e1e4d6" stroke-dasharray="2 6"/><path d="M33 212h465M80 40v215" fill="none" stroke="#a5b096"/><path d="m492 208 6 4-6 4m-416-170 4-6 4 6" fill="none" stroke="#a5b096"/><path d="M81 212h65l70-139 137 139h119" fill="none" stroke="#bd9a65" stroke-width="1.7" stroke-dasharray="5 5"/><path d="M80 212h65c25 0 36-4 53-25s29-61 60-64 56 16 79 37 59 46 135 48v4Z" fill="url(#hero-fill)"/><path d="M80 212h65c25 0 36-4 53-25s29-61 60-64 56 16 79 37 59 46 135 48" fill="none" stroke="#466c4b" stroke-width="3"/><circle cx="258" cy="123" r="5" fill="#f5f4ee" stroke="#466c4b" stroke-width="2"/><path d="M258 116V69h58" fill="none" stroke="#8e9d7f" stroke-width=".8"/><text x="322" y="73" font-size="12" font-family="Georgia,serif" fill="#6a7a5d">y(t) = x(t) ∗ h(t)</text><text x="62" y="230" font-size="10" font-family="monospace" fill="#8a967b">0</text><text x="503" y="218" font-size="13" font-family="Georgia,serif" fill="#859477">t</text><text x="64" y="33" font-size="12" font-family="Georgia,serif" fill="#859477">y</text><path d="M322 267h22" stroke="#466c4b" stroke-width="2"/><text x="352" y="271" font-size="9" font-family="sans-serif" fill="#859477">系统响应</text><path d="M424 267h22" stroke="#bd9a65" stroke-width="1.5" stroke-dasharray="4 3"/><text x="453" y="271" font-size="9" font-family="sans-serif" fill="#859477">输入信号</text></svg><span class="art-caption">TIME DOMAIN / CONTINUOUS SIGNALS</span></div>`;
  }
  function home() {
    const done = ids.filter(id => R.data.tasks[id].completion.confirmed).length;
    const next = ids.find(id => !R.data.tasks[id].completion.confirmed) || ids[0];
    return `<section class="hero"><div class="hero-copy"><div class="eyebrow">A LABORATORY FOR EXPLORATION</div><h1>按步骤操作，<br>完成<em>实验。</em></h1><p>这是《信号与系统》实验课的在线操作工具。<br>按老师安排进入实验，完成页面步骤，保存试验与解释，最后提交报告。</p><div class="hero-actions"><a class="button primary" href="#task/${next}">${done ? '继续实验' : '开始第一次实验'}${icon('arrow')}</a><a href="#help" class="small muted">第一次使用？先看操作指南 ↗</a></div><div class="hero-meta"><span><b>03</b>次实验安排</span><span><b>12</b>项学习任务</span><span><b>45</b>分钟 / 小节</span></div></div>${heroArt()}</section>
      <div class="start-route"><strong>上课从这里开始</strong><span>① <a href="#records">填写个人信息</a> → ② 选择老师安排的实验 → ③ 按任务步骤预测、测量并保存 → ④ <a href="#records">导出当前实验 PDF 和 JSON 备份</a></span></div>
      <div class="section-title"><h2>实验课程<span>THE EXPERIMENTS</span></h2><span class="small muted" style="font-size:10px">三次实验已开放 · 已确认完成 ${done}/12 项</span></div>
      <section class="course-list" aria-label="三次实验">${L.courses.map(c => `<article class="course-card${c.available ? ' is-open' : ''}"><div class="course-visual"><span class="course-number">EXPERIMENT ${c.number}</span><span class="course-stage${c.available ? '' : ' wait'}">${c.available ? '可开始实验' : '待开放'}</span>${miniArt(c.id)}</div><div class="course-body"><div class="eyebrow">${e(c.chapter)} · ${c.number === '01' ? 'TIME DOMAIN' : c.number === '02' ? 'FREQUENCY DOMAIN' : 'LAPLACE DOMAIN'}</div><h3>${e(c.name)}</h3><p>${e(c.subtitle)}</p><div class="tag-list">${c.tags.map(t => `<span class="tag">${e(t)}</span>`).join('')}</div><div class="course-bottom"><span>4 个任务 &nbsp;·&nbsp; 180 分钟</span><a class="course-link" href="#course/${c.id}">${c.available ? '进入实验' : '查看实验安排'}${icon('arrow')}</a></div></div></article>`).join('')}</section>
      <div class="section-title"><h2>每一次探索，都留下证据<span>YOUR LEARNING PROCESS</span></h2><span class="eyebrow" style="font-size:9px">PREDICT → EXPLORE → EXPLAIN</span></div><section class="workflow">${[['01', '先做预测', '写下你对曲线和结果的判断'], ['02', '操作与测量', '改变参数，用游标读取数据'], ['03', '记录与解释', '保存证据，解释差异与修正'], ['04', '导出实验报告', '备份记录，打印为 PDF 提交']].map(s => `<div class="workflow-step"><span class="step-num">${s[0]}</span><div><strong>${s[1]}</strong><p>${s[2]}</p></div></div>`).join('')}</section><div class="backup-strip">${icon('shield')}<span>无需安装 MATLAB。记录同步到当前账号，请检查顶部保存状态并定期下载 JSON 备份。</span><a class="text-button" href="#records">查看我的记录 ${icon('arrow')}</a></div>`;
  }
  function coursePage(id) {
    const c = L.courses.find(c => c.id === id);
    return `<div class="page-heading course-header"><div><div class="eyebrow">EXPERIMENT ${c.number} / ${e(c.chapter)}</div><h1>${e(c.name)}</h1><p>${e(c.subtitle)}</p></div>${c.available ? `<a class="button primary" href="#task/${id}-1">开始本次实验${icon('arrow')}</a>` : '<span class="version">待开放</span>'}</div>${!c.available ? '<div class="notice">本次实验的学习目标与任务安排已确定，交互任务将在后续版本开放。当前可完整体验实验一。</div>' : ''}<section class="objective-box"><h2>本次学习目标</h2><ol>${c.objectives.map(o => `<li>${e(o)}</li>`).join('')}</ol></section><div class="section-title"><h2>四个任务，一次完整探索<span>4 × 45 MINUTES</span></h2><span class="small muted">180 分钟 · 课间休息另计</span></div><section class="task-list">${[1, 2, 3, 4].map(i => { const tid = id + '-' + i, t = L.tasks[tid], record = R.data.tasks[tid]; return `<article class="task-row"><span>${tid}</span><div><h3>${e(t.title)}</h3><p>${e(t.goal || c.objectives[i - 1])}</p></div>${c.available ? `<a class="button compact" href="#task/${tid}">${record.completion.confirmed ? '查看已完成任务' : record.trials.length ? '继续探索' : '开始探索'}${icon('arrow')}</a>` : '<span class="muted small">待开放 · 45 min</span>'}</article>`; }).join('')}</section>${c.available ? '<div class="notice">建议每项任务：预测 5 分钟 → 操作 25 分钟 → 分析 10 分钟 → 记录与反馈 5 分钟。预测允许修正，系统会保留原稿。</div>' : ''}`;
  }
  function paramsHTML(id) {
    const t = L.tasks[id], rec = R.data.tasks[id];
    return t.params.map(p => `<div class="param" data-param-wrap="${p.key}"><div class="param-label"><label for="param-${p.key}">${e(p.label)}</label>${p.type === 'number' ? `<div><input class="input param-numeric" id="param-${p.key}" type="number" data-param="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${rec.params[p.key]}" aria-label="${e(p.label)}精确值"><small> ${e(p.unit)}</small></div>` : ''}</div>${p.type === 'select' ? `<select class="input" id="param-${p.key}" data-param="${p.key}">${p.options.map(([v, text]) => `<option value="${v}"${rec.params[p.key] === v ? ' selected' : ''}>${e(text)}</option>`).join('')}</select>` : `<input class="range" type="range" data-range="${p.key}" aria-label="${e(p.label)}滑块" min="${p.min}" max="${p.max}" step="${p.step}" value="${rec.params[p.key]}"><div class="param-bounds"><span>${p.min}${e(p.unit)}</span><span>${p.max}${e(p.unit)}</span></div>`}</div>`).join('');
  }
  function presets(id) {
    const extra = extraPresets(id); if (extra) return extra;
    const choices = id === 'L1-1' ? [['平移', { mode: 'transform', A: 1, a: 1, shift: 1 }], ['反转', { mode: 'transform', A: 1, a: -1, shift: 0 }], ['压缩', { mode: 'transform', A: 1, a: 2, shift: 0 }], ['组合', { mode: 'transform', A: 2, a: 2, shift: 1 }], ['Δ=0.5', { mode: 'impulse', delta: 0.5 }], ['Δ=0.2', { mode: 'impulse', delta: 0.2 }], ['Δ=0.1', { mode: 'impulse', delta: 0.1 }]] : id === 'L1-3' ? [['y₀=0', { initial: 0 }], ['y₀=0.5', { initial: 0.5 }], ['y₀=2', { initial: 2 }]] : id === 'L1-4' ? [-0.5, 0.5, 1, 1.5, 2.5].map(t => ['t=' + t, { time: t }]) : [];
    return choices.length ? `<div class="preset-label">快速设置 · 每次仅替换相关参数</div><div class="presets">${choices.map(([label, params]) => `<button class="preset" data-preset="${e(JSON.stringify(params))}">${e(label)}</button>`).join('')}</div>` : '';
  }
  function predictionHistory(id) {
    const t = R.data.tasks[id];
    return t.prediction ? `<details class="prediction-history"><summary>已保留初始预测${t.revisions.length ? '与 ' + t.revisions.length + ' 次修订' : ''}</summary><b>初始预测</b><p>${e(t.prediction)}</p>${t.revisions.map((r, i) => `<b>修订 ${i + 1} · ${e(time(r.time))}</b><p>${e(r.text)}</p>`).join('')}</details>` : '';
  }
  function taskGuide(id) {
    const g = L.guides && L.guides[id]; if (!g) return '';
    return '<details class="task-guide"' + (R.data.tasks[id].trials.length ? '' : ' open') + '><summary>本任务怎么做 · 操作步骤与完成要求</summary><div class="task-guide-body"><ol>' + g.steps.map(s => '<li>' + e(s) + '</li>').join('') + '</ol><p><strong>完成前核对：</strong>' + e(g.evidence) + '</p><p class="guide-reminder">每组参数读数后，请点“保存本次试验”。完成按钮只检查基础记录，完整比较与解释仍由教师检查。</p></div></details>';
  }
  function taskPage(id) {
    const ids = L.courseIds(id.slice(0, 2));
    const t = L.tasks[id], rec = R.data.tasks[id];
    const courseTaskIds = ids.filter(tid => tid.startsWith(id.slice(0, 2) + '-')), taskIndex = courseTaskIds.indexOf(id);
    return `<nav class="task-tabs" aria-label="本次实验的四个任务">${courseTaskIds.map(tid => `<a class="task-tab${tid === id ? ' active' : ''}${R.data.tasks[tid].completion.confirmed ? ' done' : ''}" href="#task/${tid}"><span>${tid}</span>${e(L.tasks[tid].short || L.tasks[tid].title)}</a>`).join('')}</nav><div class="task-heading"><div><div class="eyebrow">${e(t.eyebrow || '')} / ${id}</div><h1>${e(t.title)}</h1><p>${e(t.goal || '')}</p></div><span class="task-time">${icon('clock')} 45 min / 任务 ${taskIndex + 1} / 4</span></div>
    ${taskGuide(id)}
    <div class="bench-grid"><div class="bench-main"><section class="panel"><div class="panel-head"><h2>01 / 实验前预测</h2><span class="eyebrow">PREDICT FIRST</span></div><div class="panel-body"><p class="question">${e(t.question)}</p><textarea id="prediction" class="textarea" maxlength="12000" aria-label="实验前预测" placeholder="${e(t.prediction)}">${e(rec.predictionDraft)}</textarea><div class="prediction-actions"><span>可以先操作演示；请在任务结束前保存预测。</span>${button(rec.prediction ? '保存预测修订' : '保存初始预测', 'prediction', 'compact')}</div><div id="prediction-history">${predictionHistory(id)}</div></div></section>
    <section class="panel"><div class="panel-head"><h2>02 / 图形与测量</h2><span class="eyebrow">OBSERVE & MEASURE</span></div><div id="scene"></div><div class="plot-actions">${button('导出图形 PNG', 'png', 'compact', 'image')}${button('保存本次试验', 'trial', 'primary compact', 'check')}</div></section>
    <section class="panel"><div class="panel-head"><h2>03 / 参数与测量记录</h2><span id="trial-count" class="record-count">${rec.trials.length} 次试验</span></div><div id="trials"></div></section>
    <section class="panel"><div class="panel-head"><h2>04 / 解释、修正与完成</h2><span class="eyebrow">EXPLAIN YOUR FINDINGS</span></div><div class="panel-body"><label for="derivation" class="analysis-label">推导、判定或计算依据（可选填，按任务要求补充）</label><textarea id="derivation" class="textarea" maxlength="12000" placeholder="记录关键点映射、代数关系或计算过程。">${e(rec.derivation)}</textarea><label for="analysis" class="analysis-label second">结果分析与预测修正</label><textarea id="analysis" class="textarea" maxlength="12000" placeholder="${e(t.analysis)}">${e(rec.analysis)}</textarea><div class="completion-bar"><p id="completion-status"></p>${button(rec.completion.confirmed ? '已确认完成 · 可重新确认' : '检查并确认本任务完成', 'complete', 'compact', 'check')}</div></div></section><div class="task-prev-next">${ids.indexOf(id) > 0 ? `<a href="#task/${ids[ids.indexOf(id) - 1]}">← 上一任务</a>` : `<a href="#course/${id.slice(0,2)}">← 本次实验安排</a>`}${ids.indexOf(id) < 3 ? `<a href="#task/${ids[ids.indexOf(id) + 1]}">下一任务 →</a>` : `<a href="#records/${id.slice(0,2)}">整理并导出报告 →</a>`}</div></div>
    <aside class="bench-controls"><section class="panel"><div class="panel-head"><h2>参数控制</h2><span class="eyebrow">CONTROLS</span></div><div class="panel-body">${presets(id)}${id === 'L1-4' ? `<div class="animation">${button('播放', 'play', 'compact', 'play')}${button('单步 +0.05 s', 'step', 'compact', 'next')}</div>` : ''}${paramsHTML(id)}${answerControls(id, rec)}</div><div class="control-footer"><span>改参数不删除已有记录</span><button class="text-button" data-action="reset">${icon('reset')}重置</button></div></section><section class="panel"><div class="panel-head"><h2>探索提示</h2><button class="text-button" data-action="hint">展开下一条</button></div><div class="panel-body"><p class="evidence">先观察，再解释。需要时可以逐级展开提示。</p><div id="hints" class="hint"></div></div></section><section class="panel"><div class="panel-head"><h2>本任务成果</h2>${icon('record')}</div><div class="panel-body evidence"><p>${e(t.evidence || '')}</p><p style="margin-top:12px"><strong>预测＋数据＋解释</strong><br>确认完成仅表示你已自查，教师会结合成果与个人解释评价。</p></div></section></aside></div>`;
  }
  function answerControls(id, rec) {
    const answers = L.tasks[id].answers || [];
    if (!answers.length) return '';
    const values = rec.answers || L.defaultAnswers(id);
    return `<div class="answer-block"><div class="preset-label">受限模板填写 · 形成性反馈</div>${answers.map(a => `<label class="analysis-label" for="answer-${a.key}">${e(a.label)}<input class="input answer-input" id="answer-${a.key}" data-answer="${a.key}" maxlength="100" inputmode="decimal" value="${e(values[a.key] || '')}" placeholder="${e(a.placeholder || '')}"></label>`).join('')}<div id="answer-feedback" class="hint"></div></div>`;
  }
  function extraPresets(id){
const list=id==='L2-2'?[0.5,1,2].map(T=>['T='+T+' s',{T}]):id==='L2-3'?[100,200,500].map(fc=>[fc+' Hz',{fc}]):id==='L3-4'?[0.5,1,2,3].map(T=>['T='+T+' s',{T}]):[];
return list.length?'<div class="preset-label">候选参数 · 保存后比较</div><div class="presets">'+list.map(([label,p])=>'<button class="preset" data-preset="'+e(JSON.stringify(p))+'">'+e(label)+'</button>').join('')+'</div>':'';
}
  function renderAnswerFeedback(){const el=document.getElementById('answer-feedback');if(!el)return;const scene=currentScene;el.innerHTML='<p class="student-expression">'+e(scene.studentExpression||'')+'</p>'+(scene.answerFeedback||[]).map(a=>'<p class="answer-status '+a.status+'">'+e(a.label)+'：'+e(a.message)+'</p>').join('');}
  function recordTabs(course){return'<nav class="task-tabs" aria-label="选择实验记录">'+L.courses.map(c=>'<a class="task-tab '+(c.id===course?'active':'')+'" href="#records/'+c.id+'">实验 '+c.number+' · '+e(c.short)+'</a>').join('')+'</nav>';}
  function paramsText(id, params) {
    return L.tasks[id].params.filter(p => p.key !== 'speed').map(p => `${p.label}=${p.type === 'select' ? p.options.find(o => o[0] === params[p.key])[1] : f(params[p.key]) + (p.unit ? ' ' + p.unit : '')}`).join('；');
  }
  function readingsText(measurements){
const labels={K:'最大谐波序号',termCount:'项数',highestFrequency:'最高频率/Hz',amplitudes:'谐波幅度',firstZero:'第一正零点/Hz',zeroFrequency:'X(0)/幅度·s',phaseAtQuarter:'f=0.25 Hz 相位/rad',cutoff:'截止频率/Hz',fitWindow:'拟合窗口/s',components:'理论与测量',sampleRate:'采样率/Hz',candidate:'候选频率/Hz',sampleDifference:'样本最大差',reconstructionError:'重建最大差',passed:'指标达标',peak:'峰值',peakTime:'峰时/s',initial:'初值',decompositionError:'分解误差',atTimes:'各时刻读数',answerStatus:'模板反馈',studentExpression:'学生表达式',measureTime:'测量时刻/s',yAtTime:'响应读数',t90:'t90/s',theoreticalPeak:'理论峰值',cursor:'游标',ratio:'测量幅度比',phase:'测量相位/°',theoryRatio:'理论幅度比',theoryPhase:'理论相位/°',frequency:'频率/Hz'};
const value=v=>typeof v==='number'?v!==0&&Math.abs(v)<1e-6?v.toExponential(3):f(v,6):v===null?'不适用':typeof v==='boolean'?v?'是':'否':Array.isArray(v)?v.map(value).join(' | '):typeof v==='object'?Object.entries(v).map(([k,x])=>(labels[k]||k)+'='+value(x)).join(', '):String(v);
return Object.entries(measurements).map(([k,v])=>e(labels[k]||k)+': '+e(value(v))).join('；');
}
  function trialTable(id, report = false) {
    const trials = R.data.tasks[id].trials;
    if (!trials.length) return '<div class="empty">尚无试验记录。设置参数后，点击“保存本次试验”。</div>';
    return `<div class="table-scroll"><table class="trial-table"><thead><tr><th>序号 / 时间</th><th>参数与测量数据</th>${report ? '' : '<th>操作</th>'}</tr></thead><tbody>${trials.map((trial, index) => `<tr><td class="mono">${String(index + 1).padStart(2, '0')}<br><span class="small" style="font-size:9px">${e(time(trial.time))}</span></td><td>${e(paramsText(id, trial.params))}<br><span class="mono">${readingsText(trial.measurements)}</span></td>${report ? '' : `<td><button data-action="restore" data-index="${index}">恢复参数</button></td>`}</tr>`).join('')}</tbody></table></div>`;
  }
  function recordsPage(){
const data=R.data,courseId=route.course||'L1',ids=L.courseIds(courseId),c=L.courses.find(c=>c.id===courseId);
return recordTabs(courseId)+'<div class="page-heading"><div class="eyebrow">YOUR LAB NOTEBOOK</div><h1>我的实验记录</h1><p>'+e(c.name)+' · JSON 包含三次实验全部记录；打印仅包含当前实验。</p></div><section class="panel"><div class="panel-head"><h2>个人信息</h2><span class="eyebrow">COURSEMATE ACCOUNT</span></div><div class="panel-body student-grid">'+[['name','姓名'],['number','登录账号'],['classroom','班级']].map(([key,label])=>'<label for="student-'+key+'">'+label+'<input class="input" id="student-'+key+'" data-student="'+key+'" maxlength="100" value="'+e(data.student[key])+'"></label>').join('')+'</div></section><section class="record-summary">'+ids.map(id=>{const r=data.tasks[id],missing=R.missing(id);return'<article class="summary-card"><span>'+id+' / 45 MIN</span><h3>'+e(L.tasks[id].title)+'</h3><p>'+r.trials.length+' 次试验 · '+r.revisions.length+' 次修订</p><p class="inline-status">'+(r.completion.confirmed?'✓ 已自查完成':missing.length?'待补：'+e(missing.join('、')):'待确认完成')+'</p><a href="#task/'+id+'">查看并继续 →</a></article>';}).join('')+'</section><div class="record-tools">'+button('下载全部记录 JSON','export','primary','download')+button('导入记录 JSON','import','','upload')+button('打印当前实验报告 / PDF','print','','print')+button('清空全部记录','clear','danger')+'</div><div class="notice">记录同步到当前登录账号，请检查顶部保存状态并定期下载 JSON。支持导入 0.1.0 实验一旧记录并迁移为三次实验格式。打印报告保留未填写项与学生模板，不自动填写标准答案。</div>'+ids.map(id=>{const t=data.tasks[id];return'<section class="records-detail"><h2>'+id+' '+e(L.tasks[id].title)+'</h2><h3>初始预测</h3><p>'+e(t.prediction||'未保存')+'</p>'+t.revisions.map((v,i)=>'<h3>修订 '+(i+1)+'</h3><p>'+e(v.text)+'</p>').join('')+'<h3>推导与分析</h3><p>'+e(t.derivation||'未填写')+'</p><p>'+e(t.analysis||'未填写')+'</p><h3>试验记录</h3>'+trialTable(id,true)+'</section>';}).join('');
}
  function helpPage() {
    return `<div class="page-heading"><div class="eyebrow">A SMALL GUIDE TO YOUR LAB</div><h1>准备好，开始探索。</h1><p>本实验室已接入 CourseMate，使用当前登录账号。当前开放三次实验的全部十二个任务。</p></div><div class="help-grid"><section class="panel"><div class="panel-body"><h2>01 / 开始使用</h2><ol><li>登录 CourseMate 后，从学习实验室进入三次完整实验。</li><li>在“我的实验记录”核对账号身份并填写班级。</li><li>进入所选实验，先保存预测，再通过参数滑块或精确输入探索。</li><li>点击图形设置游标，聚焦图形后用左右方向键微调。</li><li>卷积支持播放、暂停、单步和精确输入时刻。</li></ol></div></section><section class="panel"><div class="panel-body"><h2>02 / 保存与提交</h2><ol><li>“保存本次试验”记录参数、读数、图形快照与本机时间。</li><li>修改预测时点“保存预测修订”，原稿会继续保留。</li><li>任务结束后填写分析，检查并确认本任务完成。</li><li>每小节检查顶部保存状态，并下载 JSON 备份。</li><li>在记录页打印报告，选择“另存为 PDF”，连同 JSON 提交。</li></ol></div></section><section class="panel"><div class="panel-body"><h2>03 / 怎样读图</h2><p>时间以秒计，幅度默认归一化。所有曲线同时使用颜色和线型区分。滑块影响当前参数，历史试验不会被删除。</p><p style="margin-top:12px">卷积上图横轴为积分变量 τ，下图横轴为输出时刻 t。指数响应的显示窗口有限，t&gt;5 s 的衰减尾部未全部展示，不能据此认为输出变为零。</p><p style="margin-top:12px">数学约定和完整操作任务参见 <a href="学生实验指导书.md" download>学生实验指导书</a>。</p></div></section><section class="panel"><div class="panel-body"><h2>04 / 关于记录与反馈</h2><p>曲线在本机计算，实验记录同步到当前 CourseMate 账号。请在离开前确认顶部已保存。自动比较用于帮助你发现差异，实验评价由教师结合过程证据进行。</p><p style="margin-top:12px">“确认完成”检查已保存的预测、试验与分析；你仍需按每项任务的成果要求，补齐比较表和解释。任务时长为建议安排，页面没有观看时长考核。</p><p style="margin-top:12px">网络异常时保留当前页面并重试保存，也可下载 JSON 备份。清空记录前会要求确认，参数重置仅恢复参数。</p></div></section></div>`;
  }
  function render() {
    stopAnimation(); route = readRoute(); cursor = null; hints = 0;
    document.getElementById('shell').innerHTML = shell(route.page === 'home' ? home() : route.page === 'course' ? coursePage(route.id) : route.page === 'task' ? taskPage(route.id) : route.page === 'records' ? recordsPage() : helpPage());
    document.title = (route.page === 'task' ? route.id + ' ' + L.tasks[route.id].title : route.page === 'records' ? '我的实验记录' : '信号与系统') + ' · 信号实验室';
    if (route.page === 'task') { syncControls(); updateScene(); updateTrials(); }
    window.scrollTo(0, 0);
  }
  function updateCompletion() {
    const el = document.getElementById('completion-status');
    if (!el) return;
    const missing = R.missing(route.id), task = R.data.tasks[route.id];
    el.textContent = task.completion.confirmed ? '已自查完成。请下载 JSON，继续下一项任务。' : missing.length ? '还需：' + missing.join('、') : '基础证据已齐，请按右侧成果要求自查后确认。';
    const button = document.querySelector('[data-action="complete"]');
    if (button) button.innerHTML = icon('check') + (task.completion.confirmed ? '已确认完成 · 可重新确认' : '检查并确认本任务完成');
    document.querySelector('.task-tab.active')?.classList.toggle('done', task.completion.confirmed);
  }
  function syncControls() {
    const p = R.data.tasks[route.id].params;
    document.querySelectorAll('[data-param], [data-range]').forEach(el => { el.value = p[el.dataset.param || el.dataset.range]; el.removeAttribute('aria-invalid'); });
    document.querySelectorAll('[data-param-wrap]').forEach(el => {
      const k = el.dataset.paramWrap;
      el.dataset.inactive = String(route.id === 'L1-1' && (p.mode === 'impulse' ? ['A', 'a', 'shift'].includes(k) : k === 'delta') || route.id === 'L1-2' && (p.test === 'invariance' ? ['x2', 'alpha', 'beta'].includes(k) : k === 'delay') || route.id === 'L3-1' && (k === 'a' && p.mode !== 'exp' || k === 'T' && p.mode === 'exp' || k === 'start' && p.mode !== 'delayed'));
    });
  }
  function updateScene() {
    const delayAnswer = document.getElementById('answer-delay2');
    if(delayAnswer) delayAnswer.closest('label').hidden = ['exp','step'].includes(R.data.tasks[route.id].params.mode);
    if (route.page !== 'task') return;
    currentScene = L.scene(route.id, R.data.tasks[route.id].params, R.data.tasks[route.id].answers);
    const scene = currentScene;
    const selectedPlot = scene.plots.find(p => p.key === cursorChart);
    if (!selectedPlot || cursor < selectedPlot.range[0] || cursor > selectedPlot.range[1]) cursor = null;
    document.getElementById('scene').innerHTML = `<div class="formula-bar">${mathFormula(scene.formula)}</div>${scene.plots.map((p, i) => `<div class="plot-wrap${i ? ' plot-divider' : ''}"><div class="plot-title">${e(p.title)}<span>${p.xUnit === 'Hz' ? 'f / Hz' : p.key === 'overlap' ? 'τ / s' : 't / s'}</span></div>${L.plot.svg(p, route.id, p.marker != null ? p.marker : p.key === cursorChart ? cursor : null)}</div>`).join('')}<div class="plot-tip">点击曲线区域读取游标 · 图形获得焦点后按 ← / → 微调（Shift 加速）</div><div id="cursor-readout" class="cursor-readout"></div><div class="metric-grid">${scene.metrics.map(m => `<div class="metric"><label>${e(m.label)}</label><b>${e(m.value)}</b><small>${e(m.unit)}</small></div>`).join('')}</div><div class="scene-note">${e(scene.note)}</div>`;
    updateCursorText();
    renderAnswerFeedback();
  }
  function mathFormula(fallback) {
    const p = R.data.tasks[route.id].params;
    let markup;
    if (route.id === 'L1-1' && p.mode === 'impulse') markup = '<msub><mi>q</mi><mi>Δ</mi></msub><mo>(</mo><mi>t</mi><mo>)</mo><mo>=</mo><mo>{</mo><mtable columnalign="left"><mtr><mtd><mfrac><mn>1</mn><mi>Δ</mi></mfrac></mtd><mtd><mn>0</mn><mo>≤</mo><mi>t</mi><mo>&lt;</mo><mi>Δ</mi></mtd></mtr><mtr><mtd><mn>0</mn></mtd><mtd><mtext>其他</mtext></mtd></mtr></mtable>';
    else if (route.id === 'L1-1') markup = `<mn>${e(f(p.A))}</mn><mo>·</mo><mi>p</mi><mo>(</mo><mn>${e(f(p.a))}</mn><mo>(</mo><mi>t</mi><mo>−</mo><mo>(</mo><mn>${e(f(p.shift))}</mn><mo>)</mo><mo>)</mo><mo>)</mo>`;
    else if (route.id === 'L1-3') markup = `<msup><mi>y</mi><mo>′</mo></msup><mo>(</mo><mi>t</mi><mo>)</mo><mo>+</mo><mi>y</mi><mo>(</mo><mi>t</mi><mo>)</mo><mo>=</mo><mi>x</mi><mo>(</mo><mi>t</mi><mo>)</mo><mo>;</mo><mspace width="1em"/><mi>y</mi><mo>(</mo><msup><mn>0</mn><mo>−</mo></msup><mo>)</mo><mo>=</mo><mn>${e(f(p.initial))}</mn>`;
    else if (route.id === 'L1-4') markup = `<mi>y</mi><mo>(</mo><mi>t</mi><mo>)</mo><mo>=</mo><msubsup><mo>∫</mo><mrow><mo>−</mo><mo>∞</mo></mrow><mo>∞</mo></msubsup><mi>r</mi><mo>(</mo><mi>τ</mi><mo>)</mo><mo>·</mo><mi>${p.kind === 'rr' ? 'r' : 'h'}</mi><mo>(</mo><mi>t</mi><mo>−</mo><mi>τ</mi><mo>)</mo><mspace width=".3em"/><mi mathvariant="normal">d</mi><mi>τ</mi>`;
    return markup ? `<math xmlns="http://www.w3.org/1998/Math/MathML" aria-label="${e(fallback)}"><mrow>${markup}</mrow></math>` : e(fallback);
  }
  function cursorReading() {
    const chart = currentScene?.plots.find(p => p.key === cursorChart);
    if (cursor == null || !chart) return null;
    return { chart: chart.title, unit: chart.xUnit || 's', variable: chart.xUnit === 'Hz' ? 'f' : chart.key === 'overlap' ? 'τ' : 't', t: cursor, values: chart.series.map(s => ({ label: s.label, value: L.plot.read(s, cursor, chart.breakJump) })) };
  }
  function updateCursorText() {
    const el = document.getElementById('cursor-readout');
    if (!el) return;
    const c = cursorReading();
    el.textContent = c ? `${c.chart}: ${c.variable}=${f(c.t, 4)} ${c.unit}　` + c.values.map(v => v.label + '=' + (v.value===null?'不适用':f(v.value, 6))).join('　') : '尚未设置游标 · 点击图形读取数值';
  }
  function updateTrials() {
    document.getElementById('trials').innerHTML = trialTable(route.id);
    document.getElementById('trial-count').textContent = R.data.tasks[route.id].trials.length + ' 次试验';
    updateCompletion();
  }
  function setParams(partial) {
    const rec = R.data.tasks[route.id], next = { ...rec.params, ...partial };
    if (!L.validParams(route.id, next)) {
      const invalid = L.tasks[route.id].params.find(p => p.type === 'number' && (!Number.isFinite(next[p.key]) || next[p.key] < p.min || next[p.key] > p.max || route.id === 'L1-1' && p.key === 'a' && Math.abs(next.a) < 0.25));
      throw new Error(invalid ? route.id === 'L1-1' && invalid.key === 'a' ? '尺度 a 的绝对值必须在 0.25–4 之间，且不能为 0。' : invalid.label + '必须是 ' + invalid.min + ' 至 ' + invalid.max + ' 范围内的有限数值。' : '请选择列表中的有效参数。');
    }
    rec.params = next; R.save(); syncControls(); updateScene();
  }
  function stopAnimation() {
    if (animation != null) cancelAnimationFrame(animation);
    animation = null; previousFrame = 0;
    const b = document.querySelector('[data-action="play"]');
    if (b) b.innerHTML = icon('play') + '播放';
  }
  function play() {
    if (animation != null) { stopAnimation(); R.save(); return; }
    const params = R.data.tasks[route.id].params;
    if (params.time >= 5) params.time = -1;
    document.querySelector('[data-action="play"]').innerHTML = icon('pause') + '暂停';
    const frame = timestamp => {
      if (!previousFrame) previousFrame = timestamp;
      if (timestamp - previousFrame >= 45) {
        params.time = Math.min(5, Number((params.time + Math.min((timestamp - previousFrame) / 1000, 0.15) * params.speed).toFixed(3)));
        previousFrame = timestamp; syncControls(); updateScene();
      }
      if (params.time >= 5) { stopAnimation(); R.save(); } else animation = requestAnimationFrame(frame);
    };
    animation = requestAnimationFrame(frame);
  }
  async function exportPNG() {
    stopAnimation();
    const id = route.id, rec = R.data.tasks[id], scene = L.scene(id, rec.params, rec.answers);
    const paramLines = (paramsText(id, rec.params)+(scene.studentExpression?'；'+scene.studentExpression:'')).match(/.{1,66}/g) || [];
    const height = 110 + paramLines.length * 20 + scene.plots.length * 335 + 50;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><rect width="1200" height="${height}" fill="#fffefa"/><g font-family="Microsoft YaHei,sans-serif" fill="#29382f"><text x="45" y="42" font-size="24">${e(id + ' ' + L.tasks[id].title)}</text><text x="45" y="70" font-size="14">CS3017 · v${L.version} · ${e(time(new Date().toISOString()))}</text>${paramLines.map((line, i) => `<text x="45" y="${100 + i * 20}" font-size="13">${e(line)}</text>`).join('')}</g>`;
    scene.plots.forEach((p, i) => {
      const y = 115 + paramLines.length * 20 + i * 335;
      svg += `<text x="45" y="${y}" font-family="Microsoft YaHei,sans-serif" font-size="16" fill="#29382f">${e(p.title)}</text>` + L.plot.svg(p, id, p.marker ?? (p.key === cursorChart ? cursor : null), true).replace('<svg ', `<svg x="25" y="${y + 10}" width="1150" height="310" `);
    });
    svg += `<text x="45" y="${height - 20}" font-family="Microsoft YaHei,sans-serif" font-size="12" fill="#68765b">坐标单位见各图标注：s / Hz / rad / °；全部计算在本机完成。</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('图形生成失败，请重试。')); img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('浏览器无法生成 PNG。');
      R.download(blob, R.filename('.png', id)); notify('图形已导出，包含任务编号、参数、坐标与单位。');
    } finally { URL.revokeObjectURL(url); }
  }
  function printReport(){
stopAnimation();R.save();const courseId=route.course||'L1',ids=L.courseIds(courseId),course=L.courses.find(c=>c.id===courseId),d=R.data,el=document.getElementById('print-report');
el.innerHTML='<h1>信号与系统 · 实验 '+course.number+' 报告</h1><p>'+e(course.name)+'</p><p>姓名：'+e(d.student.name||'未填写')+'　登录账号：'+e(d.student.number||'未填写')+'　班级：'+e(d.student.classroom||'未填写')+'</p><p class="report-stamp">CS3017 / v'+e(d.appVersion)+' / schema '+d.schemaVersion+' / '+e(time(new Date().toISOString()))+'</p><div class="report-warning">本报告保留学生预测、模板和未完成项。状态为学生自查，教师根据具体过程评价。</div><table><thead><tr><th>任务</th><th>试验数</th><th>自查情况</th></tr></thead><tbody>'+ids.map(id=>'<tr><td>'+id+' '+e(L.tasks[id].title)+'</td><td>'+d.tasks[id].trials.length+'</td><td>'+e(d.tasks[id].completion.confirmed?'已确认完成':R.missing(id).join('；')||'待确认')+'</td></tr>').join('')+'</tbody></table>'+ids.map(id=>{const t=d.tasks[id];return'<section class="report-task"><h2>'+id+' '+e(L.tasks[id].title)+'</h2><h3>初始预测</h3><p>'+e(t.prediction||'未保存')+'</p>'+(t.predictionDraft.trim()&&t.predictionDraft.trim()!==(t.revisions.at(-1)?.text||t.prediction)?'<h3>尚未保存为正式预测的草稿</h3><p>'+e(t.predictionDraft)+'</p>':'')+t.revisions.map((v,i)=>'<h3>修订 '+(i+1)+' · '+e(time(v.time))+'</h3><p>'+e(v.text)+'</p>').join('')+'<h3>推导与判定</h3><p>'+e(t.derivation||'未填写')+'</p><h3>参数、模板与测量</h3>'+trialTable(id,true)+'<div class="report-ending"><h3>分析与解释</h3><p>'+e(t.analysis||'未填写')+'</p><h3>自查</h3><p>'+e(t.completion.confirmed?'已确认完成':R.missing(id).join('；')||'待确认')+'</p></div>'+'<h3>图形</h3>'+(t.figures.length?t.figures.map((v,i)=>{const scene=L.scene(id,v.params,v.answers);return'<div class="report-figure"><p>试验 '+(i+1)+' · '+e(time(v.time))+'<br>'+e(paramsText(id,v.params))+'</p>'+(scene.studentExpression?'<p>'+e(scene.studentExpression)+'</p>':'')+scene.plots.map(p=>'<div class="report-plot"><h4>'+e(p.title)+'</h4>'+L.plot.svg(p,id,p.marker,true)+'</div>').join('')+'</div>';}).join(''):'<p>未保存图形</p>')+'</section>';}).join('');
document.title=R.filename('','实验'+Number(course.number));window.print();
}
  document.addEventListener('click', async event => {
    const preset = event.target.closest('[data-preset]');
    if (preset) { stopAnimation(); try { setParams(JSON.parse(preset.dataset.preset)); } catch (err) { notify(err.message, true); } return; }
    const chart = event.target.closest('[data-chart]');
    if (chart) {
      const bounds = chart.getBoundingClientRect(), p = currentScene.plots.find(p => p.key === chart.dataset.chart);
      const position = (event.clientX - bounds.left) / bounds.width * 900;
      cursor = Math.max(p.range[0], Math.min(p.range[1], p.range[0] + (position - 62) / 815 * (p.range[1] - p.range[0])));
      cursorChart = p.key; updateScene(); document.querySelector(`[data-chart="${cursorChart}"]`)?.focus({ preventScroll: true }); return;
    }
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    try {
      if (action === 'import') document.getElementById('import-file').click();
      else if (action === 'export') { R.export(); notify('已下载记录 JSON，请妥善保存。'); }
      else if (action === 'print') printReport();
      else if (action === 'clear') {
        if (window.confirm('将清空本页全部学生信息、预测、试验与分析，已下载文件不受影响。建议先导出 JSON。确定清空当前记录吗？')) { R.clear(); render(); notify('当前记录已清空。'); }
      } else if (route.page === 'task') {
        if (action === 'prediction') { R.prediction(route.id); document.getElementById('prediction-history').innerHTML = predictionHistory(route.id); document.querySelector('[data-action="prediction"]').textContent = '保存预测修订'; updateCompletion(); notify('预测已保存，原稿会继续保留。'); }
        if (action === 'reset') { stopAnimation(); setParams(L.defaults(route.id)); notify('参数已重置，历史记录保留。'); }
        if (action === 'trial') { stopAnimation(); const scene = L.scene(route.id, R.data.tasks[route.id].params, R.data.tasks[route.id].answers); scene.readings.cursor = cursorReading(); R.trial(route.id, scene, cursor); updateTrials(); notify('已保存试验参数、测量结果与图形快照。'); }
        if (action === 'png') await exportPNG();
        if (action === 'hint') { hints = Math.min(3, hints + 1); document.getElementById('hints').innerHTML = '<ol>' + L.tasks[route.id].hints.slice(0, hints).map(h => '<li>' + e(h) + '</li>').join('') + '</ol>'; if (hints === 3) el.disabled = true; }
        if (action === 'restore') { stopAnimation(); const saved=R.data.tasks[route.id].trials[Number(el.dataset.index)]; R.data.tasks[route.id].answers={...L.defaultAnswers(route.id),...saved.answers}; document.querySelectorAll('[data-answer]').forEach(input=>{input.value=R.data.tasks[route.id].answers[input.dataset.answer]||'';}); setParams(saved.params); notify('已恢复这次试验的参数。'); }
        if (action === 'play') play();
        if (action === 'step') { stopAnimation(); setParams({ time: Math.min(5, Number((R.data.tasks[route.id].params.time + 0.05).toFixed(3))) }); }
        if (action === 'complete') {
          const missing = R.missing(route.id); if (missing.length) throw new Error('请先完成：' + missing.join('、') + '。');
          if (!window.confirm('请核对右侧“本任务成果”，确认各组比较和解释已经齐全。确认将标记为学生自查完成，教师仍会检查具体成果。')) return;
          R.data.tasks[route.id].completion = { confirmed: true, confirmedAt: new Date().toISOString() }; R.save(); updateCompletion(); el.textContent = '已确认完成 · 可重新确认'; document.querySelector('.task-tab.active')?.classList.add('done'); notify('已确认完成，请下载 JSON 备份。');
        }
      }
    } catch (err) { notify(err.message || '操作未完成，请重试。', true); }
  });
  document.addEventListener('input', event => {
    const el = event.target;
    if (el.dataset.student) { R.data.student[el.dataset.student] = el.value; R.save(); return; }
    if (route.page !== 'task') return;
    const rec = R.data.tasks[route.id];
    if (el.dataset.answer) {
      const next = { ...rec.answers, [el.dataset.answer]: el.value };
      if (!L.validAnswers(route.id, next)) { el.setAttribute('aria-invalid','true'); notify('模板只接受 −100 至 100 的有限数值；尚未保存该输入。',true); return; }
      el.removeAttribute('aria-invalid'); rec.answers = next; rec.completion = { confirmed:false, confirmedAt:null }; R.save(); updateScene(); updateCompletion(); return;
    }
    if (['prediction', 'analysis', 'derivation'].includes(el.id)) {
      rec[el.id === 'prediction' ? 'predictionDraft' : el.id] = el.value;
      rec.completion = { confirmed: false, confirmedAt: null }; R.save(); updateCompletion(); return;
    }
    if (el.dataset.range) {
      stopAnimation();
      const key = el.dataset.range; let value = Number(el.value);
      if (route.id === 'L1-1' && key === 'a' && Math.abs(value) < 0.25) value = rec.params.a > 0 ? -0.25 : 0.25;
      try { setParams({ [key]: value }); } catch (err) { notify(err.message, true); }
    }
  });
  document.addEventListener('change', event => {
    const el = event.target;
    if (!el.dataset.param || route.page !== 'task') return;
    stopAnimation();
    const key = el.dataset.param, spec = L.tasks[route.id].params.find(p => p.key === key);
    const value = spec.type === 'number' ? el.value.trim() ? Number(el.value) : NaN : el.value;
    try { setParams({ [key]: value }); }
    catch (err) { el.setAttribute('aria-invalid', 'true'); notify(err.message + ' 已保留上一次有效参数。', true); }
  });
  document.addEventListener('keydown', event => {
    const el = event.target.closest('[data-chart]');
    if (!el || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const p = currentScene.plots.find(p => p.key === el.dataset.chart);
    const step = (p.range[1] - p.range[0]) / 1000 * (event.shiftKey ? 10 : 1);
    cursorChart = p.key;
    cursor = Math.max(p.range[0], Math.min(p.range[1], (cursor ?? (p.range[0] + p.range[1]) / 2) + (event.key === 'ArrowRight' ? step : -step)));
    updateScene(); document.querySelector(`[data-chart="${cursorChart}"]`)?.focus({ preventScroll: true });
  });
  document.getElementById('import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('文件超过 20 MB，请选择本实验室导出的 JSON。当前记录未被修改。');
      const text = await file.text(); let raw;
      try { raw = JSON.parse(text); } catch (err) { throw new Error('无法解析 JSON。当前记录未被修改。'); }
      R.validate(raw);
      const hasWork = ids.some(id => { const t = R.data.tasks[id]; return t.predictionDraft || t.prediction || t.trials.length || t.analysis || t.derivation; }) || Object.values(R.data.student).some(Boolean);
      if (hasWork && !window.confirm('导入会替换当前全部记录。请确认已下载当前 JSON 备份。继续导入？')) return;
      stopAnimation(); R.import(raw); render(); notify('记录已导入，参数、预测、试验和分析已恢复。');
    } catch (err) { notify(err.message, true); }
    finally { event.target.value = ''; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopAnimation(); R.save(); } });
  window.addEventListener('pagehide', () => { stopAnimation(); R.save(); });
  window.addEventListener('hashchange', render);
  window.addEventListener('afterprint', () => { document.title = '信号与系统 · 信号实验室'; });
  render();
  if (R.recoveryWarning) notify(R.recoveryWarning, true);
})();
