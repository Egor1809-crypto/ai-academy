from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class PerfMetric:
    metric: str
    value: float
    budget: float
    source: str

    @property
    def within_budget(self) -> bool:
        return self.value <= self.budget


def _format_number(value: float) -> str:
    if value.is_integer():
        return str(int(value))
    return f"{value:.2f}"


def _parse_metric(path: Path, workspace_root: Path) -> PerfMetric | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None

    metric = str(payload.get("metric") or "").strip()
    if not metric:
        metric = "unknown"

    try:
        value = float(payload["value"])
        budget = float(payload["budget"])
    except Exception:
        return None

    try:
        source = str(path.resolve().relative_to(workspace_root.resolve()))
    except Exception:
        source = str(path)

    return PerfMetric(metric=metric, value=value, budget=budget, source=source)


def _build_summary(metrics: list[PerfMetric], scan_root: Path) -> str:
    lines: list[str] = []
    lines.append("### Playwright Perf Budget")

    if not metrics:
        lines.append("")
        lines.append(f"No `perf-budget.json` files found under `{scan_root}`.")
        return "\n".join(lines) + "\n"

    lines.append("")
    lines.append("| Metric | Value (ms) | Budget (ms) | Status | Source |")
    lines.append("| --- | ---: | ---: | --- | --- |")

    passed = 0
    for metric in sorted(metrics, key=lambda item: (item.metric, item.source)):
        ok = metric.within_budget
        if ok:
            passed += 1
        status = "PASS" if ok else "FAIL"
        lines.append(
            f"| `{metric.metric}` | {_format_number(metric.value)} | "
            f"{_format_number(metric.budget)} | **{status}** | `{metric.source}` |"
        )

    lines.append("")
    lines.append(f"Total: **{passed}/{len(metrics)}** within budget.")
    return "\n".join(lines) + "\n"


def main() -> int:
    workspace_root = Path.cwd()
    scan_root = Path(os.getenv("PLAYWRIGHT_TEST_RESULTS_DIR", "test-results"))
    output_json = Path(os.getenv("PLAYWRIGHT_PERF_SUMMARY_JSON", "test-results/perf-summary.json"))
    output_md = Path(os.getenv("PLAYWRIGHT_PERF_SUMMARY_MD", "test-results/perf-summary.md"))

    metrics: list[PerfMetric] = []
    if scan_root.exists():
        for candidate in scan_root.rglob("perf-budget.json"):
            metric = _parse_metric(candidate, workspace_root)
            if metric is not None:
                metrics.append(metric)

    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_md.parent.mkdir(parents=True, exist_ok=True)

    summary_payload = {
        "metrics": [
            {
                "metric": metric.metric,
                "value_ms": metric.value,
                "budget_ms": metric.budget,
                "within_budget": metric.within_budget,
                "source": metric.source,
            }
            for metric in metrics
        ],
        "total": len(metrics),
        "within_budget_total": sum(1 for metric in metrics if metric.within_budget),
    }

    output_json.write_text(json.dumps(summary_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    markdown_summary = _build_summary(metrics, scan_root)
    output_md.write_text(markdown_summary, encoding="utf-8")

    step_summary_path = os.getenv("GITHUB_STEP_SUMMARY")
    if step_summary_path:
        with Path(step_summary_path).open("a", encoding="utf-8") as summary_file:
            summary_file.write(markdown_summary)

    print(markdown_summary, end="")
    print(f"Saved perf summary JSON to: {output_json}")
    print(f"Saved perf summary Markdown to: {output_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
