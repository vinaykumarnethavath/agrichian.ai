import asyncio
from datetime import datetime, timedelta
from sqlmodel import select, delete
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database import engine
from app.models import User, Crop, CropExpense, UserRole, FarmerProfile

# Diverse crop data
VARIED_CROPS = [
    {
        "name": "Sugarcane (Co 86032)",
        "area": 4.0,
        "sowing_date": datetime.now() - timedelta(days=200),
        "expected_harvest_date": datetime.now() + timedelta(days=165), # 12 month duration
        "status": "Growing",
        "crop_type": "Commercial",
        "notes": "Long duration crop. Intercropped with pulses initially.",
        "total_cost": 45000,
        "expenses": [
            {"category": "Input", "type": "Sets (Seed Cane)", "quantity": 10, "unit": "tons", "unit_cost": 2500, "total_cost": 25000, "payment_mode": "Credit"},
            {"category": "Labor", "type": "Planting", "quantity": 10, "unit": "days", "unit_cost": 500, "total_cost": 5000, "payment_mode": "Cash"},
            {"category": "Input", "type": "Basal Fertilizer", "quantity": 5, "unit": "bags", "unit_cost": 1200, "total_cost": 6000, "payment_mode": "Digital"},
            {"category": "Irrigation", "type": "Drip Install", "quantity": 1, "unit": "system", "unit_cost": 9000, "total_cost": 9000, "payment_mode": "Bank"},
        ]
    },
    {
        "name": "Chilli (Guntur Sannam)",
        "area": 1.0,
        "sowing_date": datetime.now() - timedelta(days=45),
        "expected_harvest_date": datetime.now() + timedelta(days=75),
        "status": "Growing",
        "crop_type": "Spice",
        "notes": "High monitoring required for pests (thrips).",
        "total_cost": 12500,
        "expenses": [
            {"category": "Input", "type": "Seeds", "quantity": 10, "unit": "packets", "unit_cost": 450, "total_cost": 4500, "payment_mode": "Cash"},
            {"category": "Labor", "type": "Nursery Prep", "quantity": 4, "unit": "days", "unit_cost": 500, "total_cost": 2000, "payment_mode": "Cash"},
            {"category": "Input", "type": "Pesticides", "quantity": 2, "unit": "liters", "unit_cost": 1500, "total_cost": 3000, "payment_mode": "Cash"},
             {"category": "Labor", "type": "Weeding", "quantity": 6, "unit": "days", "unit_cost": 500, "total_cost": 3000, "payment_mode": "Cash"},
        ]
    },
    {
        "name": "Mango (Alphonso)",
        "area": 2.5,
        "sowing_date": datetime.now() - timedelta(days=365*5), # 5 year old orchard
        "expected_harvest_date": datetime.now() + timedelta(days=60), # Season approaching
        "status": "Growing",
        "crop_type": "Fruit",
        "notes": "Flowering stage. Spraying planned.",
        "total_cost": 8000, # Maintenance cost for this season
        "expenses": [
             {"category": "Input", "type": "Pesticide Spray (Flowering)", "quantity": 5, "unit": "liters", "unit_cost": 800, "total_cost": 4000, "payment_mode": "Cash"},
             {"category": "Labor", "type": "Pruning & Cleaning", "quantity": 8, "unit": "days", "unit_cost": 500, "total_cost": 4000, "payment_mode": "Cash"},
        ]
    },
    {
        "name": "Sweet Corn",
        "area": 1.5,
        "sowing_date": datetime.now() - timedelta(days=10),
        "expected_harvest_date": datetime.now() + timedelta(days=80),
        "status": "Growing",
        "crop_type": "Cereal",
        "notes": "Short duration cash crop.",
        "total_cost": 5000,
        "expenses": [
            {"category": "Input", "type": "Seeds (Hybrid)", "quantity": 12, "unit": "kg", "unit_cost": 300, "total_cost": 3600, "payment_mode": "Cash"},
            {"category": "Machinery", "type": "Sowing", "quantity": 1, "unit": "acre", "unit_cost": 1400, "total_cost": 1400, "payment_mode": "Cash"},
        ]
    }
]

async def seed_varied_crops():
    async with AsyncSession(engine) as session:
        # Find farmer
        statement = select(User).where(User.role == UserRole.FARMER)
        result = await session.exec(statement)
        farmer = result.first()
        
        if not farmer:
            print("ERROR: No farmer user found.")
            return

        print(f"Seeding varied crops for: {farmer.email}")

        # Add crops
        import copy
        for crop_template in VARIED_CROPS:
            crop_data = copy.deepcopy(crop_template)
            expenses_data = crop_data.pop("expenses", [])
            
            crop = Crop(
                **crop_data,
                user_id=farmer.id,
                total_revenue=0,
                net_profit=-crop_data["total_cost"] # Loss initially until harvest
            )
            session.add(crop)
            await session.commit()
            await session.refresh(crop)
            
            print(f"Created: {crop.name} ({crop.crop_type})")
            
            # Add expenses
            for exp_data in expenses_data:
                expense = CropExpense(
                    crop_id=crop.id,
                    date=datetime.now(), # Just use today for simplicity
                    **exp_data
                )
                session.add(expense)
            
            await session.commit()
            print(f"  - Added expenses. Total Cost: {crop.total_cost}")

        print("\nVaried crops seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_varied_crops())
