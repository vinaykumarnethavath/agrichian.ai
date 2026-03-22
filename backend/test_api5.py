import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        # Register a fake user to get token
        r = await client.post("http://localhost:8000/auth/register", json={
            "phone_number": "1111111111",
            "password": "password123",
            "full_name": "Test Farmer",
            "role": "farmer",
            "email": "testfarmer12345@test.com"
        })
        print("Reg:", r.status_code, r.text)
        
        r = await client.post("http://localhost:8000/auth/login", data={
            "username": "testfarmer12345@test.com",
            "password": "password123"
        })
        token = r.json().get("access_token")
        print("Token:", token[:10] if token else "NO TOKEN")
        
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
        print("Status:", r.status_code)
        print("Response:", r.text)

asyncio.run(main())
