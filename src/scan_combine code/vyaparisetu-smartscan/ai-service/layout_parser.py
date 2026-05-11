import re
import logging
from typing import List, Dict, Any, Optional
from noise_filter import is_noise

logger = logging.getLogger(__name__)

_TABLE_HEADERS = {
    "description", "hsn/sac", "hsn", "sac",
    "qty", "quantity", "units", "rate", "amount", "per",
}

_HEADER_COL_MAP = {
    "description": "description",
    "hsn/sac": "hsn", "hsn": "hsn", "sac": "hsn",
    "qty": "qty", "quantity": "qty",
    "units": "units",
    "rate": "rate",
    "amount": "amount",
}

def _parse_number(text: str) -> Optional[float]:
    cleaned = re.sub(r'(?:inr|rs\.?|₹)\s*', '', text.lower()).strip()
    cleaned = cleaned.replace(',', '')
    cleaned = re.sub(r'(?i)\b(pc|pcs|nos|kg|kgs|ltr|ltrs|pkt|pkts|mg|gm|gms|box|boxes|set)\b', '', cleaned).strip()
    cleaned = re.sub(r'[a-z]+$', '', cleaned).strip()
    match = re.search(r'^\d+\.?\d*$', cleaned)
    if match:
        val = float(match.group())
        return val if val > 0 else None
    match = re.search(r'\b\d+\.\d+\b', cleaned)
    if match:
        val = float(match.group())
        return val if val > 0 else None
    return None

def _math_valid(qty: Optional[float], rate: Optional[float], amount: Optional[float]) -> bool:
    if qty and rate and amount:
        computed = qty * rate
        tolerance = max(amount * 0.05, 5.0)
        return abs(computed - amount) <= tolerance
    return amount is not None and amount > 0

def strategy_coordinate(ocr_data: List[Dict], known_total: float = 0.0) -> List[Dict]:
    """Y-row grouping + column-alignment. Requires bounding-box info."""
    HEADER_Y_TOL = 35
    ROW_Y_TOL    = 25  # Tightened: 25px max vertical distance to be same row
    COL_X_SLACK  = 0.6

    header_y: Optional[float] = None
    footer_y: Optional[float] = None

    for d in ocr_data:
        box = d.get("box")
        if not box: continue
        tl = box[0]
        text_l = d["text"].lower().strip()
        y_top = tl[1]

        if text_l in _TABLE_HEADERS:
            if header_y is None or y_top < header_y:
                header_y = y_top

        if text_l in {"total", "subtotal", "sub total", "grand total"} and \
                header_y is not None and y_top > header_y + 30:
            if footer_y is None or y_top < footer_y:
                footer_y = y_top

    if header_y is None:
        return []

    col_positions: Dict[str, tuple] = {}
    for d in ocr_data:
        box = d.get("box")
        if not box: continue
        y_top = box[0][1]
        if abs(y_top - header_y) > HEADER_Y_TOL: continue
        text_l = d["text"].lower().strip()
        col_name = _HEADER_COL_MAP.get(text_l)
        if col_name:
            col_positions[col_name] = (box[0][0], box[1][0])

    if not col_positions:
        return []

    data_cells = [
        d for d in ocr_data
        if d.get("box")
        and d["box"][0][1] > header_y + HEADER_Y_TOL
        and (footer_y is None or d["box"][0][1] < footer_y)
    ]

    if not data_cells: return []

    data_cells.sort(key=lambda d: d["box"][0][1])
    row_groups: List[List[Dict]] = []
    current_row = [data_cells[0]]

    for cell in data_cells[1:]:
        cy = cell["box"][0][1]
        py = current_row[-1]["box"][0][1]
        if abs(cy - py) < ROW_Y_TOL:
            current_row.append(cell)
        else:
            row_groups.append(current_row)
            current_row = [cell]
    if current_row: row_groups.append(current_row)

    items: List[Dict] = []
    seen = set()
    parsed_rows: List[Dict] = []

    for row_cells in row_groups:
        row_cells.sort(key=lambda d: d["box"][0][0])
        item: Dict[str, Any] = {"description": "", "qty": None, "rate": None, "amount": None}

        for cell in row_cells:
            cell_x_c = (cell["box"][0][0] + cell["box"][1][0]) / 2
            text = cell["text"].strip()
            assigned = False
            for col_name, (xl, xr) in col_positions.items():
                col_c = (xl + xr) / 2
                col_half = max((xr - xl) / 2, 100)
                if abs(cell_x_c - col_c) <= col_half * (1 + COL_X_SLACK):
                    if col_name == "description":
                        item["description"] = (item["description"] + " " + text).strip()
                    elif col_name in ("qty", "rate", "amount"):
                        v = _parse_number(text)
                        if v is not None:
                            item[col_name] = v
                    assigned = True
                    break

            if not assigned:
                min_x = min(xl for xl, xr in col_positions.values())
                if cell_x_c < min_x + 50:
                    item["description"] = (item["description"] + " " + text).strip()

        desc = re.sub(r'\b\d{6,8}\b', '', item["description"])
        desc = re.sub(r'\s+', ' ', desc).strip()
        item["description"] = desc
        item["name"] = desc
        parsed_rows.append(item)

    merged_items: List[Dict] = []
    for row in parsed_rows:
        has_desc = bool(row["description"].strip())
        has_nums = row["qty"] is not None or row["rate"] is not None or row["amount"] is not None
        
        if not has_desc and not has_nums: continue
            
        if merged_items:
            prev = merged_items[-1]
            prev_desc = bool(prev["description"].strip())
            prev_has_amt = prev["amount"] is not None

            if has_desc and not has_nums:
                if row["description"] not in prev["description"]:
                    prev["description"] = (prev["description"] + " " + row["description"]).strip()
                continue
                
            if not has_desc and has_nums and prev_desc and not prev_has_amt:
                if row["qty"] is not None: prev["qty"] = row["qty"]
                if row["rate"] is not None: prev["rate"] = row["rate"]
                if row["amount"] is not None: prev["amount"] = row["amount"]
                continue

        merged_items.append(row)

    for i in merged_items:
        desc = re.sub(r'\s+', ' ', i["description"]).strip()
        i["description"] = desc
        if not desc or len(desc) < 3: continue
            
        if not _math_valid(i["qty"], i["rate"], i["amount"]):
            if i["amount"] is None: continue
        items.append(i)

    return items
