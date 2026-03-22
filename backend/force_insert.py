import asyncio
import asyncpg
from datetime import datetime

async def run():
    try:
        conn = await asyncpg.connect('postgresql://postgres:Vinay%4042@127.0.0.1:5432/agrichain')
        
        try:
            await conn.execute("""
                INSERT INTO crop (name, area, sowing_date, status, crop_type, user_id, season, variety, created_at)
                VALUES (, , , , , , , , )
            """, "Test", 1.0, datetime.now(), "Growing", "Other", 1, "Kharif", "Var", datetime.now())
            print("INSERT SUCCESS")
        except Exception as e:
            print("INSERT ERROR:", e)
            
        await conn.close()
    except Exception as e:
        print("Error connecting:", e)

asyncio.run(run())
