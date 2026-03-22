import urllib.request
import urllib.parse
import urllib.error
import json

def req(url, data=None, headers=None, is_form=False):
    if is_form:
        encoded = urllib.parse.urlencode(data).encode('utf-8')
    elif data is not None:
        encoded = json.dumps(data).encode('utf-8')
    else:
        encoded = None
        
    req = urllib.request.Request(url, data=encoded, headers=headers or {})
    try:
        with urllib.request.urlopen(req) as response:
            return response.read(), response.status
    except urllib.error.HTTPError as e:
        return e.read(), e.code
    except Exception as e:
        return str(e).encode('utf-8'), 500

print("Logging in as a real user...")
resp, status = req("http://localhost:8000/auth/login", 
    {"username": "9342468175", "password": "password123"}, 
    {"Content-Type": "application/x-www-form-urlencoded"},
    is_form=True
)
print("Login:", status, resp[:50])

try:
    token = json.loads(resp)["access_token"]
except:
    token = "INVALID"
    print("Cannot proceed without token.")

if token != "INVALID":
    print("\nGetting profile...")
    resp, status = req("http://localhost:8000/farmer/profile", headers={"Authorization": f"Bearer {token}"})
    print("Profile:", status)
    
    print("\nCreating crop...")
    payload = {
        "name": "Wheat 2",
        "area": 0.5,
        "season": "Rabi",
        "variety": "PBW 343",
        "crop_type": "Other",
        "sowing_date": "2024-03-04T00:00:00",
        "expected_harvest_date": None,
        "notes": None
    }
    resp, status = req("http://localhost:8000/crops/", payload, {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    })
    print("Crop Creation Status:", status)
    print("Response Body:", resp.decode('utf-8'))

