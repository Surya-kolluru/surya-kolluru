#!/usr/bin/env python3
"""Build repository-hosted GitHub contribution calendar and activity SVGs."""
from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from html import escape
from pathlib import Path

PALETTE = ["#10251a", "#0e6b38", "#159447", "#26c65b", "#65f28d"]


def load_days(source: Path) -> tuple[list[dict], int]:
    payload = json.loads(source.read_text(encoding="utf-8"))
    rows = payload.get("contributions")
    totals = payload.get("total", {})
    if not isinstance(rows, list) or not rows:
        raise ValueError("Contribution API returned no contribution array.")
    days = sorted(rows, key=lambda row: row["date"])
    total = int(totals.get("lastYear", sum(int(row.get("count", 0)) for row in days)))
    return days, total


def render_heatmap(days: list[dict], total: int, out_dir: Path) -> None:
    first = date.fromisoformat(days[0]["date"])
    last = date.fromisoformat(days[-1]["date"])
    grid_start = first - timedelta(days=(first.weekday() + 1) % 7)  # Sunday first
    week_count = ((last - grid_start).days // 7) + 1

    cell, pitch, left, top = 13, 18, 54, 55
    width = max(760, left + week_count * pitch + 28)
    height = 193
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="t d">',
        '<title id="t">GitHub contribution calendar</title>',
        '<desc id="d">A daily contribution heatmap for the last year, generated and hosted by this repository.</desc>',
        '<rect width="100%" height="100%" rx="14" fill="#050b07"/>',
        f'<rect x="1" y="1" width="{width-2}" height="{height-2}" rx="13" fill="none" stroke="#1e6039"/>',
        f'<text x="{left}" y="27" fill="#b9f6cb" font-family="monospace" font-size="16" font-weight="700">{total:,} contributions in the last year</text>',
    ]

    previous_month = None
    for item in days:
        day = date.fromisoformat(item["date"])
        col = (day - grid_start).days // 7
        row = (day.weekday() + 1) % 7
        x, y = left + col * pitch, top + row * pitch
        if day.month != previous_month and row <= 3:
            parts.append(
                f'<text x="{x}" y="45" fill="#9eb9a6" font-family="monospace" font-size="11">{day.strftime("%b")}</text>'
            )
            previous_month = day.month
        level = max(0, min(4, int(item.get("level", 0))))
        count = int(item.get("count", 0))
        label = escape(f"{count} contributions on {day.isoformat()}")
        parts.append(
            f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="3" fill="{PALETTE[level]}">'
            f'<title>{label}</title></rect>'
        )

    for label, row in [("Mon", 1), ("Wed", 3), ("Fri", 5)]:
        parts.append(
            f'<text x="13" y="{top + row*pitch + 10}" fill="#8ca895" font-family="monospace" font-size="10">{label}</text>'
        )
    legend_y = height - 13
    parts.append(f'<text x="{left}" y="{legend_y}" fill="#8ca895" font-family="monospace" font-size="10">Less</text>')
    start = left + 40
    for idx, color in enumerate(PALETTE):
        parts.append(f'<rect x="{start + idx*17}" y="{legend_y-10}" width="11" height="11" rx="2" fill="{color}"/>')
    parts.append(f'<text x="{start + 5*17 + 3}" y="{legend_y}" fill="#8ca895" font-family="monospace" font-size="10">More</text>')
    parts.append("</svg>")
    (out_dir / "contribution-heatmap.svg").write_text("\n".join(parts), encoding="utf-8")


def render_activity(days: list[dict], out_dir: Path) -> None:
    values = [int(day.get("count", 0)) for day in days]
    width, height = 1000, 230
    left, right, top, bottom = 42, 24, 40, 42
    plot_w, plot_h = width-left-right, height-top-bottom
    peak = max(1, max(values))
    points = []
    for i, value in enumerate(values):
        x = left + (i / max(1, len(values)-1)) * plot_w
        y = top + plot_h - (value / peak) * plot_h
        points.append((x, y))
    polyline = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
    area = f"{left},{top+plot_h} " + polyline + f" {left+plot_w},{top+plot_h}"
    first_label = date.fromisoformat(days[0]["date"]).strftime("%b %Y")
    last_label = date.fromisoformat(days[-1]["date"]).strftime("%b %Y")
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="t d">',
        '<title id="t">GitHub contribution activity</title>',
        '<desc id="d">Daily contribution counts over the last year.</desc>',
        '<rect width="100%" height="100%" rx="14" fill="#050b07"/>',
        f'<rect x="1" y="1" width="{width-2}" height="{height-2}" rx="13" fill="none" stroke="#1e6039"/>',
        '<text x="28" y="25" fill="#b9f6cb" font-family="monospace" font-size="15" font-weight="700">CONTRIBUTION ACTIVITY // LAST YEAR</text>',
        f'<line x1="{left}" y1="{top+plot_h}" x2="{left+plot_w}" y2="{top+plot_h}" stroke="#28563b"/>',
        f'<polygon points="{area}" fill="#26c65b" opacity="0.16"/>',
        f'<polyline points="{polyline}" fill="none" stroke="#39ff88" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>',
        f'<text x="{left}" y="{height-13}" fill="#8ca895" font-family="monospace" font-size="11">{escape(first_label)}</text>',
        f'<text x="{left+plot_w}" y="{height-13}" text-anchor="end" fill="#8ca895" font-family="monospace" font-size="11">{escape(last_label)}</text>',
        '</svg>',
    ]
    (out_dir / "contribution-activity.svg").write_text("\n".join(parts), encoding="utf-8")


def main() -> int:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "contributions.json")
    out_dir = Path("dist")
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        days, total = load_days(source)
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        print(f"Unable to parse contribution data: {exc}", file=sys.stderr)
        return 1
    render_heatmap(days, total, out_dir)
    render_activity(days, out_dir)
    print(f"Generated heatmap and activity graph for {total:,} contributions across {len(days)} days.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
