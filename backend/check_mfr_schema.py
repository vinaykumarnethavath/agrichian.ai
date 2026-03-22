import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("--- manufacturer_sales ---")
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'manufacturer_sales'"))
        for r in res.all():
            print(f"{r[0]}: {r[1]}")
            
        print("\n--- manufacturer_purchases ---")
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'manufacturer_purchases'"))
        for r in res.all():
            print(f"{r[0]}: {r[1]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
