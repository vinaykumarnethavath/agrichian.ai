import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Vinay%4042@127.0.0.1:5432/agrichain"

async def test_insert():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("INSERT INTO crop (name, area, sowing_date, status, crop_type, user_id, season, variety, created_at) VALUES ('T', 1, '2024-03-04', 'Growing', 'Other', 1, 'Kharif', 'Var', '2024-03-04')"))
            print("INSERT OK")
        except Exception as e:
            print("INSERT FAILED:", e)
    await engine.dispose()

asyncio.run(test_insert())
