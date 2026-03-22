import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        # register new user
        r1 = await client.post("http://localhost:8000/auth/register", json={
            "phone_number": "1231231231",
            "password": "password",
            "full_name": "Test Farm",
            "role": "farmer"
        })
        
        # login
        r2 = await client.post("http://localhost:8000/auth/login", data={"username": "1231231231", "password": "password"})
        if r2.status_code != 200:
            print("Login failed:", r2.text)
            return
            
        token = r2.json()["access_token"]
        
        # Add a land record to bypass validation logic theoretically? Wait, our validation is in frontend, backend has NO validation on land! 
        # So we just post crop!
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "name": "Test Crop",
            "area": 1.0,
            "season": "Kharif",
            "variety": "Test Variety",
            "crop_type": "Other",
            "sowing_date": "2024-03-04T00:00:00Z",
            "expected_harvest_date": None,
            "notes": None
        }
        r3 = await client.post("http://localhost:8000/crops/", json=payload, headers=headers)
        print("CROP RESP:", r3.status_code, r3.text)

asyncio.run(test())
