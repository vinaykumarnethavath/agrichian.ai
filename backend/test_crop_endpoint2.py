import urllib.request
import urllib.parse
import json

base_url = "http://localhost:8000"

def req(url, data=None, headers=None, method=None):
    if data and not isinstance(data, bytes):
        if headers and headers.get('Content-Type') == 'application/x-www-form-urlencoded':
            data = urllib.parse.urlencode(data).encode('utf-8')
        else:
            data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.read(), response.status
    except urllib.error.HTTPError as e:
        return e.read(), e.code
    except Exception as e:
        return str(e).encode('utf-8'), 500

# 1. Register or get user token
print("Registering")
code, status = req(f"{base_url}/auth/register", {"phone_number": "9999999998", "password": "password123", "full_name": "Test", "role": "farmer"}, {"Content-Type": "application/json"})
print("Reg status:", status)

# 2. Login
print("Logging in")
login_data = {"username": "9999999998", "password": "password123"}
resp, status = req(f"{base_url}/auth/login", login_data, {"Content-Type": "application/x-www-form-urlencoded"})
print("Login status:", status)
try:
    token = json.loads(resp).get("access_token")
except:
    token = None
print("Token:", token[:10] if token else "None")

# 3. Create crop payload
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

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

resp, status = req(f"{base_url}/crops/", payload, headers)
print("Create crop status:", status)
print("Create crop response:", resp.decode('utf-8'))
