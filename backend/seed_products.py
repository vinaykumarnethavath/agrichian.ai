import asyncio
from sqlmodel import Session, select
from app.database import engine
from app.models import Product, User
from app.routers.auth import get_password_hash

async def seed_products():
    async with Session(engine) as session:
        # ============================================================
        #  SHOP 1: Agri Shop (General Agricultural Supplies)
        # ============================================================
        statement = select(User).where(User.email == "shop@agri.com")
        result = session.exec(statement)
        shop1 = result.first()
        
        if not shop1:
            print("Creating Shop 1: Agri Shop...")
            shop1 = User(
                email="shop@agri.com",
                full_name="Agri Shop - Ranga Reddy",
                hashed_password=get_password_hash("shop123"),
                role="shop"
            )
            session.add(shop1)
            session.commit()
            session.refresh(shop1)

        # ============================================================
        #  SHOP 2: KrishiMart (Premium Farm Inputs)
        # ============================================================
        statement = select(User).where(User.email == "krishimart@agri.com")
        result = session.exec(statement)
        shop2 = result.first()
        
        if not shop2:
            print("Creating Shop 2: KrishiMart...")
            shop2 = User(
                email="krishimart@agri.com",
                full_name="KrishiMart - Premium Inputs",
                hashed_password=get_password_hash("shop123"),
                role="shop"
            )
            session.add(shop2)
            session.commit()
            session.refresh(shop2)
            
        # ============================================================
        #  SHOP 3: Kisan Seva Kendra
        # ============================================================
        statement = select(User).where(User.email == "kisanseva@agri.com")
        result = session.exec(statement)
        shop3 = result.first()
        
        if not shop3:
            print("Creating Shop 3: Kisan Seva Kendra...")
            shop3 = User(
                email="kisanseva@agri.com",
                full_name="Kisan Seva Kendra",
                hashed_password=get_password_hash("shop123"),
                role="shop"
            )
            session.add(shop3)
            session.commit()
            session.refresh(shop3)

        # Check for existing products
        statement = select(Product)
        results = session.exec(statement)
        existing_products = results.all()
        
        if existing_products:
            print(f"Found {len(existing_products)} existing products. Skipping seed.")
            return

        print("Seeding products with images across 3 shops...")
        
        products = [
            # ===== SHOP 1: Agri Shop =====
            Product(
                name="DAP (Di-Ammonium Phosphate)",
                short_name="DAP",
                category="fertilizer",
                brand="IFFCO",
                price=1350.0,
                quantity=100,
                batch_number="B-101",
                description="High phosphorus fertilizer for root development. 18-46-0 formulation.",
                image_url="https://images.unsplash.com/photo-1585314062604-1a357de8b000?w=400&h=300&fit=crop",
                user_id=shop1.id
            ),
            Product(
                name="MOP (Muriate of Potash)",
                short_name="MOP",
                category="fertilizer",
                brand="IPL",
                price=1700.0,
                quantity=50,
                batch_number="B-102",
                description="Potassium source for crop quality and disease resistance. 0-0-60.",
                image_url="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
                user_id=shop1.id
            ),
            Product(
                name="Urea (Neem Coated)",
                short_name="Urea",
                category="fertilizer",
                brand="IFFCO",
                price=266.50,
                quantity=200,
                batch_number="B-103",
                description="Nitrogen fertilizer for vegetative growth. 46-0-0 neem coated.",
                image_url="https://images.unsplash.com/photo-1592722182684-80a1310da14e?w=400&h=300&fit=crop",
                user_id=shop1.id
            ),
            Product(
                name="Roundup (Glyphosate)",
                short_name="Roundup",
                category="pesticide",
                brand="Bayer",
                price=450.0,
                quantity=40,
                batch_number="P-201",
                description="Systemic herbicide for broad-spectrum weed control.",
                image_url="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop",
                user_id=shop1.id
            ),
            Product(
                name="Cotton Seeds (Bt)",
                short_name="Cotton",
                category="seeds",
                brand="Mahyco",
                price=850.0,
                quantity=60,
                batch_number="S-301",
                description="High yielding Bt Cotton seeds - bollworm resistant.",
                image_url="https://images.unsplash.com/photo-1530836176759-510f58baebf4?w=400&h=300&fit=crop",
                user_id=shop1.id
            ),

            # ===== SHOP 2: KrishiMart =====
            Product(
                name="NPK 19:19:19",
                short_name="NPK",
                category="fertilizer",
                brand="Coromandel",
                price=1200.0,
                quantity=80,
                batch_number="KM-101",
                description="Balanced water soluble fertilizer for all crops.",
                image_url="https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop",
                user_id=shop2.id
            ),
            Product(
                name="Zinc Sulphate",
                short_name="ZnSO4",
                category="fertilizer",
                brand="Deepak",
                price=80.0,
                quantity=150,
                batch_number="KM-102",
                description="Essential micronutrient for zinc deficiency correction.",
                image_url="https://images.unsplash.com/photo-1598030343246-eec5f0e48f48?w=400&h=300&fit=crop",
                user_id=shop2.id
            ),
            Product(
                name="Super Phosphate (SSP)",
                short_name="SSP",
                category="fertilizer",
                brand="Paradeep",
                price=500.0,
                quantity=90,
                batch_number="KM-103",
                description="Single Super Phosphate - slow release phosphorus + calcium + sulphur.",
                image_url="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=300&fit=crop",
                user_id=shop2.id
            ),
            Product(
                name="Imidacloprid 17.8% SL",
                short_name="Imida",
                category="pesticide",
                brand="Bayer Confidor",
                price=380.0,
                quantity=35,
                batch_number="KM-201",
                description="Systemic insecticide for sucking pests - aphids, whiteflies, jassids.",
                image_url="https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=400&h=300&fit=crop",
                user_id=shop2.id
            ),
            Product(
                name="Paddy Seeds (BPT-5204)",
                short_name="Paddy BPT",
                category="seeds",
                brand="ANGRAU",
                price=45.0,
                quantity=500,
                unit="kg",
                batch_number="KM-301",
                description="Samba Mahsuri variety - fine grain, medium duration.",
                image_url="https://images.unsplash.com/photo-1536304993881-460bfe3f46e3?w=400&h=300&fit=crop",
                user_id=shop2.id
            ),

            # ===== SHOP 3: Kisan Seva Kendra =====
            Product(
                name="Potash (MOP Premium)",
                short_name="Potash",
                category="fertilizer",
                brand="SOP India",
                price=1800.0,
                quantity=45,
                batch_number="KS-101",
                description="Premium grade Muriate of Potash for high-value crops.",
                image_url="https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=400&h=300&fit=crop",
                user_id=shop3.id
            ),
            Product(
                name="Vermicompost (Organic)",
                short_name="Vermi",
                category="fertilizer",
                brand="Organic India",
                price=120.0,
                quantity=300,
                unit="kg",
                batch_number="KS-102",
                description="Premium organic vermicompost - rich in nutrients and beneficial microbes.",
                image_url="https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop",
                user_id=shop3.id
            ),
            Product(
                name="Chlorpyrifos 20% EC",
                short_name="Chloro",
                category="pesticide",
                brand="Dow",
                price=320.0,
                quantity=55,
                batch_number="KS-201",
                description="Contact insecticide for soil and foliar application.",
                image_url="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400&h=300&fit=crop",
                user_id=shop3.id
            ),
            Product(
                name="Tomato Seeds (Hybrid)",
                short_name="Tomato",
                category="seeds",
                brand="Seminis",
                price=250.0,
                quantity=100,
                unit="packet",
                batch_number="KS-301",
                description="High yield hybrid tomato seeds - disease tolerant variety.",
                image_url="https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400&h=300&fit=crop",
                user_id=shop3.id
            ),
            Product(
                name="Knapsack Sprayer (16L)",
                short_name="Sprayer",
                category="equipment",
                brand="Aspee",
                price=2200.0,
                quantity=15,
                unit="piece",
                batch_number="KS-401",
                description="Manual knapsack sprayer with brass lance and adjustable nozzle.",
                image_url="https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?w=400&h=300&fit=crop",
                user_id=shop3.id
            ),
        ]
        
        for p in products:
            session.add(p)
        
        session.commit()
        print(f"Seeded {len(products)} products across 3 shops successfully!")

if __name__ == "__main__":
    asyncio.run(seed_products())
