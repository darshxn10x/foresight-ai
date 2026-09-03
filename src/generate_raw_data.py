"""
NorthBay Living Synthetic Client Data Generator
Generates realistic simulated raw extracts matching Zidio Project FORESIGHT specifications:
- sales_daily.csv (Fact table)
- sku_master.csv (Dimension table)
- calendar.csv (Date dimension)
- inventory_snapshots.csv (Stock snapshots)

Includes deliberate real-world anomalies (duplicates, missing values, invalid dates,
impossible values, casing/whitespace inconsistencies, orphaned SKUs) to validate
the automated cleaning and reconciliation pipeline.
"""

import os
import random
from datetime import datetime, timedelta
import numpy as np
import pandas as pd


def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)


def generate_sku_master(num_skus=200):
    categories = {
        "Furnishings": ["Living Room", "Bedroom", "Accent Furniture", "Home Office"],
        "Home Décor": ["Lighting", "Rugs", "Wall Art", "Vases & Accents"],
        "Small Appliances": ["Coffee Makers", "Blenders", "Air Purifiers", "Toasters"],
        "Bedding & Bath": ["Bed Sheets", "Duvets", "Towels", "Pillows"],
        "Kitchen & Dining": ["Cookware", "Dinnerware", "Glassware", "Cutlery"]
    }

    category_keys = list(categories.keys())
    records = []

    start_launch = datetime(2023, 1, 1)
    end_launch = datetime(2024, 12, 1)

    for i in range(1, num_skus + 1):
        sku_id = f"SKU-{i:03d}"
        cat = category_keys[i % len(category_keys)]
        subcat = random.choice(categories[cat])

        # Realistic pricing depending on category
        if cat == "Furnishings":
            unit_cost = round(random.uniform(4500, 28000), 2)
            markup = random.uniform(1.6, 2.2)
        elif cat == "Small Appliances":
            unit_cost = round(random.uniform(1800, 9500), 2)
            markup = random.uniform(1.4, 1.9)
        elif cat == "Home Décor":
            unit_cost = round(random.uniform(500, 3500), 2)
            markup = random.uniform(1.8, 2.5)
        elif cat == "Bedding & Bath":
            unit_cost = round(random.uniform(800, 4200), 2)
            markup = random.uniform(1.5, 2.1)
        else:  # Kitchen & Dining
            unit_cost = round(random.uniform(600, 5000), 2)
            markup = random.uniform(1.5, 2.0)

        list_price = round(unit_cost * markup, 2)
        random_days = random.randint(0, (end_launch - start_launch).days)
        launch_date = (start_launch + timedelta(days=random_days)).strftime("%Y-%m-%d")

        records.append({
            "sku_id": sku_id,
            "category": cat,
            "subcategory": subcat,
            "launch_date": launch_date,
            "unit_cost": unit_cost,
            "list_price": list_price
        })

    df = pd.DataFrame(records)

    # Inject deliberate anomalies into sku_master
    # 1. Inconsistent casing in category (e.g., lower, upper, title)
    df.loc[5, "category"] = "furnishings"
    df.loc[12, "category"] = "HOME DÉCOR"
    df.loc[25, "category"] = "small appliances"

    # 2. Inconsistent whitespace in sku_id
    df.loc[18, "sku_id"] = "  SKU-019 "
    df.loc[32, "sku_id"] = "SKU-033   "

    # 3. Impossible values (one negative unit cost, one where cost > price)
    df.loc[45, "unit_cost"] = -120.0
    df.loc[60, "unit_cost"] = df.loc[60, "list_price"] * 1.3

    # 4. Duplicate SKU row
    duplicate_row = df.iloc[10:11].copy()
    df = pd.concat([df, duplicate_row], ignore_index=True)

    return df


def generate_calendar(start_date="2025-01-01", end_date="2026-06-30"):
    dates = pd.date_range(start=start_date, end=end_date, freq="D")
    records = []

    holidays = {
        "2025-01-26": "Republic Day",
        "2025-03-14": "Holi",
        "2025-08-15": "Independence Day",
        "2025-10-20": "Diwali",
        "2025-12-25": "Christmas",
        "2026-01-01": "New Year",
        "2026-01-26": "Republic Day",
        "2026-03-04": "Holi"
    }

    promo_windows = [
        ("2025-01-20", "2025-01-26", "Republic Day Sale"),
        ("2025-03-10", "2025-03-16", "Spring Refresh Promo"),
        ("2025-05-01", "2025-05-10", "Summer Home Makeover"),
        ("2025-08-10", "2025-08-17", "Freedom Sale"),
        ("2025-10-15", "2025-10-25", "Diwali Mega Sale"),
        ("2025-12-20", "2026-01-03", "Year End Clearance"),
        ("2026-01-22", "2026-01-28", "Republic Day Sale"),
        ("2026-05-01", "2026-05-07", "Early Summer Fest")
    ]

    seasons = {
        1: "Winter", 2: "Winter", 3: "Spring", 4: "Spring", 5: "Summer",
        6: "Summer", 7: "Monsoon", 8: "Monsoon", 9: "Monsoon", 10: "Fall",
        11: "Fall", 12: "Winter"
    }

    for dt in dates:
        dt_str = dt.strftime("%Y-%m-%d")
        week_num = dt.isocalendar()[1]
        month_num = dt.month
        season = seasons[month_num]
        is_holiday = 1 if dt_str in holidays else 0

        promo_event = None
        for p_start, p_end, p_name in promo_windows:
            if p_start <= dt_str <= p_end:
                promo_event = p_name
                break

        records.append({
            "date": dt_str,
            "week": week_num,
            "month": month_num,
            "season": season,
            "is_holiday": is_holiday,
            "promo_event": promo_event
        })

    df = pd.DataFrame(records)

    # Introduce deliberate formatting inconsistency:
    # A few dates formatted as DD/MM/YYYY instead of YYYY-MM-DD
    indices_to_scramble = [14, 45, 90, 180, 240]
    for idx in indices_to_scramble:
        orig = pd.to_datetime(df.loc[idx, "date"])
        df.loc[idx, "date"] = orig.strftime("%d/%m/%Y")

    return df


def generate_sales_daily(sku_master_df, calendar_df):
    clean_skus = sku_master_df["sku_id"].str.strip().str.upper().unique().tolist()
    # Filter out any negative cost outliers from pure list
    clean_skus = [s for s in clean_skus if s.startswith("SKU-")][:195]

    dates = pd.date_range(start="2025-01-01", end="2026-06-30", freq="D")
    records = []

    # Map list price from sku_master
    sku_price_map = {}
    sku_cat_map = {}
    for _, row in sku_master_df.iterrows():
        s_id = str(row["sku_id"]).strip().upper()
        if s_id not in sku_price_map:
            sku_price_map[s_id] = float(row["list_price"])
            sku_cat_map[s_id] = str(row["category"]).strip().title()

    # Create promo date lookup
    calendar_lookup = {}
    for _, r in calendar_df.iterrows():
        try:
            d_norm = pd.to_datetime(r["date"], format="mixed").strftime("%Y-%m-%d")
        except Exception:
            continue
        calendar_lookup[d_norm] = {
            "is_holiday": r["is_holiday"],
            "promo_event": r["promo_event"]
        }

    # Generate daily records for each SKU
    for s_idx, sku_id in enumerate(clean_skus):
        base_price = sku_price_map.get(sku_id, 2500.0)
        category = sku_cat_map.get(sku_id, "Home Décor")

        # Category base volume
        if category in ["Furnishings", "Living Room"]:
            base_vol = random.uniform(0.3, 1.8)
        elif category in ["Small Appliances"]:
            base_vol = random.uniform(0.8, 3.5)
        elif category in ["Home Décor"]:
            base_vol = random.uniform(2.0, 8.0)
        else:
            base_vol = random.uniform(3.0, 12.0)

        # SKU popularity tier (Pareto 80/20 distribution: top 20% sell 4x more)
        tier_multiplier = 3.5 if s_idx < 35 else (0.4 if s_idx > 150 else 1.0)
        expected_daily = base_vol * tier_multiplier

        for dt in dates:
            # Day of week seasonality: Friday-Sunday higher
            dow_lift = 1.35 if dt.weekday() >= 4 else 0.9

            dt_str = dt.strftime("%Y-%m-%d")
            cal_info = calendar_lookup.get(dt_str, {"is_holiday": 0, "promo_event": None})
            has_promo = 1 if cal_info["promo_event"] is not None else 0
            promo_lift = 2.1 if has_promo else 1.0

            # Holiday boost
            holiday_lift = 1.4 if cal_info["is_holiday"] == 1 else 1.0

            # Poisson demand
            lambda_param = max(0.05, expected_daily * dow_lift * promo_lift * holiday_lift)
            units = np.random.poisson(lam=lambda_param)

            # Price discount if on promo
            unit_price = round(base_price * (0.85 if has_promo else 1.0), 2)
            revenue = round(units * unit_price, 2)

            records.append({
                "date": dt_str,
                "sku_id": sku_id,
                "units_sold": units,
                "revenue": revenue,
                "unit_price": unit_price,
                "promo_flag": has_promo
            })

    df = pd.DataFrame(records)

    # ----------------------------------------------------
    # Inject deliberate imperfections into sales_daily
    # ----------------------------------------------------
    n_rows = len(df)

    # 1. Inconsistent SKU identifiers (lowercase, whitespace)
    scramble_sku_indices = random.sample(range(n_rows), int(n_rows * 0.02))
    for idx in scramble_sku_indices:
        orig_sku = df.loc[idx, "sku_id"]
        if idx % 3 == 0:
            df.loc[idx, "sku_id"] = orig_sku.lower()
        elif idx % 3 == 1:
            df.loc[idx, "sku_id"] = f"  {orig_sku}  "
        else:
            df.loc[idx, "sku_id"] = orig_sku.replace("SKU-", "sku_")

    # 2. Duplicate rows (~1% exact duplicates, 0.5% same day conflicting records)
    dupe_indices = random.sample(range(n_rows), int(n_rows * 0.01))
    dupe_rows = df.iloc[dupe_indices].copy()
    df = pd.concat([df, dupe_rows], ignore_index=True)

    # 3. Invalid dates (~0.3% unparseable dates)
    invalid_date_indices = random.sample(range(len(df)), 150)
    for idx in invalid_date_indices:
        variant = idx % 4
        if variant == 0:
            df.loc[idx, "date"] = "2025-02-30"  # Impossible Feb 30
        elif variant == 1:
            df.loc[idx, "date"] = "2025/13/45"  # Month 13, day 45
        elif variant == 2:
            df.loc[idx, "date"] = "INVALID_DATE"
        else:
            df.loc[idx, "date"] = "2025-00-15"

    # 4. Impossible values: negative units (e.g. unhandled return codes), negative prices
    imp_val_indices = random.sample(range(len(df)), 200)
    for idx in imp_val_indices:
        if idx % 2 == 0:
            df.loc[idx, "units_sold"] = -1 * random.randint(1, 10)
        else:
            df.loc[idx, "unit_price"] = -1 * abs(df.loc[idx, "unit_price"])
            df.loc[idx, "revenue"] = -1 * abs(df.loc[idx, "revenue"])

    # 5. Missing values (null revenue, null unit_price, null promo_flag)
    null_rev_indices = random.sample(range(len(df)), int(len(df) * 0.015))
    df.loc[null_rev_indices, "revenue"] = np.nan

    null_price_indices = random.sample(range(len(df)), int(len(df) * 0.008))
    df.loc[null_price_indices, "unit_price"] = np.nan

    null_promo_indices = random.sample(range(len(df)), int(len(df) * 0.02))
    df.loc[null_promo_indices, "promo_flag"] = np.nan

    # 6. Orphaned SKUs not present in sku_master
    orphan_indices = random.sample(range(len(df)), 100)
    for idx in orphan_indices:
        df.loc[idx, "sku_id"] = "SKU-998" if idx % 2 == 0 else "SKU-999"

    return df


def generate_inventory_snapshots(sku_master_df):
    clean_skus = sku_master_df["sku_id"].str.strip().str.upper().unique().tolist()
    clean_skus = [s for s in clean_skus if s.startswith("SKU-")][:195]

    # Snapshots taken at end of quarter in 2025 and 2026, plus latest 2026-06-30
    snapshot_dates = [
        "2025-03-31",
        "2025-06-30",
        "2025-09-30",
        "2025-12-31",
        "2026-03-31",
        "2026-06-30"
    ]

    records = []

    for s_date in snapshot_dates:
        for sku_id in clean_skus:
            lead_time = random.choice([5, 7, 10, 14, 21, 28])
            daily_est = random.uniform(1.0, 15.0)

            # Reorder point = daily * lead_time + safety
            safety = int(daily_est * 4)
            reorder_point = int(daily_est * lead_time + safety)

            # Realistic stock levels (some healthy, some warning, some stockout)
            stock_scenario = random.random()
            if stock_scenario < 0.15:  # Critical / imminent stockout
                on_hand = random.randint(0, int(reorder_point * 0.4))
                on_order = random.choice([0, int(reorder_point * 0.8)])
            elif stock_scenario < 0.35:  # Warning
                on_hand = random.randint(int(reorder_point * 0.4), reorder_point)
                on_order = random.choice([0, reorder_point])
            elif stock_scenario < 0.85:  # Healthy
                on_hand = random.randint(reorder_point, int(reorder_point * 2.5))
                on_order = random.choice([0, int(reorder_point * 0.5)])
            else:  # Overstocked
                on_hand = random.randint(int(reorder_point * 3), int(reorder_point * 6))
                on_order = 0

            records.append({
                "date": s_date,
                "sku_id": sku_id,
                "on_hand_units": on_hand,
                "on_order_units": on_order,
                "lead_time_days": lead_time,
                "reorder_point": reorder_point
            })

    df = pd.DataFrame(records)

    # Deliberate imperfections
    # 1. Negative on_hand_units in 3 rows
    df.loc[8, "on_hand_units"] = -15
    df.loc[42, "on_hand_units"] = -4

    # 2. Missing lead_time_days in 5 rows
    df.loc[15, "lead_time_days"] = np.nan
    df.loc[77, "lead_time_days"] = np.nan

    # 3. Duplicate snapshot row
    dupes = df.iloc[20:23].copy()
    df = pd.concat([df, dupes], ignore_index=True)

    # 4. Inconsistent casing
    df.loc[12, "sku_id"] = "sku-013"
    df.loc[30, "sku_id"] = "  SKU-031 "

    return df


def generate_all_raw_data(output_dir="data/raw"):
    set_seed(42)
    os.makedirs(output_dir, exist_ok=True)

    print(f"Generating NorthBay Living raw datasets into '{output_dir}'...")

    sku_master_df = generate_sku_master(num_skus=200)
    sku_master_path = os.path.join(output_dir, "sku_master.csv")
    sku_master_df.to_csv(sku_master_path, index=False)
    print(f" -> Generated sku_master: {len(sku_master_df):,} rows -> {sku_master_path}")

    calendar_df = generate_calendar("2025-01-01", "2026-06-30")
    calendar_path = os.path.join(output_dir, "calendar.csv")
    calendar_df.to_csv(calendar_path, index=False)
    print(f" -> Generated calendar: {len(calendar_df):,} rows -> {calendar_path}")

    inventory_df = generate_inventory_snapshots(sku_master_df)
    inventory_path = os.path.join(output_dir, "inventory_snapshots.csv")
    inventory_df.to_csv(inventory_path, index=False)
    print(f" -> Generated inventory_snapshots: {len(inventory_df):,} rows -> {inventory_path}")

    sales_df = generate_sales_daily(sku_master_df, calendar_df)
    sales_path = os.path.join(output_dir, "sales_daily.csv")
    sales_df.to_csv(sales_path, index=False)
    print(f" -> Generated sales_daily: {len(sales_df):,} rows -> {sales_path}")

    print("\nRaw data generation complete. All 4 benchmark extracts created with deliberate anomalies.")


if __name__ == "__main__":
    generate_all_raw_data()
