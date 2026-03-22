from datetime import datetime
try:
    d = datetime.fromisoformat('2024-03-04T00:00:00Z')
    print("Success:", d)
except Exception as e:
    print("Error:", e)
