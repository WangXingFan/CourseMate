const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.29.1/full/";
let pyodidePromise;
let scientificPackagesPromise;

async function getRuntime() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      self.postMessage({ type: "status", message: "loading_runtime_script" });
      importScripts(`${PYODIDE_BASE}pyodide.js`);
      self.postMessage({ type: "status", message: "loading_runtime_core" });
      const runtime = await loadPyodide({ indexURL: PYODIDE_BASE });
      self.postMessage({ type: "status", message: "loading_numpy" });
      await runtime.loadPackage(["numpy"]);
      return runtime;
    })();
  }
  return pyodidePromise;
}

async function loadScientificPackages(runtime) {
  if (!scientificPackagesPromise) {
    self.postMessage({ type: "status", message: "loading_packages" });
    scientificPackagesPromise = (async () => {
      await runtime.loadPackage(["scipy", "matplotlib"]);
      runtime.runPython(`
import sys
sys.path.insert(0, "/home/pyodide")
import matplotlib
matplotlib.use("Agg")
`);
    })();
  }
  return scientificPackagesPromise;
}

self.onmessage = async (event) => {
  if (event.data?.type !== "init" && event.data?.type !== "run") return;
  try {
    if (event.data.type === "init") self.postMessage({ type: "status", message: "loading" });
    const runtime = await getRuntime();
    if (event.data.type === "init") {
      for (const [fileName, contents] of Object.entries(event.data.files ?? {})) {
        runtime.FS.writeFile(`/home/pyodide/${fileName}`, contents);
      }
      self.postMessage({ type: "status", message: "ready" });
      return;
    }
    await loadScientificPackages(runtime);
    self.postMessage({ type: "status", message: "executing" });
    runtime.globals.set("_cm_source", event.data.code);
    runtime.globals.set("_cm_task_id", event.data.taskID);
    const encoded = await runtime.runPythonAsync(`
import base64
import contextlib
import io
import json
import traceback
import numpy as np
import matplotlib.pyplot as plt

plt.close("all")
_cm_stdout = io.StringIO()
_cm_stderr = ""
_cm_plots = []
_cm_namespace = {"__name__": "__main__"}
try:
    with contextlib.redirect_stdout(_cm_stdout):
        exec(compile(_cm_source, "<python-resource>", "exec"), _cm_namespace)
        if not plt.get_fignums():
            _cm_time = _cm_namespace.get("t")
            if _cm_time is not None:
                _cm_time = np.asarray(_cm_time)
                _cm_plotted = 0
                for _cm_name, _cm_value in list(_cm_namespace.items()):
                    if _cm_name.startswith("_") or _cm_name in {"t", "np", "plt"}:
                        continue
                    try:
                        _cm_array = np.asarray(_cm_value)
                        if _cm_array.ndim == 1 and len(_cm_array) == len(_cm_time) and np.issubdtype(_cm_array.dtype, np.number):
                            plt.plot(_cm_time, _cm_array, label=_cm_name)
                            _cm_plotted += 1
                            if _cm_plotted == 4:
                                break
                    except Exception:
                        pass
                if _cm_plotted:
                    plt.xlabel("t (s)")
                    plt.legend()
    for _cm_number in plt.get_fignums():
        if len(_cm_plots) == 4:
            break
        _cm_figure = plt.figure(_cm_number)
        _cm_dpi = min(100, 1200 / max(_cm_figure.get_size_inches()))
        for _cm_attempt in range(8):
            _cm_buffer = io.BytesIO()
            _cm_figure.savefig(_cm_buffer, format="png", dpi=_cm_dpi, bbox_inches="tight")
            _cm_image = base64.b64encode(_cm_buffer.getvalue()).decode("ascii")
            if len(_cm_image) <= 262144:
                break
            _cm_dpi *= 0.7
        if len(_cm_image) > 262144:
            raise ValueError("Plot is too large. Reduce the figure size or plotted data.")
        _cm_plots.append(_cm_image)
except Exception:
    _cm_stderr = traceback.format_exc()
finally:
    plt.close("all")
json.dumps({"stdout": _cm_stdout.getvalue()[:12000], "stderr": _cm_stderr[:12000], "plots": _cm_plots})
`);
    self.postMessage({ type: "result", result: JSON.parse(encoded) });
  } catch (error) {
    self.postMessage({ type: "error", error: error instanceof Error ? error.message : String(error) });
  }
};
