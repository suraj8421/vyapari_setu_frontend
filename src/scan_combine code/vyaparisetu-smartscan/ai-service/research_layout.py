import json
import os
import numpy as np

def run_research():
    if not os.path.exists("debug_ocr.json"):
        print("Error: debug_ocr.json not found")
        return

    with open("debug_ocr.json", "r") as f:
        data = json.load(f)
    
    blocks = data.get("ocr_raw", [])
    if not blocks:
        print("No OCR data found")
        return

    # 1. Height analysis
    y_coords = [b["box"][0][1] for b in blocks]
    y_diffs = np.diff(sorted(list(set(y_coords))))
    avg_line_height = np.median([d for d in y_diffs if d < 100])
    print(f"Detected Average Line Height (Median Delta Y): {avg_line_height:.2f} pixels")

    # 2. Horizontal Histogram (to find gutters)
    # We'll use a bin size of 10 pixels
    x_bins = np.zeros(2600) # Image width is approx 2550
    for b in blocks:
        x1, x2 = int(b["box"][0][0]), int(b["box"][1][0])
        x_bins[max(0, x1):min(2599, x2)] += 1
    
    print("\nColumn Discovery (Horizontal Gaps):")
    in_column = False
    col_start = 0
    for x in range(len(x_bins)):
        if x_bins[x] > 0 and not in_column:
            in_column = True
            col_start = x
        elif x_bins[x] == 0 and in_column:
            in_column = False
            if x - col_start > 20: # Only significant columns
                print(f"Column: {col_start} -> {x} (Width: {x - col_start})")
    
    # 3. Y-Sorting and Item Analysis
    print("\nTop 50 Lines (Spatial Grouping check):")
    sorted_blocks = sorted(blocks, key=lambda x: (x["box"][0][1] // 50, x["box"][0][0]))
    current_grid_y = -1
    for b in sorted_blocks[:100]:
        grid_y = int(b["box"][0][1] // 50)
        if grid_y != current_grid_y:
            print(f"\n--- GRID ROW {grid_y} (Y ~ {grid_y*50}) ---")
            current_grid_y = grid_y
        print(f"  X:{b['box'][0][0]:<5.0f} | {b['text']}")

if __name__ == "__main__":
    run_research()
