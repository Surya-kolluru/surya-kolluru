#!/usr/bin/env python3
"""Render a GitHub-style contribution calendar SVG from GitHub GraphQL JSON."""
from __future__ import annotations

import json
import os
import sys
from datetime import date
from html import escape
from pathlib import Path

PALETTE = ["#10251a", "#0e6b38", "#159447", "#26c65b", "#65f28d"]


def main() -> int:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "contributions.json")
    payload = json.loads(source.read_text(encoding="utf-8"))
    try:
        calendar = payload["data"]["user"]["contributionsCollection"]["contributionCalendar"]
        weeks = calendar["weeks"]
        total = int(calendar["totalContributions"])
    except (KeyError, TypeError) as exc:
        print(f"Unexpected GitHub GraphQL response: {exc}", file=sys.stderr)
        return 1

    if not weeks:
        print("No contribution weeks found.", file=sys.stderr)
        return 1

    cell = 13
    pitch = 18
    left = 52
    top = 54
    width = max(760, left + len(weeks) * pitch + 28)
    height = 190

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="t d">',
        '<title id="t">GitHub contribution calendar</title>',
        '<desc id="d">Contribution activity over the last year, rendered from GitHub contribution data.</desc>',
        '<rect width="100%" height="100%" rx="14" fill="#050b07"/>',
        '<rect x="1" y="1" width="' + str(width - 2) + '" height="' + str(height - 2) + '" rx="13" fill="none" stroke="#1e6039"/>',
        f'<text x="{left}" y="27" fill="#b9f6cb" font-family="monospace" font-size="16" font-weight="700">{total:,} contributions in the last year</text>',
    ]

    previous_month = None
    for wi, week in enumerate(weeks):
        days = week.get("contributionDays", [])
        if not days:
            continue
        first_day = date.fromisoformat(days[0]["date"])
        if first_day.month != previous_month:
            parts.append(
                f'<text x="{left + wi * pitch}" y="45" fill="#9eb9a6" font-family="monospace" font-size="11">{first_day.strftime("%b")}</text>'
            )
            previous_month = first_day.month

        for item in days:
            weekday = int(item.get("weekday", 0))
            count = int(item.get("contributionCount", 0))
            level = 0 if count == 0 else 1 if count <= 3 else 2 if count <= 6 else 3 if count <= 10 else 4
            x = left + wi * pitch
            y = top + weekday * pitch
            label = escape(f'{count} contributions on {item["date"]}')
            parts.append(
                f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="3" fill="{PALETTE[level]}">'
                f'<title>{label}</title></rect>'
            )

    legend_y = top + 7 * pitch + 9
    parts.append(f'<text x="{left}" y="{legend_y}" fill="#8ca895" font-family="monospace" font-size="10">Less</text>')
    start = left + 40
    for idx, color in enumerate(PALETTE):
        parts.append(f'<rect x="{start + idx * 17}" y="{legend_y - 10}" width="11" height="11" rx="2" fill="{color}"/>')
    parts.append(f'<text x="{start + 5 * 17 + 3}" y="{legend_y}" fill="#8ca895" font-family="monospace" font-size="10">More</text>')
    parts.append("</svg>")

    out_dir = Path("dist")
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "contribution-heatmap.svg").write_text("\n".join(parts), encoding="utf-8")
    print(f"Generated contribution heatmap with {total:,} contributions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
