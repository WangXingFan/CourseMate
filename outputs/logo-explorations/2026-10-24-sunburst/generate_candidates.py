"""Run the installed ImageGen CLI for each saved prompt; never stores credentials."""

import argparse
import concurrent.futures
import json
import struct
import subprocess
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SPEC = json.loads((ROOT / "prompts.json").read_text(encoding="utf-8"))
STATUS_PATH = ROOT / "generation-status.json"
LOCK = threading.Lock()


def inspect_png(path):
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n") or len(data) < 33:
        raise ValueError("Output is not a valid PNG header")
    width, height = struct.unpack(">II", data[16:24])
    return {"width": width, "height": height, "bytes": len(data)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cli", required=True, type=Path)
    parser.add_argument("--workers", default=2, type=int)
    parser.add_argument("--only", nargs="*")
    args = parser.parse_args()
    if not args.cli.is_file():
        raise SystemExit("Installed ImageGen CLI not found")
    previous = {}
    if STATUS_PATH.exists():
        previous = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
    status = previous.get("results", {})

    def save_status():
        payload = {
            "project": SPEC["project"],
            "requested_model": SPEC["requested_model"],
            "mode": "installed gpt-imagegen CLI via configured Images API",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "results": status,
        }
        temporary = STATUS_PATH.with_suffix(".tmp")
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(STATUS_PATH)

    def run(concept):
        output = ROOT / concept["filename"]
        identifier = concept["id"]
        if output.exists():
            info = inspect_png(output)
            with LOCK:
                status[identifier] = {"state": "complete", "filename": output.name,
                                      "model_argument": SPEC["requested_model"], **info}
                save_status()
            print(f"[{identifier}] Already saved: {output.name}", flush=True)
            return True
        print(f"[{identifier}] Generating {concept['english_name']} with {SPEC['requested_model']}", flush=True)
        command = [
            sys.executable, str(args.cli),
            "--model", SPEC["requested_model"],
            "--prompt", concept["prompt"],
            "--output", str(output),
            "--size", SPEC["size"],
            "--quality", SPEC["quality"],
            "--output-format", "png",
            "--raw-prompt", "--fictional-watermark", "never",
            "--no-stream", "--timeout", "300",
            "--retries", "1", "--retry-delay", "5",
        ]
        try:
            result = subprocess.run(command, capture_output=True, text=True,
                                    encoding="utf-8", errors="replace", timeout=680)
            if result.returncode:
                detail = result.stderr.strip() or result.stdout.strip()
                raise RuntimeError(detail[-1800:])
            info = inspect_png(output)
            with LOCK:
                status[identifier] = {"state": "complete", "filename": output.name,
                                      "model_argument": SPEC["requested_model"], **info}
                save_status()
            print(f"[{identifier}] Saved {output.name}: {info['width']}x{info['height']}, {info['bytes']} bytes", flush=True)
            return True
        except Exception as error:
            with LOCK:
                status[identifier] = {"state": "failed", "filename": output.name,
                                      "model_argument": SPEC["requested_model"], "error": str(error)}
                save_status()
            print(f"[{identifier}] Failed: {error}", flush=True)
            return False

    selected = [c for c in SPEC["concepts"] if not args.only or c["id"] in args.only]
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 3))) as pool:
        results = list(pool.map(run, selected))
    print(f"Finished: {sum(results)}/{len(selected)} selected concepts saved.", flush=True)
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
