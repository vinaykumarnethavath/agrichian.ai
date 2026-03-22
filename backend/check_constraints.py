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
        print("--- manufacturer_sales constraints ---")
        query = text("""
            SELECT
                conname as constraint_name,
                contype as constraint_type
            FROM
                pg_constraint
            WHERE
                conrelid = 'manufacturer_sales'::regclass;
        """)
        res = await conn.execute(query)
        for r in res.all():
            print(f"{r[0]}: {r[1]}")
            
        print("\n--- unique indexes ---")
        query2 = text("""
            SELECT
                i.relname as index_name,
                a.attname as column_name
            FROM
                pg_class t,
                pg_class i,
                pg_index ix,
                pg_attribute a
            WHERE
                t.oid = ix.indrelid
                AND i.oid = ix.indexrelid
                AND a.attrelid = t.oid
                AND a.attnum = ANY(ix.indkey)
                AND t.relkind = 'r'
                AND t.relname = 'manufacturer_sales'
                AND ix.indisunique = true;
        """)
        res2 = await conn.execute(query2)
        for r in res2.all():
            print(f"Index: {r[0]}, Column: {r[1]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
