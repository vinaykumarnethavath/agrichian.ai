import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Register user
        reg_payload = {
            "full_name": "Test Shop",
            "email": "test100@example.com",
            "password": "password123",
            "role": "shop"
        }
        res_reg = await client.post("http://127.0.0.1:8000/auth/register", json=reg_payload)
        print("Register:", res_reg.status_code)

        # Login
        response = await client.post("http://127.0.0.1:8000/auth/login", json={"email": "test100@example.com", "password": "password123"})
        if response.status_code != 200:
            print("Login failed:", response.text)
            return
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Add Crop
        crop_payload = {
            "name": "Test Wheat",
            "area": 2.5,
            "season": "Rabi",
            "variety": "PBW 343",
            "sowing_date": "2026-10-15T00:00:00.000Z",
            "expected_harvest_date": "2027-03-15T00:00:00.000Z",
            "status": "Growing"
        }
        res_crop = await client.post("http://127.0.0.1:8000/crops/", json=crop_payload, headers=headers)
        print("Crop POST Response:", res_crop.status_code)
        if res_crop.status_code == 200:
            crop_id = res_crop.json().get("id")
        # Add Shop Product
        product_payload = {
            "name": "Super Fertilizer",
            "category": "fertilizer",
            "price": 1000.0,
            "cost_price": 800.0,
            "quantity": 50,
            "unit": "kg",
            "batch_number": "BN-2024",
            "expiry_date": "2026-12-31T00:00:00Z"
        }
        res_prod = await client.post("http://127.0.0.1:8000/products/", json=product_payload, headers=headers)
        print("Product POST Response:", res_prod.status_code)
        
        # Verify List
        res_get = await client.get("http://127.0.0.1:8000/products/my/all", headers=headers)
        print("My Products GET Response:", res_get.status_code)
        if res_get.status_code == 200:
            print("Total products:", len(res_get.json()))

if __name__ == "__main__":
    asyncio.run(main())
