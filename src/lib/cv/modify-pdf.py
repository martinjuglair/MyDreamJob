#!/usr/bin/env python3
"""
Modify Capucine's original CV PDF by overlaying new text on specific zones.

All text zones are fully responsive:
- Font size auto-shrinks to fit available space
- Text is truncated with "…" if it still doesn't fit at minimum font size
- Strict y_end enforcement prevents any overflow into adjacent zones
- Input validation with safe fallbacks for missing/malformed data

Usage:
    python3 modify-pdf.py <input.pdf> <adaptations.json> <output.pdf>

The adaptations JSON:
{
  "traits": ["Qualité 1", "Qualité 2"],
  "featuredJob": { "tasks": ["tâche 1", ...] },
  "experiences": [
    { "role": "Nouveau titre", "subtitle": "Sous-titre optionnel" },
    ...
  ]
}
"""

import sys
import json
import os
import math
import unicodedata
import fitz  # pymupdf

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SNIGLET_PATH = os.path.join(SCRIPT_DIR, "fonts", "Sniglet-Regular.ttf")
LEAGUE_GOTHIC_PATH = os.path.join(SCRIPT_DIR, "fonts", "LeagueGothic-Regular.ttf")

# ── Constants ──────────────────────────────────────────────────────────
MIN_FONT_SIZE = 8          # Below 8pt text is illegible on print
ELLIPSIS = "…"        # "…"

# ── Exact colors sampled from the PDF ───────────────────────────────────
PINK_BG = (248/255, 169/255, 169/255)   # (0.973, 0.663, 0.663)
TEAL_BG = (6/255, 85/255, 118/255)      # (0.024, 0.333, 0.463) - oval interior
TEAL_TEXT = (0.10, 0.36, 0.36)           # text color
BLACK = (0, 0, 0)                        # trait text color
WHITE = (1, 1, 1)

# ── Experience role zones (only the role text, NOT company labels) ──────
# Cover rects are precisely fitted between company labels to avoid hiding them.
# Label bottom edges: OPTILIA→469.9, BABAC→597.0, 20MIN→656.1, SUEZ→702.0, CALZ→757.8
# Label top edges:    BABAC→575.9, 20MIN→635.0, SUEZ→680.9, CALZ→736.7
EXPERIENCE_ZONES = [
    {   # Optilia: between OPTILIA@469.9 and BABAC@575.9
        "cover": fitz.Rect(295, 471, 565, 574),
        "cx": 430, "y_start": 492, "y_end": 572,
        "max_width": 260, "font_size": 20.0,
        "max_lines": 4,
    },
    {   # Babac'cool: between BABAC@597.0 and 20MIN@635.0
        "cover": fitz.Rect(295, 598, 565, 634),
        "cx": 430, "y_start": 619, "y_end": 633,
        "max_width": 260, "font_size": 20.0,
        "max_lines": 1,
    },
    {   # 20 Minutes: between 20MIN@656.1 and SUEZ@680.9
        "cover": fitz.Rect(295, 657, 565, 680),
        "cx": 430, "y_start": 672, "y_end": 679,
        "max_width": 260, "font_size": 20.0,
        "max_lines": 1,
    },
    {   # Suez: between SUEZ@702.0 and CALZ@736.7
        "cover": fitz.Rect(295, 703, 565, 736),
        "cx": 430, "y_start": 725, "y_end": 735,
        "max_width": 260, "font_size": 20.0,
        "max_lines": 1,
    },
    {   # Calzedonia: below CALZ@757.8
        "cover": fitz.Rect(295, 759, 565, 795),
        "cx": 430, "y_start": 779, "y_end": 794,
        "max_width": 260, "font_size": 20.0,
        "max_lines": 1,
    },
]

# Featured job tasks zone (inside the oval)
TASKS_ZONE = {
    "cover": fitz.Rect(78, 593, 265, 745),
    "cx": 171, "y_start": 612, "y_end": 725,
    "max_width": 155, "font_size": 16.1,
}

# Oval boundary: usable text width at each Y coordinate (sampled from the PDF).
# The oval is widest ~y=610-630 (173px) and narrows toward top/bottom.
OVAL_WIDTH_AT_Y = [
    (560, 165), (570, 168), (580, 171), (590, 172), (600, 172),
    (610, 173), (620, 173), (630, 173), (640, 172), (650, 171),
    (660, 169), (670, 166), (680, 162), (690, 157), (700, 150),
    (710, 143), (720, 133), (730, 119), (740, 95),
]


def oval_text_width(y):
    """Return the usable text width at a given y inside the tasks oval."""
    if y <= OVAL_WIDTH_AT_Y[0][0]:
        return OVAL_WIDTH_AT_Y[0][1]
    if y >= OVAL_WIDTH_AT_Y[-1][0]:
        return OVAL_WIDTH_AT_Y[-1][1]
    for i in range(len(OVAL_WIDTH_AT_Y) - 1):
        y0, w0 = OVAL_WIDTH_AT_Y[i]
        y1, w1 = OVAL_WIDTH_AT_Y[i + 1]
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0)
            return w0 + t * (w1 - w0)
    return 155  # fallback

# Photo center for curved text
PHOTO_CX, PHOTO_CY = 410, 310

# Photo boundary radii sampled from the original PDF (angle → radius from center).
# The photo is an irregular clip — NOT a perfect circle.
PHOTO_BOUNDARY = {
    -180: 98, -175: 97, -170: 96, -165: 96, -160: 95, -155: 95, -150: 94,
    -145: 94, -140: 94, -135: 94, -130: 93, -125: 93, -120: 93, -115: 92,
    -110: 92, -105: 92, -100: 92, -95: 93, -90: 94, -85: 95, -80: 96,
    -75: 98, -70: 99, -65: 101, -60: 102, -55: 103, -50: 104, -45: 104,
    -40: 103, -35: 103, -30: 104, -25: 104, -20: 105, -15: 106, -10: 108,
    -5: 124, 0: 112, 5: 114, 10: 115, 15: 117, 20: 120, 25: 123,
    30: 124, 35: 126, 40: 127, 45: 128, 50: 128, 55: 127, 60: 128,
    65: 126, 70: 126, 75: 125, 80: 123, 85: 121, 90: 120, 95: 119,
    100: 118, 105: 116, 110: 114, 115: 113, 120: 111, 125: 110, 130: 109,
    135: 107, 140: 106, 145: 104, 150: 103, 155: 101, 160: 99, 165: 99,
    170: 98, 175: 98,
}


def photo_radius_at(angle_deg):
    """Interpolate photo boundary radius at any angle."""
    keys = sorted(PHOTO_BOUNDARY.keys())
    if angle_deg <= keys[0]:
        return PHOTO_BOUNDARY[keys[0]]
    if angle_deg >= keys[-1]:
        return PHOTO_BOUNDARY[keys[-1]]
    for i in range(len(keys) - 1):
        if keys[i] <= angle_deg <= keys[i + 1]:
            t = (angle_deg - keys[i]) / (keys[i + 1] - keys[i])
            return PHOTO_BOUNDARY[keys[i]] * (1 - t) + PHOTO_BOUNDARY[keys[i + 1]] * t
    return 110  # fallback


# Exact original trait ORIGIN positions extracted from EMPATHIQUE / PERFORMANTE.
TRAIT_REF_DATA = [
    {   # Trait 1: EMPATHIQUE (right side, 10 chars)
        "angles": [-9.2, -3.0, 5.1, 11.5, 18.1, 24.0, 30.5, 35.0, 41.3, 47.6],
        "dists":  [128.2, 134.1, 140.3, 144.6, 147.9, 150.2, 151.5, 152.0, 151.7, 150.3],
        "max_chars": 14,   # max before letters start overlapping on this arc
    },
    {   # Trait 2: PERFORMANTE (bottom-right, 11 chars)
        "angles": [-99.7, -91.7, -84.5, -76.7, -69.8, -62.3, -54.7, -45.6, -38.0, -30.1, -23.1],
        "dists":  [112.5, 116.4, 119.7, 122.7, 124.9, 126.8, 128.1, 128.6, 128.4, 127.3, 125.7],
        "max_chars": 15,
    },
]

# ── Trait font sizing: scale down for long words ───────────────────────
TRAIT_BASE_FONT = 27.1
TRAIT_MIN_FONT = 18.0


# ═══════════════════════════════════════════════════════════════════════
# Helper functions
# ═══════════════════════════════════════════════════════════════════════

def wrap_text(text, font, fontsize, max_width):
    """Word-wrap text into lines that fit max_width. Returns list of lines."""
    words = text.split()
    if not words:
        return []
    lines = []
    current = ""
    for word in words:
        # If a single word is wider than max_width, force it on its own line
        # (it will be truncated later by truncate_line)
        test = f"{current} {word}".strip() if current else word
        if font.text_length(test, fontsize=fontsize) > max_width and current:
            lines.append(current)
            current = word
        else:
            current = test
    if current:
        lines.append(current)
    return lines


def truncate_line(text, font, fontsize, max_width):
    """Truncate a single line with ellipsis if it exceeds max_width.

    Removes whole words from the end, then characters if needed, until
    text + "…" fits.  Returns the (possibly truncated) string.
    """
    if font.text_length(text, fontsize=fontsize) <= max_width:
        return text

    ellipsis_w = font.text_length(ELLIPSIS, fontsize=fontsize)
    target = max_width - ellipsis_w

    # Try removing whole words first (cleaner result)
    words = text.split()
    while len(words) > 1:
        words.pop()
        candidate = " ".join(words)
        if font.text_length(candidate, fontsize=fontsize) <= target:
            return candidate + ELLIPSIS

    # Single word — remove characters
    for end in range(len(text) - 1, 0, -1):
        if font.text_length(text[:end], fontsize=fontsize) <= target:
            return text[:end] + ELLIPSIS

    return ELLIPSIS


def fit_text_in_zone(text, font, fontsize_max, fontsize_min, max_width,
                     max_lines, y_start, y_end, line_spacing=1.15):
    """Find the best font size and line layout for text in a bounded zone.

    Returns (lines, fontsize, spacing) where:
    - lines: list of strings (possibly truncated with "…")
    - fontsize: the chosen font size
    - spacing: line spacing multiplier to use

    Strategy:
    1. Try at max font size, shrink by 0.5pt until it fits
    2. At min font size, if still too many lines → keep only what fits and
       truncate the last visible line with "…"
    3. If y_end is tight, use tighter line spacing (1.05)
    """
    fs = fontsize_max
    best_lines = None
    best_fs = fs

    while fs >= fontsize_min:
        lines = wrap_text(text, font, fs, max_width)
        sp = 1.05 if fs < fontsize_max else line_spacing
        last_baseline = y_start + (len(lines) - 1) * fs * sp
        if len(lines) <= max_lines and last_baseline <= y_end:
            return lines, fs, sp
        fs -= 0.5

    # At minimum font — force fit by truncating
    fs = fontsize_min
    sp = 1.05
    lines = wrap_text(text, font, fs, max_width)

    # How many lines can physically fit in the vertical space?
    max_fitting = max_lines
    for n in range(1, len(lines) + 1):
        baseline = y_start + (n - 1) * fs * sp
        if baseline > y_end:
            max_fitting = min(max_lines, n - 1)
            break
    else:
        max_fitting = min(max_lines, len(lines))

    max_fitting = max(max_fitting, 1)  # always show at least 1 line

    if len(lines) > max_fitting:
        # Truncate: keep first (max_fitting - 1) lines, then truncate the
        # next line's content with ellipsis to signal there's more
        visible = lines[:max_fitting]
        # Combine the remaining text and append hint to last visible line
        remaining_text = " ".join(lines[max_fitting - 1:])
        visible[-1] = truncate_line(remaining_text, font, fs, max_width)
        lines = visible

    # Final safety: truncate any individual line that still exceeds width
    lines = [truncate_line(l, font, fs, max_width) for l in lines]

    return lines, fs, sp


def sanitize_trait(text):
    """Normalize trait text for curved rendering.

    - Uppercase
    - Strip accents (standard French uppercase typography)
    - Remove ligatures (œ→OE, æ→AE)
    - Keep only ASCII letters and spaces
    """
    # Expand ligatures before NFD decomposition
    text = text.replace("œ", "oe").replace("Œ", "OE")
    text = text.replace("æ", "ae").replace("Æ", "AE")
    text = unicodedata.normalize("NFD", text.upper())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Keep only letters and spaces (drop numbers, punctuation, etc.)
    text = "".join(c for c in text if c.isalpha() or c == " ")
    return text.strip()


# ═══════════════════════════════════════════════════════════════════════
# Rendering functions
# ═══════════════════════════════════════════════════════════════════════

def render_centered_lines(page, lines, cx, y_start, font, fontsize,
                          color, spacing, y_end=None):
    """Write pre-computed centered lines to the page.

    Enforces y_end strictly — any line whose baseline exceeds y_end
    is silently dropped (should never happen if fit_text_in_zone was
    used, but acts as a safety net).
    """
    y = y_start
    for line in lines:
        if y_end is not None and y > y_end:
            break  # strict y_end enforcement
        tw = fitz.TextWriter(page.rect)
        w = font.text_length(line, fontsize=fontsize)
        tw.append((cx - w / 2, y), line, font=font, fontsize=fontsize)
        tw.write_text(page, color=color)
        y += fontsize * spacing
    return y


def draw_curved_trait(page, text, font, fontsize, color, ref_data):
    """Draw uppercase text along a circular arc around the photo.

    Handles long words by:
    1. Reducing font size proportionally if text has more chars than reference
    2. Capping total arc to prevent overflow
    3. Dampened proportional spacing for clean letter distribution
    """
    text = sanitize_trait(text)
    n = len(text)
    if n == 0:
        return

    ref_angles = ref_data["angles"]
    ref_dists = ref_data["dists"]
    ref_n = len(ref_angles)
    max_chars = ref_data.get("max_chars", ref_n + 4)

    # Scale font down for long words to prevent letter overlap
    fs = fontsize
    if n > ref_n:
        # Linear scale: reduce proportionally, with a floor
        scale = ref_n / n
        fs = max(fontsize * scale, TRAIT_MIN_FONT)

    # Arc range and center from reference data
    arc_start = ref_angles[0]
    arc_end = ref_angles[-1]
    arc_center = (arc_start + arc_end) / 2
    total_ref_arc = arc_end - arc_start

    # Spacing: use reference spacing per character, cap to total arc
    ref_spacing = total_ref_arc / (ref_n - 1) if ref_n > 1 else 0
    desired_arc = ref_spacing * (n - 1) if n > 1 else 0
    total_arc = min(desired_arc, total_ref_arc)

    char_angles = []
    if n == 1:
        char_angles = [arc_center]
    else:
        # Dampened proportional spacing
        char_widths = [font.text_length(ch, fontsize=fs) for ch in text]
        avg_w = sum(char_widths) / n if n > 0 else 1

        UNIFORM_RATIO = 0.6
        gap_weights = []
        for i in range(n - 1):
            prop = (char_widths[i] + char_widths[i + 1]) / (2 * avg_w)
            gap_weights.append(UNIFORM_RATIO + (1 - UNIFORM_RATIO) * prop)

        total_weight = sum(gap_weights)
        cumulative = 0.0
        char_angles = [0.0]
        for i in range(n - 1):
            cumulative += gap_weights[i] / total_weight * total_arc
            char_angles.append(cumulative)

        # Center on the arc
        mid = char_angles[-1] / 2
        char_angles = [arc_center - mid + a for a in char_angles]

    # Interpolate distance at any angle along the reference arc
    def interp_dist(angle):
        if angle <= ref_angles[0]:
            return ref_dists[0]
        if angle >= ref_angles[-1]:
            return ref_dists[-1]
        for k in range(len(ref_angles) - 1):
            if ref_angles[k] <= angle <= ref_angles[k + 1]:
                t = (angle - ref_angles[k]) / (ref_angles[k + 1] - ref_angles[k])
                return ref_dists[k] * (1 - t) + ref_dists[k + 1] * t
        return ref_dists[ref_n // 2]

    for j, ch in enumerate(text):
        theta_deg = char_angles[j]
        dist = interp_dist(theta_deg)
        # Scale distance slightly with font to keep letters near the arc
        if fs < fontsize:
            dist = dist * (0.85 + 0.15 * (fs / fontsize))
        theta = math.radians(theta_deg)

        rot_deg = theta_deg + 90
        rot_rad = math.radians(rot_deg)
        cos_r = math.cos(rot_rad)
        sin_r = math.sin(rot_rad)

        arc_x = PHOTO_CX + dist * math.cos(theta)
        arc_y = PHOTO_CY - dist * math.sin(theta)
        char_w = font.text_length(ch, fontsize=fs)
        x = arc_x - (char_w / 2) * cos_r
        y = arc_y - (char_w / 2) * sin_r

        mat = fitz.Matrix(cos_r, sin_r, -sin_r, cos_r, 0, 0)
        pivot = fitz.Point(x, y)
        tw = fitz.TextWriter(page.rect)
        tw.append(pivot, ch, font=font, fontsize=fs)
        tw.write_text(page, color=color, morph=(pivot, mat))


# ═══════════════════════════════════════════════════════════════════════
# Tasks zone: oval-aware layout engine
# ═══════════════════════════════════════════════════════════════════════

def layout_tasks_oval(tasks, font, fontsize, zone, line_spacing, gap):
    """Compute full tasks layout respecting oval boundaries.

    Returns list of (line_text, y_pos) or None if overflow.
    Each line is wrapped to the oval width at its actual Y position.
    """
    y_cursor = zone["y_start"]
    result = []
    for ti, task in enumerate(tasks):
        line_w = oval_text_width(y_cursor)
        lines = wrap_text(task, font, fontsize, line_w)
        for line in lines:
            if y_cursor > zone["y_end"]:
                return None  # overflow
            # Truncate line if it exceeds the oval width at this y
            actual_w = oval_text_width(y_cursor)
            line = truncate_line(line, font, fontsize, actual_w)
            result.append((line, y_cursor))
            y_cursor += fontsize * line_spacing
        if ti < len(tasks) - 1:
            y_cursor += gap
    return result


def render_tasks(page, tasks, font, zone):
    """Render tasks in the oval zone with full responsiveness.

    Strategy:
    1. Try fitting at default font size with min gap
    2. Shrink font down to MIN_FONT_SIZE
    3. At min font, try zero gap
    4. If still overflow, truncate tasks list (drop last tasks) and
       append "…" to signal truncation
    5. Redistribute remaining vertical space as even gaps
    6. Verify final layout with redistributed gaps before rendering
    """
    if not tasks:
        return

    available = zone["y_end"] - zone["y_start"]
    fs = zone["font_size"]
    min_gap = 2
    line_spacing = 1.15

    # Phase 1: Find font size that fits all tasks
    layout = None
    while fs >= MIN_FONT_SIZE:
        layout = layout_tasks_oval(tasks, font, fs, zone, line_spacing, min_gap)
        if layout is not None:
            break
        fs -= 0.5

    # Phase 2: Try zero gap at min font
    if layout is None:
        fs = MIN_FONT_SIZE
        layout = layout_tasks_oval(tasks, font, fs, zone, line_spacing, 0)

    # Phase 3: Progressive task truncation — drop tasks from the end
    if layout is None:
        fs = MIN_FONT_SIZE
        for num_tasks in range(len(tasks) - 1, 0, -1):
            truncated_tasks = tasks[:num_tasks] + [ELLIPSIS]
            layout = layout_tasks_oval(truncated_tasks, font, fs, zone, line_spacing, 0)
            if layout is not None:
                tasks = truncated_tasks
                break

    if layout is None or not layout:
        return  # nothing can fit — zone is too small for any content

    # Phase 4: Redistribute vertical space as even gaps between tasks
    total_text_h = sum(fs * line_spacing for _ in layout)
    remaining = available - total_text_h
    num_gaps = max(len(tasks) - 1, 1)
    gap = max(min_gap, remaining / num_gaps) if remaining > 0 else 0

    # Verify the redistributed layout actually fits
    verified = layout_tasks_oval(tasks, font, fs, zone, line_spacing, gap)
    if verified is None:
        # Gap too large — fall back to min_gap
        gap = min_gap
        verified = layout_tasks_oval(tasks, font, fs, zone, line_spacing, gap)
    if verified is None:
        # Even min_gap overflows — use zero gap
        gap = 0
        verified = layout_tasks_oval(tasks, font, fs, zone, line_spacing, 0)

    if verified is None:
        verified = layout  # shouldn't happen, but use original layout as safety

    # Phase 5: Render
    for line_text, y_pos in verified:
        tw = fitz.TextWriter(page.rect)
        w = font.text_length(line_text, fontsize=fs)
        tw.append((zone["cx"] - w / 2, y_pos), line_text, font=font, fontsize=fs)
        tw.write_text(page, color=WHITE)


# ═══════════════════════════════════════════════════════════════════════
# Experience zones rendering
# ═══════════════════════════════════════════════════════════════════════

def render_experiences(page, experiences, font, zones):
    """Render experience role text in each zone with full responsiveness."""
    for i, exp in enumerate(experiences):
        if i >= len(zones):
            break

        z = zones[i]
        role = (exp.get("role") or "").strip()
        subtitle = (exp.get("subtitle") or "").strip()

        if not role:
            continue

        # Combine role + subtitle into one block
        full_text = f"{role}, {subtitle}" if subtitle else role

        max_lines = z.get("max_lines", 1)
        y_end = z.get("y_end", z["y_start"] + 30)

        lines, fs, spacing = fit_text_in_zone(
            text=full_text,
            font=font,
            fontsize_max=z["font_size"],
            fontsize_min=MIN_FONT_SIZE,
            max_width=z["max_width"],
            max_lines=max_lines,
            y_start=z["y_start"],
            y_end=y_end,
        )

        render_centered_lines(
            page, lines, z["cx"], z["y_start"],
            font, fs, TEAL_TEXT, spacing, y_end=y_end,
        )


# ═══════════════════════════════════════════════════════════════════════
# Main PDF modification pipeline
# ═══════════════════════════════════════════════════════════════════════

def validate_adaptations(adaptations):
    """Validate and normalize the adaptations JSON with safe defaults."""
    if not isinstance(adaptations, dict):
        adaptations = {}

    # Traits: list of 0-2 strings
    traits = adaptations.get("traits")
    if not isinstance(traits, list):
        traits = []
    traits = [str(t) for t in traits if isinstance(t, str) and t.strip()][:2]

    # Experiences: list of dicts with role/subtitle
    experiences = adaptations.get("experiences")
    if not isinstance(experiences, list):
        experiences = []
    clean_exp = []
    for exp in experiences:
        if not isinstance(exp, dict):
            continue
        clean_exp.append({
            "role": str(exp.get("role", "") or "").strip(),
            "subtitle": str(exp.get("subtitle", "") or "").strip(),
        })

    # Tasks: list of strings
    featured = adaptations.get("featuredJob")
    if not isinstance(featured, dict):
        featured = {}
    tasks = featured.get("tasks")
    if not isinstance(tasks, list):
        tasks = []
    tasks = [str(t).strip() for t in tasks if isinstance(t, str) and str(t).strip()]

    return {
        "traits": traits,
        "experiences": clean_exp,
        "featuredJob": {"tasks": tasks},
    }


def modify_pdf(input_path, adaptations, output_path):
    doc = fitz.open(input_path)
    page = doc[0]
    sniglet = fitz.Font(fontfile=SNIGLET_PATH)
    league = fitz.Font(fontfile=LEAGUE_GOTHIC_PATH)

    # ── Validate input ──────────────────────────────────────────────────
    adaptations = validate_adaptations(adaptations)
    has_exp = bool(adaptations["experiences"])
    has_tasks = bool(adaptations["featuredJob"]["tasks"])
    has_traits = bool(adaptations["traits"])

    # ── Phase 1: Redact old text in one pass ────────────────────────────
    blocks = page.get_text("dict")["blocks"]

    for block in blocks:
        if "lines" not in block:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                bbox = fitz.Rect(span["bbox"])
                font_name = span["font"]
                font_size = span["size"]

                # Experience roles: Sniglet ~20pt inside experience zones
                # Clip bbox to zone cover rect to avoid destroying adjacent labels
                if has_exp and font_name == "Sniglet-Regular" and abs(font_size - 20.0) < 1.0:
                    for z in EXPERIENCE_ZONES:
                        if bbox.intersects(z["cover"]):
                            clipped = bbox & z["cover"]  # intersection
                            page.add_redact_annot(clipped, fill=False)
                            break

                # Tasks: Sniglet ~16.1pt inside tasks zone
                if has_tasks and font_name == "Sniglet-Regular" and abs(font_size - 16.1) < 1.0:
                    if bbox.intersects(TASKS_ZONE["cover"]):
                        clipped = bbox & TASKS_ZONE["cover"]
                        page.add_redact_annot(clipped, fill=False)

                # Traits: LeagueGothic ~27.1pt single characters near photo
                if has_traits and font_name == "LeagueGothic-Regular" and abs(font_size - 27.1) < 0.5:
                    if len(span["text"]) == 1:
                        expanded = bbox + (-1, -1, 1, 1)
                        page.add_redact_annot(expanded, fill=False)

    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

    # ── Phase 2: Write all new text ─────────────────────────────────────

    # 2a. Experience roles
    if has_exp:
        render_experiences(page, adaptations["experiences"], sniglet, EXPERIENCE_ZONES)

    # 2b. Featured job tasks (oval-aware)
    if has_tasks:
        render_tasks(page, adaptations["featuredJob"]["tasks"], sniglet, TASKS_ZONE)

    # 2c. Traits (curved text around photo)
    if has_traits:
        for i, trait in enumerate(adaptations["traits"]):
            if i >= len(TRAIT_REF_DATA):
                break
            draw_curved_trait(page, trait, league, TRAIT_BASE_FONT,
                              BLACK, TRAIT_REF_DATA[i])

    doc.save(output_path)
    doc.close()
    print(json.dumps({"success": True, "path": output_path}))


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <input.pdf> <adaptations.json> <output.pdf>",
              file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[2]) as f:
        adaptations = json.load(f)
    modify_pdf(sys.argv[1], adaptations, sys.argv[3])
