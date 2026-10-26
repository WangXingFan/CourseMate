"""Build student notebooks and a reproducible ZIP from the published Python sources."""

import argparse
import io
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "apps/web/public/learning/python"
STEMS = ("lab1_time_domain", "lab2_frequency", "lab3_laplace")


def notebook(source):
    cells = []
    for section in re.split(r"(?m)^# %%", source)[1:]:
        marker, _, body = section.partition("\n")
        markdown = marker.strip() == "[markdown]"
        if markdown:
            body = "\n".join(re.sub(r"^# ?", "", line) for line in body.splitlines())
        cell = {"cell_type": "markdown" if markdown else "code", "metadata": {},
                "source": (body.strip() + "\n").splitlines(keepends=True)}
        if not markdown:
            cell.update(execution_count=None, outputs=[])
        cells.append(cell)
        if markdown and re.search(r"## L[123]-[1-4]", body):
            cells.append({"cell_type": "markdown", "metadata": {}, "source": [
                "### 我的记录 / My record\n", "- 预测 / Prediction：\n", "- 代码修改与参数 / Edits and parameters：\n",
                "- 测量、单位、步长与窗口 / Measurements, units, step and window：\n",
                "- 与工作台的比较及解释 / Comparison and explanation：\n"]})
    return (json.dumps({"cells": cells, "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.11"}}, "nbformat": 4, "nbformat_minor": 4},
        ensure_ascii=False, indent=2) + "\n").encode()


def artifacts():
    generated = {}
    for stem in STEMS:
        generated[f"{stem}.ipynb"] = notebook((ROOT / f"{stem}.py").read_text(encoding="utf-8"))
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in ["README.md", "requirements.txt", *[f"{stem}.py" for stem in STEMS], *generated]:
            entry = zipfile.ZipInfo(f"coursemate-python/{name}", date_time=(2026, 10, 26, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            data = generated[name] if name in generated else (ROOT / name).read_text(encoding="utf-8").encode()
            archive.writestr(entry, data)
    generated["coursemate-signal-python.zip"] = buffer.getvalue()
    return generated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    stale = []
    for name, data in artifacts().items():
        target = ROOT / name
        if args.check:
            if not target.exists() or target.read_bytes() != data:
                stale.append(name)
        else:
            target.write_bytes(data)
    if stale:
        raise SystemExit("Stale Python resources: " + ", ".join(stale))
    print("Python notebooks and ZIP are current" if args.check else "Built three notebooks and ZIP")


if __name__ == "__main__":
    main()
