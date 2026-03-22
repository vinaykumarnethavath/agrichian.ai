import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.post("http://localhost:8000/auth/login", json={
            "email": "farmer991@test.com",
            "password": "password123"
        })
        token = r.json().get("access_token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        payload = {
            "name": "Test Crop",
            "area": 1.0,
            "season": "Kharif",
            "variety": "Test Variety",
            "crop_type": "Other",
            "sowing_date": "2024-03-04T00:00:00",
            "expected_harvest_date": None,
            "notes": None
        }
        
        r = await client.post("http://localhost:8000/crops/", json=payload, headers=headers)
        import pprint
        pprint.pprint(r.json())

asyncio.run(main())
