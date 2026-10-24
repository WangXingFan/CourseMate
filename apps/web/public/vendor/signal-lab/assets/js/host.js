(function () {
  'use strict';
  if (window.parent === window) return;
  let parentOrigin;
  try { parentOrigin = new URL(document.referrer).origin; } catch { return; }
  let nonce = '', identity = null, initialized = false;
  const R = window.SignalLab.records;
  const send = (type, extra = {}) => window.parent.postMessage({ channel: 'coursemate-lab', type, nonce, ...extra }, parentOrigin);
  const lockIdentity = () => {
    if (!identity) return;
    R.data.student.name = identity.name;
    R.data.student.number = identity.number;
    for (const [id, value] of [['student-name', identity.name], ['student-number', identity.number]]) {
      const input = document.getElementById(id);
      if (input) { input.value = value; input.readOnly = true; input.title = '来自当前 课知伴 登录账号'; }
    }
  };
  window.addEventListener('coursemate-lab-change', () => {
    if (!initialized) return;
    lockIdentity();
    send('change', { document: JSON.stringify(R.data) });
  });
  new MutationObserver(lockIdentity).observe(document.getElementById('shell'), { childList: true, subtree: true });
  window.addEventListener('message', event => {
    const msg = event.data;
    if (event.source !== window.parent || event.origin !== parentOrigin || !msg || msg.channel !== 'coursemate-lab') return;
    if (msg.type === 'init' && !initialized && typeof msg.nonce === 'string' && msg.identity &&
        typeof msg.identity.name === 'string' && typeof msg.identity.number === 'string') {
      nonce = msg.nonce;
      try {
        if (msg.document) R.import(JSON.parse(msg.document));
        identity = { name: msg.identity.name.slice(0, 100), number: msg.identity.number.slice(0, 100) };
        lockIdentity();
        initialized = true;
        const script = document.createElement('script');
        script.src = 'assets/js/app.js';
        script.onload = () => { lockIdentity(); send('loaded', { document: JSON.stringify(R.data) }); };
        script.onerror = () => send('error');
        document.head.append(script);
      } catch (error) {
        send('error', { message: String(error) });
      }
    }
    if (initialized && msg.nonce === nonce && msg.type === 'navigate' && typeof msg.route === 'string' &&
        /^(home|help|course\/L[123]|records\/L[123]|task\/L[123]-[1-4])$/.test(msg.route)) {
      window.location.hash = msg.route;
    }
  });
  send('ready');
})();
