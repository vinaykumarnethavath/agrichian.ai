import asyncio
import asyncpg

async def run():
    try:
        conn = await asyncpg.connect('postgresql://postgres:Vinay%4042@127.0.0.1:5432/agrichain')
        
        try:
            await conn.execute("ALTER TABLE crop ADD COLUMN season VARCHAR;")
            print("Added season")
        except asyncpg.exceptions.DuplicateColumnError:
            print("season already exists")
            
        try:
            await conn.execute("ALTER TABLE crop ADD COLUMN variety VARCHAR;")
            print("Added variety")
        except asyncpg.exceptions.DuplicateColumnError:
            print("variety already exists")
            
        await conn.close()
        print("Done")
    except Exception as e:
        print("Error connecting or migrating:", e)

asyncio.run(run())
