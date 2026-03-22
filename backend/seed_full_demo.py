from sqlmodel import select, text
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import asyncio
import uuid

from app.database import engine
from app.models import (
    User, Crop, CropExpense, CropHarvest, UserRole, FarmerProfile, LandRecord,
    Product, ManufacturerPurchase, ProductionBatch, ManufacturerSale,
    ShopOrder, ShopOrderItem
)
from app.routers.auth import get_password_hash

async def migrate_db(session):
    print("Running DB migrations...")
    stmts = [
        # Crop
        "ALTER TABLE crop ADD COLUMN IF NOT EXISTS crop_type VARCHAR DEFAULT 'Other'",
        "ALTER TABLE crop ADD COLUMN IF NOT EXISTS actual_harvest_date TIMESTAMP",
        "ALTER TABLE crop ADD COLUMN IF NOT EXISTS actual_yield FLOAT DEFAULT 0.0",
        "ALTER TABLE crop ADD COLUMN IF NOT EXISTS selling_price_per_unit FLOAT DEFAULT 0.0",
        "ALTER TABLE crop ADD COLUMN IF NOT EXISTS total_revenue FLOAT DEFAULT 0.0",
        "ALTER TABLE crop ADD COLUMN IF NOT EXISTS total_cost FLOAT DEFAULT 0.0",
        "ALTER TABLE crop ADD COLUMN IF NOT EXISTS net_profit FLOAT DEFAULT 0.0",
        # CropExpense
        "ALTER TABLE cropexpense ADD COLUMN IF NOT EXISTS unit VARCHAR DEFAULT ''",
        "ALTER TABLE cropexpense ADD COLUMN IF NOT EXISTS payment_mode VARCHAR DEFAULT 'Cash'",
        "ALTER TABLE cropexpense ADD COLUMN IF NOT EXISTS unit_size FLOAT DEFAULT 1.0",
        "ALTER TABLE cropexpense ADD COLUMN IF NOT EXISTS duration FLOAT DEFAULT 1.0",
        "ALTER TABLE cropexpense ADD COLUMN IF NOT EXISTS stage VARCHAR DEFAULT 'General'",
        "ALTER TABLE cropexpense ADD COLUMN IF NOT EXISTS bill_url VARCHAR",
        "ALTER TABLE cropexpense ADD COLUMN IF NOT EXISTS notes VARCHAR",
        # FarmerProfile
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS gender VARCHAR",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS relation_type VARCHAR",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS house_no VARCHAR",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS street VARCHAR",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS village VARCHAR",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS mandal VARCHAR",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS district VARCHAR",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS state VARCHAR",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS country VARCHAR DEFAULT 'India'",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS pincode VARCHAR",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS father_husband_name VARCHAR DEFAULT ''",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS total_area FLOAT DEFAULT 0",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS aadhaar_last_4 VARCHAR DEFAULT ''",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS bank_name VARCHAR DEFAULT ''",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS account_number VARCHAR DEFAULT ''",
        "ALTER TABLE farmerprofile ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR DEFAULT ''",
        # Product
        "ALTER TABLE product ADD COLUMN IF NOT EXISTS low_stock_threshold INT DEFAULT 10",
        "ALTER TABLE product ADD COLUMN IF NOT EXISTS cost_price FLOAT",
        "ALTER TABLE product ADD COLUMN IF NOT EXISTS short_name VARCHAR",
        "ALTER TABLE product ADD COLUMN IF NOT EXISTS brand VARCHAR",
    ]
    for sql in stmts:
        try:
            await session.exec(text(sql))
            await session.commit()
        except Exception as e:
            await session.rollback()
            # print(f"Skipping migration: {sql} - {e}")
            pass  # Column may already exist or other issues
    print("DB migrations check complete (some may have been skipped).")


# ===============================================================================
# SEED DATA DEFINITIONS
# ===============================================================================

CROPS_DATA = [
    {
        "name": "Rice (BPT 5204)", "area": 2.5, "sowing_date_days_ago": 60,
        "duration_days": 135, "status": "Growing", "crop_type": "Cereal",
        "notes": "Kharif season crop. Irrigated via canal.",
        "expenses": [
            {"category": "Input", "type": "Seeds", "quantity": 5, "unit": "bags", "unit_cost": 800, "unit_size": 10, "payment_mode": "Cash", "day_offset": 60, "stage": "Sowing"},
            {"category": "Input", "type": "DAP Fertilizer", "quantity": 2, "unit": "bags", "unit_cost": 1350, "unit_size": 50, "payment_mode": "Cash", "day_offset": 55, "stage": "Basal"},
            {"category": "Labor", "type": "Transplanting", "quantity": 8, "unit": "days", "unit_cost": 400, "payment_mode": "Cash", "day_offset": 50, "stage": "Sowing"},
            {"category": "Input", "type": "Urea", "quantity": 3, "unit": "bags", "unit_cost": 270, "unit_size": 50, "payment_mode": "Cash", "day_offset": 30, "stage": "Vegetative"},
        ],
        "harvests": []
    },
    {
        "name": "Cotton (Bt Hybrid)", "area": 3.0, "sowing_date_days_ago": 160,
        "duration_days": 180, "status": "Growing", "crop_type": "Commercial",
        "notes": "Pink bollworm monitoring active. Good boll formation.",
        "expenses": [
            {"category": "Input", "type": "Seeds", "quantity": 6, "unit": "packets", "unit_cost": 850, "payment_mode": "Cash", "day_offset": 160, "stage": "Sowing"},
            {"category": "Input", "type": "Fertilizer (DAP)", "quantity": 3, "unit": "bags", "unit_cost": 1350, "unit_size": 50, "payment_mode": "Credit", "day_offset": 150, "stage": "Basal"},
            {"category": "Input", "type": "Pesticide", "quantity": 2, "unit": "liters", "unit_cost": 800, "payment_mode": "Cash", "day_offset": 100, "stage": "Flowering"},
            {"category": "Labor", "type": "Weeding", "quantity": 6, "unit": "days", "unit_cost": 450, "payment_mode": "Cash", "day_offset": 120, "stage": "Vegetative"},
        ],
        "harvests": []
    },
    {
        "name": "Sugarcane (Co 86032)", "area": 4.0, "sowing_date_days_ago": 200,
        "duration_days": 365, "status": "Growing", "crop_type": "Commercial",
        "notes": "Long duration crop. Drip irrigation installed.",
        "expenses": [
            {"category": "Input", "type": "Sets (Seed Cane)", "quantity": 10, "unit": "tons", "unit_cost": 2500, "payment_mode": "Credit", "day_offset": 200, "stage": "Sowing"},
            {"category": "Labor", "type": "Planting", "quantity": 10, "unit": "days", "unit_cost": 500, "payment_mode": "Cash", "day_offset": 200, "stage": "Sowing"},
            {"category": "Irrigation", "type": "Drip Install", "quantity": 1, "unit": "system", "unit_cost": 9000, "payment_mode": "Bank", "day_offset": 190, "stage": "General"},
        ],
        "harvests": []
    },
    {
        "name": "Wheat (Lok-1)", "area": 5.0, "sowing_date_days_ago": 130,
        "duration_days": 135, "status": "Harvested", "crop_type": "Cereal",
        "notes": "Stored in warehouse. Waiting for better price.",
        "expenses": [
            {"category": "Input", "type": "Seeds", "quantity": 4, "unit": "bags", "unit_cost": 2000, "unit_size": 50, "payment_mode": "Cash", "day_offset": 130, "stage": "Sowing"},
            {"category": "Machinery", "type": "Tractor Rent", "quantity": 5, "unit": "hours", "unit_cost": 1000, "payment_mode": "Cash", "day_offset": 130, "stage": "Sowing"},
            {"category": "Input", "type": "Urea", "quantity": 10, "unit": "bags", "unit_cost": 270, "unit_size": 50, "payment_mode": "Cash", "day_offset": 100, "stage": "Vegetative"},
            {"category": "Machinery", "type": "Harvester", "quantity": 2, "unit": "hours", "unit_cost": 2500, "payment_mode": "Bank", "day_offset": 5, "stage": "Harvesting"},
        ],
        "harvests": [
            {"stage": "Final Harvest", "quantity": 100, "unit": "Quintals", "quality": "Grade A", "selling_price_per_unit": 2100, "buyer_type": "Mandi", "day_offset": 2},
        ]
    },
    {
        "name": "Chilli (Guntur Sannam)", "area": 1.0, "sowing_date_days_ago": 110,
        "duration_days": 150, "status": "Growing", "crop_type": "Spice",
        "notes": "First picking expected soon. Monitoring for thrips.",
        "expenses": [
            {"category": "Input", "type": "Seeds", "quantity": 10, "unit": "packets", "unit_cost": 450, "payment_mode": "Cash", "day_offset": 110, "stage": "Sowing"},
            {"category": "Labor", "type": "Nursery Prep", "quantity": 4, "unit": "days", "unit_cost": 500, "payment_mode": "Cash", "day_offset": 115, "stage": "Sowing"},
            {"category": "Input", "type": "Pesticides", "quantity": 2, "unit": "liters", "unit_cost": 1500, "payment_mode": "Cash", "day_offset": 90, "stage": "Flowering"},
        ],
        "harvests": []
    },
    {
        "name": "Sweet Corn", "area": 1.5, "sowing_date_days_ago": 10,
        "duration_days": 90, "status": "Growing", "crop_type": "Cereal",
        "notes": "Short duration cash crop. Just sown.",
        "expenses": [
            {"category": "Input", "type": "Seeds (Hybrid)", "quantity": 12, "unit": "kg", "unit_cost": 300, "payment_mode": "Cash", "day_offset": 10, "stage": "Sowing"},
            {"category": "Machinery", "type": "Sowing", "quantity": 1, "unit": "acre", "unit_cost": 1400, "payment_mode": "Cash", "day_offset": 10, "stage": "Sowing"},
        ],
        "harvests": []
    },
]

SHOP_PRODUCTS = [
    {"name": "DAP Fertilizer (50kg)", "short_name": "DAP", "category": "fertilizer", "brand": "IFFCO", "price": 1350, "cost_price": 1100, "quantity": 150, "unit": "bag", "batch_number": "DAP-2026-001", "description": "Di-Ammonium Phosphate for basal application"},
    {"name": "Urea (50kg)", "short_name": "Urea", "category": "fertilizer", "brand": "NFL", "price": 270, "cost_price": 220, "quantity": 200, "unit": "bag", "batch_number": "UREA-2026-002", "description": "Nitrogen-rich fertilizer for vegetative growth"},
    {"name": "MOP (50kg)", "short_name": "MOP", "category": "fertilizer", "brand": "IPL", "price": 980, "cost_price": 780, "quantity": 80, "unit": "bag", "batch_number": "MOP-2026-003", "description": "Muriate of Potash for fruiting stage"},
    {"name": "NPK 20-20-20 (25kg)", "short_name": "NPK", "category": "fertilizer", "brand": "Coromandel", "price": 850, "cost_price": 650, "quantity": 120, "unit": "bag", "batch_number": "NPK-2026-004", "description": "Balanced NPK for all crops"},
    {"name": "Monocrotophos 36% SL", "category": "pesticide", "brand": "Bayer", "price": 450, "cost_price": 320, "quantity": 60, "unit": "liter", "batch_number": "PEST-2026-005", "description": "Systemic insecticide for bollworm and aphid control"},
    {"name": "Chlorpyrifos 20% EC", "category": "pesticide", "brand": "UPL", "price": 380, "cost_price": 250, "quantity": 45, "unit": "liter", "batch_number": "PEST-2026-006", "description": "Broad-spectrum insecticide"},
    {"name": "BT Cotton Seeds (Hybrid)", "category": "seeds", "brand": "Mahyco", "price": 850, "cost_price": 650, "quantity": 100, "unit": "packet", "batch_number": "SEED-2026-007", "description": "High-yielding Bt cotton hybrid seeds"},
    {"name": "Rice Seeds (BPT 5204)", "category": "seeds", "brand": "NSC", "price": 800, "cost_price": 550, "quantity": 80, "unit": "bag", "batch_number": "SEED-2026-008", "description": "Premium quality rice seeds 10kg per bag"},
    {"name": "Zinc Sulphate (25kg)", "short_name": "ZnSO4", "category": "fertilizer", "brand": "IFFCO", "price": 620, "cost_price": 450, "quantity": 50, "unit": "bag", "batch_number": "ZN-2026-009", "description": "Micronutrient for zinc-deficient soils"},
    {"name": "Neem Oil (1L)", "category": "pesticide", "brand": "Organic India", "price": 280, "cost_price": 180, "quantity": 90, "unit": "liter", "batch_number": "BIO-2026-010", "description": "Organic pest deterrent for all crops"},
]

MANUFACTURER_PRODUCTS = [
    {"name": "Premium Rice (25kg)", "category": "processed", "brand": "Golden Harvest", "price": 1200, "cost_price": 900, "quantity": 500, "unit": "bag", "batch_number": "MFR-RICE-001", "description": "Polished Sona Masoori rice"},
    {"name": "Wheat Flour Atta (10kg)", "category": "processed", "brand": "Mill Fresh", "price": 420, "cost_price": 280, "quantity": 300, "unit": "bag", "batch_number": "MFR-WHEAT-002", "description": "Fresh stone-ground whole wheat flour"},
    {"name": "Cotton Lint Bale", "category": "processed", "brand": "Direct Mill", "price": 45000, "cost_price": 35000, "quantity": 20, "unit": "bale", "batch_number": "MFR-COTTON-003", "description": "Ginned cotton lint 170kg bale"},
    {"name": "Groundnut Oil (5L)", "category": "processed", "brand": "Farm Fresh", "price": 750, "cost_price": 520, "quantity": 150, "unit": "can", "batch_number": "MFR-OIL-004", "description": "Cold-pressed groundnut cooking oil"},
    {"name": "Jaggery (1kg)", "category": "processed", "brand": "Natural Sugar", "price": 80, "cost_price": 50, "quantity": 400, "unit": "kg", "batch_number": "MFR-JAG-005", "description": "Organic sugarcane jaggery"},
]


async def seed_full_demo():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # await migrate_db(session)
        print("=" * 60)
        print("    STARTING FULL PLATFORM SEEDING")
        print("=" * 60)

        # ═══════════════════════════════════════════════════════════
        # 1. CREATE USERS
        # ═══════════════════════════════════════════════════════════
        users = {}
        user_configs = [
            ("farmer@agri.com", "Vinay Kumar Nethavath", UserRole.FARMER, "farmer123"),
            ("shop@agri.com", "Krishna Fertilizers", UserRole.SHOP, "shop123"),
            ("mill@agri.com", "Srinivasa Rice Mill", UserRole.MANUFACTURER, "mill123"),
            ("customer@agri.com", "Ravi Kumar", UserRole.CUSTOMER, "customer123"),
        ]
        
        for email, name, role, password in user_configs:
            stmt = select(User).where(User.email == email)
            result = await session.exec(stmt)
            user = result.first()
            if not user:
                user = User(email=email, full_name=name, hashed_password=get_password_hash(password), role=role, is_active=True)
                session.add(user)
                await session.commit()
                await session.refresh(user)
                print(f"[+] Created user: {name} ({email})")
            else:
                user.full_name = name
                session.add(user)
                await session.commit()
                await session.refresh(user)
                print(f"[=] Using existing: {name} ({email})")
            users[role] = user

        farmer = users[UserRole.FARMER]
        shop = users[UserRole.SHOP]
        mill = users[UserRole.MANUFACTURER]
        customer = users[UserRole.CUSTOMER]

        # ═══════════════════════════════════════════════════════════
        # 2. FARMER PROFILE
        # ═══════════════════════════════════════════════════════════
        print("\n--- Farmer Profile ---")
        # Check by user_id first, then by farmer_id
        stmt = select(FarmerProfile).where(FarmerProfile.user_id == farmer.id)
        result = await session.exec(stmt)
        profile = result.first()
        if not profile:
            stmt2 = select(FarmerProfile).where(FarmerProfile.farmer_id == "AGRI-12345")
            result2 = await session.exec(stmt2)
            profile = result2.first()

        profile_data = dict(
            father_husband_name="Ramdas",
            gender="male",
            relation_type="son_of",
            house_no="3-45",
            street="Main Road",
            village="Muripirala",
            mandal="Narsampet",
            district="Warangal",
            state="Telangana",
            country="India",
            pincode="506331",
            total_area=17.0,
            aadhaar_last_4="6789",
            bank_name="State Bank of India",
            account_number="39218476523",
            ifsc_code="SBIN0012345",
            profile_picture_url=""
        )

        if not profile:
            profile = FarmerProfile(user_id=farmer.id, farmer_id="AGRI-12345", **profile_data)
            session.add(profile)
            await session.commit()
            await session.refresh(profile)
            # Add land records
            for sn, area in [("102/4A", 5.0), ("103/1B", 4.0), ("105/2", 3.0), ("108/3", 2.5), ("110/1", 2.5)]:
                session.add(LandRecord(serial_number=sn, area=area, farmer_profile_id=profile.id))
            await session.commit()
            print("[OK] Created farmer profile with 5 land records")
        else:
            profile.user_id = farmer.id
            for k, v in profile_data.items():
                setattr(profile, k, v)
            session.add(profile)
            await session.commit()
            await session.refresh(profile)
            print("[OK] Updated farmer profile")

        # ═══════════════════════════════════════════════════════════
        # 3. CROPS (Clear & Re-seed)
        # ═══════════════════════════════════════════════════════════
        print("\n--- Crops ---")
        # Use raw SQL to properly delete in FK order
        crop_ids_result = await session.exec(select(Crop.id).where(Crop.user_id == farmer.id))
        crop_ids = crop_ids_result.all()
        if crop_ids:
            ids_str = ",".join(str(cid) for cid in crop_ids)
            await session.exec(text(f"DELETE FROM cropharvest WHERE crop_id IN ({ids_str})"))
            await session.exec(text(f"DELETE FROM cropexpense WHERE crop_id IN ({ids_str})"))
            await session.exec(text(f"DELETE FROM crop WHERE user_id = {farmer.id}"))
            await session.commit()

        for crop_raw in CROPS_DATA:
            expenses = crop_raw.pop("expenses", [])
            harvests = crop_raw.pop("harvests", [])
            sowing = datetime.now() - timedelta(days=crop_raw.pop("sowing_date_days_ago", 0))
            duration = crop_raw.pop("duration_days", 120)
            crop = Crop(user_id=farmer.id, sowing_date=sowing, expected_harvest_date=sowing + timedelta(days=duration),
                       total_cost=0, total_revenue=0, net_profit=0, actual_yield=0, **crop_raw)
            session.add(crop)
            await session.commit()
            await session.refresh(crop)

            total_cost = 0
            for exp in expenses:
                day_off = exp.pop("day_offset", 0)
                exp.setdefault("total_cost", exp["quantity"] * exp["unit_cost"])
                e = CropExpense(crop_id=crop.id, date=datetime.now() - timedelta(days=day_off), **exp)
                session.add(e)
                total_cost += e.total_cost

            total_rev = 0
            total_yield = 0
            for harv in harvests:
                day_off = harv.pop("day_offset", 0)
                harv.setdefault("total_revenue", harv["quantity"] * harv["selling_price_per_unit"])
                h = CropHarvest(crop_id=crop.id, date=datetime.now() - timedelta(days=day_off), **harv)
                session.add(h)
                total_rev += h.total_revenue
                total_yield += h.quantity

            crop.total_cost = total_cost
            crop.total_revenue = total_rev
            crop.net_profit = total_rev - total_cost
            crop.actual_yield = total_yield if total_yield > 0 else 0
            if crop.status == "Harvested" and harvests:
                crop.actual_harvest_date = datetime.now()
            session.add(crop)
            await session.commit()
            print(f"  [CROP] {crop.name}: Rs.{total_cost:,.0f} cost, Rs.{total_rev:,.0f} revenue")

        # ═══════════════════════════════════════════════════════════
        # 4. SHOP PRODUCTS & ORDERS
        # ═══════════════════════════════════════════════════════════
        print("\n--- Shop Data ---")
        # Clear existing shop data in correct order
        await session.exec(text(f"DELETE FROM shop_order_items WHERE order_id IN (SELECT id FROM shop_orders WHERE shop_id = {shop.id})"))
        await session.exec(text(f"DELETE FROM shop_orders WHERE shop_id = {shop.id}"))
        await session.exec(text(f"DELETE FROM product WHERE user_id = {shop.id}"))
        await session.commit()

        for prod in SHOP_PRODUCTS:
            product = Product(user_id=shop.id, **prod)
            session.add(product)
        await session.commit()
        print(f"  [SHOP] Added {len(SHOP_PRODUCTS)} shop products")

        # ═══════════════════════════════════════════════════════════
        # 5. MANUFACTURER PRODUCTS & DATA
        # ═══════════════════════════════════════════════════════════
        print("\n--- Manufacturer ---")
        # Clear existing manufacturer data in correct order
        await session.exec(text(f"DELETE FROM manufacturer_sales WHERE manufacturer_id = {mill.id}"))
        await session.exec(text(f"DELETE FROM production_batches WHERE manufacturer_id = {mill.id}"))
        await session.exec(text(f"DELETE FROM manufacturer_purchases WHERE manufacturer_id = {mill.id}"))
        await session.exec(text(f"DELETE FROM product WHERE user_id = {mill.id}"))
        await session.commit()

        mfr_product_ids = []
        for prod in MANUFACTURER_PRODUCTS:
            product = Product(user_id=mill.id, **prod)
            session.add(product)
            await session.commit()
            await session.refresh(product)
            mfr_product_ids.append(product.id)



        purchases_data = [
            {"farmer_name": "Vinay Kumar", "crop_name": "Paddy (BPT 5204)", "quantity": 500, "unit": "quintal",
             "price_per_unit": 2100, "total_cost": 1050000, "transport_cost": 5000, "quality_grade": "A",
             "batch_id": f"M-PUR-{uuid.uuid4().hex[:6]}", "date": datetime.now() - timedelta(days=10)},
            {"farmer_name": "Ramesh Kumar", "crop_name": "Wheat (Lok-1)", "quantity": 200, "unit": "quintal",
             "price_per_unit": 2200, "total_cost": 440000, "transport_cost": 3000, "quality_grade": "A",
             "batch_id": f"M-PUR-{uuid.uuid4().hex[:6]}", "date": datetime.now() - timedelta(days=5)},
            {"farmer_name": "Suresh Reddy", "crop_name": "Sugarcane", "quantity": 100, "unit": "ton",
             "price_per_unit": 3150, "total_cost": 315000, "transport_cost": 8000, "quality_grade": "B",
             "batch_id": f"M-PUR-{uuid.uuid4().hex[:6]}", "date": datetime.now() - timedelta(days=2)},
        ]
        for pdata in purchases_data:
            p = ManufacturerPurchase(manufacturer_id=mill.id, farmer_id=farmer.id, **pdata)
            session.add(p)
        await session.commit()
        print(f"  [MILL] Added {len(MANUFACTURER_PRODUCTS)} products, {len(purchases_data)} purchases")



        if mfr_product_ids:
            sales_data = [
                {"buyer_type": "shop", "buyer_name": "Krishna Fertilizers", "product_id": mfr_product_ids[0],
                 "quantity": 50, "selling_price": 1200, "total_amount": 60000, "payment_mode": "bank",
                 "invoice_id": f"M-INV-{uuid.uuid4().hex[:6]}", "date": datetime.now() - timedelta(days=3)},
                {"buyer_type": "customer", "buyer_name": "Ravi Kumar", "product_id": mfr_product_ids[1],
                 "quantity": 20, "selling_price": 420, "total_amount": 8400, "payment_mode": "cash",
                 "invoice_id": f"M-INV-{uuid.uuid4().hex[:6]}", "date": datetime.now() - timedelta(days=1)},
            ]
            for sdata in sales_data:
                try:
                    s = ManufacturerSale(manufacturer_id=mill.id, **sdata)
                    session.add(s)
                    await session.commit()
                except Exception as e:
                    await session.rollback()
                    print(f"  [ERROR] Failed to add sale: {e}")
                    # continue
            print(f"  [SALE] Processed manufacturer sales records")

        print("\n" + "=" * 60)
        print("    SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nLOGIN CREDENTIALS:")
        print("  Farmer:       farmer@agri.com / farmer123")
        print("  Shop:         shop@agri.com / shop123")
        print("  Mill Owner:   mill@agri.com / mill123")
        print("  Customer:     customer@agri.com / customer123")

if __name__ == "__main__":
    asyncio.run(seed_full_demo())
