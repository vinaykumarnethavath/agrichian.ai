import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.get("http://localhost:8000/crops/debug-env")
        print("Debug Env:", r.json())
        
asyncio.run(main())
