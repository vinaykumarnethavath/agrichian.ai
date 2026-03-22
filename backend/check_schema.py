import asyncio
from app.database import engine
from sqlmodel import text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'product'"))
        rows = res.all()
        if not rows:
            print("No columns found for table 'product'")
        for r in rows:
            print(f"{r[0]}: {r[1]}")

if __name__ == "__main__":
    asyncio.run(check())
