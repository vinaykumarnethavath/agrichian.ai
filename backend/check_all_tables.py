import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Vinay%4042@127.0.0.1:5432/agrichain"

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT table_schema, column_name, data_type FROM information_schema.columns WHERE table_name='crop'"))
        for row in result:
            print(f"[{row[0]}] {row[1]}: {row[2]}")
    await engine.dispose()

asyncio.run(check())
