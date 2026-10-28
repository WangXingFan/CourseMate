export const PYTHON_SANDBOX_HTML = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net; worker-src blob:; connect-src https://cdn.jsdelivr.net; img-src data: blob:; style-src 'unsafe-inline'"><script>
let worker;
let workerSource = "";
let files = {};
let port;
let ready = false;
let running = false;
let runTimer;
let workerURL;

function publish(message) {
  port?.postMessage(message);
}

function stopWorker() {
  clearTimeout(runTimer);
  worker?.terminate();
  worker = undefined;
  ready = false;
  running = false;
  if (workerURL) URL.revokeObjectURL(workerURL);
  workerURL = undefined;
}

function startWorker() {
  stopWorker();
  workerURL = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
  worker = new Worker(workerURL);
  worker.onmessage = event => {
    const message = event.data;
    if (message.type === "status" && message.message === "ready") ready = true;
    if (message.type === "status" && message.message === "executing" && running) {
      runTimer = setTimeout(() => {
        stopWorker();
        publish({ type: "error", error: "代码运行超过 30 秒，运行环境已重启。" });
        startWorker();
      }, 30000);
    }
    if (message.type === "result" || message.type === "error") {
      const shouldRestart = running;
      clearTimeout(runTimer);
      running = false;
      if (message.type === "error") {
        publish(message);
        if (shouldRestart) startWorker();
        return;
      }
    }
    publish(message);
  };
  worker.onerror = event => {
    const shouldRestart = running;
    stopWorker();
    publish({ type: "error", error: event.message || "Python worker failed." });
    if (shouldRestart) startWorker();
  };
  worker.postMessage({ type: "init", files });
}

function handleCommand(event) {
  const message = event.data;
  if (message?.type === "init") {
    workerSource = message.workerSource;
    files = message.files || {};
    startWorker();
    return;
  }
  if (message?.type === "run" && ready && !running) {
    running = true;
    worker.postMessage(message);
  }
}

addEventListener("message", event => {
  if (event.source !== parent || event.data?.type !== "connect" || event.ports.length !== 1) return;
  port?.close();
  port = event.ports[0];
  port.onmessage = handleCommand;
  port.start();
});
</script>`;
