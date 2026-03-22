import urllib.request
import urllib.parse
import urllib.error
import json

def req(url, data=None, headers=None):
    if data is not None and getattr(data, 'is_form', False):
        encoded = urllib.parse.urlencode(data.items).encode('utf-8')
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

class Form:
    def __init__(self, d):
        self.items = d
        self.is_form = True

print("Registering...")
resp, status = req("http://localhost:8000/auth/register", 
    {"email": "farmer123@example.com", "password": "pass", "full_name": "Test", "role": "farmer"}, 
    {"Content-Type": "application/json"}
)
print("Reg:", status, resp)

print("Logging in...")
resp, status = req("http://localhost:8000/auth/login", 
    Form({"username": "farmer123@example.com", "password": "pass"}), 
    {"Content-Type": "application/x-www-form-urlencoded"}
)
print("Login:", status, resp[:50])

try:
    token = json.loads(resp)["access_token"]
except:
    token = "INVALID"

print("Creating crop...")
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
resp, status = req("http://localhost:8000/crops/", payload, {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
})
print("Crop:", status)
print(resp.decode('utf-8'))

