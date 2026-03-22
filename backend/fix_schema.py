import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def fix():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Adding image_url to product table...")
        await conn.execute(text("ALTER TABLE product ADD COLUMN IF NOT EXISTS image_url VARCHAR;"))
        print("Done.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix())
