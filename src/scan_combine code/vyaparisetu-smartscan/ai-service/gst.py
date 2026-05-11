"""
gst.py — VyapariSetu SmartScan
================================
Robust GST extraction using a 4-pass multi-strategy approach.

Pass 1: Inline amount  — "CGST@9% 488.14" (amount in same OCR block)
Pass 2: Adjacent block — label in one block, amount in next 1-3 blocks
Pass 3: Percentage calc — rate% found near label; compute from base
Pass 4: Total-tax split — "Total Tax: 976.28" split equally if both missing

Returns:
  cgst (float), sgst (float)
"""

import re
import logging
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)

GSTIN_REGEX = re.compile(r'\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]\b')

# ── Regex helpers ──────────────────────────────────────────────────────────────

# Matches a standalone monetary amount e.g. "488.14", "1,234.56", "0.00"
_AMOUNT_RE   = re.compile(r'\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+\.\d+)\b')

# Matches a GST rate percentage e.g. "@9%", "9 %", "@ 9%", "(9%)"
_RATE_RE     = re.compile(r'[@(]?\s*(\d+(?:\.\d+)?)\s*%')

# CGST / SGST / IGST keyword patterns (flexible)
_CGST_KW     = re.compile(r'\bcgst\b', re.I)
_SGST_KW     = re.compile(r'\bsgst\b', re.I)
_IGST_KW     = re.compile(r'\bigst\b', re.I)
_TOTAL_TAX_KW = re.compile(r'total\s*tax', re.I)


def _parse_amt(text: str) -> Optional[float]:
    """Return the last valid monetary amount in *text*, or None."""
    # Ignore percentages so we don't accidentally parse "9" from "9%" as the amount
    text_no_pct = re.sub(r'\d+(?:\.\d+)?\s*%', ' ', text)
    matches = _AMOUNT_RE.findall(text_no_pct)
    for raw in reversed(matches):
        try:
            v = float(raw.replace(',', ''))
            if v > 0:
                return v
        except ValueError:
            pass
    return None


def _parse_rate(text: str) -> Optional[float]:
    """Extract a GST percentage rate from *text*, e.g. 9 from '@9%'."""
    m = _RATE_RE.search(text)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return None


def extract_gst(ocr_data: List[Dict],
                total: float = 0.0) -> Tuple[float, float]:
    """
    Extract CGST and SGST amounts from OCR data.

    Args:
        ocr_data: normalized OCR list [{text, conf, box}, ...]
        total:    invoice grand total (used in Pass 3 percentage calc)

    Returns:
        (cgst, sgst) as floats
    """
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    n = len(ocr_data)

    # ─── Pass 1 & 2: iterate every block ─────────────────────────────────────
    for i, d in enumerate(ocr_data):
        text = d["text"]
        lower = text.lower()

        is_cgst_block = bool(_CGST_KW.search(lower))
        is_sgst_block = bool(_SGST_KW.search(lower))

        if not is_cgst_block and not is_sgst_block:
            continue

        # ── Pass 1: amount embedded in the same block ─────────────────────────
        # e.g. "Sgst@9% 488.14"  or  "CGST@9% : 488.14"
        inline_amt = _parse_amt(text)

        value: Optional[float] = inline_amt

        # ── Pass 2: look in adjacent blocks (±4) for a lone number ───────────
        if value is None or value == 0.0:
            # Check neighbors closest to `i` first
            neighbors = sorted(
                range(max(0, i - 4), min(n, i + 5)),
                key=lambda x: abs(x - i)
            )
            for j in neighbors:
                if j == i:
                    continue
                neighbor = ocr_data[j]["text"].strip()
                # Neighbor must be mostly numeric (not another label block)
                non_digit = re.sub(r'[\d\s,.]', '', neighbor)
                if len(non_digit) > 3:
                    continue
                amt = _parse_amt(neighbor)
                if amt and amt > 0:
                    value = amt
                    break

        # ── Pass 3: compute from rate% if we know the base/total ─────────────
        if (value is None or value == 0.0) and total > 0:
            rate = _parse_rate(text)
            if rate and rate > 0:
                # base ≈ total (tax-inclusive means we approximate here)
                value = round(total * rate / (100 + rate * 2), 2)
                logger.info(f"[GST] Pass-3 computed {value} from rate {rate}% on total {total}")

        if value and value > 0:
            if is_cgst_block and cgst is None:
                cgst = value
                logger.info(f"[GST] CGST={cgst} (block idx={i}, text={text!r})")
            if is_sgst_block and sgst is None:
                sgst = value
                logger.info(f"[GST] SGST={sgst} (block idx={i}, text={text!r})")

    # ─── Pass 4: "Total Tax: 976.28" — split if still missing ────────────────
    if (cgst is None or sgst is None):
        for d in ocr_data:
            if _TOTAL_TAX_KW.search(d["text"]):
                total_tax_amt = _parse_amt(d["text"])
                if total_tax_amt and total_tax_amt > 0:
                    if cgst is None and sgst is None:
                        # 50/50 split (assumes equal CGST/SGST — typical intra-state)
                        half = round(total_tax_amt / 2, 2)
                        cgst = half
                        sgst = half
                        logger.info(f"[GST] Pass-4 split: CGST={half}, SGST={half} "
                                    f"from Total Tax={total_tax_amt}")
                    elif cgst is None and sgst is not None:
                        cgst = round(total_tax_amt - sgst, 2)
                        logger.info(f"[GST] Pass-4 CGST={cgst} = TotalTax - SGST")
                    elif sgst is None and cgst is not None:
                        sgst = round(total_tax_amt - cgst, 2)
                        logger.info(f"[GST] Pass-4 SGST={sgst} = TotalTax - CGST")
                    break

    final_cgst = max(round(cgst, 2), 0.0) if cgst else 0.0
    final_sgst = max(round(sgst, 2), 0.0) if sgst else 0.0

    # Sanity: tax should not exceed total
    if total > 0:
        if final_cgst >= total:
            logger.warning(f"[GST] CGST {final_cgst} >= total {total} — zeroing")
            final_cgst = 0.0
        if final_sgst >= total:
            logger.warning(f"[GST] SGST {final_sgst} >= total {total} — zeroing")
            final_sgst = 0.0

    return final_cgst, final_sgst


def extract_gstin(ocr_data: List[Dict]) -> Optional[str]:
    """Extract the first valid GSTIN from the document."""
    for d in ocr_data:
        m = GSTIN_REGEX.search(d["text"].upper())
        if m:
            return m.group()
    return None
